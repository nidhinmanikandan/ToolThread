const { getMeilisearchClient } = require("../config/meilisearch");

async function checkMeilisearchHealth({ getClient = getMeilisearchClient } = {}) {
  try {
    const result = await getClient().health();
    if (result?.status === "available") {
      return { status: "available" };
    }

    return { status: "unavailable", reason: "unexpected_status" };
  } catch (error) {
    return {
      status: "unavailable",
      reason:
        error instanceof Error && error.message === "MEILI_HOST is not configured"
          ? "not_configured"
          : "connection_failed",
      error,
    };
  }
}

module.exports = {
  checkMeilisearchHealth,
};
