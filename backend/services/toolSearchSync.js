const Tool = require("../models/Tool");
const { getMeilisearchClient } = require("../config/meilisearch");

const TOOL_INDEX_UID = "toolthread_tools";
const INDEX_BATCH_SIZE = 500;
const SEARCH_SETTINGS = {
  searchableAttributes: [
    "name",
    "category",
    "useCases",
    "tags",
    "searchKeywords",
    "roles",
    "features",
    "platforms",
    "description",
    "documentation",
    "gettingStarted",
    "pricing",
  ],
  filterableAttributes: ["category", "tags", "platforms", "roles", "source", "isTrending"],
  sortableAttributes: ["score", "githubStars", "createdAt", "name"],
  displayedAttributes: [
    "id",
    "name",
    "description",
    "category",
    "tags",
    "platforms",
    "useCases",
    "officialUrl",
    "logoDomain",
    "source",
    "score",
    "githubStars",
    "createdAt",
  ],
};

const configuredIndexes = new WeakMap();

function strings(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function toSearchDocument(tool) {
  if (!tool || tool.validated !== true) {
    return null;
  }

  if (tool._id === undefined || tool._id === null) {
    throw new Error("Cannot index a Tool without a MongoDB _id");
  }

  const searchKeywords = strings(tool.searchKeywords);
  const timestamp = tool.createdAt ? new Date(tool.createdAt) : null;
  const document = {
    id: String(tool._id),
    name: typeof tool.name === "string" ? tool.name : "",
    description: typeof tool.description === "string" ? tool.description : "",
    category: typeof tool.category === "string" ? tool.category : "",
    tags: strings(tool.tags),
    platforms: strings(tool.platforms),
    roles: searchKeywords
      .filter((keyword) => keyword.startsWith("role:"))
      .map((keyword) => keyword.slice("role:".length)),
    // Role and catalogue markers are metadata; the remaining keywords describe use cases.
    useCases: searchKeywords.filter(
      (keyword) => !keyword.startsWith("role:") && !keyword.startsWith("catalogue:"),
    ),
    searchKeywords: searchKeywords.filter(
      (keyword) => !keyword.startsWith("role:") && !keyword.startsWith("catalogue:"),
    ),
    features: strings(tool.features),
    documentation: strings(tool.documentation),
    officialUrl: typeof tool.officialUrl === "string" ? tool.officialUrl : "",
    githubUrl: typeof tool.githubUrl === "string" ? tool.githubUrl : "",
    logoDomain: typeof tool.logoDomain === "string" ? tool.logoDomain : "",
    source: typeof tool.source === "string" ? tool.source : "",
    isTrending: Boolean(tool.isTrending),
    score: Number.isFinite(tool.score) ? tool.score : 0,
    githubStars: Number.isFinite(tool.githubStars) ? tool.githubStars : 0,
    gettingStarted: typeof tool.gettingStarted === "string" ? tool.gettingStarted : "",
    pricing: typeof tool.pricing === "string" ? tool.pricing : "",
  };

  if (timestamp && Number.isFinite(timestamp.getTime())) {
    document.createdAt = timestamp.toISOString();
  }

  return document;
}

async function waitForTask(taskPromise, operation) {
  const task = await taskPromise.waitTask();
  if (task.status !== "succeeded") {
    const reason = task.error?.message || task.error?.code || task.status;
    throw new Error(`Meilisearch ${operation} task ${task.status}: ${reason}`);
  }
  return task;
}

async function ensureIndexExists(client, indexUid) {
  try {
    const indexInfo = await client.getRawIndex(indexUid);
    if (indexInfo.primaryKey && indexInfo.primaryKey !== "id") {
      throw new Error(
        `Meilisearch index '${indexUid}' uses primary key '${indexInfo.primaryKey}', expected 'id'`,
      );
    }
  } catch (error) {
    if (error?.cause?.code !== "index_not_found") {
      throw error;
    }
    await waitForTask(
      client.createIndex(indexUid, { primaryKey: "id" }),
      `create index '${indexUid}'`,
    );
  }
}

async function configureIndex(client, indexUid) {
  await ensureIndexExists(client, indexUid);
  const index = client.index(indexUid);
  await waitForTask(index.updateSettings(SEARCH_SETTINGS), `configure index '${indexUid}'`);
  return index;
}

async function getConfiguredIndex(client) {
  let configured = configuredIndexes.get(client);
  if (!configured) {
    configured = configureIndex(client, TOOL_INDEX_UID);
    configuredIndexes.set(client, configured);
    configured.catch(() => configuredIndexes.delete(client));
  }
  return configured;
}

async function syncToolToSearch(toolId, { ToolModel = Tool, client = getMeilisearchClient() } = {}) {
  if (toolId === undefined || toolId === null) {
    throw new Error("A Tool _id is required for search synchronization");
  }

  const index = await getConfiguredIndex(client);
  const tool = await ToolModel.findById(toolId).lean();
  const document = toSearchDocument(tool);

  if (document) {
    await waitForTask(index.addDocuments([document]), `index Tool '${document.id}'`);
    return { indexed: true, id: document.id };
  }

  const id = String(toolId);
  await waitForTask(index.deleteDocument(id), `remove Tool '${id}'`);
  return { indexed: false, id };
}

function makeStagingIndexUid() {
  return `${TOOL_INDEX_UID}_rebuild_${process.pid}_${Date.now()}`;
}

async function rebuildToolSearchIndex({
  ToolModel = Tool,
  client = getMeilisearchClient(),
  batchSize = INDEX_BATCH_SIZE,
} = {}) {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error("Search index batch size must be a positive integer");
  }

  const tools = await ToolModel.find({ validated: true }).lean();
  const documents = tools.map(toSearchDocument).filter(Boolean);
  const stagingIndexUid = makeStagingIndexUid();
  let stagingCreated = false;
  let swapped = false;

  await configureIndex(client, TOOL_INDEX_UID);

  try {
    await waitForTask(
      client.createIndex(stagingIndexUid, { primaryKey: "id" }),
      `create staging index '${stagingIndexUid}'`,
    );
    stagingCreated = true;

    const stagingIndex = await configureIndex(client, stagingIndexUid);
    for (let offset = 0; offset < documents.length; offset += batchSize) {
      const batch = documents.slice(offset, offset + batchSize);
      await waitForTask(
        stagingIndex.addDocuments(batch),
        `index Tool batch ${Math.floor(offset / batchSize) + 1}`,
      );
    }

    await waitForTask(
      client.swapIndexes([
        {
          indexes: [stagingIndexUid, TOOL_INDEX_UID],
          rename: false,
        },
      ]),
      "swap rebuilt index",
    );
    swapped = true;

    await configureIndex(client, TOOL_INDEX_UID);
    await waitForTask(client.deleteIndex(stagingIndexUid), "delete previous index");

    return {
      indexUid: TOOL_INDEX_UID,
      indexed: documents.length,
    };
  } catch (error) {
    if (stagingCreated && !swapped) {
      try {
        await waitForTask(client.deleteIndex(stagingIndexUid), "clean up staging index");
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          "Search index rebuild failed and staging index cleanup also failed",
        );
      }
    }
    throw error;
  }
}

module.exports = {
  INDEX_BATCH_SIZE,
  SEARCH_SETTINGS,
  TOOL_INDEX_UID,
  rebuildToolSearchIndex,
  syncToolToSearch,
  toSearchDocument,
};
