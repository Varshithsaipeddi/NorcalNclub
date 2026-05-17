// /api/admin/members/:id
//   GET, PATCH, DELETE

import { json, bad, notFound, serverErr, readJson } from '../../../_shared/responses.js';
import { memberToAdmin } from '../members.js';

const trim = (s, max = 1000) => String(s ?? '').trim().slice(0, max);
const intOrNull = (v) => {
  if (v === '' || v == null) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};

export const onRequestGet = async ({ params, env }) => {
  try {
    const row = await env.DB.prepare(`SELECT * FROM members WHERE id = ?1`).bind(params.id).first();
    if (!row) return notFound('Member not found');
    return json({ member: memberToAdmin(env, row) });
  } catch (err) { return serverErr(err); }
};

export const onRequestPatch = async ({ request, params, env }) => {
  try {
    const row = await env.DB.prepare(`SELECT * FROM members WHERE id = ?1`).bind(params.id).first();
    if (!row) return notFound('Member not found');

    const body = await readJson(request);
    const car = body.car || {};
    const fields = {};
    if ('name' in body)      fields.name = trim(body.name, 120);
    if ('instagram' in body) fields.instagram = trim(body.instagram, 80).replace(/^@/, '') || null;
    if ('city' in body)      fields.city = trim(body.city, 80) || null;
    if ('joined' in body)    fields.joined = trim(body.joined, 16) || null;
    if ('bio' in body)       fields.bio = trim(body.bio, 1000) || null;
    if ('photo_key' in body) fields.photo_key = trim(body.photo_key, 300) || null;
    if ('status' in body)    fields.status = body.status === 'archived' ? 'archived' : 'published';

    if ('model' in car)         fields.car_model = trim(car.model, 80) || null;
    if ('year' in car)          fields.car_year = intOrNull(car.year);
    if ('color' in car)         fields.car_color = trim(car.color, 60) || null;
    if ('plate' in car)         fields.car_plate = trim(car.plate, 20) || null;
    if ('transmission' in car)  fields.car_transmission = trim(car.transmission, 20) || null;
    if ('bhp' in car)           fields.car_bhp = intOrNull(car.bhp);
    if ('tune' in car)          fields.car_tune = trim(car.tune, 200) || null;
    if ('mods' in car && Array.isArray(car.mods))
      fields.car_mods = JSON.stringify(car.mods.filter(Boolean).map(s => trim(s, 200)));

    const keys = Object.keys(fields);
    if (!keys.length) return bad('No editable fields provided', 422);

    const set = keys.map((k, i) => `${k} = ?${i + 2}`).join(', ');
    await env.DB.prepare(`UPDATE members SET ${set} WHERE id = ?1`)
      .bind(row.id, ...keys.map(k => fields[k])).run();

    const updated = await env.DB.prepare(`SELECT * FROM members WHERE id = ?1`).bind(row.id).first();
    return json({ member: memberToAdmin(env, updated) });
  } catch (err) {
    if (err.message === 'Invalid JSON' || err.message === 'Payload too large') return bad(err.message, 400);
    return serverErr(err);
  }
};

export const onRequestDelete = async ({ params, env }) => {
  try {
    const row = await env.DB.prepare(`SELECT * FROM members WHERE id = ?1`).bind(params.id).first();
    if (!row) return notFound('Member not found');
    await env.DB.prepare(`DELETE FROM members WHERE id = ?1`).bind(row.id).run();
    return json({ ok: true });
  } catch (err) { return serverErr(err); }
};
