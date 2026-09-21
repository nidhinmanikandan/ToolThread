const Tool = require("../models/Tool");

const ALLOWED_TYPES = ["new", "popular", "trending"];

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

async function getFeed({ type = "trending", category, limit = 12, cursor }) {
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

  let sortOption = {};
  let decodedCursor = null;

  if (cursor) {
    decodedCursor = decodeCursor(cursor);
  }

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
