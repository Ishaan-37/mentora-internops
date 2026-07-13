// routes/professorRoutes.js
// Professor-related endpoints. Mixed access:
//   - Admin-only: add, list, delete professors
//   - Professor-only: own profile, own research scholars

const express  = require('express');
const { body, param } = require('express-validator');

const controller                 = require('../controllers/professorController');
const { authenticate }           = require('../middleware/auth');
const { requireAdmin, requireProfessor } = require('../middleware/rbac');
const { handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

// All routes require login
router.use(authenticate);

// ------------------------------------------------------------------
// POST /api/professors/add
// Admin only.
// ------------------------------------------------------------------
router.post(
  '/add',
  requireAdmin,
  [
    body('name').trim().notEmpty().withMessage('Full name is required.'),
    body('email').isEmail().withMessage('Valid email required.').normalizeEmail(),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter.')
      .matches(/[0-9]/).withMessage('Password must contain a number.'),
    body('department').optional().trim(),
  ],
  handleValidationErrors,
  controller.addProfessor
);

// ------------------------------------------------------------------
// GET /api/professors
// Admin only — list all professors.
// ------------------------------------------------------------------
router.get('/', requireAdmin, controller.getAllProfessors);

// ------------------------------------------------------------------
// DELETE /api/professors/:id
// Admin only.
// ------------------------------------------------------------------
router.delete(
  '/:id',
  requireAdmin,
  [param('id').isUUID().withMessage('Valid professor ID required.')],
  handleValidationErrors,
  controller.deleteProfessor
);

// ------------------------------------------------------------------
// GET /api/professors/me
// Professor only — own profile.
// ------------------------------------------------------------------
router.get('/me', requireProfessor, controller.getMyProfile);

// ------------------------------------------------------------------
// GET /api/professors/my-scholars
// Professor only — own research scholars (via professor_research_scholars).
// ------------------------------------------------------------------
router.get('/my-scholars', requireProfessor, controller.getMyScholars);

module.exports = router;
