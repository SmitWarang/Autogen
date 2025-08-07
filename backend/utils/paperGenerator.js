const Question = require("../models/Question");

class PaperGenerator {
  constructor() {
    this.usedQuestionIds = new Set(); // Track used questions across all papers
  }

  // Main function to generate multiple papers
  async generateMultiplePapers(blueprint) {
    const papers = [];
    this.usedQuestionIds.clear(); // Reset for new generation session

    for (let i = 0; i < blueprint.numberOfPapers; i++) {
      try {
        const paper = await this.generateSinglePaper(blueprint, i + 1);
        papers.push(paper);
      } catch (error) {
        throw new Error(`Failed to generate paper ${i + 1}: ${error.message}`);
      }
    }

    return papers;
  }

  // Generate a single paper based on blueprint
  async generateSinglePaper(blueprint, paperNumber) {
    const questionPool = await this.getAvailableQuestions(blueprint);

    if (questionPool.length === 0) {
      throw new Error(
        "No questions available for the given blueprint constraints"
      );
    }

    const selectedQuestions = [];
    const moduleConstraints = this.calculateModuleConstraints(blueprint);

    // Generate questions module by module
    for (const [module, constraints] of Object.entries(moduleConstraints)) {
      const moduleQuestions = await this.selectQuestionsForModule(
        questionPool,
        module,
        constraints,
        blueprint
      );
      selectedQuestions.push(...moduleQuestions);
    }

    // Validate final paper
    this.validateGeneratedPaper(selectedQuestions, blueprint);

    return {
      paperNumber,
      blueprintId: blueprint._id,
      questions: selectedQuestions,
      totalMarks: selectedQuestions.reduce((sum, q) => sum + q.marks, 0),
      totalQuestions: selectedQuestions.length,
      generatedAt: new Date(),
      distribution: this.calculatePaperDistribution(selectedQuestions),
    };
  }

  // Get available questions based on blueprint and used questions
  async getAvailableQuestions(blueprint) {
    const filter = {
      subject: blueprint.subject,
      _id: { $nin: Array.from(this.usedQuestionIds) }, // Exclude used questions
    };

    return await Question.find(filter);
  }

  // Calculate module-wise constraints
  calculateModuleConstraints(blueprint) {
    const constraints = {};

    // Use CO-based constraints instead of module-based
    for (const [co, requiredMarks] of blueprint.marksPerCO) {
      const theoryMarks = Math.round(
        (requiredMarks * blueprint.theoryPercent) / 100
      );
      const numericalMarks = requiredMarks - theoryMarks;

      constraints[co] = {
        totalMarks: requiredMarks,
        theoryMarks,
        numericalMarks,
        // RBT distribution for this CO
        rbt: this.calculateRBTMarks(requiredMarks, blueprint.rbtDistribution),
      };
    }

    return constraints;
  }

  // Add new method for RBT distribution
  calculateRBTMarks(totalMarks, rbtDist) {
    if (!rbtDist || Object.values(rbtDist).every((v) => v === 0)) {
      return { R: 0, U: 0, Ap: 0, An: 0, E: 0, C: 0 };
    }

    return {
      R: Math.round((totalMarks * rbtDist.R) / 100),
      U: Math.round((totalMarks * rbtDist.U) / 100),
      Ap: Math.round((totalMarks * rbtDist.Ap) / 100),
      An: Math.round((totalMarks * rbtDist.An) / 100),
      E: Math.round((totalMarks * rbtDist.E) / 100),
      C: Math.round((totalMarks * rbtDist.C) / 100),
    };
  }

  // Calculate difficulty-wise marks distribution
  calculateDifficultyMarks(totalMarks, difficultyDist) {
    if (
      !difficultyDist ||
      Object.values(difficultyDist).every((v) => v === 0)
    ) {
      return { easy: 0, medium: 0, hard: 0 }; // No difficulty constraint
    }

    return {
      easy: Math.round((totalMarks * difficultyDist.easy) / 100),
      medium: Math.round((totalMarks * difficultyDist.medium) / 100),
      hard: Math.round((totalMarks * difficultyDist.hard) / 100),
    };
  }

  // Select questions for a specific module
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
    selectedQuestions.push(
      ...this.selectQuestionsByTypeAndRBT(
        theoryQuestions,
        constraints.theoryMarks,
        constraints.rbt,
        blueprint.rbtDistribution
      )
    );

    // Select numerical questions
    selectedQuestions.push(
      ...this.selectQuestionsByTypeAndRBT(
        numericalQuestions,
        constraints.numericalMarks,
        constraints.rbt,
        blueprint.rbtDistribution
      )
    );

    // Mark questions as used
    selectedQuestions.forEach((q) =>
      this.usedQuestionIds.add(q._id.toString())
    );

