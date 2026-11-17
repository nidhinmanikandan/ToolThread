const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("node:http");
const {
  createMeilisearchClient,
} = require("../config/meilisearch");
const { checkMeilisearchHealth } = require("../services/meilisearchService");
const { createHealthRouter } = require("../routes/health");

test("Meilisearch client requires a configured host and accepts server-side keys", () => {
  assert.throws(() => createMeilisearchClient({ host: "" }), /MEILI_HOST is not configured/);

  const client = createMeilisearchClient({
    host: "http://localhost:7700",
    apiKey: "server-only-test-key",
  });

  assert.equal(client.config.host, "http://localhost:7700");
  assert.equal(client.config.apiKey, "server-only-test-key");
});

test("Meilisearch health check distinguishes available, unconfigured, and unreachable states", async () => {
  const available = await checkMeilisearchHealth({
    getClient: () => ({ health: async () => ({ status: "available" }) }),
  });
  assert.deepEqual(available, { status: "available" });

  const unconfigured = await checkMeilisearchHealth({
    getClient: () => {
      throw new Error("MEILI_HOST is not configured");
    },
  });
  assert.deepEqual(unconfigured, {
    status: "unavailable",
    reason: "not_configured",
    error: unconfigured.error,
  });

  const connectionError = new Error("Connection refused");
  const unreachable = await checkMeilisearchHealth({
    getClient: () => ({
      health: async () => {
        throw connectionError;
      },
    }),
  });
  assert.equal(unreachable.status, "unavailable");
  assert.equal(unreachable.reason, "connection_failed");
  assert.equal(unreachable.error, connectionError);
});

test("Meilisearch health endpoint returns availability without exposing connection errors", async () => {
  const app = express();
  app.use(
    "/api/health",
    createHealthRouter({
      checkHealth: async () => ({
        status: "unavailable",
        reason: "connection_failed",
        error: new Error("private connection detail"),
      }),
    }),
  );
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/health/meilisearch`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      service: "meilisearch",
      status: "unavailable",
      reason: "connection_failed",
    });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
