# Devpilot Contour review site

Four homepage directions for **Devpilot**, a software and web development company in Ljubljana, behind one variant picker.

Live review: <https://devpilotbot.github.io/devpilot/> (defaults to Contour **D**).

## Variants

- `index.html` — picker strip; keys `1`–`4` switch the page beneath.
- `variants/a.html` · Paper — warm paper, Geist, products demoed in place.
- `variants/b.html` · Blueprint — navy ink on a drafting grid.
- `variants/c.html` · Stage — dark showroom, one amber accent.
- `variants/d.html` · Contour — ink and bone, board-locked first fold + scroll-zoom handoff into `#main`. **Current review tip.**

## Layout

- `assets/d.css` (+ `site.css` / `b.css` / `c.css` for A–C): one stylesheet per variant. `assets/site.js` is shared (clock, nav, reveals, scroll-driven demos, device switch, copy button). Scroll geometry is cached (see jank notes under `docs/ceo-review/`).
- `assets/contour/board/` — Contour D first fold: mechanical port of Jan’s board-locked hero (`hero.css` / `hero.js`). Do not redesign; provenance in `assets/contour/SOURCE.json`.
- `assets/fonts/` — self-hosted Geist + Inter Tight (latin / latin-ext, `font-display: swap`) for Contour D.
- `demos/` — Stranko, Belin and sample-website iframes; `kit.js` + `assets/morph.js`.

Serve over HTTP (ES modules): `python3 -m http.server` here, then open `/`.

## Publishing notes

- GitHub Pages from `main` on `devpilotbot/devpilot`.
- `www.devpilot.si` DNS / custom domain is a **board** step (FreeDNS CNAME vs vault) — not flipped from this repo alone.
- Replace before public www: imprint and privacy pages (footer currently mailto stubs), any remaining placeholder social links.
