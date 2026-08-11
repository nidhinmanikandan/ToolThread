const mongoose = require("mongoose");

const RecommendationSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
      trim: true,
    },
    interest: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: String,
      required: true,
      trim: true,
    },
    tools: [
      {
        name: String,
        category: String,
        description: String,
        officialUrl: String,
        logoDomain: String,
        isTrending: Boolean,
      },
    ],
  },
  {
    timestamps: true,
  },
);

RecommendationSchema.index(
  { role: 1, interest: 1, level: 1 },
  { unique: true },
);

module.exports = mongoose.model("Recommendation", RecommendationSchema);
