-- ============================================================
-- EuroSkills Status App — Supabase PostgreSQL Schema
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- Enums
CREATE TYPE role_type AS ENUM (
  'Chief Expert',
  'Deputy Chief Expert',
  'ITPD',
  'Sector Manager',
  'Workshop Manager',
  'Workshop Manager Assistant',
  'Skills Advisor',
  'Jury President Team Leader',
  'Jury President',
  'ITPD Validator',
  'Independent Assessor'
);

CREATE TYPE role_status AS ENUM ('Vacant', 'Pending', 'Filled', 'New');

CREATE TYPE doc_status AS ENUM ('Not Started', 'In Progress', 'Complete', 'Approved');

CREATE TYPE event_type AS ENUM ('SDW', 'Competition');

CREATE TYPE attendance_status AS ENUM (
  'Attending',
  'Not Attending',
  'Tentative',
  'Package Sent',
  'Not Applicable'
);

CREATE TYPE import_status AS ENUM ('pending', 'processing', 'done', 'failed');

-- ============================================================
-- SKILLS (master list)
-- ============================================================
CREATE TABLE skills (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_number   text NOT NULL UNIQUE,
  skill_name     text NOT NULL,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     text
);

-- ============================================================
-- COMPETITION ROLES
-- ============================================================
CREATE TABLE competition_roles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id       uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  role_type      role_type NOT NULL,
  status         role_status NOT NULL DEFAULT 'Vacant',
  first_name     text,
  family_name    text,
  email          text,
  iso_code       text,
  nationality    text,
  votes          integer,
  td_support     boolean NOT NULL DEFAULT false,
  phone          text,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     text
);

-- ============================================================
-- SUPPORTING DOCUMENTS
-- ============================================================
CREATE TABLE supporting_documents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id       uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  doc_type       text NOT NULL,
  status         doc_status NOT NULL DEFAULT 'Not Started',
  due_date       date,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     text
);

-- ============================================================
-- SKILL POSITION (one per skill)
-- ============================================================
CREATE TABLE skill_positions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id                uuid NOT NULL UNIQUE REFERENCES skills(id) ON DELETE CASCADE,
  project_type            text,
  itpd_info               text,
  marking_scheme_status   doc_status DEFAULT 'Not Started',
  validation_status       doc_status DEFAULT 'Not Started',
  budget_allocated        numeric(10,2),
  budget_spent            numeric(10,2),
  readiness_flag          boolean DEFAULT false,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  updated_by              text
);

-- ============================================================
-- SKILL EVENTS
-- ============================================================
CREATE TABLE skill_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id          uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  event_type        event_type NOT NULL,
  event_date        date,
  event_location    text,
  attendance_status attendance_status NOT NULL DEFAULT 'Not Applicable',
  attendee_name     text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        text
);

-- ============================================================
-- AUDIT LOG
-- ============================================================
CREATE TABLE audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name   text NOT NULL,
  record_id    uuid NOT NULL,
  skill_id     uuid REFERENCES skills(id),
  changed_by   text NOT NULL,
  changed_at   timestamptz NOT NULL DEFAULT now(),
  action       text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data     jsonb,
  new_data     jsonb
);

-- ============================================================
-- IMPORT JOBS
-- ============================================================
CREATE TABLE import_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name     text NOT NULL,
  status        import_status NOT NULL DEFAULT 'pending',
  row_count     int,
  error_count   int DEFAULT 0,
  errors        jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_by    text
);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_skills_updated_at         BEFORE UPDATE ON skills              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_roles_updated_at          BEFORE UPDATE ON competition_roles   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_docs_updated_at           BEFORE UPDATE ON supporting_documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_positions_updated_at      BEFORE UPDATE ON skill_positions     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_events_updated_at         BEFORE UPDATE ON skill_events        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_import_jobs_updated_at    BEFORE UPDATE ON import_jobs         FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_roles_skill_id    ON competition_roles(skill_id);
CREATE INDEX idx_docs_skill_id     ON supporting_documents(skill_id);
CREATE INDEX idx_events_skill_id   ON skill_events(skill_id);
CREATE INDEX idx_audit_skill_id    ON audit_log(skill_id);
CREATE INDEX idx_audit_changed_at  ON audit_log(changed_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE skills               ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_roles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporting_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_positions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs          ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read-write on skills"
  ON skills FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated read-write on competition_roles"
  ON competition_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated read-write on supporting_documents"
  ON supporting_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated read-write on skill_positions"
  ON skill_positions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated read-write on skill_events"
  ON skill_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow authenticated read on audit_log"
  ON audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read-write on import_jobs"
  ON import_jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- SEED DATA — Correct EuroSkills Skill Numbers and Names
-- ============================================================
INSERT INTO skills (skill_number, skill_name) VALUES
  ('4',  'Mechatronics'),
  ('5',  'Mechanical Engineering - CAD'),
  ('6',  'CNC Turning'),
  ('7',  'CNC-Milling'),
  ('10', 'Welding'),
  ('12', 'Wall and Floor Tiling'),
  ('15', 'Plumbing and Heating'),
  ('16', 'Electronics Prototyping'),
  ('17', 'Web Development'),
  ('18', 'Electrical Installations'),
  ('19', 'Industrial Control'),
  ('20', 'Bricklaying'),
  ('21', 'Plastering and Dry Wall Systems'),
  ('22', 'Painting and Decorating'),
  ('24', 'Cabinetmaking'),
  ('25', 'Joinery'),
  ('26', 'Carpentry'),
  ('27', 'Robot Systems Integration'),
  ('28', 'Floristry'),
  ('29', 'Hairdressing'),
  ('30', 'Beauty Therapy'),
  ('31', 'Fashion Design and Technology Team Challenge'),
  ('32', 'Butchery'),
  ('33', 'Automobile Technology'),
  ('34', 'Cooking'),
  ('35', 'Restaurant Service'),
  ('36', 'Bakery'),
  ('37', 'Pâtisserie and Confectionery'),
  ('38', 'Refrigeration and Air Conditioning'),
  ('39', 'IT Network Systems Administration'),
  ('40', 'Graphic Design Technology'),
  ('41', 'Health and Social Care'),
  ('42', 'Digital Construction'),
  ('43', 'Cyber Security'),
  ('45', 'Software Applications Development'),
  ('46', 'Entrepreneurship/ Business Development Team Challenge'),
  ('48', 'Industry 4.0'),
  ('49', 'Metal Roofing'),
  ('50', 'Floor Laying'),
  ('51', 'Landscape Gardening'),
  ('52', 'Aircraft Maintenance'),
  ('53', 'Heavy Vehicle Technology'),
  ('54', 'Truck and Bus Technology'),
  ('55', 'Autobody Repair'),
  ('56', 'Car Painting'),
  ('57', 'Hotel Reception');
