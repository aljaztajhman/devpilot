/* Shared controller for the product demos embedded in the site.
 *
 * The page posts {type: "show", id} into the frame when a step scrolls into place; the frame answers
 * {type: "demo-ready"} once and {type: "landed", id} after each scene arrives.
 *
 * Two kinds of change, on purpose:
 * - an ordinary step is calm: the window stays put, its content cross-fades and settles in under half a second;
 * - the full part-by-part morph (morph-engine) is kept for the one moment it explains something: the device
 *   changing, desktop to phone or back.
 *
 * Opened directly (not in a frame), a demo plays its scenes in order so it can be checked on its own.
 * `?scene=<id>` jumps straight to one scene. */
import { morph, prefersCalm } from "../assets/morph.js";
export { prepareBuild, runBuild, decode } from "../assets/morph.js";

export const calm = prefersCalm();
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const EASE = "cubic-bezier(.2,.8,.2,1)";

/* 1rem = 10 design px on a 1280 × 650 stage, scaled to the frame. */
export function fit(w = 1280, h = 650) {
  const set = () => (document.documentElement.style.fontSize = `${Math.min(innerWidth / w, innerHeight / h) * 10}px`);
  set();
  addEventListener("resize", set);
}

/* An ordinary step: named parts (the window, its chrome, the app bar) hold still or glide to their new size,
 * everything else cross-fades. */
async function calmSwap(update, persist, onTransition) {
  if (!document.startViewTransition || calm) return void (await update());
  const style = document.createElement("style");
  style.textContent = `
::view-transition-group(*){animation-duration:460ms;animation-timing-function:${EASE}}
::view-transition-old(*),::view-transition-new(*){inline-size:auto;block-size:auto}
::view-transition-image-pair(*){overflow:clip}
::view-transition-old(root){animation:kit-out 180ms ease both}
::view-transition-new(root){animation:kit-in 340ms 60ms ${EASE} both}
@keyframes kit-out{to{opacity:0}}
@keyframes kit-in{from{opacity:0}}`;
  const named = [];
  const tag = () => persist.forEach((sel, i) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.style.setProperty("view-transition-name", `kit-${i}`);
    named.push(el);
  });
  const untag = () => { for (const el of named.splice(0)) el.style.removeProperty("view-transition-name"); };
  tag();
  document.head.append(style);
  const vt = document.startViewTransition(async () => { untag(); await update(); tag(); });
  onTransition(vt);
  vt.ready.catch(() => {});
  try { await vt.finished; } catch {} finally { untag(); style.remove(); onTransition(null); }
}

/* Blocks of a freshly arrived scene rise into place, one after another. */
export function settle(els, { y = 1.2, stagger = 45, delay = 140 } = {}) {
  if (calm) return;
  [...els].forEach((el, i) => el.animate(
    [{ opacity: 0, transform: `translateY(${y}rem)` }, { opacity: 1, transform: "none" }],
    { duration: 520, delay: delay + i * stagger, easing: EASE, fill: "backwards" },
  ));
}

export function countFrom(el, a, b, ms, suffix = "") {
  const node = el.firstChild;
  if (!node) return;
  const dec = String(b).includes(".") ? 1 : 0;
  if (calm) { node.nodeValue = `${b.toFixed(dec)}${suffix}`; return; }
  const t0 = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3);
    node.nodeValue = `${(a + (b - a) * e).toFixed(dec)}${suffix}`;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* The presenter's pointer: glides to an element and presses it, so a change has a visible cause. */
