// middleware/validate.js
// Input sanitization and validation helpers.
// Uses express-validator for field-level validation and xss for sanitization.

const { validationResult } = require('express-validator');
const xss                  = require('xss');

// ------------------------------------------------------------------
// handleValidationErrors
// Place AFTER your express-validator chain.
// Returns 400 with a structured list of errors on failure.
//
// Usage:
//   router.post('/login', [body('email').isEmail()], handleValidationErrors, controller)
// ------------------------------------------------------------------
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: errors.array().map(({ path, msg }) => ({ field: path, message: msg })),
    });
  }

  next();
};

// ------------------------------------------------------------------
// sanitizeBody
// Recursively sanitizes all string values in req.body against XSS.
// Apply early in the middleware chain (after body-parser, before routes).
// ------------------------------------------------------------------
const sanitizeBody = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
};

// Recursively walks an object and XSS-escapes all string leaf values
function sanitizeObject(obj) {
  if (typeof obj === 'string') return xss(obj);
  if (Array.isArray(obj))     return obj.map(sanitizeObject);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, sanitizeObject(v)])
    );
  }
  return obj; // numbers, booleans, null — pass through unchanged
}

module.exports = { handleValidationErrors, sanitizeBody };
