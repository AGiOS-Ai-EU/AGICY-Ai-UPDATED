"""Composite certificate UI augmentations onto NY editorial base photos."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs" / "assets"
BASE = Path.home() / ".cursor" / "projects" / "c-Users-User-Desktop-AGICY-AI-agicy-platform" / "assets"

PAPER = "#f8f6f1"
INK = "#1a1814"
GRAPHITE = "#5c5850"
RULE = "#d6dbd7"
FIELD = "#ffffff"
CONTESTED = "#5e4e78"
FRESH = "#2a6b4f"


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def load_fonts():
    candidates = [
        ("C:/Windows/Fonts/consola.ttf", 10),
        ("C:/Windows/Fonts/consolab.ttf", 11),
        ("C:/Windows/Fonts/georgia.ttf", 13),
        ("C:/Windows/Fonts/segoeui.ttf", 11),
        ("C:/Windows/Fonts/segoeuib.ttf", 11),
    ]
    fonts = {}
    for path, size in candidates:
        key = Path(path).stem
        try:
            fonts[f"{key}_{size}"] = ImageFont.truetype(path, size)
        except OSError:
            pass
    fallback = ImageFont.load_default()
    return fonts, fallback


FONTS, FALLBACK = load_fonts()


def font(name: str, size: int):
    for k, f in FONTS.items():
        if name in k and str(size) in k:
            return f
    return FALLBACK


def round_rect(draw, xy, radius, fill=None, outline=None, width=1):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def draw_chip(draw, x, y, label, color=GRAPHITE, bg=FIELD):
    f = font("consolab", 11) or font("consola", 10)
    bbox = draw.textbbox((0, 0), label, font=f)
    tw = bbox[2] - bbox[0]
    pw, ph = tw + 16, 20
    round_rect(draw, (x, y, x + pw, y + ph), 2, fill=bg, outline=RULE, width=1)
    draw.text((x + 8, y + 3), label, fill=color, font=f)
    return pw


def wrap_text(draw, text, x, y, max_w, line_h, f):
    words = text.split()
    line = ""
    cy = y
    for word in words:
        test = f"{line}{word} "
        if draw.textlength(test, font=f) > max_w and line:
            draw.text((x, cy), line.strip(), fill=INK, font=f)
            line = f"{word} "
            cy += line_h
        else:
            line = test
    if line:
        draw.text((x, cy), line.strip(), fill=INK, font=f)
    return cy


def draw_claim_card(draw, x, y, w, chip, claim, strip, chip_color=GRAPHITE):
    h = 72
    round_rect(draw, (x, y, x + w, y + h), 2, fill=FIELD, outline=RULE, width=1)
    draw_chip(draw, x + 10, y + 10, chip, chip_color)
    cf = font("georgia", 13)
    wrap_text(draw, claim, x + 10, y + 36, w - 20, 16, cf)
    sf = font("consola", 10)
    draw.text((x + 10, y + h - 16), strip, fill=GRAPHITE, font=sf)
    return h


def draw_phone_ui(draw, rect, variant):
    x, y, w, h = rect
    draw.rectangle(rect, fill=PAPER, outline=RULE, width=1)
    mf = font("consolab", 11)
    draw.text((x + 12, y + 8), "UPDATED", fill=INK, font=mf)

    if variant == "search":
        round_rect(draw, (x + 10, y + 32, x + w - 10, y + 60), 2, fill=FIELD, outline=RULE, width=1)
        draw.text((x + 16, y + 40), "Cyprus annual return", fill=GRAPHITE, font=font("segoeui", 11))
        draw.text((x + 16, y + 54), "deadline", fill=GRAPHITE, font=font("segoeui", 11))
    elif variant == "waveform":
        draw.text((x + 12, y + 30), "HOLD HOTKEY", fill=GRAPHITE, font=font("consola", 10))
        base_y = y + 55
        for i in range(0, w - 24, 4):
            amp = int(4 + abs((i * 7) % 11) - 5)
            draw.line([(x + 12 + i, base_y), (x + 12 + i, base_y - amp)], fill=GRAPHITE, width=1)
    elif variant == "contested":
        draw_chip(draw, x + 10, y + 30, "CONTESTED", CONTESTED)
        draw.text((x + 10, y + 56), "mock ↔ mock-alt · 0.00", fill=GRAPHITE, font=font("consola", 10))
        draw.line([(x + 10, y + 66), (x + w - 10, y + 66)], fill=RULE, width=1)
        draw.text((x + 10, y + 78), "Provider A", fill=GRAPHITE, font=font("consola", 10))
        draw.text((x + 10, y + 92), "Provider B", fill=GRAPHITE, font=font("consola", 10))


def draw_primary_rate(draw, x, y, rate):
    w, h = 148, 50
    round_rect(draw, (x, y, x + w, y + h), 2, fill=FIELD, outline=RULE, width=1)
    draw.text((x + 10, y + 6), "PRIMARY-SOURCE RATE", fill=GRAPHITE, font=font("consola", 10))
    draw.text((x + 10, y + 24), rate, fill=INK, font=font("georgia", 13))


def draw_annotation(draw, x1, y1, x2, y2, label, lx, ly):
    draw.line([(x1, y1), (x2, y2)], fill=GRAPHITE, width=1)
    draw.ellipse((x2 - 2, y2 - 2, x2 + 2, y2 + 2), fill=GRAPHITE)
    draw.text((lx, ly), label, fill=GRAPHITE, font=font("consola", 10))


def compose1(img: Image.Image) -> Image.Image:
    out = img.copy().convert("RGBA")
    draw = ImageDraw.Draw(out)
    W, H = out.size
    phone = (int(W * 0.52), int(H * 0.38), int(W * 0.64), int(H * 0.70))
    draw_phone_ui(draw, phone, "search")

    cx, cy, cw = int(W * 0.66), int(H * 0.28), int(W * 0.22)
    draw_primary_rate(draw, cx, cy - 58, "2 / 5")
    oy = cy
    oy += draw_claim_card(draw, cx, oy, cw, "PRIMARY", "Annual return filing due within 28 days of AGM.", "gov.cy · 1 source · primary", FRESH) + 8
    draw_claim_card(draw, cx, oy, cw, "PRIMARY", "HE32 form required for all Cyprus companies.", "mcit.gov.cy · 1 source · primary", FRESH)

    draw.line([(phone[2], phone[1] + 40), (cx, cy + 10)], fill=RULE, width=1)
    return out.convert("RGB")


def compose2(img: Image.Image) -> Image.Image:
    out = img.copy().convert("RGBA")
    draw = ImageDraw.Draw(out)
    W, H = out.size
    phone = (int(W * 0.38), int(H * 0.32), int(W * 0.52), int(H * 0.70))
    draw_phone_ui(draw, phone, "waveform")

    draw_primary_rate(draw, int(W * 0.56), int(H * 0.18), "1 / 5")

    rx, ry, rw = phone[0] - 10, phone[1] - 36, phone[2] - phone[0] + 20
    round_rect(draw, (rx, ry, rx + rw, ry + 28), 2, fill=FIELD, outline=RULE, width=1)
    draw.text((rx + 8, ry + 8), "VOICE → SEARCH", fill=GRAPHITE, font=font("consola", 10))

    px = phone[0] + (phone[2] - phone[0]) // 2 - 24
    round_rect(draw, (px, phone[3] + 12, px + 48, phone[3] + 20), 4, outline=RULE, width=1)
    return out.convert("RGB")


def compose3(img: Image.Image) -> Image.Image:
    out = img.copy().convert("RGBA")
    draw = ImageDraw.Draw(out)
    W, H = out.size
    phone = (int(W * 0.38), int(H * 0.12), int(W * 0.62), int(H * 0.88))
    draw_phone_ui(draw, phone, "contested")
    inner_w = phone[2] - phone[0] - 20
    draw_claim_card(draw, phone[0] + 10, phone[1] + 110, inner_w, "PRIMARY", "Filing deadline: 28 days post-AGM.", "gov.cy · 2024-06-01", FRESH)

    draw_annotation(draw, phone[2] + 8, phone[1] + 45, phone[2] + 60, phone[1] + 45, "JACCARD 0.00", phone[2] + 64, phone[1] + 38)
    draw_annotation(draw, phone[2] + 8, phone[1] + 130, phone[2] + 80, phone[1] + 130, "AGE STRIP", phone[2] + 84, phone[1] + 123)
    draw_annotation(draw, phone[0] - 8, phone[1] + 45, phone[0] - 70, phone[1] + 45, "CONTESTED", phone[0] - 130, phone[1] + 38)
    return out.convert("RGB")


def optimize(path: Path, target=(1280, 720)):
    img = Image.open(path).convert("RGB")
    img = img.resize(target, Image.Resampling.LANCZOS)
    img.save(path, "PNG", optimize=True, compress_level=9)
    if path.stat().st_size > 1024 * 1024:
        img = img.resize((1200, 675), Image.Resampling.LANCZOS)
        img.save(path, "PNG", optimize=True, compress_level=9)
    return Image.open(path).size, path.stat().st_size // 1024


def main():
    jobs = [
        ("updated-mobile-editorial-base-1.png", compose1, "updated-mobile-editorial-1.png"),
        ("updated-mobile-editorial-base-2.png", compose2, "updated-mobile-editorial-2.png"),
        ("updated-mobile-editorial-base-3.png", compose3, "updated-mobile-editorial-3.png"),
    ]
    for base_name, fn, out_name in jobs:
        base_path = BASE / base_name
        out_path = ASSETS / out_name
        print(f"Compositing {out_name} from {base_path.name}...")
        img = Image.open(base_path)
        result = fn(img)
        result.save(out_path, "PNG", optimize=True)
        size, kb = optimize(out_path)
        print(f"  -> {out_path.name} {size} {kb} KB")


if __name__ == "__main__":
    main()
