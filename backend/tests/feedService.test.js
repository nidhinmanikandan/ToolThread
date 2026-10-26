const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const http = require("node:http");
const Tool = require("../models/Tool");
const { getFeed } = require("../services/feedService");
const feedRoute = require("../routes/feed");
const { collectSeedTools } = require("../scripts/seedTools");
const toolsByRole = require("../data/tools");

function matchesCondition(value, condition) {
  if (condition instanceof RegExp) {
    return Array.isArray(value)
      ? value.some((item) => condition.test(item))
      : typeof value === "string" && condition.test(value);
  }

  if (condition && typeof condition === "object" && !(condition instanceof Date)) {
    if (condition.$lt !== undefined) return value < condition.$lt;
    if (condition.$gt !== undefined) return value > condition.$gt;
    if (condition.$in !== undefined) {
      return condition.$in.some((item) =>
        Array.isArray(value) ? value.includes(item) : String(value) === String(item),
      );
    }
    if (condition.$regex !== undefined) {
      const regex =
        condition.$regex instanceof RegExp
          ? condition.$regex
          : new RegExp(condition.$regex, condition.$options);
      return Array.isArray(value)
        ? value.some((item) => regex.test(item))
        : typeof value === "string" && regex.test(value);
    }
  }

  return String(value) === String(condition);
}

