// src/pages/intern/InternDashboard.jsx
// Visually enhanced intern dashboard with:
//  - Progress donut chart (Recharts)
//  - Submission streak counter
//  - 7-day activity sparkline
//  - Internship progress bar
//  - Today's tasks + next deadline + next presentation

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import * as internApi from '../../api/intern.api';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../hooks/useAuth';

// -------------------------------------------------------------------
// Colour tokens matching tailwind.config.js accent palette
// -------------------------------------------------------------------
const COLORS = {
  completed: '#22c55e',
  pending:   '#f59e0b',
  overdue:   '#ef4444',
  accent:    '#0d3fc7',
  accentBg:  '#eef4ff',
};

// -------------------------------------------------------------------
// Custom donut centre label
// -------------------------------------------------------------------
const DonutLabel = ({ cx, cy, pct }) => (
  <>
    <text x={cx} y={cy - 8} textAnchor="middle" fill="#0f172a"
      style={{ fontSize: 28, fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      {pct}%
    </text>
    <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b"
      style={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
      complete
    </text>
  </>
);

// -------------------------------------------------------------------
// Streak flame component
// -------------------------------------------------------------------
const StreakBadge = ({ streak }) => {
  const color = streak >= 5 ? '#f59e0b' : streak >= 3 ? '#0d3fc7' : '#64748b';
  return (
    <div className="flex items-center gap-2">
      <span style={{ fontSize: 28 }}>{streak >= 3 ? '🔥' : '⚡'}</span>
      <div>
        <p className="text-2xl font-display font-bold text-gray-900">{streak}</p>
        <p className="text-xs text-gray-500">day streak</p>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------
// Days left ring
// -------------------------------------------------------------------
const DaysRing = ({ daysLeft, totalDays }) => {
  const pct = Math.max(0, Math.min(100, Math.round((daysLeft / totalDays) * 100)));
  const r = 28, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct > 50 ? '#22c55e' : pct > 25 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-3">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)" />
        <text x="36" y="40" textAnchor="middle" fill="#0f172a"
          style={{ fontSize: 14, fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
          {daysLeft}
        </text>
      </svg>
      <div>
        <p className="text-sm font-medium text-gray-900">Days left</p>
        <p className="text-xs text-gray-500">in internship</p>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------
// Main dashboard
// -------------------------------------------------------------------
export default function InternDashboard() {
  const { user } = useAuth();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    internApi.getDashboard()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-accent-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Loading your dashboard...</p>
      </div>
    </div>
  );
  if (error) return <p className="text-danger-600 card">{error}</p>;
  if (!data) return null;

  const {
    internship, counts, todaysTasks,
    nextDeadline, nextPresentation,
    streak = 0, weeklyActivity = [], progressPct = 0,
  } = data;

  // Donut chart data
  const donutData = [
    { name: 'Completed', value: parseInt(counts.completed_count) || 0 },
    { name: 'Pending',   value: parseInt(counts.pending_count)   || 0 },
    { name: 'Overdue',   value: parseInt(counts.overdue_count)   || 0 },
  ].filter(d => d.value > 0);

  const donutColors = [COLORS.completed, COLORS.pending, COLORS.overdue];

  // Total days in internship for the ring
  const start = new Date(internship.start_date);
  const end   = new Date(internship.end_date);
  const totalDays = Math.max(1, Math.round((end - start) / 86400000));

  // Sparkline — fill missing days with 0
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split('T')[0];
    const found = weeklyActivity.find(w =>
      new Date(w.activity_date).toISOString().split('T')[0] === key
    );
    return {
      day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      submissions: found ? parseInt(found.count) : 0,
    };
  });

  const totalTasks = (parseInt(counts.completed_count) || 0) +
                     (parseInt(counts.pending_count)   || 0) +
                     (parseInt(counts.overdue_count)   || 0);

  return (
    <div className="space-y-6 pb-6">

      {/* ── Header greeting ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-display font-bold text-2xl text-white">
            Hello, {user?.name?.split(' ')[0]} 👋
          </h2>
          <p className="text-gray-500 mt-1 text-sm">
            {internship.batch_name} · Mentored by <span className="font-medium text-gray-700">{internship.mentor_name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-accent-50 border border-accent-200 rounded-xl px-4 py-2">
          <i className="ti ti-school text-accent-600" />
          <span className="text-sm font-medium text-accent-700">RISE-UP Internship Program</span>
        </div>
      </div>

      {/* ── Top row: donut + streak + days ring ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Progress donut */}
        <div className="card lg:col-span-1 flex flex-col items-center justify-center py-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Overall progress</p>
          {totalTasks === 0 ? (
            <div className="text-center py-4">
              <p className="text-4xl font-display font-bold text-gray-300">0%</p>
              <p className="text-sm text-gray-400 mt-1">No tasks yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  labelLine={false}
                >
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={donutColors[i]} stroke="none" />
                  ))}
                  <DonutLabel cx={0} cy={0} pct={progressPct} />
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value + ' tasks', name]}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-2">
            {[
              { label: 'Done',    color: COLORS.completed, key: 'completed_count' },
              { label: 'Pending', color: COLORS.pending,   key: 'pending_count'   },
              { label: 'Overdue', color: COLORS.overdue,   key: 'overdue_count'   },
            ].map(({ label, color, key }) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="text-xs text-gray-500">{label} ({counts[key] || 0})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Streak + days ring */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Streak card */}
          <div className="card flex flex-col justify-between">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Submission streak</p>
            <StreakBadge streak={streak} />
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                {streak === 0
                  ? 'Submit something today to start your streak!'
                  : streak === 1
                  ? 'Great start! Keep going tomorrow.'
                  : `${streak} consecutive days with submissions. Keep it up!`}
              </p>
            </div>
          </div>

          {/* Days ring */}
          <div className="card flex flex-col justify-between">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Internship timeline</p>
            <DaysRing daysLeft={internship.days_left} totalDays={totalDays} />
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{new Date(internship.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                <span>{new Date(internship.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-600 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, 100 - Math.round((internship.days_left / totalDays) * 100)))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="sm:col-span-2 grid grid-cols-3 gap-3">
            {[
              { label: "Today's tasks", value: counts.today_count || 0, icon: 'ti ti-list-check',    bg: 'bg-accent-50',   text: 'text-accent-600'  },
              { label: 'Pending',        value: counts.pending_count || 0, icon: 'ti ti-clock',      bg: 'bg-warning-50',  text: 'text-warning-600' },
              { label: 'Overdue',        value: counts.overdue_count || 0, icon: 'ti ti-alert-circle', bg: 'bg-danger-50', text: 'text-danger-600'  },
            ].map(({ label, value, icon, bg, text }) => (
              <div key={label} className="card !p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${bg} ${text} flex items-center justify-center text-lg flex-shrink-0`}>
                  <i className={icon} />
                </div>
                <div>
                  <p className="text-xl font-display font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Weekly activity sparkline ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-semibold text-gray-900">7-day submission activity</h3>
            <p className="text-xs text-gray-400 mt-0.5">Number of work items submitted per day</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-2.5 h-2.5 rounded-sm bg-accent-600" />
            Submissions
          </div>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={last7} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={20} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              formatter={(v) => [v + ' submission' + (v !== 1 ? 's' : ''), 'Submissions']}
            />
            <Bar dataKey="submissions" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Bottom row: today's tasks + info cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Today's tasks */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-gray-900">Today's tasks</h3>
            <Link to="/intern/work-items" className="text-sm text-accent-600 hover:text-accent-700 font-medium flex items-center gap-1">
              View all <i className="ti ti-arrow-right text-xs" />
            </Link>
          </div>
          {todaysTasks.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-sm text-gray-400">Nothing due today — you're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {todaysTasks.map((task) => {
                const typeIcons = { assignment: 'ti ti-file-text', task: 'ti ti-tool', project: 'ti ti-rocket' };
                return (
                  <Link
                    key={task.id}
                    to={`/intern/work-items/${task.id}`}
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 hover:border-accent-200 hover:bg-accent-50/30 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent-50 text-accent-600 flex items-center justify-center flex-shrink-0">
                      <i className={typeIcons[task.type] || 'ti ti-file'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                      <p className="text-xs text-gray-400 capitalize">{task.type}</p>
                    </div>
                    <StatusBadge status={task.status} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Info cards */}
        <div className="space-y-4">
          {/* Next deadline */}
          <div className="card border-l-4 border-l-warning-500">
            <div className="flex items-center gap-2 mb-2">
              <i className="ti ti-alarm text-warning-600" />
              <h3 className="font-display font-semibold text-gray-900 text-sm">Next deadline</h3>
            </div>
            {nextDeadline ? (
              <>
                <p className="text-sm font-medium text-gray-800">{nextDeadline.title}</p>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <i className="ti ti-calendar" />
                  {new Date(nextDeadline.deadline).toLocaleString('en-IN', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400">No upcoming deadlines 🎊</p>
            )}
          </div>

          {/* Next presentation */}
          <div className="card border-l-4 border-l-accent-500">
            <div className="flex items-center gap-2 mb-2">
              <i className="ti ti-presentation text-accent-600" />
              <h3 className="font-display font-semibold text-gray-900 text-sm">Next presentation</h3>
            </div>
            {nextPresentation ? (
              <>
                <p className="text-sm font-medium text-gray-800">{nextPresentation.title}</p>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <i className="ti ti-calendar" />
                  {new Date(nextPresentation.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {nextPresentation.time}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-400">None scheduled yet.</p>
            )}
          </div>

          {/* Quick action */}
          <Link
            to="/intern/work-items"
            className="card flex items-center gap-3 hover:shadow-md transition-shadow group border-dashed border-2 border-gray-200 hover:border-accent-300 !bg-transparent"
          >
            <div className="w-9 h-9 rounded-lg bg-accent-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
              <i className="ti ti-plus" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Submit work</p>
              <p className="text-xs text-gray-400">View & submit tasks</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
