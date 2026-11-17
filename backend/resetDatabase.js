require("dotenv").config();

const connectDB = require("./config/db");

const CandidateTool = require("./models/CandidateTool");
const Tool = require("./models/Tool");
const { rebuildToolSearchIndex } = require("./services/toolSearchSync");

async function reset() {
  await connectDB();

  await CandidateTool.deleteMany({});
  await Tool.deleteMany({});

  let searchRebuildFailed = false;
  try {
    await rebuildToolSearchIndex();
  } catch (error) {
    console.error("Meilisearch rebuild failed after database reset:", error.message);
    searchRebuildFailed = true;
  }

  console.log("Database cleared.");

  process.exit(searchRebuildFailed ? 1 : 0);
}

reset().catch(console.error);