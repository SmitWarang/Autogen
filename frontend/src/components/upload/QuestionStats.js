import React from "react";
import { BarChart3, PieChart, Target, Hash } from "lucide-react";

const QuestionStats = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="question-stats">
      <div className="stats-grid">
        <div className="stat-item">
          <Hash size={16} className="stat-item-icon" />
          <div>
            <div className="stat-item-value">{stats.totalQuestions}</div>
            <div className="stat-item-label">Total Questions</div>
          </div>
        </div>

        <div className="stat-item">
          <Target size={16} className="stat-item-icon" />
          <div>
            <div className="stat-item-value">{stats.totalMarks}</div>
            <div className="stat-item-label">Total Marks</div>
          </div>
        </div>
      </div>

      {/* CO Distribution */}
      {stats.byCO && Object.keys(stats.byCO).length > 0 && (
        <div className="stats-section">
          <h4 className="stats-section-title">
            <Target size={16} />
            Course Outcomes
          </h4>
          <div className="stats-breakdown">
            {Object.entries(stats.byCO).map(([co, count]) => (
              <div key={co} className="breakdown-item">
                <span className="breakdown-label">{co}</span>
                <span className="breakdown-value">{count} questions</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RBT Distribution */}
      {stats.byRBT && Object.keys(stats.byRBT).length > 0 && (
        <div className="stats-section">
          <h4 className="stats-section-title">
            <BarChart3 size={16} />
            RBT Levels
          </h4>
          <div className="stats-breakdown">
            {Object.entries(stats.byRBT).map(([rbt, count]) => (
              <div key={rbt} className="breakdown-item">
                <span className="breakdown-label">{rbt}</span>
                <span className="breakdown-value">{count} questions</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Type Distribution */}
      {stats.byType && Object.keys(stats.byType).length > 0 && (
        <div className="stats-section">
          <h4 className="stats-section-title">
            <PieChart size={16} />
            Question Types
          </h4>
          <div className="stats-breakdown">
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="breakdown-item">
                <span className="breakdown-label">
                  {type === "T" ? "Theory" : "Numerical"}
                </span>
                <span className="breakdown-value">{count} questions</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionStats;
