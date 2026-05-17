// POST /api/events/:id/rsvp
// Body: { name, email, phone?, car?, instagram?, notes? }
// 201 → { ok: true, spots_left }
// 404 → event missing
// 409 → event full or already RSVPed with this email
// 422 → missing/invalid fields
//
// Capacity safety: a single atomic UPDATE bumps rsvp_count IF capacity isn't reached.
// If the UPDATE matched 0 rows we know we're full (or the event vanished).

import { json, bad, notFound, conflict, serverErr, readJson } from '../../../_shared/responses.js';

const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const trim = (s, max = 200) => String(s ?? '').trim().slice(0, max);

export const onRequestPost = async ({ request, params, env }) => {
  try {
    const key = String(params.id || '').trim();
    if (!key) return notFound();

    const body = await readJson(request);
    const name      = trim(body.name, 120);
    const email     = trim(body.email, 200).toLowerCase();
    const phone     = trim(body.phone, 40) || null;
    const car       = trim(body.car, 80) || null;
    const instagram = trim(body.instagram, 80).replace(/^@/, '') || null;
    const notes     = trim(body.notes, 1000) || null;

    if (!name)        return bad('Name is required', 422);
    if (!isEmail(email)) return bad('Valid email is required', 422);

    // Look up event by id-or-slug to get its real id (we need it for the FK).
    const ev = await env.DB.prepare(
      `SELECT id, capacity, rsvp_count, rsvp_required, status, title
         FROM events
        WHERE (id = ?1 OR slug = ?1) AND status = 'published'
        LIMIT 1`
    ).bind(key).first();

    if (!ev) return notFound('Event not found');

    // Atomic capacity claim — UPDATE only if we have room.
    const claim = await env.DB.prepare(
      `UPDATE events
          SET rsvp_count = rsvp_count + 1, updated_at = datetime('now')
        WHERE id = ?1
          AND status = 'published'
          AND (capacity IS NULL OR rsvp_count < capacity)`
    ).bind(ev.id).run();

    if (!claim.meta.changes) return conflict('Event is full');

    // Insert the RSVP. If this fails (e.g. dedup index trips), roll back the count.
    try {
      await env.DB.prepare(
        `INSERT INTO rsvps (event_id, name, email, phone, car, instagram, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
      ).bind(ev.id, name, email, phone, car, instagram, notes).run();
    } catch (err) {
      // Best-effort rollback — D1 has no multi-statement transactions on the public API yet.
      await env.DB.prepare(
        `UPDATE events SET rsvp_count = rsvp_count - 1 WHERE id = ?1 AND rsvp_count > 0`
      ).bind(ev.id).run().catch(() => {});
      const msg = String(err && err.message || '');
      if (msg.includes('UNIQUE') || msg.includes('idx_rsvps_dedup')) {
        return conflict('You\'ve already RSVPed with that email');
      }
      throw err;
    }

    const spots_left = ev.capacity == null ? null : Math.max(0, ev.capacity - (ev.rsvp_count + 1));
    return json({ ok: true, event_title: ev.title, spots_left }, 201);
  } catch (err) {
    if (err.message === 'Invalid JSON' || err.message === 'Payload too large') return bad(err.message, 400);
    return serverErr(err);
  }
};
