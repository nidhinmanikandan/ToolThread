const test = require("node:test");
const assert = require("node:assert/strict");
const Tool = require("../models/Tool");
const { getFeed } = require("../services/feedService");
const { collectSeedTools } = require("../scripts/seedTools");
const toolsByRole = require("../data/tools");

function matchesCondition(value, condition) {
  if (condition && typeof condition === "object" && !(condition instanceof Date)) {
    if (condition.$lt !== undefined) return value < condition.$lt;
    if (condition.$regex !== undefined) {
      const regex = new RegExp(condition.$regex);
      return Array.isArray(value) && value.some((item) => regex.test(item));
    }
  }

  return String(value) === String(condition);
}

function matchesQuery(record, query) {
  return Object.entries(query).every(([key, condition]) => {
    if (key === "$or") return condition.some((clause) => matchesQuery(record, clause));
    return matchesCondition(record[key], condition);
  });
}

function installToolFixture(records) {
  const originalFind = Tool.find;
  let lastQuery;
  let lastSort;

  Tool.find = (query) => {
    lastQuery = query;
    const queryResult = {
      sort(sort) {
        lastSort = sort;
        return this;
      },
      limit(limit) {
        this.resultLimit = limit;
        return this;
      },
      async lean() {
        let result = records.filter((record) => matchesQuery(record, query));
        if (lastSort) {
          const fields = Object.entries(lastSort);
          result = result.slice().sort((left, right) => {
            for (const [field, direction] of fields) {
              const leftValue = left[field] ?? 0;
              const rightValue = right[field] ?? 0;
              if (leftValue === rightValue) continue;
              if (leftValue instanceof Date && rightValue instanceof Date) {
                return direction * (leftValue.getTime() - rightValue.getTime());
              }
              return direction * (leftValue < rightValue ? -1 : 1);
            }
            return 0;
          });
        }
        if (this.resultLimit) result = result.slice(0, this.resultLimit);
        return result;
      },
    };

    return queryResult;
  };

  return {
    restore() {
      Tool.find = originalFind;
    },
    get lastQuery() {
      return lastQuery;
    },
    get lastSort() {
      return lastSort;
    },
  };
}

function seedFixtureRecords() {
  return collectSeedTools(toolsByRole).map((tool, index) => ({
    ...tool,
    _id: String(index + 1).padStart(3, "0"),
    createdAt: new Date("2026-10-25T00:00:00.000Z"),
    githubStars: 0,
  }));
}

test("established feed is role-ranked, paginated, and excludes non-catalogue records", async () => {
  const records = [
    ...seedFixtureRecords(),
    {
      _id: "999",
      name: "Unreviewed package",
      source: "npm-search",
      validated: true,
      searchKeywords: ["role:data analyst"],
      githubStars: 100000,
    },
  ];
  const fixture = installToolFixture(records);

  try {
    const firstPage = await getFeed({
      role: "Data Analyst",
      limit: 2,
    });
    assert.equal(firstPage.tools.length, 2);
    assert.equal(firstPage.pagination.hasMore, true);
    assert.ok(firstPage.pagination.nextCursor);
    assert.ok(firstPage.tools.every((tool) => tool.source === "curated-seed"));
    assert.ok(
      firstPage.tools.every((tool) => tool.searchKeywords.includes("role:data analyst")),
    );
    assert.equal(fixture.lastQuery.validated, true);
    assert.ok(fixture.lastQuery.$or);

    const secondPage = await getFeed({
      type: "established",
      role: "Data Analyst",
      limit: 2,
      cursor: firstPage.pagination.nextCursor,
    });
    assert.equal(secondPage.tools.length, 2);
    assert.ok(
      firstPage.tools.every(
        (firstTool) => !secondPage.tools.some((secondTool) => secondTool._id === firstTool._id),
      ),
    );
  } finally {
    fixture.restore();
  }
});

test("personalized feed ranks established tools for designer and AI/ML profile aliases", async () => {
  const fixture = installToolFixture(seedFixtureRecords());

  try {
    const designer = await getFeed({
      type: "for_you",
      role: "UI/UX and graphic designer",
      limit: 12,
    });
    const designerNames = designer.tools.map((tool) => tool.name);
    assert.ok(designerNames.includes("Figma"));
    assert.ok(designerNames.includes("Adobe Photoshop"));
    assert.ok(designerNames.includes("Adobe Illustrator"));
    assert.ok(designerNames.includes("Framer"));

    const aiDeveloper = await getFeed({
      type: "for_you",
      role: "AI/ML Developer",
      limit: 6,
    });
    assert.ok(
      aiDeveloper.tools.some((tool) =>
        ["PyTorch", "TensorFlow", "Hugging Face", "LangChain"].includes(tool.name),
      ),
    );
    assert.equal(typeof aiDeveloper.tools[0].forYouScore, "number");

    const dataAnalyst = await getFeed({
      type: "for_you",
      role: "Data Analyst",
      limit: 12,
    });
    assert.ok(dataAnalyst.tools.some((tool) => tool.name === "Microsoft Excel"));
    assert.ok(dataAnalyst.tools.some((tool) => tool.name === "Tableau"));
  } finally {
    fixture.restore();
  }
});

test("popular feed keeps category filtering, star sorting, and cursor pagination", async () => {
  const records = [
    { _id: "a", name: "A", category: "Design", validated: true, githubStars: 30 },
    { _id: "b", name: "B", category: "Design", validated: true, githubStars: 20 },
    { _id: "c", name: "C", category: "Design", validated: true, githubStars: 10 },
    { _id: "d", name: "D", category: "Data", validated: true, githubStars: 100 },
  ];
  const fixture = installToolFixture(records);

  try {
    const firstPage = await getFeed({ type: "popular", category: "Design", limit: 2 });
    assert.deepEqual(firstPage.tools.map((tool) => tool.name), ["A", "B"]);
    assert.equal(firstPage.pagination.hasMore, true);
    assert.deepEqual(fixture.lastSort, { githubStars: -1, _id: -1 });
    assert.equal(fixture.lastQuery.category, "Design");

    const secondPage = await getFeed({
      type: "popular",
      category: "Design",
      limit: 2,
      cursor: firstPage.pagination.nextCursor,
    });
    assert.deepEqual(secondPage.tools.map((tool) => tool.name), ["C"]);
    assert.equal(secondPage.pagination.hasMore, false);
    assert.equal(secondPage.pagination.nextCursor, null);
  } finally {
    fixture.restore();
  }
});

test("trending feed does not make unsupported trend claims", async () => {
  const fixture = installToolFixture(seedFixtureRecords());

  try {
    const result = await getFeed({ type: "trending" });
    assert.deepEqual(result, {
      tools: [],
      pagination: { hasMore: false, nextCursor: null },
    });
  } finally {
    fixture.restore();
  }
});
