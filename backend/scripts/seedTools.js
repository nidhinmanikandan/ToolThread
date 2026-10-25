const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const toolsByRole = require("../data/tools");
const Tool = require("../models/Tool");

const ENV_PATHS = [
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../.env"),
];

function getEnvFilePath(existsSync = fs.existsSync) {
  return ENV_PATHS.find((envPath) => existsSync(envPath));
}

function loadEnvironment({ config = dotenv.config, existsSync = fs.existsSync } = {}) {
  const envPath = getEnvFilePath(existsSync);
  if (envPath) {
    const result = config({ path: envPath });
    if (result.error) {
      throw result.error;
    }
  }
  return envPath;
}

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
    const escapedName = record.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const result = await ToolModel.updateOne(
      { name: { $regex: `^${escapedName}$`, $options: "i" } },
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

async function run({
  loadEnv = loadEnvironment,
  connect,
  disconnect,
  ToolModel = Tool,
  logger = console,
} = {}) {
  loadEnv();
  const mongoUri = process.env.MONGO_URI;
  logger.log(`MONGO_URI configured: ${mongoUri ? "yes" : "no"}`);
  if (!mongoUri) {
    throw new Error("MONGO_URI is not configured");
  }

  const connectDB = connect || require("../config/db");
  const disconnectDB = disconnect || (() => mongoose.disconnect());
  let seedFailed = false;
  try {
    await connectDB();
    const result = await seedTools({ ToolModel });
    logger.log(
      `Seed complete: ${result.inserted} inserted, ${result.alreadyPresent} already present.`,
    );
  } catch (error) {
    seedFailed = true;
    throw error;
  } finally {
    try {
      await disconnectDB();
    } catch (error) {
      logger.error("MongoDB disconnect failed.");
      if (!seedFailed) {
        throw error;
      }
    }
  }
}

if (require.main === module) {
  run().catch(() => {
    console.error("Tool seed failed. Check MONGO_URI configuration and MongoDB connectivity.");
    process.exitCode = 1;
  });
}

module.exports = {
  collectSeedTools,
  getEnvFilePath,
  loadEnvironment,
  run,
  seedTools,
};
