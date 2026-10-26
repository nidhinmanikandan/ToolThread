const test = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateTrend,
  GROWTH_THRESHOLD_PERCENT,
  MIN_OBSERVATIONS,
  MIN_WINDOW_MS,
} = require("../services/trendService");
const {
  findInconsistentObservationIds,
  findUnmatchedToolIds,
  prepareObservations,
  run: runObservationImport,
} = require("../scripts/recordTrendObservations");

const NOW = new Date("2026-10-26T12:00:00.000Z");
const TOOL_ID = "507f1f77bcf86cd799439011";
const EVENT_ID = "owner/repository";

function observations(values, options = {}) {
  const {
    toolId = TOOL_ID,
    source = "github",
    signalType = "stars_total",
    sourceEventId = EVENT_ID,
    times = [
      "2026-10-24T12:00:00.000Z",
      "2026-10-25T12:00:00.000Z",
      "2026-10-26T11:00:00.000Z",
    ],
  } = options;
  return values.map((measurement, index) => ({
    toolId,
    source,
    signalType,
    sourceEventId,
    measurement,
    observedAt: new Date(times[index]),
  }));
}

test("trend calculation classifies increasing, stable, and decreasing evidence", () => {
  assert.equal(calculateTrend(observations([100, 110, 125]), NOW).status, "increasing");
  assert.equal(calculateTrend(observations([100, 105, 109]), NOW).status, "stable");
  assert.equal(calculateTrend(observations([100, 95, 80]), NOW).status, "decreasing");
  assert.equal(GROWTH_THRESHOLD_PERCENT, 10);
});

test("trend calculation requires sufficient observations and time span", () => {
  assert.equal(MIN_OBSERVATIONS, 3);
  const tooFew = observations([100, 130]).slice(0, 2);
  assert.equal(calculateTrend(tooFew, NOW).reason, "insufficient_observations");

  const closeTimes = [
    "2026-10-26T08:00:00.000Z",
    "2026-10-26T09:00:00.000Z",
    "2026-10-26T10:00:00.000Z",
  ];
  assert.equal(
    calculateTrend(observations([100, 120, 140], { times: closeTimes }), NOW).reason,
    "observation_window_too_short",
  );
  assert.equal(MIN_WINDOW_MS, 24 * 60 * 60 * 1000);
});

test("stale observations and measurements outside the lookback are not trending", () => {
  const stale = observations(
    [100, 130, 150],
    {
      times: [
        "2026-10-22T12:00:00.000Z",
        "2026-10-23T12:00:00.000Z",
        "2026-10-23T12:30:00.000Z",
      ],
    },
  );
  assert.equal(calculateTrend(stale, NOW).reason, "stale_observations");

  const outsideWindow = observations(
    [100, 130, 150],
    {
      times: [
        "2026-10-18T12:00:00.000Z",
        "2026-10-19T12:00:00.000Z",
        "2026-10-26T11:00:00.000Z",
      ],
    },
  );
  assert.equal(calculateTrend(outsideWindow, NOW).reason, "insufficient_observations");
});

test("duplicate events at the same observation time do not meet evidence minimums", () => {
  const repeated = observations(
    [100, 100, 100],
    {
      times: [
        "2026-10-24T12:00:00.000Z",
        "2026-10-24T12:00:00.000Z",
        "2026-10-24T12:00:00.000Z",
      ],
    },
  );
  assert.equal(calculateTrend(repeated, NOW).reason, "insufficient_observations");
});

test("missing, invalid, incompatible, and zero-baseline measurements fail safely", () => {
  assert.equal(calculateTrend([], NOW).reason, "no_observations");
  const incompatible = observations([10, 20, 30]);
  incompatible[2].signalType = "weekly_downloads";
  assert.equal(calculateTrend(incompatible, NOW).reason, "incompatible_observations");

  const invalid = observations([10, 20, 30]);
  invalid[1].measurement = Number.NaN;
  assert.equal(calculateTrend(invalid, NOW).reason, "invalid_measurement");
  const inconsistentDuplicate = observations(
    [10, 20],
    {
      times: ["2026-10-24T12:00:00.000Z", "2026-10-24T12:00:00.000Z"],
    },
  );
  assert.equal(calculateTrend(inconsistentDuplicate, NOW).reason, "inconsistent_duplicate");

  assert.equal(calculateTrend(observations([0, 20, 30]), NOW).reason, "non_positive_baseline");
});

test("manual observation preparation validates identities and deduplicates repeated events", () => {
  const duplicateTime = "2026-10-24T12:00:00.000Z";
  const input = observations([100, 100], {
    times: [duplicateTime, duplicateTime],
  });
  const prepared = prepareObservations(input, NOW);
  assert.equal(prepared.length, 1);
  assert.equal(prepared[0].measurement, 100);

  assert.throws(() => prepareObservations([{ ...input[0], toolId: "not-a-tool-id" }], NOW));
  assert.deepEqual(
    findUnmatchedToolIds(prepared, []),
    [TOOL_ID],
  );
  assert.deepEqual(
    findInconsistentObservationIds(prepared, [{ _id: prepared[0]._id, measurement: 99 }]),
    [prepared[0]._id],
  );
  assert.deepEqual(
    findInconsistentObservationIds(prepared, [{ _id: prepared[0]._id, measurement: 100 }]),
    [],
  );
});

