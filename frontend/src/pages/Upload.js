import React, { useState } from "react";
import FileUpload from "../components/upload/FileUpload";
import UploadProgress from "../components/upload/UploadProgress";
import QuestionStats from "../components/upload/QuestionStats";
import { uploadQuestions } from "../services/api";
import { useToast } from "../hooks/useToast";
import { FileText, AlertCircle, CheckCircle } from "lucide-react";

const Upload = () => {
  const [uploadState, setUploadState] = useState({
    isUploading: false,
    progress: 0,
    uploadResult: null,
    errors: [],
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [subject, setSubject] = useState("");
  const { showToast } = useToast();

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setUploadState({
      isUploading: false,
      progress: 0,
      uploadResult: null,
      errors: [],
    });
  };

  const handleUpload = async () => {
    if (!selectedFile || !subject.trim()) {
      showToast("Please select a file and enter subject name", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("subject", subject.trim());

    setUploadState((prev) => ({
      ...prev,
      isUploading: true,
      progress: 0,
    }));

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadState((prev) => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90),
        }));
      }, 200);

      const response = await uploadQuestions(formData);

      clearInterval(progressInterval);

      setUploadState({
        isUploading: false,
        progress: 100,
        uploadResult: response.data,
        errors: [],
      });

      showToast(
        `Successfully uploaded ${response.data.count} questions`,
        "success"
      );
    } catch (error) {
      setUploadState({
        isUploading: false,
        progress: 0,
        uploadResult: null,
        errors: error.response?.data?.errors || [error.message],
      });

      showToast("Upload failed. Please check the errors below.", "error");
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setSubject("");
    setUploadState({
      isUploading: false,
      progress: 0,
      uploadResult: null,
      errors: [],
    });
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Upload Questions</h1>
          <p className="page-description">
            Import question bank from Excel files with CO, RBT, and PI mapping
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Main Upload Area */}
        <div className="col-span-2">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Question Bank Upload</h2>
              <p className="card-description">
                Upload Excel files with questions, COs, RBT levels, and marks
              </p>
            </div>

            {/* Subject Input */}
            <div className="form-group">
              <label className="form-label">Subject Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Database Management Systems"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={uploadState.isUploading}
              />
            </div>

            {/* File Upload */}
            <FileUpload
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              disabled={uploadState.isUploading}
            />

            {/* Upload Progress */}
            {uploadState.isUploading && (
              <UploadProgress progress={uploadState.progress} />
            )}

            {/* Upload Actions */}
            <div className="flex justify-between items-center pt-4">
              <button
                className="btn btn-secondary"
                onClick={resetUpload}
                disabled={uploadState.isUploading}>
                Reset
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={
                  !selectedFile || !subject.trim() || uploadState.isUploading
                }>
                {uploadState.isUploading ? "Uploading..." : "Upload Questions"}
              </button>
            </div>
          </div>

          {/* Upload Results */}
          {uploadState.uploadResult && (
            <div className="card mt-6 animate-fade-in">
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <CheckCircle size={20} className="text-success" />
                  <h3 className="card-title text-success">Upload Successful</h3>
                </div>
              </div>

              <QuestionStats stats={uploadState.uploadResult.summary} />
            </div>
          )}

          {/* Upload Errors */}
          {uploadState.errors.length > 0 && (
            <div className="card mt-6 animate-fade-in">
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <AlertCircle size={20} className="text-error" />
                  <h3 className="card-title text-error">Upload Errors</h3>
                </div>
                <p className="card-description">
                  Please fix these issues and try again
                </p>
              </div>

              <div className="error-list">
                {uploadState.errors.map((error, index) => (
                  <div key={index} className="error-item">
                    <AlertCircle size={16} className="text-error" />
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upload Guidelines */}
        <div>
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Excel Format Guidelines</h3>
            </div>

            <div className="upload-guidelines">
              <div className="guideline-section">
                <h4 className="guideline-title">Required Columns</h4>
                <ul className="guideline-list">
                  <li>Questions - Question text</li>
                  <li>CO - Course Outcome (CO1, CO2, etc.)</li>
                  <li>RBT - Bloom's Taxonomy (R, U, Ap, An, E, C)</li>
                  <li>PI - Performance Indicator (X.Y.Z format)</li>
                  <li>Marks - Question marks (number)</li>
                  <li>Type - Question type (T/N)</li>
                </ul>
              </div>

              <div className="guideline-section">
                <h4 className="guideline-title">RBT Levels</h4>
                <ul className="guideline-list">
                  <li>
                    <strong>R</strong> - Remember
                  </li>
                  <li>
                    <strong>U</strong> - Understand
                  </li>
                  <li>
                    <strong>Ap</strong> - Apply
                  </li>
                  <li>
                    <strong>An</strong> - Analyze
                  </li>
                  <li>
                    <strong>E</strong> - Evaluate
                  </li>
                  <li>
                    <strong>C</strong> - Create
                  </li>
                </ul>
              </div>

              <div className="guideline-section">
                <h4 className="guideline-title">Type Codes</h4>
                <ul className="guideline-list">
                  <li>
                    <strong>T</strong> - Theory Question
                  </li>
                  <li>
                    <strong>N</strong> - Numerical Problem
                  </li>
                </ul>
              </div>
            </div>

            <div className="card-footer">
              <button className="btn btn-ghost btn-sm">
                <FileText size={16} />
                Download Sample
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;
