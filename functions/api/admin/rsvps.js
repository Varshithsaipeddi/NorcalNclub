// GET /api/admin/rsvps
//   ?event_id=...   filter to one event
//   ?format=csv     download as CSV

import { json, serverErr } from '../../_shared/responses.js';

const csvCell = (v) => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const onRequestGet = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const eventId = url.searchParams.get('event_id');
    const format  = url.searchParams.get('format');

    const sql = eventId
      ? `SELECT r.*, e.title AS event_title, e.starts_at AS event_starts_at
           FROM rsvps r JOIN events e ON e.id = r.event_id
          WHERE r.event_id = ?1
          ORDER BY r.created_at DESC LIMIT 5000`
      : `SELECT r.*, e.title AS event_title, e.starts_at AS event_starts_at
           FROM rsvps r JOIN events e ON e.id = r.event_id
          ORDER BY r.created_at DESC LIMIT 5000`;

    const stmt = eventId ? env.DB.prepare(sql).bind(eventId) : env.DB.prepare(sql);
    const { results = [] } = await stmt.all();

    if (format === 'csv') {
      const header = ['created_at','event_title','event_starts_at','name','email','phone','car','instagram','notes'];
      const rows = results.map(r => header.map(k => csvCell(r[k])).join(','));
      const csv = [header.join(','), ...rows].join('\n');
      return new Response(csv, {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="rsvps${eventId ? '-' + eventId : ''}.csv"`,
        },
      });
    }

    return json({ rsvps: results });
  } catch (err) { return serverErr(err); }
};
