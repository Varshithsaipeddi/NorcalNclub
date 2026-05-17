// Tiny JSON helpers so every endpoint returns consistent envelopes.

const HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
};

export const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...HEADERS, ...extra },
  });

export const ok    = (data, extra) => json(data, 200, extra);
export const bad   = (message, status = 400) => json({ error: message }, status);
export const notFound = (message = 'Not found') => json({ error: message }, 404);
export const conflict = (message) => json({ error: message }, 409);
export const forbidden = (message = 'Forbidden') => json({ error: message }, 403);
export const serverErr = (err) => {
  console.error(err);
  return json({ error: 'Server error' }, 500);
};

// Read JSON body with size guard — Pages Functions don't bound this for you.
export const readJson = async (request, max = 32 * 1024) => {
  const len = parseInt(request.headers.get('content-length') || '0', 10);
  if (len > max) throw new Error('Payload too large');
  try { return await request.json(); }
  catch { throw new Error('Invalid JSON'); }
};
