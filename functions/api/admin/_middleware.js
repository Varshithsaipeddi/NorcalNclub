// Runs before every /api/admin/* function. Verifies the CF Access JWT and
// attaches { email } to data so downstream handlers know who's calling.

import { json } from '../../_shared/responses.js';
import { verifyAccessJwt } from '../../_shared/access.js';

export const onRequest = async (context) => {
  const { request, env, data, next } = context;

  // CORS preflight (admin UI is same-origin so this is theoretical, but cheap).
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': new URL(request.url).origin,
        'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        'access-control-allow-headers': 'content-type,cf-access-jwt-assertion',
      },
    });
  }

  if (!env.ACCESS_AUD || !env.ACCESS_TEAM_DOMAIN) {
    return json({ error: 'Admin auth not configured (ACCESS_AUD / ACCESS_TEAM_DOMAIN missing)' }, 503);
  }

  const token = request.headers.get('cf-access-jwt-assertion')
             || readCookie(request, 'CF_Authorization');
  if (!token) return json({ error: 'Unauthorized' }, 401);

  try {
    const payload = await verifyAccessJwt(token, {
      teamDomain: env.ACCESS_TEAM_DOMAIN,
      audience:   env.ACCESS_AUD,
    });
    data.email = payload.email || payload.identity_nonce || 'unknown';
  } catch (err) {
    return json({ error: `Unauthorized: ${err.message}` }, 401);
  }

  return next();
};

const readCookie = (request, name) => {
  const cookie = request.headers.get('cookie') || '';
  for (const part of cookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
};
