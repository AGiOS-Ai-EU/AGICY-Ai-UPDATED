"""Hybrid mobile compositor — glass rail + certificate content clipped to phone screen."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs" / "assets"
MASKS = ROOT / "docs" / "assets" / "phone-masks"

PAPER = "#f7f8f6"
INK = "#16211f"
GRAPHITE = "#5c6663"
RULE = "#d6dbd7"
FIELD = "#ffffff"
CONTESTED = "#5e4e78"
FRESH = "#2a6b4f"
GLASS = "#f7f8f680"


def load_font(path: str, size: int):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


MONO = load_font("C:/Windows/Fonts/consola.ttf", 9)
MONO_B = load_font("C:/Windows/Fonts/consolab.ttf", 10)
SERIF = load_font("C:/Windows/Fonts/georgia.ttf", 11)
UI = load_font("C:/Windows/Fonts/segoeui.ttf", 10)


def default_mask() -> dict:
    """Screen quad as fractions — tune per base photo in phone-masks/*.json"""
    return {
        "x0": 0.38,
        "y0": 0.12,
        "x1": 0.62,
        "y1": 0.88,
        "radius_frac": 0.04,
    }


def screen_rect(img: Image.Image, mask: dict) -> tuple[int, int, int, int]:
    w, h = img.size
    return (
        int(w * mask["x0"]),
        int(h * mask["y0"]),
        int(w * mask["x1"]),
        int(h * mask["y1"]),
    )


def clip_rounded(draw_layer: Image.Image, rect: tuple[int, int, int, int], r: int) -> Image.Image:
    x0, y0, x1, y1 = rect
    mask = Image.new("L", draw_layer.size, 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle(rect, radius=r, fill=255)
    out = Image.new("RGBA", draw_layer.size, (0, 0, 0, 0))
    out.paste(draw_layer, (0, 0), mask)
    return out


def draw_hybrid_ui(size: tuple[int, int]) -> Image.Image:
    w, h = size
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    rail_w = int(w * 0.14)
    d.rounded_rectangle((0, 8, rail_w, h - 8), radius=14, fill=(247, 248, 246, 140), outline=RULE)
    for i, y in enumerate([24, 56, 88, 120, h - 40]):
        d.rounded_rectangle((8, y, rail_w - 8, y + 24), radius=8, fill=(255, 255, 255, 100) if i == 1 else (0, 0, 0, 0))

    cx = rail_w + 6
    d.rectangle((cx, 0, w, 28), fill=(247, 248, 246, 200))
    d.text((cx + 6, 8), "UPDATED", fill=INK, font=MONO_B)

    body_y = 32
    d.rectangle((cx, body_y, w, h), fill=PAPER)

    d.text((cx + 8, body_y + 8), "CONTESTED", fill=CONTESTED, font=MONO_B)
    d.text((cx + 8, body_y + 24), "Primary rate: 1 / 5", fill=INK, font=UI)

    card_y = body_y + 44
    d.rounded_rectangle((cx + 6, card_y, w - 6, card_y + 56), 2, fill=FIELD, outline=RULE)
    d.text((cx + 12, card_y + 6), "PRIMARY", fill=FRESH, font=MONO_B)
    d.text((cx + 12, card_y + 22), "Filing deadline: 28 days", fill=INK, font=SERIF)
    d.text((cx + 12, card_y + 40), "gov.cy · 1 source", fill=GRAPHITE, font=MONO)

    return layer


def compose(base_path: Path, mask: dict, out_path: Path) -> None:
    base = Image.open(base_path).convert("RGBA")
    rect = screen_rect(base, mask)
    sw, sh = rect[2] - rect[0], rect[3] - rect[1]
    r = int(min(sw, sh) * mask.get("radius_frac", 0.04))

    ui = draw_hybrid_ui((sw, sh))
    ui_clipped = clip_rounded(ui, (0, 0, sw, sh), r)

    result = base.copy()
    result.paste(ui_clipped, (rect[0], rect[1]), ui_clipped)
    result.convert("RGB").save(out_path, "PNG", optimize=True)
    print(f"Wrote {out_path} ({result.size[0]}x{result.size[1]})")


def main() -> None:
    MASKS.mkdir(parents=True, exist_ok=True)
    base_name = "updated-mobile-editorial-base-3.png"
    base = Path.home() / ".cursor/projects/c-Users-User-Desktop-AGICY-AI-agicy-platform/assets" / base_name
    if not base.exists():
        base = ASSETS / "updated-mobile-editorial-3.png"
    mask_path = MASKS / "editorial-3.json"
    if not mask_path.exists():
        mask_path.write_text(json.dumps(default_mask(), indent=2), encoding="utf-8")
    mask = json.loads(mask_path.read_text(encoding="utf-8"))
    out = ASSETS / "updated-mobile-hybrid-proof.png"
    compose(base, mask, out)


if __name__ == "__main__":
    main()
