// GET /api/events/:id
// `id` may be either the ULID primary key OR the slug. Returns 404 if not found
// or if status != 'published'.

import { ok, notFound, serverErr } from '../../_shared/responses.js';
import { eventToPublic } from '../../_shared/events.js';

export const onRequestGet = async ({ params, env }) => {
  try {
    const key = String(params.id || '').trim();
    if (!key) return notFound();

    const row = await env.DB.prepare(
      `SELECT * FROM events
        WHERE status = 'published'
          AND (id = ?1 OR slug = ?1)
        LIMIT 1`
    ).bind(key).first();

    if (!row) return notFound('Event not found');
    return ok({ event: eventToPublic(env, row) });
  } catch (err) {
    return serverErr(err);
  }
};
