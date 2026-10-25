const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("node:http");
const Module = require("node:module");

function mockModule(modulePath, exports) {
  const resolvedPath = require.resolve(modulePath);
  const previousModule = require.cache[resolvedPath];
  const replacement = new Module(resolvedPath);
  replacement.filename = resolvedPath;
  replacement.loaded = true;
  replacement.exports = exports;
  require.cache[resolvedPath] = replacement;

  return () => {
    delete require.cache[resolvedPath];
    if (previousModule) require.cache[resolvedPath] = previousModule;
  };
}

async function withServer(router, callback) {
  const app = express();
  app.use(express.json());
  app.use(router);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = server.address();
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("recommendations endpoint retains the generated list response and resolver generation path", async () => {
  const savedRecommendations = [];
  const generatedTools = Array.from({ length: 12 }, (_, index) => ({
    name: `Generated Tool ${index + 1}`,
    category: "Generated category",
    description: "Generated description",
    officialUrl: "https://example.com",
    logoDomain: "example.com",
    isTrending: false,
  }));
  let generationCalls = 0;
  const restoreModel = mockModule("../models/Recommendation", {
    findOne: async () => null,
    findOneAndUpdate: async (query, update) => {
      savedRecommendations.push({ query, update });
    },
  });
  const restoreGenerator = mockModule("../services/aiRecommendation", async () => {
    generationCalls += 1;
    return generatedTools;
  });

  try {
    const resolverPath = require.resolve("../services/recommendationResolver");
    delete require.cache[resolverPath];
    const resolveRecommendations = require("../services/recommendationResolver");
    const restoreResolver = mockModule(
      "../services/recommendationResolver",
      resolveRecommendations,
    );
    const routePath = require.resolve("../routes/recommendations");
    delete require.cache[routePath];
    const router = require("../routes/recommendations");

    try {
      await withServer(router, async (baseUrl) => {
        const response = await fetch(baseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            role: "AI Engineer",
            interest: "AI",
            level: "Intermediate",
          }),
        });
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), generatedTools);
      });
    } finally {
      delete require.cache[routePath];
      restoreResolver();
    }

    assert.equal(generationCalls, 1);
    assert.equal(savedRecommendations.length, 1);
    assert.equal(savedRecommendations[0].update.tools.length, 12);
  } finally {
    restoreGenerator();
    restoreModel();
  }
});

test("roadmap endpoint retains its generated guide-tree response and cache behavior", async () => {
  const generatedRoadmap = {
    title: "Generated Tool",
    description: "Generated guide",
    logoDomain: "example.com",
    roadmap: [
      {
        id: "root",
        title: "Foundations",
        description: "Learn the basics",
        steps: ["Read docs", "Try examples", "Build a project"],
        parents: [],
      },
    ],
  };
  let savedRoadmap = null;
  let generationCalls = 0;
  const restoreModel = mockModule("../models/Roadmap", {
    findOne: async () => (savedRoadmap ? { roadmap: savedRoadmap } : null),
    create: async (record) => {
      savedRoadmap = record.roadmap;
    },
  });
  const restoreGenerator = mockModule("../services/aiRoadmapRecommendation", async () => {
    generationCalls += 1;
    return generatedRoadmap;
  });

  try {
    const routePath = require.resolve("../routes/roadmap");
    delete require.cache[routePath];
    const router = require("../routes/roadmap");

    try {
      await withServer(router, async (baseUrl) => {
        for (let request = 0; request < 2; request += 1) {
          const response = await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tool: { name: "Generated Tool", description: "A demo tool" },
            }),
          });
          assert.equal(response.status, 200);
          assert.deepEqual(await response.json(), generatedRoadmap);
        }
      });
    } finally {
      delete require.cache[routePath];
    }

    assert.equal(generationCalls, 1);
    assert.deepEqual(savedRoadmap, generatedRoadmap);
  } finally {
    restoreGenerator();
    restoreModel();
  }
});
