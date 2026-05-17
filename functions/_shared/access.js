// Verify a Cloudflare Access JWT (RS256) against the team's JWKS.
// Reference: https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/

const ENCODER = new TextEncoder();

const b64urlToBytes = (s) => {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  const bin = atob(s + '='.repeat(pad));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const b64urlToJson = (s) => {
  const bytes = b64urlToBytes(s);
  return JSON.parse(new TextDecoder().decode(bytes));
};

// Per-isolate JWKS cache. CF reuses isolates across requests so this is
// effectively a process-local cache with a 5-minute TTL.
const JWKS_TTL_MS = 5 * 60 * 1000;
let jwksCache = { fetchedAt: 0, teamDomain: '', keys: new Map() };

const importJwk = (jwk) =>
  crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );

const fetchJwks = async (teamDomain) => {
  const fresh = Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS && jwksCache.teamDomain === teamDomain;
  if (fresh && jwksCache.keys.size) return jwksCache.keys;

  const url = `https://${teamDomain}/cdn-cgi/access/certs`;
  const res = await fetch(url, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const { keys = [] } = await res.json();

  const map = new Map();
  for (const jwk of keys) {
    if (!jwk.kid) continue;
    map.set(jwk.kid, await importJwk(jwk));
  }
  jwksCache = { fetchedAt: Date.now(), teamDomain, keys: map };
  return map;
};

// Verifies a CF Access JWT and returns its decoded payload. Throws on any failure.
export const verifyAccessJwt = async (token, { teamDomain, audience }) => {
  if (!token || typeof token !== 'string') throw new Error('Missing token');
  if (!teamDomain || !audience) throw new Error('Access not configured');

  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed JWT');

  const header  = b64urlToJson(parts[0]);
  const payload = b64urlToJson(parts[1]);
  const sig     = b64urlToBytes(parts[2]);

  if (header.alg !== 'RS256') throw new Error(`Unsupported alg: ${header.alg}`);
  if (!header.kid)            throw new Error('Missing kid');

  const keys = await fetchJwks(teamDomain);
  const key  = keys.get(header.kid);
  if (!key) throw new Error('Unknown signing key');

  const signed = ENCODER.encode(`${parts[0]}.${parts[1]}`);
  const valid  = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sig, signed);
  if (!valid) throw new Error('Bad signature');

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp < now)         throw new Error('Token expired');
  if (typeof payload.nbf === 'number' && payload.nbf > now + 30)    throw new Error('Token not yet valid');
  if (typeof payload.iss === 'string' && !payload.iss.includes(teamDomain)) throw new Error('Bad issuer');

  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(audience)) throw new Error('Bad audience');

  return payload;
};
