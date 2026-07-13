// routes/attendanceRoutes.js
// All attendance endpoints.
// Intern routes: mark, today, my-history
// Mentor routes: overview, intern history

const express = require('express');
const { body, param, query } = require('express-validator');

const controller                 = require('../controllers/attendanceController');
const { authenticate }           = require('../middleware/auth');
const { requireIntern, requireMentor } = require('../middleware/rbac');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate);

// ------------------------------------------------------------------
// POST /api/attendance/mark  (intern only)
// ------------------------------------------------------------------
router.post(
  '/mark',
  requireIntern,
  [
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required.'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required.'),
    body('deviceInfo').optional().trim(),
  ],
  handleValidationErrors,
  controller.markAttendance
);

// ------------------------------------------------------------------
// GET /api/attendance/today  (intern only)
// ------------------------------------------------------------------
router.get('/today', requireIntern, controller.getTodayStatus);

// ------------------------------------------------------------------
// GET /api/attendance/my-history?month=YYYY-MM  (intern only)
// ------------------------------------------------------------------
router.get(
  '/my-history',
  requireIntern,
  [query('month').optional().matches(/^\d{4}-\d{2}$/).withMessage('Month format: YYYY-MM')],
  handleValidationErrors,
  controller.getMyHistory
);

// ------------------------------------------------------------------
// GET /api/attendance/mentor-overview  (mentor only)
// ------------------------------------------------------------------
router.get('/mentor-overview', requireMentor, controller.getMentorOverview);

// ------------------------------------------------------------------
// GET /api/attendance/intern/:internId/history?month=YYYY-MM  (mentor only)
// ------------------------------------------------------------------
router.get(
  '/intern/:internId/history',
  requireMentor,
  [
    param('internId').isUUID().withMessage('Valid intern ID required.'),
    query('month').optional().matches(/^\d{4}-\d{2}$/).withMessage('Month format: YYYY-MM'),
  ],
  handleValidationErrors,
  controller.getInternHistory
);

module.exports = router;
