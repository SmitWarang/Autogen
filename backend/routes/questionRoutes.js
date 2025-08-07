const express = require("express");
const {
  getQuestions,
  getQuestionsByFilter,
} = require("../controllers/questionController");

const router = express.Router();

router.get("/", getQuestions);
router.get("/filter", getQuestionsByFilter);

module.exports = router;