    return selectedQuestions;
  }

  // Select questions by type with difficulty constraints
  selectQuestionsByType(
    questions,
    targetMarks,
    remainingDifficulty,
    difficultyDist
  ) {
    if (targetMarks <= 0 || questions.length === 0) return [];

    const selected = [];
    let currentMarks = 0;
    const hasDifficultyConstraint =
      difficultyDist && Object.values(difficultyDist).some((v) => v > 0);

    // Sort questions by marks (ascending) for better fitting
    questions.sort((a, b) => a.marks - b.marks);

    if (hasDifficultyConstraint) {
      // Select with difficulty constraints
      const difficulties = ["easy", "medium", "hard"];

      for (const difficulty of difficulties) {
        const targetDiffMarks = remainingDifficulty[difficulty];
        if (targetDiffMarks <= 0) continue;

        const diffQuestions = questions.filter(
          (q) => q.difficulty === difficulty && !selected.includes(q)
        );

        let diffMarks = 0;
        for (const question of diffQuestions) {
          if (diffMarks + question.marks <= targetDiffMarks + 2) {
            // 2 marks tolerance
            selected.push(question);
            diffMarks += question.marks;
            currentMarks += question.marks;

            if (diffMarks >= targetDiffMarks) break;
          }
        }
      }
    } else {
      // Select without difficulty constraints (greedy approach)
      for (const question of questions) {
        if (currentMarks + question.marks <= targetMarks + 2) {
          // 2 marks tolerance
          selected.push(question);
          currentMarks += question.marks;

          if (currentMarks >= targetMarks) break;
        }
      }
    }

    return selected;
  }

  // Add method to select questions by RBT
  selectQuestionsByTypeAndRBT(questions, targetMarks, rbtConstraints, rbtDist) {
    if (targetMarks <= 0 || questions.length === 0) return [];

    const selected = [];
    let currentMarks = 0;
    const hasRBTConstraint =
      rbtDist && Object.values(rbtDist).some((v) => v > 0);

    questions.sort((a, b) => a.marks - b.marks);

    if (hasRBTConstraint) {
      // Select with RBT constraints
      const rbtLevels = ["R", "U", "Ap", "An", "E", "C"];

      for (const rbtLevel of rbtLevels) {
        const targetRBTMarks = rbtConstraints[rbtLevel];
        if (targetRBTMarks <= 0) continue;

        const rbtQuestions = questions.filter(
          (q) => q.rbt === rbtLevel && !selected.includes(q)
        );

        let rbtMarks = 0;
        for (const question of rbtQuestions) {
          if (rbtMarks + question.marks <= targetRBTMarks + 2) {
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
          selected.push(question);
          currentMarks += question.marks;

          if (currentMarks >= targetMarks) break;
        }
      }
    }

    return selected;
  }

  // Fisher-Yates shuffle algorithm
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Validate the generated paper
  validateGeneratedPaper(questions, blueprint) {
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    const theoryMarks = questions
      .filter((q) => q.type === "theory")
      .reduce((sum, q) => sum + q.marks, 0);
    const numericalMarks = questions
      .filter((q) => q.type === "numerical")
      .reduce((sum, q) => sum + q.marks, 0);

    // Check total marks (allow 5% tolerance)
    const marksTolerance = blueprint.totalMarks * 0.05;
    if (Math.abs(totalMarks - blueprint.totalMarks) > marksTolerance) {
      throw new Error(
        `Total marks mismatch: Expected ${blueprint.totalMarks}, got ${totalMarks}`
      );
    }

    // Check type distribution (allow 10% tolerance)
    const expectedTheory =
      (blueprint.totalMarks * blueprint.theoryPercent) / 100;
    const expectedNumerical =
      (blueprint.totalMarks * blueprint.numericalPercent) / 100;
    const typeTolerance = blueprint.totalMarks * 0.1;

    if (Math.abs(theoryMarks - expectedTheory) > typeTolerance) {
      throw new Error(
        `Theory marks mismatch: Expected ~${expectedTheory}, got ${theoryMarks}`
      );
    }

    if (Math.abs(numericalMarks - expectedNumerical) > typeTolerance) {
      throw new Error(
        `Numerical marks mismatch: Expected ~${expectedNumerical}, got ${numericalMarks}`
      );
    }
  }

  // Calculate paper distribution for analysis
  calculatePaperDistribution(questions) {
    const distribution = {
      byModule: {},
      byType: { theory: 0, numerical: 0 },
      byDifficulty: { easy: 0, medium: 0, hard: 0 },
    };

    questions.forEach((q) => {
      // Module distribution
      if (!distribution.byModule[q.unit]) {
        distribution.byModule[q.unit] = { count: 0, marks: 0 };
      }
      distribution.byModule[q.unit].count++;
      distribution.byModule[q.unit].marks += q.marks;

      // Type distribution
      distribution.byType[q.type] += q.marks;

      // Difficulty distribution
      distribution.byDifficulty[q.difficulty] += q.marks;
    });

    return distribution;
  }

  // Reset used questions (for new generation session)
  resetUsedQuestions() {
    this.usedQuestionIds.clear();
  }
}

module.exports = PaperGenerator;
