"""Overlay AGICY.Ai co-brand, EU privacy chip, and provider icons on desktop README usage PNGs."""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from lib.readme_image_lib import (  # noqa: E402
    AGICY_ACCENT,
    COBRAND,
    FIELD,
    GRAPHITE,
    INK,
    PAPER,
    PRIVACY_CHIP,
    RULE,
    draw_privacy_chip,
    hex_rgb,
    paste_provider_row,
    rasterize_svg,
)

ASSETS = ROOT / "docs" / "assets"
PROVIDERS = ASSETS / "providers"


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def overlay_hold_speak(path: Path) -> None:
    img = Image.open(path).convert("RGBA")
    d = ImageDraw.Draw(img)
    w, h = img.size
    mono_b = load_font("C:/Windows/Fonts/consolab.ttf", 14)
    sub = load_font("C:/Windows/Fonts/segoeui.ttf", 13)
    # Co-brand under existing UPDATED wordmark (top-left ~4%, 5%)
    d.text((int(w * 0.04), int(h * 0.115)), COBRAND, fill=AGICY_ACCENT, font=sub)
    # Privacy chip on certificate card (right panel ~72% x, 18% y)
    chip_x, chip_y = int(w * 0.58), int(h * 0.155)
    draw_privacy_chip(d, int(w * 0.58), int(h * 0.155), sub, mono_b=mono_b)
    paste_provider_row(
        img,
        (int(w * 0.58), int(h * 0.785)),
        ["openai.svg", "brave-search.svg", "groq.svg"],
        icon_px=24,
        gap=10,
    )
    img.convert("RGB").save(path, "PNG", optimize=True, compress_level=9)
    print(f"Updated {path.name} {img.size[0]}x{img.size[1]}")


def overlay_search_flow(path: Path) -> None:
    img = Image.open(path).convert("RGBA")
    d = ImageDraw.Draw(img)
    w, h = img.size
    mono_b = load_font("C:/Windows/Fonts/consolab.ttf", 12)
    sub = load_font("C:/Windows/Fonts/segoeui.ttf", 11)
    d.text((int(w * 0.04), int(h * 0.03)), COBRAND, fill=AGICY_ACCENT, font=sub)
    draw_privacy_chip(d, int(w * 0.04), int(h * 0.055), sub, mono_b=mono_b)
    # CONTESTED card metadata — lower card ~55% from top
    paste_provider_row(
        img,
        (int(w * 0.52), int(h * 0.545)),
        ["anthropic.svg", "mistral-color.svg", "cerebras-color.svg"],
        icon_px=22,
        gap=8,
    )
    img.convert("RGB").save(path, "PNG", optimize=True, compress_level=9)
    print(f"Updated {path.name} {img.size[0]}x{img.size[1]}")


def render_hero_png() -> None:
    w, h = 1280, 640
    img = Image.new("RGB", (w, h), hex_rgb(PAPER))
    d = ImageDraw.Draw(img)
    mono_b = load_font("C:/Windows/Fonts/consolab.ttf", 11)
    serif = load_font("C:/Windows/Fonts/georgia.ttf", 96)
    sub = load_font("C:/Windows/Fonts/segoeui.ttf", 22)
    agicy = load_font("C:/Windows/Fonts/segoeui.ttf", 18)
    chip_f = load_font("C:/Windows/Fonts/consola.ttf", 11)

    d.line([(64, 0), (64, h)], fill=RULE, width=1)
    d.line([(w - 64, 0), (w - 64, h)], fill=RULE, width=1)
    d.line([(0, 48), (w, 48)], fill=RULE, width=1)
    d.line([(0, h - 48), (w, h - 48)], fill=RULE, width=1)

    title = "UPDATED"
    bbox = d.textbbox((0, 0), title, font=serif)
    tw = bbox[2] - bbox[0]
    d.text(((w - tw) // 2, 200), title, fill=INK, font=serif)
    cob = COBRAND
    bb2 = d.textbbox((0, 0), cob, font=agicy)
    cw = bb2[2] - bb2[0]
    d.text(((w - cw) // 2, 268), cob, fill=AGICY_ACCENT, font=agicy)
    tag = "Voice-driven search. Certificate-grade sources."
    bt = d.textbbox((0, 0), tag, font=sub)
    d.text(((w - (bt[2] - bt[0])) // 2, 300), tag, fill=GRAPHITE, font=sub)
    draw_privacy_chip(d, (w - 300) // 2, 332, chip_f, mono_b=mono_b)

    card_x, card_y = 430, 380
    d.rounded_rectangle((card_x, card_y, card_x + 420, card_y + 120), radius=2, fill=FIELD, outline=RULE)
    d.text((card_x + 20, card_y + 20), "PRIMARY", fill=AGICY_ACCENT, font=mono_b)
    d.text((card_x + 20, card_y + 50), "Primary-source rate: 1 / 4", fill=INK, font=load_font("C:/Windows/Fonts/georgia.ttf", 18))
    d.line([(card_x + 20, card_y + 74), (card_x + 400, card_y + 74)], fill=RULE)
    d.text((card_x + 20, card_y + 98), "gov.cy · 2023-11-04 · local keychain", fill=GRAPHITE, font=chip_f)
    d.rounded_rectangle((565, 548, 715, 576), radius=14, outline=RULE)
    d.ellipse((579, 556, 591, 568), fill=INK)

    png_path = ASSETS / "updated-github-hero.png"
    img.save(png_path, "PNG", optimize=True, compress_level=9)
    kb = png_path.stat().st_size // 1024
    print(f"Wrote {png_path.name} 1280x640 {kb}KB")


def main() -> None:
    overlay_hold_speak(ASSETS / "updated-usage-hold-speak.png")
    overlay_search_flow(ASSETS / "updated-usage-search-flow.png")
    # Photo hero (updated-github-hero.png) is the GIF base — do not overwrite here.
    # Call render_hero_png() manually only when regenerating the vector fallback.


if __name__ == "__main__":
    main()
