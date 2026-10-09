#!/usr/bin/env python3
"""Sync variant D's Contour hero from the www Contour build (anti-drift: mechanical copy, never re-derived).

Source of truth: the static `out/` build of www-devpilot-si-v2 (the build served at http://127.0.0.1:3100/).
Everything the D hero renders comes from that build, unchanged except for path and anchor rewrites:

  out/index.html                       -> nav (<header class="nav">), mobile menu (.mnav), hero (<section class="hero">)
                                          written into variants/d.html between <!-- www:nav -->, <!-- www:hero --> markers
  out/_next/static/css/*.css           -> assets/contour/www-hero.css  (rules whose selectors belong to the nav/hero;
                                          shared utilities (.mono, .roll, a, button, ...) are scoped to :where(.nav,.mnav,.hero) (zero specificity, so www's own cascade order is kept)
                                          so they cannot restyle the rest of variant D)
  out/_next/static/media/*.woff2       -> assets/contour/fonts/  (Geist Sans / Geist Mono Latin subsets, as @font-face in www)
  out/img/hero-fallback*.webp          -> assets/contour/img/     (the poster, every srcset width www serves)
  public/assets/v2/hero-fallback*.jpg  -> assets/contour/img/     (poster originals)
  src/motion/field.ts                  -> assets/contour/field.js (transpiled with www's own `typescript`, no edits:
                                          the mark() SDF including the `cut` step, the MOB framing constants, fieldAllowed)

Rewrites applied (and nothing else):
  * route links /, /work, /about, /contact -> in-page anchors (D is one page)
  * /img/... -> ../assets/contour/img/...; font urls -> fonts/...
  * <span data-clock="true"> gets data-clock-full so the shared site.js clock prints HH:MM:SS like www's <Clock/>
  * React's <!-- --> text-join comments are dropped
  * the www mailbox in the mobile menu -> D's placeholder address (D's contact section is still a placeholder)

Usage: python3 scripts/sync-contour-www.py [path-to-www-worktree]
"""
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
WWW = Path(sys.argv[1] if len(sys.argv) > 1 else "/home/box/devpilot/engineer/www-devpilot-si-v2")
OUT = WWW / "out"
DEST = REPO / "assets" / "contour"
D_HTML = REPO / "variants" / "d.html"

LINKS = {"/": "#top", "/work": "#work", "/about": "#studio", "/contact": "#contact"}
WWW_EMAIL, D_EMAIL = "info@devpilot.si", "hello@example.com"
IMG_PREFIX = "../assets/contour/img/"

# ---------------------------------------------------------------- css
def parse_blocks(css: str):
    """Yield (prelude, body, nested) for every top-level block; nested blocks (@media) recurse."""
    out, i, n = [], 0, len(css)
    while i < n:
        j = css.find("{", i)
        if j < 0:
            break
        prelude = css[i:j].strip()
        depth, k = 1, j + 1
        while k < n and depth:
            c = css[k]
            depth += 1 if c == "{" else -1 if c == "}" else 0
            k += 1
        body = css[j + 1 : k - 1]
        if prelude.startswith("@media") or prelude.startswith("@supports"):
            out.append((prelude, None, parse_blocks(body)))
        else:
            out.append((prelude, body, None))
        i = k
    return out


def norm(sel: str) -> str:
    return re.sub(r"\s*([>,+~])\s*", r"\1", sel.strip())


SCOPE = ":where(.nav,.mnav,.hero)"
VERBATIM = re.compile(r"\.(hero|nav|mnav|notch)(\b|__)")
EXCLUDE = re.compile(r"\.(aband|stagewrap|wbar|chero|pre|cur|grain|skip|vt-)")
# shared utilities / element resets the hero depends on; scoped so variant D's own .mono etc. are untouched
SCOPED = {
    ".mono", ".steel", ".sr", "sub", "sup", "a", "button", ":focus-visible", "::selection",
    "canvas", "img", "svg", "video", "h1", "h2", "h3", "h4", "h5", "h6",
    ".roll", ".roll__a", ".roll__b", ".roll i", ".roll__b i", "a:hover .roll__a i", "a:hover .roll__b i",
    "button:hover .roll__a i", "button:hover .roll__b i", ".roll-host:hover .roll__a i", ".roll-host:hover .roll__b i",
    "[data-lines] .ln>span", "[data-lines].is-in .ln>span", ".ln>span",
}


def keep_selector(sel: str):
    s = norm(sel)
    if EXCLUDE.search(s):
        return None
    if VERBATIM.search(s):
        return s
    head, _, rest = s.partition(" ")
    if head.startswith("html") and rest in SCOPED:
        return f"{head} {SCOPE} {rest}"
    if s in SCOPED:
        return f"{SCOPE} {s}"
    return None


