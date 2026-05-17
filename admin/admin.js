// Shared admin helpers — fetch wrapper that surfaces errors and a few DOM utils.

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const escapeHtml = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const api = async (path, { method = 'GET', body, isForm = false } = {}) => {
  const opts = { method, credentials: 'include' };
  if (body !== undefined) {
    if (isForm) {
      opts.body = body;                                  // FormData — let browser set Content-Type
    } else {
      opts.headers = { 'content-type': 'application/json' };
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(path, opts);
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = (data && data.error) || `HTTP ${res.status}`;
    const err = new Error(msg); err.status = res.status; err.data = data;
    throw err;
  }
  return data;
};

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
};
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso); if (isNaN(d)) return iso;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Convert a Date input value (local) to an ISO string with the user's tz offset baked in.
const localInputToIso = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return d.toISOString();
};
// Inverse — for prefilling <input type="datetime-local">
const isoToLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso); if (isNaN(d)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const setActive = () => {
  const here = location.pathname.replace(/\/$/, '');
  $$('.admin-bar nav a').forEach(a => {
    const href = a.getAttribute('href').replace(/\/$/, '');
    if (href === here || (href !== '/admin' && here.endsWith(href))) a.classList.add('active');
  });
};

// Surface any unauthenticated state by sending the user to CF Access login.
const ensureAuth = async () => {
  try { await api('/api/admin/events?probe=1'); }
  catch (err) {
    if (err.status === 401 || err.status === 403) {
      // Force a navigation that CF Access will intercept and challenge.
      location.href = '/admin/';
    } else {
      console.warn('admin probe non-auth error:', err);
    }
  }
};

window.NCAdmin = { $, $$, api, escapeHtml, fmtDateTime, fmtDate, localInputToIso, isoToLocalInput, setActive, ensureAuth };

document.addEventListener('DOMContentLoaded', setActive);
