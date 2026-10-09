# Contour board assets (Jan, 2026-10-09)

**Hero lock: Zulip 630402395** — new `devpilot-hero.html` (dual `.ink`/`.inv` type layers, composition-unit layout)
supersedes the 630400016 hero. D adds one thing on top: the zoom → `#main` handoff (see `docs/ceo-review/HANDOFF-630402395.md`).


Originally locked by Jan in #devpilot > design **630400016**. Hero HTML superseded by **630402395** (see above).

| File | Role |
|------|------|
| `d.svg` | Contour D mark path |
| `contours.svg` | Contour field SVG (reference / fallback) |
| `logo-dark.svg` / `logo-light.svg` | Wordmark SVGs |
| `devpilot-hero.html` | Full sticky Contour hero reference |
| `hero.css` / `hero.js` | Scoped mechanical port used by `variants/d.html` |

Anti-drift: board keep = locked artifact; ports are mechanical copies. See `/home/box/devpilot/company/quality-bar/ANTI-DRIFT.md`.
