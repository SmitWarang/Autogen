// backend/controllers/paperController.js - Updated with PDF Generation

const Blueprint = require("../models/Blueprint");
const Question = require("../models/Question");
const Paper = require("../models/Paper");
const PDFDocument = require("pdfkit");

const fs = require("fs");
const path = require("path");

/* =========================
 * Difficulty Level Configurations
 * =========================
 * This object drives RBT target distributions for easy/medium/hard.
 * You can tune percentages here.
 * ========================= */
const DIFFICULTY_CONFIGS = {
  easy: {
    name: "Easy",
    rbtDistribution: {
      R: 40,
      U: 35,
      AP: 15,
      AN: 7,
      E: 2,
      C: 1,
    },
  },
  medium: {
    name: "Medium",
    rbtDistribution: {
      R: 25,
      U: 25,
      AP: 25,
      AN: 15,
      E: 7,
      C: 3,
    },
  },
  hard: {
    name: "Hard",
    rbtDistribution: {
      R: 15,
      U: 20,
      AP: 20,
      AN: 20,
      E: 15,
      C: 10,
    },
  },
};

/* =========================
 * Helpers
 * ========================= */

function parseModuleFromCO(co) {
  if (!co) return null;
  const m = String(co).match(/CO\s*([0-9]+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function getQuestionTextFromDoc(q) {
  return (
    q.questionText ||
    q.question ||
    q.Questions ||
    q.Question ||
    q.question_text ||
    ""
  );
}

function idStr(x) {
  if (!x && x !== 0) return "";
  return typeof x === "string" ? x : x.toString();
}

function shuffleInPlace(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* =========================
 * RBT utility functions
 * ========================= */

function calculateRBTRequirements(totalQuestions, difficulty) {
  const config = DIFFICULTY_CONFIGS[difficulty];
  if (!config) {
    throw new Error(`Invalid difficulty level: ${difficulty}`);
  }

  const rbtRequirements = {};
  const distribution = config.rbtDistribution;

  for (const [rbt, percentage] of Object.entries(distribution)) {
    rbtRequirements[rbt] = Math.round((totalQuestions * percentage) / 100);
  }

  // Adjust rounding difference
  const calculatedTotal = Object.values(rbtRequirements).reduce(
    (sum, count) => sum + count,
    0
  );
  const difference = totalQuestions - calculatedTotal;
  if (difference !== 0) {
    const primaryRBT = Object.entries(distribution).sort(
      ([, a], [, b]) => b - a
    )[0][0];
    rbtRequirements[primaryRBT] += difference;
  }

  return rbtRequirements;
}

function getDifficultyLevels(numberOfPapers, specificDifficulty = null) {
  switch (numberOfPapers) {
    case 1:
      if (!specificDifficulty) {
        throw new Error(
          "Difficulty level required when generating single paper"
        );
      }
      return [specificDifficulty];
    case 2:
      return ["easy", "hard"];
    case 3:
      return ["easy", "medium", "hard"];
    default:
      throw new Error("Number of papers must be 1, 2, or 3");
  }
}

/* =========================
 * Allocation helpers
 * ========================= */

function findFallbackQuestions(allDocs, targetRBT, count, usedIds) {
  const rbtHierarchy = {
    R: ["U", "AP", "AN", "E", "C"],
    U: ["R", "AP", "AN", "E", "C"],
    AP: ["U", "AN", "R", "E", "C"],
    AN: ["AP", "U", "E", "R", "C"],
    E: ["AN", "AP", "C", "U", "R"],
    C: ["E", "AN", "AP", "U", "R"],
  };

  const fallbackOrder = rbtHierarchy[targetRBT] || [
    "R",
    "U",
    "AP",
    "AN",
    "E",
    "C",
  ];
  const fallbackQuestions = [];

  for (const rbt of fallbackOrder) {
    if (fallbackQuestions.length >= count) break;

    const availableQuestions = allDocs
      .filter((q) => q.rbt === rbt && !usedIds.has(idStr(q._id)))
      .slice(0, count - fallbackQuestions.length);

    fallbackQuestions.push(...availableQuestions);
    availableQuestions.forEach((q) => usedIds.add(idStr(q._id)));
  }

  return fallbackQuestions;
}

function allocateQuestionsByRBT(allDocs, rbtRequirements, priorUsedSet) {
  const selectedQuestions = [];
  const warnings = [];
  const usedIds = new Set(priorUsedSet);

  const questionsByRBT = {};
  const rbtLevels = ["R", "U", "AP", "AN", "E", "C"];

  rbtLevels.forEach((rbt) => {
    questionsByRBT[rbt] = allDocs
      .filter((q) => q.rbt === rbt && !usedIds.has(idStr(q._id)))
      .slice();
    shuffleInPlace(questionsByRBT[rbt]);
  });

  for (const [rbt, requiredCount] of Object.entries(rbtRequirements)) {
    if (requiredCount <= 0) continue;

    const availableQuestions = questionsByRBT[rbt] || [];
    const selectedForRBT = [];

    for (
      let i = 0;
      i < Math.min(requiredCount, availableQuestions.length);
      i++
    ) {
      const question = availableQuestions[i];
      selectedForRBT.push(question);
      usedIds.add(idStr(question._id));
    }

    if (selectedForRBT.length < requiredCount) {
      const shortage = requiredCount - selectedForRBT.length;
      warnings.push(
        `Not enough ${rbt} level questions. Required: ${requiredCount}, Available: ${selectedForRBT.length}`
      );

      const fallbackQuestions = findFallbackQuestions(
        allDocs,
        rbt,
        shortage,
        usedIds
      );
      selectedForRBT.push(...fallbackQuestions);
    }

    selectedQuestions.push(...selectedForRBT);
  }

  return { selectedQuestions, warnings };
}

function allocateAcrossPapersForBucketWithDifficulty(
  allDocs,
  priorUsedSet,
  difficulties,
  needPerPaper
) {
  const warnings = [];
  const allocations = Array.from({ length: difficulties.length }, () => []);

  for (let paperIndex = 0; paperIndex < difficulties.length; paperIndex++) {
    const difficulty = difficulties[paperIndex];
    const rbtRequirements = calculateRBTRequirements(needPerPaper, difficulty);

    const { selectedQuestions, warnings: rbtWarnings } = allocateQuestionsByRBT(
      allDocs,
      rbtRequirements,
      priorUsedSet
    );

    if (rbtWarnings.length > 0) {
      warnings.push(
        `${difficulty.toUpperCase()} paper: ${rbtWarnings.join(", ")}`
      );
    }

    while (selectedQuestions.length < needPerPaper) {
      const availableQuestions = allDocs.filter(
        (q) =>
          !selectedQuestions.some(
            (selected) => idStr(selected._id) === idStr(q._id)
          )
      );

      if (availableQuestions.length === 0) break;

      const randomQuestion =
        availableQuestions[
          Math.floor(Math.random() * availableQuestions.length)
        ];
      selectedQuestions.push(randomQuestion);
    }

    allocations[paperIndex] = selectedQuestions.slice(0, needPerPaper);
    selectedQuestions.forEach((q) => priorUsedSet.add(idStr(q._id)));
  }

  return { allocations, warnings };
}

/* =========================
 * Main: generatePapers
 * ========================= */
const generatePapers = async (req, res) => {
  try {
    const { blueprintId, numberOfPapers, difficulty, examType } = req.body;

    if (!blueprintId) {
      return res.status(400).json({ message: "blueprintId is required" });
    }

    const bp = await Blueprint.findById(blueprintId).lean();
    if (!bp) {
      return res.status(404).json({ message: "Blueprint not found" });
    }

    const papersToMake = parseInt(numberOfPapers, 10) || 1;

    if (![1, 2, 3].includes(papersToMake)) {
      return res.status(400).json({
        message: "Number of papers must be 1, 2, or 3",
      });
    }

    let difficultyLevels;
    try {
      difficultyLevels = getDifficultyLevels(papersToMake, difficulty);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    console.log("🎯 Starting generation:", {
      papers: papersToMake,
      difficulties: difficultyLevels,
      blueprint: bp.title || bp.name,
      examTypeProvided: examType || null,
    });

    const distribution = bp.distribution || {};

    // Gather prior used question IDs for this blueprint
    const priorPapers = await Paper.find(
      { blueprintId: bp._id },
      { "questions.questionId": 1 }
    ).lean();

    const priorUsed = new Set();
    for (const doc of priorPapers || []) {
      for (const q of doc.questions || []) {
        if (q && q.questionId) priorUsed.add(idStr(q.questionId));
      }
    }

    const perPaperSelections = Array.from({ length: papersToMake }, () => []);
    const allWarnings = [];

    const modules = Object.keys(distribution)
      .map((m) => m)
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    for (const mod of modules) {
      const marksMap = distribution[mod] || {};
      const marksBuckets = Object.keys(marksMap)
        .map((m) => parseInt(m, 10))
        .sort((a, b) => a - b);

      for (const mk of marksBuckets) {
        const needPerPaper = parseInt(marksMap[mk], 10) || 0;
        if (needPerPaper <= 0) continue;

        const match = { subject: bp.subject, marks: mk };
        if (mod !== undefined && String(mod).trim() !== "") {
          match.co = {
            $regex: new RegExp("^\\s*CO\\s*" + String(mod) + "\\b", "i"),
          };
        }

        const allCandidates = await Question.find(match).lean();
        if (!allCandidates || allCandidates.length === 0) {
          return res.status(400).json({
            message: `No questions available for Module ${mod}, Marks ${mk}.`,
          });
        }

        const { allocations, warnings } =
          allocateAcrossPapersForBucketWithDifficulty(
            allCandidates,
            priorUsed,
            difficultyLevels,
            needPerPaper
          );

        if (warnings && warnings.length) {
          allWarnings.push(
            ...warnings.map((w) => `Module ${mod}, Marks ${mk}: ${w}`)
          );
        }

        for (let pi = 0; pi < papersToMake; pi++) {
          const docsForThisPaper = allocations[pi] || [];
          for (const d of docsForThisPaper) {
            const qtext = getQuestionTextFromDoc(d);
            if (!qtext) {
              return res.status(400).json({
                message: `questionText missing for question id ${d._id}`,
              });
            }
            perPaperSelections[pi].push({
              questionId: d._id,
              questionText: qtext,
              marks: d.marks || mk,
              unit: d.unit || "",
              co: d.co || "",
              rbt: d.rbt || "",
              pi: d.pi || "",
              type: d.type || "",
            });
          }
        }
      }
    }

    // Save papers
    const created = [];
    for (let p = 0; p < papersToMake; p++) {
      const selections = perPaperSelections[p];
      const paperDifficulty = difficultyLevels[p];

      const totalMarks = selections.reduce(
        (s, q) => s + (parseInt(q.marks, 10) || 0),
        0
      );
      const totalQuestions = selections.length;

      const rbtCounts = {};
      selections.forEach((q) => {
        rbtCounts[q.rbt] = (rbtCounts[q.rbt] || 0) + 1;
      });

      // Determine exam type for paper (if frontend provided, prefer it)
      let examTypeForPaper = undefined;
      if (req.body.examType && typeof req.body.examType === "string") {
        examTypeForPaper =
          req.body.examType.toUpperCase() === "ESE" ? "ESE" : "ISE";
      } else {
        const marksPresent = new Set(selections.map((s) => Number(s.marks)));
        examTypeForPaper = marksPresent.has(10) ? "ESE" : "ISE";
      }

      const paper = await Paper.create({
        blueprintId: bp._id,
        subject: bp.subject,
        title: `${bp.title || bp.name || "Blueprint"} - ${
          DIFFICULTY_CONFIGS[paperDifficulty].name
        } Paper`,
        difficulty: paperDifficulty,
        questions: selections,
        totalMarks,
        totalQuestions,
        rbtDistribution: rbtCounts,
        targetRbtDistribution:
          DIFFICULTY_CONFIGS[paperDifficulty].rbtDistribution,
        examType: examTypeForPaper,
      });

      created.push(paper);

      console.log(
        `✅ Created ${paperDifficulty.toUpperCase()} paper (${
          paper._id
        }) with ${totalQuestions} questions, ${totalMarks} marks, examType=${examTypeForPaper}`
      );
    }

    const resp = {
      message: "Papers generated successfully",
      count: created.length,
      papers: created.map((paper) => ({
        ...paper.toObject(),
        difficultyLevel: DIFFICULTY_CONFIGS[paper.difficulty]?.name,
      })),
      difficultyLevels: difficultyLevels.map((d) => DIFFICULTY_CONFIGS[d].name),
    };

    if (allWarnings.length) resp.warnings = allWarnings;

    return res.status(201).json(resp);
  } catch (err) {
    console.error("generatePapers error", err);
    return res
      .status(500)
      .json({ message: err.message || "Error generating papers" });
  }
};

/* =========================
 * Read APIs
 * ========================= */

const getPaperById = async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.id);
    if (!paper) return res.status(404).json({ message: "Paper not found" });

    const paperWithDifficulty = {
      ...paper.toObject(),
      difficultyLevel: DIFFICULTY_CONFIGS[paper.difficulty]?.name || "Unknown",
      examType:
        paper.examType ||
        (paper.questions.some((q) => Number(q.marks) === 10) ? "ESE" : "ISE"),
    };

    res.json(paperWithDifficulty);
  } catch (err) {
    console.error("getPaperById error", err);
    res.status(500).json({ message: err.message || "Error fetching paper" });
  }
};

const getRecentPapers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const list = await Paper.find().sort({ createdAt: -1 }).limit(limit);

    const papersWithDifficulty = list.map((paper) => ({
      ...paper.toObject(),
      difficultyLevel: DIFFICULTY_CONFIGS[paper.difficulty]?.name || "Unknown",
      examType:
        paper.examType ||
        (paper.questions.some((q) => Number(q.marks) === 10) ? "ESE" : "ISE"),
    }));

    res.json(papersWithDifficulty);
  } catch (err) {
    console.error("getRecentPapers error", err);
    res.status(500).json({ message: err.message || "Error fetching papers" });
  }
};

