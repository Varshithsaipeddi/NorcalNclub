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

  // Subtle parallax on hero glows
  const glows = $$('.hero-glow');
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && glows.length) {
    document.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      glows[0].style.transform = `translate(${x}px, ${y}px)`;
      glows[1].style.transform = `translate(${-x}px, ${-y}px)`;
    }, { passive: true });
  }

  // Form handler — placeholder. Wire to Formspree / Netlify / your endpoint later.
  window.NCLUB = {
    handleJoin(e) {
      e.preventDefault();
      const note = $('[data-form-note]');
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd.entries());
      console.log('Join request:', data);
      note.textContent = `// Thanks ${data.name.split(' ')[0]}. We'll be in touch.`;
      e.target.reset();
      return false;
    }
  };
})();
