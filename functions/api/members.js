// /api/members
//   GET  → public list of displayed-member profiles (Garage page)
//   POST → Join form intake (creates a member_signups row, NOT a member profile)

import { json, bad, serverErr, readJson } from '../_shared/responses.js';

const memberToPublic = (env, row) => {
  if (!row) return null;
  let mods = [];
  try { mods = row.car_mods ? JSON.parse(row.car_mods) : []; } catch {}
  return {
    id: row.id,
    name: row.name,
    instagram: row.instagram,
    city: row.city,
    joined: row.joined,
    bio: row.bio,
    photo: row.photo_key && env.R2_PUBLIC_URL
      ? `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${row.photo_key}` : null,
    car: {
      model: row.car_model, year: row.car_year, color: row.car_color,
      plate: row.car_plate, transmission: row.car_transmission,
      bhp: row.car_bhp, tune: row.car_tune, mods,
    },
  };
};

export const onRequestGet = async ({ env }) => {
  try {
    const { results = [] } = await env.DB.prepare(
      `SELECT * FROM members WHERE status = 'published' ORDER BY name ASC LIMIT 500`
    ).all();
    return json({ members: results.map(r => memberToPublic(env, r)) });
  } catch (err) { return serverErr(err); }
};

const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const trim = (s, max = 200) => String(s ?? '').trim().slice(0, max);

export const onRequestPost = async ({ request, env }) => {
  try {
    const body  = await readJson(request);
    const name  = trim(body.name, 120);
    const email = trim(body.email, 200).toLowerCase();
    const car   = trim(body.car, 80) || null;
    const ig    = trim(body.ig, 80).replace(/^@/, '') || null;

    if (!name)            return bad('Name is required', 422);
    if (!isEmail(email))  return bad('Valid email is required', 422);

    await env.DB.prepare(
      `INSERT INTO member_signups (name, email, car, instagram) VALUES (?1, ?2, ?3, ?4)`
    ).bind(name, email, car, ig).run();

    return json({ ok: true }, 201);
  } catch (err) {
    if (err.message === 'Invalid JSON' || err.message === 'Payload too large') return bad(err.message, 400);
    return serverErr(err);
  }
};
