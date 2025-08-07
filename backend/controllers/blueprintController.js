const Blueprint = require("../models/Blueprint");
const Question = require("../models/Question");

// Create new blueprint
const createBlueprint = async (req, res) => {
  try {
    const blueprint = new Blueprint(req.body);

    // Validate against available questions
    const validationResult = await validateBlueprintFeasibility(blueprint);

    if (!validationResult.feasible) {
      return res.status(400).json({
        message: "Blueprint is not feasible with current question pool",
        errors: validationResult.errors,
        suggestions: validationResult.suggestions,
      });
    }

    await blueprint.save();

    res.status(201).json({
      message: "Blueprint created successfully",
      blueprint,
      feasibilityCheck: validationResult,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all blueprints
const getBlueprints = async (req, res) => {
  try {
    const blueprints = await Blueprint.find({}).sort({ createdAt: -1 });
    res.status(200).json(blueprints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get blueprint by ID
const getBlueprintById = async (req, res) => {
  try {
    const blueprint = await Blueprint.findById(req.params.id);
    if (!blueprint) {
      return res.status(404).json({ message: "Blueprint not found" });
    }
    res.status(200).json(blueprint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Validate blueprint feasibility
const validateBlueprintFeasibility = async (blueprint) => {
  const errors = [];
  const suggestions = [];
  let feasible = true;

  try {
    // Check if enough questions exist for each module
    for (const [module, requiredMarks] of blueprint.marksPerModule) {
      const moduleQuestions = await Question.find({
        unit: module,
        subject: blueprint.subject,
      });

      const availableMarks = moduleQuestions.reduce(
        (sum, q) => sum + q.marks,
        0
      );

      if (availableMarks < requiredMarks) {
        errors.push(
          `Module "${module}": Need ${requiredMarks} marks but only ${availableMarks} available`
        );
        suggestions.push(
          `Add more questions for ${module} or reduce required marks`
        );
        feasible = false;
      }
    }

    // Check theory/numerical distribution
    const theoryQuestions = await Question.find({
      subject: blueprint.subject,
      type: "theory",
    });
    const numericalQuestions = await Question.find({
      subject: blueprint.subject,
      type: "numerical",
    });

    const theoryMarks = theoryQuestions.reduce((sum, q) => sum + q.marks, 0);
    const numericalMarks = numericalQuestions.reduce(
      (sum, q) => sum + q.marks,
      0
    );

    const requiredTheoryMarks =
      (blueprint.totalMarks * blueprint.theoryPercent) / 100;
    const requiredNumericalMarks =
      (blueprint.totalMarks * blueprint.numericalPercent) / 100;

    if (theoryMarks < requiredTheoryMarks) {
      errors.push(
        `Need ${requiredTheoryMarks} theory marks but only ${theoryMarks} available`
      );
      feasible = false;
    }

    if (numericalMarks < requiredNumericalMarks) {
      errors.push(
        `Need ${requiredNumericalMarks} numerical marks but only ${numericalMarks} available`
      );
      feasible = false;
    }

    return { feasible, errors, suggestions };
  } catch (error) {
    return {
      feasible: false,
      errors: ["Error validating blueprint: " + error.message],
      suggestions: [],
    };
  }
};

// Get question pool statistics
const getQuestionStats = async (req, res) => {
  try {
    const { subject } = req.query;
    const filter = subject ? { subject } : {};

    const stats = await Question.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            unit: "$unit",
            type: "$type",
            difficulty: "$difficulty",
          },
          count: { $sum: 1 },
          totalMarks: { $sum: "$marks" },
        },
      },
      {
        $group: {
          _id: "$_id.unit",
          types: {
            $push: {
              type: "$_id.type",
              difficulty: "$_id.difficulty",
              count: "$count",
              totalMarks: "$totalMarks",
            },
          },
          unitTotalQuestions: { $sum: "$count" },
          unitTotalMarks: { $sum: "$totalMarks" },
        },
      },
    ]);

    res.status(200).json({ stats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBlueprint,
  getBlueprints,
  getBlueprintById,
  getQuestionStats,
  validateBlueprintFeasibility,
};
