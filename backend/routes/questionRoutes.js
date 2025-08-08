const express = require("express");
const {
  getQuestions,
  getQuestionsByFilter,
  getQuestionStats,
} = require("../controllers/questionController");

const router = express.Router();

router.get("/", getQuestions);
router.get("/stats", getQuestionStats);
router.get("/filter", getQuestionsByFilter);

module.exports = router;
