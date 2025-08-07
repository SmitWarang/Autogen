const express = require("express");
const {
  createBlueprint,
  getBlueprints,
  getBlueprintById,
  getQuestionStats,
} = require("../controllers/blueprintController");

const router = express.Router();

// POST /api/blueprints - Create new blueprint
router.post("/", createBlueprint);

// GET /api/blueprints - Get all blueprints
router.get("/", getBlueprints);

// GET /api/blueprints/:id - Get blueprint by ID
router.get("/:id", getBlueprintById);

// GET /api/blueprints/stats/questions - Get question pool statistics
router.get("/stats/questions", getQuestionStats);

module.exports = router;
