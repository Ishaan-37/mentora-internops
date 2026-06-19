// controllers/authController.js
// Handles all authentication logic:
//   register  — admin-only user creation
//   login     — email + password → JWT pair in httpOnly cookies
//   logout    — clear cookies
//   refresh   — exchange refresh token for new access token
//   me        — return current user profile

const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');
const logger = require('../config/logger');

// ------------------------------------------------------------------
// Helper: sign a short-lived access token (1 hour)
// ------------------------------------------------------------------
const signAccessToken = (userId, role) =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });

// ------------------------------------------------------------------
// Helper: sign a refresh token (7 days)
// ------------------------------------------------------------------
const signRefreshToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

// ------------------------------------------------------------------
// Helper: set both tokens as secure httpOnly cookies
// ------------------------------------------------------------------
const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure:   isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge:   60 * 60 * 1000, // 1 hour in ms
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure:   isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path:     '/api/auth/refresh', // only sent to the refresh endpoint
  });
};

// ------------------------------------------------------------------
// POST /api/auth/login
// Body: { email, password }
// ------------------------------------------------------------------
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const { rows } = await db.query(
      `SELECT id, name, email, password_hash, role, is_active
       FROM   users
       WHERE  email = LOWER($1)`,
      [email.trim()]
    );

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const user = rows[0];

    // 2. Check if account is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account deactivated. Contact your admin.',
      });
    }

    // 3. Compare password with stored hash
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 4. Update last login timestamp
    await db.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // 5. Issue tokens and set cookies
    const accessToken  = signAccessToken(user.id, user.role);
    const refreshToken = signRefreshToken(user.id);
    setAuthCookies(res, accessToken, refreshToken);

    logger.info('User logged in', { userId: user.id, role: user.role });

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id:    user.id,
          name:  user.name,
          email: user.email,
          role:  user.role,
        },
        // Also return access token in body for clients that prefer header auth
        accessToken,
      },
    });
  } catch (err) {
    logger.error('Login error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// POST /api/auth/logout
// Clears both auth cookies
// ------------------------------------------------------------------
const logout = (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  logger.info('User logged out', { userId: req.user?.id });
  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

// ------------------------------------------------------------------
// POST /api/auth/refresh
// Reads refreshToken cookie → returns new accessToken cookie + body
// ------------------------------------------------------------------
const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Refresh token missing.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Refresh token invalid or expired.' });
    }

    // Confirm user still exists
    const { rows } = await db.query(
      'SELECT id, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    const { id, role } = rows[0];
    const newAccessToken  = signAccessToken(id, role);
    const newRefreshToken = signRefreshToken(id);
    setAuthCookies(res, newAccessToken, newRefreshToken);

    return res.status(200).json({
      success: true,
      data: { accessToken: newAccessToken },
    });
  } catch (err) {
    logger.error('Token refresh error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/auth/me
// Returns current authenticated user's profile
// ------------------------------------------------------------------
const me = async (req, res) => {
  try {
    // req.user is set by authenticate middleware
    const { id, role } = req.user;

    // Base user info
    const { rows } = await db.query(
      `SELECT id, name, email, role, last_login_at, created_at
       FROM   users
       WHERE  id = $1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user = rows[0];

    // Fetch role-specific profile data
    let profile = null;

    if (role === 'admin') {
      const { rows: adminRows } = await db.query(
        'SELECT professor_name, department FROM admins WHERE user_id = $1',
        [id]
      );
      profile = adminRows[0] || null;
    } else if (role === 'mentor') {
      const { rows: mentorRows } = await db.query(
        `SELECT m.mentor_role,
                COUNT(mi.intern_id) AS intern_count
         FROM   mentors m
         LEFT JOIN mentors_interns mi ON mi.mentor_id = m.user_id
         WHERE  m.user_id = $1
         GROUP  BY m.mentor_role`,
        [id]
      );
      profile = mentorRows[0] || null;
    } else if (role === 'intern') {
      const { rows: internRows } = await db.query(
        `SELECT i.status, i.start_date, i.end_date,
                b.name AS batch_name,
                u.name AS mentor_name
         FROM   internships i
         JOIN   batches b  ON b.id = i.batch_id
         JOIN   users   u  ON u.id = i.mentor_id
         WHERE  i.intern_id = $1 AND i.status = 'active'
         ORDER  BY i.created_at DESC
         LIMIT  1`,
        [id]
      );
      profile = internRows[0] || null;
    }

    return res.status(200).json({
      success: true,
      data: { ...user, profile },
    });
  } catch (err) {
    logger.error('Get me error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// POST /api/auth/change-password
// Body: { currentPassword, newPassword }
// Any authenticated user can change their own password
// ------------------------------------------------------------------
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Fetch current hash
    const { rows } = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    // Hash and store new password
    const rounds  = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;
    const newHash = await bcrypt.hash(newPassword, rounds);

    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, userId]
    );

    // Clear cookies so user must re-login with new password
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });

    logger.info('Password changed', { userId });
    return res.status(200).json({ success: true, message: 'Password changed. Please log in again.' });
  } catch (err) {
    logger.error('Change password error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = { login, logout, refresh, me, changePassword };
