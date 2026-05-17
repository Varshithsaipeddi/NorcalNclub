// POST /api/admin/upload  (multipart/form-data, field name "file")
// Stores the file in R2 under `uploads/<ulid>.<ext>` and returns the key + URL.

import { json, bad, serverErr } from '../../_shared/responses.js';
import { ulid } from '../../_shared/ulid.js';

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
]);
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

const extFromType = (t) => ({
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/gif': 'gif', 'image/avif': 'avif',
}[t] || 'bin');

export const onRequestPost = async ({ request, env }) => {
  try {
    if (!env.UPLOADS) return json({ error: 'R2 binding UPLOADS missing' }, 503);

    const ct = request.headers.get('content-type') || '';
    if (!ct.startsWith('multipart/form-data')) return bad('Expected multipart/form-data');

    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') return bad('Missing "file" field', 422);
    if (!ALLOWED_TYPES.has(file.type))     return bad(`Unsupported type: ${file.type}`, 422);
    if (file.size > MAX_BYTES)             return bad(`File too large (max ${MAX_BYTES / 1024 / 1024}MB)`, 413);

    const key = `uploads/${ulid()}.${extFromType(file.type)}`;
    await env.UPLOADS.put(key, file.stream(), {
      httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
    });

    const base = (env.R2_PUBLIC_URL || '').replace(/\/$/, '');
    const url  = base ? `${base}/${key}` : null;
    return json({ key, url, size: file.size, content_type: file.type }, 201);
  } catch (err) {
    return serverErr(err);
  }
};
