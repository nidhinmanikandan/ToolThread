const { Meilisearch } = require("meilisearch");

let client;
let clientHost;
let clientApiKey;

function createMeilisearchClient({
  host = process.env.MEILI_HOST,
  apiKey = process.env.MEILI_API_KEY,
} = {}) {
  if (typeof host !== "string" || !host.trim()) {
    throw new Error("MEILI_HOST is not configured");
  }

  const options = { host: host.trim() };
  if (typeof apiKey === "string" && apiKey.trim()) {
    options.apiKey = apiKey.trim();
  }

  return new Meilisearch(options);
}

function getMeilisearchClient() {
  const host = process.env.MEILI_HOST;
  const apiKey = process.env.MEILI_API_KEY;

  if (!client || host !== clientHost || apiKey !== clientApiKey) {
    client = createMeilisearchClient({ host, apiKey });
    clientHost = host;
    clientApiKey = apiKey;
  }

  return client;
}

module.exports = {
  createMeilisearchClient,
  getMeilisearchClient,
};
