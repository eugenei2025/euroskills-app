-- ============================================================
-- EuroSkills App — Migration Update 3
-- Run AFTER migration_update2.sql has completed
-- Run each block separately — wait for Success between each
-- ============================================================

-- ============================================================
-- BLOCK 1 — Add 'Not Applicable' to role_status enum
-- Run this first. Wait for "Success" before Block 2.
-- ============================================================

ALTER TYPE role_status ADD VALUE IF NOT EXISTS 'Not Applicable';


-- ============================================================
-- BLOCK 2 — Notes on event data storage
-- No schema changes needed for events — attendee details and
-- mandatory roles are stored as JSON in existing text columns:
--   attendee_name  → JSON array of attendee objects
--   event_location → JSON array of mandatory role strings
-- These columns already exist from the original schema.
-- ============================================================

-- (No SQL needed — just run Block 1 above)
