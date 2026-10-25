const path = require("path");
const mongoose = require("mongoose");
const toolsByRole = require("../data/tools");
const Tool = require("../models/Tool");

function collectSeedTools(seedData) {
  const uniqueTools = new Map();

  for (const [role, tools] of Object.entries(seedData)) {
    for (const tool of tools) {
      const identity = tool.name.trim().toLowerCase();
      const existing = uniqueTools.get(identity);
      const roleKeyword = `role:${role.toLowerCase()}`;
      const catalogueKeyword = "catalogue:established";

      if (existing) {
        existing.searchKeywords = Array.from(
          new Set([
            ...existing.searchKeywords,
            roleKeyword,
            catalogueKeyword,
            ...(tool.searchKeywords || []),
          ]),
        );
        continue;
      }

      uniqueTools.set(identity, {
        name: tool.name.trim(),
        category: tool.category || "",
        description: tool.description || "",
        officialUrl: tool.officialUrl,
        logoDomain: new URL(tool.officialUrl).hostname.replace(/^www\./, ""),
        tags: Array.from(new Set(tool.tags || [])),
        platforms: Array.from(new Set(tool.platforms || [])),
        searchKeywords: Array.from(
          new Set([roleKeyword, catalogueKeyword, ...(tool.searchKeywords || [])]),
        ),
        source: "curated-seed",
        validated: true,
        isTrending: false,
      });
    }
  }

  return Array.from(uniqueTools.values());
}

async function seedTools({ ToolModel = Tool, seedData = toolsByRole } = {}) {
  const records = collectSeedTools(seedData);
  let inserted = 0;

  for (const record of records) {
    const { searchKeywords, ...insertOnlyFields } = record;
    const result = await ToolModel.updateOne(
      { name: record.name },
      {
        $setOnInsert: insertOnlyFields,
        $addToSet: {
          searchKeywords: { $each: searchKeywords },
        },
      },
      { upsert: true },
    );
    inserted += result.upsertedCount || 0;
  }

  return {
    processed: records.length,
    inserted,
    alreadyPresent: records.length - inserted,
  };
}

async function run() {
  require("dotenv").config({
    path: path.resolve(__dirname, "../../.env"),
  });
  const connectDB = require("../config/db");

  await connectDB();
  try {
    const result = await seedTools();
    console.log(
      `Seed complete: ${result.inserted} inserted, ${result.alreadyPresent} already present.`,
    );
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error("Tool seed failed:", error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  collectSeedTools,
  seedTools,
};
