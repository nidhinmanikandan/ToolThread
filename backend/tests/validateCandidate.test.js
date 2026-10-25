const test = require("node:test");
const assert = require("node:assert/strict");
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

test("candidate validation treats case-only existing names as duplicates without modifying tools", async () => {
  let findQuery;
  let candidateUpdate;
  let createCalled = false;
  const restoreCandidateModel = mockModule("../models/CandidateTool", {
    async updateOne(filter, update) {
      candidateUpdate = { filter, update };
    },
  });
  const restoreToolModel = mockModule("../models/Tool", {
    async findOne(query) {
      findQuery = query;
      return { name: "Figma" };
    },
    async create() {
      createCalled = true;
    },
  });

  try {
    const validatorPath = require.resolve("../validators/validateCandidate");
    delete require.cache[validatorPath];
    const validateCandidate = require("../validators/validateCandidate");

    try {
      await validateCandidate({
        _id: "candidate-id",
        name: "figma",
        officialUrl: "https://example.com",
      });
    } finally {
      delete require.cache[validatorPath];
    }

    assert.deepEqual(findQuery.name, { $regex: "^figma$", $options: "i" });
    assert.deepEqual(candidateUpdate, {
      filter: { _id: "candidate-id" },
      update: { validationStatus: "duplicate" },
    });
    assert.equal(createCalled, false);
  } finally {
    restoreToolModel();
    restoreCandidateModel();
  }
});
