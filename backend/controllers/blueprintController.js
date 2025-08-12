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

const updateBlueprint = async (req, res) => {
  try {
    const blueprint = await Blueprint.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!blueprint) {
      return res.status(404).json({ message: "Blueprint not found" });
    }

    res.status(200).json({
      message: "Blueprint updated successfully",
      blueprint,
    });
  } catch (error) {
    console.error("❌ Error updating blueprint:", error);

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        message: "Validation failed",
        errors,
      });
    }

    res.status(500).json({
      message: "Failed to update blueprint",
      error: error.message,
    });
  }
};

const deleteBlueprint = async (req, res) => {
  try {
    const blueprint = await Blueprint.findByIdAndDelete(req.params.id);

    if (!blueprint) {
      return res.status(404).json({ message: "Blueprint not found" });
    }

    res.status(200).json({ message: "Blueprint deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting blueprint:", error);
    res.status(500).json({
      message: "Failed to delete blueprint",
      error: error.message,
    });
  }
};

const validateBlueprint = async (req, res) => {
  try {
    console.log("🔍 Validating blueprint:", req.body);

    const blueprintData = req.body;
    const validationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      questionAvailability: {},
    };

    // 1. Basic validation
    if (!blueprintData.name) {
      validationResult.errors.push("Blueprint name is required");
    }

    if (!blueprintData.subject) {
      validationResult.errors.push("Subject is required");
    }

    if (!blueprintData.totalMarks || blueprintData.totalMarks <= 0) {
      validationResult.errors.push("Total marks must be positive");
    }

    if (!blueprintData.totalQuestions || blueprintData.totalQuestions <= 0) {
      validationResult.errors.push("Total questions must be positive");
    }

    // 2. Percentage validation
    if (blueprintData.theoryPercent + blueprintData.numericalPercent !== 100) {
      validationResult.errors.push(
        "Theory and Numerical percentages must sum to 100%"
      );
    }

    // 3. CO marks validation
    if (
      !blueprintData.marksPerCO ||
      Object.keys(blueprintData.marksPerCO).length === 0
    ) {
      validationResult.errors.push(
        "At least one Course Outcome (CO) is required"
      );
    } else {
      const coMarksSum = Object.values(blueprintData.marksPerCO).reduce(
        (sum, marks) => sum + (parseInt(marks) || 0),
        0
      );

      if (coMarksSum !== parseInt(blueprintData.totalMarks)) {
        validationResult.errors.push(
          `CO marks sum (${coMarksSum}) must equal total marks (${blueprintData.totalMarks})`
        );
      }
    }

    // 4. RBT distribution validation
    if (blueprintData.rbtDistribution) {
      const rbtSum = Object.values(blueprintData.rbtDistribution).reduce(
        (sum, val) => sum + (parseInt(val) || 0),
        0
      );
      if (rbtSum !== 100) {
        validationResult.errors.push(
          `RBT percentages must sum to 100% (current: ${rbtSum}%)`
        );
      }
    }

    // 5. Question availability check (if subject is provided)
    if (blueprintData.subject) {
      try {
        // Check overall question availability
        const totalQuestions = await Question.countDocuments({
          subject: blueprintData.subject,
        });

        if (totalQuestions === 0) {
          validationResult.errors.push(
            `No questions found for subject: ${blueprintData.subject}`
          );
        } else if (
          totalQuestions <
          blueprintData.totalQuestions * (blueprintData.numberOfPapers || 3)
        ) {
          validationResult.warnings.push(
            `Limited questions available. Found ${totalQuestions} questions but need ${
              blueprintData.totalQuestions * (blueprintData.numberOfPapers || 3)
            } for ${blueprintData.numberOfPapers || 3} unique papers`
          );
        }

        // Check CO-wise availability
        for (const [co, requiredMarks] of Object.entries(
          blueprintData.marksPerCO || {}
        )) {
          const coQuestions = await Question.find({
            subject: blueprintData.subject,
            co: co,
          });

          const coTotalMarks = coQuestions.reduce((sum, q) => sum + q.marks, 0);
          const coTheoryMarks = coQuestions
            .filter((q) => q.type === "T")
            .reduce((sum, q) => sum + q.marks, 0);
          const coNumericalMarks = coQuestions
            .filter((q) => q.type === "N")
            .reduce((sum, q) => sum + q.marks, 0);

          validationResult.questionAvailability[co] = {
            totalQuestions: coQuestions.length,
            totalMarks: coTotalMarks,
            theoryQuestions: coQuestions.filter((q) => q.type === "T").length,
            numericalQuestions: coQuestions.filter((q) => q.type === "N")
              .length,
            theoryMarks: coTheoryMarks,
            numericalMarks: coNumericalMarks,
          };

          if (coQuestions.length === 0) {
            validationResult.errors.push(
              `No questions found for ${co} in subject ${blueprintData.subject}`
            );
          } else if (coTotalMarks < requiredMarks) {
            validationResult.warnings.push(
              `Insufficient marks for ${co}. Available: ${coTotalMarks}, Required: ${requiredMarks}`
            );
          }

          // Check type distribution
          const requiredTheoryMarks = Math.round(
            (requiredMarks * blueprintData.theoryPercent) / 100
          );
          const requiredNumericalMarks = requiredMarks - requiredTheoryMarks;

          if (requiredTheoryMarks > 0 && coTheoryMarks < requiredTheoryMarks) {
            validationResult.warnings.push(
              `Insufficient theory questions for ${co}. Available: ${coTheoryMarks} marks, Required: ${requiredTheoryMarks} marks`
            );
          }

          if (
            requiredNumericalMarks > 0 &&
            coNumericalMarks < requiredNumericalMarks
          ) {
            validationResult.warnings.push(
              `Insufficient numerical questions for ${co}. Available: ${coNumericalMarks} marks, Required: ${requiredNumericalMarks} marks`
            );
          }
        }

        // Add suggestions
        if (validationResult.warnings.length > 0) {
          validationResult.suggestions.push(
            "Consider uploading more questions for better paper generation"
          );
          validationResult.suggestions.push(
            "You may need to adjust the blueprint constraints based on available questions"
          );
        }
      } catch (error) {
        console.error("Error checking question availability:", error);
        validationResult.warnings.push(
          "Could not verify question availability"
        );
      }
    }

    // Set final validation status
    validationResult.isValid = validationResult.errors.length === 0;

    console.log(
      "✅ Validation completed:",
      validationResult.isValid ? "PASSED" : "FAILED"
    );
    console.log("📊 Validation summary:", {
      errors: validationResult.errors.length,
      warnings: validationResult.warnings.length,
      suggestions: validationResult.suggestions.length,
    });

    res.status(200).json(validationResult);
  } catch (error) {
    console.error("❌ Error validating blueprint:", error);
    res.status(500).json({
      message: "Failed to validate blueprint",
      error: error.message,
    });
  }
};

module.exports = {
  createBlueprint,
  getBlueprints,
  getBlueprintById,
  getQuestionStats,
  validateBlueprint,
  updateBlueprint,
  deleteBlueprint,
};
