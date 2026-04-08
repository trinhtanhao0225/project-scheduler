import React, { useState, useEffect } from "react";

export default function EntityManager({ refresh }) {
  const [nurses, setNurses] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("nurses");

  // ====================== DATE FILTER ======================
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

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
      setPatients(patientList);
    } catch (err) {
      setError("Unable to load patient list: " + err.message);
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  // ====================== FILTERED DATA ======================
  const filteredNurses = nurses.filter((nurse) => {
    if (!nurse.shift_start || !nurse.shift_end) return false;
    const startDate = new Date(nurse.shift_start).toISOString().slice(0, 10);
    const endDate = new Date(nurse.shift_end).toISOString().slice(0, 10);
    return startDate <= selectedDate && endDate >= selectedDate;
  });

  const filteredPatients = patients.filter((patient) => {
    if (!patient.earliest_start || !patient.latest_end) return false;
    const startDate = new Date(patient.earliest_start).toISOString().slice(0, 10);
    const endDate = new Date(patient.latest_end).toISOString().slice(0, 10);
    return startDate <= selectedDate && endDate >= selectedDate;
  });

  // ====================== USE EFFECTS ======================
  useEffect(() => {
    fetchNurses();
    fetchPatients();
  }, [refresh]);

  useEffect(() => {
    if (activeTab === "patients") fetchPatients();
  }, [activeTab]);

  // ====================== NURSE HANDLERS ======================
  const handleNurseChange = (e) => {
    const { name, value } = e.target;
    setNurseForm((prev) => ({
      ...prev,
      [name]: name === "default_max_minutes_per_day" ? Number(value) : value,
    }));
  };

  const toggleNurseSkill = (skill) => {
    setNurseForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
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
    setPatientForm((prev) => ({ ...prev, [name]: value }));
  };

  const togglePatientSkill = (skill) => {
    setPatientForm((prev) => ({
      ...prev,
      required_skills: prev.required_skills.includes(skill)
        ? prev.required_skills.filter((s) => s !== skill)
        : [...prev.required_skills, skill],
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

  // ====================== RENDER UI ======================
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          🏥 Hospital Scheduling System
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Manage Nurses • Patients
        </p>

        {/* ==================== DATE PICKER ==================== */}
        <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow flex items-center gap-6">
          <label className="font-semibold text-lg text-gray-700 dark:text-gray-300">
            📅 Select Date:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900"
          />
          <button
            onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition"
          >
            Today
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab("nurses")}
            className={`px-8 py-4 font-semibold text-lg whitespace-nowrap transition-all ${
              activeTab === "nurses"
                ? "border-b-4 border-green-600 text-green-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            👩‍⚕️ Nurse Management
          </button>
          <button
            onClick={() => setActiveTab("patients")}
            className={`px-8 py-4 font-semibold text-lg whitespace-nowrap transition-all ${
              activeTab === "patients"
                ? "border-b-4 border-purple-600 text-purple-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            🛏️ Patient Management
          </button>
        </div>

        {/* ==================== NURSES TAB ==================== */}
        {activeTab === "nurses" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">👩‍⚕️ Nurse Management</h2>
              <p className="text-gray-500 mt-1">
                Nurses on duty on <span className="font-semibold text-green-600">{selectedDate}</span> 
                — <span className="font-medium">{filteredNurses.length}</span> nurses
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Add Nurse Form */}
              <div>
                <h3 className="text-xl font-semibold mb-6">Add New Nurse</h3>
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
                    <label className="block text-sm font-medium mb-2">Shift Schedule</label>
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
                      {skillsPool.map((skill) => (
                        <button
                          key={skill}
                          onClick={() => toggleNurseSkill(skill)}
                          className={`px-5 py-2 rounded-full text-sm transition-all ${
                            nurseForm.skills.includes(skill)
                              ? "bg-green-600 text-white shadow-md"
                              : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200"
                          }`}
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
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg">
                    Nurse List ({filteredNurses.length})
                  </h3>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => generateNurses(10)} 
                      className="px-5 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-xl text-sm"
                    >
                      +10 Nurses
                    </button>
                    <button 
                      onClick={() => generateNurses(30)} 
                      className="px-5 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-xl text-sm"
                    >
                      +30 Nurses
                    </button>
                  </div>
                </div>

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
                      {filteredNurses.map((nurse) => (
                        <tr key={nurse.id || nurse._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 font-medium">{nurse.full_name}</td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                            {new Date(nurse.shift_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - 
                            {new Date(nurse.shift_end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-6 py-4">{nurse.default_max_minutes_per_day} min</td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {nurse.skills?.join(", ") || "-"}
                          </td>
                        </tr>
                      ))}
                      {filteredNurses.length === 0 && (
                        <tr>
                          <td colSpan="4" className="py-12 text-center text-gray-500">
                            No nurses on duty on {selectedDate}
                          </td>
                        </tr>
                      )}
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
            <div className="mb-6">
              <h2 className="text-2xl font-bold">🛏️ Patient Management</h2>
              <p className="text-gray-500 mt-1">
                Patients requiring care on <span className="font-semibold text-purple-600">{selectedDate}</span> 
                — <span className="font-medium">{filteredPatients.length}</span> patients
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Add Patient Form */}
              <div>
                <h3 className="text-xl font-semibold mb-6">Add New Patient</h3>
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
                      {skillsPool.map((skill) => (
                        <button
                          key={skill}
                          onClick={() => togglePatientSkill(skill)}
                          className={`px-5 py-2 rounded-full text-sm transition-all ${
                            patientForm.required_skills.includes(skill)
                              ? "bg-purple-600 text-white"
                              : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200"
                          }`}
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
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-lg">
                    Patient List ({filteredPatients.length})
                  </h3>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => generatePatients(10)} 
                      className="px-5 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-xl text-sm"
                    >
                      +10 Patients
                    </button>
                    <button 
                      onClick={() => generatePatients(30)} 
                      className="px-5 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-xl text-sm"
                    >
                      +30 Patients
                    </button>
                  </div>
                </div>

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
                      {filteredPatients.map((patient) => (
                        <tr key={patient.id || patient._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 font-medium">{patient.full_name}</td>
                          <td className="px-6 py-4">{patient.care_minutes} min</td>
                          <td className="px-6 py-4 capitalize">{patient.priority}</td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {patient.required_skills?.join(", ") || "-"}
                          </td>
                        </tr>
                      ))}
                      {filteredPatients.length === 0 && (
                        <tr>
                          <td colSpan="4" className="py-12 text-center text-gray-500">
                            No patients require care on {selectedDate}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}