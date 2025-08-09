const express = require("express");
const {
  getQuestions,
  getQuestionsByFilter,
  getQuestionStats,
  getSubjects,
  getCourseOutcomes,
  getQuestionPoolAnalysis,
} = require("../controllers/questionController");

const router = express.Router();

router.get("/", getQuestions);
router.get("/stats", getQuestionStats);
router.get("/subjects", getSubjects);
router.get("/cos", getCourseOutcomes);
router.get("/analysis", getQuestionPoolAnalysis);
router.get("/filter", getQuestionsByFilter);

module.exports = router;
