const express = require("express");
const router = express.Router();
const { getFeed } = require("../services/feedService");

router.get("/", async (req, res) => {
  try {
    if (req.query.page !== undefined) {
      return res.status(400).json({
        error: "Page-number pagination is not supported; use the cursor parameter",
      });
    }

    const { type, role, category, limit, cursor } = req.query;

    const result = await getFeed({
      type,
      role,
      category,
      limit,
      cursor,
    });

    res.json(result);
  } catch (err) {
    const message = typeof err?.message === "string" ? err.message : "";
    if (
      message.startsWith("Invalid feed type") ||
      message.startsWith("Invalid or malformed cursor") ||
      message.startsWith("Invalid page size") ||
      message.startsWith("Invalid role filter") ||
      message.startsWith("Invalid category filter")
    ) {
      return res.status(400).json({
        error: message,
      });
    }

    console.error("Feed Error:", err);
    res.status(500).json({
      error: "Failed to fetch feed",
    });
  }
});

module.exports = router;
