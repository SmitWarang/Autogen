// backend/controllers/uploadController.js
const XLSX = require("xlsx");
const fs = require("fs");
const Question = require("../models/Question");

// Helper to trim keys of an object
function normalizeRowKeys(row) {
  const out = {};
  for (const k of Object.keys(row)) {
    out[String(k).trim()] = row[k];
  }
  return out;
}

function safeParseInt(x) {
  const n = parseInt(x, 10);
  return Number.isFinite(n) ? n : 0;
}

const uploadQuestions = async (req, res) => {
  let tempPath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    tempPath = req.file.path;

    const { subject } = req.body;
    if (!subject || !String(subject).trim()) {
      return res.status(400).json({ message: "Subject is required" });
    }

    const workbook = XLSX.readFile(tempPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    let rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: "Excel file is empty" });
    }

    // Normalize header keys and row values
    rows = rows.map(normalizeRowKeys);

    // Map rows to DB docs. Try multiple header names for question text.
    const docs = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // possible keys for question text
      const questionText =
        (row["Questions"] || row["Question"] || row["question"] || row["questions"] || row["QUESTION"] || "").toString().trim();

      // skip empty question rows
      if (!questionText) continue;

      const co = (row["CO"] || row["Co"] || row["co"] || "").toString().trim();
      const rbt = (row["RBT"] || row["Rbt"] || row["rbt"] || "").toString().trim();
      const pi = (row["Pi"] || row["PI"] || row["pi"] || "").toString().trim();
      const marks = safeParseInt(row["Marks"] || row["marks"] || row["MARKS"] || 0);
      const type = (row["Type"] || row["TYPE"] || row["type"] || "").toString().trim();

      // derive unit from PI if present
      let unit = "";
      const m = String(pi).match(/^(\d+)\./);
      if (m) unit = `Unit${m[1]}`;

      docs.push({
        subject: String(subject).trim(),
        questionText,
        co,
        rbt,
        pi,
        unit,
        marks,
        type,
      });
    }

    if (!docs.length) {
      return res.status(400).json({ message: "No valid questions found in the Excel file" });
    }

    const inserted = await Question.insertMany(docs);

    res.status(200).json({
      message: "Questions uploaded successfully",
      count: inserted.length,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: err.message || "Server error" });
  } finally {
    try {
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch {}
  }
};

module.exports = { uploadQuestions };