/* =========================
 * PDF Generation Functions
 * ========================= */

function addCollegeHeader(doc) {
  const pageWidth = doc.page.width;
  const margin = doc.page.margins.left;
  const contentWidth = pageWidth - 2 * margin;

  // Try to add college header image
  try {
    const headerImagePath = path.join(__dirname, "../assets/tcet-header.jpeg");
    if (fs.existsSync(headerImagePath)) {
      // Calculate image dimensions to fit within page width
      const maxWidth = contentWidth;
      const maxHeight = 80; // Adjust height as needed

      doc.image(headerImagePath, margin, doc.y, {
        fit: [maxWidth, maxHeight],
        align: "center",
      });

      // Move down after image
      doc.y += maxHeight + 20;
    } else {
      console.warn("College header image not found at:", headerImagePath);
      // Fallback: Add text header
      doc.fontSize(14).font("Helvetica-Bold");
      doc.text("THAKUR COLLEGE OF ENGINEERING & TECHNOLOGY", margin, doc.y, {
        width: contentWidth,
        align: "center",
      });
      doc.moveDown(1);
    }
  } catch (error) {
    console.error("Error loading college header image:", error);
    // Fallback: Add text header
    doc.fontSize(14).font("Helvetica-Bold");
    doc.text("THAKUR COLLEGE OF ENGINEERING & TECHNOLOGY", margin, doc.y, {
      width: contentWidth,
      align: "center",
    });
    doc.moveDown(1);
  }
}

