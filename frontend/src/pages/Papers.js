import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  getPapers,
  generatePapers,
  deletePaper,
  exportPaperToPDF,
} from "../services/api";
import { useToast } from "../hooks/useToast";
import {
  Files,
  Download,
  Trash2,
  Plus,
  Eye,
  Calendar,
  FileText,
} from "lucide-react";
import LoadingSpinner from "../components/common/LoadingSpinner";

const Papers = () => {
  const location = useLocation();
  const { showToast } = useToast();

  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);

  useEffect(() => {
    fetchPapers();

    // Check if we should show generation dialog
    if (location.state?.showGeneration && location.state?.blueprintId) {
      handleGeneratePapers(location.state.blueprintId);
    }
  }, [location]);

  const fetchPapers = async () => {
    try {
      setLoading(true);
      const response = await getPapers();
      setPapers(response.data || []);
    } catch (error) {
      showToast("Failed to fetch papers: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePapers = async (blueprintId) => {
    try {
      setGenerating(true);
      const response = await generatePapers(blueprintId);
      showToast(
        `Successfully generated ${response.data.papers.length} papers!`,
        "success"
      );
      await fetchPapers();
    } catch (error) {
      showToast("Failed to generate papers: " + error.message, "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeletePaper = async (paperId) => {
    if (!window.confirm("Are you sure you want to delete this paper?")) return;

    try {
      await deletePaper(paperId);
      showToast("Paper deleted successfully", "success");
      await fetchPapers();
    } catch (error) {
      showToast("Failed to delete paper: " + error.message, "error");
    }
  };

  const handleExportPDF = async (paperId, paperName) => {
    try {
      const response = await exportPaperToPDF(paperId);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${paperName}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      showToast("Paper exported successfully!", "success");
    } catch (error) {
      showToast("Failed to export paper: " + error.message, "error");
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSpinner text="Loading papers..." />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Generated Papers</h1>
          <p className="page-description">
            View, manage, and export your generated question papers
          </p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-primary"
            onClick={() => (window.location.href = "/blueprint")}>
            <Plus size={16} />
            Generate New Papers
          </button>
        </div>
      </div>

      {generating && (
        <div className="card mb-6">
          <div className="card-content">
            <LoadingSpinner text="Generating papers..." />
          </div>
        </div>
      )}

      {papers.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Files size={64} className="empty-state-icon" />
            <h3>No Papers Generated Yet</h3>
            <p className="empty-state-text">
              Create your first blueprint to start generating question papers
            </p>
            <button
              className="btn btn-primary"
              onClick={() => (window.location.href = "/blueprint")}>
              <Plus size={16} />
              Create Blueprint
            </button>
          </div>
        </div>
      ) : (
        <div className="papers-grid">
          {papers.map((paper) => (
            <div key={paper._id} className="paper-card">
              <div className="paper-card-header">
                <div className="paper-info">
                  <h3 className="paper-title">{paper.name}</h3>
                  <div className="paper-meta">
                    <span className="paper-meta-item">
                      <Calendar size={14} />
                      {new Date(paper.createdAt).toLocaleDateString()}
                    </span>
                    <span className="paper-meta-item">
                      <FileText size={14} />
                      {paper.totalQuestions} Questions
                    </span>
                    <span className="paper-meta-item">
                      <span>{paper.totalMarks} Marks</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="paper-actions">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedPaper(paper)}>
                  <Eye size={14} />
                  Preview
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleExportPDF(paper._id, paper.name)}>
                  <Download size={14} />
                  Export PDF
                </button>
                <button
                  className="btn btn-ghost btn-sm text-error"
                  onClick={() => handleDeletePaper(paper._id)}>
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Papers;
