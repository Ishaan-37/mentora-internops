// controllers/internController.js
// All intern-facing operations: dashboard, viewing/submitting work
// items, timeline, presentations, and the RISE cohort directory.
//
// IMPORTANT — visibility rule:
// Every function EXCEPT getCohortDirectory() scopes queries to
// `intern_id = req.user.id`. getCohortDirectory() is the one
// deliberate exception — it reads identity + assignment fields
// (name, mentor, professor, batch) across ALL RISE interns
// institution-wide. It never reads work_items or submissions for
// anyone but the caller.

const db     = require('../config/db');
const logger = require('../config/logger');

// ------------------------------------------------------------------
// GET /api/intern/dashboard
// ------------------------------------------------------------------
const getDashboard = async (req, res) => {
  try {
    const internId = req.user.id;

    // Active internship + mentor + batch info
    const { rows: internshipRows } = await db.query(
      `SELECT i.start_date, i.end_date, (i.end_date - CURRENT_DATE) AS days_left,
              b.name AS batch_name,
              mu.name AS mentor_name, mu.id AS mentor_id,
              au.name AS admin_name
       FROM   internships i
       JOIN   batches b ON b.id = i.batch_id
       JOIN   users mu  ON mu.id = i.mentor_id
       JOIN   users au  ON au.id = b.admin_id
       WHERE  i.intern_id = $1 AND i.status = 'active'
       ORDER  BY i.created_at DESC
       LIMIT  1`,
      [internId]
    );

    if (!internshipRows.length) {
      return res.status(404).json({
        success: false,
        message: 'No active internship found for this account.',
      });
    }

    const internship = internshipRows[0];

    // Work item counts
    const { rows: [counts] } = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'pending')   AS pending_count,
         COUNT(*) FILTER (WHERE status = 'completed') AS completed_count,
         COUNT(*) FILTER (WHERE status = 'overdue')   AS overdue_count,
         COUNT(*) FILTER (WHERE deadline::date = CURRENT_DATE) AS today_count
       FROM work_items
       WHERE intern_id = $1`,
      [internId]
    );

    // Today's tasks (quick list)
    const { rows: todaysTasks } = await db.query(
      `SELECT id, title, type, deadline, status
       FROM   work_items
       WHERE  intern_id = $1 AND deadline::date = CURRENT_DATE
       ORDER  BY deadline ASC
       LIMIT  5`,
      [internId]
    );

    // Next upcoming deadline (closest pending item)
    const { rows: nextDeadlineRows } = await db.query(
      `SELECT title, deadline
       FROM   work_items
       WHERE  intern_id = $1 AND status = 'pending'
       ORDER  BY deadline ASC
       LIMIT  1`,
      [internId]
    );

    // Next presentation
    const { rows: nextPresentationRows } = await db.query(
      `SELECT title, date, time
       FROM   presentations
       WHERE  intern_id = $1 AND status = 'scheduled' AND date >= CURRENT_DATE
       ORDER  BY date ASC, time ASC
       LIMIT  1`,
      [internId]
    );

    // Submission streak — count consecutive days with at least one submission
    // going backwards from today
    const { rows: submissionDays } = await db.query(
      `SELECT DISTINCT DATE(s.submitted_at AT TIME ZONE 'Asia/Kolkata') AS sub_date
       FROM   submissions s
       JOIN   work_items wi ON wi.id = s.work_item_id
       WHERE  wi.intern_id = $1
       ORDER  BY sub_date DESC`,
      [internId]
    );

    let streak = 0;
    if (submissionDays.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let checkDate = new Date(today);

      for (const row of submissionDays) {
        const subDate = new Date(row.sub_date);
        subDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((checkDate - subDate) / 86400000);

        if (diffDays === 0 || diffDays === 1) {
          streak++;
          checkDate = subDate;
        } else {
          break;
        }
      }
    }

    // Weekly activity — submissions per day for the last 7 days (for sparkline)
    const { rows: weeklyActivity } = await db.query(
      `SELECT
         DATE(s.submitted_at AT TIME ZONE 'Asia/Kolkata') AS activity_date,
         COUNT(*) AS count
       FROM   submissions s
       JOIN   work_items wi ON wi.id = s.work_item_id
       WHERE  wi.intern_id = $1
         AND  s.submitted_at >= NOW() - INTERVAL '7 days'
       GROUP  BY activity_date
       ORDER  BY activity_date ASC`,
      [internId]
    );

    // Overall progress percentage
    const total = parseInt(counts.pending_count) + parseInt(counts.completed_count) + parseInt(counts.overdue_count);
    const progressPct = total > 0 ? Math.round((parseInt(counts.completed_count) / total) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        internship,
        counts,
        todaysTasks,
        nextDeadline: nextDeadlineRows[0] || null,
        nextPresentation: nextPresentationRows[0] || null,
        streak,
        weeklyActivity,
        progressPct,
      },
    });
  } catch (err) {
    logger.error('getDashboard error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/intern/work-items?type=assignment|task|project
// ------------------------------------------------------------------
const getWorkItems = async (req, res) => {
  try {
    const { type } = req.query;
    const validTypes = ['assignment', 'task', 'project'];

    let queryText = `
      SELECT id, title, description, type, deadline, status, submission_format, created_at
      FROM   work_items
      WHERE  intern_id = $1
    `;
    const params = [req.user.id];

    if (type && validTypes.includes(type)) {
      queryText += ' AND type = $2';
      params.push(type);
    }

    queryText += ' ORDER BY deadline ASC';

    const { rows } = await db.query(queryText, params);
    return res.status(200).json({ success: true, data: { workItems: rows } });
  } catch (err) {
    logger.error('getWorkItems error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/intern/work-item/:id
// ------------------------------------------------------------------
const getWorkItemDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await db.query(
      `SELECT wi.*, u.name AS mentor_name,
              s.id AS submission_id, s.submission_type, s.file_url,
              s.external_link, s.notes AS submission_notes,
              s.mentor_review, s.feedback_text, s.submitted_at
       FROM   work_items wi
       JOIN   users u ON u.id = wi.mentor_id
       LEFT JOIN submissions s ON s.work_item_id = wi.id AND s.intern_id = wi.intern_id
       WHERE  wi.id = $1 AND wi.intern_id = $2`,
      [id, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Work item not found.' });
    }

    return res.status(200).json({ success: true, data: { workItem: rows[0] } });
  } catch (err) {
    logger.error('getWorkItemDetail error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// POST /api/intern/submit-work
// Body: { workItemId, submissionType, externalLink?, notes? }
// File (if any) comes via multer as req.file
// ------------------------------------------------------------------
const submitWork = async (req, res) => {
  try {
    const { workItemId, submissionType, externalLink, notes } = req.body;
    const internId = req.user.id;

    // Validate the work item belongs to this intern
    const { rows: workItemRows } = await db.query(
      'SELECT id, title, status FROM work_items WHERE id = $1 AND intern_id = $2',
      [workItemId, internId]
    );

    if (!workItemRows.length) {
      return res.status(404).json({ success: false, message: 'Work item not found.' });
    }

    // Validate submission content based on type
    const validTypes = ['pdf', 'gdrive', 'github', 'files', 'other'];
    if (!validTypes.includes(submissionType)) {
      return res.status(400).json({ success: false, message: 'Invalid submission type.' });
    }

    let fileUrl = null;
    if (['pdf', 'files'].includes(submissionType)) {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'File upload is required for this submission type.' });
      }
      fileUrl = `/uploads/${req.file.filename}`;
    }

    let linkValue = null;
    if (['gdrive', 'github'].includes(submissionType)) {
      if (!externalLink || !/^https:\/\//.test(externalLink)) {
        return res.status(400).json({
          success: false,
          message: 'A valid https:// link is required for this submission type.',
        });
      }
      linkValue = externalLink.trim();
    }

    if (submissionType === 'other' && !notes?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please describe your submission in the notes field.',
      });
    }

    // Upsert submission (re-submitting replaces the previous one)
    const { rows: [submission] } = await db.query(
      `INSERT INTO submissions
         (work_item_id, intern_id, submission_type, file_url, external_link, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (work_item_id, intern_id)
       DO UPDATE SET
         submission_type = EXCLUDED.submission_type,
         file_url        = EXCLUDED.file_url,
         external_link    = EXCLUDED.external_link,
         notes            = EXCLUDED.notes,
         submitted_at     = NOW(),
         mentor_review    = 'pending',
         feedback_text    = NULL,
         reviewed_at      = NULL
       RETURNING id, submission_type, submitted_at, mentor_review`,
      [workItemId, internId, submissionType, fileUrl, linkValue, notes?.trim() || null]
    );

    // Mark work item as completed (pending mentor review)
    await db.query(
      `UPDATE work_items SET status = 'completed' WHERE id = $1`,
      [workItemId]
    );

    logger.info('Work submitted', { internId, workItemId, submissionType });
    return res.status(201).json({
      success: true,
      message: 'Submission recorded successfully.',
      data: { submission },
    });
  } catch (err) {
    logger.error('submitWork error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/intern/submissions
// ------------------------------------------------------------------
const getMySubmissions = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT s.id, s.submission_type, s.file_url, s.external_link, s.notes,
              s.submitted_at, s.mentor_review, s.feedback_text, s.reviewed_at,
              wi.title AS work_item_title, wi.type AS work_item_type
       FROM   submissions s
       JOIN   work_items wi ON wi.id = s.work_item_id
       WHERE  s.intern_id = $1
       ORDER  BY s.submitted_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({ success: true, data: { submissions: rows } });
  } catch (err) {
    logger.error('getMySubmissions error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/intern/notifications?unreadOnly=true
// ------------------------------------------------------------------
const getNotifications = async (req, res) => {
  try {
    const { unreadOnly } = req.query;

    let queryText = 'SELECT id, message, type, is_read, created_at FROM notifications WHERE user_id = $1';
    if (unreadOnly === 'true') queryText += ' AND is_read = FALSE';
    queryText += ' ORDER BY created_at DESC LIMIT 50';

    const { rows } = await db.query(queryText, [req.user.id]);
    return res.status(200).json({ success: true, data: { notifications: rows } });
  } catch (err) {
    logger.error('getNotifications error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// PUT /api/intern/mark-notification-read/:id
// ------------------------------------------------------------------
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await db.query(
      `UPDATE notifications SET is_read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.user.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    return res.status(200).json({ success: true, message: 'Marked as read.' });
  } catch (err) {
    logger.error('markNotificationRead error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/intern/timeline
// ------------------------------------------------------------------
const getTimeline = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT tw.id, tw.week_number, tw.title, tw.goal, tw.status, tw.updated_at
       FROM   timeline_weeks tw
       JOIN   internships i ON i.id = tw.internship_id
       WHERE  i.intern_id = $1 AND i.status = 'active'
       ORDER  BY tw.week_number ASC`,
      [req.user.id]
    );

    return res.status(200).json({ success: true, data: { timeline: rows } });
  } catch (err) {
    logger.error('getTimeline error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/intern/presentations
// ------------------------------------------------------------------
const getPresentations = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.id, p.title, p.date, p.time, p.status, u.name AS mentor_name
       FROM   presentations p
       JOIN   users u ON u.id = p.mentor_id
       WHERE  p.intern_id = $1
       ORDER  BY p.date ASC, p.time ASC`,
      [req.user.id]
    );

    return res.status(200).json({ success: true, data: { presentations: rows } });
  } catch (err) {
    logger.error('getPresentations error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ------------------------------------------------------------------
// GET /api/intern/cohort
// DELIBERATE EXCEPTION to per-intern scoping (see file header).
// Returns ALL RISE interns institution-wide — name, assigned mentor,
// assigned professor/admin, batch. NEVER joins into work_items or
// submissions, so no intern can see another intern's actual work,
// progress, or review status through this endpoint.
// ------------------------------------------------------------------
const getCohortDirectory = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name,
              mu.name AS mentor_name,
              au.name AS admin_name,
              b.name  AS batch_name,
              i.start_date, i.end_date
       FROM   users u
       JOIN   internships i ON i.intern_id = u.id AND i.status = 'active'
       JOIN   users mu      ON mu.id = i.mentor_id
       JOIN   batches b     ON b.id = i.batch_id
       JOIN   users au      ON au.id = b.admin_id
       WHERE  u.role = 'intern' AND u.is_active = TRUE
       ORDER  BY u.name ASC`
    );

    return res.status(200).json({ success: true, data: { cohort: rows } });
  } catch (err) {
    logger.error('getCohortDirectory error', { error: err.message });
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  getDashboard,
  getWorkItems,
  getWorkItemDetail,
  submitWork,
  getMySubmissions,
  getNotifications,
  markNotificationRead,
  getTimeline,
  getPresentations,
  getCohortDirectory,
};
