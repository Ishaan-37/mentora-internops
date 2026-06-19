// src/pages/mentor/MentorDashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as mentorApi from '../../api/mentor.api';
import StatCard from '../../components/StatCard';
import ProgressBar from '../../components/ProgressBar';
import Table from '../../components/Table';
import { useAuth } from '../../hooks/useAuth';

export default function MentorDashboard() {
  const { user } = useAuth();
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    mentorApi
      .getMyInterns()
      .then((res) => setInterns(res.data.interns))
      .finally(() => setLoading(false));
  }, []);

  const totalOverdue = interns.reduce((sum, i) => sum + parseInt(i.overdue_count || 0), 0);
  const avgProgress = interns.length
    ? Math.round(interns.reduce((sum, i) => sum + parseInt(i.progress || 0), 0) / interns.length)
    : 0;

  const columns = [
    { key: 'name', header: 'Name', render: (row) => <span className="font-medium text-gray-900">{row.name}</span> },
    {
      key: 'days_left',
      header: 'Days left',
      render: (row) => row.days_left,
    },
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
    {
      key: 'overdue_count',
      header: 'Overdue',
      render: (row) => (
        <span className={row.overdue_count > 0 ? 'text-danger-600 font-medium' : 'text-gray-400'}>
          {row.overdue_count}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Link to={`/mentor/interns/${row.id}`} className="text-accent-600 hover:text-accent-700 text-sm font-medium">
          View →
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-2xl text-gray-900">Hello, {user?.name} 👋</h2>
        <p className="text-gray-500 mt-1">{interns.length} interns under your mentorship</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon="ti ti-users" label="Interns under you" value={interns.length} accent="accent" />
        <StatCard icon="ti ti-chart-bar" label="Avg. completion rate" value={`${avgProgress}%`} accent="success" />
        <StatCard icon="ti ti-alert-triangle" label="Overdue tasks" value={totalOverdue} accent="danger" />
      </div>

      <div className="card !p-0">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-display font-semibold text-gray-900">Your interns</h3>
        </div>
        {loading ? (
          <p className="text-gray-400 p-6">Loading...</p>
        ) : (
          <Table columns={columns} rows={interns} emptyMessage="No interns assigned to you yet." />
        )}
      </div>
    </div>
  );
}
