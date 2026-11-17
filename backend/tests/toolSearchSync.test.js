const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Tool = require("../models/Tool");
const {
  SEARCH_SETTINGS,
  TOOL_INDEX_UID,
  rebuildToolSearchIndex,
  syncToolToSearch,
  toSearchDocument,
} = require("../services/toolSearchSync");

function createTask(status = "succeeded") {
  const task = Promise.resolve({ taskUid: 1 });
  task.waitTask = async () => ({
    status,
    error: status === "succeeded" ? null : { message: "simulated indexing failure" },
  });
  return task;
}

function createMeilisearchFixture({ failStagingWrites = false } = {}) {
  const indexes = new Map([
    [
      TOOL_INDEX_UID,
      {
        primaryKey: "id",
        documents: new Map([["stale-tool", { id: "stale-tool" }]]),
        settings: null,
      },
    ],
  ]);
  let stagingUid;

  const client = {
    async getRawIndex(uid) {
      const index = indexes.get(uid);
      if (!index) {
        const error = new Error("Index not found");
        error.cause = { code: "index_not_found" };
        throw error;
      }
      return { primaryKey: index.primaryKey };
    },
    createIndex(uid, options) {
      stagingUid = uid === TOOL_INDEX_UID ? stagingUid : uid;
      indexes.set(uid, {
        primaryKey: options.primaryKey,
        documents: new Map(),
        settings: null,
      });
      return createTask();
    },
    index(uid) {
      const indexData = indexes.get(uid);
      return {
        updateSettings(settings) {
          indexData.settings = structuredClone(settings);
          return createTask();
        },
        addDocuments(documents) {
          const status = failStagingWrites && uid === stagingUid ? "failed" : "succeeded";
          if (status === "succeeded") {
            for (const document of documents) {
              indexData.documents.set(document.id, structuredClone(document));
            }
          }
          return createTask(status);
        },
        deleteDocument(id) {
          indexData.documents.delete(id);
          return createTask();
        },
      };
    },
    swapIndexes([{ indexes: [leftUid, rightUid] }]) {
      const left = indexes.get(leftUid);
      const right = indexes.get(rightUid);
      indexes.set(leftUid, right);
      indexes.set(rightUid, left);
      return createTask();
    },
    deleteIndex(uid) {
      indexes.delete(uid);
      return createTask();
    },
  };

  return { client, indexes, get stagingUid() { return stagingUid; } };
}

function installToolFind(records) {
  const originalFind = Tool.find;
  let lastQuery;
  Tool.find = (query) => {
    lastQuery = query;
    return { lean: async () => records };
  };
  return {
    restore() {
      Tool.find = originalFind;
    },
    get lastQuery() {
      return lastQuery;
    },
  };
}

test("search document maps approved Tool metadata and excludes review markers", () => {
  const id = new mongoose.Types.ObjectId();
  const document = toSearchDocument({
    _id: id,
    validated: true,
    name: "Example",
    category: "Design",
    description: "Design and prototype interfaces",
    tags: ["UI", "UX"],
    platforms: ["Web"],
    searchKeywords: [
      "role:ui/ux designer",
      "catalogue:established",
      "prototyping",
      "interface design",
    ],
    features: ["Interactive prototypes"],
    officialUrl: "https://example.com",
    source: "curated-seed",
    score: 3,
    githubStars: 20,
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
  });

  assert.equal(document.id, id.toString());
  assert.deepEqual(document.roles, ["ui/ux designer"]);
  assert.deepEqual(document.useCases, ["prototyping", "interface design"]);
  assert.deepEqual(document.searchKeywords, document.useCases);
  assert.equal(document.createdAt, "2026-01-02T00:00:00.000Z");
  assert.equal(toSearchDocument({ _id: id, validationStatus: "validated" }), null);
});

test("rebuild indexes only validated Tool records and atomically replaces stale documents", async () => {
  const approvedId = new mongoose.Types.ObjectId();
  const records = [
    {
      _id: approvedId,
      validated: true,
      name: "Approved tool",
      category: "Development",
      searchKeywords: ["role:frontend developer", "code editor"],
    },
    {
      _id: new mongoose.Types.ObjectId(),
      validationStatus: "pending",
      name: "Unapproved candidate",
    },
  ];
  const fixture = createMeilisearchFixture();
  const modelFixture = installToolFind(records);

  try {
    const first = await rebuildToolSearchIndex({
      ToolModel: Tool,
      client: fixture.client,
      batchSize: 1,
    });
    const second = await rebuildToolSearchIndex({
      ToolModel: Tool,
      client: fixture.client,
      batchSize: 1,
    });

    assert.deepEqual(modelFixture.lastQuery, { validated: true });
    assert.deepEqual(first, { indexUid: TOOL_INDEX_UID, indexed: 1 });
    assert.deepEqual(second, first);
    assert.deepEqual(
      Array.from(fixture.indexes.get(TOOL_INDEX_UID).documents.keys()),
      [approvedId.toString()],
    );
    assert.deepEqual(
      fixture.indexes.get(TOOL_INDEX_UID).settings.searchableAttributes,
      SEARCH_SETTINGS.searchableAttributes,
    );
    assert.equal(fixture.indexes.has(fixture.stagingUid), false);
  } finally {
    modelFixture.restore();
  }
});

test("rebuild reports indexing failures and preserves the current index", async () => {
  const originalDocument = { id: "existing-approved-tool" };
  const fixture = createMeilisearchFixture({ failStagingWrites: true });
  fixture.indexes.get(TOOL_INDEX_UID).documents.set(originalDocument.id, originalDocument);
  const modelFixture = installToolFind([
    {
      _id: new mongoose.Types.ObjectId(),
      validated: true,
      name: "New approved tool",
    },
  ]);

  try {
    await assert.rejects(
      rebuildToolSearchIndex({ ToolModel: Tool, client: fixture.client }),
      /Meilisearch index Tool batch 1 task failed/,
    );
    assert.deepEqual(
      Array.from(fixture.indexes.get(TOOL_INDEX_UID).documents.keys()).sort(),
      ["existing-approved-tool", "stale-tool"],
    );
    assert.equal(fixture.indexes.has(fixture.stagingUid), false);
  } finally {
    modelFixture.restore();
  }
});

test("single Tool synchronization reads only the canonical Tool model and removes unapproved records", async () => {
  const originalFindById = Tool.findById;
  let lookupId;
  Tool.findById = (id) => {
    lookupId = id;
    return { lean: async () => ({ _id: id, validated: false }) };
  };
  const fixture = createMeilisearchFixture();
  const id = new mongoose.Types.ObjectId();

  try {
    fixture.indexes.get(TOOL_INDEX_UID).documents.set(id.toString(), { id: id.toString() });
    const result = await syncToolToSearch(id, { ToolModel: Tool, client: fixture.client });

    assert.equal(lookupId, id);
    assert.deepEqual(result, { indexed: false, id: id.toString() });
    assert.equal(fixture.indexes.get(TOOL_INDEX_UID).documents.has(id.toString()), false);
  } finally {
    Tool.findById = originalFindById;
  }
});
