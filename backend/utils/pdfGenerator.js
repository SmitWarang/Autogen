const PDFDocument = require("pdfkit");
const fs = require("fs-extra");
const path = require("path");

class PDFGenerator {
  constructor() {
    this.pageMargin = 50;
    this.lineHeight = 20;
  }

  // Generate PDF for a single paper
  async generatePaperPDF(paper, blueprint, options = {}) {
    const doc = new PDFDocument({
      size: "A4",
      margin: this.pageMargin,
      info: {
        Title: `${blueprint.name} - Paper ${paper.paperNumber}`,
        Author: "Autonomous Generator",
        Subject: blueprint.subject,
        CreationDate: new Date(),
      },
    });

    // Set up PDF content
    await this.addHeader(doc, paper, blueprint);
    await this.addInstructions(doc, blueprint);
    await this.addQuestions(doc, paper, options);

    if (options.includeAnswerKey) {
      doc.addPage();
      await this.addAnswerKey(doc, paper);
    }

    await this.addFooter(doc, paper, blueprint);

    return doc;
  }

  // Add PDF header
  async addHeader(doc, paper, blueprint) {
    const pageWidth = doc.page.width - 2 * this.pageMargin;

    // Institution header (customize as needed)
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("AUTONOMOUS GENERATOR SYSTEM", this.pageMargin, this.pageMargin, {
        width: pageWidth,
        align: "center",
      });

    doc.moveDown(0.5);

    // Exam details
    doc.fontSize(14).font("Helvetica-Bold").text(blueprint.name.toUpperCase(), {
      width: pageWidth,
      align: "center",
    });

    doc.moveDown(0.5);

    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`Subject: ${blueprint.subject}`, this.pageMargin)
      .text(
        `Paper: ${paper.paperNumber}`,
        this.pageMargin + 200,
        doc.y - this.lineHeight
      )
      .text(
        `Total Marks: ${paper.totalMarks}`,
        this.pageMargin + 400,
        doc.y - this.lineHeight
      );

    doc.moveDown(0.3);

    doc
      .text(`Total Questions: ${paper.totalQuestions}`, this.pageMargin)
      .text(`Time: 3 Hours`, this.pageMargin + 200, doc.y - this.lineHeight)
      .text(
        `Date: ___________`,
        this.pageMargin + 400,
        doc.y - this.lineHeight
      );

    // Student details section
    doc.moveDown(0.5);
    doc
      .text(`Name: ________________________`, this.pageMargin)
      .text(
        `Roll No: ___________`,
        this.pageMargin + 300,
        doc.y - this.lineHeight
      );

    // Draw line separator
    doc.moveDown(0.5);
    doc
      .moveTo(this.pageMargin, doc.y)
      .lineTo(doc.page.width - this.pageMargin, doc.y)
      .stroke();

