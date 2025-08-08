const express = require("express");
const {
  generatePapers,
  getPapersByBlueprint,
  getPapersBySession,
  getPaperById,
  deletePaperSession,
  regeneratePapers,
  previewPaper,
  exportPaperPDF,
  exportSessionPapers,
  exportPaperData,
  getPaperAnalysis,
  getRecentPapers,
} = require("../controllers/paperController");

const router = express.Router();

router.get("/recent", getRecentPapers);

// POST /api/papers/generate/:blueprintId - Generate papers from blueprint
router.post("/generate/:blueprintId", generatePapers);

// POST /api/papers/regenerate/:blueprintId - Regenerate papers (delete old + create new)
router.post("/regenerate/:blueprintId", regeneratePapers);

// GET /api/papers/blueprint/:blueprintId - Get all papers for a blueprint
router.get("/blueprint/:blueprintId", getPapersByBlueprint);

// GET /api/papers/session/:sessionId - Get papers by generation session
router.get("/session/:sessionId", getPapersBySession);

// GET /api/papers/:id - Get single paper by ID
router.get("/:id", getPaperById);

// DELETE /api/papers/session/:sessionId - Delete all papers in a session
router.delete("/session/:sessionId", deletePaperSession);

// GET /api/papers/preview/:id - Preview single paper
router.get("/preview/:id", previewPaper);

// GET /api/papers/export/pdf/:id - Export single paper as PDF
router.get("/export/pdf/:id", exportPaperPDF);

// GET /api/papers/export/session/:sessionId - Export session papers as ZIP
router.get("/export/session/:sessionId", exportSessionPapers);

// GET /api/papers/export/data/:sessionId - Export paper data as JSON
router.get("/export/data/:sessionId", exportPaperData);

// GET /api/papers/analysis/:sessionId - Get paper analysis
router.get("/analysis/:sessionId", getPaperAnalysis);

module.exports = router;
