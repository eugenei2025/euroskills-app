-- ============================================================
-- EuroSkills App — Migration Update 1
-- Run this in the Supabase SQL Editor on your EXISTING database
-- DO NOT run schema.sql again — just run this file
-- ============================================================

-- Step 1: Add 'New' to the role_status enum
ALTER TYPE role_status ADD VALUE IF NOT EXISTS 'New';

-- Step 2: Add new columns to competition_roles
ALTER TABLE competition_roles
  ADD COLUMN IF NOT EXISTS iso_code    text,
  ADD COLUMN IF NOT EXISTS votes       integer,
  ADD COLUMN IF NOT EXISTS td_support  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone       text;

-- Step 3: Replace skill seed data with correct numbers and names
-- First clear existing skills (this will cascade-delete any roles/docs linked to old skills)
DELETE FROM skills;

-- Insert correct EuroSkills skill numbers and names
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

-- Step 4: Insert Chief Expert and Deputy Chief Expert data from spreadsheet
-- Using a CTE to resolve skill_id by skill_number

WITH skill_ids AS (
  SELECT id, skill_number FROM skills
)
INSERT INTO competition_roles (skill_id, role_type, status, first_name, family_name, iso_code, votes, email, phone, td_support, notes)
SELECT s.id, r.role_type::role_type, r.status::role_status,
       r.first_name, r.family_name, r.iso_code, r.votes, r.email, r.phone, r.td_support, r.notes
