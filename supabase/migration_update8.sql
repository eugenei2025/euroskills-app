-- ============================================================
-- Migration Update 8 — Change Set 12
-- Adds competition_name column to global_settings
-- Run this in the Supabase SQL Editor
-- ============================================================

ALTER TABLE global_settings
  ADD COLUMN IF NOT EXISTS competition_name text;
