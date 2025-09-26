// backend/controllers/questionController.js
const Question = require("../models/Question");

// GET /api/questions/subjects
const getSubjects = async (req, res) => {
  try {
    const subjects = await Question.distinct("subject");
    res.json({ subjects });
  } catch (err) {
    res
      .status(500)
      .json({ message: err.message || "Failed to fetch subjects" });
  }
};

// GET /api/questions/pool-metadata?subject=...
const getPoolMetadata = async (req, res) => {
  try {
    const subject = String(req.query.subject || "").trim();
    if (!subject)
      return res
        .status(400)
        .json({ message: "subject query param is required" });

    const docs = await Question.find({ subject });

    const meta = {
      total: docs.length,
      byUnit: {}, // Unit1 -> { total, byMarks:{}, byType:{}, byRBT:{} }
      byMarks: {},
      byType: {},
      byRBT: {},
    };

    for (const q of docs) {
      // global aggregates
      if (Number.isFinite(q.marks))
        meta.byMarks[q.marks] = (meta.byMarks[q.marks] || 0) + 1;
      if (q.type) meta.byType[q.type] = (meta.byType[q.type] || 0) + 1;
      if (q.rbt) meta.byRBT[q.rbt] = (meta.byRBT[q.rbt] || 0) + 1;

      // per unit
      const u = q.unit || "Unit0";
      if (!meta.byUnit[u])
        meta.byUnit[u] = { total: 0, byMarks: {}, byType: {}, byRBT: {} };
      meta.byUnit[u].total++;
      if (Number.isFinite(q.marks))
        meta.byUnit[u].byMarks[q.marks] =
          (meta.byUnit[u].byMarks[q.marks] || 0) + 1;
      if (q.type)
        meta.byUnit[u].byType[q.type] =
          (meta.byUnit[u].byType[q.type] || 0) + 1;
      if (q.rbt)
        meta.byUnit[u].byRBT[q.rbt] = (meta.byUnit[u].byRBT[q.rbt] || 0) + 1;
    }

    res.json({ subject, meta });
  } catch (err) {
    res
      .status(500)
      .json({ message: err.message || "Failed to fetch pool metadata" });
  }
};

// GET /api/questions/cos?subject=...
const getCOs = async (req, res) => {
  try {
    const subject = String(req.query.subject || "").trim();
    if (!subject)
      return res
        .status(400)
        .json({ message: "subject query param is required" });
    const cos = await Question.distinct("co", { subject, co: { $ne: "" } });
    res.json({ subject, cos });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch COs" });
  }
};

// GET /api/questions/rbt-levels?subject=...
const getRBTLevels = async (req, res) => {
  try {
    const subject = String(req.query.subject || "").trim();
    if (!subject)
      return res
        .status(400)
        .json({ message: "subject query param is required" });

    const agg = await Question.aggregate([
      { $match: { subject, rbt: { $ne: "" } } },
      { $group: { _id: "$rbt", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const levels = {};
    for (const a of agg) levels[a._id] = a.count;

    res.json({ subject, levels });
  } catch (err) {
    res
      .status(500)
      .json({ message: err.message || "Failed to fetch RBT levels" });
  }
};

// (optional) GET /api/questions?subject=... to list questions
const list = async (req, res) => {
  try {
    const filter = {};
    if (req.query.subject) filter.subject = String(req.query.subject).trim();
    const docs = await Question.find(filter)
      .sort({ createdAt: -1 })
      .limit(1000);
    res.json({ count: docs.length, questions: docs });
  } catch (err) {
    res
      .status(500)
      .json({ message: err.message || "Failed to fetch questions" });
  }
};

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

module.exports = {
  getSubjects,
  getPoolMetadata,
  getCOs,
  getRBTLevels,
  list,
  getQuestionStats,
};
