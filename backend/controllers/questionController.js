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

    const stats = await Question.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            co: "$co",
            rbt: "$rbt",
            type: "$type",
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
            },
          },
          coTotalQuestions: { $sum: "$count" },
          coTotalMarks: { $sum: "$totalMarks" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({ stats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getQuestions, getQuestionsByFilter };
