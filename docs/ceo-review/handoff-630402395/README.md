# CEO gate evidence — Contour D hero + seamless handoff (Zulip 630402395)

**Tip at capture:** `038bb2e` (hero/handoff landed in `0a0fdf6`; fold copy restore `038bb2e`)  
**Live:** https://devpilotbot.github.io/devpilot/#d → `variants/d.html`  
**Handoff note:** `../HANDOFF-630402395.md`

## Live desktop 1280×800 (use these)
| File | Progress |
|------|----------|
| `live-desktop-1280-start.png` | p≈0 — board hero, ink/inv claim on D |
| `live-desktop-1280-mid-zoom.png` | p≈0.40 — zoom into hole; `#main` already visible through hole |
| `live-desktop-1280-handoff.png` | p≈0.70 — build stage emerging, stage dissolving |
| `live-desktop-1280-end-handoff.png` | p≈1.0 — `#main` full frame, seamless |
| `live-desktop-1280-main-visible.png` | past release — normal scroll |
| `sbs-board-vs-live-desktop-1280-start.png` | board HTML (L) vs live D (R) at start |
| `board-hero-ref-desktop-1280-*.png` | board HTML reference frames |

## Local sweep (Claude Code verify)
`desk-sheet.png`, `mob-sheet.png`, `desktop-1280-*.png` — same handoff locally before push.

## Handoff technique (summary)
Overlap (`margin-bottom:-100svh`) + pin `#main` to viewport + `clip-path:circle` = D hole + scale 0.42→1 from hole centre from fly-in p=0.30; stage opacity dissolves onto shared `#0D0D0D`. See `HANDOFF-630402395.md`.
