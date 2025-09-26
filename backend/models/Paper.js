// backend/models/Paper.js - Updated for Difficulty Levels
const mongoose = require("mongoose");

const PaperSchema = new mongoose.Schema(
  {
    blueprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Blueprint",
      required: true,
    },
    subject: { type: String, required: true },
    title: { type: String, required: true },

    // NEW: Difficulty level for this paper
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
      default: "medium",
    },

    examType: {
  type: String,
  enum: ["ISE", "ESE"],
  required: true,
  default: "ISE",
},


    // picked questions
    questions: [
      {
        _id: false,
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
          required: true,
        },
        questionText: { type: String, required: true },
        marks: { type: Number, required: true },
        unit: { type: String, default: "" },
        co: { type: String, default: "" },
        rbt: { type: String, default: "" },
        pi: { type: String, default: "" }, // Added pi field that was missing
        type: { type: String, default: "" },
      },
    ],

    totalMarks: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },

    // NEW: RBT Distribution tracking
    rbtDistribution: {
      type: Map,
      of: Number,
      default: new Map(),
      // Will store actual counts: { R: 5, U: 3, AP: 2, AN: 1, E: 0, C: 0 }
    },

    // NEW: Target RBT Distribution (percentages that were aimed for)
    targetRbtDistribution: {
      type: Map,
      of: Number,
      default: new Map(),
      // Will store target percentages: { R: 40, U: 35, AP: 15, AN: 7, E: 2, C: 1 }
    },

    // NEW: Generation metadata
    generationMetadata: {
      difficultyLevel: { type: String, default: "" }, // Human-readable: "Easy", "Medium", "Hard"
      rbtMatchPercentage: { type: Number, default: 0 }, // How well we matched the target RBT distribution
      warnings: { type: [String], default: [] }, // Any warnings during generation
    },
  },
  { timestamps: true }
);

// Indexes
PaperSchema.index({ subject: 1, blueprintId: 1 });
PaperSchema.index({ difficulty: 1 });
PaperSchema.index({ blueprintId: 1, difficulty: 1 });
PaperSchema.index({ subject: 1, difficulty: 1 });

// Virtual field to get difficulty name
PaperSchema.virtual("difficultyName").get(function () {
  const difficultyMap = {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
  };
  return difficultyMap[this.difficulty] || "Unknown";
});

// Method to calculate RBT match percentage
PaperSchema.methods.calculateRbtMatchPercentage = function () {
  if (!this.rbtDistribution || !this.targetRbtDistribution) return 0;

  const actualCounts = Object.fromEntries(this.rbtDistribution);
  const targetPercentages = Object.fromEntries(this.targetRbtDistribution);

  let totalDeviation = 0;
  let totalQuestions = this.totalQuestions || 1;

  for (const [rbt, targetPercentage] of Object.entries(targetPercentages)) {
    const actualCount = actualCounts[rbt] || 0;
    const actualPercentage = (actualCount / totalQuestions) * 100;
    const deviation = Math.abs(actualPercentage - targetPercentage);
    totalDeviation += deviation;
  }

  // Convert deviation to match percentage (lower deviation = higher match)
  const averageDeviation =
    totalDeviation / Object.keys(targetPercentages).length;
  return Math.max(0, 100 - averageDeviation);
};

// Pre-save hook to update generation metadata
PaperSchema.pre("save", function (next) {
  if (
    this.isModified("rbtDistribution") ||
    this.isModified("targetRbtDistribution")
  ) {
    this.generationMetadata.rbtMatchPercentage =
      this.calculateRbtMatchPercentage();

    const difficultyMap = {
      easy: "Easy",
      medium: "Medium",
      hard: "Hard",
    };
    this.generationMetadata.difficultyLevel =
      difficultyMap[this.difficulty] || "Unknown";
  }
  next();
});

// Transform function for JSON output
PaperSchema.set("toJSON", {
  transform: function (doc, ret, options) {
    // Convert Maps to Objects for JSON serialization
    if (ret.rbtDistribution) {
      ret.rbtDistribution = Object.fromEntries(ret.rbtDistribution);
    }
    if (ret.targetRbtDistribution) {
      ret.targetRbtDistribution = Object.fromEntries(ret.targetRbtDistribution);
    }
    return ret;
  },
});

module.exports = mongoose.model("Paper", PaperSchema);
