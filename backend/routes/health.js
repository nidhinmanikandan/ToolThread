const express = require("express");
const { checkMeilisearchHealth } = require("../services/meilisearchService");

function createHealthRouter({ checkHealth = checkMeilisearchHealth } = {}) {
  const router = express.Router();

  router.get("/meilisearch", async (req, res) => {
    const result = await checkHealth();
    if (result.error) {
      console.error("Meilisearch health check failed:", result.reason);
    }

    if (result.status === "available") {
      return res.json({ service: "meilisearch", status: "available" });
    }

    return res.status(503).json({
      service: "meilisearch",
      status: "unavailable",
      reason: result.reason,
    });
  });

  return router;
}

module.exports = createHealthRouter();
module.exports.createHealthRouter = createHealthRouter;
