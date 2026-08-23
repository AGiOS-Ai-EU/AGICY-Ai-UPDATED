"""Fix invalid UTF-8 in mobile mockup SVGs; render PNG via resvg-js for GitHub README."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs" / "assets"

SVGS = [
    "updated-launch-123.svg",
    "updated-mobile-search.svg",
    "updated-mobile-voice.svg",
    "updated-mobile-contested.svg",
]

# Broken UTF-8 often leaves lone CP1252 bytes where punctuation was intended.
_PUNCT_FIX = {
    "\x94": "-",
    "\x97": "-",
    "\x9d": "&#183;",
    "\xb7": "&#183;",
    "\u2014": "-",
    "\u2013": "-",
    "\ufffd": "&#183;",
}


def sanitize_svg_file(path: Path) -> None:
    import re

    raw = path.read_bytes()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")
    for old, new in _PUNCT_FIX.items():
        text = text.replace(old, new)
    # XML 1.0 forbids most control characters
    text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F]", "", text)
    text = text.replace(" mock &#183; mock-alt", " mock &#8596; mock-alt")
    path.write_text(text, encoding="utf-8", newline="\n")


def render_resvg(svg: Path, png: Path, width: int = 780) -> None:
    cmd = (
        f'npx --yes @resvg/resvg-js-cli "{svg}" "{png}" --fit-width {width}'
    )
    subprocess.run(cmd, check=True, cwd=str(ROOT), shell=True)


def main() -> None:
    for name in SVGS:
        svg = ASSETS / name
        if not svg.is_file():
            print(f"Missing {svg}", file=sys.stderr)
            sys.exit(1)
        sanitize_svg_file(svg)
        png = ASSETS / name.replace(".svg", ".png")
        render_resvg(svg, png, width=1600 if name == "updated-launch-123.svg" else 780)
        kb = png.stat().st_size // 1024
        from PIL import Image

        w, h = Image.open(png).size
        print(f"Wrote {png.name} {w}x{h} ({kb} KB)")

    print("PNG companions ready for GitHub README img tags.")


if __name__ == "__main__":
    main()
