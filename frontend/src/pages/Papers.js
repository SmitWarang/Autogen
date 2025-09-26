// src/pages/Papers.js - Updated for PDF download
import React, { useEffect, useState } from "react";
import {
  getBlueprints,
  generatePapers,
  getRecentPapers,
  downloadPaperPDF, // Updated import name
} from "../services/api";

// near the top of src/pages/Papers.js
import "../styles/theme.css";
import "../styles/papers.css";

const Papers = () => {
  const [blueprints, setBlueprints] = useState([]);
  const [selectedBlueprint, setSelectedBlueprint] = useState("");
  const [examType, setExamType] = useState("ISE"); // Default exam type
  const [numPapers, setNumPapers] = useState(1);
  const [difficulty, setDifficulty] = useState("easy"); // ✅ restore difficulty
  const [recentPapers, setRecentPapers] = useState([]);

  useEffect(() => {
    fetchBlueprints();
    fetchRecentPapers();
  }, []);

  const fetchBlueprints = async () => {
    try {
      const data = await getBlueprints();
      setBlueprints(data || []);
    } catch (err) {
      console.error("Error fetching blueprints:", err.message);
    }
  };

  const fetchRecentPapers = async () => {
    try {
      const data = await getRecentPapers();
      setRecentPapers(data || []);
    } catch (err) {
      console.error("Error fetching recent papers:", err.message);
    }
  };

  const handleGenerate = async () => {
    if (!selectedBlueprint) {
      alert("Please select a blueprint");
      return;
    }
    try {
      await generatePapers({
        blueprintId: selectedBlueprint,
        numberOfPapers: numPapers,
        examType, // send to backend
        difficulty, // ✅ send difficulty also
      });
      alert("Papers generated successfully");
      fetchRecentPapers();
    } catch (err) {
      alert("Failed to generate papers: " + err.message);
    }
  };

  const handleDownload = async (paperId) => {
    try {
      const blob = await downloadPaperPDF(paperId); // Updated function call
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `paper_${paperId}.pdf`; // Changed to .pdf extension
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Clean up the URL object
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download paper: " + err.message);
    }
  };

  return (
    <div className="papers-container">
      <h2>Generate Papers</h2>

      {/* Keep horizontal row layout */}
      <div className="form-row">
        <label>Blueprint:</label>
        <select
          value={selectedBlueprint}
          onChange={(e) => setSelectedBlueprint(e.target.value)}>
          <option value="">-- Select Blueprint --</option>
          {blueprints.map((bp) => (
            <option key={bp._id} value={bp._id}>
              {bp.title || bp.name}
            </option>
          ))}
        </select>

        <label>Exam Type:</label>
        <select value={examType} onChange={(e) => setExamType(e.target.value)}>
          <option value="ISE">ISE</option>
          <option value="ESE">ESE</option>
        </select>

        <label>Difficulty:</label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <label>Number of Papers:</label>
        <input
          type="number"
          min="1"
          max="3"
          value={numPapers}
          onChange={(e) => setNumPapers(e.target.value)}
        />

        <button onClick={handleGenerate}>Generate</button>
      </div>

      <h3>Recent Papers</h3>
      <ul>
        {recentPapers.map((p) => (
          <li key={p._id}>
            {p.title} ({p.totalMarks} Marks, Difficulty: {p.difficultyLevel}){" "}
            <button onClick={() => handleDownload(p._id)}>Download PDF</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Papers;
