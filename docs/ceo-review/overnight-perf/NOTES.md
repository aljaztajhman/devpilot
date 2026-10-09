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