FROM skill_ids s
JOIN (VALUES
  -- (skill_number, role_type, status, first_name, family_name, iso_code, votes, email, phone, td_support, notes)
  ('4',  'Chief Expert',         'Filled', 'Michael',     'Linn',              'DE', 55,  'scm.mechatronics@worldskills.org',              '(0049)1727345277',  true,  NULL),
  ('4',  'Deputy Chief Expert',  'Filled', 'Kevin',       'Kloosterman',       'NL', 28,  'kevin.kloosterman@gmail.com',                   '(0031)623082008',   false, NULL),
  ('5',  'Chief Expert',         'Filled', 'Dário',       'Pinto',             'PT', 40,  'mechanical.engineering.cad@worldskills.org',    '(0035)919146508765',false, NULL),
  ('5',  'Deputy Chief Expert',  'Filled', 'Adrien',      'MARY',              'FR', 25,  NULL,                                            NULL,                false, NULL),
  ('6',  'Chief Expert',         'Filled', 'Dieter',      'Geisberger',        'AT', NULL,'Dieter.Geisberger@abz-braunau.at',              '+43 676 47 22 746', false, NULL),
  ('6',  'Deputy Chief Expert',  'Filled', 'Herbert',     'Mattes',            'DE', 28,  'herbert.mattes@chiron-group.com',               '(0049)1727844923',  false, NULL),
  ('7',  'Chief Expert',         'Filled', 'Claudio',     'Nigg',              'LI', 32,  'claudio.nigg@gmx.li',                           '(0041)787988381',   false, NULL),
  ('7',  'Deputy Chief Expert',  'Filled', 'Frida',       'Malm',              'SE', 22,  'frida@ilcloud.com',                             '(0046)725001433',   false, NULL),
  ('10', 'Chief Expert',         'Filled', 'Raphaël',     'Colle',             'BE', 52,  'rcwelding@telenet.be',                          '(0032)473284949',   false, NULL),
  ('10', 'Deputy Chief Expert',  'Filled', 'Alvaro',      'Santos',            'PT', 31,  'alvaro.santos@iefp.pt',                         '(0035)1966301376',  false, NULL),
  ('12', 'Chief Expert',         'New',    'Andreas',     'Stiegler',          'AT', 27,  'lenzi.95@gmx.at',                               NULL,                false, NULL),
  ('12', 'Deputy Chief Expert',  'Filled', 'Gunnar Ásgeir','Sigurjónsson',     'IS', 22,  'gas@tskoli.is',                                 '(0035)45149000',    false, NULL),
  ('15', 'Chief Expert',         'Filled', 'Begoña',      'MALLÉN',            'ES', 32,  'begobegom@gmail.com',                           NULL,                false, NULL),
  ('16', 'Chief Expert',         'Filled', 'Simon',       'Dorrer',            'AT', 28,  'simon.dorrer@jku.at',                           NULL,                false, NULL),
  ('17', 'Chief Expert',         'Filled', 'Franz Stefan','Stimpfl',           'AT', 66,  'franz@stimpfl.com',                             '(0043)6605057443',  false, NULL),
  ('17', 'Deputy Chief Expert',  'Filled', 'Roberts',     'Flaumanis',         'LV', 40,  'roberts@flaumanis.com',                         '(0037)128624178',   false, NULL),
  ('18', 'Chief Expert',         'New',    'Erik',        'Beldman',           'NL', 39,  'erikenelienbeldman@gmail.com',                  '(0031)641644676',   false, NULL),
  ('18', 'Deputy Chief Expert',  'New',    'Adrian',      'Sommer',            'CH', 22,  'sommer@eit.swiss',                              '(0041)794671575',   false, NULL),
  ('19', 'Chief Expert',         'Filled', 'Adelino',     'Santos',            'PT', 40,  'adelino.de2@gmail.com',                         '(0031)9036069681',  false, NULL),
  ('19', 'Deputy Chief Expert',  'Filled', 'Håkan',       'Nilsson',           'SE', 25,  'hakan.nilsson2@kristianstad.se',                '(0046)705134015',   false, NULL),
  ('20', 'Chief Expert',         'Filled', 'Bruno',       'LEBON',             'FR', 32,  'bruno.lebon@batijem.com',                       NULL,                false, NULL),
  ('20', 'Deputy Chief Expert',  'Filled', 'Arnold',      'Ros',               'NL', 23,  'info@siermetselwerkros.nl',                     '(0031)620959973',   false, NULL),
  ('21', 'Chief Expert',         'Filled', 'Michael',     'Hess',              'CH', 18,  'michael.hess@wengerhess.ch',                    '(0041)796223655',   false, NULL),
  ('21', 'Deputy Chief Expert',  'Filled', 'Alexander',   'Dasek',             'AT', 13,  'alexander.dasek@strabag.com',                   NULL,                false, NULL),
  ('22', 'Chief Expert',         'Filled', 'Michael',     'Swan',              'UK', 42,  'm.swan@dundeeandangus.ac.uk',                   '(0044)7944900547',  false, NULL),
  ('22', 'Deputy Chief Expert',  'New',    'Katja',       'Jaatinen',          'FI', 30,  'katja.jaatinen@gradia.fi',                      NULL,                false, NULL),
  ('24', 'Chief Expert',         'New',    'Romain',      'KAUFFMANN',         'FR', 25,  'rom.kauffmann@orange.fr',                       NULL,                false, NULL),
  ('24', 'Deputy Chief Expert',  'Filled', 'Angus',       'Bruce-Gardner',     'UK', 22,  'angusr bg@outlook.com',                         '(0044)7929799819',  false, NULL),
  ('25', 'Chief Expert',         'Filled', 'Andrew',      'Pengelly',          'UK', 24,  'andypengelly@googlemail.com',                   '(0044)7812348896',  false, NULL),
  ('25', 'Deputy Chief Expert',  'New',    'Csaba',       'Babanecz',          'HU', 14,  'babanecz@gmail.com',                            NULL,                false, NULL),
  ('26', 'Chief Expert',         'New',    'Michael',     'Hürbin',            'CH', 30,  'michih@gmx.ch',                                 NULL,                false, NULL),
  ('26', 'Deputy Chief Expert',  'New',    'Bouke',       'Koopman',           'NL', 20,  'info@koningsstijl.nl',                          '(0031)620546468',   false, NULL),
  ('27', 'Chief Expert',         'Filled', 'Jens',        'Mühlegg',           'DE', 34,  'jens.muehlegg@fanuc.eu',                        NULL,                true,  NULL),
  ('27', 'Deputy Chief Expert',  'Filled', 'István',      'Biró',              'HU', 24,  'istvan.biro@fanuc.eu',                          '(0036)706091506',   false, NULL),
  ('28', 'Chief Expert',         'Filled', 'Attila',      'Boros',             'HU', 39,  'skillfloristry@gmail.com',                      '(0036)304913834',   false, NULL),
  ('28', 'Deputy Chief Expert',  'Filled', 'Tamas',       'Vigh',              'SK', 24,  'tamas@tamasvigh.cz',                            NULL,                false, NULL),
  ('29', 'Chief Expert',         'Filled', 'Loredana',    'Danese',            'BE', 68,  'loredanadanese.skillsbelgium@gmail.com',        '(0032)471948990',   false, NULL),
  ('29', 'Deputy Chief Expert',  'Filled', 'Linzi',       'Weare',             'UK', 40,  'linzi_lou@hotmail.co.uk',                       '(0044)969952331',   false, NULL),
  ('30', 'Chief Expert',         'Filled', 'Emmastina',   'Dannered',          'SE', 31,  'edannered@hotmail.com',                         '(0046)739934545',   false, NULL),
  ('30', 'Deputy Chief Expert',  'New',    'Carla',       'Calderari',         'CH', 26,  'carla.calderari@gmx.ch',                        NULL,                false, NULL),
  ('31', 'Chief Expert',         'Filled', 'Christelle',  'Cormann',           'BE', 22,  'c.cormann@helmo.be',                            '(0032)462905',      false, NULL),
  ('31', 'Deputy Chief Expert',  'Filled', 'Isabella',    'Lindenbauer',       'AT', 17,  'isabella.lindenbauer@gmx.at',                   NULL,                false, NULL),
  ('32', 'Chief Expert',         'New',    'Sascha',      'Fliri',             'CH', 20,  'sascha.fliri@sff.ch',                           '(0041)585215341',   false, NULL),
  ('32', 'Deputy Chief Expert',  'New',    'Britta',      'Sickenberger',      'DE', 9,   'sickenberger@hwk-rhein-main.de',                '+49 01713006271',   false, NULL),
  ('33', 'Chief Expert',         'Filled', 'Philippe',    'Kever',             'BE', 50,  'phil.kever@hotmail.com',                        '(0032)471648382',   false, NULL),
  ('33', 'Deputy Chief Expert',  'Filled', 'Ludovico',    'Gonella',           'IT', 30,  'ludovico.gonella@libero.it',                    '(0039)3480315995',  false, NULL),
  ('34', 'Chief Expert',         'New',    'Martin',      'Amstutz',           'CH', 56,  'mamstutz@swiss-skills.ch',                      '(0041)762807576',   false, NULL),
  ('34', 'Deputy Chief Expert',  'Filled', 'Iwona',       'Niemczewska',       'PL', 45,  'niemczewska@poczta.onet.pl',                    NULL,                false, NULL),
  ('35', 'Chief Expert',         'Filled', 'Valérie',     'Bodarwé',           'LU', 63,  'valerie.bodarwe@education.lu',                  NULL,                false, NULL),
  ('35', 'Deputy Chief Expert',  'Filled', 'Aida',        'Kadić',             'SI', 44,  'aida.live92@gmail.com',                         '(0038)6070538393',  false, NULL),
  ('36', 'Chief Expert',         'Filled', 'Thomas',      'Mertens',           'BE', 41,  'thomas.mertens1@gmx.net',                       '(0032)473587273',   false, NULL),
  ('36', 'Deputy Chief Expert',  'Filled', 'Erwin',       'Heftberger',        'AT', 29,  'erwin.heftberger@outlook.com',                  '(0043)66426693234', false, NULL),
  ('37', 'Chief Expert',         'Filled', 'Outi',        'Suopanki',          'FI', 33,  'outi.suopanki@edusampo.fi',                     '(0035)8406401997',  false, NULL),
  ('37', 'Deputy Chief Expert',  'Filled', 'Cees',        'Bakker',            'NL', 20,  'c.bakker@albeda.nl',                            '(0031)639757310',   false, NULL),
  ('38', 'Chief Expert',         'Filled', 'Samuel',      'FAZILLEAU',         'FR', 26,  'samuel.fazilleau@gmail.com',                    '(0032)643259657',   false, NULL),
  ('38', 'Deputy Chief Expert',  'Filled', 'Alain',       'Klinger',           'CH', 24,  'alain.klinger@bluewin.ch',                      '(0041)794460067',   false, NULL),
  ('39', 'Chief Expert',         'Filled', 'Andreas',     'Strömgren',         'SE', 40,  'andreas.stromgren@forss.se',                    '(0046)706499908',   false, NULL),
  ('39', 'Deputy Chief Expert',  'New',    'Gen',         'Lee',               'EE', 25,  'worldskills@g-l.ee',                            NULL,                false, NULL),
  ('40', 'Chief Expert',         'New',    'Ivs',         'Zenne',             'LV', 37,  'ivs@zenne.lv',                                  '(0037)122923368',   false, NULL),
  ('40', 'Deputy Chief Expert',  'Filled', 'Nuno',        'Viana',             'PT', 37,  'nmr.viana@gmail.com',                           '(0035)1934757517',  false, NULL),
  ('41', 'Chief Expert',         'Filled', 'Marcus',      'Rasim',             'DE', 22,  'familie-rasim@web.de',                          '(0049)1771470543',  false, NULL),
  ('41', 'Deputy Chief Expert',  'New',    'Zsuzsanna',   'Fehér',             'HU', 15,  'zsuzsa.feher91@gmail.com',                      '(0036)306478122',   false, NULL),
  ('42', 'Chief Expert',         'Filled', 'Dill',        'Khan',              'DE', NULL, 'dillkhan@hotmail.de',                          NULL,                false, NULL),
  ('42', 'Deputy Chief Expert',  'Filled', 'Bryan',       'Chlecq',            'LU', NULL, 'Bryan.chlecq@education.lu',                   NULL,                false, NULL),
  ('43', 'Chief Expert',         'New',    'Sureshkumar', 'Kamadchisundaram',  'UK', NULL, 'suresh.barnfield@googlemail.com',              NULL,                false, NULL),
  ('43', 'Deputy Chief Expert',  'New',    'George D.',   'O''Mahony',         'IE', NULL, 'GeorgeD.OMahony@mtu.ie',                       '(0035)3214335160',  false, NULL),
  ('45', 'Chief Expert',         'Filled', 'Olaf',        'Kappler',           'DE', 16,  'skills@kapplers.de',                            '(0049)1732123193',  false, NULL),
  ('45', 'Deputy Chief Expert',  'Filled', 'Csaba',       'Szirják',           'HU', 12,  'csaba@szirjak.com',                             '(0036)702427543',   false, NULL),
  ('46', 'Chief Expert',         'Filled', 'Frédéric',    'DEOLA',             'FR', 35,  'fred.deola@boostyourops.com',                   '(0035)8444557689',  false, NULL),
  ('46', 'Deputy Chief Expert',  'Filled', 'Konsta',      'Ojanen',            'FI', 25,  'konsta.ojanen@winnova.fi',                      NULL,                false, NULL),
  ('48', 'Chief Expert',         'Filled', 'Marcin',      'Regulski',          'UK', 19,  'Marcin.Regulski@wago.com',                      NULL,                false, NULL),
  ('48', 'Deputy Chief Expert',  'Filled', 'Dominik',     'Pospisil',          'AT', 18,  'dominik.pospisil@oebb.at',                      NULL,                false, NULL),
  ('49', 'Chief Expert',         'New',    'Noé',         'LANDRAGIN',         'FR', 15,  'landraginnoe@gmail.com',                        NULL,                false, NULL),
  ('49', 'Deputy Chief Expert',  'New',    'Zoltán',      'Takács',            'HU', 11,  'takacszoltan97@gmail.com',                      NULL,                false, NULL),
  ('50', 'Chief Expert',         'Filled', 'Georg',       'Spiegel',           'AT', 19,  'office@spiegel-parkett.at',                     NULL,                false, NULL),
  ('50', 'Deputy Chief Expert',  'New',    'Ivan',        'Fankhauser',        'CH', 16,  'ivan.fankhauser@glatt-fankhauser.ch',           NULL,                false, NULL),
  ('51', 'Chief Expert',         'New',    'Katharina',   'Strasser',          'AT', 38,  'katharinastrasser98@gmail.com',                 NULL,                false, NULL),
  ('51', 'Deputy Chief Expert',  'New',    'Peter',       'Bokor',             'HU', 26,  NULL,                                            '(0036)208015492',   false, NULL),
  ('52', 'Chief Expert',         'New',    'James',       'Callaghan',         'UK', NULL, 'jd.callaghan@live.co.uk',                      NULL,                false, NULL),
  ('52', 'Deputy Chief Expert',  'New',    'Martin',      'Schär',             'CH', 18,  'martin.schaer@gbw.ch',                          '(0041)794229582',   false, NULL),
  ('53', 'Chief Expert',         'Filled', 'Per',         'Hedetoft',          'DK', 23,  'per@danskmaskinhandel.dk',                      '(0045)30352335',    false, NULL),
  ('53', 'Deputy Chief Expert',  'Filled', 'Thomas',      'Holzmann',          'CH', 16,  'holzmann_thomas@web.de',                        '(0045)15114122892', false, NULL),
  ('54', 'Chief Expert',         'Filled', 'Magnus',      'Samuelsson',        'SE', 24,  'samuelsson.magnus@outlook.com',                 '(0046)735113090',   false, NULL),
  ('54', 'Deputy Chief Expert',  'Filled', 'Mattias',     'Roth',              'SE', NULL, 'mattias.roth@bojo.se',                         NULL,                false, NULL),
  ('55', 'Chief Expert',         'New',    'Diana',       'Schlup',            'CH', NULL, 'diana.schlup@gmx.ch',                          NULL,                false, NULL),
  ('55', 'Deputy Chief Expert',  'New',    'Maniusz',     'Dechnig',           'DE', 8,   'dechnigm@hwk-rhein-main.de',                    '(0049)69971172451', false, NULL),
  ('56', 'Chief Expert',         'New',    'Ali Said',    'Saleh',             'DK', 19,  'ass@college360.dk',                             NULL,                false, NULL),
  ('56', 'Deputy Chief Expert',  'Filled', 'Miloš',       'Pešić',             'RS', 18,  'milos.pesic@mghospitality.rs',                  '(0038)1642083298',  false, NULL),
  ('57', 'Chief Expert',         'Filled', 'Kajsa',       'Englund',           'SE', NULL, 'kajsa.englund@realgymnasiet.se',               '(0046)708192433',   false, NULL),
  ('57', 'Deputy Chief Expert',  'Filled', 'Miloš',       'Pešić',             'RS', 18,  'milos.pesic@mghospitality.rs',                  '(0038)1642083298',  false, NULL)
) AS r(skill_number, role_type, status, first_name, family_name, iso_code, votes, email, phone, td_support, notes)
ON s.skill_number = r.skill_number;
