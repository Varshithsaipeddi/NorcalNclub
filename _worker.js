// Worker entry for the new Workers + Static Assets deployment model.
// Replaces Cloudflare Pages Functions auto-routing with a small dispatcher
// that calls the same handler modules under functions/api/.

import * as eventsList    from './functions/api/events.js';
import * as eventDetail   from './functions/api/events/[id].js';
import * as eventRsvp     from './functions/api/events/[id]/rsvp.js';
import * as membersPublic from './functions/api/members.js';

import * as adminAuth        from './functions/api/admin/_middleware.js';
import * as adminEvents      from './functions/api/admin/events.js';
import * as adminEventDetail from './functions/api/admin/events/[id].js';
import * as adminMembers     from './functions/api/admin/members.js';
import * as adminMemberById  from './functions/api/admin/members/[id].js';
import * as adminRsvps       from './functions/api/admin/rsvps.js';
import * as adminSignups     from './functions/api/admin/signups.js';
import * as adminUpload      from './functions/api/admin/upload.js';

const METHOD_EXPORT = {
  GET:     'onRequestGet',
  POST:    'onRequestPost',
  PATCH:   'onRequestPatch',
  PUT:     'onRequestPut',
  DELETE:  'onRequestDelete',
  OPTIONS: 'onRequestOptions',
};

const route = (pattern, mod, opts = {}) => {
  const keys = [];
  const re = new RegExp(
    '^' + pattern.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, k) => {
      keys.push(k);
      return '([^/]+)';
    }) + '/?$'
  );
  return { re, keys, mod, admin: !!opts.admin };
};

const ROUTES = [
  route('/api/events',                eventsList),
  route('/api/events/:id',            eventDetail),
  route('/api/events/:id/rsvp',       eventRsvp),
  route('/api/members',               membersPublic),

  route('/api/admin/events',          adminEvents,      { admin: true }),
  route('/api/admin/events/:id',      adminEventDetail, { admin: true }),
  route('/api/admin/members',         adminMembers,     { admin: true }),
  route('/api/admin/members/:id',     adminMemberById,  { admin: true }),
  route('/api/admin/rsvps',           adminRsvps,       { admin: true }),
  route('/api/admin/signups',         adminSignups,     { admin: true }),
  route('/api/admin/upload',          adminUpload,      { admin: true }),
];

const callHandler = async (mod, ctx) => {
  const fn = mod[METHOD_EXPORT[ctx.request.method]] || mod.onRequest;
  if (!fn) return new Response('Method Not Allowed', { status: 405 });
  return await fn(ctx);
};

export default {
  async fetch(request, env, executionCtx) {
    const url = new URL(request.url);

    for (const r of ROUTES) {
      const m = url.pathname.match(r.re);
      if (!m) continue;

      const params = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      const data = {};

      const ctx = {
        request,
        env,
        params,
        data,
        waitUntil: executionCtx.waitUntil.bind(executionCtx),
        next: () => callHandler(r.mod, ctx),
      };

      if (r.admin) {
        return await adminAuth.onRequest(ctx);
      }
      return await callHandler(r.mod, ctx);
    }

    // Not an API path → serve a static asset from the bundle.
    return env.ASSETS.fetch(request);
  },
};
