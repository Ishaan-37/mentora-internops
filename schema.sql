-- =============================================================
--  InternOps - IIT Jammu Internship Management Platform
--  Database Schema - PostgreSQL
--  Phase 1: All tables, enums, indexes, constraints
-- =============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE user_role AS ENUM ('admin', 'mentor', 'intern');

CREATE TYPE mentor_role AS ENUM ('research_scholar', 'student');

CREATE TYPE work_item_type AS ENUM ('assignment', 'task', 'project');

CREATE TYPE submission_format AS ENUM ('pdf', 'gdrive', 'github', 'files', 'any');

CREATE TYPE work_item_status AS ENUM ('pending', 'completed', 'overdue');

CREATE TYPE submission_type AS ENUM ('pdf', 'gdrive', 'github', 'files', 'other');

CREATE TYPE mentor_review_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE notification_type AS ENUM (
  'deadline',
  'deadline_changed',
  'presentation',
  'submission_approved',
  'submission_rejected',
  'weekly_report'
);

CREATE TYPE internship_status AS ENUM ('active', 'completed');

CREATE TYPE presentation_status AS ENUM ('scheduled', 'completed');

CREATE TYPE timeline_week_status AS ENUM ('not_started', 'in_progress', 'completed');

-- =============================================================
-- TABLE: users
-- Core identity table for all user types
-- =============================================================

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email  ON users (email);
CREATE INDEX idx_users_role   ON users (role);

-- =============================================================
-- TABLE: admins
-- Extra profile fields for admin users
-- =============================================================

CREATE TABLE admins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  professor_name  TEXT NOT NULL,
  department      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_admins_user_id ON admins (user_id);

-- =============================================================
-- TABLE: mentors
-- Extra profile fields for mentor users
-- =============================================================

CREATE TABLE mentors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  mentor_role mentor_role NOT NULL DEFAULT 'research_scholar',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_mentors_user_id ON mentors (user_id);

-- =============================================================
-- TABLE: batches
-- Internship cohorts (e.g. "Summer 2026")
-- =============================================================

CREATE TABLE batches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  admin_id   UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT batches_dates_check CHECK (end_date > start_date)
);

CREATE INDEX idx_batches_admin_id ON batches (admin_id);

-- =============================================================
-- TABLE: internships
-- Links an intern to a batch and their mentor
-- =============================================================

CREATE TABLE internships (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  batch_id   UUID NOT NULL REFERENCES batches (id) ON DELETE RESTRICT,
  mentor_id  UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date   DATE NOT NULL,
  status     internship_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT internships_dates_check CHECK (end_date > start_date),
  CONSTRAINT internships_intern_batch_unique UNIQUE (intern_id, batch_id)
);

CREATE INDEX idx_internships_intern_id  ON internships (intern_id);
CREATE INDEX idx_internships_mentor_id  ON internships (mentor_id);
CREATE INDEX idx_internships_batch_id   ON internships (batch_id);
CREATE INDEX idx_internships_status     ON internships (status);

-- =============================================================
-- TABLE: mentors_interns
-- Explicit mentor → intern assignment link
-- =============================================================

CREATE TABLE mentors_interns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id   UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  intern_id   UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT mentors_interns_unique UNIQUE (mentor_id, intern_id)
);

CREATE INDEX idx_mentors_interns_mentor_id ON mentors_interns (mentor_id);
CREATE INDEX idx_mentors_interns_intern_id ON mentors_interns (intern_id);

-- =============================================================
-- TABLE: work_items
-- Assignments, Tasks, and Projects assigned to interns
-- =============================================================

CREATE TABLE work_items (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                    TEXT NOT NULL,
  description              TEXT NOT NULL,
  type                     work_item_type NOT NULL,
  mentor_id                UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  intern_id                UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  deadline                 TIMESTAMPTZ NOT NULL,
  submission_format        submission_format NOT NULL DEFAULT 'any',
  status                   work_item_status NOT NULL DEFAULT 'pending',
  allow_deadline_extension BOOLEAN NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_work_items_intern_id  ON work_items (intern_id);
CREATE INDEX idx_work_items_mentor_id  ON work_items (mentor_id);
CREATE INDEX idx_work_items_status     ON work_items (status);
CREATE INDEX idx_work_items_deadline   ON work_items (deadline);
CREATE INDEX idx_work_items_type       ON work_items (type);

-- =============================================================
-- TABLE: submissions
-- Intern submissions for work items
-- =============================================================

CREATE TABLE submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id    UUID NOT NULL REFERENCES work_items (id) ON DELETE CASCADE,
  intern_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  submission_type submission_type NOT NULL,
  file_url        TEXT,           -- local path or S3 URL for uploaded files
  external_link   TEXT,           -- Google Drive / GitHub URL
  notes           TEXT,           -- intern's optional notes for mentor
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mentor_review   mentor_review_status NOT NULL DEFAULT 'pending',
  feedback_text   TEXT,           -- mentor's feedback on submission
  reviewed_at     TIMESTAMPTZ,

  -- Only one submission per work item per intern (re-submit replaces)
  CONSTRAINT submissions_work_intern_unique UNIQUE (work_item_id, intern_id),

  -- Must have either a file or an external link
  CONSTRAINT submissions_content_check CHECK (
    file_url IS NOT NULL OR external_link IS NOT NULL OR notes IS NOT NULL
  )
);

