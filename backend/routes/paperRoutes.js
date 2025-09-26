// backend/routes/paperRoutes.js - Updated with new endpoints
const express = require("express");
const {
  generatePapers,
  getPaperById,
  getRecentPapers,
  getDifficultyConfigs,
  downloadPaperPDF, // NEW: Get difficulty configurations
} = require("../controllers/paperController");

const router = express.Router();

// Paper generation and management
router.post("/generate", generatePapers);
router.get("/recent", getRecentPapers);
router.get("/:id", getPaperById);

// Download functionality
router.get("/:id/download-pdf", downloadPaperPDF);

// NEW: Get difficulty configurations for frontend
router.get("/difficulty-configs", getDifficultyConfigs);

// Additional helpful endpoints you might want to add:

// Get papers by difficulty level
router.get("/difficulty/:level", async (req, res) => {
  try {
    const { level } = req.params;
    const limit = parseInt(req.query.limit, 10) || 10;

    if (!["easy", "medium", "hard"].includes(level)) {
      return res.status(400).json({ message: "Invalid difficulty level" });
    }

    const papers = await require("../models/Paper")
      .find({ difficulty: level })
      .populate("blueprintId", "title subject")
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(papers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get papers by blueprint with difficulty breakdown
router.get("/blueprint/:blueprintId/papers", async (req, res) => {
  try {
    const { blueprintId } = req.params;
    const papers = await require("../models/Paper")
      .find({ blueprintId })
      .populate("blueprintId", "title subject")
      .sort({ difficulty: 1, createdAt: -1 });

    // Group by difficulty for easy frontend consumption
    const groupedPapers = {
      easy: papers.filter((p) => p.difficulty === "easy"),
      medium: papers.filter((p) => p.difficulty === "medium"),
      hard: papers.filter((p) => p.difficulty === "hard"),
      total: papers.length,
    };

    res.json(groupedPapers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
