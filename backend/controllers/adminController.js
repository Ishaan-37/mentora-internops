// controllers/adminController.js
// All admin-only operations: creating users, batches, and assignments.
// Every function here requires role = 'admin' (enforced in routes/admin.js).

const bcrypt = require('bcrypt');
const db     = require('../config/db');
const logger = require('../config/logger');

const BCRYPT_ROUNDS = () => parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;

// ------------------------------------------------------------------
// POST /api/admin/add-admin
// Body: { name, email, password, professorName, department }
// ------------------------------------------------------------------
const addAdmin = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { name, email, password, professorName, department } = req.body;

    // Check email uniqueness
    const { rows: existing } = await client.query(
      'SELECT id FROM users WHERE email = LOWER($1)',
      [email.trim()]
    );
    if (existing.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Email already in use.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS());

    // Insert into users
    const { rows: [user] } = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, LOWER($2), $3, 'admin')
       RETURNING id, name, email, role, created_at`,
      [name.trim(), email.trim(), passwordHash]
    );

    // Insert admin profile
    await client.query(
      `INSERT INTO admins (user_id, professor_name, department)
       VALUES ($1, $2, $3)`,
      [user.id, professorName.trim(), department?.trim() || null]
    );

    await client.query('COMMIT');
    logger.info('Admin created', { by: req.user.id, newAdminId: user.id });

    return res.status(201).json({
      success: true,
      message: 'Admin created successfully.',
      data: { user },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('addAdmin error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  } finally {
    client.release();
  }
};

// ------------------------------------------------------------------
// POST /api/admin/add-mentor
// Body: { name, email, password, mentorRole }
//   mentorRole: 'research_scholar' | 'student'
// ------------------------------------------------------------------
const addMentor = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { name, email, password, mentorRole = 'research_scholar' } = req.body;

    const { rows: existing } = await client.query(
      'SELECT id FROM users WHERE email = LOWER($1)',
      [email.trim()]
    );
    if (existing.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Email already in use.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS());

    const { rows: [user] } = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, LOWER($2), $3, 'mentor')
       RETURNING id, name, email, role, created_at`,
      [name.trim(), email.trim(), passwordHash]
    );

    await client.query(
      `INSERT INTO mentors (user_id, mentor_role) VALUES ($1, $2)`,
      [user.id, mentorRole]
    );

    await client.query('COMMIT');
    logger.info('Mentor created', { by: req.user.id, mentorId: user.id });

    return res.status(201).json({
      success: true,
      message: 'Mentor created successfully.',
      data: { user },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('addMentor error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  } finally {
    client.release();
  }
};

// ------------------------------------------------------------------
// POST /api/admin/add-intern
// Body: { name, email, password, batchId, mentorId }
// Creates user, internship record, and mentor→intern link
// ------------------------------------------------------------------
const addIntern = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { name, email, password, batchId, mentorId } = req.body;

    // Validate batch exists
    const { rows: batchRows } = await client.query(
      'SELECT id, start_date, end_date FROM batches WHERE id = $1',
      [batchId]
    );
    if (!batchRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    // Validate mentor exists and is a mentor
    const { rows: mentorRows } = await client.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'mentor'",
      [mentorId]
    );
    if (!mentorRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Mentor not found.' });
    }

    // Check email uniqueness
    const { rows: existing } = await client.query(
      'SELECT id FROM users WHERE email = LOWER($1)',
      [email.trim()]
    );
    if (existing.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Email already in use.' });
    }

    const batch = batchRows[0];
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS());

    // Create user
    const { rows: [user] } = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, LOWER($2), $3, 'intern')
       RETURNING id, name, email, role, created_at`,
      [name.trim(), email.trim(), passwordHash]
    );

    // Create internship record
    await client.query(
      `INSERT INTO internships (intern_id, batch_id, mentor_id, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, batchId, mentorId, batch.start_date, batch.end_date]
    );

    // Create mentor→intern link
    await client.query(
      `INSERT INTO mentors_interns (mentor_id, intern_id) VALUES ($1, $2)`,
      [mentorId, user.id]
    );

    await client.query('COMMIT');
    logger.info('Intern created', { by: req.user.id, internId: user.id, batchId, mentorId });

    return res.status(201).json({
      success: true,
      message: 'Intern created and assigned successfully.',
      data: { user },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('addIntern error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  } finally {
    client.release();
  }
};

// ------------------------------------------------------------------
// POST /api/admin/assign-mentor
// Body: { internId, mentorId }
// Re-assigns an intern to a different mentor
// ------------------------------------------------------------------
const assignMentor = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { internId, mentorId } = req.body;

    // Validate both users exist
    const { rows: internRows } = await client.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'intern'",
      [internId]
    );
    if (!internRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Intern not found.' });
    }

    const { rows: mentorRows } = await client.query(
      "SELECT id FROM users WHERE id = $1 AND role = 'mentor'",
      [mentorId]
    );
    if (!mentorRows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Mentor not found.' });
    }

    // Upsert the mentor_interns link
    await client.query(
      `INSERT INTO mentors_interns (mentor_id, intern_id)
       VALUES ($1, $2)
       ON CONFLICT (mentor_id, intern_id) DO NOTHING`,
      [mentorId, internId]
    );

    // Update internship record's mentor_id
    await client.query(
      `UPDATE internships SET mentor_id = $1, updated_at = NOW()
       WHERE intern_id = $2 AND status = 'active'`,
      [mentorId, internId]
    );

    await client.query('COMMIT');
    logger.info('Mentor reassigned', { by: req.user.id, internId, mentorId });

    return res.status(200).json({
      success: true,
      message: 'Mentor assigned successfully.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('assignMentor error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  } finally {
    client.release();
  }
};

