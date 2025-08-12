const express = require("express");
const {
  createBlueprint,
  getBlueprints,
  getBlueprintById,
  getQuestionStats,
  updateBlueprint,
  deleteBlueprint,
  validateBlueprint,
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

// POST /api/blueprints/validate - Validate blueprint (NEW ROUTE)
router.post("/validate", validateBlueprint);

// PUT /api/blueprints/:id - Update blueprint
router.put("/:id", updateBlueprint);

// DELETE /api/blueprints/:id - Delete blueprint
router.delete("/:id", deleteBlueprint);

module.exports = router;
