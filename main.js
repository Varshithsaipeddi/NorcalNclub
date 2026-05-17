(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // Year stamps
  const year = new Date().getFullYear();
  $$('[data-year]').forEach(el => el.textContent = year);

  // Sticky nav background on scroll
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile nav toggle
  const toggle = $('.nav-toggle');
  const links = $('.nav-links');
  toggle.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  $$('.nav-links a').forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));

  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  // Animated counters
  const animateCount = (el, target, duration = 1400) => {
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased).toLocaleString();
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const statIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        animateCount(el, parseInt(el.dataset.count, 10));
        statIO.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  $$('[data-count]').forEach(el => statIO.observe(el));

  // Subtle parallax on hero glows — skip on touch / reduced-motion / narrow screens
  const glows = $$('.hero-glow');
  const hasFinePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const wideEnough = matchMedia('(min-width: 800px)').matches;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (hasFinePointer && wideEnough && !reducedMotion && glows.length) {
    document.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      glows[0].style.transform = `translate(${x}px, ${y}px)`;
      glows[1].style.transform = `translate(${-x}px, ${-y}px)`;
    }, { passive: true });
  }

  // ─── Events: fetch from /api/events and render into the existing grid ───
  const escapeHtml = (v) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const CATEGORY_LABEL = {
    'cars-coffee': 'CARS & COFFEE',
    'canyon':      'CANYON RUN',
    'track-day':   'TRACK DAY',
    'tech-night':  'TECH NIGHT',
    'other':       'MEET',
  };

  const fmtMonth = (d) => d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const fmtDay   = (d) => String(d.getDate()).padStart(2, '0');
  const fmtTime  = (d) => d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' });

  const renderEventCard = (ev) => {
    const start = new Date(ev.starts_at);
    const tag = CATEGORY_LABEL[ev.category] || 'MEET';
    const where = [ev.location, fmtTime(start)].filter(Boolean).join(' · ');
    const featured = ev.featured ? ' featured' : '';
    const rsvpHref = ev.rsvp_required ? `event.html?slug=${encodeURIComponent(ev.slug)}` : '#join';
    const spotsBadge = ev.capacity != null
      ? (ev.spots_left === 0
          ? `<span class="event-spots full">Full</span>`
          : `<span class="event-spots">${ev.spots_left} of ${ev.capacity} left</span>`)
      : '';
    return `
      <article class="event-card reveal${featured}">
        <div class="event-date">
          <span class="event-month">${escapeHtml(fmtMonth(start))}</span>
          <span class="event-day">${escapeHtml(fmtDay(start))}</span>
        </div>
        <div class="event-meta">
          <div class="event-tag">${escapeHtml(tag)}</div>
          <h3>${escapeHtml(ev.title)}</h3>
          <p class="event-where">${escapeHtml(where)}</p>
          ${ev.description ? `<p class="event-desc">${escapeHtml(ev.description)}</p>` : ''}
          ${spotsBadge}
        </div>
        <a class="event-rsvp" href="${rsvpHref}">${ev.rsvp_required ? 'Details →' : 'RSVP →'}</a>
      </article>
    `;
  };

  const loadEvents = async () => {
    const grid = $('#events-grid');
    const empty = $('[data-events-empty]');
    if (!grid) return;
    try {
      const res = await fetch('/api/events', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { events = [] } = await res.json();
      if (!events.length) {
        grid.innerHTML = '';
        empty?.classList.remove('hidden');
        return;
      }
      grid.innerHTML = events.map(renderEventCard).join('');
      // Apply the reveal animation immediately for cards already in view.
      requestAnimationFrame(() => grid.querySelectorAll('.reveal').forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('visible');
        else io.observe(el);
      }));
    } catch (err) {
      console.error('events load failed:', err);
      grid.innerHTML = `<div class="events-loading">// couldn't load meets. Try again in a moment.</div>`;
    }
  };
  loadEvents();

  // ─── Garage: fetch from /api/members and render a sampled strip ──────────
  const N_ACCENT = {
    'Elantra N':  '#1f4dff',
    'Kona N':     '#ff2bd6',
    'Veloster N': '#00e5ff',
    'i30 N':      '#00ff9d',
    'i20 N':      '#ffe600',
  };
  const DEFAULT_ACCENT = '#ff2e3d';
  const GARAGE_MAX = 6;

  const sample = (arr, n) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, n);
  };

  const renderRideCard = (m) => {
    const c = m.car || {};
    const model = c.model || 'N';
    const accent = N_ACCENT[model] || DEFAULT_ACCENT;
    const caption = [c.color, m.instagram ? `@${m.instagram}` : null].filter(Boolean).join(' · ');
    const placeholder = [model, c.color].filter(Boolean).join(' · ');
    const imgAttrs = m.photo
      ? `style="background-image:url('${escapeHtml(m.photo)}'); background-size:cover; background-position:center"`
      : `data-car="${escapeHtml(placeholder)}"`;
    return `
      <figure class="ride reveal" style="--accent:${accent}">
        <div class="ride-img" ${imgAttrs}></div>
        <figcaption>
          <strong>${escapeHtml(model)}</strong>
          ${caption ? `<span>${escapeHtml(caption)}</span>` : ''}
        </figcaption>
      </figure>
    `;
  };

  const loadGarage = async () => {
    const grid = $('#gallery-grid');
    if (!grid) return;
    try {
      const res = await fetch('/api/members', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { members = [] } = await res.json();
      if (!members.length) {
        grid.innerHTML = `<div class="events-loading">// no rides in the Garage yet — be the first to <a href="#join">join</a>.</div>`;
        return;
      }
      grid.innerHTML = sample(members, GARAGE_MAX).map(renderRideCard).join('');
      requestAnimationFrame(() => grid.querySelectorAll('.reveal').forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('visible');
        else io.observe(el);
      }));
    } catch (err) {
      console.error('garage load failed:', err);
      grid.innerHTML = `<div class="events-loading">// couldn't load the Garage. Try again in a moment.</div>`;
    }
  };
  loadGarage();

  // ─── Forms ────────────────────────────────────────────────────────────────
  const submit = async (form, url, noteEl, successMsg) => {
    const btn = form.querySelector('button[type="submit"]');
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Sending…'; }
    if (noteEl) noteEl.textContent = '';
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`);
      if (noteEl) noteEl.textContent = `// ${successMsg}`;
      form.reset();
      return out;
    } catch (err) {
      if (noteEl) noteEl.textContent = `// ${err.message}`;
      throw err;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Send'; }
    }
  };

  window.NCLUB = {
    submit,
    async handleJoin(e) {
      e.preventDefault();
      const note = $('[data-form-note]');
      const fd = new FormData(e.target);
      const firstName = String(fd.get('name') || 'there').split(' ')[0];
      try {
        await submit(e.target, '/api/members', note, `Thanks ${firstName}. We'll be in touch.`);
      } catch {/* shown in note */}
      return false;
    },
  };
})();
