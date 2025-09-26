// backend/routes/questionRoutes.js
const express = require("express");
const {
  getSubjects,
  getPoolMetadata,
  getCOs,
  getRBTLevels,
  list,
  getQuestionStats,
} = require("../controllers/questionController");

const router = express.Router();

// Metadata / availability
router.get("/subjects", getSubjects);
router.get("/pool-metadata", getPoolMetadata);
router.get("/cos", getCOs);
router.get("/rbt-levels", getRBTLevels);

// (optional) list
router.get("/", list);

router.get("/stats", getQuestionStats);

module.exports = router;
