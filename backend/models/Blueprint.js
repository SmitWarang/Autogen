// backend/models/Blueprint.js
const mongoose = require("mongoose");

const BlueprintSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },

    // user-entered targets
    totalMarks: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    numberOfPapers: { type: Number, default: 1 },

    /**
     * distribution structure:
     * {
     *   "1": { "2": 3, "5": 1 },    // Module 1 -> 3×2M, 1×5M
     *   "2": { "2": 2 },
     *   ...
     * }
     */
    distribution: { type: Object, required: true },

    // optional: keep a snapshot of pool capabilities used for validation UI
    poolMeta: {
      marksValues: { type: [Number], default: [] },
      modules: { type: [Number], default: [] },
      availability: { type: Object, default: {} }, // availability[module][marks] = count
    },
  },
  { timestamps: true }
);

BlueprintSchema.index({ subject: 1, title: 1 }, { unique: false });

module.exports = mongoose.model("Blueprint", BlueprintSchema);
