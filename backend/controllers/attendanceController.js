// controllers/attendanceController.js
// Geo-fenced attendance with device fingerprint security.
//
// Security layers:
//   1. JWT auth      — must be logged in as intern
//   2. Geo-fence     — must be within 500m of IIT Jammu campus
//   3. Device lock   — only the first device used to mark attendance
//                      can mark future attendance (registered in intern_devices)
//   4. One per day   — cannot mark twice on same date

const db     = require('../config/db');
const logger = require('../config/logger');

// ------------------------------------------------------------------
// IIT Jammu correct coordinates (verified from on-campus GPS)
// ------------------------------------------------------------------
const IIT_JAMMU       = { lat: 32.8019, lng: 74.8927 };
const GEOFENCE_RADIUS_M = 500; // 500m — accounts for GPS drift inside buildings

// Haversine formula — distance between two GPS points in metres
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R  = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a  =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function determineStatus(distanceM, markedAt) {
  if (distanceM > GEOFENCE_RADIUS_M) return null;
  const isLate = markedAt.getHours() > 13 ||
    (markedAt.getHours() === 13 && markedAt.getMinutes() >= 30);
  return isLate ? 'late' : 'present';
}

// ------------------------------------------------------------------
// POST /api/attendance/mark
// Body: { latitude, longitude, deviceHash, deviceLabel }
// Intern only.
// ------------------------------------------------------------------
const markAttendance = async (req, res) => {
  try {
    const internId = req.user.id;
    const { latitude, longitude, deviceHash, deviceLabel, deviceInfo } = req.body;

    // 1. Validate coordinates
    if (latitude == null || longitude == null) {
      return res.status(400).json({ success: false, message: 'Location coordinates are required.' });
    }
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, message: 'Invalid coordinates.' });
    }

    // 2. Validate device hash present
    if (!deviceHash) {
      return res.status(400).json({
        success: false,
        message: 'Device fingerprint missing. Please use the official InternOps app.',
      });
    }

    // 3. Geo-fence check
    const distanceM = Math.round(haversineDistance(lat, lng, IIT_JAMMU.lat, IIT_JAMMU.lng));
    const now       = new Date();
    const status    = determineStatus(distanceM, now);

    if (!status) {
      return res.status(403).json({
        success: false,
        message: `You are outside the internship premises. Current distance: ${(distanceM / 1000).toFixed(2)} km from IIT Jammu. Attendance not marked.`,
        data: { distanceM, allowed: false },
      });
    }

    // 4. Device fingerprint check
    const { rows: deviceRows } = await db.query(
      'SELECT device_hash, device_label FROM intern_devices WHERE intern_id = $1',
      [internId]
    );

    if (deviceRows.length === 0) {
      // First time — register this device
      await db.query(
        `INSERT INTO intern_devices (intern_id, device_hash, device_label, last_used_at)
         VALUES ($1, $2, $3, NOW())`,
        [internId, deviceHash, deviceLabel || 'Unknown device']
      );
      logger.info('Device registered', { internId, deviceHash, deviceLabel });
    } else {
      // Device already registered — verify it matches
      const registeredHash = deviceRows[0].device_hash;
      if (registeredHash !== deviceHash) {
        logger.warn('Device mismatch — possible fraud attempt', {
          internId,
          registered: registeredHash,
          attempted: deviceHash,
        });
        return res.status(403).json({
          success: false,
          message: `❌ Attendance blocked. This is not your registered device. Your attendance can only be marked from your registered device (${deviceRows[0].device_label}). Contact your mentor if you changed your device.`,
          data: { deviceMismatch: true },
        });
      }

      // Update last used
      await db.query(
        'UPDATE intern_devices SET last_used_at = NOW() WHERE intern_id = $1',
        [internId]
      );
    }

    // 5. Mark attendance (upsert — prevents double marking same day)
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

    const { rows: [record] } = await db.query(
      `INSERT INTO attendance
         (intern_id, date, status, marked_at, latitude, longitude, distance_m, device_info, device_hash)
       VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8)
       ON CONFLICT (intern_id, date)
       DO UPDATE SET
         status      = EXCLUDED.status,
         marked_at   = EXCLUDED.marked_at,
         latitude    = EXCLUDED.latitude,
         longitude   = EXCLUDED.longitude,
         distance_m  = EXCLUDED.distance_m,
         device_info = EXCLUDED.device_info,
         device_hash = EXCLUDED.device_hash
       RETURNING id, date, status, marked_at, latitude, longitude, distance_m`,
      [internId, todayIST, status, lat, lng, distanceM, deviceInfo || null, deviceHash]
    );

    logger.info('Attendance marked', { internId, status, distanceM, deviceHash });

    return res.status(200).json({
      success: true,
      message: status === 'present'
        ? '✅ Attendance marked — Present!'
        : '⏰ Attendance marked — Late (after 13:30)',
      data: { record, distanceM, allowed: true },
    });
  } catch (err) {
    logger.error('markAttendance error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/attendance/my-device
// Returns the intern's registered device info.
// Intern only.
// ------------------------------------------------------------------
const getMyDevice = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT device_label, first_registered_at, last_used_at FROM intern_devices WHERE intern_id = $1',
      [req.user.id]
    );
    return res.status(200).json({
      success: true,
      data: { device: rows[0] || null },
    });
  } catch (err) {
    logger.error('getMyDevice error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// DELETE /api/attendance/reset-device/:internId
// Allows mentor or admin to reset an intern's registered device.
// (Use case: intern got a new phone)
// Mentor only — must be their intern.
// ------------------------------------------------------------------
const resetInternDevice = async (req, res) => {
  try {
    const { internId } = req.params;

    // If mentor, verify ownership
    if (req.user.role === 'mentor') {
      const { rows: ownerCheck } = await db.query(
        `SELECT 1 FROM internships WHERE intern_id = $1 AND mentor_id = $2 AND status = 'active'`,
        [internId, req.user.id]
      );
      if (!ownerCheck.length) {
        return res.status(403).json({ success: false, message: 'Not your intern.' });
      }
    }

    const { rows: internName } = await db.query(
      'SELECT name FROM users WHERE id = $1',
      [internId]
    );

    await db.query('DELETE FROM intern_devices WHERE intern_id = $1', [internId]);

    logger.info('Device reset', { by: req.user.id, internId });

    return res.status(200).json({
      success: true,
      message: `Device reset for ${internName[0]?.name}. They can now register a new device next time they mark attendance.`,
    });
  } catch (err) {
    logger.error('resetInternDevice error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/attendance/today  (intern only)
// ------------------------------------------------------------------
const getTodayStatus = async (req, res) => {
  try {
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const { rows } = await db.query(
      `SELECT id, date, status, marked_at, latitude, longitude, distance_m
       FROM   attendance WHERE intern_id = $1 AND date = $2`,
      [req.user.id, todayIST]
    );
    const { rows: deviceRows } = await db.query(
      'SELECT device_label, registered_at FROM intern_devices WHERE intern_id = $1',
      [req.user.id]
    );
    return res.status(200).json({
      success: true,
      data: {
        today:          rows[0] || null,
        date:           todayIST,
        iitJammu:       IIT_JAMMU,
        geofenceRadius: GEOFENCE_RADIUS_M,
        registeredDevice: deviceRows[0] || null,
      },
    });
  } catch (err) {
    logger.error('getTodayStatus error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/attendance/my-history?month=YYYY-MM  (intern only)
// ------------------------------------------------------------------
const getMyHistory = async (req, res) => {
  try {
    const { month } = req.query;
    const filter = month ? `AND TO_CHAR(date, 'YYYY-MM') = $2` : '';
    const params = month ? [req.user.id, month] : [req.user.id];
    const { rows } = await db.query(
      `SELECT date, status, marked_at, distance_m FROM attendance
       WHERE intern_id = $1 ${filter} ORDER BY date DESC`,
      params
    );
    const present = rows.filter(r => r.status === 'present').length;
    const late    = rows.filter(r => r.status === 'late').length;
    const total   = rows.length;
    const pct     = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return res.status(200).json({
      success: true,
      data: { records: rows, stats: { present, late, absent: 0, total, pct } },
    });
  } catch (err) {
    logger.error('getMyHistory error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/attendance/mentor-overview  (mentor only)
// ------------------------------------------------------------------
const getMentorOverview = async (req, res) => {
  try {
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const { rows } = await db.query(
      `SELECT u.id AS intern_id, u.name, u.email,
              a.status, a.marked_at, a.latitude, a.longitude, a.distance_m,
              d.device_label, d.first_registered_at AS device_registered
       FROM   users u
       JOIN   internships i  ON i.intern_id = u.id AND i.status = 'active'
       LEFT JOIN attendance a ON a.intern_id = u.id AND a.date = $2
       LEFT JOIN intern_devices d ON d.intern_id = u.id
       WHERE  i.mentor_id = $1 AND u.is_active = TRUE
       ORDER  BY u.name ASC`,
      [req.user.id, todayIST]
    );
    const present = rows.filter(r => r.status === 'present').length;
    const late    = rows.filter(r => r.status === 'late').length;
    const absent  = rows.filter(r => !r.status).length;
    return res.status(200).json({
      success: true,
      data: {
        date: todayIST,
        interns: rows,
        summary: { total: rows.length, present, late, absent },
      },
    });
  } catch (err) {
    logger.error('getMentorOverview error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/attendance/intern/:internId/history  (mentor only)
// ------------------------------------------------------------------
const getInternHistory = async (req, res) => {
  try {
    const { internId } = req.params;
    const { month }    = req.query;
    const { rows: ownerCheck } = await db.query(
      `SELECT 1 FROM internships WHERE intern_id = $1 AND mentor_id = $2 AND status = 'active'`,
      [internId, req.user.id]
    );
    if (!ownerCheck.length) {
      return res.status(403).json({ success: false, message: 'Not your intern.' });
    }
    const filter = month ? `AND TO_CHAR(a.date, 'YYYY-MM') = $2` : '';
    const params = month ? [internId, month] : [internId];
    const { rows } = await db.query(
      `SELECT date, status, marked_at, distance_m, latitude, longitude
       FROM attendance a WHERE intern_id = $1 ${filter} ORDER BY date DESC`,
      params
    );
    const present = rows.filter(r => r.status === 'present').length;
    const late    = rows.filter(r => r.status === 'late').length;
    const total   = rows.length;
    const pct     = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return res.status(200).json({
      success: true,
      data: { records: rows, stats: { present, late, total, pct } },
    });
  } catch (err) {
    logger.error('getInternHistory error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  markAttendance,
  getMyDevice,
  resetInternDevice,
  getTodayStatus,
  getMyHistory,
  getMentorOverview,
  getInternHistory,
};
