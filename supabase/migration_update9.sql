-- ============================================================
-- Migration Update 9 — Change Set 13 (revised)
-- Email-based access control + shared global password
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. App users table — stores permitted email addresses
--    Drop and recreate to ensure the new email-based schema is applied
--    (previous versions used a full_name column instead of email)
DROP TABLE IF EXISTS app_users;
CREATE TABLE app_users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL UNIQUE,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add admin_password_hash to global_settings (shared login password)
ALTER TABLE global_settings
  ADD COLUMN IF NOT EXISTS admin_password_hash text;

-- 3. Seed the 7 permitted email addresses
INSERT INTO app_users (email, is_active) VALUES
  ('Eugene.Incerti@worldskillseurope.org',  true),
  ('patrik.svensson@worldskills.se',         true),
  ('zsofia.csiszar@worldskillseurope.org',   true),
  ('katie.zorzetto@worldskillseurope.org',   true),
  ('greta.wolny@worldskillseurope.org',      true),
  ('Jordy.degroot@worldskillseurope.org',    true),
  ('alina.fleaca@worldskills.be',            true)
ON CONFLICT (email) DO NOTHING;

-- 4. The master password hash is set by the app on first successful login with "Incerti2026".
--    No need to insert a raw value here.
