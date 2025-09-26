// backend/routes/blueprintRoutes.js
const express = require("express");
const {
  createBlueprint,
  getBlueprints,
  getBlueprintById,
  updateBlueprint,
  validateBlueprint,
  getPoolMetadata, // optional; mount here for convenience
} = require("../controllers/blueprintController");

const router = express.Router();

router.get("/pool-metadata", getPoolMetadata); // GET /api/blueprints/pool-metadata?subject=...

router.post("/", createBlueprint);
router.get("/", getBlueprints);
router.get("/:id", getBlueprintById);
router.put("/:id", updateBlueprint);
router.post("/:id/validate", validateBlueprint);

module.exports = router;
