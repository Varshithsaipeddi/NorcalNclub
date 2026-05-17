// /api/admin/events/:id
//   GET    → fetch any-status event (for editing)
//   PATCH  → partial update
//   DELETE → remove event (cascades to RSVPs)

import { json, bad, notFound, serverErr, readJson } from '../../../_shared/responses.js';
import { eventToAdmin } from '../../../_shared/events.js';

const trim = (s, max = 1000) => String(s ?? '').trim().slice(0, max);
const ALLOWED_CATEGORIES = new Set(['cars-coffee', 'canyon', 'track-day', 'tech-night', 'other']);
const ALLOWED_STATUSES   = new Set(['draft', 'published', 'archived']);

const fetchEvent = async (env, key) =>
  env.DB.prepare(`SELECT * FROM events WHERE id = ?1 OR slug = ?1 LIMIT 1`).bind(key).first();

export const onRequestGet = async ({ params, env }) => {
  try {
    const row = await fetchEvent(env, String(params.id || '').trim());
    if (!row) return notFound('Event not found');
    return json({ event: eventToAdmin(env, row) });
  } catch (err) { return serverErr(err); }
};

export const onRequestPatch = async ({ request, params, env }) => {
  try {
    const row = await fetchEvent(env, String(params.id || '').trim());
    if (!row) return notFound('Event not found');

    const body = await readJson(request);
    const fields = {};
    if ('title' in body)         fields.title = trim(body.title, 200);
    if ('category' in body)      fields.category = ALLOWED_CATEGORIES.has(body.category) ? body.category : 'other';
    if ('starts_at' in body)     fields.starts_at = trim(body.starts_at, 40);
    if ('ends_at' in body)       fields.ends_at = trim(body.ends_at, 40) || null;
    if ('location' in body)      fields.location = trim(body.location, 200) || null;
    if ('description' in body)   fields.description = trim(body.description, 4000) || null;
    if ('image_key' in body)     fields.image_key = trim(body.image_key, 300) || null;
    if ('capacity' in body) {
      const n = body.capacity === '' || body.capacity == null ? null : parseInt(body.capacity, 10);
      fields.capacity = Number.isFinite(n) ? n : null;
    }
    if ('rsvp_required' in body) fields.rsvp_required = body.rsvp_required ? 1 : 0;
    if ('featured' in body)      fields.featured = body.featured ? 1 : 0;
    if ('status' in body && ALLOWED_STATUSES.has(body.status)) fields.status = body.status;

    const keys = Object.keys(fields);
    if (!keys.length) return bad('No editable fields provided', 422);

    const set = keys.map((k, i) => `${k} = ?${i + 2}`).join(', ');
    await env.DB.prepare(
      `UPDATE events SET ${set}, updated_at = datetime('now') WHERE id = ?1`
    ).bind(row.id, ...keys.map(k => fields[k])).run();

    const updated = await env.DB.prepare(`SELECT * FROM events WHERE id = ?1`).bind(row.id).first();
    return json({ event: eventToAdmin(env, updated) });
  } catch (err) {
    if (err.message === 'Invalid JSON' || err.message === 'Payload too large') return bad(err.message, 400);
    return serverErr(err);
  }
};

export const onRequestDelete = async ({ params, env }) => {
  try {
    const row = await fetchEvent(env, String(params.id || '').trim());
    if (!row) return notFound('Event not found');
    await env.DB.prepare(`DELETE FROM events WHERE id = ?1`).bind(row.id).run();
    return json({ ok: true });
  } catch (err) { return serverErr(err); }
};
