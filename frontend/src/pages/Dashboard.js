import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Upload,
  Files,
  TrendingUp,
  BookOpen,
  Target,
  Clock,
  CheckCircle,
} from "lucide-react";
import { getQuestionStats, getRecentPapers } from "../services/api";
import LoadingSpinner from "../components/common/LoadingSpinner";

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentPapers, setRecentPapers] = useState([]);
  const [loading, setLoading] = useState(true);

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

      setStats(statsResponse.data);
      setRecentPapers(papersResponse.data || []);
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
            <div className="stat-value">{stats?.totalSubjects || 0}</div>
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
            <div className="stat-value">{stats?.averageMarks || 0}</div>
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
              <div className="space-y-3">
                {recentPapers.slice(0, 5).map((paper, index) => (
                  <div key={index} className="recent-paper-item">
                    <div className="recent-paper-icon">
                      <CheckCircle size={16} />
                    </div>
                    <div className="recent-paper-content">
                      <div className="recent-paper-name">{paper.name}</div>
                      <div className="recent-paper-meta">
                        <Clock size={12} />
                        {new Date(paper.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
