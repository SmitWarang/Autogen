// routes/uploadRoute.js - FIXED VERSION
const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const Question = require("../models/Question");

const router = express.Router();

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
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
      cb(new Error("Only Excel files (.xlsx, .xls) are allowed"), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// POST /api/upload
router.post("/", upload.single("file"), async (req, res) => {
  try {
    console.log("📁 Upload request received");
    console.log("File:", req.file ? req.file.originalname : "No file");
    console.log("Body:", req.body);

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { subject } = req.body;
    if (!subject) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Subject is required" });
    }

    const filePath = req.file.path;
    console.log("📂 Reading Excel file:", filePath);

    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON with header row
    const data = XLSX.utils.sheet_to_json(worksheet, {
      header: 1, // Get as array of arrays first
      defval: "", // Default value for empty cells
    });

    console.log("📋 Raw Excel data (first 3 rows):");
    console.log(data.slice(0, 3));

    if (!data || data.length < 2) {
      fs.unlinkSync(filePath);
      return res
        .status(400)
        .json({ message: "Excel file is empty or has no data rows" });
    }

    // Get headers from first row
    const headers = data[0];
    console.log("📝 Headers found:", headers);

    // Convert to objects using headers
    const jsonData = data
      .slice(1)
      .map((row, index) => {
        const obj = {};
        headers.forEach((header, headerIndex) => {
          if (header && row[headerIndex] !== undefined) {
            obj[header.toString().trim()] = row[headerIndex];
          }
        });
        obj._rowNumber = index + 2; // Excel row number
        return obj;
      })
      .filter((row) => {
        // Remove completely empty rows
        const values = Object.values(row).filter(
          (v) => v !== "" && v !== undefined && v !== "_rowNumber"
        );
        return values.length > 0;
      });

    console.log("🔄 Converted data (first item):");
    console.log(jsonData[0]);

    // Generate upload batch ID
    const uploadBatch = Date.now().toString();

    // Validate and transform data
    const validatedData = [];
    const errors = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNum = row._rowNumber || i + 2;

      try {
        // Flexible column mapping - try different possible column names
        const questionText =
          row["Questions"] ||
          row["Question"] ||
          row["questions"] ||
          row["question"] ||
          row["QUESTIONS"] ||
          row["QUESTION"];

        const co = row["CO"] || row["Co"] || row["co"];

        const rbt = row["RBT"] || row["Rbt"] || row["rbt"];

        const pi = row["PI"] || row["Pi"] || row["pi"];

        const marks = row["Marks"] || row["marks"] || row["MARKS"];

        const type = row["Type"] || row["type"] || row["TYPE"];

        const srNo =
          row["Sr No."] ||
          row["Sr No"] ||
          row["Sr.No"] ||
          row["srno"] ||
          row["SrNo"] ||
          i + 1;

        console.log(`Row ${rowNum} mapping:`, {
          questionText: questionText ? "Found" : "Missing",
          co: co || "Missing",
          rbt: rbt || "Missing",
          type: type || "Missing",
        });

        const questionData = {
          srNo: parseInt(srNo) || i + 1,
          question: questionText?.toString().trim(),
          co: co?.toString().toUpperCase().trim(),
          rbt: rbt?.toString().toUpperCase().trim(),
          pi: pi?.toString().trim(),
          marks: parseInt(marks) || 0,
          type: type?.toString().toUpperCase().trim(),
          subject: subject.trim(),
          uploadBatch: uploadBatch,
        };

        // Validate required fields
        if (!questionData.question) {
          throw new Error(
            `Missing question text. Available fields: ${Object.keys(row).join(
              ", "
            )}`
          );
        }

        if (!questionData.co) {
          throw new Error(
            `Missing CO. Available fields: ${Object.keys(row).join(", ")}`
          );
        }

        if (!questionData.rbt) {
          throw new Error(
            `Missing RBT. Available fields: ${Object.keys(row).join(", ")}`
          );
        }

        if (!questionData.pi) {
          throw new Error(
            `Missing PI. Available fields: ${Object.keys(row).join(", ")}`
          );
        }

        if (!questionData.type) {
          throw new Error(
            `Missing Type. Available fields: ${Object.keys(row).join(", ")}`
          );
        }

        if (questionData.marks <= 0) {
          throw new Error(`Invalid marks: ${questionData.marks}`);
        }

        // Validate CO format
        if (!/^CO[1-9]\d*$/i.test(questionData.co)) {
          throw new Error(
            `Invalid CO format: ${questionData.co}. Expected format: CO1, CO2, etc.`
          );
        }

        // Validate RBT - normalize case and validate
        const validRBT = ["R", "U", "AP", "AN", "E", "C"];

        // Normalize common variations
        let normalizedRBT = questionData.rbt;
        if (questionData.rbt === "Ap") normalizedRBT = "AP";
        if (questionData.rbt === "An") normalizedRBT = "AN";

        if (!validRBT.includes(normalizedRBT)) {
          throw new Error(
            `Invalid RBT: ${questionData.rbt}. Valid values: ${validRBT.join(
              ", "
            )}`
          );
        }

        // Update with normalized value
        questionData.rbt = normalizedRBT;

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

        // Derive unit from PI
        questionData.unit = `Unit${questionData.pi.split(".")[0]}`;

        validatedData.push(questionData);
      } catch (error) {
        console.error(`Row ${rowNum} error:`, error.message);
        errors.push(`Row ${rowNum}: ${error.message}`);
      }
    }

    console.log(
      `✅ Validation complete: ${validatedData.length} valid, ${errors.length} errors`
    );

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
    console.log("💾 Inserting questions into database...");
    const insertedQuestions = await Question.insertMany(validatedData);
    fs.unlinkSync(filePath);

    // Generate summary
    const summary = generateUploadSummary(insertedQuestions);

    console.log("🎉 Upload successful:", summary);

    res.status(200).json({
      message: "Questions uploaded successfully",
      uploadBatch,
      summary,
      count: insertedQuestions.length,
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      message: error.message || "Upload failed",
      error: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
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
    summary.byCO[q.co] = (summary.byCO[q.co] || 0) + 1;
    summary.byRBT[q.rbt] = (summary.byRBT[q.rbt] || 0) + 1;
    summary.byType[q.type] = (summary.byType[q.type] || 0) + 1;
    summary.byMarks[q.marks] = (summary.byMarks[q.marks] || 0) + 1;
    summary.totalMarks += q.marks;
  });

  return summary;
}

module.exports = router;
