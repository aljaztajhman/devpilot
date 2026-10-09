# Contour D CEO gate — 2026-10-09 anti-drift fix

## Gate
- Locked: `www-contour-desktop-locked.png` (+ Jan `contour-gate/jan-compare-630394740.png`)
- Candidate desktop: `contour-d-desktop-1280.png`
- Candidate mobile: `contour-d-mobile-390.png`
- Side-by-side: `contour-d-desktop-vs-www.png`

## Fixes in this pass
1. Nav chrome → www Contour: Work¹³ / About / Contact + LJU/ALT mid (removed orange Start a project)
2. Hero HUD → absolute TL/TR/BL/BC/BR packing (mix-blend difference)
3. Claim → two-line “Software / that ships.” overlapping filled Contour D (cream↔black)
4. Contour SVG sized via www ContourField mark box (`--mark: min(78svh,46vw)`, ox=`93vw-size`)
5. Mobile ≤640 mark-first framing kept

## Residual (SVG vs canvas ContourField — not redesign)
- Counter hole shape differs slightly (SVG teardrop cut vs canvas rings)
- Wordmark is boxed D + “Devpilot” (variant D) vs Contour wordmark SVG

# Contour D round 2 — mechanical copy of www Contour (2026-10-09, after Designer FAIL on 02ddfb0/4ead422)

## What changed
- Hand-made `assets/contour-d.svg` and `assets/contour-hero-poster.jpg` deleted. The D hero and nav are now generated
  from the www Contour build (`www-devpilot-si-v2` `unknown-wip@a05df40`, the build served on :3100) by
  `scripts/sync-contour-www.py`: www's compiled nav + hero markup (between `<!-- www:* -->` markers in `variants/d.html`),
  www's compiled CSS filtered to the nav/hero rules (`assets/contour/www-hero.css`), the same poster WebP/JPG set,
  the same Geist Latin subsets, and `field.ts` transpiled unchanged (`assets/contour/field.js`: `mark()` with the `cut`
  step, desktop layout, `MOB {s:0.62,sh:0.42,x:0.90,y:0.32}`, `fieldAllowed`). `assets/contour/contour.js` is the
  plain-JS port of the ContourField boot and Nav behaviour.
- Hero copy = www `content.json` `copy.v2.hero` + `ui.json` (short sub, no product names, no countries).
- Variants A/B/C untouched.

## Gate (round2/, same capture as the Designer's cap.py: DPR 1, networkidle, fonts.ready, 2.5 s settle; www :3100 vs D :3200)
| viewport | mark bbox www | mark bbox D | counter centre www / D | claim | diff vs live www | diff vs locked PNG |
|---|---|---|---|---|---|---|
| 1280×800 | 599,56 624×624 | 599,56 624×624 (Δ 0.00 %) | 911,368.5 / 911,368.5 | 2 lines @ 185.6 px (both) | 0.41 % | 3.45 % |
| 1440×900 | 674,63 702×702 | 674,63 702×702 (Δ 0.00 %) | 1024.5,414.5 / same | 2 lines @ 208.8 px (both) | 0.02 % | n/a |
| 390×844 | 110,166 275×275 | 110,166 275×275 (Δ 0.00 %) | 247.5,304 / same | 3 lines @ 83.85 px (both) | 0.01 % | 3.58 % |

Nav/HUD checklist (DOM boxes identical www vs D at all three viewports): wordmark SVG, LJU clock + ALT 000 mid readout,
Work¹³ / About / Contact (burger ≤640), no extra CTA; TL eyebrow with notch, TR coords + LJU clock (clock hidden on
mobile, as www), BL index, BC scroll cue with vertical rule, BR (GG) Contour with the 38 px scan reticle on mobile,
sub paragraph at the same box. Console clean on both sides. No stretched media (poster `object-fit: cover`, same
`object-position`). Residual diff = clock digits, scroll-rule animation phase, and www-live's GSAP-composited
title edges (the locked PNG was shot in `rm` mode without GSAP and has D's crisp edges).

Evidence: `round2/sbs-{1280,1440,390}.png`, `round2/overlay50-{1280,1440,390}.png` (copies of /workspace/contour-gate/round2/).
