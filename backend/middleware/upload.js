// middleware/upload.js
// Multer configuration for file uploads (submissions).
// Validates file type and size before saving to disk.
// In production, swap diskStorage for an S3 multer-storage adapter —
// the rest of the app only depends on req.file.path / req.file.filename,
// so the swap is contained to this file.

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const MAX_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10;

// Ensure upload dir exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowed extensions per submission category
const ALLOWED_EXTENSIONS = {
  pdf:   ['.pdf'],
  files: ['.zip', '.py', '.js', '.ts', '.jsx', '.tsx', '.txt', '.java', '.cpp', '.c', '.go', '.json', '.yml', '.yaml', '.md'],
};

const ALL_ALLOWED = [...ALLOWED_EXTENSIONS.pdf, ...ALLOWED_EXTENSIONS.files];

// ------------------------------------------------------------------
// Storage engine — disk storage with randomized filenames
// (prevents path traversal + filename collisions + leaking original names)
// ------------------------------------------------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomName}${ext}`);
  },
});

// ------------------------------------------------------------------
// File filter — rejects disallowed extensions before they touch disk
// ------------------------------------------------------------------
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALL_ALLOWED.includes(ext)) {
    return cb(
      new Error(`File type ${ext} not allowed. Accepted: ${ALL_ALLOWED.join(', ')}`),
      false
    );
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE_MB * 1024 * 1024,
    files: 1, // one file per submission
  },
});

// ------------------------------------------------------------------
// Express middleware wrapper — converts multer errors into our
// standard JSON error shape instead of letting them throw raw.
// ------------------------------------------------------------------
const uploadSingle = (fieldName) => (req, res, next) => {
  const handler = upload.single(fieldName);
  handler(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size: ${MAX_SIZE_MB}MB.`,
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

module.exports = { uploadSingle, UPLOAD_DIR, ALLOWED_EXTENSIONS };
