require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const { rebuildToolSearchIndex } = require("../services/toolSearchSync");

async function run({
  connect = connectDB,
  disconnect = () => mongoose.disconnect(),
  rebuild = rebuildToolSearchIndex,
  logger = console,
} = {}) {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured");
  }

  await connect();
  let rebuildFailed = false;
  try {
    const result = await rebuild();
    logger.log(`Search index rebuilt: ${result.indexed} approved Tools indexed.`);
    return result;
  } catch (error) {
    rebuildFailed = true;
    throw error;
  } finally {
    try {
      await disconnect();
    } catch (error) {
      logger.error("MongoDB disconnect failed.");
      if (!rebuildFailed) {
        throw error;
      }
    }
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error("Tool search reindex failed:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { run };
