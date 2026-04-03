import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import DashboardPage from "./components/DashboardPage";
import EntityManager from "./components/EntityManager";
import AssignmentsPage from "./components/AssignmentsPage";

export default function App() {
  // ── Dark mode ─────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(
    () => JSON.parse(localStorage.getItem("darkMode") || "true")
  );

  // ── Entities ──────────────────────────────────────────────
  const [patients, setPatients] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // ── Toggle dark mode ──────────────────────────────────────
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // ── Load patients and nurses ──────────────────────────────
  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    try {
      const patientRes = await fetch("/api/patients");
      const nurseRes = await fetch("/api/nurses");
      if (patientRes.ok) setPatients(await patientRes.json());
      if (nurseRes.ok) setNurses(await nurseRes.json());
    } catch (err) {
      console.error("Error loading entities:", err);
    }
  };

  // ── Fetch AI schedule ─────────────────────────────────────
  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-schedule", { method: "POST" });
      const data = await res.json();
      setResult(data);
      loadEntities(); // refresh entities after schedule
    } catch (err) {
      console.error("Error fetching schedule:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────
  return (
    <Router>
      <div className="min-h-screen p-6 max-w-7xl mx-auto bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
        {/* Navigation */}
        <nav className="flex gap-4 mb-6 text-lg font-medium">
          <Link to="/">Dashboard</Link>
          <Link to="/entities">Manage Entities</Link>
          <Link to="/assignments">Current Schedule</Link>
        </nav>

        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                darkMode={darkMode}
                toggleDarkMode={() => setDarkMode(!darkMode)}
                fetchSchedule={fetchSchedule}
                loading={loading}
                nurses={nurses}
                result={result}
                refreshData={loadEntities}
              />
            }
          />
          <Route
            path="/entities"
            element={<EntityManager refresh={loadEntities} />}
          />
          <Route
            path="/assignments"
            element={<AssignmentsPage nurses={nurses} patients={patients} />}
          />
        </Routes>
      </div>
    </Router>
  );
}