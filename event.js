(() => {
  const root = document.getElementById('event-root');
  if (!root) return;

  const escape = (v) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const CATEGORY_LABEL = {
    'cars-coffee': 'CARS & COFFEE',
    'canyon':      'CANYON RUN',
    'track-day':   'TRACK DAY',
    'tech-night':  'TECH NIGHT',
    'other':       'MEET',
  };

  const fmtFull = (iso) => {
    const d = new Date(iso);
    const date = d.toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${date} · ${time}`;
  };

  const renderCapacity = (ev) => {
    if (ev.capacity == null) return '<span class="event-spots">No cap · open</span>';
    if (ev.spots_left === 0)  return '<span class="event-spots full">Full</span>';
    return `<span class="event-spots">${ev.spots_left} of ${ev.capacity} spots left</span>`;
  };

  const renderForm = (ev) => {
    if (!ev.rsvp_required) return '';
    if (ev.spots_left === 0) return `
      <div class="event-form-wrap">
        <h3>RSVP closed</h3>
        <p class="form-sub">This one's full. Catch the next meet — <a href="index.html#join">join the list</a>.</p>
      </div>`;
    return `
      <form class="event-form" id="rsvp-form">
        <h3>Reserve your spot</h3>
        <p class="form-sub">${escape(renderCapacityText(ev))}</p>
        <label><span>Name</span><input name="name" type="text" required autocomplete="name" /></label>
        <label><span>Email</span><input name="email" type="email" required autocomplete="email" /></label>
        <label><span>Your N</span>
          <select name="car">
            <option value="">Pick your platform (optional)</option>
            <option>Elantra N</option><option>Kona N</option><option>Veloster N</option>
            <option>i30 N</option><option>Other / Shopping</option>
          </select>
        </label>
        <label><span>Instagram (optional)</span><input name="instagram" type="text" placeholder="@yourhandle" /></label>
        <label><span>Notes (optional)</span><textarea name="notes" rows="2" placeholder="Anything we should know?"></textarea></label>
        <button type="submit" class="btn btn-primary">
          <span>RSVP</span>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M13 5l7 7-7 7-1.4-1.4 4.6-4.6H4v-2h12.2l-4.6-4.6L13 5z"/></svg>
        </button>
        <p class="form-note" data-form-note></p>
      </form>`;
  };

  const renderCapacityText = (ev) => {
    if (ev.capacity == null) return 'Open meet — no cap.';
    return `${ev.spots_left} of ${ev.capacity} spots left.`;
  };

  const render = (ev) => {
    const tag = CATEGORY_LABEL[ev.category] || 'MEET';
    root.innerHTML = `
      <div class="event-back"><a href="index.html#events">← All meets</a></div>
      <div class="event-hero">
        <div class="event-hero-meta">
          <div class="section-tag">${escape(tag)}</div>
          <h1 class="event-title">${escape(ev.title)}</h1>
          <p class="event-when">${escape(fmtFull(ev.starts_at))}</p>
          <p class="event-loc">${escape(ev.location || '')}</p>
          ${renderCapacity(ev)}
        </div>
        ${ev.image_url ? `<img class="event-hero-img" src="${escape(ev.image_url)}" alt="${escape(ev.title)}" />` : ''}
      </div>
      ${ev.description ? `<div class="event-body"><p>${escape(ev.description)}</p></div>` : ''}
      ${renderForm(ev)}
    `;
    const form = document.getElementById('rsvp-form');
    if (form) form.addEventListener('submit', (e) => handleRsvp(e, ev));
  };

  const handleRsvp = async (e, ev) => {
    e.preventDefault();
    const note = e.target.querySelector('[data-form-note]');
    const fd = new FormData(e.target);
    const body = Object.fromEntries(fd.entries());
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true; const old = btn.querySelector('span').textContent; btn.querySelector('span').textContent = 'Sending…';
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(ev.slug)}/rsvp`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`);
      note.textContent = `// You're in. See you ${ev.location ? 'at ' + ev.location : 'there'}.`;
      e.target.reset();
      e.target.querySelectorAll('input, select, textarea, button').forEach(el => el.disabled = true);
    } catch (err) {
      note.textContent = `// ${err.message}`;
      btn.disabled = false; btn.querySelector('span').textContent = old;
    }
  };

  const load = async () => {
    const slug = new URL(location.href).searchParams.get('slug');
    if (!slug) {
      root.innerHTML = `<div class="events-empty">// No event specified. <a href="index.html#events">See all meets</a>.</div>`;
      return;
    }
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(slug)}`, { cache: 'no-store' });
      if (res.status === 404) {
        root.innerHTML = `<div class="events-empty">// Event not found. <a href="index.html#events">See all meets</a>.</div>`;
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { event } = await res.json();
      document.title = `${event.title} — NorCal N Club`;
      render(event);
    } catch (err) {
      root.innerHTML = `<div class="events-empty">// Couldn't load event. ${escape(err.message)}</div>`;
    }
  };
  load();
})();
