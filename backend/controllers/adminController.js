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
// Body: { name, email, password, mentorRole, professorId }
//   mentorRole: 'research_scholar' | 'student'
//   professorId: professors.id (optional — links scholar to a professor)
// ------------------------------------------------------------------
const addMentor = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { name, email, password, mentorRole = 'research_scholar', professorId } = req.body;

    const { rows: existing } = await client.query(
      'SELECT id FROM users WHERE email = LOWER($1)',
      [email.trim()]
    );
    if (existing.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Email already in use.' });
    }

    // Validate professor exists, if one was supplied
    if (professorId) {
      const { rows: professorCheck } = await client.query(
        'SELECT id FROM professors WHERE id = $1',
        [professorId]
      );
      if (!professorCheck.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Professor not found.' });
      }
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS());

    const { rows: [user] } = await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, LOWER($2), $3, 'mentor')
       RETURNING id, name, email, role, created_at`,
      [name.trim(), email.trim(), passwordHash]
    );

    const { rows: [mentor] } = await client.query(
      `INSERT INTO mentors (user_id, mentor_role)
       VALUES ($1, $2)
       RETURNING id`,
      [user.id, mentorRole]
    );

    // Link this research scholar to their professor, if provided
    if (professorId) {
      await client.query(
        `INSERT INTO professor_research_scholars (professor_id, mentor_id)
         VALUES ($1, $2)`,
        [professorId, mentor.id]
      );
    }

    await client.query('COMMIT');
    logger.info('Mentor created', { by: req.user.id, mentorId: user.id, professorId: professorId || null });

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

    // Remove any existing mentor link for this intern (one intern = one mentor at a time)
    await client.query(
      `DELETE FROM mentors_interns WHERE intern_id = $1`,
      [internId]
    );

    // Insert the new mentor link
    await client.query(
      `INSERT INTO mentors_interns (mentor_id, intern_id) VALUES ($1, $2)`,
      [mentorId, internId]
    );

    // Update internships record if it exists, or create one if it doesn't
    // (intern may have been created without going through addIntern)
    const { rows: existingInternship } = await client.query(
      `SELECT id FROM internships WHERE intern_id = $1 AND status = 'active'`,
      [internId]
    );

    if (existingInternship.length) {
      await client.query(
        `UPDATE internships SET mentor_id = $1, updated_at = NOW()
         WHERE intern_id = $2 AND status = 'active'`,
        [mentorId, internId]
      );
    } else {
      // Get the most recent batch as a fallback
      const { rows: batchRows } = await client.query(
        `SELECT id, start_date, end_date FROM batches ORDER BY created_at DESC LIMIT 1`
      );
      if (batchRows.length) {
        await client.query(
          `INSERT INTO internships (intern_id, batch_id, mentor_id, start_date, end_date, status)
           VALUES ($1, $2, $3, $4, $5, 'active')`,
          [internId, batchRows[0].id, mentorId, batchRows[0].start_date, batchRows[0].end_date]
        );
      }
    }

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
    const validRoles = ['admin', 'professor', 'mentor', 'intern'];

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

// ------------------------------------------------------------------
// GET /api/admin/assignments
// Returns current intern → mentor → professor mapping for the
// Assign tab confirmation table
// ------------------------------------------------------------------
const getAssignments = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         u_intern.id          AS intern_id,
         u_intern.name        AS intern_name,
         u_intern.email       AS intern_email,
         COALESCE(b.name, '—')  AS batch_name,
         u_mentor.id          AS mentor_id,
         u_mentor.name        AS mentor_name,
         COALESCE(u_prof.name, '—') AS professor_name,
         COALESCE(i.status, 'active') AS internship_status
       FROM   mentors_interns mi
       JOIN   users u_intern ON u_intern.id = mi.intern_id
       JOIN   users u_mentor ON u_mentor.id = mi.mentor_id
       LEFT JOIN internships i   ON i.intern_id = mi.intern_id AND i.status = 'active'
       LEFT JOIN batches b       ON b.id = i.batch_id
       LEFT JOIN mentors m       ON m.user_id = mi.mentor_id
       LEFT JOIN professor_research_scholars prs ON prs.research_scholar_id = m.id
       LEFT JOIN professors p    ON p.id = prs.professor_id
       LEFT JOIN users u_prof    ON u_prof.id = p.user_id
       WHERE  u_intern.is_active = TRUE
       ORDER  BY u_intern.name ASC`
    );

    return res.status(200).json({ success: true, data: { assignments: rows } });
  } catch (err) {
    logger.error('getAssignments error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  addAdmin,
  addMentor,
  addIntern,
  assignMentor,
  getAssignments,
  createBatch,
  getAllUsers,
  getAllBatches,
  deleteUser,
  getDashboard,
};
