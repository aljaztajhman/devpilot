/* Devpilot site behaviour. Ordinary interactions stay quiet (fades, a text roll, a line reveal); the product demos
 * do the presenting, and only a device change in a demo gets the full morph.
 * Scroll path (jank follow-up to 630409186): no layout reads per frame. Geometry (dark sections, nav targets,
 * chapters/steps, hero runway, scroll range) is cached by measure() on resize / ResizeObserver / fonts and mapped
 * to the viewport with scrollY — plus #main's handoff pin+transform read from its inline style, not from layout. */
const $ = (s, c = document) => (c ? c.querySelector(s) : null);
const $$ = (s, c = document) => (c ? [...c.querySelectorAll(s)] : []);
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const narrow = matchMedia("(max-width: 1000px)");

/* ---------- Ljubljana clock (+ Contour full HH:MM:SS for HUD) ---------- */
const clockShort = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Ljubljana", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
const clockFull = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Ljubljana", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
const tick = () => {
  const now = new Date();
  const sp = clockShort.formatToParts(now);
  const get = (parts, t) => parts.find((p) => p.type === t)?.value ?? "";
  const short = `${get(sp, "hour")}:${get(sp, "minute")} ${get(sp, "timeZoneName").replace("GMT+1", "CET").replace("GMT+2", "CEST")}`;
  const full = clockFull.format(now);
  $$("[data-clock]").forEach((t) => { t.textContent = t.hasAttribute("data-clock-full") ? full : short; });
};
tick();
setInterval(tick, 1_000);

/* ---------- headline: words rise into place, once ---------- */
for (const el of $$("[data-split]")) {
  let i = 0;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) {
    const frag = document.createDocumentFragment();
    for (const part of n.nodeValue.split(/([ \t\n]+)/)) {
      if (!part) continue;
      if (/^[ \t\n]+$/.test(part)) { frag.append(" "); continue; }
      const w = document.createElement("span");
      w.className = "w";
      const inner = document.createElement("span");
      inner.style.setProperty("--i", i++);
      inner.textContent = part;
      w.append(inner);
      frag.append(w);
    }
    n.replaceWith(frag);
  }
}

/* ---------- nav: text roll, state over dark sections, current section, mobile menu ---------- */
const nav = $("#nav");
for (const a of $$(".nav-links a")) {
  const sup = a.querySelector("sup");
  const label = (sup ? a.childNodes[0].textContent : a.textContent).trim();
  const roll = `<span class="roll"><span data-t="${label}">${label}</span></span>`;
  a.innerHTML = sup ? `${roll}<sup>${sup.textContent}</sup>` : roll;
}
const menuBtn = $(".menu-btn");
menuBtn?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.textContent = open ? "Close" : "Menu";
});
$$(".nav-links a").forEach((a) => a.addEventListener("click", () => {
  nav.classList.remove("open");
  menuBtn?.setAttribute("aria-expanded", "false");
  if (menuBtn) menuBtn.textContent = "Menu";
}));
const darks = $$("[data-theme=dark]");
const sections = $$(".nav-links a").map((a) => [a, $(a.hash)]).filter(([, s]) => s);
const altEl = $("[data-alt]");

/* ---------- layout cache: measured off the scroll path, mapped to the viewport per frame ---------- */
// While D's hero hands off, hero.js pins #main to the viewport top and scales it (translate3d + scale, origin 0 0),
// so anything inside #main is cached in #main's own untransformed coordinates and mapped through that transform.
const main = $("#main");
const HANDOFF = /translate3d\([^,]+,\s*(-?[\d.]+)px,[^)]*\)\s*scale\((-?[\d.]+)\)/;
const geo = { vh: innerHeight, mainTop: 0, maxScroll: 0, heroRun: 0, darks: [], sections: [] };
let lastAlt = "";
function viewMap() {
  let ty = geo.mainTop - scrollY, s = 1;
  if (main?.classList.contains("handoff")) {
    const m = HANDOFF.exec(main.style.transform);
    ty = m ? +m[1] : 0; s = m ? +m[2] : 1;
  }
  return (local, y) => (local ? ty + y * s : y - scrollY);
}
function navState(at) {
  if (!nav) return;
  nav.classList.toggle("scrolled", scrollY > 8);
  const y = 32;
  const dark = geo.darks.find((g) => at(g.local, g.top) <= y && at(g.local, g.bottom) > y)?.el;
  nav.classList.toggle("on-dark", !!dark);
  nav.classList.toggle("on-ink", dark?.id === "contact");
  const mid = geo.vh * .4;
  for (const g of geo.sections) {
    const on = at(g.local, g.top) <= mid && at(g.local, g.bottom) > mid;
    if (on === g.on) continue;
    g.on = on;
    if (on) g.a.setAttribute("aria-current", "true"); else g.a.removeAttribute("aria-current");
  }
  if (altEl) {
    const m = geo.maxScroll;
    const alt = ("00" + (m > 0 ? Math.round((scrollY / m) * 100) : 0)).slice(-3);
    if (alt !== lastAlt) { lastAlt = alt; altEl.textContent = alt; }
  }
}

