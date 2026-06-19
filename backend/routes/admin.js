// routes/admin.js
// All admin-only endpoints.
// Every route is protected by authenticate + requireAdmin.

const express  = require('express');
const { body, param } = require('express-validator');

const controller                 = require('../controllers/adminController');
const { authenticate }           = require('../middleware/auth');
const { requireAdmin }           = require('../middleware/rbac');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

// Apply auth + admin check to ALL routes in this file
router.use(authenticate, requireAdmin);

// ------------------------------------------------------------------
// GET /api/admin/dashboard
// ------------------------------------------------------------------
router.get('/dashboard', controller.getDashboard);

// ------------------------------------------------------------------
// POST /api/admin/add-admin
// ------------------------------------------------------------------
router.post(
  '/add-admin',
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').isEmail().withMessage('Valid email required.').normalizeEmail(),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter.')
      .matches(/[0-9]/).withMessage('Password must contain a number.'),
    body('professorName').trim().notEmpty().withMessage('Professor name is required.'),
    body('department').optional().trim(),
  ],
  handleValidationErrors,
  controller.addAdmin
);

// ------------------------------------------------------------------
// POST /api/admin/add-mentor
// ------------------------------------------------------------------
router.post(
  '/add-mentor',
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').isEmail().withMessage('Valid email required.').normalizeEmail(),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter.')
      .matches(/[0-9]/).withMessage('Password must contain a number.'),
    body('mentorRole')
      .optional()
      .isIn(['research_scholar', 'student'])
      .withMessage('Mentor role must be research_scholar or student.'),
  ],
  handleValidationErrors,
  controller.addMentor
);

// ------------------------------------------------------------------
// POST /api/admin/add-intern
// ------------------------------------------------------------------
router.post(
  '/add-intern',
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').isEmail().withMessage('Valid email required.').normalizeEmail(),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter.')
      .matches(/[0-9]/).withMessage('Password must contain a number.'),
    body('batchId').isUUID().withMessage('Valid batch ID required.'),
    body('mentorId').isUUID().withMessage('Valid mentor ID required.'),
  ],
  handleValidationErrors,
  controller.addIntern
);

// ------------------------------------------------------------------
// POST /api/admin/assign-mentor
// ------------------------------------------------------------------
router.post(
  '/assign-mentor',
  [
    body('internId').isUUID().withMessage('Valid intern ID required.'),
    body('mentorId').isUUID().withMessage('Valid mentor ID required.'),
  ],
  handleValidationErrors,
  controller.assignMentor
);

// ------------------------------------------------------------------
// POST /api/admin/create-batch
// ------------------------------------------------------------------
router.post(
  '/create-batch',
  [
    body('name').trim().notEmpty().withMessage('Batch name is required.'),
    body('startDate').isDate().withMessage('Valid start date (YYYY-MM-DD) required.'),
    body('endDate').isDate().withMessage('Valid end date (YYYY-MM-DD) required.'),
  ],
  handleValidationErrors,
  controller.createBatch
);

// ------------------------------------------------------------------
// GET /api/admin/all-users?role=intern|mentor|admin
// ------------------------------------------------------------------
router.get('/all-users', controller.getAllUsers);

// ------------------------------------------------------------------
// GET /api/admin/all-batches
// ------------------------------------------------------------------
router.get('/all-batches', controller.getAllBatches);

// ------------------------------------------------------------------
// DELETE /api/admin/delete-user/:id
// ------------------------------------------------------------------
router.delete(
  '/delete-user/:id',
  [param('id').isUUID().withMessage('Valid user ID required.')],
  handleValidationErrors,
  controller.deleteUser
);

module.exports = router;
