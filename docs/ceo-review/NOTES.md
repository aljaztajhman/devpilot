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
