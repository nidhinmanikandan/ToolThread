const Tool = require("../models/Tool");

const ALLOWED_TYPES = [
  "new",
  "popular",
  "trending",
  "established",
  "for_you",
  "recommendations",
];

const ROLE_KEYWORDS = {
  "ui/ux designer": [
    "design", "ui", "ux", "figma", "canvas", "prototype", "css", "styles",
    "layout", "component", "vector", "graphics", "wireframe", "theme",
  ],
  "graphic designer": [
    "design", "graphics", "vector", "illustration", "image", "photo", "visual",
    "logo", "typography", "photoshop", "illustrator",
  ],
  "frontend developer": [
    "frontend", "react", "vue", "angular", "nextjs", "next", "tailwind", "css",
    "html", "javascript", "typescript", "ui", "web", "vite", "webpack", "browser",
    "dom", "component", "design", "storybook"
  ],
  "mobile developer": [
    "mobile", "react-native", "flutter", "ios", "android", "swift", "kotlin", "app"
  ],
  "ai/ml developer": [
    "ai", "llm", "agent", "agents", "rag", "machine learning", "deep learning",
    "python", "hugging face", "pytorch", "tensorflow", "model", "prompt",
    "embedding", "langchain", "data science",
  ],
  "ai/ml engineer": [
    "ai", "llm", "agent", "agents", "rag", "machine learning", "deep learning",
    "python", "hugging face", "pytorch", "tensorflow", "model", "prompt",
    "embedding", "langchain", "data science",
  ],
  "ai / ml engineer": [
    "ai", "llm", "agent", "agents", "agentic", "rag", "openai", "gpt", "claude",
    "machine-learning", "deep-learning", "python", "huggingface", "model", "prompt",
    "embedding", "langchain", "vector"
  ],
  "ai engineer": [
    "ai", "llm", "agent", "agents", "agentic", "rag", "openai", "gpt", "claude",
    "machine-learning", "deep-learning", "python", "huggingface", "model", "prompt",
    "embedding", "langchain", "vector"
  ],
  "backend developer": [
    "backend", "node", "express", "api", "server", "database", "sql", "postgres",
    "mongo", "python", "go", "rust", "java", "docker", "graphql", "rest"
  ],
  "fullstack developer": [
    "fullstack", "frontend", "backend", "react", "nextjs", "node", "api", "database",
    "web", "typescript", "javascript"
  ],
  "data analyst": [
    "data analysis", "data analyst", "analytics", "sql", "spreadsheet", "excel",
    "tableau", "power bi", "dashboard", "reporting", "visualization", "jupyter",
    "database", "python", "data warehouse", "dbt",
  ],
};

const ROLE_ALIASES = {
  "ui/ux and graphic designer": ["ui/ux designer", "graphic designer"],
  "ui ux and graphic designer": ["ui/ux designer", "graphic designer"],
  "ai ml developer": ["ai/ml developer", "ai/ml engineer", "ai engineer"],
  "ai/ml developer": ["ai/ml developer", "ai/ml engineer", "ai engineer"],
  "ai/ml engineer": ["ai/ml developer", "ai/ml engineer", "ai engineer"],
  "ai / ml engineer": ["ai/ml developer", "ai/ml engineer", "ai engineer"],
};

function matchKeywords(tool, keywords) {
  const strings = (value) =>
    Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  const searchableText = [
    typeof tool.name === "string" ? tool.name : "",
    typeof tool.category === "string" ? tool.category : "",
    typeof tool.description === "string" ? tool.description : "",
    ...strings(tool.tags),
    ...strings(tool.platforms),
    ...strings(tool.searchKeywords),
  ].join(" ").toLowerCase();

  let matches = 0;
  for (const kw of keywords) {
    if (searchableText.includes(kw)) {
      matches++;
    }
  }

  if (matches >= 3) return 1.0;
  if (matches === 2) return 0.8;
  if (matches === 1) return 0.6;
  return 0.1;
}

