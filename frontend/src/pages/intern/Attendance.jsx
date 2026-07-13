// src/pages/intern/Attendance.jsx
// Smart Geo-Attendance page for interns.
// Features:
//  - Live GPS location detection
//  - Haversine distance check against IIT Jammu geo-fence (200m)
//  - Mark Present / Late based on time
//  - Embedded OpenStreetMap via iframe (no API key needed)
//  - Monthly attendance calendar
//  - History stats

import { useState, useEffect, useCallback } from 'react';
import * as attendanceApi from '../../api/attendance.api';
import { getDeviceFingerprint } from '../../utils/deviceFingerprint';

// IIT Jammu campus centre
const IIT_JAMMU = { lat: 32.8019, lng: 74.8927 };
const GEOFENCE_M = 200;

// Haversine distance in metres (mirrors backend logic)
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

const STATUS_CONFIG = {
  present: { label: 'Present', emoji: '✅', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  late:    { label: 'Late',    emoji: '⏰', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  absent:  { label: 'Absent', emoji: '❌', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'   },
};

// Calendar day cell
function CalendarDay({ date, status }) {
  const cfg = STATUS_CONFIG[status] || null;
  return (
    <div
      title={`${date}${cfg ? ` — ${cfg.label}` : ' — No record'}`}
      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all
        ${cfg ? `${cfg.bg} ${cfg.text} ${cfg.border} border` : 'bg-gray-50 text-gray-300'}`}
    >
      {cfg ? cfg.emoji : new Date(date + 'T00:00:00').getDate()}
    </div>
  );
}

export default function Attendance() {
  const [todayData,   setTodayData]   = useState(null);
  const [location,    setLocation]    = useState(null); // { lat, lng }
  const [locError,    setLocError]    = useState('');
  const [distance,    setDistance]    = useState(null);
  const [marking,     setMarking]     = useState(false);
  const [markResult,  setMarkResult]  = useState(null); // { success, message }
  const [history,     setHistory]     = useState([]);
  const [stats,       setStats]       = useState(null);
  const [loadingLoc,  setLoadingLoc]  = useState(false);

  // Current month for calendar
  const now          = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const todayDisplay = new Date(todayStr + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // Load today's status + history
  const loadData = useCallback(async () => {
    try {
      const [todayRes, histRes] = await Promise.all([
        attendanceApi.getTodayStatus(),
        attendanceApi.getMyHistory(currentMonth),
      ]);
      setTodayData(todayRes.data);
      setHistory(histRes.data.records || []);
      setStats(histRes.data.stats || null);
    } catch {
      // silently fail — will show no data
    }
  }, [currentMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  // Get live GPS location
  const getLocation = () => {
    setLoadingLoc(true);
    setLocError('');
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.');
      setLoadingLoc(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocation({ lat, lng });
        setDistance(haversine(lat, lng, IIT_JAMMU.lat, IIT_JAMMU.lng));
        setLoadingLoc(false);
      },
      (err) => {
        setLocError(
          err.code === 1
            ? 'Location permission denied. Please allow location access in your browser settings.'
            : 'Unable to get your location. Please try again.'
        );
        setLoadingLoc(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Mark attendance
  const handleMark = async () => {
    if (!location) { getLocation(); return; }
    setMarking(true);
    setMarkResult(null);
    try {
      const fingerprint = getDeviceFingerprint();
      const res = await attendanceApi.markAttendance(location.lat, location.lng, fingerprint.deviceHash, fingerprint.deviceLabel);
      setMarkResult({ success: res.success, message: res.message });
      if (res.success) loadData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to mark attendance.';
      setMarkResult({ success: false, message: msg });
    } finally {
      setMarking(false);
    }
  };

  const withinFence   = distance !== null && distance <= GEOFENCE_M;
  const todayRecord   = todayData?.today;
  const alreadyMarked = !!todayRecord;

  // Build calendar grid for current month
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
  const historyMap  = Object.fromEntries(history.map(r => [r.date, r.status]));

  // OSM embed URL centred on IIT Jammu (or intern location if captured)
  const mapLat  = location?.lat ?? IIT_JAMMU.lat;
  const mapLng  = location?.lng ?? IIT_JAMMU.lng;
  const mapZoom = 16;
  const osmEmbed = `https://www.openstreetmap.org/export/embed.html?bbox=${mapLng - 0.003},${mapLat - 0.002},${mapLng + 0.003},${mapLat + 0.002}&layer=mapnik&marker=${mapLat},${mapLng}`;

  return (
    <div className="space-y-6 pb-6">

      {/* Header */}
      <div>
        <h2 className="font-display font-bold text-2xl text-gray-900 dark:text-white flex items-center gap-2">
          📍 Smart Geo-Attendance
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{todayDisplay}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT — Today's status + mark button */}
        <div className="space-y-4">

          {/* Today's status card */}
          <div className="card dark:bg-gray-800 dark:border-gray-700">
            <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Today's Status</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date</p>
                <p className="font-medium text-gray-800 dark:text-gray-200">{todayStr}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</p>
                {alreadyMarked ? (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border
                    ${STATUS_CONFIG[todayRecord.status]?.bg} ${STATUS_CONFIG[todayRecord.status]?.text} ${STATUS_CONFIG[todayRecord.status]?.border}`}>
                    {STATUS_CONFIG[todayRecord.status]?.emoji} {STATUS_CONFIG[todayRecord.status]?.label}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-500 border border-gray-200">
                    ❌ Not Marked
                  </span>
                )}
              </div>
            </div>

            {alreadyMarked && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Marked at</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {new Date(todayRecord.marked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Distance from campus</p>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{todayRecord.distance_m} m</p>
                </div>
              </div>
            )}
          </div>

          {/* Live location card */}
          <div className="card dark:bg-gray-800 dark:border-gray-700">
            <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">Live Location</h3>

            {location ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <span>📍</span>
                  <span className="font-medium">Location captured</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Latitude</p>
                    <p className="font-mono font-medium text-gray-800 dark:text-gray-200">{location.lat.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Longitude</p>
                    <p className="font-mono font-medium text-gray-800 dark:text-gray-200">{location.lng.toFixed(6)}</p>
                  </div>
                </div>

                {/* Distance indicator */}
                {distance !== null && (
                  <div className={`rounded-lg border px-3 py-2 text-sm font-medium flex items-center gap-2
                    ${withinFence
                      ? 'bg-green-50 border-green-200 text-green-700'
                      : 'bg-red-50 border-red-200 text-red-700'}`}>
                    {withinFence ? '✅' : '❌'}
                    <span>
                      {withinFence
                        ? `Inside campus · ${distance} m from IIT Jammu`
                        : `Outside premises · ${distance > 1000 ? (distance / 1000).toFixed(2) + ' km' : distance + ' m'} from IIT Jammu`}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-400 text-sm mb-3">
                  {locError || 'Location not captured yet'}
                </p>
                {locError && (
                  <p className="text-xs text-red-500 mb-3">{locError}</p>
                )}
                <button
                  onClick={getLocation}
                  disabled={loadingLoc}
                  className="btn-secondary text-sm flex items-center gap-2 mx-auto"
                >
                  {loadingLoc ? (
                    <><div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> Detecting...</>
                  ) : (
                    <><i className="ti ti-current-location" /> Detect my location</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Mark attendance button */}
          {!alreadyMarked && (
            <div className="space-y-3">
              {markResult && (
                <div className={`rounded-xl border px-4 py-3 text-sm font-medium
                  ${markResult.success
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {markResult.message}
                </div>
              )}
              <button
                onClick={handleMark}
                disabled={marking || loadingLoc}
                className={`w-full py-4 rounded-xl font-display font-semibold text-white text-base
                  flex items-center justify-center gap-2 transition-all
                  ${marking || loadingLoc
                    ? 'bg-gray-400 cursor-not-allowed'
                    : location && !withinFence
                    ? 'bg-red-500 cursor-not-allowed'
                    : 'bg-accent-600 hover:bg-accent-700 active:scale-[0.98] shadow-lg hover:shadow-accent-200'}`}
              >
                {marking ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Marking...</>
                ) : loadingLoc ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Getting location...</>
                ) : (
                  <>📍 Mark Present</>
                )}
              </button>
              {location && !withinFence && (
                <p className="text-xs text-center text-red-500">
                  You must be within {GEOFENCE_M}m of IIT Jammu campus to mark attendance.
                </p>
              )}
            </div>
          )}

          {alreadyMarked && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 text-center font-medium">
              ✅ Attendance already marked for today
            </div>
          )}
        </div>

        {/* RIGHT — Map + stats */}
        <div className="space-y-4">

          {/* Embedded map */}
          <div className="card dark:bg-gray-800 dark:border-gray-700 !p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-display font-semibold text-gray-900 dark:text-white text-sm">
                📍 {location ? 'Your location' : 'IIT Jammu Campus'}
              </h3>
            </div>
            <iframe
              title="IIT Jammu Location"
              src={osmEmbed}
              width="100%"
              height="240"
              style={{ border: 0 }}
              loading="lazy"
            />
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 text-xs text-gray-400 flex items-center gap-1">
              <i className="ti ti-map-pin" />
              IIT Jammu · Geo-fence radius: {GEOFENCE_M}m
            </div>
          </div>

          {/* Monthly stats */}
          {stats && (
            <div className="card dark:bg-gray-800 dark:border-gray-700">
              <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">This Month</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Present', value: stats.present, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: 'Late',    value: stats.late,    color: 'text-yellow-600', bg: 'bg-yellow-50' },
                  { label: 'Absent',  value: stats.absent,  color: 'text-red-600',   bg: 'bg-red-50' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                    <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Attendance rate</span>
                  <span className="font-medium">{stats.pct}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      stats.pct >= 80 ? 'bg-green-500' : stats.pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${stats.pct}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Attendance calendar */}
      <div className="card dark:bg-gray-800 dark:border-gray-700">
        <h3 className="font-display font-semibold text-gray-900 dark:text-white mb-4">
          Attendance Calendar —{' '}
          {now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </h3>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day  = i + 1;
            const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
            const status  = historyMap[dateStr];
            const isToday = dateStr === todayStr;
            return (
              <div key={day} className={`flex items-center justify-center ${isToday ? 'ring-2 ring-accent-600 ring-offset-1 rounded-lg' : ''}`}>
                {status ? (
                  <CalendarDay date={dateStr} status={status} />
                ) : (
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs
                    ${dateStr > todayStr
                      ? 'text-gray-200'
                      : 'text-gray-400 bg-gray-50'}`}>
                    {day}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>{cfg.emoji}</span> {cfg.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
