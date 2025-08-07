const mongoose = require("mongoose");

const blueprintSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    totalMarks: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },

    // Marks distribution per Course Outcome
    marksPerCO: {
      type: Map,
      of: Number,
      required: true,
      // Example: { "CO1": 20, "CO2": 30, "CO3": 10 }
    },

    // Optional: Marks per unit (if units are specified)
    marksPerUnit: {
      type: Map,
      of: Number,
      // Example: { "Unit1": 15, "Unit2": 25, "Unit3": 20 }
    },

    // Type distribution (Theory vs Numerical)
    theoryPercent: { type: Number, required: true, min: 0, max: 100 },
    numericalPercent: { type: Number, required: true, min: 0, max: 100 },

    // RBT (Bloom's Taxonomy) distribution
    rbtDistribution: {
      R: { type: Number, default: 0, min: 0, max: 100 }, // Remember
      U: { type: Number, default: 0, min: 0, max: 100 }, // Understand
      Ap: { type: Number, default: 0, min: 0, max: 100 }, // Apply
      An: { type: Number, default: 0, min: 0, max: 100 }, // Analyze
      E: { type: Number, default: 0, min: 0, max: 100 }, // Evaluate
      C: { type: Number, default: 0, min: 0, max: 100 }, // Create
    },

    // Difficulty distribution (auto-calculated from RBT)
    difficultyDistribution: {
      easy: { type: Number, default: 0, min: 0, max: 100 },
      medium: { type: Number, default: 0, min: 0, max: 100 },
      hard: { type: Number, default: 0, min: 0, max: 100 },
    },

    // Subject filter
    subject: { type: String, required: true },

    // Validation status
    isValid: { type: Boolean, default: false },
    validationErrors: [{ type: String }],

    // Generation settings
    numberOfPapers: { type: Number, default: 3, min: 1, max: 5 },
  },
  { timestamps: true }
);

// Validation middleware
blueprintSchema.pre("save", function (next) {
  this.validationErrors = [];

  // Check if theory + numerical = 100%
  if (this.theoryPercent + this.numericalPercent !== 100) {
    this.validationErrors.push(
      "Theory and Numerical percentages must sum to 100%"
    );
  }

  // Check if RBT percentages sum to 100 (if provided)
  const rbtSum = Object.values(this.rbtDistribution).reduce((a, b) => a + b, 0);
  if (rbtSum > 0 && Math.abs(rbtSum - 100) > 1) {
    // Allow 1% tolerance
    this.validationErrors.push("RBT percentages must sum to 100%");
  }

  // Auto-calculate difficulty distribution from RBT
  if (rbtSum > 0) {
    this.difficultyDistribution.easy =
      this.rbtDistribution.R + this.rbtDistribution.U;
    this.difficultyDistribution.medium =
      this.rbtDistribution.Ap + this.rbtDistribution.An;
    this.difficultyDistribution.hard =
      this.rbtDistribution.E + this.rbtDistribution.C;
  }

  // Check if marks per CO sum matches total marks
  const coMarksSum = Array.from(this.marksPerCO.values()).reduce(
    (a, b) => a + b,
    0
  );
  if (coMarksSum !== this.totalMarks) {
    this.validationErrors.push(
      `CO marks sum (${coMarksSum}) doesn't match total marks (${this.totalMarks})`
    );
  }

  this.isValid = this.validationErrors.length === 0;
  next();
});

module.exports = mongoose.model("Blueprint", blueprintSchema);