function calculateRoleRelevance(tool, roleStr) {
  if (typeof roleStr !== "string" || !roleStr.trim()) return 0.5;
  const normalizedRole = String(roleStr).toLowerCase().trim().replace(/\s+/g, " ");
  const taggedRoles = (Array.isArray(tool.searchKeywords) ? tool.searchKeywords : [])
    .filter((keyword) => typeof keyword === "string")
    .filter((keyword) => keyword.startsWith("role:"))
    .map((keyword) => keyword.slice("role:".length).trim());
  const roleAliases = ROLE_ALIASES[normalizedRole] || [normalizedRole];
  if (taggedRoles.some((taggedRole) => roleAliases.includes(taggedRole))) {
    return 1.0;
  }

  const keywords = ROLE_KEYWORDS[normalizedRole];

  if (!keywords || keywords.length === 0) {
    const words = normalizedRole.split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return 0.5;
    return matchKeywords(tool, words);
  }

  return matchKeywords(tool, keywords);
}

function calculateForYouScore(tool, roleStr) {
  const R = calculateRoleRelevance(tool, roleStr);
  const stars = Number(tool.githubStars) || 0;
  const popularity = Math.min(1.0, Math.log10(stars + 1) / 5.5);
  const establishedBonus = tool.source === "curated-seed" ? 0.1 : 0;
  const finalScore = (R * 0.8) + (popularity * 0.1) + establishedBonus;
  return Number(finalScore.toFixed(4));
}

function rankAndPaginate({ candidates, role, limit, cursor, scoreKey, scoreFor }) {
  const rankedTools = candidates
    .map((tool) => ({
      ...tool,
      rankingScore: scoreFor(tool, role),
    }))
    .sort((a, b) => {
      if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;
      return String(b._id).localeCompare(String(a._id));
    });

  let startIndex = 0;
  if (cursor && cursor[scoreKey] !== undefined) {
    const cursorScore = Number(cursor[scoreKey]);
    const cursorId = String(cursor.id);
    const foundIndex = rankedTools.findIndex(
      (tool) =>
        tool.rankingScore < cursorScore ||
        (tool.rankingScore === cursorScore && String(tool._id) < cursorId),
    );
    startIndex = foundIndex === -1 ? rankedTools.length : foundIndex;
  }

  const sliced = rankedTools.slice(startIndex, startIndex + limit + 1);
  const hasMore = sliced.length > limit;
  const page = hasMore ? sliced.slice(0, limit) : sliced;
  const lastItem = page[page.length - 1];

  return {
    tools: page.map(({ rankingScore, ...tool }) => ({
      ...tool,
      ...(scoreKey === "forYouScore" ? { forYouScore: rankingScore } : {}),
    })),
    pagination: {
      hasMore,
      nextCursor:
        hasMore && lastItem
          ? encodeCursor({
              [scoreKey]: lastItem.rankingScore,
              id: String(lastItem._id),
            })
          : null,
    },
  };
}

function encodeCursor(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function decodeCursor(cursorStr, feedType) {
  try {
    if (typeof cursorStr !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(cursorStr)) {
      throw new Error("Invalid cursor encoding");
    }
    const jsonStr = Buffer.from(cursorStr, "base64").toString("utf8");
    const payload = JSON.parse(jsonStr);
    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload) ||
      typeof payload.id !== "string" ||
      !payload.id.trim()
    ) {
      throw new Error("Invalid cursor format");
    }

    if (
      (feedType === "new" || feedType === "popular") &&
      !/^[a-f\d]{24}$/i.test(payload.id)
    ) {
      throw new Error("Invalid cursor id");
    }
    if (feedType === "new" && !Number.isFinite(new Date(payload.createdAt).getTime())) {
      throw new Error("Invalid cursor date");
    }
    if (
      feedType === "popular" &&
      (!Number.isFinite(payload.githubStars) || payload.githubStars < 0)
    ) {
      throw new Error("Invalid popularity cursor");
    }
    if (
      (feedType === "established" || feedType === "for_you" || feedType === "recommendations") &&
      !Number.isFinite(payload[feedType === "established" ? "relevanceScore" : "forYouScore"])
    ) {
      throw new Error("Invalid ranking cursor");
    }
    return payload;
  } catch {
    throw new Error("Invalid or malformed cursor");
  }
}

