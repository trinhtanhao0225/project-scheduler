import React, { useState, useMemo } from "react";

export default function AssignmentsPage({ 
  nurses = [], 
  patients = [] 
}) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedNurse, setSelectedNurse] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // ID Normalization
  const normalizeId = (id) => {
    if (!id) return null;
    return typeof id === "object" ? id.toString() : String(id);
  };

  // ====================== FILTER PATIENTS BY SELECTED DATE ======================
  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      if (!patient.earliest_start || !patient.latest_end) return false;

      const patientStartDate = new Date(patient.earliest_start).toISOString().slice(0, 10);
      const patientEndDate = new Date(patient.latest_end).toISOString().slice(0, 10);

      return patientStartDate <= selectedDate && patientEndDate >= selectedDate;
    });
  }, [patients, selectedDate]);

  // ====================== PROCESSED NURSES WORKLOAD ======================
  const processedData = useMemo(() => {
    const totalNurses = nurses.length;
    const totalPatientsToday = filteredPatients.length;

    const nursesWithWorkload = nurses.map((nurse) => {
      const nurseId = normalizeId(nurse.id || nurse._id);

      // Get patients assigned to this nurse on the selected date
      const assignedPatientsList = filteredPatients.filter(
        (p) => normalizeId(p.assigned_nurse_id) === nurseId
      );

      // Calculate total actual care time for the day
      const totalCareMinutes = assignedPatientsList.reduce(
        (sum, p) => sum + (p.care_minutes || 0),
        0
      );

      const maxMinutes = nurse.default_max_minutes_per_day || nurse.max_minutes || 480;

      const utilizationRate = maxMinutes > 0 
        ? Math.round((totalCareMinutes / maxMinutes) * 100) 
        : 0;

      return {
        ...nurse,
        nurseId,
        assignedPatientsList,
        totalCareMinutes,
        maxMinutes,
        utilizationRate,
        remainingMinutes: Math.max(0, maxMinutes - totalCareMinutes),
        isOverloaded: totalCareMinutes > maxMinutes,
        assignedCount: assignedPatientsList.length,
      };
    });

    const assignedPatientsCount = filteredPatients.filter((p) => normalizeId(p.assigned_nurse_id)).length;
    const unassignedPatientsCount = totalPatientsToday - assignedPatientsCount;
    const assignmentRate = totalPatientsToday 
      ? Math.round((assignedPatientsCount / totalPatientsToday) * 100) 
      : 0;

    return {
      nursesWithWorkload,
      stats: {
        totalNurses,
        totalPatientsToday,
        assignedPatientsCount,
        unassignedPatientsCount,
        assignmentRate,
      },
    };
  }, [nurses, filteredPatients]);

  const { nursesWithWorkload, stats } = processedData;

  // Detail data for modals
  const nursePatients = selectedNurse
    ? filteredPatients.filter(
        (p) => normalizeId(p.assigned_nurse_id) === normalizeId(selectedNurse.id || selectedNurse._id)
      )
    : [];

  const patientNurse = selectedPatient
    ? nurses.find(
        (n) => normalizeId(n.id || n._id) === normalizeId(selectedPatient.assigned_nurse_id)
      )
    : null;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* ==================== DATE PICKER ==================== */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow flex items-center gap-6">
        <label className="font-semibold text-lg">📅 View Assignments for Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-lg focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition"
        >
          Today
        </button>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total Nurses" value={stats.totalNurses} />
        <StatCard title={`Patients (${selectedDate})`} value={stats.totalPatientsToday} />
        <StatCard title="Assigned" value={stats.assignedPatientsCount} color="green" />
        <StatCard title="Unassigned" value={stats.unassignedPatientsCount} color="red" />
        <StatCard title="Assignment Rate" value={`${stats.assignmentRate}%`} color="blue" />
      </div>

      {/* Nurses Table - Workload by Date */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold">👩‍⚕️ Nurse Workload - {selectedDate}</h2>
          <p className="text-sm text-gray-500">
            Workload is calculated based on actual patient care time on the selected day
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Nurse Name</th>
                <th className="px-6 py-4 text-left font-semibold">Daily Limit</th>
                <th className="px-6 py-4 text-left font-semibold">Allocated Today</th>
                <th className="px-6 py-4 text-left font-semibold">Remaining</th>
                <th className="px-6 py-4 text-left font-semibold">Utilization</th>
                <th className="px-6 py-4 text-left font-semibold">Patients</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {nursesWithWorkload.map((nurse) => (
                <tr
                  key={nurse.nurseId}
                  onClick={() => setSelectedNurse(nurse)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition"
                >
                  <td className="px-6 py-5 font-medium">{nurse.full_name}</td>
                  <td className="px-6 py-5">{nurse.maxMinutes} min</td>
                  <td className="px-6 py-5 font-medium text-blue-600">
                    {nurse.totalCareMinutes} min
                  </td>
                  <td className={`px-6 py-5 ${nurse.isOverloaded ? "text-red-600 font-medium" : ""}`}>
                    {nurse.remainingMinutes} min
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 h-3 rounded-full overflow-hidden">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            nurse.utilizationRate >= 90
                              ? "bg-red-500"
                              : nurse.utilizationRate >= 75
                              ? "bg-orange-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(nurse.utilizationRate, 100)}%` }}
                        />
                      </div>
                      <span className="font-bold w-12 text-right">{nurse.utilizationRate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 font-semibold text-purple-600">
                    {nurse.assignedCount}
                  </td>
                </tr>
              ))}
              {nursesWithWorkload.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-gray-500">
                    No nurse data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patients Table - By Date */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold">🛏️ Patients - {selectedDate}</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Patient Name</th>
                <th className="px-6 py-4 text-left font-semibold">Care Time</th>
                <th className="px-6 py-4 text-left font-semibold">Priority</th>
                <th className="px-6 py-4 text-left font-semibold">Assignment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPatients.map((patient) => {
                const isAssigned = normalizeId(patient.assigned_nurse_id);
                return (
                  <tr
                    key={normalizeId(patient.id || patient._id)}
                    onClick={() => setSelectedPatient(patient)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <td className="px-6 py-5 font-medium">{patient.full_name}</td>
                    <td className="px-6 py-5">{patient.care_minutes} min</td>
                    <td className="px-6 py-5 capitalize">{patient.priority || "routine"}</td>
                    <td className="px-6 py-5">
                      {isAssigned ? (
                        <span className="inline-block px-4 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full text-sm font-medium">
                          Assigned
                        </span>
                      ) : (
                        <span className="inline-block px-4 py-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-full text-sm font-medium">
                          Unassigned
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
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

      {/* Modals */}
      {selectedNurse && (
        <Modal onClose={() => setSelectedNurse(null)}>
          <h3 className="text-2xl font-bold mb-6">{selectedNurse.full_name}</h3>
          <p className="text-gray-500 mb-6">Date: {selectedDate}</p>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-gray-500 text-sm uppercase font-semibold">Daily Limit</p>
              <p className="text-3xl font-bold">{selectedNurse.maxMinutes} min</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm uppercase font-semibold">Allocated Today</p>
              <p className="text-3xl font-bold text-blue-600">{selectedNurse.totalCareMinutes} min</p>
            </div>
          </div>

          <h4 className="font-semibold mb-4">
            Assigned Patients Today ({nursePatients.length})
          </h4>

          {nursePatients.length === 0 ? (
            <p className="text-gray-500 italic">No patients assigned to this nurse on this day.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {nursePatients.map((p) => (
                <div
                  key={normalizeId(p.id || p._id)}
                  className="bg-gray-50 dark:bg-gray-700 p-5 rounded-2xl border border-gray-100 dark:border-gray-600"
                >
                  <div className="font-medium text-lg">{p.full_name}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    {p.care_minutes} minutes • Priority: <span className="capitalize">{p.priority}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {selectedPatient && (
        <Modal onClose={() => setSelectedPatient(null)}>
          <h3 className="text-2xl font-bold mb-4">{selectedPatient.full_name}</h3>
          <p className="text-gray-500 mb-6">Date: {selectedDate}</p>

          <div className="space-y-3 mb-8">
            <p className="text-lg">
              Care Time: <span className="font-semibold">{selectedPatient.care_minutes} minutes</span>
            </p>
            <p className="text-lg">
              Priority: <span className="capitalize font-medium">{selectedPatient.priority}</span>
            </p>
          </div>

          <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
            {patientNurse ? (
              <div className="bg-green-50 dark:bg-green-900/30 p-6 rounded-2xl border border-green-100 dark:border-green-800">
                <p className="text-green-700 dark:text-green-300 font-medium">Assigned Nurse:</p>
                <p className="text-3xl font-bold mt-2 text-green-900 dark:text-green-100">
                  {patientNurse.full_name}
                </p>
              </div>
            ) : (
              <div className="bg-red-50 dark:bg-red-900/30 p-6 rounded-2xl border border-red-100 dark:border-red-800 text-red-700 dark:text-red-300">
                This patient has not been assigned to any nurse on {selectedDate}.
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ====================== SUB COMPONENTS ====================== */

function StatCard({ title, value, color = "" }) {
  const colorClass =
    color === "green" ? "text-green-600" :
    color === "red" ? "text-red-600" :
    color === "blue" ? "text-blue-600" : "text-gray-900 dark:text-white";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 text-center border border-gray-50 dark:border-gray-700">
      <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
        {title}
      </p>
      <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-8 relative">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-4xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 leading-none"
          >
            &times;
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}