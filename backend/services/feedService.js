const Tool = require("../models/Tool");

const ALLOWED_TYPES = ["new", "popular", "trending", "for_you", "recommendations"];

const ROLE_KEYWORDS = {
  "frontend developer": [
    "frontend", "react", "vue", "angular", "nextjs", "next", "tailwind", "css",
    "html", "javascript", "typescript", "ui", "web", "vite", "webpack", "browser",
    "dom", "component", "design", "storybook"
  ],
  "ui/ux designer": [
    "design", "ui", "ux", "figma", "canvas", "prototype", "css", "styles",
    "layout", "component", "vector", "graphics", "wireframe", "theme"
  ],
  "mobile developer": [
    "mobile", "react-native", "flutter", "ios", "android", "swift", "kotlin", "app"
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
  ]
};

function matchKeywords(tool, keywords) {
  const searchableText = [
    tool.name || "",
    tool.category || "",
    tool.description || "",
    ...(tool.tags || []),
    ...(tool.platforms || []),
    ...(tool.searchKeywords || [])
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
  if (!roleStr) return 0.5;
  const normalizedRole = String(roleStr).toLowerCase().trim();
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
  const P = Math.min(1.0, Math.log10(stars + 1) / 5.5);
  const isTrend = tool.isTrending ? 0.6 : 0.0;
  const scoreVal = Math.min(0.4, (Number(tool.score) || 0) / 10);
  const T = isTrend + scoreVal;
  const createdDate = tool.createdAt ? new Date(tool.createdAt).getTime() : Date.now();
  const ageInDays = Math.max(0, (Date.now() - createdDate) / (1000 * 60 * 60 * 24));
  const C = Math.max(0.1, 1.0 - (ageInDays / 90));

  const finalScore = (R * 0.45) + (P * 0.25) + (T * 0.20) + (C * 0.10);
  return Number(finalScore.toFixed(4));
}

function encodeCursor(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function decodeCursor(cursorStr) {
  try {
    const jsonStr = Buffer.from(cursorStr, "base64").toString("utf8");
    const payload = JSON.parse(jsonStr);
    if (!payload || typeof payload !== "object" || !payload.id) {
      throw new Error("Invalid cursor format");
    }
    return payload;
  } catch (err) {
    throw new Error("Invalid or malformed cursor");
  }
}

async function getFeed({ type = "trending", role, category, limit = 12, cursor }) {
  const feedType = String(type).toLowerCase().trim();
  if (!ALLOWED_TYPES.includes(feedType)) {
    throw new Error(`Invalid feed type '${type}'. Must be one of: ${ALLOWED_TYPES.join(", ")}`);
  }

  let parsedLimit = parseInt(limit, 10);
  if (isNaN(parsedLimit) || parsedLimit <= 0) {
    parsedLimit = 12;
  } else if (parsedLimit > 50) {
    parsedLimit = 50;
  }

  const query = { validated: true };
  if (category && typeof category === "string" && category.trim() !== "") {
    query.category = category.trim();
  }

  let decodedCursor = null;
  if (cursor) {
    decodedCursor = decodeCursor(cursor);
  }

  if (feedType === "for_you" || feedType === "recommendations") {
    const allCandidates = await Tool.find(query).lean();
    const scoredTools = allCandidates.map((tool) => ({
      ...tool,
      forYouScore: calculateForYouScore(tool, role),
    }));

    scoredTools.sort((a, b) => {
      if (b.forYouScore !== a.forYouScore) return b.forYouScore - a.forYouScore;
      if ((b.githubStars || 0) !== (a.githubStars || 0)) return (b.githubStars || 0) - (a.githubStars || 0);
      return String(b._id).localeCompare(String(a._id));
    });

    let startIndex = 0;
    if (decodedCursor && decodedCursor.forYouScore !== undefined) {
      const cursorScore = Number(decodedCursor.forYouScore);
      const cursorId = String(decodedCursor.id);

      const foundIndex = scoredTools.findIndex(
        (t) =>
          t.forYouScore < cursorScore ||
          (t.forYouScore === cursorScore && String(t._id) < cursorId)
      );
      if (foundIndex !== -1) {
        startIndex = foundIndex;
      } else {
        startIndex = scoredTools.length;
      }
    }

    const sliced = scoredTools.slice(startIndex, startIndex + parsedLimit + 1);
    const hasMore = sliced.length > parsedLimit;
    const tools = hasMore ? sliced.slice(0, parsedLimit) : sliced;

    let nextCursor = null;
    if (hasMore && tools.length > 0) {
      const lastItem = tools[tools.length - 1];
      nextCursor = encodeCursor({
        forYouScore: lastItem.forYouScore,
        id: String(lastItem._id),
      });
    }

    return {
      tools,
      pagination: {
        hasMore,
        nextCursor,
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
  } else if (feedType === "trending") {
    sortOption = { isTrending: -1, score: -1, githubStars: -1, _id: -1 };
    if (decodedCursor) {
      const curTrending = Boolean(decodedCursor.isTrending);
      const curScore = Number(decodedCursor.score) || 0;
      const curStars = Number(decodedCursor.githubStars) || 0;
      const curId = decodedCursor.id;

      if (curTrending) {
        query.$or = [
          { isTrending: true, score: { $lt: curScore } },
          { isTrending: true, score: curScore, githubStars: { $lt: curStars } },
          { isTrending: true, score: curScore, githubStars: curStars, _id: { $lt: curId } },
          { isTrending: false },
        ];
      } else {
        query.$or = [
          { isTrending: false, score: { $lt: curScore } },
          { isTrending: false, score: curScore, githubStars: { $lt: curStars } },
          { isTrending: false, score: curScore, githubStars: curStars, _id: { $lt: curId } },
        ];
      }
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
    } else if (feedType === "trending") {
      nextCursor = encodeCursor({
        isTrending: Boolean(lastItem.isTrending),
        score: lastItem.score || 0,
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
