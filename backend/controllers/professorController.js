// controllers/professorController.js
//
// Two groups of operations live here:
//
//   1. ADMIN-FACING — creating, listing, deleting professors.
//      (Admin keeps god-mode — these mirror adminController's
//      addMentor/addAdmin pattern exactly.)
//
//   2. PROFESSOR-FACING — a professor viewing/managing their own
//      research scholars. Scoped to req.user.id, same discipline
//      as mentorController's "only your own interns" rule.
//
// professor_research_scholars (the mapping table) does not exist
// yet — Step 4 in the build order. getMyScholars() below will be
// wired up once that table lands; for now it returns an empty
// array via a guarded query so the route doesn't 500 if called early.

const bcrypt = require('bcrypt');
const db     = require('../config/db');
const logger = require('../config/logger');

const BCRYPT_ROUNDS = () => parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;

// ==================================================================
// ADMIN-FACING
// ==================================================================

// ------------------------------------------------------------------
// POST /api/professors/add
// Body: { name, email, password, department }
// Admin only.
// ------------------------------------------------------------------
const addProfessor = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { name, email, password, department } = req.body;

    // Email uniqueness check (users table is the single source of truth for login)
    const { rows: existing } = await client.query(
      'SELECT id FROM users WHERE email = LOWER($1)',
      [email.trim()]
    );
    if (existing.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Email already in use.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS());

    // Create the auth-level user row
    const { rows: [user] } = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, LOWER($2), $3, 'professor')
       RETURNING id, name, email, role, created_at`,
      [name.trim(), email.trim(), passwordHash]
    );

    // Create the professor profile row (professors.user_id -> users.id)
    const { rows: [professor] } = await client.query(
      `INSERT INTO professors (user_id, department)
       VALUES ($1, $2)
       RETURNING id, department`,
      [user.id, department?.trim() || null]
    );

    await client.query('COMMIT');
    logger.info('Professor created', { by: req.user.id, professorUserId: user.id });

    return res.status(201).json({
      success: true,
      message: 'Professor created successfully.',
      data: { user, professor },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('addProfessor error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  } finally {
    client.release();
  }
};

// ------------------------------------------------------------------
// GET /api/professors
// List all professors. Admin only.
// ------------------------------------------------------------------
const getAllProfessors = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, u.is_active, u.created_at,
              p.id AS professor_id, p.department
       FROM   users u
       JOIN   professors p ON p.user_id = u.id
       WHERE  u.role = 'professor'
       ORDER  BY u.name ASC`
    );

    return res.status(200).json({ success: true, data: { professors: rows } });
  } catch (err) {
    logger.error('getAllProfessors error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// DELETE /api/professors/:id
// :id is professors.id (not users.id) — soft-deletes the linked user.
// Admin only.
// ------------------------------------------------------------------
const deleteProfessor = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await db.query(
      `SELECT u.id AS user_id, u.name
       FROM   professors p
       JOIN   users u ON u.id = p.user_id
       WHERE  p.id = $1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Professor not found.' });
    }

    await db.query(
      'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
      [rows[0].user_id]
    );

    logger.info('Professor deactivated', { by: req.user.id, professorId: id });
    return res.status(200).json({
      success: true,
      message: `${rows[0].name} deactivated successfully.`,
    });
  } catch (err) {
    logger.error('deleteProfessor error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ==================================================================
// PROFESSOR-FACING
// ==================================================================

// ------------------------------------------------------------------
// GET /api/professors/me
// A professor's own profile. Professor only.
// ------------------------------------------------------------------
const getMyProfile = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, p.department
       FROM   users u
       JOIN   professors p ON p.user_id = u.id
       WHERE  u.id = $1`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Professor profile not found.' });
    }

    return res.status(200).json({ success: true, data: { professor: rows[0] } });
  } catch (err) {
    logger.error('getMyProfile error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/professors/my-scholars
// A professor's assigned research scholars (mentors).
// Professor only. Scoped to req.user.id.
//
// The table-existence check below is now a no-op safety net now
// that professor_research_scholars exists (Step 4 complete) —
// left in place so this endpoint never 500s even if someone runs
// an older migration path.
// ------------------------------------------------------------------
const getMyScholars = async (req, res) => {
  try {
    const { rows: tableCheck } = await db.query(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE  table_name = 'professor_research_scholars'
       ) AS exists`
    );

    if (!tableCheck[0].exists) {
      return res.status(200).json({
        success: true,
        data: { scholars: [] },
        message: 'professor_research_scholars table not created yet (Step 4 pending).',
      });
    }

    const { rows } = await db.query(
      `SELECT
    u.id,
    u.name,
    u.email,
    m.mentor_role,
    COUNT(DISTINCT mi.intern_id) AS intern_count
FROM professor_research_scholars prs
JOIN mentors m
    ON m.id = prs.mentor_id
JOIN users u
    ON u.id = m.user_id
LEFT JOIN mentors_interns mi
    ON mi.mentor_id = m.id
WHERE prs.professor_id = (
    SELECT id
    FROM professors
    WHERE user_id = $1
)
GROUP BY
    u.id,
    u.name,
    u.email,
    m.mentor_role
ORDER BY u.name ASC`,
      [req.user.id]
    );

    return res.status(200).json({ success: true, data: { scholars: rows } });
  } catch (err) {
    logger.error('getMyScholars error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  addProfessor,
  getAllProfessors,
  deleteProfessor,
  getMyProfile,
  getMyScholars,
};
