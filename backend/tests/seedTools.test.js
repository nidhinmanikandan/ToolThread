const test = require("node:test");
const assert = require("node:assert/strict");
const toolsByRole = require("../data/tools");
const { collectSeedTools, seedTools } = require("../scripts/seedTools");

function createToolModel(initialRecords = []) {
  const records = new Map(initialRecords.map((record) => [record.name, structuredClone(record)]));

  return {
    records,
    async updateOne(filter, update, options) {
      assert.equal(options.upsert, true);
      const existing = records.get(filter.name);

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
      records.set(filter.name, inserted);
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
