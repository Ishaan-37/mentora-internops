// src/pages/mentor/MentorAttendance.jsx
// Mentor view of today's attendance for all their interns.
// Features:
//  - Summary cards (total / present / late / absent)
//  - Attendance table with status, time, distance
//  - Attendance % bar per intern
//  - OpenStreetMap showing intern locations
//  - Monthly calendar per intern (expandable)

import { useState, useEffect } from 'react';
import * as attendanceApi from '../../api/attendance.api';
import ProgressBar from '../../components/ProgressBar';

const IIT_JAMMU = { lat: 32.7263, lng: 74.8570 };

const STATUS_CONFIG = {
  present: { label: 'Present', emoji: '✅', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  late:    { label: 'Late',    emoji: '⏰', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  absent:  { label: 'Absent', emoji: '❌', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'   },
};

function StatCard({ emoji, label, value, color }) {
  return (
    <div className="card dark:bg-gray-800 dark:border-gray-700 text-center">
      <p className="text-3xl mb-1">{emoji}</p>
      <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function MentorAttendance() {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState(null); // internId for history
  const [history,     setHistory]     = useState({});   // { internId: { records, stats } }
  const [loadingHist, setLoadingHist] = useState(false);

  const now        = new Date();
  const todayStr   = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const todayDisplay = now.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    attendanceApi.getMentorOverview()
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadHistory = async (internId) => {
    if (history[internId]) {
      setSelected(selected === internId ? null : internId);
      return;
    }
    setLoadingHist(true);
    try {
      const res = await attendanceApi.getInternHistory(internId, currentMonth);
      setHistory(h => ({ ...h, [internId]: res.data }));
      setSelected(internId);
    } catch {}
    finally { setLoadingHist(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 border-4 border-accent-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return <p className="text-danger-600 card">Failed to load attendance data.</p>;

  const { interns, summary } = data;

  // Build OSM embed showing all intern markers
  // Centre on IIT Jammu, mark interns who submitted location
  const locatedInterns = interns.filter(i => i.latitude && i.longitude);
  const mapLat = IIT_JAMMU.lat;
  const mapLng = IIT_JAMMU.lng;
  const osmEmbed = `https://www.openstreetmap.org/export/embed.html?bbox=${mapLng - 0.005},${mapLat - 0.004},${mapLng + 0.005},${mapLat + 0.004}&layer=mapnik&marker=${mapLat},${mapLng}`;

  return (
    <div className="space-y-6 pb-6">

      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-white flex items-center gap-2">
          📍 Attendance Overview
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{todayDisplay}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard emoji="👥" label="Total interns"  value={summary.total}   color="text-gray-800 dark:text-white" />
        <StatCard emoji="✅" label="Present"        value={summary.present} color="text-green-600" />
        <StatCard emoji="⏰" label="Late"           value={summary.late}    color="text-yellow-600" />
        <StatCard emoji="❌" label="Absent"         value={summary.absent}  color="text-red-600" />
      </div>

      {/* Attendance table */}
      <div className="card dark:bg-gray-800 dark:border-gray-700 !p-0">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white">Today's Attendance</h3>
          <span className="text-xs text-gray-400">{todayStr}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                {['Intern', 'Status', 'Time', 'Distance', 'Attendance %', 'Details'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide px-6 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {interns.map((intern) => {
                const cfg = intern.status ? STATUS_CONFIG[intern.status] : null;
                const hist = history[intern.intern_id];
                const pct  = hist?.stats?.pct ?? null;

                return (
                  <>
                    <tr
                      key={intern.intern_id}
                      className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center text-sm font-medium flex-shrink-0">
                            {intern.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{intern.name}</p>
                            <p className="text-xs text-gray-400">{intern.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {cfg ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                            {cfg.emoji} {cfg.label}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                            ❌ Absent
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {intern.marked_at
                          ? new Date(intern.marked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {intern.distance_m != null ? `${intern.distance_m} m` : '—'}
                      </td>
                      <td className="px-6 py-4">
                        {pct !== null ? (
                          <div className="flex items-center gap-2 w-28">
                            <ProgressBar value={pct} size="sm" />
                            <span className="text-xs text-gray-500 w-8">{pct}%</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => loadHistory(intern.intern_id)}
                            className="text-xs text-accent-600 hover:underline"
                          >
                            Load
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => loadHistory(intern.intern_id)}
                          className="text-xs text-accent-600 hover:text-accent-700 font-medium flex items-center gap-1"
                        >
                          {selected === intern.intern_id ? 'Hide' : 'View calendar'}
                          <i className={`ti ${selected === intern.intern_id ? 'ti-chevron-up' : 'ti-chevron-down'} text-xs`} />
                        </button>
                      </td>
                    </tr>

                    {/* Expanded calendar row */}
                    {selected === intern.intern_id && (
                      <tr className="bg-gray-50 dark:bg-gray-900/40">
                        <td colSpan={6} className="px-6 py-4">
                          {loadingHist && !history[intern.intern_id] ? (
                            <p className="text-gray-400 text-sm">Loading...</p>
                          ) : history[intern.intern_id] ? (
                            <AttendanceCalendar
                              records={history[intern.intern_id].records}
                              stats={history[intern.intern_id].stats}
                              month={currentMonth}
                              now={now}
                            />
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          {interns.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">No interns assigned to you yet.</p>
          )}
        </div>
      </div>

      {/* Map view */}
      <div className="card dark:bg-gray-800 dark:border-gray-700 !p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-display font-semibold text-gray-900 dark:text-white">📍 Campus Map</h3>
          <p className="text-xs text-gray-400 mt-0.5">IIT Jammu — interns who marked attendance from campus</p>
        </div>
        <iframe
          title="IIT Jammu Attendance Map"
          src={osmEmbed}
          width="100%"
          height="300"
          style={{ border: 0 }}
          loading="lazy"
        />
        {/* Intern location legend */}
        {locatedInterns.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-3">
            {locatedInterns.map(i => {
              const cfg = STATUS_CONFIG[i.status];
              return (
                <div key={i.intern_id} className="flex items-center gap-1.5 text-xs">
                  <span>{cfg?.emoji ?? '📍'}</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">{i.name}</span>
                  <span className="text-gray-400">
                    {new Date(i.marked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}{i.distance_m}m from campus
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Mini attendance calendar (used in expanded table row)
// ------------------------------------------------------------------
function AttendanceCalendar({ records, stats, month, now }) {
  const [year, mon] = month.split('-').map(Number);
  const daysInMonth  = new Date(year, mon, 0).getDate();
  const firstDay     = new Date(year, mon - 1, 1).getDay();
  const histMap      = Object.fromEntries(records.map(r => [r.date, r.status]));
  const todayStr     = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  return (
    <div className="space-y-3">
      {stats && (
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-600 font-medium">✅ {stats.present} Present</span>
          <span className="text-yellow-600 font-medium">⏰ {stats.late} Late</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Attendance: <span className={stats.pct >= 80 ? 'text-green-600' : stats.pct >= 60 ? 'text-yellow-600' : 'text-red-600'}>{stats.pct}%</span>
          </span>
          <div className="flex-1 max-w-32">
            <ProgressBar value={stats.pct} size="sm" />
          </div>
        </div>
      )}
      <div className="grid grid-cols-7 gap-1 max-w-xs">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-[10px] text-gray-400 font-medium py-0.5">{d}</div>
        ))}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day     = i + 1;
          const dateStr = `${month}-${String(day).padStart(2, '0')}`;
          const status  = histMap[dateStr];
          const isToday = dateStr === todayStr;
          const cfg     = status ? STATUS_CONFIG[status] : null;
          return (
            <div key={day} title={`${dateStr}${cfg ? ` — ${cfg.label}` : ''}`}
              className={`w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-medium
                ${isToday ? 'ring-2 ring-accent-600 ring-offset-1' : ''}
                ${cfg
                  ? `${cfg.bg} ${cfg.text}`
                  : dateStr > todayStr ? 'text-gray-200' : 'bg-gray-100 text-gray-400'}`}>
              {cfg ? cfg.emoji : day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
