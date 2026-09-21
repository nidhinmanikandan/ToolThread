const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  tool: {
    type: String,
    required: true,
  },

  completedSkills: {
    type: [String],
    default: [],
  },
});

module.exports = mongoose.model("Progress", progressSchema);
