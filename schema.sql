-- NorCal N Club D1 schema
-- Apply with:
--   wrangler d1 execute nclub-db --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS events (
  id            TEXT    PRIMARY KEY,                 -- ULID, 26 chars
  slug          TEXT    UNIQUE NOT NULL,
  title         TEXT    NOT NULL,
  category      TEXT,                                 -- 'cars-coffee'|'canyon'|'track-day'|'tech-night'|'other'
  starts_at     TEXT    NOT NULL,                     -- ISO8601
  ends_at       TEXT,
  location      TEXT,
  description   TEXT,
  image_key     TEXT,                                 -- R2 key (no URL); compose at read time
  capacity      INTEGER,                              -- NULL = unlimited
  rsvp_count    INTEGER NOT NULL DEFAULT 0,
  rsvp_required INTEGER NOT NULL DEFAULT 0,           -- 0/1
  featured      INTEGER NOT NULL DEFAULT 0,           -- 0/1
  status        TEXT    NOT NULL DEFAULT 'published', -- 'draft'|'published'|'archived'
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON events(starts_at);
CREATE INDEX IF NOT EXISTS idx_events_status    ON events(status);

CREATE TABLE IF NOT EXISTS rsvps (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id   TEXT    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL,
  phone      TEXT,
  car        TEXT,
  instagram  TEXT,
  notes      TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rsvps_event ON rsvps(event_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rsvps_dedup ON rsvps(event_id, lower(email));

CREATE TABLE IF NOT EXISTS member_signups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL,
  car        TEXT,
  instagram  TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
  id               TEXT PRIMARY KEY,                 -- slug, e.g. 'alex-chen'
  name             TEXT NOT NULL,
  instagram        TEXT,
  city             TEXT,
  joined           TEXT,                              -- 'YYYY-MM'
  bio              TEXT,
  photo_key        TEXT,                              -- R2 key, optional
  car_model        TEXT,
  car_year         INTEGER,
  car_color        TEXT,
  car_plate        TEXT,
  car_transmission TEXT,
  car_bhp          INTEGER,
  car_tune         TEXT,
  car_mods         TEXT,                              -- JSON array as text
  status           TEXT NOT NULL DEFAULT 'published'  -- 'published'|'archived'
);