// ------------------------------------------------------------------
// POST /api/admin/create-batch
// Body: { name, startDate, endDate }
// ------------------------------------------------------------------
const createBatch = async (req, res) => {
  try {
    const { name, startDate, endDate } = req.body;

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date.',
      });
    }

    const { rows: [batch] } = await db.query(
      `INSERT INTO batches (name, start_date, end_date, admin_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, start_date, end_date, created_at`,
      [name.trim(), startDate, endDate, req.user.id]
    );

    logger.info('Batch created', { by: req.user.id, batchId: batch.id });
    return res.status(201).json({
      success: true,
      message: 'Batch created successfully.',
      data: { batch },
    });
  } catch (err) {
    logger.error('createBatch error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/admin/all-users?role=intern|mentor|admin
// ------------------------------------------------------------------
const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const validRoles = ['admin', 'mentor', 'intern'];

    let queryText = `
      SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at, u.last_login_at
      FROM   users u
    `;
    const params = [];

    if (role && validRoles.includes(role)) {
      queryText += ' WHERE u.role = $1';
      params.push(role);
    }

    queryText += ' ORDER BY u.created_at DESC';

    const { rows } = await db.query(queryText, params);
    return res.status(200).json({ success: true, data: { users: rows } });
  } catch (err) {
    logger.error('getAllUsers error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/admin/all-batches
// ------------------------------------------------------------------
const getAllBatches = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT b.id, b.name, b.start_date, b.end_date, b.created_at,
              u.name AS created_by,
              COUNT(i.id) AS intern_count
       FROM   batches b
       JOIN   users u ON u.id = b.admin_id
       LEFT JOIN internships i ON i.batch_id = b.id
       GROUP  BY b.id, u.name
       ORDER  BY b.start_date DESC`
    );
    return res.status(200).json({ success: true, data: { batches: rows } });
  } catch (err) {
    logger.error('getAllBatches error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// DELETE /api/admin/delete-user/:id
// ------------------------------------------------------------------
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.',
      });
    }

    const { rows } = await db.query(
      'SELECT id, name, role FROM users WHERE id = $1',
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Soft delete — deactivate instead of hard delete to preserve data integrity
    await db.query(
      'UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
      [id]
    );

    logger.info('User deactivated', { by: req.user.id, targetId: id, role: rows[0].role });
    return res.status(200).json({
      success: true,
      message: `${rows[0].name} deactivated successfully.`,
    });
  } catch (err) {
    logger.error('deleteUser error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/admin/dashboard
// Institution-wide stats for the admin dashboard
// ------------------------------------------------------------------
const getDashboard = async (req, res) => {
  try {
    const [usersResult, batchResult, workResult, submissionResult] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE role = 'intern') AS total_interns,
          COUNT(*) FILTER (WHERE role = 'mentor') AS total_mentors,
          COUNT(*) FILTER (WHERE role = 'admin')  AS total_admins
        FROM users WHERE is_active = TRUE
      `),
      db.query(`
        SELECT COUNT(*) AS active_batches,
               STRING_AGG(name, ', ' ORDER BY start_date DESC) AS batch_names
        FROM   batches
        WHERE  end_date >= CURRENT_DATE
      `),
      db.query(`
        SELECT
          COUNT(*) AS total_work_items,
          COUNT(*) FILTER (WHERE status = 'completed') AS completed,
          COUNT(*) FILTER (WHERE status = 'overdue')   AS overdue,
          COUNT(*) FILTER (WHERE status = 'pending')   AS pending
        FROM work_items
      `),
      db.query(`
        SELECT COUNT(*) FILTER (WHERE mentor_review = 'approved') AS approved_submissions
        FROM submissions
      `),
    ]);

    const { total_interns, total_mentors, total_admins } = usersResult.rows[0];
    const { active_batches, batch_names } = batchResult.rows[0];
    const { total_work_items, completed, overdue, pending } = workResult.rows[0];

    const completionRate = total_work_items > 0
      ? Math.round((completed / total_work_items) * 100)
      : 0;

    // All interns with mentor info
    const { rows: interns } = await db.query(`
      SELECT u.id, u.name, u.email,
             mu.name AS mentor_name,
             b.name  AS batch_name,
             b.end_date,
             (b.end_date - CURRENT_DATE) AS days_left,
             COALESCE(
               ROUND(
                 (COUNT(wi.id) FILTER (WHERE wi.status = 'completed')::numeric /
                  NULLIF(COUNT(wi.id), 0)) * 100
               ), 0
             ) AS progress,
             COUNT(wi.id) FILTER (WHERE wi.status = 'overdue') AS overdue_tasks
      FROM   users u
      JOIN   internships i  ON i.intern_id  = u.id AND i.status = 'active'
      JOIN   batches b      ON b.id = i.batch_id
      JOIN   users mu       ON mu.id = i.mentor_id
      LEFT   JOIN work_items wi ON wi.intern_id = u.id
      WHERE  u.role = 'intern' AND u.is_active = TRUE
      GROUP  BY u.id, u.name, u.email, mu.name, b.name, b.end_date
      ORDER  BY u.name ASC
    `);

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalInterns:      parseInt(total_interns),
          totalMentors:      parseInt(total_mentors),
          totalAdmins:       parseInt(total_admins),
          activeBatches:     parseInt(active_batches),
          batchNames:        batch_names,
          completionRate,
          totalOverdue:      parseInt(overdue),
          totalPending:      parseInt(pending),
          approvedSubmissions: parseInt(submissionResult.rows[0].approved_submissions),
        },
        interns,
      },
    });
  } catch (err) {
    logger.error('getDashboard error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  addAdmin,
  addMentor,
  addIntern,
  assignMentor,
  createBatch,
  getAllUsers,
  getAllBatches,
  deleteUser,
  getDashboard,
};
