// routes/auth.js
// Authentication routes — public (no auth required) except /me, /logout, /change-password

const express  = require('express');
const { body } = require('express-validator');

const controller                      = require('../controllers/authController');
const { authenticate }                = require('../middleware/auth');
const { handleValidationErrors }      = require('../middleware/validate');

const router = express.Router();

// ------------------------------------------------------------------
// POST /api/auth/login
// ------------------------------------------------------------------
router.post(
  '/login',
  [
    body('email')
      .isEmail().withMessage('Valid email required.')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required.'),
  ],
  handleValidationErrors,
  controller.login
);

// ------------------------------------------------------------------
// POST /api/auth/logout
// ------------------------------------------------------------------
router.post('/logout', authenticate, controller.logout);

// ------------------------------------------------------------------
// POST /api/auth/refresh
// ------------------------------------------------------------------
router.post('/refresh', controller.refresh);

// ------------------------------------------------------------------
// GET /api/auth/me
// ------------------------------------------------------------------
router.get('/me', authenticate, controller.me);

// ------------------------------------------------------------------
// POST /api/auth/change-password
// ------------------------------------------------------------------
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword')
      .notEmpty().withMessage('Current password is required.'),
    body('newPassword')
      .isLength({ min: 8 }).withMessage('New password must be at least 8 characters.')
      .matches(/[A-Z]/).withMessage('Must contain at least one uppercase letter.')
      .matches(/[0-9]/).withMessage('Must contain at least one number.'),
  ],
  handleValidationErrors,
  controller.changePassword
);

module.exports = router;
