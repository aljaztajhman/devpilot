/* Nextgen site behaviour. Ordinary interactions stay quiet (fades, a text roll, a line reveal); the product demos
 * do the presenting, and only a device change in a demo gets the full morph. */
const $ = (s, c = document) => (c ? c.querySelector(s) : null);
const $$ = (s, c = document) => (c ? [...c.querySelectorAll(s)] : []);
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
const narrow = matchMedia("(max-width: 1000px)");

/* ---------- Ljubljana clock ---------- */
const clock = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Ljubljana", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
const tick = () => {
  const parts = clock.formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
  const text = `${get("hour")}:${get("minute")} ${get("timeZoneName").replace("GMT+1", "CET").replace("GMT+2", "CEST")}`;
  $$("[data-clock]").forEach((t) => (t.textContent = text));
};
tick();
setInterval(tick, 20_000);

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
  const t = a.textContent;
  a.innerHTML = `<span class="roll"><span data-t="${t}">${t}</span></span>`;
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
function navState() {
  if (!nav) return;
  nav.classList.toggle("scrolled", scrollY > 8);
  const y = 32;
  const dark = darks.find((s) => { const r = s.getBoundingClientRect(); return r.top <= y && r.bottom > y; });
  nav.classList.toggle("on-dark", !!dark);
  nav.classList.toggle("on-ink", dark?.id === "contact");
  const mid = innerHeight * .4;
  for (const [a, s] of sections) {
    const r = s.getBoundingClientRect();
    a.toggleAttribute("aria-current", r.top <= mid && r.bottom > mid);
    if (a.hasAttribute("aria-current")) a.setAttribute("aria-current", "true");
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
function parallax() {
  if (reduce.matches || scrollY > innerHeight * 1.4) return;
  for (const [el, k] of drift) el.style.transform = `translateY(${(scrollY * k).toFixed(1)}px)`;
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
const line = () => innerHeight * (narrow.matches ? .66 : .52);
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
function chaptersState() {
  for (const ch of chapters) {
    const r = ch.el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) continue;
    // Start only once the frame itself is on screen, so the first scene isn't played to nobody.
    if (ch.at < 0 && ch.frame.getBoundingClientRect().top > innerHeight * .8) continue;
    const y = line();
    let i = 0;
    ch.steps.forEach((s, j) => { if (s.getBoundingClientRect().top < y) i = j; });
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

/* ---------- one scroll loop ---------- */
let queued = false;
function frame() {
  queued = false;
  navState();
  parallax();
  chaptersState();
}
const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
addEventListener("scroll", schedule, { passive: true });
addEventListener("resize", () => { stageHeights(); schedule(); });
stageHeights();
frame();
