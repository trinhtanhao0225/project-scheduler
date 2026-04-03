import React, { useState, useEffect } from "react";

export default function EntityManager({ refresh }) {
  const [nurses, setNurses] = useState([]);
  const [patients, setPatients] = useState([]);
  const [dailyShifts, setDailyShifts] = useState([]);
  const [dailySummary, setDailySummary] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("nurses");

  // ====================== FORM STATES ======================
  const [nurseForm, setNurseForm] = useState({
    full_name: "",
    skills: [],
    shift_start: new Date().toISOString().slice(0, 16),
    shift_end: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16),
    default_max_minutes_per_day: 480,
    is_active: true,
  });

  const [patientForm, setPatientForm] = useState({
    full_name: "",
    care_minutes: 30,
    priority: "routine",
    required_skills: [],
    earliest_start: new Date().toISOString().slice(0, 16),
    latest_end: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 16),
    location: "hospital",
    notes: "",
  });

  const skillsPool = [
    "ICU", "Injection", "ElderCare", "Rehab", "MedicationManagement",
    "WoundCare", "VitalSignsMonitoring", "PostSurgeryCare", "PalliativeCare",
    "DiabetesCare", "RespiratoryCare", "PhysicalTherapyAssist"
  ];

  // ====================== FETCH HELPER ======================
  const apiFetch = async (endpoint, options = {}) => {
    try {
      const res = await fetch(`/api${endpoint}`, options);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(`API Error ${res.status} ${endpoint}:`, text);
        throw new Error(`HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      console.error(`Fetch failed ${endpoint}:`, err);
      throw err;
    }
  };

  // ====================== FETCH FUNCTIONS ======================
  const fetchNurses = async () => {
    try {
      const data = await apiFetch("/nurses");
      console.log("✅ Nurses loaded:", data.length);
      setNurses(data);
    } catch (err) {
      setError("Unable to load nurse list: " + err.message);
    }
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch("/patients");
      const patientList = Array.isArray(data) ? data : (data?.data || []);
      console.log("✅ Patients loaded:", patientList.length);
      setPatients(patientList);
    } catch (err) {
      setError("Unable to load patient list: " + err.message);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyShifts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch("/daily-shifts");
      setDailyShifts(data);
      console.log("✅ Daily shifts loaded:", data.length);
    } catch (err) {
      setError("Unable to load Daily Shifts: " + err.message);
      setDailyShifts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDailySummary = async () => {
    try {
      const data = await apiFetch("/daily-shifts/summary");
      setDailySummary(data);
    } catch (err) {
      console.error("Failed to fetch daily summary");
      setDailySummary(null);
    }
  };

  // ====================== USE EFFECTS ======================
  useEffect(() => {
    fetchNurses();
    fetchPatients();
  }, [refresh]);

  useEffect(() => {
    if (activeTab === "patients") fetchPatients();
    if (activeTab === "daily-shift") {
      fetchDailyShifts();
      fetchDailySummary();
    }
  }, [activeTab]);

  // ====================== NURSE HANDLERS ======================
  const handleNurseChange = (e) => {
    const { name, value } = e.target;
    setNurseForm(prev => ({
      ...prev,
      [name]: name === "default_max_minutes_per_day" ? Number(value) : value
    }));
  };

  const toggleNurseSkill = (skill) => {
    setNurseForm(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const addNurse = async () => {
    if (!nurseForm.full_name.trim()) {
      alert("Please enter nurse name!");
      return;
    }

    try {
      const payload = {
        ...nurseForm,
        shift_start: new Date(nurseForm.shift_start).toISOString(),
        shift_end: new Date(nurseForm.shift_end).toISOString(),
      };

      await apiFetch("/nurses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      alert("✅ Nurse added successfully!");
      resetNurseForm();
      fetchNurses();
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  };

  const resetNurseForm = () => {
    setNurseForm({
      full_name: "",
      skills: [],
      shift_start: new Date().toISOString().slice(0, 16),
      shift_end: new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 16),
      default_max_minutes_per_day: 480,
      is_active: true,
    });
  };

  const generateNurses = async (count) => {
    try {
      setLoading(true);
      await apiFetch(`/nurses/generate?n=${count}`, { method: "POST" });
      alert(`✅ Generated ${count} mock nurses!`);
      fetchNurses();
    } catch (err) {
      alert("Nurse generation error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ====================== PATIENT HANDLERS ======================
  const handlePatientChange = (e) => {
    const { name, value } = e.target;
    setPatientForm(prev => ({ ...prev, [name]: value }));
  };

  const togglePatientSkill = (skill) => {
    setPatientForm(prev => ({
      ...prev,
      required_skills: prev.required_skills.includes(skill)
        ? prev.required_skills.filter(s => s !== skill)
        : [...prev.required_skills, skill]
    }));
  };

  const addPatient = async () => {
    if (!patientForm.full_name.trim()) {
      alert("Please enter patient name!");
      return;
    }

    try {
      const payload = {
        ...patientForm,
        earliest_start: new Date(patientForm.earliest_start).toISOString(),
        latest_end: new Date(patientForm.latest_end).toISOString(),
      };

      await apiFetch("/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      alert("✅ Patient added successfully!");
      resetPatientForm();
      fetchPatients();
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  };

  const resetPatientForm = () => {
    setPatientForm({
      full_name: "",
      care_minutes: 30,
      priority: "routine",
      required_skills: [],
      earliest_start: new Date().toISOString().slice(0, 16),
      latest_end: new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 16),
      location: "hospital",
      notes: "",
    });
  };

  const generatePatients = async (count) => {
    try {
      setLoading(true);
      await apiFetch(`/patients/generate?n=${count}`, { method: "POST" });
      alert(`✅ Generated ${count} mock patients!`);
      fetchPatients();
    } catch (err) {
      alert("Patient generation error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ====================== INITIALIZE DAILY SHIFTS ======================
  const initializeDailyShifts = async () => {
    if (nurses.length === 0) {
      alert("Please create at least one nurse first!");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await apiFetch("/daily-shifts/reset", { method: "POST" });

      const nurseIds = nurses.map(n => n.id || n._id);

      await apiFetch("/daily-shifts/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nurse_ids: nurseIds,
          start_date: new Date().toISOString().split("T")[0],
          days: 1
        })
      });

      alert("✅ Daily Shifts initialized for all nurses today!");
      fetchDailyShifts();
      fetchDailySummary();
    } catch (err) {
      console.error(err);
      setError("Initialization error: " + err.message);
      alert("❌ " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ====================== RENDER UI ======================
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          🏥 Hospital Scheduling System
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Manage Nurses • Patients • Daily Workload Tracking
        </p>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab("nurses")}
            className={`px-8 py-4 font-semibold text-lg whitespace-nowrap transition-all ${activeTab === "nurses" ? "border-b-4 border-green-600 text-green-600" : "text-gray-600 hover:text-gray-900"}`}
          >
            👩‍⚕️ Nurse Management
          </button>
          <button
            onClick={() => setActiveTab("patients")}
            className={`px-8 py-4 font-semibold text-lg whitespace-nowrap transition-all ${activeTab === "patients" ? "border-b-4 border-purple-600 text-purple-600" : "text-gray-600 hover:text-gray-900"}`}
          >
            🛏️ Patient Management
          </button>
          <button
            onClick={() => setActiveTab("daily-shift")}
            className={`px-8 py-4 font-semibold text-lg whitespace-nowrap transition-all ${activeTab === "daily-shift" ? "border-b-4 border-blue-600 text-blue-600" : "text-gray-600 hover:text-gray-900"}`}
          >
            📊 Daily Shift (Workload)
          </button>
        </div>

        {/* ==================== NURSES TAB ==================== */}
        {activeTab === "nurses" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Add Nurse Form */}
              <div>
                <h2 className="text-2xl font-bold mb-6">Add New Nurse</h2>
                <div className="space-y-6">
                  <input
                    type="text"
                    name="full_name"
                    value={nurseForm.full_name}
                    onChange={handleNurseChange}
                    placeholder="Nurse full name"
                    className="w-full px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500"
                  />

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm mb-1">Max minutes/day</label>
                      <input
                        type="number"
                        name="default_max_minutes_per_day"
                        value={nurseForm.default_max_minutes_per_day}
                        onChange={handleNurseChange}
                        className="w-full px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Shift Schedule</label>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="datetime-local"
                        name="shift_start"
                        value={nurseForm.shift_start}
                        onChange={handleNurseChange}
                        className="w-full px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-xl"
                      />
                      <input
                        type="datetime-local"
                        name="shift_end"
                        value={nurseForm.shift_end}
                        onChange={handleNurseChange}
                        className="w-full px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-3">Specialized Skills</label>
                    <div className="flex flex-wrap gap-3">
                      {skillsPool.map(skill => (
                        <button
                          key={skill}
                          onClick={() => toggleNurseSkill(skill)}
                          className={`px-5 py-2 rounded-full text-sm transition-all ${nurseForm.skills.includes(skill) ? "bg-green-600 text-white shadow-md" : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200"}`}
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={addNurse}
                  className="mt-8 w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-semibold text-lg transition"
                >
                  ➕ Add Nurse
                </button>
              </div>

              {/* Nurse List */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Generate Mock Data</h3>
                <div className="flex gap-4 mb-8">
                  <button onClick={() => generateNurses(10)} className="flex-1 bg-gray-700 hover:bg-gray-800 text-white py-3 rounded-xl">Create 10 Nurses</button>
                  <button onClick={() => generateNurses(30)} className="flex-1 bg-gray-700 hover:bg-gray-800 text-white py-3 rounded-xl">Create 30 Nurses</button>
                </div>

                <h3 className="font-semibold text-lg mb-4">Nurse List ({nurses.length})</h3>
                <div className="max-h-[520px] overflow-y-auto border rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                      <tr>
                        <th className="px-6 py-4 text-left">Name</th>
                        <th className="px-6 py-4 text-left">Shift</th>
                        <th className="px-6 py-4 text-left">Limit/Day</th>
                        <th className="px-6 py-4 text-left">Skills</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {nurses.map((nurse) => (
                        <tr key={nurse.id || nurse._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 font-medium">{nurse.full_name}</td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                            {new Date(nurse.shift_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                            {new Date(nurse.shift_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-6 py-4">{nurse.default_max_minutes_per_day} min</td>
                          <td className="px-6 py-4 text-xs text-gray-500">{nurse.skills?.join(", ") || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== PATIENTS TAB ==================== */}
        {activeTab === "patients" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Add Patient Form */}
              <div>
                <h2 className="text-2xl font-bold mb-6">Add New Patient</h2>
                <div className="space-y-6">
                  <input
                    type="text"
                    name="full_name"
                    value={patientForm.full_name}
                    onChange={handlePatientChange}
                    placeholder="Patient full name"
                    className="w-full px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-xl"
                  />

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm mb-1">Care Time (minutes)</label>
                      <input
                        type="number"
                        name="care_minutes"
                        value={patientForm.care_minutes}
                        onChange={handlePatientChange}
                        className="w-full px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Priority</label>
                      <select
                        name="priority"
                        value={patientForm.priority}
                        onChange={handlePatientChange}
                        className="w-full px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-xl"
                      >
                        <option value="routine">Routine</option>
                        <option value="urgent">Urgent</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-3">Required Skills</label>
                    <div className="flex flex-wrap gap-3">
                      {skillsPool.map(skill => (
                        <button
                          key={skill}
                          onClick={() => togglePatientSkill(skill)}
                          className={`px-5 py-2 rounded-full text-sm transition-all ${patientForm.required_skills.includes(skill) ? "bg-purple-600 text-white" : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200"}`}
                        >
                          {skill}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="datetime-local"
                      name="earliest_start"
                      value={patientForm.earliest_start}
                      onChange={handlePatientChange}
                      className="w-full px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-xl"
                    />
                    <input
                      type="datetime-local"
                      name="latest_end"
                      value={patientForm.latest_end}
                      onChange={handlePatientChange}
                      className="w-full px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-xl"
                    />
                  </div>
                </div>

                <button
                  onClick={addPatient}
                  className="mt-8 w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-xl font-semibold text-lg transition"
                >
                  ➕ Add Patient
                </button>
              </div>

              {/* Patient List */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Generate Mock Data</h3>
                <div className="flex gap-4 mb-8">
                  <button onClick={() => generatePatients(10)} className="flex-1 bg-gray-700 hover:bg-gray-800 text-white py-3 rounded-xl">Create 10 Patients</button>
                  <button onClick={() => generatePatients(30)} className="flex-1 bg-gray-700 hover:bg-gray-800 text-white py-3 rounded-xl">Create 30 Patients</button>
                </div>

                <h3 className="font-semibold text-lg mb-4">Patient List ({patients.length})</h3>
                <div className="max-h-[520px] overflow-y-auto border rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                      <tr>
                        <th className="px-6 py-4 text-left">Name</th>
                        <th className="px-6 py-4 text-left">Care Min</th>
                        <th className="px-6 py-4 text-left">Priority</th>
                        <th className="px-6 py-4 text-left">Skills Needed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {patients.map((patient) => (
                        <tr key={patient.id || patient._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 font-medium">{patient.full_name}</td>
                          <td className="px-6 py-4">{patient.care_minutes} min</td>
                          <td className="px-6 py-4 capitalize">{patient.priority}</td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {patient.required_skills?.join(", ") || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== DAILY SHIFT TAB ==================== */}
        {activeTab === "daily-shift" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">📊 Daily Shift - Workload Tracking</h2>
              <div className="flex gap-3">
                <button
                  onClick={initializeDailyShifts}
                  disabled={loading || nurses.length === 0}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:bg-gray-400"
                >
                  🔄 Initialize Daily Shifts
                </button>
                <button
                  onClick={() => { fetchDailyShifts(); fetchDailySummary(); }}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-gray-400"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            {dailySummary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-xl">
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="text-2xl font-semibold">{dailySummary.shift_date}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-xl">
                  <p className="text-sm text-gray-500">Total Nurses</p>
                  <p className="text-3xl font-bold text-blue-600">{dailySummary.total_nurses}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-xl">
                  <p className="text-sm text-gray-500">Overload</p>
                  <p className="text-3xl font-bold text-red-600">{dailySummary.overloaded_nurses}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-xl">
                  <p className="text-sm text-gray-500">Avg. Utilization</p>
                  <p className="text-3xl font-bold text-amber-600">{dailySummary.average_utilization}</p>
                </div>
              </div>
            )}

            {/* Daily Shift Table */}
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="px-6 py-4 text-left">Nurse</th>
                    <th className="px-6 py-4 text-left">Limit</th>
                    <th className="px-6 py-4 text-left">Used</th>
                    <th className="px-6 py-4 text-left">Remaining</th>
                    <th className="px-6 py-4 text-left">Rate</th>
                    <th className="px-6 py-4 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr><td colSpan="6" className="py-12 text-center">Loading...</td></tr>
                  ) : dailyShifts.length > 0 ? (
                    dailyShifts.map((shift) => (
                      <tr key={shift.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 font-medium">
                          {shift.nurse_name || 
                           nurses.find(n => (n.id || n._id) === shift.nurse_id)?.full_name || 
                           "Unknown"}
                        </td>
                        <td className="px-6 py-4">{shift.max_minutes} min</td>
                        <td className="px-6 py-4 font-medium text-blue-600">{shift.used_minutes}</td>
                        <td className="px-6 py-4">{shift.remaining_minutes || 0} min</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                              <div
                                className={`h-2.5 rounded-full ${shift.is_overloaded ? 'bg-red-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(shift.utilization_rate || 0, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">{shift.utilization_rate}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-4 py-1 text-xs rounded-full ${shift.is_overloaded ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {shift.is_overloaded ? "OVERLOAD" : "Normal"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-gray-500">
                        No Daily Shift data yet.<br />
                        Please click "<strong>Initialize Daily Shifts</strong>" above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}