function addISEHeader(doc, paper, blueprint) {
  const pageWidth = doc.page.width;
  const margin = doc.page.margins.left;
  const contentWidth = pageWidth - 2 * margin;

  // Add college header first
  addCollegeHeader(doc);

  // Main title - centered and bold
  doc.fontSize(14).font("Helvetica-Bold");
  const title = "IN SEMESTER EXAMINATION";
  const titleWidth = doc.widthOfString(title);
  doc.text(title, (pageWidth - titleWidth) / 2, doc.y);

  doc.moveDown(1.5);

  // Paper details in two columns
  doc.fontSize(12).font("Helvetica-Bold");

  // Left column
  const leftX = margin;
  const rightX = margin + contentWidth / 2;
  let currentY = doc.y;

  doc.text(`YEAR: _____________`, leftX, currentY);
  doc.text(
    `SUBJECT: ${paper.subject || "_____________"}`,
    leftX,
    currentY + 20
  );
  doc.text(`Branch: _____________`, leftX, currentY + 40);
  doc.text(`Div: _____________`, leftX, currentY + 60);
  doc.text(`Duration: _____________`, leftX, currentY + 80);

  // Right column
  doc.text(`Date: _____________`, rightX, currentY);
  doc.text(`Timing: _____________`, rightX, currentY + 20);
  doc.text(
    `Maximum Marks: ${paper.totalMarks || "_____"}`,
    rightX,
    currentY + 40
  );

  doc.y = currentY + 120;
  doc.moveDown(1);

  // Instructions
  doc.fontSize(12).font("Helvetica-Bold");
  doc.text("Instructions:", margin, doc.y);
  doc.moveDown(0.5);

  doc.font("Helvetica");
  const instructions = [
    "All questions are compulsory.",
    "Assume suitable data wherever necessary and state the assumptions made.",
    "Diagrams / Sketches should be given wherever necessary.",
    "Use of logarithmic table, drawing instruments and non-programmable calculators is permitted.",
    "Figures to the right indicate full marks.",
  ];

  instructions.forEach((instruction, index) => {
    doc.text(`${index + 1}. ${instruction}`, margin + 20, doc.y);
    doc.moveDown(0.5);
  });

  doc.moveDown(1);
}

