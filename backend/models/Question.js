const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    srNo: { type: Number }, // Serial number from Excel
    question: { type: String, required: true },

    // Course Outcome
    co: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^CO[1-9]\d*$/i.test(v); // Validates CO1, CO2, etc.
        },
        message: "CO must be in format CO1, CO2, etc.",
      },
    },

    // Revised Bloom's Taxonomy
    rbt: {
      type: String,
      enum: ["R", "U", "Ap", "An", "E", "C"], // Remember, Understand, Apply, Analyze, Evaluate, Create
      required: true,
    },

    // Performance Indicator
    pi: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return /^\d+\.\d+\.\d+$/.test(v); // Validates format like 2.5.2
        },
        message: "PI must be in format X.Y.Z (e.g., 2.5.2)",
      },
    },

    marks: { type: Number, required: true },

    // Type: Theory or Numerical
    type: {
      type: String,
      enum: ["T", "N"], // T for Theory, N for Numerical
      required: true,
    },

    // Additional fields for better organization
    subject: { type: String, required: true },
    unit: { type: String, required: true }, // Can be derived from PI or specified

    // Auto-generated difficulty based on RBT
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
    },

    // Metadata
    uploadBatch: { type: String }, // Track which upload session this came from
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Pre-save middleware to auto-assign difficulty based on RBT
questionSchema.pre("save", function (next) {
  if (this.rbt) {
    switch (this.rbt.toLowerCase()) {
      case "r": // Remember
        this.difficulty = "easy";
        break;
      case "u": // Understand
        this.difficulty = "easy";
        break;
      case "ap": // Apply
        this.difficulty = "medium";
        break;
      case "an": // Analyze
        this.difficulty = "medium";
        break;
      case "e": // Evaluate
        this.difficulty = "hard";
        break;
      case "c": // Create
        this.difficulty = "hard";
        break;
      default:
        this.difficulty = "medium";
    }
  }
  next();
});

// Index for efficient queries
questionSchema.index({ co: 1, rbt: 1, type: 1 });
questionSchema.index({ subject: 1, unit: 1 });
questionSchema.index({ pi: 1 });

module.exports = mongoose.model("Question", questionSchema);
