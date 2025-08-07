const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const Question = require("../models/Question");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files are allowed"), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// POST /api/upload
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { subject } = req.body; // Get subject from form data
    if (!subject) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Subject is required" });
    }

    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!data || data.length === 0) {
      fs.unlinkSync(filePath);
      return res
        .status(400)
        .json({ message: "Excel file is empty or invalid" });
    }

    // Generate upload batch ID
    const uploadBatch = uuidv4();

    // Validate and transform data
    const validatedData = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Excel row number (accounting for header)

      try {
        // Map Excel columns (adjust these based on your exact column names)
        const questionData = {
          srNo: row["Sr No."] || row["Sr No"] || i + 1,
          question: row["Questions"] || row["Question"],
          co: row["CO"]?.toString().toUpperCase(),
          rbt: row["RBT"]?.toString().toUpperCase(),
          pi: row["Pi"] || row["PI"],
          marks: parseInt(row["Marks"]),
          type: row["Type"]?.toString().toUpperCase(),
          subject: subject,
          uploadBatch: uploadBatch,
        };

        // Validate required fields
        const requiredFields = ["question", "co", "rbt", "pi", "marks", "type"];
        for (const field of requiredFields) {
          if (!questionData[field]) {
            throw new Error(`Missing ${field}`);
          }
        }

        // Validate CO format
        if (!/^CO[1-9]\d*$/i.test(questionData.co)) {
          throw new Error(
            `Invalid CO format: ${questionData.co}. Expected format: CO1, CO2, etc.`
          );
        }

        // Validate RBT
        const validRBT = ["R", "U", "AP", "AN", "E", "C"];
        if (!validRBT.includes(questionData.rbt)) {
          throw new Error(
            `Invalid RBT: ${questionData.rbt}. Valid values: ${validRBT.join(
              ", "
            )}`
          );
        }

        // Validate PI format
        if (!/^\d+\.\d+\.\d+$/.test(questionData.pi)) {
          throw new Error(
            `Invalid PI format: ${questionData.pi}. Expected format: X.Y.Z`
          );
        }

        // Validate Type
        if (!["T", "N"].includes(questionData.type)) {
          throw new Error(
            `Invalid Type: ${questionData.type}. Valid values: T, N`
          );
        }

        // Validate marks
        if (isNaN(questionData.marks) || questionData.marks <= 0) {
          throw new Error(`Invalid marks: ${questionData.marks}`);
        }

        // Derive unit from PI (first number)
        questionData.unit = `Unit${questionData.pi.split(".")[0]}`;

        validatedData.push(questionData);
      } catch (error) {
        errors.push(`Row ${rowNum}: ${error.message},${row}`);
      }
    }

    // If there are validation errors, return them
    if (errors.length > 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        message: "Validation errors found",
        errors: errors.slice(0, 10), // Show first 10 errors
        totalErrors: errors.length,
      });
    }

    // Insert validated data
    const insertedQuestions = await Question.insertMany(validatedData);
    fs.unlinkSync(filePath);

    // Generate summary
    const summary = generateUploadSummary(insertedQuestions);

    res.status(200).json({
      message: "Questions uploaded successfully",
      uploadBatch,
      summary,
      count: insertedQuestions.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: error.message || "Upload failed" });
  }
});

// Helper function to generate upload summary
function generateUploadSummary(questions) {
  const summary = {
    totalQuestions: questions.length,
    byCO: {},
    byRBT: {},
    byType: {},
    byMarks: {},
    totalMarks: 0,
  };

  questions.forEach((q) => {
    // Count by CO
    summary.byCO[q.co] = (summary.byCO[q.co] || 0) + 1;

    // Count by RBT
    summary.byRBT[q.rbt] = (summary.byRBT[q.rbt] || 0) + 1;

    // Count by Type
    summary.byType[q.type] = (summary.byType[q.type] || 0) + 1;

    // Count by Marks
    summary.byMarks[q.marks] = (summary.byMarks[q.marks] || 0) + 1;

    // Total marks
    summary.totalMarks += q.marks;
  });

  return summary;
}

module.exports = router;