function addESEHeader(doc, paper, blueprint) {
  const pageWidth = doc.page.width;
  const margin = doc.page.margins.left;
  const contentWidth = pageWidth - 2 * margin;

  // Add college header first
  addCollegeHeader(doc);

  // Main title - centered and bold
  doc.fontSize(14).font("Helvetica-Bold");
  const title = "END SEMESTER EXAMINATION";
  const titleWidth = doc.widthOfString(title);
  doc.text(title, (pageWidth - titleWidth) / 2, doc.y);

  doc.moveDown(1.5);

  // Paper details table-like structure
  doc.fontSize(12).font("Helvetica-Bold");

  const tableY = doc.y;
  const rowHeight = 25;

  // Draw table structure with lines
  doc.rect(margin, tableY, contentWidth, rowHeight * 3).stroke();

  // Vertical lines
  doc
    .moveTo(margin + contentWidth / 2, tableY)
    .lineTo(margin + contentWidth / 2, tableY + rowHeight * 3)
    .stroke();
  doc
    .moveTo(margin + contentWidth * 0.75, tableY)
    .lineTo(margin + contentWidth * 0.75, tableY + rowHeight * 3)
    .stroke();

  // Horizontal lines
  doc
    .moveTo(margin, tableY + rowHeight)
    .lineTo(margin + contentWidth, tableY + rowHeight)
    .stroke();
  doc
    .moveTo(margin, tableY + rowHeight * 2)
    .lineTo(margin + contentWidth, tableY + rowHeight * 2)
    .stroke();

  // Fill table content
  doc.text("YEAR: _______", margin + 5, tableY + 5);
  doc.text("Q.P. Code:", margin + contentWidth * 0.75 + 5, tableY + 5);

  doc.text("Branch: _______", margin + 5, tableY + rowHeight + 5);
  doc.text("Duration:", margin + contentWidth / 2 + 5, tableY + rowHeight + 5);

  doc.text(
    `Subject: ${paper.subject || "_______"}`,
    margin + 5,
    tableY + rowHeight * 2 + 5
  );
  doc.text(
    `Max. Marks: ${paper.totalMarks || "___"}`,
    margin + contentWidth * 0.75 + 5,
    tableY + rowHeight * 2 + 5
  );

  doc.text("Subject Code: _______", margin + 5, tableY + rowHeight * 2 + 5);

  doc.y = tableY + rowHeight * 3 + 20;

  // Instructions
  doc.fontSize(12).font("Helvetica-Bold");
  doc.text("Instructions:", margin, doc.y);
  doc.moveDown(0.5);

  doc.font("Helvetica");
  const instructions = [
    "All sections are compulsory.",
    "Figures to the right indicate full marks.",
    "Assume suitable data wherever necessary and state the assumptions clearly.",
  ];

  instructions.forEach((instruction, index) => {
    doc.text(`${index + 1}. ${instruction}`, margin + 20, doc.y);
    doc.moveDown(0.5);
  });

  doc.moveDown(1);
}