CREATE INDEX idx_submissions_work_item_id ON submissions (work_item_id);
CREATE INDEX idx_submissions_intern_id    ON submissions (intern_id);
CREATE INDEX idx_submissions_review       ON submissions (mentor_review);

-- =============================================================
-- TABLE: notifications
-- System-generated notifications for all user types
-- =============================================================

CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  type       notification_type NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id  ON notifications (user_id);
CREATE INDEX idx_notifications_is_read  ON notifications (user_id, is_read);
CREATE INDEX idx_notifications_created  ON notifications (created_at);

-- =============================================================
-- TABLE: weekly_reports
-- Intern weekly summary reports
-- =============================================================

CREATE TABLE weekly_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  week_number  INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 52),
  content      TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT weekly_reports_intern_week_unique UNIQUE (intern_id, week_number)
);

CREATE INDEX idx_weekly_reports_intern_id ON weekly_reports (intern_id);

-- =============================================================
-- TABLE: presentations
-- Scheduled presentations for interns
-- =============================================================

CREATE TABLE presentations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id  UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  mentor_id  UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  title      TEXT NOT NULL,
  date       DATE NOT NULL,
  time       TIME NOT NULL,
  status     presentation_status NOT NULL DEFAULT 'scheduled',
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_presentations_intern_id ON presentations (intern_id);
CREATE INDEX idx_presentations_mentor_id ON presentations (mentor_id);
CREATE INDEX idx_presentations_date      ON presentations (date);

-- =============================================================
-- TABLE: timeline_weeks
-- Week-by-week internship plan (editable by mentor)
-- =============================================================

CREATE TABLE timeline_weeks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id UUID NOT NULL REFERENCES internships (id) ON DELETE CASCADE,
  week_number  INTEGER NOT NULL CHECK (week_number >= 1),
  title        TEXT NOT NULL DEFAULT 'Week Goal',
  goal         TEXT,
  status       timeline_week_status NOT NULL DEFAULT 'not_started',
  updated_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT timeline_weeks_unique UNIQUE (internship_id, week_number)
);

CREATE INDEX idx_timeline_weeks_internship_id ON timeline_weeks (internship_id);

-- =============================================================
-- FUNCTION: auto-update updated_at timestamp
-- =============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to every table with updated_at
CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_internships
  BEFORE UPDATE ON internships
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_work_items
  BEFORE UPDATE ON work_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- =============================================================
-- FUNCTION: auto-mark work items as overdue
-- Run via cron: SELECT mark_overdue_work_items();
-- =============================================================

CREATE OR REPLACE FUNCTION mark_overdue_work_items()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE work_items
  SET    status = 'overdue'
  WHERE  status = 'pending'
    AND  deadline < NOW();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- SEED DATA — Default admin account
-- Password: Admin@1234 (bcrypt hash, cost 10)
-- Change immediately after first login!
-- =============================================================

INSERT INTO users (id, name, email, password_hash, role)
VALUES (
  gen_random_uuid(),
  'IIT Jammu Admin',
  'admin@iitjammu.ac.in',
  '$2b$10$rOzJqCVLFQlRGWzVmJQKO.8kRFjuWgF7F8hPZT9vGJ7a5F0YknFYu',
  'admin'
);

INSERT INTO admins (user_id, professor_name, department)
SELECT id, 'IIT Jammu Admin', 'Computer Science & Engineering'
FROM   users
WHERE  email = 'admin@iitjammu.ac.in';

-- =============================================================
-- SEED DATA — Demo Summer 2026 batch
-- =============================================================

INSERT INTO batches (name, start_date, end_date, admin_id)
SELECT
  'Summer 2026',
  '2026-05-01',
  '2026-07-31',
  id
FROM users
WHERE email = 'admin@iitjammu.ac.in';