    doc.moveDown(0.5);
  }

  // Add exam instructions
  async addInstructions(doc, blueprint) {
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("INSTRUCTIONS:", this.pageMargin);

    doc.moveDown(0.3);

    const instructions = [
      "1. Read all questions carefully before answering.",
      "2. Answer all questions. All questions are compulsory.",
      "3. Write answers in the space provided or use additional sheets if required.",
      "4. Marks are indicated against each question.",
      "5. Maintain clarity and neatness in your answers.",
      "6. Use of calculator is permitted where applicable.",
    ];

    doc.fontSize(10).font("Helvetica");

    instructions.forEach((instruction) => {
      doc.text(instruction, this.pageMargin + 20);
      doc.moveDown(0.2);
    });

    // Draw line separator
    doc.moveDown(0.3);
    doc
      .moveTo(this.pageMargin, doc.y)
      .lineTo(doc.page.width - this.pageMargin, doc.y)
      .stroke();

    doc.moveDown(0.5);
  }

  // Add questions to PDF
  async addQuestions(doc, paper, options) {
    doc.fontSize(12).font("Helvetica-Bold").text("QUESTIONS:", this.pageMargin);

    doc.moveDown(0.5);

    let questionNumber = 1;
    let currentModule = "";

    // Group questions by module
    const questionsByModule = this.groupQuestionsByModule(paper.questions);

    for (const [module, questions] of Object.entries(questionsByModule)) {
      // Module header
      if (module !== currentModule) {
        if (currentModule !== "") {
          doc.moveDown(0.5);
        }

        doc
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(`${module}:`, this.pageMargin);
        doc.moveDown(0.3);
        currentModule = module;
      }

      // Add questions for this module
      for (const question of questions) {
        await this.addSingleQuestion(doc, question, questionNumber, options);
        questionNumber++;
      }
    }
  }

  // Add a single question
  async addSingleQuestion(doc, question, questionNumber, options) {
    const pageWidth = doc.page.width - 2 * this.pageMargin;

    // Check if we need a new page
    if (doc.y > doc.page.height - 150) {
      doc.addPage();
    }

    // Question header with marks
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text(`Q${questionNumber}.`, this.pageMargin, doc.y, { continued: true })
      .text(`[${question.marks} Mark${question.marks > 1 ? "s" : ""}]`, {
        align: "right",
        width: pageWidth - 30,
      });

    doc.moveDown(0.2);

    // Question text
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(question.question, this.pageMargin + 30, doc.y, {
        width: pageWidth - 30,
        align: "justify",
      });

    // Question metadata (if in debug mode)
    if (options.includeMetadata) {
      doc
        .fontSize(8)
        .font("Helvetica-Oblique")
        .fillColor("gray")
        .text(
          `[${question.type} | ${question.difficulty} | ${question.unit}]`,
          this.pageMargin + 30,
          doc.y + 5
        );
      doc.fillColor("black");
    }

    // Answer space
    const answerLines = this.calculateAnswerLines(question.marks);
    doc.moveDown(0.3);

    for (let i = 0; i < answerLines; i++) {
      if (doc.y > doc.page.height - 50) {
        doc.addPage();
      }
      doc
        .moveTo(this.pageMargin + 30, doc.y + 10)
        .lineTo(doc.page.width - this.pageMargin, doc.y + 10)
        .stroke();
      doc.moveDown(0.6);
    }

    doc.moveDown(0.5);
  }

  // Add answer key
  async addAnswerKey(doc, paper) {
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("ANSWER KEY", this.pageMargin, this.pageMargin, {
        width: doc.page.width - 2 * this.pageMargin,
        align: "center",
      });

    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .font("Helvetica-Oblique")
      .text(
        "Note: This section contains question metadata for reference purposes only.",
        {
          align: "center",
        }
      );

    doc.moveDown(0.5);

    let questionNumber = 1;
    const questionsByModule = this.groupQuestionsByModule(paper.questions);

    for (const [module, questions] of Object.entries(questionsByModule)) {
      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(`${module}:`, this.pageMargin);
      doc.moveDown(0.3);

      for (const question of questions) {
        doc
          .fontSize(9)
          .font("Helvetica")
          .text(
            `Q${questionNumber}: ${question.type.toUpperCase()} | ${question.difficulty.toUpperCase()} | ${
              question.marks
            } marks`,
            this.pageMargin + 20
          );
        doc.moveDown(0.2);
        questionNumber++;
      }
      doc.moveDown(0.3);
    }
  }

  // Add footer
  async addFooter(doc, paper, blueprint) {
    const pages = doc.bufferedPageRange();

    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      doc
        .fontSize(8)
        .font("Helvetica")
        .text(
          `Generated on: ${new Date().toLocaleString()}`,
          this.pageMargin,
          doc.page.height - 30
        );

      doc.text(
        `Page ${i + 1} of ${pages.count}`,
        doc.page.width - this.pageMargin - 50,
        doc.page.height - 30
      );
    }
  }

  // Helper methods
  groupQuestionsByModule(questions) {
    const grouped = {};
    questions.forEach((q) => {
      if (!grouped[q.unit]) {
        grouped[q.unit] = [];
      }
      grouped[q.unit].push(q);
    });
    return grouped;
  }

  calculateAnswerLines(marks) {
    if (marks <= 2) return 3;
    if (marks <= 5) return 5;
    if (marks <= 10) return 8;
    return 10;
  }
}

module.exports = PDFGenerator;
