const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const { loadEnvironment } = require("./seedTools");

const ALLOWED_SIGNALS = {
  github: new Set(["stars_total"]),
  npm: new Set(["weekly_downloads"]),
};

function prepareObservations(input, now = new Date()) {
  if (!Array.isArray(input)) {
    throw new Error("Observation input must be a JSON array");
  }

  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(nowMs)) {
    throw new Error("Invalid current time");
  }

  const prepared = new Map();
  for (const item of input) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Each observation must be an object");
    }
    if (!mongoose.isValidObjectId(item.toolId)) {
      throw new Error(`Invalid catalogue tool id: ${item.toolId}`);
    }
    if (!ALLOWED_SIGNALS[item.source]?.has(item.signalType)) {
      throw new Error(`Unsupported source and signal: ${item.source}/${item.signalType}`);
    }
    if (
      typeof item.sourceEventId !== "string" ||
      !item.sourceEventId.trim() ||
      item.sourceEventId.trim().length > 256
    ) {
      throw new Error("sourceEventId must be a non-empty string of at most 256 characters");
    }
    if (
      typeof item.measurement !== "number" ||
      !Number.isFinite(item.measurement) ||
      item.measurement < 0
    ) {
      throw new Error("measurement must be a finite, non-negative number");
    }

    const observedAt = new Date(item.observedAt);
    if (!item.observedAt || !Number.isFinite(observedAt.getTime()) || observedAt.getTime() > nowMs) {
      throw new Error("observedAt must be a valid timestamp no later than now");
    }

    const toolId = new mongoose.Types.ObjectId(item.toolId);
    const sourceEventId = item.sourceEventId.trim();
    const identity = [
      toolId.toString(),
      item.source,
      item.signalType,
      sourceEventId,
      observedAt.toISOString(),
    ].join("|");
    const _id = crypto.createHash("sha256").update(identity).digest("hex");

    const observation = {
      _id,
      toolId,
      source: item.source,
      signalType: item.signalType,
      measurement: item.measurement,
      observedAt,
      sourceEventId,
    };
    const existing = prepared.get(_id);
    if (existing && existing.measurement !== observation.measurement) {
      throw new Error(
        `Conflicting observations for the same source event and timestamp: ${sourceEventId}`,
      );
    }
    if (!existing) {
      prepared.set(_id, observation);
    }
  }

  return Array.from(prepared.values());
}

function findUnmatchedToolIds(observations, matchedToolIds) {
  const matched = new Set(matchedToolIds.map((id) => id.toString()));
  return Array.from(
    new Set(
      observations
        .map((observation) => observation.toolId.toString())
        .filter((toolId) => !matched.has(toolId)),
    ),
  );
}

function findInconsistentObservationIds(observations, storedObservations) {
  const storedById = new Map(storedObservations.map((observation) => [observation._id, observation]));
  return observations
    .filter((observation) => {
      const stored = storedById.get(observation._id);
      return stored && stored.measurement !== observation.measurement;
    })
    .map((observation) => observation._id);
}

async function run({
  inputPath,
  write = false,
  now = new Date(),
  loadEnv = loadEnvironment,
  connect,
  disconnect,
  ToolModel = require("../models/Tool"),
  ObservationModel = require("../models/TrendObservation"),
  readFile = fs.readFileSync,
  logger = console,
} = {}) {
  if (!inputPath) {
    throw new Error("Usage: node scripts/recordTrendObservations.js <input.json> [--write]");
  }
  const resolvedInput = path.resolve(inputPath);
  const input = JSON.parse(readFile(resolvedInput, "utf8"));
  const observations = prepareObservations(input, now);

  loadEnv();
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  const connectDB = connect || require("../config/db");
  const disconnectDB = disconnect || (() => mongoose.disconnect());
  await connectDB();
  try {
    const toolIds = Array.from(new Set(observations.map((item) => item.toolId.toString())));
    const tools = await ToolModel.find({ _id: { $in: toolIds } }).select("_id").lean();
    const unmatched = findUnmatchedToolIds(observations, tools.map((tool) => tool._id));
    if (unmatched.length > 0) {
      throw new Error(`Unknown catalogue tool id(s): ${unmatched.join(", ")}`);
    }

    const existing = await ObservationModel.find({
      _id: { $in: observations.map((observation) => observation._id) },
    }).lean();
    const inconsistent = findInconsistentObservationIds(observations, existing);
    if (inconsistent.length > 0) {
      throw new Error(
        `Conflicting measurement for existing observation id(s): ${inconsistent.join(", ")}`,
      );
    }

    if (!write) {
      logger.log(`Dry run: ${observations.length} valid observation(s); no writes made.`);
      return { dryRun: true, count: observations.length };
    }

    const result = await ObservationModel.bulkWrite(
      observations.map((observation) => ({
        updateOne: {
          filter: { _id: observation._id },
          update: { $setOnInsert: observation },
          upsert: true,
        },
      })),
    );
    logger.log(
      `Observation import complete: ${result.upsertedCount} inserted, ${observations.length - result.upsertedCount} already present.`,
    );
    return { dryRun: false, count: observations.length, inserted: result.upsertedCount };
  } finally {
    await disconnectDB();
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const positionalArgs = args.filter((argument) => argument !== "--write");
  run({ inputPath: positionalArgs[0], write }).catch((error) => {
    console.error(`Trend observation import failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  findInconsistentObservationIds,
  findUnmatchedToolIds,
  prepareObservations,
  run,
};
