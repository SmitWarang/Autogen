// frontend/src/pages/Upload.js
import React, { useState } from "react";
import { uploadQuestions } from "../services/api";
// near the top of src/pages/Upload.js
import "../styles/theme.css";
import "../styles/upload.css";

const Upload = () => {
  const [file, setFile] = useState(null);
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select an Excel file");
    if (!subject.trim()) return alert("Please enter subject");

    try {
      setLoading(true);
      setStatus("Uploading...");
      setSummary(null);

      const res = await uploadQuestions(file, subject);
      setStatus(`${res.message} (count: ${res.count})`);
      setSummary(res.summary || null);
    } catch (err) {
      console.error(err);
      alert("Error: " + (err.message || "Server error"));
      setStatus("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h2>Upload Questions (Excel)</h2>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          type="text"
          placeholder="Subject (required)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Uploading..." : "Upload & Parse"}
        </button>
      </form>

      {status && <p style={{ marginTop: 16 }}>{status}</p>}

      {summary && (
        <pre
          style={{
            marginTop: 16,
            background: "#f6f8fa",
            padding: 12,
            borderRadius: 6,
            overflowX: "auto",
          }}
        >
{JSON.stringify(summary, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default Upload;