test("manual observation preparation rejects conflicting duplicate measurements", () => {
  const [original] = observations([100]);
  assert.throws(
    () =>
      prepareObservations(
        [original, { ...original, measurement: 101 }],
        NOW,
      ),
    /Conflicting observations for the same source event and timestamp/,
  );
});

test("manual observation preparation preserves independent valid observations", () => {
  const [first, second] = observations([100, 200], {
    times: ["2026-10-24T12:00:00.000Z", "2026-10-25T12:00:00.000Z"],
  });
  const prepared = prepareObservations([first, second], NOW);
  assert.equal(prepared.length, 2);
  assert.notEqual(prepared[0]._id, prepared[1]._id);
});

test("manual observation preparation rejects unsupported or invented measurements", () => {
  const [valid] = observations([100]);
  assert.throws(
    () => prepareObservations([{ ...valid, source: "hackernews" }], NOW),
    /Unsupported source and signal/,
  );
  assert.throws(
    () => prepareObservations([{ ...valid, measurement: "100" }], NOW),
    /finite, non-negative number/,
  );
  assert.throws(
    () => prepareObservations([{ ...valid, observedAt: "2026-10-27T00:00:00.000Z" }], NOW),
    /no later than now/,
  );
});

test("manual import is dry-run by default and only writes when explicitly requested", async () => {
  const [input] = observations([100]);
  const json = JSON.stringify([{ ...input, observedAt: input.observedAt.toISOString() }]);
  let writes = 0;
  const observationModel = {
    find: () => ({ lean: async () => [] }),
    bulkWrite: async (operations) => {
      writes += operations.length;
      return { upsertedCount: operations.length };
    },
  };
  const toolModel = {
    find: () => ({
      select() {
        return { lean: async () => [{ _id: TOOL_ID }] };
      },
    }),
  };
  const previousUri = process.env.MONGO_URI;
  process.env.MONGO_URI = "test-only";

  try {
    const dryRun = await runObservationImport({
      inputPath: "observations.json",
      now: NOW,
      loadEnv() {},
      connect: async () => {},
      disconnect: async () => {},
      ToolModel: toolModel,
      ObservationModel: observationModel,
      readFile: () => json,
      logger: { log() {} },
    });
    assert.deepEqual(dryRun, { dryRun: true, count: 1 });
    assert.equal(writes, 0);

    const applied = await runObservationImport({
      inputPath: "observations.json",
      write: true,
      now: NOW,
      loadEnv() {},
      connect: async () => {},
      disconnect: async () => {},
      ToolModel: toolModel,
      ObservationModel: observationModel,
      readFile: () => json,
      logger: { log() {} },
    });
    assert.deepEqual(applied, { dryRun: false, count: 1, inserted: 1 });
    assert.equal(writes, 1);
  } finally {
    if (previousUri === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = previousUri;
  }
});

test("manual import rejects observations linked to unknown catalogue tools", async () => {
  const [input] = observations([100]);
  const previousUri = process.env.MONGO_URI;
  process.env.MONGO_URI = "test-only";

  try {
    await assert.rejects(
      runObservationImport({
        inputPath: "observations.json",
        now: NOW,
        loadEnv() {},
        connect: async () => {},
        disconnect: async () => {},
        ToolModel: {
          find: () => ({
            select() {
              return { lean: async () => [] };
            },
          }),
        },
        ObservationModel: {
          find: () => ({ lean: async () => [] }),
          bulkWrite: async () => {
            throw new Error("Writes must not occur");
          },
        },
        readFile: () =>
          JSON.stringify([{ ...input, observedAt: input.observedAt.toISOString() }]),
        logger: { log() {} },
      }),
      /Unknown catalogue tool id/,
    );
  } finally {
    if (previousUri === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = previousUri;
  }
});

test("conflicting batches are rejected before database connection or any persistence", async () => {
  const [original] = observations([100]);
  let connections = 0;
  let writes = 0;
  const previousUri = process.env.MONGO_URI;
  process.env.MONGO_URI = "test-only";

  try {
    await assert.rejects(
      runObservationImport({
        inputPath: "observations.json",
        write: true,
        now: NOW,
        loadEnv() {},
        connect: async () => {
          connections += 1;
        },
        disconnect: async () => {},
        ToolModel: {
          find: () => ({
            select() {
              return { lean: async () => [{ _id: TOOL_ID }] };
            },
          }),
        },
        ObservationModel: {
          find: () => ({ lean: async () => [] }),
          bulkWrite: async () => {
            writes += 1;
            return { upsertedCount: 0 };
          },
        },
        readFile: () =>
          JSON.stringify([
            { ...original, observedAt: original.observedAt.toISOString() },
            {
              ...original,
              measurement: 101,
              observedAt: original.observedAt.toISOString(),
            },
          ]),
        logger: { log() {} },
      }),
      /Conflicting observations for the same source event and timestamp/,
    );
    assert.equal(connections, 0);
    assert.equal(writes, 0);
  } finally {
    if (previousUri === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = previousUri;
  }
});
