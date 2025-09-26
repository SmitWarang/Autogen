// src/pages/Settings.js
import React from "react";

export default function Settings() {
  return (
    <div>
      <h2>Settings</h2>
      <p>Configure frontend behavior and API URL (via environment variables).</p>
      <p>
        Use <code>REACT_APP_API_URL</code> to override the default <code>http://localhost:5000/api</code>.
      </p>
    </div>
  );
}
