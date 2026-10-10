# Overnight Contour D polish — speed / a11y (2026-10-10)

Baseline tip: `798266f` (jank fix). Local Lighthouse:
- Desktop (no throttle): Perf 100 / A11y 93 / BP 100 / SEO 100 · ~399 KiB
- Mobile (sim): Perf 94 · FCP/LCP ~2.0s · TBT ~210ms · ~328 KiB

## Shipped in this pass
1. **site.js scroll thrash** — cache dark/nav/chapter geometry; map via scrollY + `#main` handoff transform string; ResizeObserver + fonts.ready; re-entrancy guard around unpin measure.
2. **Self-hosted fonts on D** — latin + latin-ext Geist 500/600, Geist Mono 400, Inter Tight 500; preload critical; drop fonts.googleapis round-trip.
3. **Preview imgs** — `decoding=async` + `fetchpriority=low` (below Contour D first fold).
4. **SEO meta** — og:type/url/locale, twitter:card, canonical on `variants/d.html`.
5. **a11y** — inactive `.step` opacity `.28` → `.48` (contrast); footer Imprint/Privacy → mailto stubs.
6. **README / robots.txt** — no two-founder framing; crawl allow.

## Open follow-ups
- Inactive-step opacity still a design tradeoff vs WCAG on the dimmest glyphs; Designer may prefer a colour-token approach over opacity.
- `dl.svc` fails definition-list rule (div > span/a children) — structural, leave for Designer.
- Demo iframes still pull `morph.js` (~30KB) when near viewport — expected.
- `assets/contour/img` hero-fallbacks unused by board D (~520KB in repo, not on D network path).
- www DNS / publish still board.

## Later same night
- Tip2+: FAQ polish, svc a11y, OG, default D, imprint/privacy stubs, 404, apple-touch, parallax write-on-change, idle prefetch Stranko demo.

## Tip d7f4e85 metrics (local mobile LH)
- A11y **100** (step contrast via color; svc list semantics)
- FCP ~2.1s · LCP ~2.4s · SI ~2.1s · TBT variable (0–350 headless WebGL)
- Fonts: latin-only self-host ~63KB dir (was ~126KB with latin-ext)
- TBT win vs baseline 210ms attributed to site.js geometry cache

## Final overnight pass 03:05–03:40 CEST (tip 70ff24c)
- `945e692` demos self-host fonts (no third-party requests from Work iframes)
- `55df185` hero composition computed before first paint (inline `__dpHeroLayout`, single source with hero.js) — fixes flaky mobile CLS 0.473 (h1 painted at desktop defaults since 7534ba1 made FCP faster) → 0
- `e743fdc` 480w / 150w preview variants (below fold)
- `64112d0` picker/imprint/privacy/404 icon + meta (best-practices 96→100)
- `2ab65db` variants A/B/C self-host fonts — whole preview makes zero third-party requests
- `1393fbf` facts strip role=group; drop ignored aria-label on Company `<dl>`s
- `70ff24c` demos inline icon

### Gate (live Pages vs board SoT 630402395 devpilot-hero.html, sha256 35a3be1b…)
- 1280 / 1440: 0 px diff, all 10 hero element boxes identical
- 390: element boxes identical; 27 anti-aliased px (max Δ42/255) on the brand-mark bowl edge — pre-existing, same on approved 798266f
- Console clean (headless GL "GPU stall due to ReadPixels" screenshot warnings only)

### Lighthouse (local, same machine) 798266f → 70ff24c
- Mobile: Perf 87→98 · FCP 2.8→1.2s · LCP 3.4→1.9s · CLS .002→0 · A11y 93→100 · 398→185 KiB
- Desktop: Perf 99→100 · LCP 0.7→0.4s · A11y 93→100 · 399→219 KiB
- Live Pages (gzip): mobile 98 (LCP 1.7s, CLS 0, 123 KiB) · desktop 100 (LCP 0.4s, 158 KiB). SEO <100 = intentional noindex on preview.

### Flags for board (not changed)
- variants A/B/C (still reachable from picker) carry the old banned copy: two founders, fixed price, five weeks, one working day, hello@example.com. Board-reviewed artifacts → left as-is; rec: hide A/B/C from picker or retire.
