-- ============================================================
-- EuroSkills App — Migration Update 4
-- Change Set 5: Global mandatory roles table + TP extra fields
--
-- INSTRUCTIONS — run as TWO separate blocks in Supabase SQL Editor:
--   Block 1 first, wait for green "Success", then run Block 2.
-- ============================================================

-- ============================================================
-- BLOCK 1: Create event_mandatory_roles table
-- ============================================================

CREATE TABLE IF NOT EXISTS event_mandatory_roles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  event_type  NOT NULL,
  role_abbr   text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_type, role_abbr)
);

-- ============================================================
-- BLOCK 2: Add new columns to skill_positions
-- ============================================================

ALTER TABLE skill_positions
  ADD COLUMN IF NOT EXISTS expert_created_tp      boolean,
  ADD COLUMN IF NOT EXISTS itpd_scope             text,
  ADD COLUMN IF NOT EXISTS test_project_delivered date;
