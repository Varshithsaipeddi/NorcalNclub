// Shared event-shape helpers so /api/events and /api/admin/events render the same JSON.

import { json } from './responses.js';

export const buildImageUrl = (env, key) => {
  if (!key) return null;
  const base = env.R2_PUBLIC_URL || '';
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/${key}`;
};

// Map a raw D1 row → public-shaped event object.
export const eventToPublic = (env, row) => {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    category: row.category,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    location: row.location,
    description: row.description,
    image_url: buildImageUrl(env, row.image_key),
    capacity: row.capacity,
    rsvp_count: row.rsvp_count,
    spots_left: row.capacity == null ? null : Math.max(0, row.capacity - row.rsvp_count),
    rsvp_required: !!row.rsvp_required,
    featured: !!row.featured,
    status: row.status,
  };
};

// Same as above + admin-only fields (timestamps, image_key for editing).
export const eventToAdmin = (env, row) => {
  if (!row) return null;
  return {
    ...eventToPublic(env, row),
    image_key: row.image_key,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};