function addQuestionsTable(doc, paper) {
  const margin = doc.page.margins.left;
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - 2 * margin;

  // Group questions by marks (sections)
  const sections = { A: [], B: [], C: [] };

  paper.questions.forEach((q, idx) => {
    const marks = Number(q.marks);
    const row = {
      sr: idx + 1,
      questionText: q.questionText || "",
      co: q.co || "",
      rbt: q.rbt || "",
      pi: q.pi || "",
      marks: q.marks || "",
    };

    if (marks === 2) sections.A.push(row);
    else if (marks === 5) sections.B.push(row);
    else if (marks === 10) sections.C.push(row);
    else sections.C.push(row);
  });

  // Sort by CO/Module
  Object.keys(sections).forEach((sectionKey) => {
    sections[sectionKey].sort((a, b) => {
      const moduleA = parseModuleFromCO(a.co) || 9999;
      const moduleB = parseModuleFromCO(b.co) || 9999;
      return moduleA - moduleB;
    });
  });

  // Add sections based on exam type
  const examType = paper.examType || "ISE";
  const sectionsToShow = examType === "ESE" ? ["A", "B", "C"] : ["A", "B"];

  sectionsToShow.forEach((sectionKey) => {
    const sectionQuestions = sections[sectionKey];
    if (sectionQuestions.length === 0) return;

    // Check if we need a new page
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    }

    // Section header
    doc.fontSize(14).font("Helvetica-Bold");
    doc.text(`Section ${sectionKey}`, margin, doc.y);
    doc.moveDown(0.5);

    // Table headers
    const tableStartY = doc.y;
    const rowHeight = 30;
    const colWidths = [40, 300, 40, 40, 40, 40]; // Adjust widths as needed
    const headers = ["Sr No.", "Questions", "CO", "RBT", "Pi", "Marks"];

    let currentX = margin;

    // Draw header row
    doc.fontSize(10).font("Helvetica-Bold");
    headers.forEach((header, i) => {
      doc.rect(currentX, tableStartY, colWidths[i], rowHeight).stroke();
      doc.text(header, currentX + 5, tableStartY + 10, {
        width: colWidths[i] - 10,
        align: "center",
      });
      currentX += colWidths[i];
    });

    let currentY = tableStartY + rowHeight;

    // Draw question rows
    doc.font("Helvetica");
    sectionQuestions.forEach((question, index) => {
      // Check if we need a new page
      if (currentY > doc.page.height - 100) {
        doc.addPage();
        currentY = doc.y;
      }

      const questionHeight = Math.max(
        rowHeight,
        doc.heightOfString(question.questionText, {
          width: colWidths[1] - 10,
        }) + 20
      );

      currentX = margin;
      const rowData = [
        question.sr.toString(),
        question.questionText,
        question.co,
        question.rbt,
        question.pi,
        question.marks.toString(),
      ];

      rowData.forEach((data, i) => {
        doc.rect(currentX, currentY, colWidths[i], questionHeight).stroke();

        if (i === 1) {
          // Question text - left align and wrap
          doc.text(data, currentX + 5, currentY + 10, {
            width: colWidths[i] - 10,
            align: "left",
          });
        } else {
          // Other columns - center align
          doc.text(data, currentX + 5, currentY + 10, {
            width: colWidths[i] - 10,
            align: "center",
          });
        }
        currentX += colWidths[i];
      });

      currentY += questionHeight;
    });

    doc.y = currentY + 20;
    doc.moveDown(1);
  });
}