/* ---------- reveal on scroll ---------- */
const io = new IntersectionObserver((entries) => {
  entries.filter((e) => e.isIntersecting)
    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
    .forEach((e, k) => {
      e.target.style.setProperty("--rd", `${k * 70}ms`);
      e.target.classList.add("in");
      io.unobserve(e.target);
    });
}, { rootMargin: "0px 0px -8% 0px" });
$$(".rv").forEach((el) => io.observe(el));

/* ---------- hero: product names light up their screen; screens drift a little with scroll ---------- */
const visual = $(".hero-visual");
for (const a of $$("[data-hl]")) {
  const shot = $(`[data-shot="${a.dataset.hl}"]`, visual);
  if (!shot) continue;
  const on = () => { visual.classList.add("hl"); shot.classList.add("on"); };
  const off = () => { visual.classList.remove("hl"); shot.classList.remove("on"); };
  a.addEventListener("pointerenter", on);
  a.addEventListener("pointerleave", off);
  a.addEventListener("focus", on);
  a.addEventListener("blur", off);
}
const drift = [[".s-stranko", -.035], [".s-belin", .03], [".s-custom", -.08]].map(([s, k]) => [$(s, visual), k]).filter(([el]) => el);
// D's board hero pins for a scroll runway (assets/contour/board/hero.js); the drift starts once it lets go.
const boardHero = $("#board-stage") && $("#hero");
function parallax() {
  const y = Math.max(scrollY - geo.heroRun, 0);
  if (reduce.matches || y > geo.vh * 1.4) return;
  for (const [el, k] of drift) {
    const next = `translateY(${(y * k).toFixed(1)}px)`;
    if (el.style.transform !== next) el.style.transform = next;
  }
}

/* ---------- demos: messages to and from the frames ---------- */
const demos = new Map(); // contentWindow → controller
function link(iframe, ctl) {
  ctl.ready = false;
  ctl.pending = null;
  ctl.send = (id) => {
    ctl.pending = id;
    if (ctl.ready) iframe.contentWindow?.postMessage({ type: "show", id }, "*");
  };
  iframe.addEventListener("load", () => {
    demos.set(iframe.contentWindow, ctl);
    iframe.contentWindow.postMessage({ type: "ping" }, "*");
  });
  if (iframe.contentWindow) demos.set(iframe.contentWindow, ctl);
}
addEventListener("message", (e) => {
  const ctl = demos.get(e.source);
  if (!ctl || e.data?.type !== "demo-ready" || ctl.ready) return;
  ctl.ready = true;
  if (ctl.pending) ctl.send(ctl.pending);
});

/* ---------- product chapters: the step crossing the reading line drives the demo ---------- */
const line = () => geo.vh * (narrow.matches ? .66 : .52);
const chapters = $$("[data-demo]").map((el) => {
  const ch = {
    el,
    frame: $(".frame", el),
    stage: $(".stage", el),
    steps: $$(".step", el),
    cap: $(".stage-bar .cap", el),
    count: $(".stage-bar .count b", el),
    segs: $(".segs", el),
    at: -1,
  };
  if (ch.segs) ch.segs.innerHTML = ch.steps.map((s, i) => `<button type="button" aria-label="Step ${i + 1}: ${$("h3", s).textContent}"></button>`).join("");
  $$("button", ch.segs).forEach((b, i) => b.addEventListener("click", () => {
    const top = scrollY + ch.steps[i].getBoundingClientRect().top - line() + 2;
    scrollTo({ top, behavior: reduce.matches ? "auto" : "smooth" });
  }));
  link($("iframe", el), ch);
  return ch;
});
function activate(ch, i) {
  if (ch.at === i) return;
  ch.at = i;
  ch.steps.forEach((s, j) => s.classList.toggle("on", j === i));
  $$("button", ch.segs).forEach((b, j) => {
    b.toggleAttribute("aria-current", j === i);
    if (j === i) b.setAttribute("aria-current", "step");
    b.classList.toggle("seen", j < i);
  });
  if (ch.count) ch.count.textContent = String(i + 1).padStart(2, "0");
  if (ch.cap) ch.cap.textContent = $("h3", ch.steps[i]).textContent;
  if (ch.cap && !reduce.matches) ch.cap.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)" });
  ch.send(ch.steps[i].dataset.scene);
}
function chaptersState(at) {
  for (const ch of chapters) {
    const g = ch.geo;
    if (!g || at(g.local, g.bottom) < 0 || at(g.local, g.top) > geo.vh) continue;
    // Start only once the frame itself is on screen, so the first scene isn't played to nobody.
    // (Live read: the frame sits in the sticky stage, so it can't be cached — and it stops once the chapter starts.)
    if (ch.at < 0 && ch.frame.getBoundingClientRect().top > geo.vh * .8) continue;
    const y = line();
    let i = 0;
    g.steps.forEach((top, j) => { if (at(g.local, top) < y) i = j; });
    activate(ch, i);
  }
}
function stageHeights() {
  for (const ch of chapters) ch.stage.style.setProperty("--stage-h", `${ch.stage.offsetHeight}px`);
}

