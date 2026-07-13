// middleware/rbac.js
// Role-Based Access Control (RBAC) middleware factories.
// Always use AFTER authenticate middleware.
//
// Usage:
//   router.get('/admin/users', authenticate, requireAdmin, handler)
//   router.get('/intern/dashboard', authenticate, requireIntern, handler)
//   router.get('/any/route', authenticate, requireRole(['admin','mentor']), handler)

const requireRole = (roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Required role: ${roles.join(' or ')}.`,
    });
  }

  next();
};

// Convenience wrappers for the user tiers
const requireAdmin     = requireRole(['admin']);
const requireProfessor = requireRole(['professor']);
const requireMentor    = requireRole(['mentor']);
const requireIntern    = requireRole(['intern']);

// Admin or Professor can access (e.g. Professor-management routes)
const requireAdminOrProfessor = requireRole(['admin', 'professor']);

// Admin or Mentor can access (e.g. reviewing submissions)
const requireAdminOrMentor = requireRole(['admin', 'mentor']);

// Any authenticated user
const requireAnyRole = requireRole(['admin', 'professor', 'mentor', 'intern']);

// ------------------------------------------------------------------
// requireSelfOrAdmin
// Ensures a user can only access their own resource, unless they are admin.
// Reads :userId from route params.
//
// Usage:
//   router.get('/users/:userId/profile', authenticate, requireSelfOrAdmin, handler)
// ------------------------------------------------------------------
const requireSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  const { userId } = req.params;

  if (req.user.role === 'admin' || req.user.id === userId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. You can only access your own data.',
  });
};

module.exports = {
  requireRole,
  requireAdmin,
  requireProfessor,
  requireMentor,
  requireIntern,
  requireAdminOrProfessor,
  requireAdminOrMentor,
  requireAnyRole,
  requireSelfOrAdmin,
};
