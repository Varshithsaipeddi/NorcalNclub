(() => {
  const grid = document.getElementById('members-grid');
  const reshuffleBtn = document.getElementById('reshuffle');
  const countEl = document.querySelector('[data-member-count]');

  // Hyundai N model → accent color (matches the gallery card vibe on index)
  const ACCENT = {
    'Elantra N':  '#1f4dff',
    'Kona N':     '#ff2bd6',
    'Veloster N': '#00e5ff',
    'i30 N':      '#00ff9d',
    'i20 N':      '#ffe600',
    'default':    '#ff2e3d'
  };

  const fmtJoined = (s) => {
    if (!s) return '';
    const [y, m] = s.split('-');
    const d = new Date(parseInt(y, 10), parseInt(m || '1', 10) - 1, 1);
    return d.toLocaleString(undefined, { month: 'short', year: 'numeric' });
  };

  // Fisher–Yates
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const memberCard = (m, idx) => {
    const c = m.car || {};
    const accent = ACCENT[c.model] || ACCENT.default;
    const initials = (m.name || '?').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
    const mods = (c.mods || []).map(x => `<li>${escape(x)}</li>`).join('');
    const ig = m.instagram
      ? `<a class="member-ig" href="https://instagram.com/${encodeURIComponent(m.instagram)}" target="_blank" rel="noopener">@${escape(m.instagram)} ↗</a>`
      : '';

    return `
      <article class="member-card reveal" style="--accent:${accent}; animation-delay:${idx * 60}ms">
        <header class="member-head">
          <div class="member-photo" data-initials="${escape(initials)}"
               ${m.photo ? `style="background-image:url('${escape(m.photo)}')"` : ''}></div>
          <div class="member-id">
            <h3>${escape(m.name || 'Unknown driver')}</h3>
            <div class="member-meta">
              <span>${escape(m.city || '')}</span>
              ${m.joined ? `<span class="dot-sep">·</span><span>Member since ${escape(fmtJoined(m.joined))}</span>` : ''}
            </div>
            ${ig}
          </div>
          <div class="member-badge">${escape(c.model || 'N')}</div>
        </header>

        ${m.bio ? `<p class="member-bio">${escape(m.bio)}</p>` : ''}

        <div class="member-spec">
          <div><span>Year</span><strong>${escape(c.year || '—')}</strong></div>
          <div><span>Color</span><strong>${escape(c.color || '—')}</strong></div>
          <div><span>Plate</span><strong class="plate">${escape(c.plate || '—')}</strong></div>
          <div><span>Trans</span><strong>${escape(c.transmission || '—')}</strong></div>
          <div><span>BHP</span><strong>${escape(c.bhp || '—')}</strong></div>
          <div><span>Tune</span><strong>${escape(c.tune || 'Stock')}</strong></div>
        </div>

        ${mods ? `
          <div class="member-mods">
            <div class="mods-label">// Mods</div>
            <ul>${mods}</ul>
          </div>` : ''}
      </article>
    `;
  };

  const escape = (v) => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  let MEMBERS = [];

  const render = () => {
    if (!MEMBERS.length) {
      grid.innerHTML = `<div class="members-empty">// no members yet — add JSON files in /members/ and list them in index.json</div>`;
      return;
    }
    const order = shuffle(MEMBERS);
    grid.innerHTML = order.map(memberCard).join('');
    // Trigger reveal animation immediately (we're already past the fold)
    requestAnimationFrame(() => {
      grid.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    });
  };

  const load = async () => {
    try {
      const res = await fetch('/api/members', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { members = [] } = await res.json();
      MEMBERS = members;
      countEl.textContent = MEMBERS.length;
      render();
    } catch (err) {
      console.error(err);
      grid.innerHTML = `<div class="members-empty">// couldn't load members. ${err.message}</div>`;
    }
  };

  reshuffleBtn.addEventListener('click', render);
  load();
})();
