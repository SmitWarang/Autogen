const Question = require("../models/Question");

// Get all questions
const getQuestions = async (req, res) => {
  try {
    const questions = await Question.find({});
    res.status(200).json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get questions by filters
const getQuestionsByFilter = async (req, res) => {
  try {
    const { subject, co, rbt, type, pi, unit, difficulty } = req.query;
    const filter = {};

    if (subject) filter.subject = subject;
    if (co) filter.co = co.toUpperCase();
    if (rbt) filter.rbt = rbt.toUpperCase();
    if (type) filter.type = type.toUpperCase();
    if (pi) filter.pi = pi;
    if (unit) filter.unit = unit;
    if (difficulty) filter.difficulty = difficulty;

    const questions = await Question.find(filter);
    res.status(200).json(questions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get question statistics for new schema
const getQuestionStats = async (req, res) => {
  try {
    const { subject } = req.query;
    const filter = subject ? { subject } : {};

    const totalQuestions = await Question.countDocuments(filter);

    if (totalQuestions === 0) {
      return res.status(200).json({
        totalQuestions: 0,
        byCO: {},
        byRBT: {},
        byType: {},
        totalMarks: 0,
      });
    }

    const stats = await Question.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          totalMarks: { $sum: "$marks" },
          avgMarks: { $avg: "$marks" },

          // CO breakdown
          coStats: {
            $push: {
              co: "$co",
              marks: "$marks",
            },
          },

          // RBT breakdown
          rbtStats: {
            $push: {
              rbt: "$rbt",
              marks: "$marks",
            },
          },

          // Type breakdown
          typeStats: {
            $push: {
              type: "$type",
              marks: "$marks",
            },
          },
        },
      },
    ]);

    if (stats.length === 0) {
      return res.status(200).json({
        totalQuestions: 0,
        byCO: {},
        byRBT: {},
        byType: {},
        totalMarks: 0,
      });
    }

    const result = stats[0];

    // Process CO stats
    const byCO = {};
    result.coStats.forEach((item) => {
      byCO[item.co] = (byCO[item.co] || 0) + 1;
    });

    // Process RBT stats
    const byRBT = {};
    result.rbtStats.forEach((item) => {
      byRBT[item.rbt] = (byRBT[item.rbt] || 0) + 1;
    });

    // Process Type stats
    const byType = {};
    result.typeStats.forEach((item) => {
      byType[item.type] = (byType[item.type] || 0) + 1;
    });

    res.status(200).json({
      totalQuestions: result.totalQuestions,
      totalMarks: result.totalMarks,
      avgMarks: Math.round(result.avgMarks * 100) / 100,
      byCO,
      byRBT,
      byType,
    });
  } catch (error) {
    console.error("Error fetching question stats:", error);
    res.status(500).json({
      message: "Failed to fetch question statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

const getSubjects = async (req, res) => {
  try {
    console.log("📚 Fetching available subjects...");

    // Get distinct subjects from questions collection
    const subjects = await Question.distinct("subject");

    // Filter out null/empty subjects
    const validSubjects = subjects.filter(
      (subject) => subject && subject.trim() !== ""
    );

    console.log("📋 Found subjects:", validSubjects);

    // If no subjects found, return empty array with message
    if (validSubjects.length === 0) {
      return res.status(200).json({
        subjects: [],
        message: "No subjects found. Please upload questions first.",
      });
    }

    res.status(200).json({
      subjects: validSubjects,
      count: validSubjects.length,
    });
  } catch (error) {
    console.error("❌ Error fetching subjects:", error);
    res.status(500).json({
      message: "Failed to fetch subjects",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get Course Outcomes for a specific subject
const getCourseOutcomes = async (req, res) => {
  try {
    const { subject } = req.query;

    if (!subject) {
      return res.status(400).json({ message: "Subject parameter is required" });
    }

    console.log("🎯 Fetching COs for subject:", subject);

    // Get distinct COs for the subject with question counts
    const coStats = await Question.aggregate([
      { $match: { subject: subject } },
      {
        $group: {
          _id: "$co",
          questionCount: { $sum: 1 },
          totalMarks: { $sum: "$marks" },
          typeBreakdown: {
            $push: "$type",
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Process type breakdown
    const processedCOs = coStats.map((co) => {
      const typeCount = { T: 0, N: 0 };
      co.typeBreakdown.forEach((type) => {
        typeCount[type] = (typeCount[type] || 0) + 1;
      });

      return {
        co: co._id,
        questionCount: co.questionCount,
        totalMarks: co.totalMarks,
        theoryCount: typeCount.T,
        numericalCount: typeCount.N,
      };
    });

    console.log("📊 CO stats:", processedCOs);

    res.status(200).json({
      subject,
      courseOutcomes: processedCOs,
      totalCOs: processedCOs.length,
    });
  } catch (error) {
    console.error("❌ Error fetching course outcomes:", error);
    res.status(500).json({
      message: "Failed to fetch course outcomes",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get question pool analysis for blueprint creation
const getQuestionPoolAnalysis = async (req, res) => {
  try {
    const { subject } = req.query;

    if (!subject) {
      return res.status(400).json({ message: "Subject parameter is required" });
    }

    console.log("🔍 Analyzing question pool for:", subject);

    const analysis = await Question.aggregate([
      { $match: { subject: subject } },
      {
        $group: {
          _id: {
            co: "$co",
            rbt: "$rbt",
            type: "$type",
          },
          questions: {
            $push: {
              id: "$_id",
              marks: "$marks",
              question: { $substr: ["$question", 0, 50] }, // First 50 chars for preview
            },
          },
          count: { $sum: 1 },
          totalMarks: { $sum: "$marks" },
          avgMarks: { $avg: "$marks" },
        },
      },
      {
        $group: {
          _id: "$_id.co",
          rbtBreakdown: {
            $push: {
              rbt: "$_id.rbt",
              type: "$_id.type",
              count: "$count",
              totalMarks: "$totalMarks",
              avgMarks: "$avgMarks",
              questions: "$questions",
            },
          },
          coTotalQuestions: { $sum: "$count" },
          coTotalMarks: { $sum: "$totalMarks" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Overall stats
    const overallStats = await Question.aggregate([
      { $match: { subject: subject } },
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          totalMarks: { $sum: "$marks" },

          // Type distribution
          theoryCount: {
            $sum: { $cond: [{ $eq: ["$type", "T"] }, 1, 0] },
          },
          numericalCount: {
            $sum: { $cond: [{ $eq: ["$type", "N"] }, 1, 0] },
          },

          // RBT distribution
          rCount: { $sum: { $cond: [{ $eq: ["$rbt", "R"] }, 1, 0] } },
          uCount: { $sum: { $cond: [{ $eq: ["$rbt", "U"] }, 1, 0] } },
          apCount: { $sum: { $cond: [{ $eq: ["$rbt", "AP"] }, 1, 0] } },
          anCount: { $sum: { $cond: [{ $eq: ["$rbt", "AN"] }, 1, 0] } },
          eCount: { $sum: { $cond: [{ $eq: ["$rbt", "E"] }, 1, 0] } },
          cCount: { $sum: { $cond: [{ $eq: ["$rbt", "C"] }, 1, 0] } },
        },
      },
    ]);

    const overall = overallStats[0] || {
      totalQuestions: 0,
      totalMarks: 0,
      theoryCount: 0,
      numericalCount: 0,
      rCount: 0,
      uCount: 0,
      apCount: 0,
      anCount: 0,
      eCount: 0,
      cCount: 0,
    };

    res.status(200).json({
      subject,
      overall: {
        totalQuestions: overall.totalQuestions,
        totalMarks: overall.totalMarks,
        typeDistribution: {
          theory: overall.theoryCount,
          numerical: overall.numericalCount,
          theoryPercent:
            overall.totalQuestions > 0
              ? Math.round((overall.theoryCount / overall.totalQuestions) * 100)
              : 0,
          numericalPercent:
            overall.totalQuestions > 0
              ? Math.round(
                  (overall.numericalCount / overall.totalQuestions) * 100
                )
              : 0,
        },
        rbtDistribution: {
          R: overall.rCount,
          U: overall.uCount,
          AP: overall.apCount,
          AN: overall.anCount,
          E: overall.eCount,
          C: overall.cCount,
        },
      },
      detailedAnalysis: analysis,
    });
  } catch (error) {
    console.error("❌ Error analyzing question pool:", error);
    res.status(500).json({
      message: "Failed to analyze question pool",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  getQuestions,
  getQuestionsByFilter,
  getQuestionStats,
  getSubjects,
  getCourseOutcomes,
  getQuestionPoolAnalysis,
};