/* ---------- custom websites: an explicit device and language switch ---------- */
const device = $("[data-device-demo]");
if (device) {
  const iframe = $("iframe", device);
  const ctl = {};
  link(iframe, ctl);
  const state = { device: "desktop", lang: "de" };
  let touched = false, started = false;
  const apply = () => {
    $$("[data-device]", device).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.device === state.device)));
    $$("[data-lang]", device).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === state.lang)));
    ctl.send(`${state.device}-${state.lang}`);
  };
  $$(".toggle button", device).forEach((b) => b.addEventListener("click", () => {
    touched = true;
    if (b.dataset.device) state.device = b.dataset.device;
    if (b.dataset.lang) state.lang = b.dataset.lang;
    apply();
  }));
  // On first sight it shows the trick once: desktop → phone → desktop. Any click takes over.
  new IntersectionObserver(([e], obs) => {
    if (!e.isIntersecting || started) return;
    started = true;
    obs.disconnect();
    apply();
    if (reduce.matches) return;
    setTimeout(() => { if (!touched) { state.device = "phone"; apply(); } }, 2600);
    setTimeout(() => { if (!touched) { state.device = "desktop"; apply(); } }, 8200);
  }, { threshold: .55 }).observe($(".frame", device));
}

/* ---------- contact: copy the address ---------- */
for (const b of $$("[data-copy]")) {
  const label = b.textContent;
  let t;
  b.addEventListener("click", async () => {
    const done = (ok) => {
      b.textContent = ok ? "Copied" : "Selected";
      b.classList.add("done");
      clearTimeout(t);
      t = setTimeout(() => { b.textContent = label; b.classList.remove("done"); }, 1800);
    };
    try { await navigator.clipboard.writeText(b.dataset.copy); done(true); }
    catch {
      const el = b.parentElement.querySelector(".email");
      const r = document.createRange(); r.selectNodeContents(el);
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      done(false);
    }
  });
}

/* ---------- measure: the only place the scroll features read layout ---------- */
let measuring = false;
function measure() {
  if (measuring) return;
  measuring = true;
  try {
    geo.vh = innerHeight;
    // Measure #main unpinned and unscaled (as hero.js does), restored before anything paints.
    const pinned = !!main?.classList.contains("handoff"), t = pinned ? main.style.transform : "";
    if (pinned) { main.classList.remove("handoff"); main.style.transform = ""; }
    const mt = main ? main.getBoundingClientRect().top : 0;
    geo.mainTop = mt + scrollY;
    // Inside #main: #main-local px; elsewhere: document px.
    const box = (el) => {
      const r = el.getBoundingClientRect(), local = !!main?.contains(el), o = local ? mt : -scrollY;
      return { el, local, top: r.top - o, bottom: r.bottom - o };
    };
    geo.darks = darks.map(box);
    geo.sections = sections.map(([a, s], k) => ({ a, on: geo.sections[k]?.on, ...box(s) }));
    for (const ch of chapters) ch.geo = { ...box(ch.el), steps: ch.steps.map((s) => box(s).top) };
    geo.heroRun = boardHero ? boardHero.offsetHeight - geo.vh : 0;
    geo.maxScroll = document.documentElement.scrollHeight - geo.vh;
    if (pinned) { main.style.transform = t; main.classList.add("handoff"); }
  } finally {
    measuring = false;
  }
}

/* ---------- one scroll loop ---------- */
let queued = false;
function frame() {
  queued = false;
  const at = viewMap();
  navState(at);
  parallax();
  chaptersState(at);
}
const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
const remeasure = () => { measure(); schedule(); };
addEventListener("scroll", schedule, { passive: true });
addEventListener("resize", () => { stageHeights(); remeasure(); });
reduce.addEventListener?.("change", remeasure);
// Document height can change without a resize (fonts, late images, open <details>, the hero runway).
if (window.ResizeObserver) {
  const ro = new ResizeObserver(remeasure);
  ro.observe(document.body);
  if (main) ro.observe(main);
}
document.fonts?.ready.then(remeasure);
stageHeights();
measure();
frame();

/* Prefetch the first product demo after idle — Contour D keeps iframes lazy; this warms the cache without competing with hero. */
const warmDemo = () => {
  const iframe = $("[data-demo=stranko] iframe");
  if (!iframe?.src) return;
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = iframe.getAttribute("src");
  link.as = "document";
  document.head.append(link);
};
if ("requestIdleCallback" in window) requestIdleCallback(warmDemo, { timeout: 4000 });
else setTimeout(warmDemo, 2000);

