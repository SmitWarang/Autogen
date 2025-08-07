import React from "react";
import { CheckCircle, AlertCircle, Target, BarChart3 } from "lucide-react";

const BlueprintPreview = ({ blueprintData, validationResult }) => {
  const getTotalCOMarks = () => {
    return Object.values(blueprintData.marksPerCO).reduce(
      (sum, marks) => sum + marks,
      0
    );
  };

  const getTotalRBTPercentage = () => {
    return Object.values(blueprintData.rbtDistribution).reduce(
      (sum, percent) => sum + percent,
      0
    );
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Blueprint Preview</h3>
        <p className="card-description">Review your blueprint configuration</p>
      </div>

      <div className="preview-content">
        {/* Basic Info */}
        <div className="preview-section">
          <h4 className="preview-section-title">Basic Information</h4>
          <div className="preview-grid">
            <div className="preview-item">
              <span className="preview-label">Name:</span>
              <span className="preview-value">
                {blueprintData.name || "Not set"}
              </span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Subject:</span>
              <span className="preview-value">
                {blueprintData.subject || "Not selected"}
              </span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Total Marks:</span>
              <span className="preview-value">{blueprintData.totalMarks}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Total Questions:</span>
              <span className="preview-value">
                {blueprintData.totalQuestions}
              </span>
            </div>
          </div>
        </div>

        {/* CO Distribution */}
        <div className="preview-section">
          <h4 className="preview-section-title">
            <Target size={16} />
            Course Outcomes ({getTotalCOMarks()}/{blueprintData.totalMarks}{" "}
            marks)
          </h4>
          <div className="co-preview">
            {Object.entries(blueprintData.marksPerCO).map(([co, marks]) => (
              <div key={co} className="co-preview-item">
                <span className="co-name">{co}</span>
                <span className="co-marks">{marks} marks</span>
              </div>
            ))}
          </div>
        </div>

        {/* Type Distribution */}
        <div className="preview-section">
          <h4 className="preview-section-title">Question Types</h4>
          <div className="type-preview">
            <div className="type-item">
              <span>Theory: {blueprintData.theoryPercent}%</span>
            </div>
            <div className="type-item">
              <span>Numerical: {blueprintData.numericalPercent}%</span>
            </div>
          </div>
        </div>

        {/* RBT Distribution */}
        <div className="preview-section">
          <h4 className="preview-section-title">
            <BarChart3 size={16} />
            Bloom's Taxonomy ({getTotalRBTPercentage()}%)
          </h4>
          <div className="rbt-preview">
            {Object.entries(blueprintData.rbtDistribution)
              .filter(([_, percent]) => percent > 0)
              .map(([rbt, percent]) => (
                <div key={rbt} className="rbt-preview-item">
                  <span className="rbt-name">{rbt}</span>
                  <span className="rbt-percent">{percent}%</span>
                </div>
              ))}
          </div>
        </div>

        {/* Validation Status */}
        {validationResult && (
          <div className="preview-section">
            <div
              className={`validation-status ${
                validationResult.isValid ? "valid" : "invalid"
              }`}>
              {validationResult.isValid ? (
                <>
                  <CheckCircle size={16} />
                  <span>Blueprint is valid and ready for generation</span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} />
                  <span>Blueprint has validation errors</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlueprintPreview;
