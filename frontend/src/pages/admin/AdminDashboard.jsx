// src/pages/admin/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import * as adminApi from '../../api/admin.api';
import StatCard from '../../components/StatCard';
import ProgressBar from '../../components/ProgressBar';
import Table from '../../components/Table';
import { useAuth } from '../../hooks/useAuth';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getDashboard()
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400">Loading dashboard...</p>;
  if (!data) return null;

  const { stats, interns } = data;

  const columns = [
    { key: 'name', header: 'Name', render: (row) => <span className="font-medium text-gray-900">{row.name}</span> },
    { key: 'mentor_name', header: 'Mentor' },
    { key: 'days_left', header: 'Days left' },
    {
      key: 'progress',
      header: 'Progress',
      render: (row) => (
        <div className="flex items-center gap-2 w-32">
          <ProgressBar value={row.progress} size="sm" />
          <span className="text-xs text-gray-500 w-8">{row.progress}%</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-2xl text-gray-900">Hello, {user?.name}</h2>
        <p className="text-gray-500 mt-1">Institution-wide overview · {stats.batchNames || 'No active batches'}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="ti ti-users" label="Total interns" value={stats.totalInterns} accent="accent" />
        <StatCard icon="ti ti-user-star" label="Total mentors" value={stats.totalMentors} accent="accent" />
        <StatCard icon="ti ti-calendar" label="Active batches" value={stats.activeBatches} accent="success" />
        <StatCard icon="ti ti-alert-triangle" label="Total overdue" value={stats.totalOverdue} accent="danger" />
      </div>

      <div className="card">
        <h3 className="font-display font-semibold text-gray-900 mb-1">Overall completion rate</h3>
        <div className="flex items-center gap-3 mt-3">
          <ProgressBar value={stats.completionRate} />
          <span className="text-sm font-medium text-gray-700 w-12">{stats.completionRate}%</span>
        </div>
      </div>

      <div className="card !p-0">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-display font-semibold text-gray-900">All interns</h3>
        </div>
        <Table columns={columns} rows={interns} emptyMessage="No interns yet." />
      </div>
    </div>
  );
}
