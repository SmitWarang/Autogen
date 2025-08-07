const mongoose = require("mongoose");

const paperSchema = new mongoose.Schema(
  {
    paperNumber: { type: Number, required: true },
    blueprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blueprint",
      required: true,
    },

    questions: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
          required: true,
        },
        question: { type: String, required: true },
        subject: { type: String, required: true },
        unit: { type: String, required: true },
        difficulty: { type: String, required: true },
        type: { type: String, required: true },
        marks: { type: Number, required: true },
      },
    ],

    totalMarks: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },

    // Analysis data
    distribution: {
      byModule: { type: Map, of: mongoose.Schema.Types.Mixed },
      byType: {
        theory: { type: Number, default: 0 },
        numerical: { type: Number, default: 0 },
      },
      byDifficulty: {
        easy: { type: Number, default: 0 },
        medium: { type: Number, default: 0 },
        hard: { type: Number, default: 0 },
      },
    },

    // Generation metadata
    generationSessionId: { type: String, required: true }, // Groups papers generated together
    isValid: { type: Boolean, default: true },
    validationErrors: [{ type: String }],
  },
  { timestamps: true }
);

// Index for efficient queries
paperSchema.index({ blueprintId: 1, generationSessionId: 1 });
paperSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Paper", paperSchema);
