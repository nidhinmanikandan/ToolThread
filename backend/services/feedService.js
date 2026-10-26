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
  const normalize = (value) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  const primaryText = [
    typeof tool.name === "string" ? tool.name : "",
    typeof tool.category === "string" ? tool.category : "",
    ...strings(tool.tags),
    ...strings(tool.platforms),
    ...strings(tool.searchKeywords).filter((keyword) => !keyword.startsWith("role:")),
  ]
    .map(normalize)
    .join(" ");
  const descriptionText =
    typeof tool.description === "string" ? normalize(tool.description) : "";
  const matchedKeywords = keywords.filter((keyword) => {
    const normalizedKeyword = normalize(keyword);
    return normalizedKeyword && ` ${primaryText} `.includes(` ${normalizedKeyword} `);
  }).length;

  if (matchedKeywords >= 3) return 1;
  if (matchedKeywords === 2) return 0.85;
  if (matchedKeywords === 1) return 0.7;

  const descriptionMatches = keywords.filter((keyword) => {
    const normalizedKeyword = normalize(keyword);
    return normalizedKeyword && ` ${descriptionText} `.includes(` ${normalizedKeyword} `);
  }).length;
  if (descriptionMatches >= 2) return 0.55;
  if (descriptionMatches === 1) return 0.4;
  return 0.1;
}

function normalizeRole(roleStr) {
  return roleStr.toLowerCase().trim().replace(/\s+/g, " ");
}

function getRoleKeywords(roleStr) {
  const normalizedRole = normalizeRole(roleStr);
  const aliases = ROLE_ALIASES[normalizedRole] || [normalizedRole];
  const keywords = new Set();

  for (const alias of aliases) {
    for (const keyword of ROLE_KEYWORDS[alias] || []) {
      keywords.add(keyword);
    }
  }
  if (keywords.size === 0) {
    for (const word of normalizedRole.split(/[^a-z0-9]+/).filter((item) => item.length > 2)) {
      keywords.add(word);
    }
  }
  return { aliases, keywords: Array.from(keywords) };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRoleCandidateFilter(roleStr) {
  if (typeof roleStr !== "string" || !roleStr.trim()) return null;

  const { aliases, keywords } = getRoleKeywords(roleStr);
  const clauses = [
    {
      searchKeywords: {
        $in: aliases.map((alias) => `role:${alias}`),
      },
    },
  ];
  if (keywords.length > 0) {
    const pattern = keywords
      .map((keyword) => escapeRegex(keyword).replace(/\s+/g, "\\s+"))
      .join("|");
    const expression = new RegExp(`(^|[^a-z0-9])(?:${pattern})($|[^a-z0-9])`, "i");
    for (const field of ["name", "category", "description", "tags", "platforms", "searchKeywords"]) {
      clauses.push({ [field]: expression });
    }
  }
  return { $or: clauses };
}

function calculateRoleRelevance(tool, roleStr) {
  if (typeof roleStr !== "string" || !roleStr.trim()) return 0.5;
  const normalizedRole = normalizeRole(roleStr);
  const taggedRoles = (Array.isArray(tool.searchKeywords) ? tool.searchKeywords : [])
    .filter((keyword) => typeof keyword === "string")
    .filter((keyword) => keyword.startsWith("role:"))
    .map((keyword) => keyword.slice("role:".length).trim());
  const { aliases: roleAliases, keywords } = getRoleKeywords(roleStr);
  if (taggedRoles.some((taggedRole) => roleAliases.includes(taggedRole))) {
    return 1.0;
  }

  return matchKeywords(tool, keywords);
}

function calculateForYouScore(tool, roleStr) {
  const R = calculateRoleRelevance(tool, roleStr);
  const stars = Number(tool.githubStars) || 0;
  const hasPopularitySignal = Number.isFinite(stars) && stars > 0;
  const popularity = hasPopularitySignal ? Math.min(1, Math.log10(stars + 1) / 5.5) : 0;
  const establishedBonus = tool.source === "curated-seed" ? 0.05 : 0;
  const finalScore = (R * 0.85) + (popularity * 0.1) + establishedBonus;
  return Number(finalScore.toFixed(4));
}

function compareIdsDescending(left, right) {
  return String(right._id).localeCompare(String(left._id));
}

function rankAndPaginate({ candidates, role, limit, cursor, scoreKey, scoreFor, compare }) {
  const rankedTools = candidates
    .map((tool) => ({
      ...tool,
      rankingScore: scoreFor(tool, role),
    }))
    .sort((a, b) => {
      if (b.rankingScore !== a.rankingScore) return b.rankingScore - a.rankingScore;
      return compare ? compare(a, b) : compareIdsDescending(a, b);
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
      (feedType === "new" ||
        feedType === "popular" ||
        feedType === "established" ||
        feedType === "for_you" ||
        feedType === "recommendations") &&
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
    if (typeof role === "string" && role.trim()) {
      query.$and = [buildRoleCandidateFilter(role)];
    } else {
      if (decodedCursor) {
        query._id = { $lt: decodedCursor.id };
      }
      const results = await Tool.find(query)
        .sort({ _id: -1 })
        .limit(parsedLimit + 1)
        .lean();
      return rankAndPaginate({
        candidates: results,
        role,
        limit: parsedLimit,
        cursor: decodedCursor,
        scoreKey: "relevanceScore",
        scoreFor: () => 0.5,
      });
    }
    const allCandidates = await Tool.find(query).lean();
    return rankAndPaginate({
      candidates: allCandidates,
      role,
      limit: parsedLimit,
      cursor: decodedCursor,
      scoreKey: "relevanceScore",
      scoreFor: (tool, profileRole) => calculateRoleRelevance(tool, profileRole),
    });
  }

  if (feedType === "for_you" || feedType === "recommendations") {
    if (typeof role === "string" && role.trim()) {
      const roleFilter = buildRoleCandidateFilter(role);
      query.$and = [roleFilter];
    } else {
      if (decodedCursor) {
        query._id = { $lt: decodedCursor.id };
      }
      const results = await Tool.find(query)
        .sort({ _id: -1 })
        .limit(parsedLimit + 1)
        .lean();
      const hasMore = results.length > parsedLimit;
      const tools = hasMore ? results.slice(0, parsedLimit) : results;
      return {
        tools: tools.map((tool) => ({
          ...tool,
          forYouScore: calculateForYouScore(tool, role),
        })),
        pagination: {
          hasMore,
          nextCursor:
            hasMore && tools.length > 0
              ? encodeCursor({
                  forYouScore: calculateForYouScore(tools[tools.length - 1], role),
                  id: String(tools[tools.length - 1]._id),
                })
              : null,
        },
      };
    }
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
    query.githubStars = { $gt: 0 };
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
