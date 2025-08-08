// utils/paperGenerator.js - UPDATED FOR NEW RBT VALUES
const Question = require("../models/Question");
const Paper = require("../models/Paper");

class PaperGenerator {
  constructor() {
    this.usedQuestionIds = new Set();
    this.currentAttempt = 1;
    this.maxAttempts = 10;
  }

  async generateMultiplePapers(blueprint, numberOfPapers = 3) {
    console.log("🎯 Starting paper generation:", {
      papers: numberOfPapers,
      totalMarks: blueprint.totalMarks,
      totalQuestions: blueprint.totalQuestions,
    });

    try {
      // Get all available questions
      const questionPool = await Question.find({
        subject: blueprint.subject,
        isActive: true,
      });

      console.log(`📚 Available questions: ${questionPool.length}`);

      if (questionPool.length === 0) {
        throw new Error("No questions available for the specified subject");
      }

      // Validate if we have enough questions
      this.validateQuestionPool(questionPool, blueprint, numberOfPapers);

      const papers = [];
      this.usedQuestionIds.clear();

      for (let i = 1; i <= numberOfPapers; i++) {
        console.log(`\n📝 Generating Paper ${i}...`);

        const paper = await this.generateSinglePaper(
          questionPool,
          blueprint,
          `${blueprint.name} - Paper ${i}`
        );

        papers.push(paper);
      }

      console.log("🎉 All papers generated successfully");
      return papers;
    } catch (error) {
      console.error("❌ Paper generation failed:", error.message);
      throw error;
    }
  }

