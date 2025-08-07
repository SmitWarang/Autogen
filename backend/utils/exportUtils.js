const fs = require("fs-extra");
const path = require("path");
const archiver = require("archiver");
const PDFGenerator = require("./pdfGenerator");

class ExportUtils {
  constructor() {
    this.pdfGenerator = new PDFGenerator();
    this.exportsDir = path.join(__dirname, "../exports");
    this.ensureExportsDirectory();
  }

  // Ensure exports directory exists
  async ensureExportsDirectory() {
    await fs.ensureDir(this.exportsDir);
  }

  // Export single paper as PDF
  async exportSinglePaper(paper, blueprint, options = {}) {
    const filename = `${blueprint.name.replace(/[^a-zA-Z0-9]/g, "_")}_Paper_${
      paper.paperNumber
    }.pdf`;
    const filepath = path.join(this.exportsDir, filename);

    const doc = await this.pdfGenerator.generatePaperPDF(
      paper,
      blueprint,
      options
    );

    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);
      doc.end();

      stream.on("finish", () => {
        resolve({
          filename,
          filepath,
          size: fs.statSync(filepath).size,
        });
      });

      stream.on("error", reject);
    });
  }

  // Export all papers in a session as ZIP
  async exportPaperSession(papers, blueprint, options = {}) {
    const sessionId = papers[0].generationSessionId;
    const zipFilename = `${blueprint.name.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}_All_Papers_${sessionId.slice(0, 8)}.zip`;
    const zipFilepath = path.join(this.exportsDir, zipFilename);

    // Generate individual PDFs
    const pdfFiles = [];
    for (const paper of papers) {
      const pdfResult = await this.exportSinglePaper(paper, blueprint, options);
      pdfFiles.push(pdfResult);
    }

    // Create ZIP archive
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipFilepath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", async () => {
        // Clean up individual PDF files
        for (const pdfFile of pdfFiles) {
          await fs.remove(pdfFile.filepath);
        }

        resolve({
          filename: zipFilename,
          filepath: zipFilepath,
          size: archive.pointer(),
          filesIncluded: pdfFiles.length,
        });
      });

      archive.on("error", reject);
      archive.pipe(output);

      // Add PDFs to archive
      for (const pdfFile of pdfFiles) {
        archive.file(pdfFile.filepath, { name: pdfFile.filename });
      }

      archive.finalize();
    });
  }

  // Export paper data as JSON
  async exportPaperJSON(papers, blueprint) {
    const exportData = {
      blueprint: {
        name: blueprint.name,
        subject: blueprint.subject,
        totalMarks: blueprint.totalMarks,
        totalQuestions: blueprint.totalQuestions,
        marksPerModule: Object.fromEntries(blueprint.marksPerModule),
        theoryPercent: blueprint.theoryPercent,
        numericalPercent: blueprint.numericalPercent,
        createdAt: blueprint.createdAt,
      },
      papers: papers.map((paper) => ({
        paperNumber: paper.paperNumber,
        totalMarks: paper.totalMarks,
        totalQuestions: paper.totalQuestions,
        questions: paper.questions.map((q) => ({
          question: q.question,
          unit: q.unit,
          type: q.type,
          difficulty: q.difficulty,
          marks: q.marks,
        })),
        distribution: paper.distribution,
        generatedAt: paper.createdAt,
      })),
      exportedAt: new Date(),
      metadata: {
        totalPapers: papers.length,
        uniqueQuestions: [
          ...new Set(
            papers.flatMap((p) => p.questions.map((q) => q.questionId))
          ),
        ].length,
        generationSessionId: papers[0].generationSessionId,
      },
    };

    const filename = `${blueprint.name.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}_Data_Export.json`;
    const filepath = path.join(this.exportsDir, filename);

    await fs.writeJSON(filepath, exportData, { spaces: 2 });

    return {
      filename,
      filepath,
      size: fs.statSync(filepath).size,
    };
  }

  // Clean up old export files
  async cleanupOldExports(maxAgeHours = 24) {
    const files = await fs.readdir(this.exportsDir);
    const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000;

    for (const file of files) {
      const filepath = path.join(this.exportsDir, file);
      const stats = await fs.stat(filepath);

      if (stats.mtime.getTime() < cutoffTime) {
        await fs.remove(filepath);
      }
    }
  }

  // Get export file info
  async getExportInfo(filename) {
    const filepath = path.join(this.exportsDir, filename);

    if (await fs.pathExists(filepath)) {
      const stats = await fs.stat(filepath);
      return {
        filename,
        filepath,
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
      };
    }

    return null;
  }
}

module.exports = ExportUtils;
