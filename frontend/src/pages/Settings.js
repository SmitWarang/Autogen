import React, { useState } from "react";
import { Settings as SettingsIcon, Save, RefreshCw } from "lucide-react";
import { useToast } from "../hooks/useToast";

const Settings = () => {
  const { showToast } = useToast();
  const [settings, setSettings] = useState({
    apiUrl: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
    defaultPapers: 3,
    maxFileSize: 5,
    autoValidation: true,
    showStatistics: true,
  });

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveSettings = () => {
    // In a real app, you would save these to localStorage or send to backend
    localStorage.setItem("appSettings", JSON.stringify(settings));
    showToast("Settings saved successfully!", "success");
  };

  const handleResetSettings = () => {
    if (
      window.confirm("Are you sure you want to reset all settings to default?")
    ) {
      setSettings({
        apiUrl: "http://localhost:5000/api",
        defaultPapers: 3,
        maxFileSize: 5,
        autoValidation: true,
        showStatistics: true,
      });
      showToast("Settings reset to defaults", "success");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-description">
            Configure application preferences and defaults
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 max-w-2xl">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <SettingsIcon size={20} />
              Application Settings
            </h2>
            <p className="card-description">
              Customize your application experience
            </p>
          </div>

          <div className="settings-form">
            <div className="form-group">
              <label className="form-label">API Base URL</label>
              <input
                type="text"
                className="form-input"
                value={settings.apiUrl}
                onChange={(e) => handleSettingChange("apiUrl", e.target.value)}
                placeholder="http://localhost:5000/api"
              />
              <p className="form-help">Backend API endpoint URL</p>
            </div>

            <div className="form-group">
              <label className="form-label">Default Number of Papers</label>
              <input
                type="number"
                className="form-input"
                value={settings.defaultPapers}
                onChange={(e) =>
                  handleSettingChange("defaultPapers", parseInt(e.target.value))
                }
                min="1"
                max="5"
              />
              <p className="form-help">Default number of papers to generate</p>
            </div>

            <div className="form-group">
              <label className="form-label">Maximum File Size (MB)</label>
              <input
                type="number"
                className="form-input"
                value={settings.maxFileSize}
                onChange={(e) =>
                  handleSettingChange("maxFileSize", parseInt(e.target.value))
                }
                min="1"
                max="50"
              />
              <p className="form-help">Maximum size for uploaded Excel files</p>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={settings.autoValidation}
                  onChange={(e) =>
                    handleSettingChange("autoValidation", e.target.checked)
                  }
                />
                <span className="checkbox-text">Auto-validate blueprints</span>
              </label>
              <p className="form-help">
                Automatically validate blueprints when creating
              </p>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={settings.showStatistics}
                  onChange={(e) =>
                    handleSettingChange("showStatistics", e.target.checked)
                  }
                />
                <span className="checkbox-text">Show upload statistics</span>
              </label>
              <p className="form-help">
                Display detailed statistics after file upload
              </p>
            </div>
          </div>

          <div className="card-footer">
            <div className="flex justify-between">
              <button
                className="btn btn-secondary"
                onClick={handleResetSettings}>
                <RefreshCw size={16} />
                Reset to Defaults
              </button>
              <button className="btn btn-primary" onClick={handleSaveSettings}>
                <Save size={16} />
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
