// GET /api/admin/signups  — Join form submissions
//   ?format=csv  download as CSV

import { json, serverErr } from '../../_shared/responses.js';

const csvCell = (v) => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const onRequestGet = async ({ request, env }) => {
  try {
    const url = new URL(request.url);
    const { results = [] } = await env.DB.prepare(
      `SELECT * FROM member_signups ORDER BY created_at DESC LIMIT 5000`
    ).all();

    if (url.searchParams.get('format') === 'csv') {
      const header = ['created_at','name','email','car','instagram'];
      const rows = results.map(r => header.map(k => csvCell(r[k])).join(','));
      const csv = [header.join(','), ...rows].join('\n');
      return new Response(csv, {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="signups.csv"',
        },
      });
    }
    return json({ signups: results });
  } catch (err) { return serverErr(err); }
};
