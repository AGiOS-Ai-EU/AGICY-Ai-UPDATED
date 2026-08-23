"""Render README SVG mockups to optional PNG fallbacks (GitHub Social preview)."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs" / "assets"

SVGS = [
    "updated-mobile-search.svg",
    "updated-mobile-voice.svg",
    "updated-mobile-contested.svg",
]


def render_png(svg_path: Path, png_path: Path, width: int, height: int) -> bool:
    try:
        import cairosvg

        cairosvg.svg2png(
            url=str(svg_path),
            write_to=str(png_path),
            output_width=width,
            output_height=height,
        )
        return True
    except Exception as exc:
        print(f"Skip PNG {png_path.name}: {exc}", file=sys.stderr)
        return False


def main() -> None:
    for name in SVGS:
        svg = ASSETS / name
        if not svg.is_file():
            print(f"Missing {svg}", file=sys.stderr)
            sys.exit(1)
        png = ASSETS / name.replace(".svg", ".png")
        if render_png(svg, png, 390 * 2, 844 * 2):
            kb = png.stat().st_size // 1024
            print(f"Wrote {png.name} ({png.stat().st_size // (390*844)}x scale) {kb}KB")
    print("GitHub renders SVG in README via <img src=\"*.svg\"> — PNG optional.")


if __name__ == "__main__":
    main()
