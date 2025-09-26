// backend/controllers/blueprintController.js
const Blueprint = require("../models/Blueprint");
const Question = require("../models/Question");

// compute totals
function computeTotals(distribution) {
  let totalMarks = 0;
  let totalQuestions = 0;
  for (const mod of Object.keys(distribution || {})) {
    const marksMap = distribution[mod] || {};
    for (const mk of Object.keys(marksMap || {})) {
      const cnt = parseInt(marksMap[mk], 10) || 0;
      totalQuestions += cnt;
      totalMarks += cnt * (parseInt(mk, 10) || 0);
    }
  }
  return { totalMarks, totalQuestions };
}

// Build availability using CO as module indicator
async function getAvailabilityForSubject(subject) {
  // Aggregate counts by CO (module) and marks, rbt, type
  const agg = await Question.aggregate([
    { $match: { subject } },
    {
      $group: {
        _id: { co: "$co", marks: "$marks", rbt: "$rbt", type: "$type" },
        count: { $sum: 1 },
      },
    },
  ]);

  const availability = {}; // availability[mod][marks] = count
  const availabilityRbt = {}; // availabilityRbt[mod][rbt] = count
  const availabilityType = {}; // availabilityType[mod][type] = count
  const modulesSet = new Set();
  const marksSet = new Set();
  const rbtSet = new Set();
  const typeSet = new Set();

  for (const a of agg) {
    const coRaw = a._id.co || "";
    // try to extract number from CO: CO1 -> 1
    const m = String(coRaw).match(/CO\s*([0-9]+)/i);
    if (!m) continue; // if CO not parseable skip (or we could attempt to bucket as module 0)
    const mod = parseInt(m[1], 10);
    modulesSet.add(mod);

    const marks = parseInt(a._id.marks, 10) || 0;
    marksSet.add(marks);

    const rbt = String(a._id.rbt || "").trim();
    if (rbt) rbtSet.add(rbt);

    const type = String(a._id.type || "").trim();
    if (type) typeSet.add(type);

    if (!availability[mod]) availability[mod] = {};
    availability[mod][marks] = (availability[mod][marks] || 0) + a.count;

    if (!availabilityRbt[mod]) availabilityRbt[mod] = {};
    availabilityRbt[mod][rbt] = (availabilityRbt[mod][rbt] || 0) + a.count;

    if (!availabilityType[mod]) availabilityType[mod] = {};
    availabilityType[mod][type] = (availabilityType[mod][type] || 0) + a.count;
  }

  const modules = Array.from(modulesSet).sort((a, b) => a - b);
  const marksValues = Array.from(marksSet).sort((a, b) => a - b);
  const rbtLevels = Array.from(rbtSet);
  const types = Array.from(typeSet);

  return { availability, availabilityRbt, availabilityType, modules, marksValues, rbtLevels, types };
}

// pool metadata endpoint
const getPoolMetadata = async (req, res) => {
  try {
    const subject = String(req.query.subject || "").trim();
    if (!subject) return res.status(400).json({ message: "subject query param is required" });

    const data = await getAvailabilityForSubject(subject);

    res.json({
      subject,
      meta: data,
    });
  } catch (err) {
    console.error("getPoolMetadata error", err);
    res.status(500).json({ message: err.message || "Failed to fetch pool metadata" });
  }
};

const createBlueprint = async (req, res) => {
  try {
    const { title, subject, totalMarks, numberOfPapers, distribution } = req.body;
    if (!title || !subject || !distribution) {
      return res.status(400).json({ message: "title, subject and distribution are required" });
    }

    const totals = computeTotals(distribution);
    if (totals.totalMarks !== parseInt(totalMarks, 10)) {
      return res.status(400).json({
        message: `Distribution total (${totals.totalMarks}) does not match Total Marks (${totalMarks}).`,
      });
    }

    // get availability
    const {
      availability,
    } = await getAvailabilityForSubject(subject);

    // validate feasibility
    const infeasible = [];
    for (const mod of Object.keys(distribution)) {
      const marksMap = distribution[mod] || {};
      for (const mk of Object.keys(marksMap)) {
        const need = parseInt(marksMap[mk], 10) || 0;
        const have = (availability[mod] && availability[mod][parseInt(mk, 10)]) || 0;
        if (need > have) {
          infeasible.push(`Module ${mod}, ${mk} marks -> need ${need}, available ${have}`);
        }
      }
    }
    if (infeasible.length) {
      return res.status(400).json({ message: "Requested distribution exceeds available questions", details: infeasible });
    }

    const bp = await Blueprint.create({
      title,
      subject,
      totalMarks: totals.totalMarks,
      totalQuestions: totals.totalQuestions,
      numberOfPapers: parseInt(numberOfPapers, 10) || 1,
      distribution,
      poolMeta: {
        marksValues: (await getAvailabilityForSubject(subject)).marksValues,
        modules: (await getAvailabilityForSubject(subject)).modules,
        availability,
      },
    });

    res.status(201).json(bp);
  } catch (err) {
    console.error("createBlueprint error", err);
    res.status(500).json({ message: err.message || "Error creating blueprint" });
  }
};

// other CRUD functions kept as before (getBlueprints, getBlueprintById, updateBlueprint, validateBlueprint)
// For brevity, include minimal implementations:

const getBlueprintsList = async (req, res) => {
  try {
    const list = await Blueprint.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message || "Error fetching blueprints" });
  }
};

const getBlueprintById = async (req, res) => {
  try {
    const bp = await Blueprint.findById(req.params.id);
    if (!bp) return res.status(404).json({ message: "Blueprint not found" });
    res.json(bp);
  } catch (err) {
    res.status(500).json({ message: err.message || "Error fetching blueprint" });
  }
};

const updateBlueprint = async (req, res) => {
  try {
    const updated = await Blueprint.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Blueprint not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message || "Error updating blueprint" });
  }
};

const validateBlueprint = async (req, res) => {
  try {
    const bp = await Blueprint.findById(req.params.id);
    if (!bp) return res.status(404).json({ message: "Blueprint not found" });

    const { availability } = await getAvailabilityForSubject(bp.subject);
    const infeasible = [];
    for (const mod of Object.keys(bp.distribution || {})) {
      for (const mk of Object.keys(bp.distribution[mod] || {})) {
        const need = parseInt(bp.distribution[mod][mk], 10) || 0;
        const have = (availability[mod] && availability[mod][parseInt(mk, 10)]) || 0;
        if (need > have) infeasible.push(`Module ${mod}, ${mk} marks -> need ${need}, available ${have}`);
      }
    }
    res.json({
      valid: infeasible.length === 0,
      details: infeasible,
      totals: computeTotals(bp.distribution),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Error validating blueprint" });
  }
};

module.exports = {
  getPoolMetadata,
  createBlueprint,
  getBlueprints: getBlueprintsList,
  getBlueprintById,
  updateBlueprint,
  validateBlueprint,
};
