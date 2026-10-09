# Devpilot studio site

Four homepage directions for Devpilot, a two-founder software studio in Ljubljana, behind one variant picker.

- `index.html`: the picker. A strip at the top switches the full page beneath it (keys 1, 2, 3, 4 work too).
- `variants/a.html` · Paper: warm paper, Geist, products demoed in place.
- `variants/b.html` · Blueprint: navy ink on a drafting grid, IBM Plex, title blocks, a schedule of services, a programme chart to scale.
- `variants/c.html` · Stage: dark showroom, Archivo set wide, products on a tilted stage, one amber accent.
- `variants/d.html` · Contour: ink and bone, Geist oversized, instrument readouts in Geist Mono, the mark drawn as contour lines, products on graphite plates, one ignition-orange accent. Same sections and copy as A.
- `assets/site.css`, `b.css`, `c.css`, `d.css`: one stylesheet per variant (A uses `site.css`). `site.js` is shared: clock, nav, reveals, the scroll-driven product demos, the device switch, the copy button.
- `demos/`: the Stranko, Belin and sample-website demos, embedded as iframes and driven by `postMessage`. `kit.js` is the shared controller, `assets/morph.js` the morph engine.

Serve over HTTP (ES modules): `python3 -m http.server` here, then open `/`.

Placeholders to replace before publishing: partner name, `hello@example.com`, the booking, social, imprint and privacy links.
