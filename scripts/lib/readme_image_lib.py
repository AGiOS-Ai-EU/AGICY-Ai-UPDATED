"""Shared helpers for README usage imagery compositors."""
from __future__ import annotations

import io
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
PROVIDERS = ROOT / "docs" / "assets" / "providers"

PAPER = "#f5f0eb"
INK = "#1a1a2e"
GRAPHITE = "#64748b"
RULE = "#e1dcd4"
FIELD = "#ffffff"
CONTESTED = "#5e4e78"
FRESH = "#2d6a4f"
AGICY_ACCENT = "#b87333"

PRIVACY_CHIP = "EU-hosted · GDPR-aligned"
COBRAND = "by AGICY.Ai"


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def rasterize_svg(svg_path: Path, size_px: int) -> Image.Image | None:
    if not svg_path.is_file():
        return None
    try:
        import cairosvg

        png_bytes = cairosvg.svg2png(
            url=str(svg_path),
            output_width=size_px * 2,
            output_height=size_px * 2,
        )
        img = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
        return img.resize((size_px, size_px), Image.Resampling.LANCZOS)
    except Exception:
        return None


def draw_privacy_chip(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    font: ImageFont.ImageFont,
    *,
    mono_b: ImageFont.ImageFont | None = None,
) -> tuple[int, int]:
    f = mono_b or font
    bbox = draw.textbbox((0, 0), PRIVACY_CHIP, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad_x, pad_y = 10, 5
    w, h = tw + pad_x * 2, th + pad_y * 2
    draw.rounded_rectangle((x, y, x + w, y + h), radius=4, fill=FIELD, outline=RULE, width=1)
    draw.text((x + pad_x, y + pad_y), PRIVACY_CHIP, fill=GRAPHITE, font=f)
    return w, h


def draw_cobrand(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    title_font: ImageFont.ImageFont,
    sub_font: ImageFont.ImageFont,
) -> None:
    draw.text((x, y), "UPDATED", fill=INK, font=title_font)
    bbox = draw.textbbox((0, 0), "UPDATED", font=title_font)
    draw.text((x, bbox[3] + 4), COBRAND, fill=AGICY_ACCENT, font=sub_font)


def paste_provider_row(
    base: Image.Image,
    xy: tuple[int, int],
    provider_files: list[str],
    icon_px: int = 20,
    gap: int = 8,
) -> None:
    x, y = xy
    for name in provider_files:
        svg_path = PROVIDERS / name
        if not svg_path.is_file():
            continue
        icon = rasterize_svg(svg_path, icon_px)
        if icon is None:
            continue
        if base.mode != "RGBA":
            base = base.convert("RGBA")
        base.paste(icon, (x, y), icon)
        x += icon_px + gap