function makePointer(stage, ring) {
  const el = document.createElement("div");
  el.className = "pointer";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<svg viewBox="0 0 24 24"><path d="M4 2l15 10.5-6.6 1.2 3.9 7.3-2.8 1.5-3.9-7.4L4.8 20z" fill="#fff" stroke="#0f1f22" stroke-width="1.2" stroke-linejoin="round"/></svg><i></i>`;
  const css = document.createElement("style");
  css.textContent = `
.pointer{position:absolute;left:0;top:0;width:2.4rem;height:2.4rem;z-index:20;pointer-events:none;opacity:0}
.pointer svg{width:100%;height:100%;display:block;filter:drop-shadow(0 .2rem .3rem rgb(0 0 0/.35))}
.pointer i{position:absolute;left:-1.4rem;top:-1.4rem;width:2.8rem;height:2.8rem;border-radius:50%;border:2px solid ${ring};opacity:0}`;
  document.head.append(css);
  stage.append(el);
  let pos = { x: 1180, y: 640 };
  const px = (p) => `translate(${p.x / 10}rem, ${p.y / 10}rem)`;
  const rel = (t) => {
    const s = stage.getBoundingClientRect(), r = t.getBoundingClientRect(), k = s.width / 1280;
    return { x: (r.left + r.width * .55 - s.left) / k, y: (r.top + r.height * .6 - s.top) / k };
  };
  return {
    async click(target) {
      const t = typeof target === "string" ? stage.querySelector(target) : target;
      if (!t || calm) return;
      const to = rel(t);
      el.style.opacity = "1";
      await el.animate([{ transform: px(pos) }, { transform: px(to) }], { duration: 700, easing: "cubic-bezier(.65,0,.25,1)", fill: "forwards" }).finished.catch(() => {});
      pos = to;
      el.style.transform = px(to);
      el.querySelector("i").animate([{ opacity: 1, transform: "scale(.4)" }, { opacity: 0, transform: "scale(1.5)" }], { duration: 450, easing: "ease-out" });
      t.animate([{ transform: "scale(1)" }, { transform: "scale(.97)" }, { transform: "scale(1)" }], { duration: 240 });
      await wait(300);
    },
    hide() {
      if (el.style.opacity !== "1") return;
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "forwards" }).finished.then(() => {
        el.style.opacity = "0";
        el.getAnimations().forEach((a) => a.cancel());
      }).catch(() => {});
    },
  };
}

export async function type(el, text, alive, cps = 46) {
  if (calm) { el.textContent = text; return; }
  const caret = document.createElement("span");
  caret.className = "caret";
  const typed = document.createTextNode("");
  el.textContent = "";
  el.append(typed, caret);
  for (let i = 1; i <= text.length; i++) {
    if (!alive()) break;
    typed.nodeValue = text.slice(0, i);
    await wait(1000 / cps + (text[i - 1] === " " ? 20 : 0));
  }
  caret.remove();
}

/**
 * scenes:  [{ id, device: "desktop" | "phone", render(), via?, settle?, hold? }]
 * beats:   { [id]: async (alive, kit) => {} }  runs after the scene lands
 * prepare: (scene) => build | null             called inside the update, e.g. to hold a page back for a build
 */
export function createDemo({ name, stage, screen, scenes, recipe, persist = [".win"], beats = {}, prepare, ring = "#0d7a84" }) {
  const pointer = makePointer(stage, ring);
  let at = -1, token = 0, running = null, build = null;
  const onTransition = (t) => (running = t);
  const post = (msg) => parent !== window && parent.postMessage({ ...msg, demo: name }, "*");
  const kit = {
    pointer,
    get build() { return build; },
    set build(b) { build = b; },
    screen,
    // A change inside a scene (the next trade, a chat edit): same calm swap, guarded against a newer scene.
    async swap(alive, render, settleSel) {
      await calmSwap(() => { if (alive()) screen.innerHTML = render(); }, persist, onTransition);
      if (alive() && settleSel) settle(screen.querySelectorAll(settleSel));
    },
  };

  async function show(id) {
    const i = scenes.findIndex((s) => s.id === id);
    if (i < 0) return;
    const my = ++token;
    const alive = () => my === token;
    running?.skipTransition?.();
    const prev = scenes[at], next = scenes[i];
    // Walking forward one step, the pointer shows what caused the change.
    if (prev && next.via && at === i - 1) {
      await pointer.click(next.via);
      if (!alive()) return;
    }
    pointer.hide();
    build?.finish();
    build = null;
    at = i;
    const update = () => {
      screen.innerHTML = next.render();
      build = prepare?.(next, !prev) ?? null;
    };
    const device = prev && prev.device !== next.device;
    if (!prev) update();
    else if (device) await morph({ parts: recipe, update, decode: "h1", timing: { tempo: 1.25 }, onTransition });
    else {
      await calmSwap(update, persist, onTransition);
      if (alive() && next.settle) settle(screen.querySelectorAll(next.settle));
    }
    if (!alive()) return;
    post({ type: "landed", id });
    await beats[id]?.(alive, kit);
  }

  let ready = false;
  addEventListener("message", (e) => {
    if (e.source !== parent) return;
    if (e.data?.type === "show") show(e.data.id);
    // The page may load after the frame has already announced itself.
    else if (e.data?.type === "ping" && ready) post({ type: "demo-ready" });
  });

  const start = async () => {
    await document.fonts.ready;
    const q = new URLSearchParams(location.search), only = q.get("scene");
    // ?scene=<id>&still renders the finished scene with no build and no beats (used for preview images).
    if (only && q.has("still")) return void (screen.innerHTML = scenes.find((s) => s.id === only)?.render() ?? "");
    if (only) return show(only);
    if (parent !== window) { ready = true; return post({ type: "demo-ready" }); }
    // Standalone: play the scenes in order, on a loop.
    for (let n = 0; ; n = (n + 1) % scenes.length) {
      const my = token + 1;
      await show(scenes[n].id);
      await wait(scenes[n].hold ?? 2600);
      if (token !== my) return;
    }
  };
  start();
  return { show, scenes: scenes.map((s) => s.id) };
}
