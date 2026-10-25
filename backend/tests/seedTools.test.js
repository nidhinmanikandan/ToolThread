const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const toolsByRole = require("../data/tools");
const {
  collectSeedTools,
  getEnvFilePath,
  loadEnvironment,
  run,
  seedTools,
} = require("../scripts/seedTools");

function createToolModel(initialRecords = []) {
  const records = new Map(initialRecords.map((record) => [record.name, structuredClone(record)]));

  return {
    records,
    async updateOne(filter, update, options) {
      assert.equal(options.upsert, true);
      const nameExpression = filter.name.$regex;
      const nameMatcher = new RegExp(nameExpression, filter.name.$options);
      const existingEntry = Array.from(records.entries()).find(([name]) =>
        nameMatcher.test(name),
      );
      const existing = existingEntry?.[1];

      if (existing) {
        const keywords = update.$addToSet?.searchKeywords?.$each || [];
        existing.searchKeywords = Array.from(
          new Set([...(existing.searchKeywords || []), ...keywords]),
        );
        return { upsertedCount: 0 };
      }

      const inserted = structuredClone(update.$setOnInsert);
      const keywords = update.$addToSet?.searchKeywords?.$each || [];
      inserted.searchKeywords = Array.from(new Set([...keywords]));
      records.set(inserted.name, inserted);
      return { upsertedCount: 1 };
    },
  };
}

test("seed data includes established tools for design, AI/ML, and analytics roles", () => {
  const records = collectSeedTools(toolsByRole);
  const byName = new Map(records.map((record) => [record.name, record]));

  for (const name of ["Figma", "Adobe Photoshop", "Adobe Illustrator", "Framer"]) {
    assert.ok(byName.has(name), `${name} should be included in the seed catalogue`);
  }

  for (const name of ["PyTorch", "TensorFlow", "Hugging Face", "Jupyter"]) {
    assert.ok(byName.has(name), `${name} should be included for AI/ML developers`);
  }

  for (const name of ["Microsoft Excel", "Power BI", "Tableau", "PostgreSQL"]) {
    assert.ok(byName.has(name), `${name} should be included for data analysts`);
  }

  for (const record of records) {
    assert.match(record.officialUrl, /^https:\/\/\S+$/);
    assert.equal(record.validated, true);
    assert.equal(record.isTrending, false);
  }
});

test("repeated seed execution is idempotent and only adds missing role keywords to existing records", async () => {
  const existingFigma = {
    name: "Figma",
    category: "Existing category",
    description: "Existing description",
    officialUrl: "https://existing.example",
    source: "hackernews",
    validated: false,
    searchKeywords: ["existing-keyword"],
  };
  const model = createToolModel([existingFigma]);

  const firstRun = await seedTools({ ToolModel: model });
  const secondRun = await seedTools({ ToolModel: model });

  assert.equal(firstRun.processed, model.records.size);
  assert.ok(firstRun.inserted > 0);
  assert.equal(secondRun.inserted, 0);
  assert.equal(secondRun.alreadyPresent, secondRun.processed);
  assert.equal(model.records.size, firstRun.processed);

  const savedFigma = model.records.get("Figma");
  assert.equal(savedFigma.category, existingFigma.category);
  assert.equal(savedFigma.description, existingFigma.description);
  assert.equal(savedFigma.officialUrl, existingFigma.officialUrl);
  assert.equal(savedFigma.source, existingFigma.source);
  assert.equal(savedFigma.validated, existingFigma.validated);
  assert.ok(savedFigma.searchKeywords.includes("existing-keyword"));
  assert.ok(savedFigma.searchKeywords.includes("role:ui/ux designer"));
  assert.equal(
    collectSeedTools(toolsByRole).filter((tool) => tool.name === "Framer").length,
    1,
  );
});

test("seed matches existing names without case sensitivity and preserves their fields", async () => {
  const existingFigma = {
    name: "figma",
    category: "User category",
    officialUrl: "https://user.example",
    source: "hackernews",
    validated: false,
    searchKeywords: ["existing"],
  };
  const model = createToolModel([existingFigma]);

  const result = await seedTools({ ToolModel: model });

  assert.equal(result.inserted, result.processed - 1);
  assert.equal(model.records.size, result.processed);
  assert.equal(model.records.has("Figma"), false);
  assert.equal(model.records.get("figma").officialUrl, existingFigma.officialUrl);
  assert.equal(model.records.get("figma").source, existingFigma.source);
  assert.ok(model.records.get("figma").searchKeywords.includes("role:ui/ux designer"));
});

test("environment loading prefers repository .env and falls back to backend .env", () => {
  const loadedPaths = [];
  const repositoryEnv = getEnvFilePath(() => true);
  const backendEnv = getEnvFilePath((candidate) => candidate.endsWith(`${path.sep}backend${path.sep}.env`));
  const config = ({ path: envPath }) => loadedPaths.push(envPath);

  assert.ok(repositoryEnv.endsWith(`${path.sep}.env`));
  assert.ok(!repositoryEnv.endsWith(`${path.sep}backend${path.sep}.env`));
  assert.ok(backendEnv.endsWith(`${path.sep}backend${path.sep}.env`));
  assert.equal(loadEnvironment({ config, existsSync: (candidate) => candidate === backendEnv }), backendEnv);
  assert.deepEqual(loadedPaths, [backendEnv]);
});

test("seed run attempts MongoDB cleanup if the connection fails", async () => {
  const previousUri = process.env.MONGO_URI;
  let disconnected = false;
  const logs = [];

  process.env.MONGO_URI = "mongodb://example.invalid/test";
  try {
    await assert.rejects(
      run({
        loadEnv() {},
        async connect() {
          throw new Error("mock connection failure");
        },
        async disconnect() {
          disconnected = true;
        },
        logger: {
          log(message) {
            logs.push(message);
          },
          error(message) {
            logs.push(message);
          },
        },
      }),
      /mock connection failure/,
    );
    assert.equal(disconnected, true);
    assert.deepEqual(logs, ["MONGO_URI configured: yes"]);
    assert.ok(!logs.some((message) => message.includes(process.env.MONGO_URI)));
  } finally {
    if (previousUri === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = previousUri;
  }
});

test("seed run reports missing MongoDB configuration without connecting", async () => {
  const previousUri = process.env.MONGO_URI;
  let connected = false;
  let diagnostic = "";

  delete process.env.MONGO_URI;
  try {
    await assert.rejects(
      run({
        loadEnv() {},
        async connect() {
          connected = true;
        },
        logger: {
          log(message) {
            diagnostic = message;
          },
          error() {},
        },
      }),
      /MONGO_URI is not configured/,
    );
    assert.equal(diagnostic, "MONGO_URI configured: no");
    assert.equal(connected, false);
  } finally {
    if (previousUri === undefined) delete process.env.MONGO_URI;
    else process.env.MONGO_URI = previousUri;
  }
});
