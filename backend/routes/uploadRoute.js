// backend/routes/uploadRoute.js
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { uploadQuestions } = require("../controllers/uploadController");

const router = express.Router();

// Ensure uploads dir exists
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    return cb(new Error("Only Excel files (.xlsx, .xls) are allowed"));
  },
});

// POST /api/upload
router.post("/", upload.single("file"), uploadQuestions);

module.exports = router;
