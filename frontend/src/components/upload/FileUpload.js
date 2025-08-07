import React, { useRef, useState } from "react";
import { Upload, FileText, X, AlertCircle } from "lucide-react";

const FileUpload = ({ onFileSelect, selectedFile, disabled }) => {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  const validateFile = (file) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      return "Please select a valid Excel file (.xlsx or .xls)";
    }

    if (file.size > maxSize) {
      return "File size must be less than 5MB";
    }

    return null;
  };

  const handleFileSelect = (file) => {
    setError("");

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    onFileSelect(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeFile = () => {
    onFileSelect(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="file-upload-container">
      {!selectedFile ? (
        <div
          className={`file-upload-zone ${dragOver ? "drag-over" : ""} ${
            disabled ? "disabled" : ""
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && fileInputRef.current?.click()}>
          <div className="file-upload-content">
            <Upload size={48} className="file-upload-icon" />
            <h3 className="file-upload-title">
              {dragOver
                ? "Drop your file here"
                : "Choose Excel file or drag & drop"}
            </h3>
            <p className="file-upload-description">
              Supports .xlsx and .xls files up to 5MB
            </p>
            <button
              type="button"
              className="btn btn-primary"
              disabled={disabled}>
              Browse Files
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="file-input-hidden"
            accept=".xlsx,.xls"
            onChange={handleFileInput}
            disabled={disabled}
          />
        </div>
      ) : (
        <div className="file-selected">
          <div className="file-info">
            <div className="file-icon">
              <FileText size={20} />
            </div>
            <div className="file-details">
              <div className="file-name">{selectedFile.name}</div>
              <div className="file-meta">
                {formatFileSize(selectedFile.size)} •{" "}
                {selectedFile.type.includes("sheet") ? "Excel" : "Excel"}
              </div>
            </div>
          </div>

          {!disabled && (
            <button
              type="button"
              className="file-remove"
              onClick={removeFile}
              aria-label="Remove file">
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="file-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
