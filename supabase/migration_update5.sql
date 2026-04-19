-- ============================================================
-- EuroSkills App — Migration Update 5
-- Change Set 6: global_settings table + new skill_positions columns
--
-- Run as TWO separate blocks in Supabase SQL Editor.
-- Paste Block 1, click Run, wait for green "Success", then Block 2.
-- ============================================================

-- ============================================================
-- BLOCK 1: Create global_settings table
-- ============================================================

CREATE TABLE IF NOT EXISTS global_settings (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  itpd_package_price  numeric(12,2),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- BLOCK 2: Add new columns to skill_positions
-- ============================================================

ALTER TABLE skill_positions
  ADD COLUMN IF NOT EXISTS itpd_flight_costs      numeric(12,2),
  ADD COLUMN IF NOT EXISTS change_30_description  text;

-- Note: 'Not Required' has been removed from the role_status enum in the UI.
-- Existing DB rows with status 'Not Required' will display fine but the UI
-- will no longer allow setting that value. You may optionally migrate existing
-- rows with:
--   UPDATE competition_roles SET status = 'Not Applicable' WHERE status = 'Not Required';
