// GET /api/events
// Returns published events, optionally filtered.
//   ?from=YYYY-MM-DD     only events starting on/after this date (default: today)
//   ?status=published    overrideable in admin (here we always force published)
//   ?limit=N             max 100, default 50

import { ok, serverErr } from '../_shared/responses.js';
import { eventToPublic } from '../_shared/events.js';

export const onRequestGet = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const from  = url.searchParams.get('from') || new Date().toISOString().slice(0, 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);

    const { results } = await env.DB.prepare(
      `SELECT * FROM events
        WHERE status = 'published'
          AND date(starts_at) >= date(?1)
        ORDER BY starts_at ASC
        LIMIT ?2`
    ).bind(from, limit).all();

    return ok({ events: (results || []).map(r => eventToPublic(env, r)) });
  } catch (err) {
    return serverErr(err);
  }
};