def filter_rules(blocks, font_map):
    out = []
    for prelude, body, nested in blocks:
        if nested is not None:
            inner = filter_rules(nested, font_map)
            if inner:
                out.append(f"{prelude}{{{''.join(inner)}}}")
            continue
        if prelude.startswith("@font-face"):
            fam = re.search(r"font-family:([^;]+)", body).group(1).strip().strip('"')
            m = re.search(r"url\(([^)]+)\)", body)
            if m:
                src = m.group(1).strip('"\'')
                name = fam.replace(" ", "") + ".woff2"
                font_map[src] = name
                body = body.replace(m.group(1), f"fonts/{name}")
            out.append(f"@font-face{{{body}}}")
            continue
        if prelude.startswith("@keyframes"):
            if prelude == "@keyframes sc":
                out.append(f"{prelude}{{{body}}}")
            continue
        if prelude == ":root":
            if "--void:" in body or "--m:20px" in body:
                out.append(f":root{{{body}}}")
            continue
        if prelude.startswith(".__variable_"):  # next/font: the CSS variables www's --sans/--mono resolve through
            out.append(f":root{{{body}}}")
            continue
        kept = [k for k in (keep_selector(s) for s in prelude.split(",")) if k]
        if kept:
            out.append(f"{','.join(kept)}{{{body}}}")
    return out


# ---------------------------------------------------------------- html
def balanced(html: str, start: int, tag: str) -> int:
    """Index just past the closing tag of the element opening at `start`."""
    i, depth = start, 0
    pat = re.compile(rf"<(/?){tag}\b[^>]*>")
    while True:
        m = pat.search(html, i)
        depth += -1 if m.group(1) else 1
        i = m.end()
        if depth == 0:
            return i


def rewrite(frag: str) -> str:
    frag = frag.replace("<!-- -->", "")
    frag = re.sub(r'href="(/[a-z]*)"', lambda m: f'href="{LINKS[m.group(1)]}"', frag)
    frag = frag.replace('data-clock="true"', 'data-clock="true" data-clock-full=""')
    frag = frag.replace("/img/", IMG_PREFIX)
    frag = frag.replace(WWW_EMAIL, D_EMAIL)
    return frag


def extract(html: str, font_map):
    a = html.index('<header class="nav">')
    nav = html[a : balanced(html, a, "header")]
    b = html.index('<div class="mnav"')
    mnav = html[b : balanced(html, b, "div")]
    c = html.index('<section class="hero"')
    d = html.index('<div class="stagewrap', c)
    hero = html[c:d] + "</section>"
    head = "".join(re.findall(r'<link rel="preload"[^>]*(?:woff2|hero-fallback)[^>]*/?>', html))
    for src, name in font_map.items():
        head = head.replace(src, f"../assets/contour/fonts/{name}")
    return rewrite(nav + mnav), rewrite(hero), rewrite(head)


def splice(doc: str, name: str, body: str) -> str:
    a, b = f"<!-- www:{name} -->", f"<!-- /www:{name} -->"
    i, j = doc.index(a) + len(a), doc.index(b)
    return doc[:i] + "\n" + body + "\n" + doc[j:]


# ---------------------------------------------------------------- main
def main():
    css_files = sorted((OUT / "_next/static/css").glob("*.css"))
    assert len(css_files) == 1, css_files
    css_src = css_files[0].read_text()
    html_src = (OUT / "index.html").read_text()
    commit = subprocess.run(["git", "-C", str(WWW), "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
    branch = subprocess.run(["git", "-C", str(WWW), "branch", "--show-current"], capture_output=True, text=True).stdout.strip()
    stamp = f"www-devpilot-si-v2 {branch}@{commit} · css {hashlib.md5(css_src.encode()).hexdigest()[:12]} · html {hashlib.md5(html_src.encode()).hexdigest()[:12]}"

    DEST.mkdir(parents=True, exist_ok=True)
    (DEST / "fonts").mkdir(exist_ok=True)
    (DEST / "img").mkdir(exist_ok=True)

    font_map = {}
    rules = filter_rules(parse_blocks(css_src), font_map)
    header = f"/* GENERATED by scripts/sync-contour-www.py — do not edit. Source: {stamp} ({css_files[0].name}) */\n"
    (DEST / "www-hero.css").write_text(header + "\n".join(rules) + "\n")
    for src, name in font_map.items():
        shutil.copy2(OUT / src.lstrip("/"), DEST / "fonts" / name)

    for p in sorted((OUT / "img").glob("hero-fallback*.webp")):
        shutil.copy2(p, DEST / "img" / p.name)
    for p in sorted((WWW / "public/assets/v2").glob("hero-fallback*.jpg")):
        shutil.copy2(p, DEST / "img" / p.name)

    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            ["node", str(WWW / "node_modules/typescript/bin/tsc"), str(WWW / "src/motion/field.ts"), "--target", "es2020",
             "--module", "es2020", "--lib", "dom,es2020", "--skipLibCheck", "--outDir", tmp],
            check=True)
        js = Path(tmp, "field.js").read_text()
    (DEST / "field.js").write_text(f"// GENERATED by scripts/sync-contour-www.py from src/motion/field.ts — do not edit. Source: {stamp}\n" + js)

    nav, hero, head = extract(html_src, font_map)
    doc = D_HTML.read_text()
    doc = splice(doc, "head", head)
    doc = splice(doc, "nav", nav)
    doc = splice(doc, "hero", hero)
    D_HTML.write_text(doc)

    (DEST / "SOURCE.json").write_text(json.dumps({
        "source": stamp, "www": str(WWW), "fonts": font_map,
        "files": sorted(str(p.relative_to(REPO)) for p in DEST.rglob("*") if p.is_file()),
    }, indent=1) + "\n")
    print(stamp)
    print(f"css rules kept: {len(rules)}; fonts: {font_map}")


if __name__ == "__main__":
    main()
