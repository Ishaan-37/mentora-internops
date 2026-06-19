// src/pages/intern/InternDashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as internApi from '../../api/intern.api';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../hooks/useAuth';

export default function InternDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    internApi
      .getDashboard()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400">Loading dashboard...</p>;
  if (error) return <p className="text-danger-600">{error}</p>;
  if (!data) return null;

  const { internship, counts, todaysTasks, nextDeadline, nextPresentation } = data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-semibold text-2xl text-gray-900">
          Hello, {user?.name?.split(' ')[0]} 👋
        </h2>
        <p className="text-gray-500 mt-1">
          {internship.days_left} days left in your internship · Mentored by {internship.mentor_name}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="ti ti-calendar-time" label="Days left" value={internship.days_left} accent="accent" />
        <StatCard icon="ti ti-list-check" label="Today's tasks" value={counts.today_count} accent="accent" />
        <StatCard icon="ti ti-clock" label="Pending" value={counts.pending_count} accent="warning" />
        <StatCard icon="ti ti-circle-check" label="Completed" value={counts.completed_count} accent="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-gray-900">Today's tasks</h3>
            <Link to="/intern/work-items" className="text-sm text-accent-600 hover:text-accent-700 font-medium">
              View all
            </Link>
          </div>
          {todaysTasks.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">Nothing due today. Enjoy the breathing room.</p>
          ) : (
            <div className="space-y-3">
              {todaysTasks.map((task) => (
                <Link
                  key={task.id}
                  to={`/intern/work-items/${task.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-accent-200 hover:bg-accent-50/30 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-800">{task.title}</p>
                  <StatusBadge status={task.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card">
            <h3 className="font-display font-semibold text-gray-900 mb-3">Next deadline</h3>
            {nextDeadline ? (
              <div>
                <p className="text-sm font-medium text-gray-800">{nextDeadline.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(nextDeadline.deadline).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No upcoming deadlines.</p>
            )}
          </div>

          <div className="card">
            <h3 className="font-display font-semibold text-gray-900 mb-3">Next presentation</h3>
            {nextPresentation ? (
              <div>
                <p className="text-sm font-medium text-gray-800">{nextPresentation.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(nextPresentation.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {nextPresentation.time}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">None scheduled yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