  async generateSinglePaper(questionPool, blueprint, paperName) {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        console.log(`  Attempt ${attempt}/${this.maxAttempts}`);

        const selectedQuestions = await this.selectQuestions(
          questionPool,
          blueprint
        );

        // Create and save paper
        const paper = new Paper({
          name: paperName,
          blueprint: blueprint._id,
          questions: selectedQuestions.map((q) => q._id),
          totalMarks: selectedQuestions.reduce((sum, q) => sum + q.marks, 0),
          generatedAt: new Date(),
        });

        await paper.save();

        // Populate questions for return
        await paper.populate("questions");

        console.log(
          `  ✅ Paper generated with ${selectedQuestions.length} questions, ${paper.totalMarks} marks`
        );
        return paper;
      } catch (error) {
        console.log(`  ❌ Attempt ${attempt} failed: ${error.message}`);
        if (attempt === this.maxAttempts) {
          throw new Error(
            `Failed to generate paper after ${this.maxAttempts} attempts: ${error.message}`
          );
        }
      }
    }
  }

  async selectQuestions(questionPool, blueprint) {
    const constraints = this.calculateCOConstraints(blueprint);
    const selectedQuestions = [];

    // Process each CO
    for (const [co, constraint] of Object.entries(constraints)) {
      console.log(`    Processing ${co}: ${constraint.totalMarks} marks`);

      const coQuestions = await this.selectQuestionsForCO(
        questionPool,
        co,
        constraint,
        blueprint
      );

      selectedQuestions.push(...coQuestions);
    }

    // Validate final selection
    this.validatePaperConstraints(selectedQuestions, blueprint);

    return selectedQuestions;
  }

  calculateCOConstraints(blueprint) {
    const constraints = {};

    for (const [co, requiredMarks] of blueprint.marksPerCO) {
      const theoryMarks = Math.round(
        (requiredMarks * blueprint.theoryPercent) / 100
      );
      const numericalMarks = requiredMarks - theoryMarks;

      constraints[co] = {
        totalMarks: requiredMarks,
        theoryMarks,
        numericalMarks,
        rbt: this.calculateRBTMarks(
          requiredMarks,
          blueprint.rbtDistribution || {}
        ),
      };
    }

    return constraints;
  }

  calculateRBTMarks(totalMarks, rbtDist) {
    if (!rbtDist || Object.values(rbtDist).every((v) => v === 0)) {
      return { R: 0, U: 0, AP: 0, AN: 0, E: 0, C: 0 }; // Updated to use AP/AN
    }

    return {
      R: Math.round((totalMarks * (rbtDist.R || 0)) / 100),
      U: Math.round((totalMarks * (rbtDist.U || 0)) / 100),
      AP: Math.round((totalMarks * (rbtDist.AP || rbtDist.Ap || 0)) / 100), // Handle both cases
      AN: Math.round((totalMarks * (rbtDist.AN || rbtDist.An || 0)) / 100), // Handle both cases
      E: Math.round((totalMarks * (rbtDist.E || 0)) / 100),
      C: Math.round((totalMarks * (rbtDist.C || 0)) / 100),
    };
  }

  async selectQuestionsForCO(questionPool, co, constraints, blueprint) {
    const coQuestions = questionPool.filter(
      (q) => q.co === co && !this.usedQuestionIds.has(q._id.toString())
    );

    if (coQuestions.length === 0) {
      throw new Error(`No available questions for ${co}`);
    }

    const selectedQuestions = [];

    // Select by type first
    const theoryQuestions = this.shuffleArray(
      coQuestions.filter((q) => q.type === "T")
    );
    const numericalQuestions = this.shuffleArray(
      coQuestions.filter((q) => q.type === "N")
    );

    // Select theory questions
    if (constraints.theoryMarks > 0) {
      selectedQuestions.push(
        ...this.selectQuestionsByTypeAndRBT(
          theoryQuestions,
          constraints.theoryMarks,
          constraints.rbt,
          blueprint.rbtDistribution || {}
        )
      );
    }

    // Select numerical questions
    if (constraints.numericalMarks > 0) {
      selectedQuestions.push(
        ...this.selectQuestionsByTypeAndRBT(
          numericalQuestions,
          constraints.numericalMarks,
          constraints.rbt,
          blueprint.rbtDistribution || {}
        )
      );
    }

    // Mark questions as used
    selectedQuestions.forEach((q) =>
      this.usedQuestionIds.add(q._id.toString())
    );

    return selectedQuestions;
  }

  selectQuestionsByTypeAndRBT(questions, targetMarks, rbtConstraints, rbtDist) {
    if (targetMarks <= 0 || questions.length === 0) return [];

    const selected = [];
    let currentMarks = 0;
    const hasRBTConstraint =
      rbtDist && Object.values(rbtDist).some((v) => v > 0);

    questions.sort((a, b) => a.marks - b.marks);

    if (hasRBTConstraint) {
      // Select with RBT constraints
      const rbtLevels = ["R", "U", "AP", "AN", "E", "C"]; // Updated RBT levels

      for (const rbtLevel of rbtLevels) {
        const targetRBTMarks = rbtConstraints[rbtLevel] || 0;
        if (targetRBTMarks <= 0) continue;

        const rbtQuestions = questions.filter(
          (q) => q.rbt === rbtLevel && !selected.includes(q)
        );

        let rbtMarks = 0;
        for (const question of rbtQuestions) {
          if (rbtMarks + question.marks <= targetRBTMarks + 2) {
            // Allow 2 marks tolerance
            selected.push(question);
            rbtMarks += question.marks;
            currentMarks += question.marks;

            if (rbtMarks >= targetRBTMarks) break;
          }
        }
      }
    } else {
      // Select without RBT constraints
      for (const question of questions) {
        if (currentMarks + question.marks <= targetMarks + 2) {
          // Allow 2 marks tolerance
          selected.push(question);
          currentMarks += question.marks;

          if (currentMarks >= targetMarks) break;
        }
      }
    }

    return selected;
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  validateQuestionPool(questionPool, blueprint, numberOfPapers) {
    // Check if we have enough unique questions
    const totalQuestionsNeeded = blueprint.totalQuestions * numberOfPapers;
    const availableQuestions = questionPool.length;

    if (availableQuestions < totalQuestionsNeeded) {
      throw new Error(
        `Insufficient questions: Need ${totalQuestionsNeeded}, available ${availableQuestions}`
      );
    }

    // Check CO distribution
    const coCounts = {};
    questionPool.forEach((q) => {
      coCounts[q.co] = (coCounts[q.co] || 0) + 1;
    });

    for (const [co, requiredMarks] of blueprint.marksPerCO) {
      if (!coCounts[co] || coCounts[co] < numberOfPapers) {
        throw new Error(
          `Insufficient questions for ${co}: available ${
            coCounts[co] || 0
          }, need at least ${numberOfPapers}`
        );
      }
    }

    console.log("✅ Question pool validation passed");
  }

  validatePaperConstraints(selectedQuestions, blueprint) {
    const totalMarks = selectedQuestions.reduce((sum, q) => sum + q.marks, 0);
    const totalQuestions = selectedQuestions.length;

    // Allow some tolerance (±5 marks, ±2 questions)
    if (Math.abs(totalMarks - blueprint.totalMarks) > 5) {
      throw new Error(
        `Mark constraint violation: expected ${blueprint.totalMarks}, got ${totalMarks}`
      );
    }

    if (Math.abs(totalQuestions - blueprint.totalQuestions) > 2) {
      throw new Error(
        `Question count violation: expected ${blueprint.totalQuestions}, got ${totalQuestions}`
      );
    }

    console.log("✅ Paper constraints validated");
  }
}

module.exports = PaperGenerator;