/* =========================
 * Updated PDF Download Function
 * ========================= */
const downloadPaperPDF = async (req, res) => {
  try {
    const paperId = req.params.id || req.params.paperId;
    const paper = await Paper.findById(paperId).populate("blueprintId");
    if (!paper) return res.status(404).json({ message: "Paper not found" });

    const blueprint = paper.blueprintId || {};

    // Create PDF document
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
    });

    // Set up response headers
    const examType = paper.examType || "ISE";
    const safeDifficulty = paper.difficulty || "unknown";
    const fileName = `paper_${paperId}_${safeDifficulty}_${examType}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    // Pipe the PDF to response
    doc.pipe(res);

    // Add appropriate header based on exam type
    if (examType === "ESE") {
      addESEHeader(doc, paper, blueprint);
    } else {
      addISEHeader(doc, paper, blueprint);
    }

    // Add questions table
    addQuestionsTable(doc, paper);

    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error("downloadPaperPDF error", error);
    res.status(500).json({ message: "Error generating PDF file" });
  }
};

/* =========================
 * Difficulty configs endpoint
 * ========================= */
const getDifficultyConfigs = async (req, res) => {
  try {
    res.json({
      message: "Difficulty configurations",
      configs: DIFFICULTY_CONFIGS,
    });
  } catch (err) {
    console.error("getDifficultyConfigs error", err);
    res
      .status(500)
      .json({ message: err.message || "Error fetching difficulty configs" });
  }
};

module.exports = {
  generatePapers,
  getPaperById,
  getRecentPapers,
  downloadPaperPDF, // Updated function name
  getDifficultyConfigs,
};
