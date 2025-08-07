import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  FileText,
  Files,
  Settings,
  X,
} from "lucide-react";

const Sidebar = ({ open, onClose }) => {
  const location = useLocation();

  const menuItems = [
    {
      path: "/dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
      description: "Overview & Statistics",
    },
    {
      path: "/upload",
      icon: Upload,
      label: "Upload Questions",
      description: "Import Excel files",
    },
    {
      path: "/blueprint",
      icon: FileText,
      label: "Create Blueprint",
      description: "Set paper constraints",
    },
    {
      path: "/papers",
      icon: Files,
      label: "Generated Papers",
      description: "View & export papers",
    },
    {
      path: "/settings",
      icon: Settings,
      label: "Settings",
      description: "App configuration",
    },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile Overlay */}
      {open && <div className="sidebar-overlay" onClick={onClose} />}

      {/* Sidebar */}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Navigation</h2>
          <button
            className="sidebar-close"
            onClick={onClose}
            aria-label="Close sidebar">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${
                  isActive(item.path) ? "nav-item-active" : ""
                }`}
                onClick={() => window.innerWidth <= 768 && onClose()}>
                <div className="nav-item-icon">
                  <Icon size={20} />
                </div>
                <div className="nav-item-content">
                  <span className="nav-item-label">{item.label}</span>
                  <span className="nav-item-description">
                    {item.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
