// middleware/auth.js
// Verifies JWT on every protected route.
// Reads the token from the httpOnly cookie (preferred) or
// the Authorization: Bearer header (for API clients / testing).

const jwt    = require('jsonwebtoken');
const db     = require('../config/db');
const logger = require('../config/logger');

// ------------------------------------------------------------------
// authenticate
// Attaches req.user = { id, name, email, role } on success
// ------------------------------------------------------------------
const authenticate = async (req, res, next) => {
  try {
    // 1. Try httpOnly cookie first (web clients)
    let token = req.cookies?.accessToken;

    // 2. Fall back to Authorization header (API clients / mobile)
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    // 3. Verify signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const message =
        err.name === 'TokenExpiredError'
          ? 'Session expired. Please log in again.'
          : 'Invalid token. Please log in again.';
      return res.status(401).json({ success: false, message });
    }

    // 4. Confirm user still exists and is active (catches deleted / deactivated users)
    const { rows } = await db.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account not found or deactivated.',
      });
    }

    // 5. Attach user to request object — available to all downstream handlers
    req.user = rows[0];
    next();
  } catch (err) {
    logger.error('Authentication middleware error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// optionalAuth
// Same as authenticate but does NOT reject unauthenticated requests.
// Useful for endpoints that behave differently when logged in.
// ------------------------------------------------------------------
const optionalAuth = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.headers.authorization?.split(' ')[1];

    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await db.query(
      'SELECT id, name, email, role FROM users WHERE id = $1 AND is_active = TRUE',
      [decoded.userId]
    );

    if (rows.length) req.user = rows[0];
    next();
  } catch {
    // Silently ignore invalid token for optional auth
    next();
  }
};

module.exports = { authenticate, optionalAuth };
