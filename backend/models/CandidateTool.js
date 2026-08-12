const mongoose = require("mongoose");

const CandidateToolSchema = new mongoose.Schema(
  {
    name: String,
    description: String,

    officialUrl: String,

    logoDomain: String,

    category: String,

    isTrending: {
      type: Boolean,
      default: false,
    },

    source: String,

    tags: [String],

    platform: String,

    platforms: [String],

    sources: [
      {
        type: {
          type: String,
        }, // github, hackernews, reddit, npm, etc.
        url: String,
        externalId: String,
        metadata: mongoose.Schema.Types.Mixed,
        discoveredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    discoveryScore: {
      type: Number,
      default: 0,
    },

    mentionCount: {
      type: Number,
      default: 0,
    },

    lastDiscoveredAt: Date,

    validationStatus: {
      type: String,
      default: "pending",
    },

    githubUrl: String,

    githubStars: {
      type: Number,
      default: 0,
    },

    githubForks: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("CandidateTool", CandidateToolSchema);
