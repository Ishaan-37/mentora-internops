// controllers/mentorController.js
// All mentor-facing operations: viewing assigned interns, creating work
// items (assignment/task/project), reviewing submissions, and the
// institution-wide mentor directory.
//
// IMPORTANT — visibility rule:
// Every function EXCEPT getMentorDirectory() scopes its queries to
// `mentor_id = req.user.id`. A mentor can only ever see their own
// interns' data. getMentorDirectory() is the one deliberate exception —
// it reads across ALL mentors institution-wide (RISE program requirement).

const db     = require('../config/db');
const logger = require('../config/logger');

// ------------------------------------------------------------------
// GET /api/mentor/my-interns
// Returns every intern assigned to the logged-in mentor, with
// progress %, overdue count, and days left.
// ------------------------------------------------------------------
const getMyInterns = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email,
              b.name AS batch_name,
              b.end_date,
              (b.end_date - CURRENT_DATE) AS days_left,
              COALESCE(
                ROUND(
                  (COUNT(wi.id) FILTER (WHERE wi.status = 'completed')::numeric /
                   NULLIF(COUNT(wi.id), 0)) * 100
                ), 0
              ) AS progress,
              COUNT(wi.id) FILTER (WHERE wi.status = 'overdue')  AS overdue_count,
              COUNT(wi.id) FILTER (WHERE wi.status = 'pending')  AS pending_count,
              COUNT(wi.id)                                       AS total_items
       FROM   users u
       JOIN   internships i ON i.intern_id = u.id AND i.status = 'active'
       JOIN   batches b     ON b.id = i.batch_id
       LEFT JOIN work_items wi ON wi.intern_id = u.id AND wi.mentor_id = $1
       WHERE  u.role = 'intern'
         AND  u.is_active = TRUE
         AND  i.mentor_id = $1
       GROUP  BY u.id, u.name, u.email, b.name, b.end_date
       ORDER  BY u.name ASC`,
      [req.user.id]
    );

    return res.status(200).json({ success: true, data: { interns: rows } });
  } catch (err) {
    logger.error('getMyInterns error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/mentor/intern/:id
// Full detail view of one intern — only if they belong to this mentor.
// ------------------------------------------------------------------
const getInternDetail = async (req, res) => {
  try {
    const { id } = req.params;

    // Ownership check — this mentor must actually be assigned to this intern
    const { rows: ownershipCheck } = await db.query(
      `SELECT 1 FROM internships
       WHERE intern_id = $1 AND mentor_id = $2 AND status = 'active'`,
      [id, req.user.id]
    );

    if (!ownershipCheck.length) {
      return res.status(403).json({
        success: false,
        message: 'This intern is not assigned to you.',
      });
    }

    const { rows: internRows } = await db.query(
      `SELECT u.id, u.name, u.email, i.start_date, i.end_date, b.name AS batch_name
       FROM   users u
       JOIN   internships i ON i.intern_id = u.id AND i.status = 'active'
       JOIN   batches b ON b.id = i.batch_id
       WHERE  u.id = $1`,
      [id]
    );

    const { rows: workItems } = await db.query(
      `SELECT id, title, type, deadline, status, submission_format, created_at
       FROM   work_items
       WHERE  intern_id = $1 AND mentor_id = $2
       ORDER  BY deadline ASC`,
      [id, req.user.id]
    );

    return res.status(200).json({
      success: true,
      data: { intern: internRows[0], workItems },
    });
  } catch (err) {
    logger.error('getInternDetail error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// POST /api/mentor/create-work-item
// Body: { title, description, type, internId, deadline, submissionFormat, allowDeadlineExtension }
// ------------------------------------------------------------------
const createWorkItem = async (req, res) => {
  try {
    const {
      title, description, type, internId,
      deadline, submissionFormat = 'any',
      allowDeadlineExtension = true,
    } = req.body;

    // Ownership check
    const { rows: ownershipCheck } = await db.query(
      `SELECT 1 FROM internships
       WHERE intern_id = $1 AND mentor_id = $2 AND status = 'active'`,
      [internId, req.user.id]
    );

    if (!ownershipCheck.length) {
      return res.status(403).json({
        success: false,
        message: 'You can only create work items for your own interns.',
      });
    }

    const { rows: [workItem] } = await db.query(
      `INSERT INTO work_items
         (title, description, type, mentor_id, intern_id, deadline,
          submission_format, allow_deadline_extension)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, type, deadline, status, created_at`,
      [
        title.trim(), description.trim(), type, req.user.id, internId,
        deadline, submissionFormat, allowDeadlineExtension,
      ]
    );

    // Notify the intern
    await db.query(
      `INSERT INTO notifications (user_id, message, type)
       VALUES ($1, $2, 'deadline')`,
      [internId, `New ${type} assigned: "${title.trim()}" — due ${new Date(deadline).toLocaleDateString('en-IN')}`]
    );

    logger.info('Work item created', { by: req.user.id, workItemId: workItem.id, internId });
    return res.status(201).json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} created successfully.`,
      data: { workItem },
    });
  } catch (err) {
    logger.error('createWorkItem error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// PUT /api/mentor/update-work-item/:id
// Body: { title?, description?, deadline? }
// ------------------------------------------------------------------
const updateWorkItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, deadline } = req.body;

    // Ownership check
    const { rows: existing } = await db.query(
      'SELECT id, intern_id, deadline AS old_deadline, allow_deadline_extension FROM work_items WHERE id = $1 AND mentor_id = $2',
      [id, req.user.id]
    );

    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Work item not found.' });
    }

    const item = existing[0];

    if (deadline && !item.allow_deadline_extension) {
      return res.status(400).json({
        success: false,
        message: 'Deadline modification is disabled for this work item.',
      });
    }

    const { rows: [updated] } = await db.query(
      `UPDATE work_items
       SET    title       = COALESCE($1, title),
              description = COALESCE($2, description),
              deadline    = COALESCE($3, deadline),
              status      = CASE WHEN $3 IS NOT NULL AND status = 'overdue' THEN 'pending' ELSE status END
       WHERE  id = $4
       RETURNING id, title, description, deadline, status`,
      [title?.trim() || null, description?.trim() || null, deadline || null, id]
    );

    // Notify intern of deadline change
    if (deadline && new Date(deadline).getTime() !== new Date(item.old_deadline).getTime()) {
      await db.query(
        `INSERT INTO notifications (user_id, message, type)
         VALUES ($1, $2, 'deadline_changed')`,
        [
          item.intern_id,
          `Deadline changed for "${updated.title}": now due ${new Date(deadline).toLocaleDateString('en-IN')}`,
        ]
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Work item updated.',
      data: { workItem: updated },
    });
  } catch (err) {
    logger.error('updateWorkItem error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/mentor/submissions?review=pending|approved|rejected
// ------------------------------------------------------------------
const getSubmissions = async (req, res) => {
  try {
    const { review } = req.query;
    const validReviews = ['pending', 'approved', 'rejected'];

    let queryText = `
      SELECT s.id, s.submission_type, s.file_url, s.external_link, s.notes,
             s.submitted_at, s.mentor_review, s.feedback_text,
             wi.title AS work_item_title, wi.type AS work_item_type,
             u.name AS intern_name, u.id AS intern_id
      FROM   submissions s
      JOIN   work_items wi ON wi.id = s.work_item_id
      JOIN   users u ON u.id = s.intern_id
      WHERE  wi.mentor_id = $1
    `;
    const params = [req.user.id];

    if (review && validReviews.includes(review)) {
      queryText += ' AND s.mentor_review = $2';
      params.push(review);
    }

    queryText += ' ORDER BY s.submitted_at DESC';

    const { rows } = await db.query(queryText, params);
    return res.status(200).json({ success: true, data: { submissions: rows } });
  } catch (err) {
    logger.error('getSubmissions error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// PUT /api/mentor/review-submission/:id
// Body: { decision: 'approved' | 'rejected', feedbackText }
// ------------------------------------------------------------------
const reviewSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, feedbackText } = req.body;

    if (decision === 'rejected' && !feedbackText?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Feedback is required when rejecting a submission.',
      });
    }

    // Ownership check via work_items.mentor_id
    const { rows: existing } = await db.query(
      `SELECT s.id, s.intern_id, s.work_item_id, wi.title
       FROM   submissions s
       JOIN   work_items wi ON wi.id = s.work_item_id
       WHERE  s.id = $1 AND wi.mentor_id = $2`,
      [id, req.user.id]
    );

    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Submission not found.' });
    }

    const submission = existing[0];

    const { rows: [updated] } = await db.query(
      `UPDATE submissions
       SET    mentor_review = $1, feedback_text = $2, reviewed_at = NOW()
       WHERE  id = $3
       RETURNING id, mentor_review, feedback_text, reviewed_at`,
      [decision, feedbackText?.trim() || null, id]
    );

    // If approved, mark work item completed
    if (decision === 'approved') {
      await db.query(
        `UPDATE work_items SET status = 'completed' WHERE id = $1`,
        [submission.work_item_id]
      );
    }

    // Notify intern
    const notifType = decision === 'approved' ? 'submission_approved' : 'submission_rejected';
    const message = decision === 'approved'
      ? `Your submission for "${submission.title}" was approved.`
      : `Your submission for "${submission.title}" was rejected. Feedback: ${feedbackText.trim()}`;

    await db.query(
      `INSERT INTO notifications (user_id, message, type) VALUES ($1, $2, $3)`,
      [submission.intern_id, message, notifType]
    );

    return res.status(200).json({
      success: true,
      message: `Submission ${decision}.`,
      data: { submission: updated },
    });
  } catch (err) {
    logger.error('reviewSubmission error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/mentor/analytics/:internId
// Per-intern analytics for the mentor's own intern
// ------------------------------------------------------------------
const getInternAnalytics = async (req, res) => {
  try {
    const { internId } = req.params;

    const { rows: ownershipCheck } = await db.query(
      `SELECT 1 FROM internships
       WHERE intern_id = $1 AND mentor_id = $2 AND status = 'active'`,
      [internId, req.user.id]
    );

    if (!ownershipCheck.length) {
      return res.status(403).json({ success: false, message: 'This intern is not assigned to you.' });
    }

    const { rows: [stats] } = await db.query(
      `SELECT
         COUNT(wi.id) AS total_tasks,
         COUNT(wi.id) FILTER (WHERE wi.status = 'completed') AS completed,
         COUNT(wi.id) FILTER (WHERE wi.status = 'overdue')   AS overdue,
         COUNT(wi.id) FILTER (WHERE wi.status = 'pending')   AS pending,
         COUNT(s.id) AS total_submissions,
         COUNT(s.id) FILTER (WHERE s.mentor_review = 'approved') AS approved_submissions,
         COUNT(s.id) FILTER (WHERE s.mentor_review = 'rejected') AS rejected_submissions,
         ROUND(AVG(EXTRACT(EPOCH FROM (s.submitted_at - wi.created_at)) / 86400)) AS avg_completion_days
       FROM   work_items wi
       LEFT JOIN submissions s ON s.work_item_id = wi.id
       WHERE  wi.intern_id = $1 AND wi.mentor_id = $2`,
      [internId, req.user.id]
    );

    const { rows: weeklyPerformance } = await db.query(
      `SELECT tw.week_number, tw.status, tw.title
       FROM   timeline_weeks tw
       JOIN   internships i ON i.id = tw.internship_id
       WHERE  i.intern_id = $1 AND i.mentor_id = $2
       ORDER  BY tw.week_number ASC`,
      [internId, req.user.id]
    );

    return res.status(200).json({
      success: true,
      data: { stats, weeklyPerformance },
    });
  } catch (err) {
    logger.error('getInternAnalytics error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// POST /api/mentor/schedule-presentation
// Body: { internId, title, date, time, notes }
// ------------------------------------------------------------------
const schedulePresentation = async (req, res) => {
  try {
    const { internId, title, date, time, notes } = req.body;

    const { rows: ownershipCheck } = await db.query(
      `SELECT 1 FROM internships
       WHERE intern_id = $1 AND mentor_id = $2 AND status = 'active'`,
      [internId, req.user.id]
    );

    if (!ownershipCheck.length) {
      return res.status(403).json({ success: false, message: 'This intern is not assigned to you.' });
    }

    const { rows: [presentation] } = await db.query(
      `INSERT INTO presentations (intern_id, mentor_id, title, date, time, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, date, time, status`,
      [internId, req.user.id, title.trim(), date, time, notes?.trim() || null]
    );

    await db.query(
      `INSERT INTO notifications (user_id, message, type)
       VALUES ($1, $2, 'presentation')`,
      [internId, `Presentation scheduled: "${title.trim()}" on ${new Date(date).toLocaleDateString('en-IN')} at ${time}`]
    );

    return res.status(201).json({
      success: true,
      message: 'Presentation scheduled.',
      data: { presentation },
    });
  } catch (err) {
    logger.error('schedulePresentation error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/mentor/directory
// DELIBERATE EXCEPTION to per-mentor scoping (see file header).
// Returns ALL mentors institution-wide for the RISE program directory.
// Identity + role + intern count only — no access to other mentors'
// intern work items or submissions.
// ------------------------------------------------------------------
const getMentorDirectory = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, m.mentor_role,
              COUNT(DISTINCT mi.intern_id) AS intern_count
       FROM   users u
       JOIN   mentors m ON m.user_id = u.id
       LEFT JOIN mentors_interns mi ON mi.mentor_id = u.id
       WHERE  u.role = 'mentor' AND u.is_active = TRUE
       GROUP  BY u.id, u.name, u.email, m.mentor_role
       ORDER  BY u.name ASC`
    );

    return res.status(200).json({ success: true, data: { mentors: rows } });
  } catch (err) {
    logger.error('getMentorDirectory error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  getMyInterns,
  getInternDetail,
  createWorkItem,
  updateWorkItem,
  getSubmissions,
  reviewSubmission,
  getInternAnalytics,
  schedulePresentation,
  getMentorDirectory,
};
