import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Header from "./components/common/Header";
import Sidebar from "./components/common/Sidebar";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Blueprint from "./pages/Blueprint";
import Papers from "./pages/Papers";
import Settings from "./pages/Settings";
import { ToastProvider } from "./hooks/useToast";
import "./styles/globals.css";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <Router>
        <div className="app">
          <Header
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            sidebarOpen={sidebarOpen}
          />
          <div className="app-container">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main
              className={`main-content ${sidebarOpen ? "sidebar-open" : ""}`}>
              <Routes>
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/blueprint" element={<Blueprint />} />
                <Route path="/papers" element={<Papers />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
