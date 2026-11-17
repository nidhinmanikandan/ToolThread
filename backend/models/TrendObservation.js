const mongoose = require("mongoose");

const TrendObservationSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    toolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tool",
      required: true,
    },
    source: {
      type: String,
      enum: ["github", "npm"],
      required: true,
    },
    signalType: {
      type: String,
      enum: ["stars_total", "weekly_downloads"],
      required: true,
    },
    measurement: {
      type: Number,
      required: true,
      min: 0,
    },
    observedAt: {
      type: Date,
      required: true,
    },
    sourceEventId: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: false,
    autoIndex: false,
  },
);

TrendObservationSchema.index({
  observedAt: 1,
  toolId: 1,
  source: 1,
  signalType: 1,
  sourceEventId: 1,
});

module.exports = mongoose.model("TrendObservation", TrendObservationSchema);