function matchesQuery(record, query) {
  return Object.entries(query).every(([key, condition]) => {
    if (key === "$or") return condition.some((clause) => matchesQuery(record, clause));
    if (key === "$and") return condition.every((clause) => matchesQuery(record, clause));
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
    _id: String(index + 1).padStart(24, "0"),
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

test("established feed combines role and category filters and handles empty results", async () => {
  const fixture = installToolFixture([
    {
      _id: "000000000000000000000001",
      name: "Tableau",
      category: "Data Visualization",
      source: "curated-seed",
      validated: true,
      searchKeywords: ["role:data analyst", "catalogue:established"],
    },
    {
      _id: "000000000000000000000002",
      name: "Excel",
      category: "Spreadsheet",
      source: "curated-seed",
      validated: true,
      searchKeywords: ["role:data analyst", "catalogue:established"],
    },
  ]);

  try {
    const filtered = await getFeed({
      type: "established",
      role: "Data Analyst",
      category: "Data Visualization",
    });
    assert.deepEqual(filtered.tools.map((tool) => tool.name), ["Tableau"]);
    assert.equal(fixture.lastQuery.category, "Data Visualization");

    const empty = await getFeed({
      type: "established",
      role: "Data Analyst",
      category: "No matching category",
    });
    assert.deepEqual(empty.tools, []);
    assert.equal(empty.pagination.hasMore, false);
    assert.equal(empty.pagination.nextCursor, null);
  } finally {
    fixture.restore();
  }
});

test("established ranking prioritizes role relevance over unrelated star counts", async () => {
  const fixture = installToolFixture([
    {
      _id: "000000000000000000000001",
      name: "General Product",
      category: "Design Productivity",
      source: "curated-seed",
      validated: true,
      githubStars: 900000,
      searchKeywords: ["catalogue:established"],
    },
    {
      _id: "000000000000000000000002",
      name: "Figma",
      category: "Design Tool",
      source: "curated-seed",
      validated: true,
      githubStars: 0,
      tags: ["ui design", "ux design"],
      searchKeywords: ["role:ui/ux designer", "catalogue:established"],
    },
  ]);

  try {
    const result = await getFeed({
      type: "established",
      role: "UI/UX Designer",
      limit: 2,
    });
    assert.deepEqual(result.tools.map((tool) => tool.name), ["Figma", "General Product"]);
    assert.ok(fixture.lastQuery.$and);
  } finally {
    fixture.restore();
  }
});

test("established feed without a role uses bounded stable cursor pagination", async () => {
  const fixture = installToolFixture(seedFixtureRecords());

  try {
    const firstPage = await getFeed({ type: "established", limit: 3 });
    assert.equal(firstPage.tools.length, 3);
    assert.deepEqual(fixture.lastSort, { _id: -1 });
    assert.ok(firstPage.pagination.nextCursor);

    const secondPage = await getFeed({
      type: "established",
      limit: 3,
      cursor: firstPage.pagination.nextCursor,
    });
    assert.equal(secondPage.tools.length, 3);
    assert.ok(
      firstPage.tools.every(
        (firstTool) => !secondPage.tools.some((secondTool) => secondTool._id === firstTool._id),
      ),
    );
    assert.deepEqual(fixture.lastQuery._id, { $lt: firstPage.tools[2]._id });
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

test("ranking tolerates missing and malformed optional metadata", async () => {
  const fixture = installToolFixture([
    {
      _id: "000000000000000000000001",
      name: "Minimal record",
      validated: true,
      source: "curated-seed",
      tags: null,
      platforms: "not-an-array",
      searchKeywords: { role: "not-an-array" },
      githubStars: "invalid",
    },
  ]);

  try {
    const result = await getFeed({ type: "for_you" });
    assert.equal(result.tools.length, 1);
    assert.equal(typeof result.tools[0].forYouScore, "number");
  } finally {
    fixture.restore();
  }
});

test("popular feed keeps category filtering, star sorting, and cursor pagination", async () => {
  const records = [
    { _id: "00000000000000000000000a", name: "A", category: "Design", validated: true, githubStars: 30 },
    { _id: "00000000000000000000000b", name: "B", category: "Design", validated: true, githubStars: 20 },
    { _id: "00000000000000000000000c", name: "C", category: "Design", validated: true, githubStars: 10 },
    { _id: "00000000000000000000000d", name: "D", category: "Data", validated: true, githubStars: 100 },
    { _id: "00000000000000000000000e", name: "Zero stars", category: "Design", validated: true, githubStars: 0 },
    { _id: "00000000000000000000000f", name: "Missing stars", category: "Design", validated: true },
  ];
  const fixture = installToolFixture(records);

  try {
    const firstPage = await getFeed({ type: "popular", category: "Design", limit: 2 });
    assert.deepEqual(firstPage.tools.map((tool) => tool.name), ["A", "B"]);
    assert.equal(firstPage.pagination.hasMore, true);
    assert.deepEqual(fixture.lastSort, { githubStars: -1, _id: -1 });
    assert.equal(fixture.lastQuery.category, "Design");
    assert.deepEqual(fixture.lastQuery.githubStars, { $gt: 0 });

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

test("popular feed returns no records when no positive popularity signal exists", async () => {
  const fixture = installToolFixture([
    { _id: "1", name: "Unknown popularity", validated: true },
    { _id: "2", name: "Zero stars", validated: true, githubStars: 0 },
  ]);

  try {
    const result = await getFeed({ type: "popular" });
    assert.deepEqual(result.tools, []);
    assert.deepEqual(result.pagination, { hasMore: false, nextCursor: null });
  } finally {
    fixture.restore();
  }
});

test("invalid feed, page-size, role, category, and cursor inputs are rejected", async () => {
  const invalidRequests = [
    [{ type: ["popular"] }, /Invalid feed type/],
    [{ type: "unknown" }, /Invalid feed type/],
    [{ limit: "12junk" }, /Invalid page size/],
    [{ limit: "0" }, /Invalid page size/],
    [{ limit: "-1" }, /Invalid page size/],
    [{ limit: ["2", "3"] }, /Invalid page size/],
    [{ role: ["Data Analyst"] }, /Invalid role filter/],
    [{ category: { name: "Design" } }, /Invalid category filter/],
    [{ type: "popular", cursor: Buffer.from(JSON.stringify({ id: "x" })).toString("base64") }, /Invalid or malformed cursor/],
    [{
      type: "popular",
      cursor: Buffer.from(JSON.stringify({ id: "not-an-object-id", githubStars: 1 })).toString("base64"),
    }, /Invalid or malformed cursor/],
  ];

  for (const [request, expectedError] of invalidRequests) {
    await assert.rejects(getFeed(request), expectedError);
  }
});

test("feed API reports unsupported page numbers and invalid sort types as client errors", async () => {
  const app = express();
  app.use("/", feedRoute);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const pageResponse = await fetch(`${baseUrl}/?page=-1`);
    assert.equal(pageResponse.status, 400);
    assert.match((await pageResponse.json()).error, /cursor parameter/);

    const typeResponse = await fetch(`${baseUrl}/?type=unknown`);
    assert.equal(typeResponse.status, 400);
    assert.match((await typeResponse.json()).error, /Invalid feed type/);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test("popular ordering is deterministic for equal popularity values", async () => {
  const records = [
    { _id: "000000000000000000000001", name: "First", validated: true, githubStars: 10 },
    { _id: "000000000000000000000003", name: "Third", validated: true, githubStars: 10 },
    { _id: "000000000000000000000002", name: "Second", validated: true, githubStars: 10 },
  ];
  const fixture = installToolFixture(records);

  try {
    const first = await getFeed({ type: "popular", limit: 2 });
    const firstRepeat = await getFeed({ type: "popular", limit: 2 });
    assert.deepEqual(first.tools.map((tool) => tool._id), [
      "000000000000000000000003",
      "000000000000000000000002",
    ]);
    assert.deepEqual(firstRepeat.tools.map((tool) => tool._id), first.tools.map((tool) => tool._id));

    const second = await getFeed({
      type: "popular",
      limit: 2,
      cursor: first.pagination.nextCursor,
    });
    assert.deepEqual(second.tools.map((tool) => tool._id), ["000000000000000000000001"]);
  } finally {
    fixture.restore();
  }
});

test("for-you role results paginate without duplicates and use a role candidate filter", async () => {
  const fixture = installToolFixture(seedFixtureRecords());

  try {
    const firstPage = await getFeed({
      type: "for_you",
      role: "Data Analyst",
      limit: 2,
    });
    assert.equal(firstPage.tools.length, 2);
    assert.ok(fixture.lastQuery.$and);
    assert.ok(firstPage.pagination.nextCursor);

    const secondPage = await getFeed({
      type: "for_you",
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

test("for-you without a role uses bounded stable cursor pagination", async () => {
  const fixture = installToolFixture(seedFixtureRecords());

  try {
    const firstPage = await getFeed({ type: "for_you", limit: 3 });
    assert.equal(firstPage.tools.length, 3);
    assert.deepEqual(fixture.lastSort, { _id: -1 });
    assert.ok(firstPage.pagination.nextCursor);

    const secondPage = await getFeed({
      type: "for_you",
      limit: 3,
      cursor: firstPage.pagination.nextCursor,
    });
    assert.equal(secondPage.tools.length, 3);
    assert.ok(
      firstPage.tools.every(
        (firstTool) => !secondPage.tools.some((secondTool) => secondTool._id === firstTool._id),
      ),
    );
    assert.deepEqual(fixture.lastQuery._id, { $lt: firstPage.tools[2]._id });
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
