-- ============================================================
-- EuroSkills App — Migration Update 6
-- Change Set 7: Global JP/SA tables + skill allocation tables
--
-- Run as TWO separate blocks in Supabase SQL Editor.
-- Block 1 first, wait for "Success", then Block 2.
-- ============================================================

-- ============================================================
-- BLOCK 1: Create new tables
-- ============================================================

-- Global Jury Presidents registry
CREATE TABLE IF NOT EXISTS global_jury_presidents (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text,
  first_name  text        NOT NULL,
  family_name text        NOT NULL,
  country     text,
  iso_code    text,
  email       text,
  phone       text,
  phone2      text,
  is_jptl     boolean     NOT NULL DEFAULT false,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Global Skills Advisors registry
CREATE TABLE IF NOT EXISTS global_skills_advisors (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text,
  first_name  text        NOT NULL,
  family_name text        NOT NULL,
  country     text,
  iso_code    text,
  email       text,
  phone       text,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- JP assignments to skills (a JP can cover many skills)
CREATE TABLE IF NOT EXISTS skill_jp_assignments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id   uuid        NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  jp_id      uuid        NOT NULL REFERENCES global_jury_presidents(id) ON DELETE CASCADE,
  jptl_id    uuid        REFERENCES global_jury_presidents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (skill_id, jp_id)
);

-- SA assignments to skills
CREATE TABLE IF NOT EXISTS skill_sa_assignments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id   uuid        NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  sa_id      uuid        NOT NULL REFERENCES global_skills_advisors(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (skill_id, sa_id)
);

-- ============================================================
-- BLOCK 2: Seed Jury Presidents from EuroSkills data
-- ============================================================
-- Source: JP list provided by competition management
-- Note: "TD" in the original document indicates these persons
--       also serve as Technical Delegates for their country.
--       Stored in 'notes' field for reference.

INSERT INTO global_jury_presidents (title, first_name, family_name, country, iso_code, email, phone, phone2, is_jptl, notes) VALUES
  ('Mr',  'Michael',   'Tobisch',             'Austria',        'AT', 'Michael.tobisch@skillsaustria.at',       '+43 664 580 33 96',   NULL,                    false, 'TD'),
  ('Mrs', 'Alina',     'Fleaca',              'Belgium',        'BE', 'alina.fleaca@worldskills.be',            '(+32)478990764',      '(+32)81408610',         false, 'TD'),
  ('Mr',  'Ivor',      'Rubeša',              'Croatia',        'HR', 'ivor.rubesa@asoo.hr',                   '(+38)516274697',      '(+38)5977323366',       false, 'TD'),
  ('Mr',  'George',    'Horattas',            'Cyprus',         'CY', 'ghorattas@kepa.mlsi.gov.cy',            '(+357)99446005',      '(+357)22806100',        false, 'TD'),
  ('Mr',  'Radek',     'Čajka',               'Czech Republic', 'CZ', 'cajka@komora.cz',                       '+420 770 392 336',    NULL,                    false, 'TD'),
  ('Mr',  'Jens',      'Sondergaard Hansen',  'Denmark',        'DK', 'jsh@skillsdenmark.dk',                  NULL,                  NULL,                    false, 'TD'),
  ('Mrs', 'Tiiu',      'Parm',                'Estonia',        'EE', 'tiiu.parm@worldskillsestonia.ee',        '(+372) 53021791',     NULL,                    false, 'TD'),
  ('Mr',  'Vesa',      'Iltola',              'Finland',        'FI', 'vesa.iltola@gradia.fi',                 NULL,                  NULL,                    false, 'TD'),
  ('Mr',  'Marc',      'Rousseau',            'France',         'FR', 'mrousseau@cofom.org',                   '(+33)616775240',      '(+33)140281859',        false, 'TD'),
  ('Ms',  'Vassiliki', 'Boltsi',              'Greece',         'GR', 'vmpoltsi@minedu.gov.gr',                '(+30) 210 344 3801',  '306982936540',          false, 'TD'),
  ('Mr',  'Hendrik',   'Voß',                 'Germany',        'DE', 'voss@zdh.de',                           '(+49)1711242616',     NULL,                    false, 'TD'),
  ('Ms',  'Dorottya',  'Nagy-Józsa',          'Hungary',        'HU', 'dorka@y2y.hu',                          '(+36)304134409',      NULL,                    false, 'TD'),
  ('Mr',  'Oskar',     'Hafnfjord Gunnarsson','Iceland',        'IS', 'oskar@matvis.is',                       '(+354)8916695',       '+354 5400100',          false, 'TD'),
  ('Mr',  'Tim',       'O''Holloran',         'Ireland',        'IE', 'Tim.OHalloran@mtu.ie',                  '(''+353) 21 433 5421','(''+353) 87 2810 225',  false, 'TD'),
  ('Mr',  'Thomas',    'Pardeller',           'Italy',          'IT', 'td.es@handelskammer.bz.it',             '(+39)3355764969',     NULL,                    false, 'TD'),
  ('Ms',  'Laura',     'Alikulova',           'Kazakhstan',     'KZ', 'alikulov.laura@mail.ru',                '(7+)7015246236',      NULL,                    false, 'TD'),
  ('Mr',  'Valts',     'Jirgensons',          'Latvia',         'LV', 'valts.jirgensons@viaa.gov.lv',          '(+37)129268883',      NULL,                    false, 'TD'),
  ('Mr',  'Reto',      'Blumenthal',          'Liechtenstein',  'LI', 'reto.blumenthal@aiba.li',               '(+42)37997225',       NULL,                    false, 'TD'),
  ('Mr',  'Vytautas',  'Petkūnas',            'Lithuania',      'LT', 'direktorius@vpm.lt',                    '(+37)068729887',      '(+37)038660387',        false, 'TD'),
  ('Ms',  'Claudine',  'Thoma',               'Luxembourg',     'LU', 'claudine.thoma@men.lu',                 '+352 24 73 52 43',    '+352 621 612 716',      false, 'TD'),
  ('Mrs', 'Sandra',    'Brkanovic',           'Montenegro',     'ME', 'sandra.brkanovic@cso.edu.me',           '(+382)67620981',      '(+382)20664785',        false, 'TD'),
  ('Ms',  'Audrey',    'Van Soest',           'Netherlands',    'NL', 'vansoest@worldskillsnetherlands.nl',    NULL,                  NULL,                    false, 'TD'),
  ('Ms',  'Sonja',     'Slavkovikj',          'North Macedonia','MK', 'sonja.slavkovic@crso.gov.mk',           '38,976,460,077',      NULL,                    false, 'TD'),
  ('Mrs', 'Camilla J.','Victor',              'Norway',         'NO', 'camilla.victor@worldskills.no',         '+47 95949453',        NULL,                    false, 'TD'),
  ('Mr',  'Filip',     'Kosno',               'Poland',         'PL', 'filip.kosno@frse.org.pl',               '48,511,569,693',      NULL,                    false, 'TD'),
  ('Mr',  'Vasco',     'Vaz',                 'Portugal',       'PT', 'vasco.vaz@iefp.pt',                     '+351215803316',       '+351936109299',         false, 'TD'),
  ('Mr',  'Victor',    'Dumitrache',          'Romania',        'RO', 'victor.dumitrache@worldskills.ro',      '(+40)763630341',      NULL,                    false, 'TD'),
  ('Mrs', 'Aleksandra','Milić',               'Serbia',         'RS', 'aleksandra.milic@pks.rs',               '+381 66 8751 128',    NULL,                    false, 'TD'),
  ('Mr',  'Martin',    'Antalik',             'Slovakia',       'SK', 'martin.antalik@siov.sk',                '(+42)31903920120',    NULL,                    false, 'TD'),
  ('Ms',  'Sara',      'Gosnak',              'Slovenia',       'SI', 'sara.gosnak@cpi.si',                    '(+386) 40470406',     NULL,                    false, 'TD'),
  ('Ms',  'Silvia',    'Romo Herrero',        'Spain',          'ES', 'silvia.romo@educacion.gob.es',          'fpcompeticiones@educacion.gob.es', NULL,        false, 'TD'),
  ('Mr',  'Andreas',   'Markstedt',           'Sweden',         'SE', 'andreas.markstedt@worldskills.se',      '(+46) 70 6806941',    NULL,                    false, 'TD'),
  ('Mr',  'Martin',    'Erlacher',            'Switzerland',    'CH', 'merlacher@swiss-skills.ch',             '(+41)796400201',      '(+41)31 552 0516',      false, 'TD'),
  ('Mrs', 'Parisa',    'Shirazi',             'United Kingdom', 'GB', 'pshirazi@worldskillsuk.org',            '(+44)7766244993',     NULL,                    false, 'TD')
ON CONFLICT DO NOTHING;
