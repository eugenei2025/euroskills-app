-- ============================================================
-- Migration Update 7 — Change Set 11
-- Adds tp_agreed_delivery_date column to skill_positions
-- Run this in the Supabase SQL Editor
-- ============================================================

ALTER TABLE skill_positions
  ADD COLUMN IF NOT EXISTS tp_agreed_delivery_date date;
