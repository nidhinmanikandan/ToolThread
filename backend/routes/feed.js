const express = require("express");
const router = express.Router();
const { getFeed } = require("../services/feedService");

router.get("/", async (req, res) => {
  try {
    const { type, category, limit, cursor } = req.query;

    const result = await getFeed({
      type,
      category,
      limit,
      cursor,
    });

    res.json(result);
  } catch (err) {
    if (
      err.message.startsWith("Invalid feed type") ||
      err.message.startsWith("Invalid or malformed cursor")
    ) {
      return res.status(400).json({
        error: err.message,
      });
    }

    console.error("Feed Error:", err);
    res.status(500).json({
      error: "Failed to fetch feed",
    });
  }
});

module.exports = router;
