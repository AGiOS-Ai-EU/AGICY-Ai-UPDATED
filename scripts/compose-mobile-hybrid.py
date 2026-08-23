"""Hybrid mobile compositor — glass rail + certificate content clipped to phone screen."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs" / "assets"
MASKS = ASSETS / "phone-masks"
BASES = Path.home() / ".cursor/projects/c-Users-User-Desktop-AGICY-AI-agicy-platform/assets"

PAPER = "#f7f8f6"
INK = "#16211f"
GRAPHITE = "#5c6663"
RULE = "#d6dbd7"
FIELD = "#ffffff"
CONTESTED = "#5e4e78"
FRESH = "#2a6b4f"


def load_font(path: str, size: int):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


MONO = load_font("C:/Windows/Fonts/consola.ttf", 9)
MONO_B = load_font("C:/Windows/Fonts/consolab.ttf", 10)
SERIF = load_font("C:/Windows/Fonts/georgia.ttf", 11)
UI = load_font("C:/Windows/Fonts/segoeui.ttf", 10)


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def screen_rect(img: Image.Image, mask: dict) -> tuple[int, int, int, int]:
    w, h = img.size
    return (
        int(w * mask["x0"]),
        int(h * mask["y0"]),
        int(w * mask["x1"]),
        int(h * mask["y1"]),
    )


def clip_rounded(layer: Image.Image, size: tuple[int, int], r: int) -> Image.Image:
    w, h = size
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, w - 1, h - 1), radius=r, fill=255)
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.paste(layer, (0, 0), mask)
    return out


def draw_rail(d: ImageDraw.ImageDraw, rail_w: int, h: int, active: int = 1) -> None:
    d.rounded_rectangle(
        (2, 6, rail_w - 2, h - 6),
        radius=min(14, rail_w // 2),
        fill=(247, 248, 246, 150),
        outline=RULE,
    )
    icons_y = [16, 44, 72, 100]
    for i, y in enumerate(icons_y):
        fill = (255, 255, 255, 130) if i == active else (0, 0, 0, 0)
        d.rounded_rectangle((6, y, rail_w - 6, y + 20), radius=6, fill=fill, outline=RULE if i == active else None)


def draw_claim_card(
    d: ImageDraw.ImageDraw,
    x: int,
    y: int,
    w: int,
    chip: str,
    claim: str,
    strip: str,
    chip_color: str = FRESH,
) -> int:
    ch = 52
    d.rounded_rectangle((x, y, x + w, y + ch), radius=2, fill=FIELD, outline=RULE)
    d.text((x + 6, y + 4), chip, fill=chip_color, font=MONO_B)
    # wrap claim
    words = claim.split()
    line, cy = "", y + 18
    for word in words:
        test = f"{line}{word} "
        if d.textlength(test, font=SERIF) > w - 12 and line:
            d.text((x + 6, cy), line.strip(), fill=INK, font=SERIF)
            line = f"{word} "
            cy += 13
        else:
            line = test
    if line:
        d.text((x + 6, cy), line.strip(), fill=INK, font=SERIF)
    d.text((x + 6, y + ch - 12), strip, fill=GRAPHITE, font=MONO)
    return ch


def draw_hybrid_ui(size: tuple[int, int], variant: str) -> Image.Image:
    w, h = size
    layer = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    rail_w = max(28, int(w * 0.16))
    active_rail = 1 if variant != "waveform" else 1
    draw_rail(d, rail_w, h, active=active_rail)

    cx = rail_w + 4
    # Glass header strip
    d.rectangle((cx, 0, w, 24), fill=(247, 248, 246, 210))
    d.text((cx + 6, 6), "UPDATED", fill=INK, font=MONO_B)

    body_y = 26
    d.rectangle((cx, body_y, w, h), fill=PAPER)

    pad = 6
    inner_w = w - cx - pad

    if variant == "search":
        # Query field (certificate)
        d.rounded_rectangle((cx + pad, body_y + 6, w - pad, body_y + 28), 2, fill=FIELD, outline=RULE)
        d.text((cx + pad + 4, body_y + 12), "Cyprus annual return", fill=GRAPHITE, font=UI)
        d.text((cx + pad + 4, body_y + 34), "Primary rate: 2 / 5", fill=INK, font=UI)
        card_y = body_y + 50
        card_y += draw_claim_card(
            d, cx + pad, card_y, inner_w, "PRIMARY",
            "Annual return filing due within 28 days of AGM.",
            "gov.cy · 1 source · primary",
        ) + 6
        draw_claim_card(
            d, cx + pad, card_y, inner_w, "PRIMARY",
            "HE32 form required for Cyprus companies.",
            "mcit.gov.cy · 1 source · primary",
        )
    elif variant == "waveform":
        d.text((cx + pad, body_y + 8), "HOLD HOTKEY", fill=GRAPHITE, font=MONO_B)
        base_y = body_y + 28
        for i in range(0, inner_w - 8, 3):
            amp = 3 + abs((i * 5) % 9) - 4
            d.line([(cx + pad + i, base_y + 10), (cx + pad + i, base_y + 10 - amp)], fill=GRAPHITE)
        d.text((cx + pad, body_y + 46), "Primary rate: 1 / 5", fill=INK, font=UI)
        card_y = body_y + 62
        draw_claim_card(
            d, cx + pad, card_y, inner_w, "PRIMARY",
            "Annual return filing due within 28 days.",
            "gov.cy · primary source",
        )
    else:  # contested
        d.text((cx + pad, body_y + 6), "CONTESTED", fill=CONTESTED, font=MONO_B)
        d.text((cx + pad, body_y + 20), "mock ↔ mock-alt · 0.00", fill=GRAPHITE, font=MONO)
        d.line([(cx + pad, body_y + 30), (w - pad, body_y + 30)], fill=RULE)
        d.text((cx + pad, body_y + 36), "Provider A", fill=GRAPHITE, font=MONO)
        d.text((cx + pad, body_y + 48), "Provider B", fill=GRAPHITE, font=MONO)
        d.text((cx + pad, body_y + 60), "Primary rate: 0 / 4", fill=INK, font=UI)
        draw_claim_card(
            d, cx + pad, body_y + 76, inner_w, "PRIMARY",
            "Filing deadline: 28 days post-AGM.",
            "gov.cy · 2024-06-01",
        )

    return layer


def compose(base_path: Path, mask: dict, variant: str, out_path: Path) -> tuple[tuple[int, int], int]:
    base = Image.open(base_path).convert("RGBA")
    rect = screen_rect(base, mask)
    sw, sh = rect[2] - rect[0], rect[3] - rect[1]
    r = int(min(sw, sh) * mask.get("radius_frac", 0.045))

    ui = draw_hybrid_ui((sw, sh), variant)
    ui_clipped = clip_rounded(ui, (sw, sh), r)

    result = base.copy()
    result.paste(ui_clipped, (rect[0], rect[1]), ui_clipped)
    result = result.convert("RGB")
    result.save(out_path, "PNG", optimize=True, compress_level=9)

    if out_path.stat().st_size > 1024 * 1024:
        result = result.resize((1200, 675), Image.Resampling.LANCZOS)
        result.save(out_path, "PNG", optimize=True, compress_level=9)

    kb = out_path.stat().st_size // 1024
    size = Image.open(out_path).size
    print(f"Wrote {out_path.name} {size[0]}x{size[1]} {kb} KB")
    return size, kb


BATCH = [
    {
        "base": "updated-mobile-editorial-base-1.png",
        "mask": "editorial-1.json",
        "variant": "search",
        "out": "updated-mobile-hybrid-1.png",
    },
    {
        "base": "updated-mobile-editorial-base-2.png",
        "mask": "editorial-2.json",
        "variant": "waveform",
        "out": "updated-mobile-hybrid-2.png",
    },
    {
        "base": "updated-mobile-editorial-base-3.png",
        "mask": "editorial-3.json",
        "variant": "contested",
        "out": "updated-mobile-hybrid-3.png",
    },
]


def main() -> None:
    MASKS.mkdir(parents=True, exist_ok=True)
    for job in BATCH:
        base_path = BASES / job["base"]
        if not base_path.exists():
            print(f"Missing base: {base_path}", file=sys.stderr)
            sys.exit(1)
        mask_path = MASKS / job["mask"]
        mask = json.loads(mask_path.read_text(encoding="utf-8"))
        compose(base_path, mask, job["variant"], ASSETS / job["out"])


if __name__ == "__main__":
    main()
