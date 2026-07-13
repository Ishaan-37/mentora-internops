// routes/mentor.js
// All mentor-only endpoints. Every route requires authenticate + requireMentor.

const express  = require('express');
const { body, param, query } = require('express-validator');

const controller                 = require('../controllers/mentorController');
const { authenticate }           = require('../middleware/auth');
const { requireMentor }          = require('../middleware/rbac');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate, requireMentor);

// ------------------------------------------------------------------
// GET /api/mentor/my-interns
// ------------------------------------------------------------------
router.get('/my-interns', controller.getMyInterns);

// ------------------------------------------------------------------
// GET /api/mentor/directory  (all mentors, institution-wide — RISE)
// ------------------------------------------------------------------
router.get('/directory', controller.getMentorDirectory);

// ------------------------------------------------------------------
// GET /api/mentor/intern/:id
// ------------------------------------------------------------------
router.get(
  '/intern/:id',
  [param('id').isUUID().withMessage('Valid intern ID required.')],
  handleValidationErrors,
  controller.getInternDetail
);

// ------------------------------------------------------------------
// POST /api/mentor/create-work-item
// ------------------------------------------------------------------
router.post(
  '/create-work-item',
  [
    body('title').trim().notEmpty().withMessage('Title is required.'),
    body('description').trim().notEmpty().withMessage('Description is required.'),
    body('type').isIn(['assignment', 'task', 'project']).withMessage('Type must be assignment, task, or project.'),
    body('internId').isUUID().withMessage('Valid intern ID required.'),
    body('deadline').isISO8601().withMessage('Valid deadline (ISO date) required.'),
    body('submissionFormat')
      .optional()
      .isIn(['pdf', 'gdrive', 'github', 'files', 'any'])
      .withMessage('Invalid submission format.'),
    body('allowDeadlineExtension').optional().isBoolean(),
  ],
  handleValidationErrors,
  controller.createWorkItem
);

// ------------------------------------------------------------------
// PUT /api/mentor/update-work-item/:id
// ------------------------------------------------------------------
router.put(
  '/update-work-item/:id',
  [
    param('id').isUUID().withMessage('Valid work item ID required.'),
    body('title').optional().trim().notEmpty(),
    body('description').optional().trim().notEmpty(),
    body('deadline').optional().isISO8601(),
  ],
  handleValidationErrors,
  controller.updateWorkItem
);

// ------------------------------------------------------------------
// GET /api/mentor/submissions?review=pending|approved|rejected
// ------------------------------------------------------------------
router.get(
  '/submissions',
  [query('review').optional().isIn(['pending', 'approved', 'rejected'])],
  handleValidationErrors,
  controller.getSubmissions
);

// ------------------------------------------------------------------
// PUT /api/mentor/review-submission/:id
// ------------------------------------------------------------------
router.put(
  '/review-submission/:id',
  [
    param('id').isUUID().withMessage('Valid submission ID required.'),
    body('decision').isIn(['approved', 'rejected']).withMessage('Decision must be approved or rejected.'),
    body('feedbackText').optional().trim(),
  ],
  handleValidationErrors,
  controller.reviewSubmission
);

// ------------------------------------------------------------------
// GET /api/mentor/analytics/:internId
// ------------------------------------------------------------------
router.get(
  '/analytics/:internId',
  [param('internId').isUUID().withMessage('Valid intern ID required.')],
  handleValidationErrors,
  controller.getInternAnalytics
);

// ------------------------------------------------------------------
// POST /api/mentor/schedule-presentation
// ------------------------------------------------------------------
router.post(
  '/schedule-presentation',
  [
    body('internId').isUUID().withMessage('Valid intern ID required.'),
    body('title').trim().notEmpty().withMessage('Title is required.'),
    body('date').isDate().withMessage('Valid date (YYYY-MM-DD) required.'),
    body('time').matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Valid time (HH:MM) required.'),
    body('notes').optional().trim(),
  ],
  handleValidationErrors,
  controller.schedulePresentation
);

module.exports = router;
