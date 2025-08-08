const Blueprint = require("../models/Blueprint");
const Paper = require("../models/Paper");
const PaperGenerator = require("../utils/paperGenerator");
const { v4: uuidv4 } = require("uuid"); // npm install uuid
const ExportUtils = require("../utils/exportUtils");
const path = require("path");

// Generate papers based on blueprint
const generatePapers = async (req, res) => {
  try {
    const { blueprintId } = req.params;

    // Get blueprint
    const blueprint = await Blueprint.findById(blueprintId);
    if (!blueprint) {
      return res.status(404).json({ message: "Blueprint not found" });
    }

    if (!blueprint.isValid) {
      return res.status(400).json({
        message: "Blueprint is invalid",
        errors: blueprint.validationErrors,
      });
    }

    // Generate papers
    const generator = new PaperGenerator();
    const generatedPapers = await generator.generateMultiplePapers(blueprint);

    // Save papers to database
    const generationSessionId = uuidv4();
    const savedPapers = [];

    for (const paperData of generatedPapers) {
      const paper = new Paper({
        ...paperData,
        generationSessionId,
        questions: paperData.questions.map((q) => ({
          questionId: q._id,
          question: q.question,
          subject: q.subject,
          unit: q.unit,
          difficulty: q.difficulty,
          type: q.type,
          marks: q.marks,
        })),
      });

      await paper.save();
      savedPapers.push(paper);
    }

    res.status(201).json({
      message: `Successfully generated ${savedPapers.length} papers`,
      generationSessionId,
      papers: savedPapers,
      summary: {
        totalPapers: savedPapers.length,
        totalQuestionsUsed: [
          ...new Set(
            savedPapers.flatMap((p) => p.questions.map((q) => q.questionId))
          ),
        ].length,
        averageMarks:
          savedPapers.reduce((sum, p) => sum + p.totalMarks, 0) /
          savedPapers.length,
      },
    });
  } catch (error) {
    console.error("Paper generation error:", error);
    res.status(500).json({
      message: "Failed to generate papers",
      error: error.message,
    });
  }
};

