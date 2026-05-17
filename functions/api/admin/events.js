// /api/admin/events
//   GET   → list ALL events (any status), admin view
//   POST  → create event

import { json, bad, serverErr, readJson } from '../../_shared/responses.js';
import { eventToAdmin } from '../../_shared/events.js';
import { ulid, slugify } from '../../_shared/ulid.js';

const trim = (s, max = 1000) => String(s ?? '').trim().slice(0, max);
const intOrNull = (v) => {
  if (v === '' || v == null) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

const ALLOWED_CATEGORIES = new Set(['cars-coffee', 'canyon', 'track-day', 'tech-night', 'other']);
const ALLOWED_STATUSES   = new Set(['draft', 'published', 'archived']);

export const onRequestGet = async ({ env }) => {
  try {
    const { results } = await env.DB.prepare(
      `SELECT * FROM events ORDER BY starts_at DESC LIMIT 500`
    ).all();
    return json({ events: (results || []).map(r => eventToAdmin(env, r)) });
  } catch (err) { return serverErr(err); }
};

export const onRequestPost = async ({ request, env }) => {
  try {
    const body = await readJson(request);
    const title       = trim(body.title, 200);
    const category    = ALLOWED_CATEGORIES.has(body.category) ? body.category : 'other';
    const starts_at   = trim(body.starts_at, 40);
    const ends_at     = trim(body.ends_at, 40) || null;
    const location    = trim(body.location, 200) || null;
    const description = trim(body.description, 4000) || null;
    const image_key   = trim(body.image_key, 300) || null;
    const capacity    = intOrNull(body.capacity);
    const rsvp_required = body.rsvp_required ? 1 : 0;
    const featured    = body.featured ? 1 : 0;
    const status      = ALLOWED_STATUSES.has(body.status) ? body.status : 'published';

    if (!title)     return bad('Title is required', 422);
    if (!starts_at) return bad('starts_at (ISO datetime) is required', 422);

    const id   = ulid();
    const base = trim(body.slug, 80) || slugify(title);
    const slug = `${base}-${id.slice(-6).toLowerCase()}`;

    await env.DB.prepare(
      `INSERT INTO events
        (id, slug, title, category, starts_at, ends_at, location, description, image_key,
         capacity, rsvp_required, featured, status)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)`
    ).bind(
      id, slug, title, category, starts_at, ends_at, location, description, image_key,
      capacity, rsvp_required, featured, status
    ).run();

    const row = await env.DB.prepare(`SELECT * FROM events WHERE id = ?1`).bind(id).first();
    return json({ event: eventToAdmin(env, row) }, 201);
  } catch (err) {
    if (err.message === 'Invalid JSON' || err.message === 'Payload too large') return bad(err.message, 400);
    return serverErr(err);
  }
};
