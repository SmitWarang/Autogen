import React from "react";

const UploadProgress = ({ progress }) => {
  return (
    <div className="progress-container">
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="progress-text">Uploading... {progress}%</div>
    </div>
  );
};

export default UploadProgress;