// Get all papers for a blueprint
const getPapersByBlueprint = async (req, res) => {
  try {
    const { blueprintId } = req.params;
    const papers = await Paper.find({ blueprintId })
      .populate("blueprintId", "name totalMarks")
      .sort({ generationSessionId: -1, paperNumber: 1 });

    res.status(200).json(papers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get papers by generation session
const getPapersBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const papers = await Paper.find({ generationSessionId: sessionId })
      .populate("blueprintId", "name totalMarks")
      .sort({ paperNumber: 1 });

    if (papers.length === 0) {
      return res
        .status(404)
        .json({ message: "No papers found for this session" });
    }

    res.status(200).json(papers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single paper by ID
const getPaperById = async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id).populate(
      "blueprintId",
      "name totalMarks theoryPercent numericalPercent"
    );

    if (!paper) {
      return res.status(404).json({ message: "Paper not found" });
    }

    res.status(200).json(paper);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete papers by session
const deletePaperSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await Paper.deleteMany({ generationSessionId: sessionId });

    res.status(200).json({
      message: `Deleted ${result.deletedCount} papers`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Regenerate papers (delete old and create new)
const regeneratePapers = async (req, res) => {
  try {
    const { blueprintId } = req.params;

    // Delete existing papers for this blueprint
    await Paper.deleteMany({ blueprintId });

    // Generate new papers
    await generatePapers(req, res);
  } catch (error) {
    res.status(500).json({
      message: "Failed to regenerate papers",
      error: error.message,
    });
  }
};

const previewPaper = async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id).populate(
      "blueprintId",
      "name subject totalMarks theoryPercent numericalPercent"
    );

    if (!paper) {
      return res.status(404).json({ message: "Paper not found" });
    }

    // Format paper for preview
    const formattedPaper = {
      paperInfo: {
        paperNumber: paper.paperNumber,
        blueprintName: paper.blueprintId.name,
        subject: paper.blueprintId.subject,
        totalMarks: paper.totalMarks,
        totalQuestions: paper.totalQuestions,
        generatedAt: paper.createdAt,
      },
      questions: paper.questions.map((q, index) => ({
        questionNumber: index + 1,
        question: q.question,
        marks: q.marks,
        unit: q.unit,
        type: q.type,
        difficulty: q.difficulty,
      })),
      distribution: paper.distribution,
      metadata: {
        sessionId: paper.generationSessionId,
        isValid: paper.isValid,
        validationErrors: paper.validationErrors,
      },
    };

    res.status(200).json(formattedPaper);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Export single paper as PDF
const exportPaperPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const { includeAnswerKey = false, includeMetadata = false } = req.query;

    const paper = await Paper.findById(id).populate("blueprintId");

    if (!paper) {
      return res.status(404).json({ message: "Paper not found" });
    }

    const exportUtils = new ExportUtils();
    const result = await exportUtils.exportSinglePaper(
      paper,
      paper.blueprintId,
      {
        includeAnswerKey: includeAnswerKey === "true",
        includeMetadata: includeMetadata === "true",
      }
    );

    // Send file as download
    res.download(result.filepath, result.filename, (err) => {
      if (err) {
        console.error("Download error:", err);
        res.status(500).json({ message: "Download failed" });
      }
      // Clean up file after download
      setTimeout(() => {
        require("fs").unlink(result.filepath, () => {});
      }, 5000);
    });
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Export all papers in session as ZIP
const exportSessionPapers = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { includeAnswerKey = false, includeMetadata = false } = req.query;

    const papers = await Paper.find({ generationSessionId: sessionId })
      .populate("blueprintId")
      .sort({ paperNumber: 1 });

    if (papers.length === 0) {
      return res
        .status(404)
        .json({ message: "No papers found for this session" });
    }

    const exportUtils = new ExportUtils();
    const result = await exportUtils.exportPaperSession(
      papers,
      papers[0].blueprintId,
      {
        includeAnswerKey: includeAnswerKey === "true",
        includeMetadata: includeMetadata === "true",
      }
    );

    // Send ZIP file as download
    res.download(result.filepath, result.filename, (err) => {
      if (err) {
        console.error("Download error:", err);
        res.status(500).json({ message: "Download failed" });
      }
      // Clean up file after download
      setTimeout(() => {
        require("fs").unlink(result.filepath, () => {});
      }, 10000);
    });
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Export paper data as JSON
const exportPaperData = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const papers = await Paper.find({ generationSessionId: sessionId })
      .populate("blueprintId")
      .sort({ paperNumber: 1 });

    if (papers.length === 0) {
      return res
        .status(404)
        .json({ message: "No papers found for this session" });
    }

    const exportUtils = new ExportUtils();
    const result = await exportUtils.exportPaperJSON(
      papers,
      papers[0].blueprintId
    );

    res.download(result.filepath, result.filename, (err) => {
      if (err) {
        console.error("Download error:", err);
        res.status(500).json({ message: "Download failed" });
      }
      // Clean up file after download
      setTimeout(() => {
        require("fs").unlink(result.filepath, () => {});
      }, 5000);
    });
  } catch (error) {
    console.error("Export error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get paper statistics and analysis
const getPaperAnalysis = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const papers = await Paper.find({
      generationSessionId: sessionId,
    }).populate(
      "blueprintId",
      "name subject totalMarks marksPerModule theoryPercent numericalPercent"
    );

    if (papers.length === 0) {
      return res
        .status(404)
        .json({ message: "No papers found for this session" });
    }

    const blueprint = papers[0].blueprintId;

    // Calculate comprehensive analysis
    const analysis = {
      sessionInfo: {
        sessionId,
        totalPapers: papers.length,
        blueprintName: blueprint.name,
        subject: blueprint.subject,
        generatedAt: papers[0].createdAt,
      },
      questionUsage: {
        totalUniqueQuestions: [
          ...new Set(
            papers.flatMap((p) => p.questions.map((q) => q.questionId))
          ),
        ].length,
        questionsPerPaper: papers.map((p) => p.totalQuestions),
        averageQuestionsPerPaper:
          papers.reduce((sum, p) => sum + p.totalQuestions, 0) / papers.length,
      },
      marksDistribution: {
        totalMarksPerPaper: papers.map((p) => p.totalMarks),
        averageMarksPerPaper:
          papers.reduce((sum, p) => sum + p.totalMarks, 0) / papers.length,
        marksVariation: this.calculateVariation(
          papers.map((p) => p.totalMarks)
        ),
      },
      typeDistribution: papers.map((paper, index) => ({
        paperNumber: paper.paperNumber,
        theory: paper.distribution.byType.theory,
        numerical: paper.distribution.byType.numerical,
        theoryPercent: (
          (paper.distribution.byType.theory / paper.totalMarks) *
          100
        ).toFixed(1),
        numericalPercent: (
          (paper.distribution.byType.numerical / paper.totalMarks) *
          100
        ).toFixed(1),
      })),
      difficultyDistribution: papers.map((paper, index) => ({
        paperNumber: paper.paperNumber,
        easy: paper.distribution.byDifficulty.easy,
        medium: paper.distribution.byDifficulty.medium,
        hard: paper.distribution.byDifficulty.hard,
      })),
      moduleDistribution: papers.map((paper, index) => ({
        paperNumber: paper.paperNumber,
        modules: Object.fromEntries(paper.distribution.byModule),
      })),
    };

    res.status(200).json(analysis);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper method for calculation
const calculateVariation = (values) => {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    values.length;
  return Math.sqrt(variance).toFixed(2);
};

const getRecentPapers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const recentPapers = await Paper.find({})
      .populate("blueprint", "name totalMarks totalQuestions")
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("name blueprint createdAt questions totalMarks");

    // Calculate summary for each paper
    const papersWithSummary = recentPapers.map((paper) => ({
      _id: paper._id,
      name: paper.name,
      blueprint: paper.blueprint,
      totalMarks: paper.totalMarks,
      questionCount: paper.questions?.length || 0,
      createdAt: paper.createdAt,
    }));

    res.status(200).json(papersWithSummary);
  } catch (error) {
    console.error("Error fetching recent papers:", error);
    res.status(500).json({
      message: "Failed to fetch recent papers",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
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
};
