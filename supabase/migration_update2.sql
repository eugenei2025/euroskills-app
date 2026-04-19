-- ============================================================
-- EuroSkills App — Migration Update 2
-- ============================================================
-- IMPORTANT: You MUST run these as SEPARATE queries.
-- Copy and paste ONE block at a time into the SQL Editor,
-- click RUN, wait for "Success", then do the next block.
-- Do NOT paste the whole file at once.
-- ============================================================


-- ============================================================
-- BLOCK 1 of 5 — Add new enum values
-- Run this first. Wait for "Success" before running Block 2.
-- ============================================================

ALTER TYPE role_status       ADD VALUE IF NOT EXISTS 'Not Required';
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'Package Secured';
ALTER TYPE attendance_status ADD VALUE IF NOT EXISTS 'Not Applicable';
ALTER TYPE doc_status        ADD VALUE IF NOT EXISTS 'Not Applicable';
ALTER TYPE event_type        ADD VALUE IF NOT EXISTS 'CPM';
ALTER TYPE event_type        ADD VALUE IF NOT EXISTS 'EuroSkills Competition';


-- ============================================================
-- BLOCK 2 of 5 — Add columns to existing tables
-- Run AFTER Block 1 has succeeded.
-- ============================================================

-- Add is_new to competition_roles (tracks if person is new to this role)
ALTER TABLE competition_roles
  ADD COLUMN IF NOT EXISTS is_new boolean NOT NULL DEFAULT false;

-- Add new skill_positions columns
ALTER TABLE skill_positions
  ADD COLUMN IF NOT EXISTS has_itpd               boolean,
  ADD COLUMN IF NOT EXISTS requires_30_percent    boolean,
  ADD COLUMN IF NOT EXISTS test_project_ready     boolean,
  ADD COLUMN IF NOT EXISTS marking_scheme_ready   boolean,
  ADD COLUMN IF NOT EXISTS marking_scheme_tested  boolean,
  ADD COLUMN IF NOT EXISTS test_project_validated boolean,
  ADD COLUMN IF NOT EXISTS itpd_budget            numeric(10,2),
  ADD COLUMN IF NOT EXISTS itpd_spend             numeric(10,2);


-- ============================================================
-- BLOCK 3 of 5 — Migrate old data
-- Run AFTER Block 1 has succeeded.
-- ============================================================

-- Migrate old 'Not Started' doc status → 'Missing'
UPDATE supporting_documents
  SET status = 'Missing'
  WHERE status::text = 'Not Started';

-- Migrate old 'Package Sent' attendance → 'Package Secured'
UPDATE skill_events
  SET attendance_status = 'Package Secured'
  WHERE attendance_status::text = 'Package Sent';


-- ============================================================
-- BLOCK 4 of 5 — Seed one document row per skill
-- Run AFTER Block 1 has succeeded.
-- ============================================================

-- Add unique constraint so re-running is safe
ALTER TABLE supporting_documents
  DROP CONSTRAINT IF EXISTS supporting_documents_skill_doc_unique;

ALTER TABLE supporting_documents
  ADD CONSTRAINT supporting_documents_skill_doc_unique
  UNIQUE (skill_id, doc_type);

-- Insert one row per document type for every skill
INSERT INTO supporting_documents (skill_id, doc_type, status)
SELECT
  s.id,
  d.doc_type,
  'Missing'
FROM skills s
CROSS JOIN (
  VALUES
    ('Technical Description (TD)'),
    ('Skills Assessment Guide (SAG)'),
    ('Competitor Tool List (CTL)'),
    ('Workshop Layout (WL)')
) AS d(doc_type)
ON CONFLICT (skill_id, doc_type) DO NOTHING;


-- ============================================================
-- BLOCK 5 of 5 — Seed one event row per skill
-- Run AFTER Block 1 has succeeded.
-- ============================================================

-- Add unique constraint so re-running is safe
ALTER TABLE skill_events
  DROP CONSTRAINT IF EXISTS skill_events_skill_event_unique;

ALTER TABLE skill_events
  ADD CONSTRAINT skill_events_skill_event_unique
  UNIQUE (skill_id, event_type);

-- Insert one row per event type for every skill
INSERT INTO skill_events (skill_id, event_type, attendance_status)
SELECT
  s.id,
  e.event_type::event_type,
  'Not Applicable'
FROM skills s
CROSS JOIN (
  VALUES
    ('SDW'),
    ('CPM'),
    ('EuroSkills Competition')
) AS e(event_type)
ON CONFLICT (skill_id, event_type) DO NOTHING;
