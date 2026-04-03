import React from "react";

const Badge = ({ children }) => (
  <span className="inline-block px-3 py-1 rounded-full bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200 text-sm">
    {children}
  </span>
);

export default function ScheduleResult({ result }) {
  if (!result) return <p>Chưa có dữ liệu lịch trình</p>;

  return (
    <div className="space-y-6">
      {/* Workload Summary */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <h3 className="font-semibold mb-2">📊 Workload Summary</h3>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-200 dark:bg-gray-800">
              <th className="px-3 py-1 border">Nurse ID</th>
              <th className="px-3 py-1 border">Total Minutes</th>
              <th className="px-3 py-1 border">Util %</th>
            </tr>
          </thead>
          <tbody>
            {result.workload_summary.map((n) => (
              <tr key={n.nurse_id} className="hover:bg-gray-100 dark:hover:bg-gray-900">
                <td className="px-3 py-1 border">{n.nurse_id}</td>
                <td className="px-3 py-1 border">{n.total_minutes}</td>
                <td className="px-3 py-1 border">{n.util_percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Optimization Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        <Badge>Assigned patients: {result.assigned_patients}/{result.total_assignments}</Badge>
        <Badge>Unassigned patients: {result.unassigned_patients}</Badge>
        <Badge>Best score: {result.best_score}</Badge>
      </div>
    </div>
  );
}