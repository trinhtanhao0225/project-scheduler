import React, { useState, useEffect } from "react";
import { Bar, Doughnut, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function DashboardPage({
  darkMode,
  toggleDarkMode,
  fetchSchedule,
  loading,
  nurses = [],
  patients: propPatients = [],   // from parent (can be empty)
  result = null,
  refreshData,                   // global refresh function from parent (if available)
}) {
  // Local state to ensure patients data exists if possible
  const [localPatients, setLocalPatients] = useState(propPatients);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState(null);

  // Fetch patients if props are empty
  const fetchPatients = async () => {
    setPatientsLoading(true);
    setPatientsError(null);
    try {
      console.log("[Dashboard] Starting fetch /api/patients...");
      const res = await fetch("/api/patients");
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status} - ${res.statusText}`);
      }
      const data = await res.json();
      console.log("[Dashboard] Successfully fetched patients:", data.length, "records");
      setLocalPatients(data || []);
    } catch (err) {
      console.error("[Dashboard] Error fetching patients:", err);
      setPatientsError(err.message || "Unable to load patient list");
    } finally {
      setPatientsLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if no data and not already loading
    if (propPatients.length === 0 && localPatients.length === 0 && !patientsLoading) {
      fetchPatients();
    }
  }, []);

  const patients = localPatients; // use local state

  // ── Data Calculations ────────────────────────────────────────────────
  const assignedCount = result?.assignments?.length || 0;
  const unmatched = result?.unmatched_patients || [];

  const patientPriority = {
    emergency: patients.filter(p => p?.priority === "emergency").length,
    urgent: patients.filter(p => p?.priority === "urgent").length,
    routine: patients.filter(p => p?.priority === "routine").length,
  };

  const skillDemandFromPatients = {};
  patients.forEach(p => {
    p?.required_skills?.forEach(skill => {
      skillDemandFromPatients[skill] = (skillDemandFromPatients[skill] || 0) + 1;
    });
  });

  const topSkillsData = Object.entries(skillDemandFromPatients)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const skillDemand = {};
  [...patients, ...unmatched].forEach(p => {
    p?.required_skills?.forEach(skill => {
      skillDemand[skill] = (skillDemand[skill] || 0) + 1;
    });
  });

  const skillGapData = Object.entries(skillDemand)
    .map(([skill, demand]) => ({
      skill,
      demand,
      supply: nurses.filter(n => n?.skills?.includes(skill)).length,
    }))
    .filter(item => item.demand > item.supply)
    .sort((a, b) => b.demand - a.supply);

  const hourlyLoad = Array(24).fill(0);
  result?.assignments?.forEach(ass => {
    if (ass?.visit_time) {
      const hour = new Date(ass.visit_time).getHours();
      hourlyLoad[hour] += 1;
    }
  });

  // ── Chart Data ───────────────────────────────────────────────────────
  const loadChartData = {
    labels: nurses.map(n => n?.full_name || "N/A"),
    datasets: [{
      label: "Minutes Used",
      data: nurses.map(n => n?.current_minutes || 0),
      backgroundColor: nurses.map(n => {
        const pct = n?.max_minutes > 0 ? (n.current_minutes / n.max_minutes) * 100 : 0;
        return pct > 90 ? "rgba(239, 68, 68, 0.75)" : pct > 70 ? "rgba(249, 115, 22, 0.75)" : "rgba(59, 130, 246, 0.75)";
      }),
      borderWidth: 1,
    }],
  };

  const skillGapChartData = {
    labels: skillGapData.map(s => s.skill),
    datasets: [
      { label: "Demand", data: skillGapData.map(s => s.demand), backgroundColor: "rgba(239, 68, 68, 0.6)" },
      { label: "Available", data: skillGapData.map(s => s.supply), backgroundColor: "rgba(34, 197, 94, 0.6)" },
    ],
  };

  const hourlyLoadChartData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
    datasets: [{
      label: "Cases / Load",
      data: hourlyLoad,
      backgroundColor: "rgba(139, 92, 246, 0.6)",
    }],
  };

  const patientPriorityChartData = {
    labels: ["Emergency", "High Priority", "Routine"],
    datasets: [{
      data: [patientPriority.emergency, patientPriority.urgent, patientPriority.routine],
      backgroundColor: ["#ef4444", "#f59e0b", "#6b7280"],
    }],
  };

  const topSkillsChartData = {
    labels: topSkillsData.map(([skill]) => skill),
    datasets: [{
      label: "Patients Requiring Skill",
      data: topSkillsData.map(([, count]) => count),
      backgroundColor: [
        "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
        "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
      ],
    }],
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" } },
    scales: { y: { beginAtZero: true } },
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"} p-6 space-y-8 transition-colors duration-300`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <span>🏥</span> AI Nurse Scheduler Dashboard
        </h1>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => {
              if (refreshData) refreshData();
              else fetchPatients(); // fallback
            }}
            disabled={patientsLoading}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm disabled:opacity-50"
          >
            {patientsLoading ? "Refreshing..." : "↻ Refresh Data"}
          </button>
          <button
            onClick={toggleDarkMode}
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            {darkMode ? "🌞 Light" : "🌙 Dark"}
          </button>
        </div>
      </div>

      {/* Scheduler Run Button */}
      <button
        onClick={fetchSchedule}
        disabled={loading}
        className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-lg text-white transition-all shadow-lg ${loading ? "bg-gray-500 cursor-not-allowed" : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"}`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Running AI...
          </span>
        ) : (
          "🚀 Run AI Scheduler"
        )}
      </button>

      {/* Debug Panel */}
      <div className="bg-amber-50 dark:bg-amber-950/40 p-5 rounded-xl border border-amber-200 dark:border-amber-800 text-sm">
        <p className="font-semibold mb-2">Data Status Debug:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>Nurses: <strong>{nurses.length}</strong></div>
          <div>Patients (local): <strong>{patients.length}</strong></div>
          <div>Result: <strong>{result ? "Yes" : "No"}</strong></div>
          <div>Assigned / Unmatched: <strong>{assignedCount} / {unmatched.length}</strong></div>
        </div>
      </div>

      {/* Patients Loading / Error */}
      {patientsLoading && (
        <div className="text-center py-8 text-blue-600 dark:text-blue-400 font-medium">
          Loading patient list...
        </div>
      )}
      {patientsError && (
        <div className="bg-red-100 dark:bg-red-900/40 p-5 rounded-xl text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700">
          <p className="font-bold">Patient Load Error:</p>
          <p>{patientsError}</p>
          <p className="text-sm mt-2">Check console or try refreshing.</p>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">
        {/* Patient Overview */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold mb-5 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>🩺</span> Patient Overview ({patients.length})
            </span>
            {patients.length === 0 && !patientsLoading && !patientsError && (
              <button
                onClick={() => {
                  window.location.href = "/entity-manager";
                }}
                className="text-sm px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
              >
                Add Patients →
              </button>
            )}
          </h2>

          {patients.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <p className="text-4xl font-extrabold text-red-600 dark:text-red-400">{patientPriority.emergency}</p>
                  <p className="text-xs mt-1">Emergency</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                  <p className="text-4xl font-extrabold text-yellow-600 dark:text-yellow-400">{patientPriority.urgent}</p>
                  <p className="text-xs mt-1">High Priority</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                  <p className="text-4xl font-extrabold text-gray-600 dark:text-gray-400">{patientPriority.routine}</p>
                  <p className="text-xs mt-1">Routine</p>
                </div>
              </div>

              <div className="h-64">
                <Doughnut
                  data={patientPriorityChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "bottom" } },
                  }}
                />
              </div>
            </>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 italic gap-3">
              <p className="text-lg">No patients in the system</p>
              <p className="text-sm">Add manually or generate test data in Management</p>
            </div>
          )}
        </div>

        {/* Top Required Skills */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4">Most Required Skills</h3>
          <div className="h-64">
            {topSkillsData.length > 0 ? (
              <Pie
                data={topSkillsChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: "right" } },
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 italic text-center px-4">
                No patients or no special skill requirements
              </div>
            )}
          </div>
        </div>

        {/* Nurse Workload */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4">Nurse Workload</h3>
          <div className="h-72 md:h-80">
            {nurses.length > 0 ? (
              <Bar data={loadChartData} options={commonOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 italic">
                No nurse data
              </div>
            )}
          </div>
        </div>

        {/* Skill Gap */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4">Skill Gap (Demand vs Supply)</h3>
          <div className="h-72 md:h-80">
            {skillGapData.length > 0 ? (
              <Bar data={skillGapChartData} options={{ ...commonOptions, indexAxis: "y" }} />
            ) : (
              <div className="h-full flex items-center justify-center text-green-600 dark:text-green-400 font-medium text-center px-4">
                No skills are currently lacking
              </div>
            )}
          </div>
        </div>

        {/* Hourly Load */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4">Hourly Load (Peak Hours)</h3>
          <div className="h-72 md:h-80">
            <Bar data={hourlyLoadChartData} options={commonOptions} />
          </div>
        </div>

        {/* Unmatched Patients */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-lg mb-4">Unassigned Patients by Priority</h3>
          <div className="h-72 md:h-80">
            {unmatched.length > 0 ? (
              <Doughnut data={patientPriorityChartData} options={commonOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-green-600 dark:text-green-400 font-medium text-center px-4">
                {patients.length > 0
                  ? "All patients have been successfully assigned!"
                  : "No patients to assign yet"}
              </div>
            )}
          </div>
        </div>

        {/* Raw AI Scheduler Result */}
        {result && (
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-lg mb-4">Detailed AI Scheduler Result</h3>
            <pre className="text-sm bg-gray-50 dark:bg-gray-950 p-5 rounded-lg overflow-auto max-h-80 border border-gray-200 dark:border-gray-700 whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}