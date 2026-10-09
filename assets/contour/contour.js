/* Contour hero glue for variant D — a plain-JS port of the React effects that drive the www Contour hero.
 * Nothing here decides geometry or framing: `./field.js` is www's `src/motion/field.ts` transpiled verbatim
 * (the mark() SDF with its `cut` step, the desktop layout and the MOB mobile framing), and the markup/CSS come
 * from the www build via scripts/sync-contour-www.py.
 *
 *   ContourField.tsx (mode="hero")  → bootField(): boot after load + idle, capability gate, reveal/fill/heat tweens,
 *                                     pointer heat on .hero__top, pause off-screen / hidden tab, resize
 *   Nav.tsx                          → nav(): hide on scroll down / show on up, ALT readout, mobile menu dialog
 *                                     (open/close, Escape, focus trap)
 *   Clock.tsx                        → the shared site.js clock (data-clock-full = HH:MM:SS Europe/Ljubljana)
 * Not ported: the GSAP scroll flight into the counter and the pinned build stage (HeroFlight.tsx); variant D keeps
 * its own build-stage plate below the fold. */
import { Field, fieldAllowed } from './field.js';

const H = document.documentElement;
const reduced = () => H.classList.contains('rm') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const easeOut2 = (x) => 1 - (1 - x) * (1 - x);
const easeInOut2 = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

/* ---------- ContourField, hero mode ---------- */
function bootField() {
  const cv = document.querySelector('.hero canvas');
  const top = document.querySelector('.hero__top');
  if (!cv || !top || reduced()) return;
  const boot = () => {
    if (!fieldAllowed()) { H.classList.add('no-gl'); return; }
    const f = new Field(cv, { zoomAnchor: [48, 48] });
    if (!f.ok) { H.classList.add('no-gl'); return; }
    // small time-based tweens on the field's own loop (no GSAP needed this early)
    const tweens = [];
    const tween = (key, to, dur, ease = easeOut2) => { for (let i = tweens.length - 1; i >= 0; i--) if (tweens[i].key === key) tweens.splice(i, 1); tweens.push({ key, from: f.state[key], to, t0: performance.now(), dur, ease }); };
    const origFrame = f.frame.bind(f);
    f.frame = (dt) => { const now = performance.now(); for (let i = tweens.length - 1; i >= 0; i--) { const tw = tweens[i]; const x = Math.min(1, (now - tw.t0) / (tw.dur * 1000)); f.state[tw.key] = tw.from + (tw.to - tw.from) * tw.ease(x); if (x >= 1) tweens.splice(i, 1); } origFrame(dt); };
    f.frame(0); f.start(); cv.classList.add('is-live');
    const reveal = () => { tween('reveal', 1, 2.4); setTimeout(() => tween('fill', 1, 1.2, easeInOut2), 500); };
    if (H.classList.contains('intro')) { const mo = new MutationObserver(() => { if (!H.classList.contains('intro')) { mo.disconnect(); reveal(); } }); mo.observe(H, { attributes: true, attributeFilter: ['class'] }); } else reveal();
    const pm = (e) => { const r = cv.getBoundingClientRect(); f.pointer(e.clientX - r.left, e.clientY - r.top); tween('heat', 1, 0.6); };
    const pl = () => tween('heat', 0, 1.2);
    top.addEventListener('pointermove', pm, { passive: true }); top.addEventListener('pointerleave', pl);
    const io = new IntersectionObserver((en) => { if (en[0].isIntersecting && !document.hidden) f.start(); else f.stop(); }); io.observe(cv);
    document.addEventListener('visibilitychange', () => { if (document.hidden) f.stop(); else f.start(); });
    addEventListener('resize', () => f.resize());
  };
  // after LCP: window load, then idle (SPEC §6)
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(boot, { timeout: 2500 }) : setTimeout(boot, 600));
  if (document.readyState === 'complete') idle(); else addEventListener('load', idle, { once: true });
}

/* ---------- Nav ---------- */
function nav() {
  const header = document.querySelector('header.nav');
  const alt = document.querySelector('[data-alt]');
  const menu = document.getElementById('mnav');
  const btn = document.querySelector('.nav__menu');
  if (!header) return;
  let lastY = scrollY, ticking = false, hidden = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY;
      if (y > 200 && y > lastY + 4) hidden = true; else if (y < lastY - 4) hidden = false;
      lastY = y;
      header.classList.toggle('is-hidden', hidden); H.classList.toggle('nav-hidden', hidden);
      if (alt) { const m = H.scrollHeight - innerHeight; alt.textContent = ('00' + (m > 0 ? Math.round((y / m) * 100) : 0)).slice(-3); }
      ticking = false;
    });
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  if (!menu || !btn) return;
  const focusables = () => Array.from(menu.querySelectorAll('a,button'));
  let open = false, onKey = null;
  const setOpen = (o) => {
    open = o;
    menu.classList.toggle('is-open', o); menu.setAttribute('aria-hidden', String(!o)); btn.setAttribute('aria-expanded', String(o));
    focusables().forEach((el) => el.setAttribute('tabindex', o ? '0' : '-1'));
    if (onKey) { document.removeEventListener('keydown', onKey); onKey = null; }
    if (!o) return;
    focusables()[0]?.focus();
    onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') { const f = focusables(); if (!f.length) return; const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    };
    document.addEventListener('keydown', onKey);
  };
  const close = () => { setOpen(false); btn.focus(); };
  btn.addEventListener('click', () => setOpen(!open));
  menu.querySelector('.mnav__close')?.addEventListener('click', close);
  menu.querySelectorAll('nav a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
}

nav();
bootField();
