// Minimal ULID — 26-char Crockford base32, time-sortable, lexicographic.
// Doesn't aim for monotonic guarantees; we never insert >1 row per millisecond.

const ENC = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const encodeTime = (ms, len = 10) => {
  let s = '';
  for (let i = len - 1; i >= 0; i--) {
    s = ENC[ms % 32] + s;
    ms = Math.floor(ms / 32);
  }
  return s;
};

const encodeRand = (len = 16) => {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = '';
  for (let i = 0; i < len; i++) s += ENC[bytes[i] % 32];
  return s;
};

export const ulid = (now = Date.now()) => encodeTime(now) + encodeRand();

// Slugify free-text → URL-safe lowercase-dashed string.
export const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
