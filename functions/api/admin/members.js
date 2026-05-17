// /api/admin/members
//   GET   → list all displayed-member profiles
//   POST  → create

import { json, bad, serverErr, readJson } from '../../_shared/responses.js';
import { slugify } from '../../_shared/ulid.js';

const trim = (s, max = 1000) => String(s ?? '').trim().slice(0, max);
const intOrNull = (v) => {
  if (v === '' || v == null) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

const memberToAdmin = (env, row) => {
  if (!row) return null;
  let mods = [];
  try { mods = row.car_mods ? JSON.parse(row.car_mods) : []; } catch {}
  return {
    id: row.id, name: row.name, instagram: row.instagram, city: row.city,
    joined: row.joined, bio: row.bio,
    photo_url: row.photo_key && env.R2_PUBLIC_URL
      ? `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${row.photo_key}` : null,
    photo_key: row.photo_key,
    car: {
      model: row.car_model, year: row.car_year, color: row.car_color,
      plate: row.car_plate, transmission: row.car_transmission,
      bhp: row.car_bhp, tune: row.car_tune, mods,
    },
    status: row.status,
  };
};
export { memberToAdmin };

export const onRequestGet = async ({ env }) => {
  try {
    const { results = [] } = await env.DB.prepare(
      `SELECT * FROM members ORDER BY joined DESC, name ASC LIMIT 500`
    ).all();
    return json({ members: results.map(r => memberToAdmin(env, r)) });
  } catch (err) { return serverErr(err); }
};

export const onRequestPost = async ({ request, env }) => {
  try {
    const body = await readJson(request);
    const name = trim(body.name, 120);
    if (!name) return bad('Name is required', 422);

    const id = trim(body.id, 64) || slugify(name);
    if (!id)  return bad('Could not derive id from name', 422);

    const car = body.car || {};
    const mods = Array.isArray(car.mods) ? car.mods.filter(Boolean).map(s => trim(s, 200)) : [];

    await env.DB.prepare(
      `INSERT INTO members
         (id, name, instagram, city, joined, bio, photo_key,
          car_model, car_year, car_color, car_plate, car_transmission,
          car_bhp, car_tune, car_mods, status)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16)`
    ).bind(
      id, name,
      trim(body.instagram, 80).replace(/^@/, '') || null,
      trim(body.city, 80) || null,
      trim(body.joined, 16) || null,
      trim(body.bio, 1000) || null,
      trim(body.photo_key, 300) || null,
      trim(car.model, 80) || null,
      intOrNull(car.year),
      trim(car.color, 60) || null,
      trim(car.plate, 20) || null,
      trim(car.transmission, 20) || null,
      intOrNull(car.bhp),
      trim(car.tune, 200) || null,
      JSON.stringify(mods),
      body.status === 'archived' ? 'archived' : 'published',
    ).run();

    const row = await env.DB.prepare(`SELECT * FROM members WHERE id = ?1`).bind(id).first();
    return json({ member: memberToAdmin(env, row) }, 201);
  } catch (err) {
    if (err.message === 'Invalid JSON' || err.message === 'Payload too large') return bad(err.message, 400);
    if (String(err.message || '').includes('UNIQUE')) return bad('A member with that id already exists', 409);
    return serverErr(err);
  }
};
