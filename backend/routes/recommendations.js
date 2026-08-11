const express = require("express");
const router = express.Router();

const User = require("../models/User");
const resolveRecommendations = require("../services/recommendationResolver");

router.get("/", async (req, res) => {
  try {
    const profile = await User.findOne({ userId: 1 });

    if (!profile) {
      return res.status(404).json({
        error: "Profile not found",
      });
    }

    const tools = await resolveRecommendations(profile);

    res.json(tools);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Recommendation failed",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { role, interest, level } = req.body;

    let profile = null;

    if (role && interest && level) {
      profile = { role, interest, level };
    } else {
      profile = await User.findOne({ userId: 1 });
    }

    if (!profile) {
      return res.status(400).json({
        error: "Profile information is required",
      });
    }

    const tools = await resolveRecommendations(profile);

    res.json(tools);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "Recommendation resolution failed",
    });
  }
});

module.exports = router;
