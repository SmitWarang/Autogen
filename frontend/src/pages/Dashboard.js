import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Upload,
  Files,
  TrendingUp,
  BookOpen,
  Target,
} from "lucide-react";
import {
  getQuestionStats,
  getRecentPapers,
  downloadPaperPDF,
  getSubjects,
} from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";
// import { saveAs } from "file-saver";
// near the top of src/pages/Dashboard.js
import "../styles/theme.css";
import "../styles/dashboard.css";

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentPapers, setRecentPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, papersResponse] = await Promise.all([
        getQuestionStats(),
        getRecentPapers(),
      ]);

      setStats(statsResponse);
      setRecentPapers(papersResponse || []);
      getSubjects().then((res) => {
        const s = res.subjects || [];
        setSubjects(s);
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: "Upload Questions",
      description: "Import new question bank from Excel",
      icon: Upload,
      link: "/upload",
      color: "primary",
    },
    {
      title: "Create Blueprint",
      description: "Set up paper generation constraints",
      icon: FileText,
      link: "/blueprint",
      color: "secondary",
    },
    {
      title: "View Papers",
      description: "Browse generated question papers",
      icon: Files,
      link: "/papers",
      color: "success",
    },
  ];

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

  if (loading) {
    return (
      <div className="page-container">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-description">
            Welcome to the Autonomous Question Paper Generator
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 mb-8">
        <div className="stat-card">
          <div className="stat-icon stat-icon-primary">
            <BookOpen size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats?.totalQuestions || 0}</div>
            <div className="stat-label">Total Questions</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-success">
            <Target size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{subjects.length || 0}</div>
            <div className="stat-label">Subjects</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-warning">
            <Files size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{recentPapers.length}</div>
            <div className="stat-label">Generated Papers</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-secondary">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats?.avgMarks || 0}</div>
            <div className="stat-label">Avg. Marks</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3">
        {/* Quick Actions */}
        <div className="col-span-2">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Quick Actions</h2>
              <p className="card-description">Get started with common tasks</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={index}
                    to={action.link}
                    className="quick-action-card">
                    <div
                      className={`quick-action-icon quick-action-icon-${action.color}`}>
                      <Icon size={20} />
                    </div>
                    <div className="quick-action-content">
                      <h3 className="quick-action-title">{action.title}</h3>
                      <p className="quick-action-description">
                        {action.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Recent Papers</h2>
              <p className="card-description">Recently generated papers</p>
            </div>

            {recentPapers.length > 0 ? (
              <ul>
                {recentPapers.map((p) => (
                  <li key={p._id} style={{ marginBottom: 6 }}>
                    <b>{p.title}</b> — {p.subject} — Marks: {p.totalMarks}{" "}
                    <button
                      onClick={() => handleDownload(p._id)}
                      style={{ marginLeft: 8 }}>
                      ⬇ Download Pdf
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <Files size={48} className="empty-state-icon" />
                <p className="empty-state-text">No papers generated yet</p>
                <Link to="/blueprint" className="btn btn-primary btn-sm">
                  Create First Paper
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
