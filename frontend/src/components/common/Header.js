import React from "react";
import { Menu, FileText, Settings } from "lucide-react";

const Header = ({ onMenuClick, sidebarOpen }) => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <button
            className="menu-button"
            onClick={onMenuClick}
            aria-label="Toggle sidebar">
            <Menu size={20} />
          </button>
          <div className="header-brand">
            <FileText size={24} className="brand-icon" />
            <h1 className="brand-title">Autonomous Generator</h1>
          </div>
        </div>

        <div className="header-right">
          <button className="header-action-btn" aria-label="Settings">
            <Settings size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
