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

module.exports = { getQuestions, getQuestionsByFilter, getQuestionStats };
