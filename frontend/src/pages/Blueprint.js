import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BlueprintForm from "../components/blueprint/BlueprintForm";
import BlueprintPreview from "../components/blueprint/BlueprintPreview";
import {
  createBlueprint,
  validateBlueprint,
  getSubjects,
  getCourseOutcomes,
} from "../services/api";
import { useToast } from "../hooks/useToast";
import { FileText, Eye, Save } from "lucide-react";

const Blueprint = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [blueprintData, setBlueprintData] = useState({
    name: "",
    totalMarks: 60,
    totalQuestions: 12,
    marksPerCO: {},
    theoryPercent: 70,
    numericalPercent: 30,
    rbtDistribution: {
      R: 20,
      U: 30,
      Ap: 25,
      An: 15,
      E: 10,
      C: 0,
    },
    subject: "",
    numberOfPapers: 3,
  });

  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableCOs, setAvailableCOs] = useState([]);
  const [validationResult, setValidationResult] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (blueprintData.subject) {
      fetchCourseOutcomes(blueprintData.subject);
    }
  }, [blueprintData.subject]);

  const fetchSubjects = async () => {
    try {
      const response = await getSubjects();
      console.log(response);
      setAvailableSubjects(response.data.subjects || []);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const fetchCourseOutcomes = async (subject) => {
    try {
      const response = await getCourseOutcomes(subject);
      setAvailableCOs(response.data || []);
    } catch (error) {
      console.error("Error fetching COs:", error);
    }
  };

  const handleBlueprintChange = (field, value) => {
    setBlueprintData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear validation when data changes
    setValidationResult(null);
  };

  const handleValidation = async () => {
    try {
      setLoading(true);
      const response = await validateBlueprint(blueprintData);
      setValidationResult(response.data);

      if (response.data.isValid) {
        showToast("Blueprint validation successful!", "success");
        setShowPreview(true);
      } else {
        showToast(
          "Blueprint validation failed. Please check the errors.",
          "error"
        );
      }
    } catch (error) {
      showToast("Validation failed: " + error.message, "error");
      setValidationResult({
        isValid: false,
        errors: [error.message],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBlueprint = async () => {
    try {
      setLoading(true);
      const response = await createBlueprint(blueprintData);
      showToast("Blueprint saved successfully!", "success");

      // Redirect to paper generation
      navigate("/papers", {
        state: {
          blueprintId: response.data._id,
          showGeneration: true,
        },
      });
    } catch (error) {
      showToast("Failed to save blueprint: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      blueprintData.name.trim() &&
      blueprintData.subject &&
      blueprintData.totalMarks > 0 &&
      blueprintData.totalQuestions > 0 &&
      Object.keys(blueprintData.marksPerCO).length > 0 &&
      blueprintData.theoryPercent + blueprintData.numericalPercent === 100
    );
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Create Blueprint</h1>
          <p className="page-description">
            Define constraints and parameters for question paper generation
          </p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setShowPreview(!showPreview)}
            disabled={!isFormValid()}>
            <Eye size={16} />
            {showPreview ? "Hide Preview" : "Preview"}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleValidation}
            disabled={!isFormValid() || loading}>
            <FileText size={16} />
            Validate Blueprint
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Blueprint Form */}
        <div className="col-span-2">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Blueprint Configuration</h2>
              <p className="card-description">
                Set up the parameters for your question paper
              </p>
            </div>

            <BlueprintForm
              blueprintData={blueprintData}
              onBlueprintChange={handleBlueprintChange}
              availableSubjects={availableSubjects}
              availableCOs={availableCOs}
              validationResult={validationResult}
            />
          </div>

          {/* Validation Results */}
          {validationResult && (
            <div
              className={`card mt-6 animate-fade-in ${
                validationResult.isValid ? "border-success" : "border-error"
              }`}>
              <div className="card-header">
                <h3
                  className={`card-title ${
                    validationResult.isValid ? "text-success" : "text-error"
                  }`}>
                  Validation {validationResult.isValid ? "Passed" : "Failed"}
                </h3>
              </div>

              {!validationResult.isValid && validationResult.errors && (
                <div className="validation-errors">
                  {validationResult.errors.map((error, index) => (
                    <div key={index} className="validation-error">
                      {error}
                    </div>
                  ))}
                </div>
              )}

              {validationResult.isValid && (
                <div className="validation-success">
                  <p>Your blueprint is valid and ready for paper generation!</p>
                  <button
                    className="btn btn-primary mt-4"
                    onClick={handleSaveBlueprint}
                    disabled={loading}>
                    <Save size={16} />
                    Save & Generate Papers
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Blueprint Preview */}
        <div>
          {showPreview && (
            <BlueprintPreview
              blueprintData={blueprintData}
              validationResult={validationResult}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Blueprint;
