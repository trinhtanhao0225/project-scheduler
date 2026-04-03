import React, { useState, useEffect } from "react";
import { RefreshCw, Users, Hospital, Calculator, Sun, Moon, TrendingUp, AlertTriangle } from "lucide-react";

export default function NurseScheduleDashboard() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [estimate, setEstimate] = useState({ nurses: 0, patients: 0 });
  const [nurseGenerateCount, setNurseGenerateCount] = useState(30);
  const [patientGenerateCount, setPatientGenerateCount] = useState(100);
  const [darkMode, setDarkMode] = useState(
    () => JSON.parse(localStorage.getItem("darkMode") || "true")
  );

  // Load patients khi mount
  useEffect(() => {
    loadEntities();
  }, []);

  // Dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  const loadEntities = async () => {
    try {
      const res = await fetch("/api/patients");
      if (res.ok) {
        setPatients(await res.json());
      }
    } catch (err) {
      console.error("Load patients error:", err);
    }
  };

  const generateNurses = async (count = 30) => {
    setRefreshing(true);
    try {
      await fetch(`/api/nurses/generate?n=${count}`, { method: "POST" });
    } catch (err) {
      console.error(err);
    }
    setRefreshing(false);
  };

  const generatePatients = async (count = 100) => {
    setRefreshing(true);
    try {
      await fetch(`/api/patients/generate?n=${count}`, { method: "POST" });
      await loadEntities();
    } catch (err) {
      console.error(err);
    }
    setRefreshing(false);
  };

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai-schedule", { method: "POST" });
      const data = await res.json();
      console.log("AI Schedule Result:", data);
      setResult(data);
    } catch (err) {
      console.error("Fetch schedule error:", err);
      alert("Lỗi khi chạy thuật toán. Vui lòng thử lại.");
    }
    setLoading(false);
  };

  const calculateEstimate = () => {
    const totalPatients = patients.length;
    setEstimate({
      patients: totalPatients,
      nurses: Math.ceil(totalPatients / 5),
    });
  };

  // Component Badge
  const Badge = ({ children, className = "" }) => (
    <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium ${className}`}>
      {children}
    </span>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              🏥 Nurse Scheduler Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2 text-lg">
              Quản lý y tá, bệnh nhân & tối ưu phân công lịch trình
            </p>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-3 rounded-2xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-4">
          <button
            onClick={fetchSchedule}
            disabled={loading || refreshing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-3.5 rounded-2xl flex items-center gap-3 font-semibold text-lg transition shadow-lg"
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin w-6 h-6" />
                Đang chạy thuật toán...
              </>
            ) : (
              <>
                🚀 Chạy Thuật Toán Tối Ưu
              </>
            )}
          </button>

          <button
            onClick={calculateEstimate}
            className="bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800 text-amber-800 dark:text-amber-200 px-6 py-3.5 rounded-2xl flex items-center gap-2 font-medium transition"
          >
            <Calculator className="w-5 h-5" />
            Tính nhu cầu y tá
          </button>

          {estimate.patients > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 px-5 py-3 text-base">
              Cần ≈ <b className="font-bold">{estimate.nurses}</b> y tá cho <b>{estimate.patients}</b> bệnh nhân
            </Badge>
          )}
        </div>

        {/* Generate Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Generate Nurses */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-green-600" />
              <h3 className="text-xl font-semibold">Sinh Y tá Giả</h3>
            </div>
            <div className="flex gap-3">
              <input
                type="number"
                min="1"
                max="200"
                value={nurseGenerateCount}
                onChange={(e) => setNurseGenerateCount(Number(e.target.value))}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-2xl px-5 py-4 text-lg focus:ring-2 focus:ring-green-500 outline-none"
              />
              <button
                onClick={() => generateNurses(nurseGenerateCount)}
                disabled={refreshing}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-8 py-4 rounded-2xl font-semibold transition"
              >
                Sinh
              </button>
            </div>
          </div>

          {/* Generate Patients */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow">
            <div className="flex items-center gap-3 mb-4">
              <Hospital className="w-6 h-6 text-violet-600" />
              <h3 className="text-xl font-semibold">Sinh Bệnh Nhân Giả</h3>
            </div>
            <div className="flex gap-3">
              <input
                type="number"
                min="1"
                max="1000"
                value={patientGenerateCount}
                onChange={(e) => setPatientGenerateCount(Number(e.target.value))}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-2xl px-5 py-4 text-lg focus:ring-2 focus:ring-violet-500 outline-none"
              />
              <button
                onClick={() => generatePatients(patientGenerateCount)}
                disabled={refreshing}
                className="bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white px-8 py-4 rounded-2xl font-semibold transition"
              >
                Sinh
              </button>
            </div>
          </div>
        </div>

        {/* RESULT SECTION */}
        {result && (
          <div className="space-y-8">

            {/* Workload Summary - ĐÃ CẢI TIẾN VỚI % */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <TrendingUp className="w-7 h-7 text-blue-600" />
                Workload Summary
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="py-4 text-left font-semibold">Nurse ID</th>
                      <th className="py-4 text-left font-semibold">Total Minutes</th>
                      <th className="py-4 text-left font-semibold">Utilization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {result.workload_summary?.map((item, index) => {
                      const percent = item.util_percent || 0;
                      return (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="py-5 font-medium">{item.nurse_id}</td>
                          <td className="py-5">{item.total_minutes} phút</td>
                          <td className="py-5">
                            <div className="flex items-center gap-4">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-3 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    percent >= 90 ? "bg-red-500" :
                                    percent >= 75 ? "bg-orange-500" : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${Math.min(percent, 100)}%` }}
                                />
                              </div>
                              <span className="font-bold text-lg w-16 text-right">
                                {percent}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Optimization Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8">
              <h3 className="text-2xl font-bold mb-6">⚙️ Optimization Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 py-3">
                  Assigned: {result.assigned_patients || 0} / {result.total_assignments || 0}
                </Badge>
                <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 py-3">
                  Unassigned: {result.unassigned_patients || 0}
                </Badge>
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 py-3">
                  Best Score: {result.best_score || 0}
                </Badge>
              </div>
            </div>

            {/* Missing Skills & Peak Hours & Sample Assignments giữ nguyên hoặc bạn có thể thêm sau */}

          </div>
        )}
      </div>
    </div>
  );
}