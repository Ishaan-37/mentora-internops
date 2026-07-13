// routes/intern.js
// All intern-only endpoints. Every route requires authenticate + requireIntern.

const express  = require('express');
const { body, param, query } = require('express-validator');

const controller                 = require('../controllers/internController');
const { authenticate }           = require('../middleware/auth');
const { requireIntern }          = require('../middleware/rbac');
const { handleValidationErrors } = require('../middleware/validate');
const { uploadSingle }           = require('../middleware/upload');

const router = express.Router();

router.use(authenticate, requireIntern);

// ------------------------------------------------------------------
// GET /api/intern/dashboard
// ------------------------------------------------------------------
router.get('/dashboard', controller.getDashboard);

// ------------------------------------------------------------------
// GET /api/intern/cohort  (all RISE interns, institution-wide)
// ------------------------------------------------------------------
router.get('/cohort', controller.getCohortDirectory);

// ------------------------------------------------------------------
// GET /api/intern/work-items?type=assignment|task|project
// ------------------------------------------------------------------
router.get(
  '/work-items',
  [query('type').optional().isIn(['assignment', 'task', 'project'])],
  handleValidationErrors,
  controller.getWorkItems
);

// ------------------------------------------------------------------
// GET /api/intern/work-item/:id
// ------------------------------------------------------------------
router.get(
  '/work-item/:id',
  [param('id').isUUID().withMessage('Valid work item ID required.')],
  handleValidationErrors,
  controller.getWorkItemDetail
);

// ------------------------------------------------------------------
// POST /api/intern/submit-work
// multipart/form-data — file field name = "file"
// ------------------------------------------------------------------
router.post(
  '/submit-work',
  uploadSingle('file'),
  [
    body('workItemId').isUUID().withMessage('Valid work item ID required.'),
    body('submissionType')
      .isIn(['pdf', 'gdrive', 'github', 'files', 'other'])
      .withMessage('Invalid submission type.'),
    body('externalLink').optional().trim(),
    body('notes').optional().trim(),
  ],
  handleValidationErrors,
  controller.submitWork
);

// ------------------------------------------------------------------
// GET /api/intern/submissions
// ------------------------------------------------------------------
router.get('/submissions', controller.getMySubmissions);

// ------------------------------------------------------------------
// GET /api/intern/notifications?unreadOnly=true
// ------------------------------------------------------------------
router.get('/notifications', controller.getNotifications);

// ------------------------------------------------------------------
// PUT /api/intern/mark-notification-read/:id
// ------------------------------------------------------------------
router.put(
  '/mark-notification-read/:id',
  [param('id').isUUID().withMessage('Valid notification ID required.')],
  handleValidationErrors,
  controller.markNotificationRead
);

// ------------------------------------------------------------------
// GET /api/intern/timeline
// ------------------------------------------------------------------
router.get('/timeline', controller.getTimeline);

// ------------------------------------------------------------------
// GET /api/intern/presentations
// ------------------------------------------------------------------
router.get('/presentations', controller.getPresentations);

module.exports = router;
