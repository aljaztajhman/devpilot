# Contour D first fold vs Jan board hero (630400016 / 630400357)

Local evidence, 2026-10-09. Not a READY TO TEST claim.

- `d-1280-p{0,0.5,1}.png`: `variants/d.html` at 1280×800, scroll progress p through the 260vh runway.
- `sbs-1280-p{0,0.5,1}-d-vs-board.png`: left D, right `assets/contour/board/devpilot-hero.html` (byte-identical to Jan's clean file), half scale.
- `d-390-p0.png`: mobile first fold (board ≤760px layout).

Method: `python3 -m http.server` at the repo root, headless Chromium (SwiftShader WebGL), clock frozen, both pages scrolled to
`p × (hero.offsetHeight − innerHeight)`. Pixel diff D vs board at p = 0, .15, .5, 1 at 1280×800 and 390×844:
**0 pixels differ** outside the live LJU clock readouts. Probes identical on both pages:

| p | ALT | Contour | .fade opacity |
|---|-----|---------|---------------|
| 0 | 000 | 00 (390: 02) | 1 |
| .15 | 007 | 00 | .5 |
| .5 | 060 | 06 | 0 |
| 1 | 120 | 08 | 0 |

Hero 2080px at 800px viewport (260vh), stage sticky at top 0 throughout; `prefers-reduced-motion` → hero 800px (100vh), no fly-in.
No console errors on D. Below the fold: reveals fire (`html.js`), build-stage parallax starts when the runway releases, product demos activate.
