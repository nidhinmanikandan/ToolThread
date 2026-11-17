require("dotenv").config();

const connectDB = require("./config/db");

const CandidateTool = require("./models/CandidateTool");
const Tool = require("./models/Tool");
const { rebuildToolSearchIndex } = require("./services/toolSearchSync");

async function reset() {
  await connectDB();

  await CandidateTool.deleteMany({});
  await Tool.deleteMany({});

  try {
    await rebuildToolSearchIndex();
  } catch (error) {
    console.error("Meilisearch rebuild failed after database reset:", error.message);
  }

  console.log("Database cleared.");

  process.exit(0);
}

reset().catch(console.error);