import { Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Blueprint from "./pages/Blueprint";
import Papers from "./pages/Papers";
import Upload from "./pages/Upload";
import Settings from "./pages/Settings";

function App() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md p-6">
        <h1 className="text-2xl font-bold text-blue-600">AutoGen</h1>
        <nav className="mt-8 space-y-4">
          <Link to="/dashboard" className="block hover:text-blue-600">
            Dashboard
          </Link>
          <Link to="/blueprint" className="block hover:text-blue-600">
            Blueprints
          </Link>
          <Link to="/papers" className="block hover:text-blue-600">
            Papers
          </Link>
          <Link to="/upload" className="block hover:text-blue-600">
            Upload
          </Link>
          {/* <Link to="/settings" className="block hover:text-blue-600">Settings</Link> */}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50 p-6 overflow-auto">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/blueprint" element={<Blueprint />} />
          <Route path="/papers" element={<Papers />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
