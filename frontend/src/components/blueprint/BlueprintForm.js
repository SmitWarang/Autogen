import React from "react";

const BlueprintForm = ({
  blueprintData,
  onBlueprintChange,
  availableSubjects,
  availableCOs,
  validationResult,
}) => {
  const handleCOMarksChange = (co, marks) => {
    const newMarksPerCO = {
      ...blueprintData.marksPerCO,
      [co]: parseInt(marks) || 0,
    };
    onBlueprintChange("marksPerCO", newMarksPerCO);
  };

  const handleRBTChange = (rbtLevel, percentage) => {
    const newRBTDistribution = {
      ...blueprintData.rbtDistribution,
      [rbtLevel]: parseInt(percentage) || 0,
    };
    onBlueprintChange("rbtDistribution", newRBTDistribution);
  };

  const rbtLevels = [
    {
      key: "R",
      label: "Remember",
      description: "Recall facts and basic concepts",
    },
    { key: "U", label: "Understand", description: "Explain ideas or concepts" },
    {
      key: "Ap",
      label: "Apply",
      description: "Use information in new situations",
    },
    {
      key: "An",
      label: "Analyze",
      description: "Draw connections among ideas",
    },
    { key: "E", label: "Evaluate", description: "Justify a stand or decision" },
    { key: "C", label: "Create", description: "Produce new or original work" },
  ];

  return (
    <div className="blueprint-form">
      {/* Basic Information */}
      <div className="form-section">
        <h3 className="form-section-title">Basic Information</h3>

        <div className="grid grid-cols-2">
          <div className="form-group">
            <label className="form-label">Blueprint Name *</label>
            <input
              type="text"
              className="form-input"
              value={blueprintData.name}
              onChange={(e) => onBlueprintChange("name", e.target.value)}
              placeholder="e.g., Mid-term Exam - DBMS"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Subject *</label>
            <select
              className="form-select"
              value={blueprintData.subject}
              onChange={(e) => onBlueprintChange("subject", e.target.value)}>
              <option value="">Select Subject</option>
              {availableSubjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3">
          <div className="form-group">
            <label className="form-label">Total Marks *</label>
            <input
              type="number"
              className="form-input"
              value={blueprintData.totalMarks}
              onChange={(e) =>
                onBlueprintChange("totalMarks", parseInt(e.target.value))
              }
              min="1"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Total Questions *</label>
            <input
              type="number"
              className="form-input"
              value={blueprintData.totalQuestions}
              onChange={(e) =>
                onBlueprintChange("totalQuestions", parseInt(e.target.value))
              }
              min="1"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Number of Papers</label>
            <input
              type="number"
              className="form-input"
              value={blueprintData.numberOfPapers}
              onChange={(e) =>
                onBlueprintChange("numberOfPapers", parseInt(e.target.value))
              }
              min="1"
              max="5"
            />
          </div>
        </div>
      </div>

      {/* Course Outcomes Distribution */}
      <div className="form-section">
        <h3 className="form-section-title">Course Outcomes Distribution</h3>

        {availableCOs.length > 0 ? (
          <div className="co-distribution">
            {availableCOs.map((co) => (
              <div key={co} className="co-item">
                <label className="form-label">{co}</label>
                <input
                  type="number"
                  className="form-input"
                  value={blueprintData.marksPerCO[co] || 0}
                  onChange={(e) => handleCOMarksChange(co, e.target.value)}
                  min="0"
                  placeholder="Marks"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">
            Select a subject to see available Course Outcomes
          </p>
        )}
      </div>

      {/* Question Type Distribution */}
      <div className="form-section">
        <h3 className="form-section-title">Question Type Distribution</h3>

        <div className="grid grid-cols-2">
          <div className="form-group">
            <label className="form-label">Theory Questions (%)</label>
            <input
              type="number"
              className="form-input"
              value={blueprintData.theoryPercent}
              onChange={(e) =>
                onBlueprintChange("theoryPercent", parseInt(e.target.value))
              }
              min="0"
              max="100"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Numerical Questions (%)</label>
            <input
              type="number"
              className="form-input"
              value={blueprintData.numericalPercent}
              onChange={(e) =>
                onBlueprintChange("numericalPercent", parseInt(e.target.value))
              }
              min="0"
              max="100"
            />
          </div>
        </div>
      </div>

      {/* RBT Distribution */}
      <div className="form-section">
        <h3 className="form-section-title">Bloom's Taxonomy Distribution</h3>

        <div className="rbt-distribution">
          {rbtLevels.map((rbt) => (
            <div key={rbt.key} className="rbt-item">
              <div className="rbt-info">
                <label className="form-label">
                  {rbt.label} ({rbt.key})
                </label>
                <p className="rbt-description">{rbt.description}</p>
              </div>
              <input
                type="number"
                className="form-input rbt-input"
                value={blueprintData.rbtDistribution[rbt.key]}
                onChange={(e) => handleRBTChange(rbt.key, e.target.value)}
                min="0"
                max="100"
                placeholder="%"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlueprintForm;