async function getFeed({ type = "established", role, category, limit = 12, cursor }) {
  if (type !== undefined && typeof type !== "string") {
    throw new Error("Invalid feed type. Type must be a string");
  }
  const feedType = String(type).toLowerCase().trim();
  if (!ALLOWED_TYPES.includes(feedType)) {
    throw new Error(`Invalid feed type '${type}'. Must be one of: ${ALLOWED_TYPES.join(", ")}`);
  }

  if (role !== undefined && typeof role !== "string") {
    throw new Error("Invalid role filter. Role must be a string");
  }
  if (category !== undefined && typeof category !== "string") {
    throw new Error("Invalid category filter. Category must be a string");
  }

  let parsedLimit = 12;
  if (limit !== undefined) {
    if (typeof limit !== "string" && typeof limit !== "number") {
      throw new Error("Invalid page size. Limit must be a positive integer");
    }
    const limitText = String(limit);
    if (!/^\d+$/.test(limitText) || Number(limitText) <= 0) {
      throw new Error("Invalid page size. Limit must be a positive integer");
    }
    parsedLimit = Math.min(Number(limitText), 50);
  }

  const query = { validated: true };
  if (category && typeof category === "string" && category.trim() !== "") {
    query.category = category.trim();
  }

  let decodedCursor = null;
  if (cursor) {
    decodedCursor = decodeCursor(cursor, feedType);
  } else if (cursor !== undefined && cursor !== "") {
    throw new Error("Invalid or malformed cursor");
  }

  if (feedType === "established") {
    query.$or = [
      { source: "curated-seed" },
      { searchKeywords: { $regex: "^catalogue:established$" } },
    ];
    const allCandidates = await Tool.find(query).lean();
    return rankAndPaginate({
      candidates: allCandidates,
      role,
      limit: parsedLimit,
      cursor: decodedCursor,
      scoreKey: "relevanceScore",
      scoreFor: (tool, profileRole) =>
        calculateRoleRelevance(tool, profileRole) * 0.9 +
        Math.min(1, Math.log10((Number(tool.githubStars) || 0) + 1) / 5.5) * 0.1,
    });
  }

  if (feedType === "for_you" || feedType === "recommendations") {
    const allCandidates = await Tool.find(query).lean();
    return rankAndPaginate({
      candidates: allCandidates,
      role,
      limit: parsedLimit,
      cursor: decodedCursor,
      scoreKey: "forYouScore",
      scoreFor: calculateForYouScore,
    });
  }

  if (feedType === "trending") {
    return {
      tools: [],
      pagination: {
        hasMore: false,
        nextCursor: null,
      },
    };
  }

  let sortOption = {};
  if (feedType === "new") {
    sortOption = { createdAt: -1, _id: -1 };
    if (decodedCursor) {
      const cursorDate = new Date(decodedCursor.createdAt);
      query.$or = [
        { createdAt: { $lt: cursorDate } },
        { createdAt: cursorDate, _id: { $lt: decodedCursor.id } },
      ];
    }
  } else if (feedType === "popular") {
    sortOption = { githubStars: -1, _id: -1 };
    if (decodedCursor) {
      const cursorStars = Number(decodedCursor.githubStars) || 0;
      query.$or = [
        { githubStars: { $lt: cursorStars } },
        { githubStars: cursorStars, _id: { $lt: decodedCursor.id } },
      ];
    }
  }

  const results = await Tool.find(query)
    .sort(sortOption)
    .limit(parsedLimit + 1)
    .lean();

  const hasMore = results.length > parsedLimit;
  const tools = hasMore ? results.slice(0, parsedLimit) : results;

  let nextCursor = null;
  if (hasMore && tools.length > 0) {
    const lastItem = tools[tools.length - 1];
    if (feedType === "new") {
      nextCursor = encodeCursor({
        createdAt: lastItem.createdAt,
        id: String(lastItem._id),
      });
    } else if (feedType === "popular") {
      nextCursor = encodeCursor({
        githubStars: lastItem.githubStars || 0,
        id: String(lastItem._id),
      });
    }
  }

  return {
    tools,
    pagination: {
      hasMore,
      nextCursor,
    },
  };
}

module.exports = {
  getFeed,
};
