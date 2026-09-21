const mongoose = require("mongoose");

const ToolSchema = new mongoose.Schema(
  {
    //Basic info
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    category: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    tags: {
      type: [String],
      default: [],
    },

    //Links
    officialUrl: {
      type: String,
      default: "",
    },

    githubUrl: {
      type: String,
      default: "",
    },

    documentation: {
      type: [String],
      default: [],
    },

    //Discovery
    source: {
      type: String,
      required: true,
    },

    isTrending: {
      type: Boolean,
      default: false,
    },

    validated: {
      type: Boolean,
      default: false,
    },

    resolved: {
      type: Boolean,
      default: false,
    },

    enriched: {
      type: Boolean,
      default: false,
    },

    //Website
    logo: {
      type: String,
      default: "",
    },

    screenshots: [String],

    features: {
      type: [String],
      default: [],
    },

    gettingStarted: {
      type: String,
      default: "",
    },

    pricing: {
      type: String,
      default: "",
    },

    logoDomain: {
      type: String,
      default: "",
    },

    platforms: {
      type: [String],
      default: [],
    },

    //GitHub
    githubStars: {
      type: Number,
      default: 0,
    },

    githubForks: {
      type: Number,
      default: 0,
    },

    //Recommendation
    score: {
      type: Number,
      default: 0,
    },

    searchKeywords: {
      type: [String],
      default: [],
    },

    //Maintenance
    lastChecked: Date,
  },
  {
    timestamps: true,
  },
);

// Feed Query Indexes
ToolSchema.index({ validated: 1, createdAt: -1, _id: -1 });
ToolSchema.index({ validated: 1, githubStars: -1, _id: -1 });
ToolSchema.index({ validated: 1, isTrending: -1, score: -1, githubStars: -1, _id: -1 });
ToolSchema.index({ validated: 1, category: 1, createdAt: -1, _id: -1 });
ToolSchema.index({ validated: 1, category: 1, githubStars: -1, _id: -1 });
ToolSchema.index({ validated: 1, category: 1, isTrending: -1, score: -1, githubStars: -1, _id: -1 });

module.exports = mongoose.model("Tool", ToolSchema);
