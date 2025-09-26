// backend/models/Question.js
const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },

    // core fields from Excel
    questionText: { type: String, required: true },
    co: { type: String, default: "" },   // e.g., CO1, CO2
    rbt: { type: String, default: "" },  // e.g., R, U, AP, AN, E, C
    pi: { type: String, default: "" },   // e.g., 1.2.3
    unit: { type: String, default: "" }, // derived from PI: "Unit1"
    marks: { type: Number, default: 0 }, // numeric marks
    type: { type: String, default: "" }, // "T" / "N" or "theory"/"numerical"

    // optional metadata
    uploadBatch: { type: String, default: "" },
  },
  { timestamps: true }
);

// Useful indexes
questionSchema.index({ subject: 1 });
questionSchema.index({ subject: 1, unit: 1 });
questionSchema.index({ subject: 1, rbt: 1 });
questionSchema.index({ subject: 1, type: 1 });
questionSchema.index({ subject: 1, marks: 1 });

module.exports = mongoose.model("Question", questionSchema);
