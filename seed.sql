-- One-time seed: the 4 hardcoded events + 4 displayed members.
-- Apply with:
--   wrangler d1 execute nclub-db --remote --file=seed.sql
-- Idempotent — uses INSERT OR IGNORE so re-runs are safe.

-- ============ EVENTS ============
INSERT OR IGNORE INTO events
  (id, slug, title, category, starts_at, location, description, capacity, rsvp_required, featured, status)
VALUES
  ('01HSEED000000000000EVENT01', 'bay-area-monthly-2026-06',
   'Bay Area Monthly Meet', 'cars-coffee',
   '2026-06-07T08:00:00-07:00', 'Alameda',
   'Kick-off-the-month meet. Donuts, dyno talk, and group photo.',
   NULL, 0, 0, 'published'),

  ('01HSEED000000000000EVENT02', 'skyline-hwy9-2026-06',
   'Skyline + Hwy 9 Drive', 'canyon',
   '2026-06-21T07:30:00-07:00', 'Saratoga Gap',
   'Tight pack, no heroes. Breakfast at Alice''s after.',
   25, 1, 0, 'published'),

  ('01HSEED000000000000EVENT03', 'laguna-seca-hpde-2026-07',
   'Laguna Seca HPDE', 'track-day',
   '2026-07-19T07:00:00-07:00', 'Mazda Raceway Laguna Seca',
   'N Club caravan + group hot pit. Helmets, brake fluid, send it.',
   12, 1, 1, 'published'),

  ('01HSEED000000000000EVENT04', 'alignment-night-2026-08',
   'Alignment + Setup', 'tech-night',
   '2026-08-02T18:00:00-07:00', 'San Jose',
   'Group rate alignments. Bring your sheet, leave with corner balance.',
   20, 1, 0, 'published');

-- ============ MEMBERS ============
INSERT OR IGNORE INTO members
  (id, name, instagram, city, joined, bio,
   car_model, car_year, car_color, car_plate, car_transmission, car_bhp, car_tune, car_mods)
VALUES
  ('alex-chen', 'Alex Chen', 'alex_n_dct', 'San Jose, CA', '2024-03',
   'Weekend canyon driver, weekday commuter. Working on a track build for next year.',
   'Elantra N', 2023, 'Performance Blue', '8N CLUB', 'DCT', 320, 'JB4 Stage 2 · 93 oct',
   '["JB4 Stage 2 piggyback","BC Racing BR coilovers","Eibach front camber arms","Cobb intake","Resonator + muffler delete","Vorsteiner V-FF 107 — 19x9"]'),

  ('priya-rao', 'Priya Rao', 'priya_konan', 'Oakland, CA', '2023-11',
   'Kona N daily that does double duty as a weekend mountain runner. No mods, all driver.',
   'Kona N', 2022, 'Cyber Gray', 'KONA-N', '8DCT', 286, 'Stock',
   '["Continental ExtremeContact Sport tires","Hawk HPS pads (front)","Window tint 20%"]'),

  ('marcus-le', 'Marcus Le', 'vn_velo_marcus', 'Sacramento, CA', '2023-06',
   'Veloster N from new. Track-focused build. HPDE regular at Thunderhill and Sonoma.',
   'Veloster N', 2021, 'Sonic Silver', 'VELO-N', '6MT', 305, 'ECU Connect Stage 2 · E30',
   '["ECU Connect Stage 2 flash","BC Racing DS coilovers","SPL front lower control arms","AP Racing front BBK","G-LOC R12 pads","Sparco Evo II race seat","Schroth Profi II 6-pt harness","Velossa Tech BIG MOUTH","Apex EC-7 — 18x9.5"]'),

  ('sam-okafor', 'Sam Okafor', 'sam_blackelantra', 'Fremont, CA', '2024-08',
   'First N. Picked it up bone stock — slowly going through the catalog.',
   'Elantra N', 2024, 'Phantom Black', '8NSAM', '6MT', 286, 'Stock',
   '["AEM dryflow filter","Mishimoto oil cap","OEM N gloss black grille","20% tint all around"]');
