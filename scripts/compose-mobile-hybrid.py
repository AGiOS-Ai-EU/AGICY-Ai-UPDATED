"""Hybrid mobile compositor v2 — 3x virtual phone UI, hero crop, AGICY.Ai + EU privacy."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from lib.readme_image_lib import (  # noqa: E402
    COBRAND,
    PRIVACY_CHIP,
    hex_rgb,
    paste_provider_row,
    rasterize_svg,
    draw_privacy_chip,
)

ASSETS = ROOT / "docs" / "assets"
MASKS = ASSETS / "phone-masks"
BASES = ASSETS / "bases"
PROVIDERS = ASSETS / "providers"

PAPER = "#f7f8f6"
INK = "#16211f"
GRAPHITE = "#5c6663"
RULE = "#d6dbd7"
FIELD = "#ffffff"
CONTESTED = "#5e4e78"
FRESH = "#2a6b4f"
AGICY = "#2a6b4f"

VIRTUAL_W, VIRTUAL_H = 390, 844
RENDER_SCALE = 3
OUT_SIZE = (1200, 675)


def fit_letterbox(img: Image.Image, out_size: tuple[int, int]) -> Image.Image:
    iw, ih = img.size
    tw, th = out_size
    scale = min(tw / iw, th / ih)
    nw, nh = int(iw * scale), int(ih * scale)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", out_size, hex_rgb(PAPER))
    canvas.paste(resized, ((tw - nw) // 2, (th - nh) // 2))
    return canvas


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def fonts(scale: int) -> dict:
    s = scale
    return {
        "mono": load_font("C:/Windows/Fonts/consola.ttf", 11 * s),
        "mono_b": load_font("C:/Windows/Fonts/consolab.ttf", 12 * s),
        "ui": load_font("C:/Windows/Fonts/segoeui.ttf", 14 * s),
        "ui_b": load_font("C:/Windows/Fonts/segoeuib.ttf", 15 * s),
        "serif": load_font("C:/Windows/Fonts/georgia.ttf", 16 * s),
        "rate": load_font("C:/Windows/Fonts/georgia.ttf", 22 * s),
        "brand_sub": load_font("C:/Windows/Fonts/segoeui.ttf", 11 * s),
    }


F = fonts(RENDER_SCALE)


def screen_rect(img: Image.Image, mask: dict) -> tuple[int, int, int, int]:
    w, h = img.size
    return (
        int(w * mask["x0"]),
        int(h * mask["y0"]),
        int(w * mask["x1"]),
        int(h * mask["y1"]),
    )


def clip_rounded(layer: Image.Image, r: int) -> Image.Image:
    w, h = layer.size
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), radius=r, fill=255)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(layer, (0, 0), m)
    return out


def draw_icon(d: ImageDraw.ImageDraw, kind: str, cx: int, cy: int, size: int, color: str) -> None:
    s = size // 2
    if kind == "chat":
        d.ellipse((cx - s, cy - s + 2, cx + s - 2, cy + s), outline=color, width=max(2, size // 8))
        d.line([(cx - s // 2, cy), (cx + s // 2, cy)], fill=color, width=max(2, size // 10))
    elif kind == "search":
        d.ellipse((cx - s, cy - s, cx + s - 4, cy + s - 4), outline=color, width=max(2, size // 8))
        d.line([(cx + s // 3, cy + s // 3), (cx + s, cy + s)], fill=color, width=max(2, size // 8))
    elif kind == "history":
        d.ellipse((cx - s, cy - s, cx + s, cy + s), outline=color, width=max(2, size // 8))
        d.line([(cx, cy - s // 2), (cx, cy), (cx + s // 2, cy)], fill=color, width=max(2, size // 8))
    elif kind == "settings":
        d.ellipse((cx - s // 2, cy - s // 2, cx + s // 2, cy + s // 2), outline=color, width=max(2, size // 8))
        for dx, dy in [(0, -s), (0, s), (-s, 0), (s, 0)]:
            d.line([(cx + dx, cy + dy), (cx + dx // 2, cy + dy // 2)], fill=color, width=max(2, size // 10))


def draw_glass_rail(d: ImageDraw.ImageDraw, w: int, h: int, active: int) -> int:
    rail_w = int(w * 0.18)
    d.rounded_rectangle(
        (8, 24, rail_w - 4, h - 24),
        radius=28,
        fill=(247, 248, 246, 170),
        outline=RULE,
        width=2,
    )
    icons = ["chat", "search", "history", "settings"]
    gap = (h - 120) // 5
    y0 = 48
    icon_sz = max(28, rail_w // 2)
    for i, kind in enumerate(icons):
        y = y0 + i * gap
        if i == active:
            d.rounded_rectangle(
                (12, y - 16, rail_w - 8, y + 20),
                radius=12,
                fill=(255, 255, 255, 200),
                outline=RULE,
            )
        draw_icon(d, kind, rail_w // 2, y, icon_sz, INK if i == active else GRAPHITE)
    return rail_w


def draw_one_card(
    d: ImageDraw.ImageDraw,
    x: int,
    y: int,
    cw: int,
    chip: str,
    claim: str,
    strip: str,
    chip_color: str = FRESH,
) -> int:
    ch = 130 * RENDER_SCALE // 3
    d.rounded_rectangle((x, y, x + cw, y + ch), radius=4, fill=FIELD, outline=RULE, width=2)
    d.text((x + 14, y + 12), chip, fill=chip_color, font=F["mono_b"])
    d.text((x + 14, y + 44), claim[:48], fill=INK, font=F["serif"])
    if len(claim) > 48:
        d.text((x + 14, y + 72), claim[48:96], fill=INK, font=F["serif"])
    d.text((x + 14, y + ch - 32), strip, fill=GRAPHITE, font=F["mono"])
    return ch


def draw_brand_header(d: ImageDraw.ImageDraw, cx: int, w: int) -> None:
    d.text((cx + 12, 16), "UPDATED", fill=INK, font=F["mono_b"])
    d.text((cx + 12, 38), COBRAND, fill=AGICY, font=F["brand_sub"])


def draw_brand_footer(d: ImageDraw.ImageDraw, cx: int, w: int, y: int) -> None:
    draw_privacy_chip(d, cx + 12, y, F["mono"], mono_b=F["mono_b"])


def render_virtual_ui(variant: str, *, provider_icons: list[str] | None = None) -> Image.Image:
    w, h = VIRTUAL_W * RENDER_SCALE, VIRTUAL_H * RENDER_SCALE
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    active = 1 if variant in ("search", "waveform", "contested") else 0
    rail_w = draw_glass_rail(d, w, h, active)

    cx = rail_w + 8
    pad = 16
    inner = w - cx - pad

    d.rectangle((cx, 0, w, 56), fill=(247, 248, 246, 220))
    draw_brand_header(d, cx, w)

    body = 64
    d.rectangle((cx, body, w, h), fill=PAPER)

    footer_y = h - 56

    if variant == "search":
        d.rounded_rectangle((cx + pad, body + 16, w - pad, body + 72), 4, fill=FIELD, outline=RULE, width=2)
        d.text((cx + pad + 12, body + 32), "Cyprus annual return", fill=GRAPHITE, font=F["ui"])
        d.text((cx + pad + 12, body + 88), "Primary-source rate", fill=GRAPHITE, font=F["mono"])
        d.text((cx + pad + 12, body + 118), "2 / 5", fill=INK, font=F["rate"])
        card_y = body + 168
        draw_one_card(
            d,
            cx + pad,
            card_y,
            inner - pad,
            "PRIMARY",
            "Annual return filing due within 28 days of AGM.",
            "gov.cy · 1 source · primary",
        )
        if provider_icons:
            icon_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            paste_provider_row(icon_layer, (cx + pad + 12, card_y + 140), provider_icons, icon_px=24 * RENDER_SCALE // 3)
            layer = Image.alpha_composite(layer, icon_layer)
            d = ImageDraw.Draw(layer)
        draw_brand_footer(d, cx, w, footer_y)
    elif variant == "waveform":
        d.text((cx + pad, body + 24), "HOLD HOTKEY", fill=GRAPHITE, font=F["mono_b"])
        d.text((cx + pad, body + 56), "Cyprus annual return", fill=INK, font=F["ui_b"])
        base_y = body + 100
        for i in range(0, inner - 24, 8):
            amp = 12 + abs((i * 3) % 20) - 10
            d.line([(cx + pad + i, base_y + 40), (cx + pad + i, base_y + 40 - amp)], fill=GRAPHITE, width=3)
        d.text((cx + pad, body + 168), "Primary-source rate", fill=GRAPHITE, font=F["mono"])
        d.text((cx + pad, body + 198), "1 / 5", fill=INK, font=F["rate"])
        draw_brand_footer(d, cx, w, footer_y)
    else:
        d.rounded_rectangle((cx + pad, body + 16, cx + pad + 180, body + 52), 4, fill=FIELD, outline=CONTESTED, width=2)
        d.text((cx + pad + 12, body + 26), "CONTESTED", fill=CONTESTED, font=F["mono_b"])
        sim_y = body + 68
        d.text((cx + pad, sim_y), "mock ↔ mock-alt · 0.00", fill=GRAPHITE, font=F["mono"])
        if provider_icons:
            icon_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            paste_provider_row(
                icon_layer,
                (cx + pad, sim_y + 28),
                provider_icons,
                icon_px=22 * RENDER_SCALE // 3,
            )
            layer = Image.alpha_composite(layer, icon_layer)
            d = ImageDraw.Draw(layer)
        d.text((cx + pad, body + 100), "Primary rate: 0 / 4", fill=INK, font=F["ui_b"])
        draw_one_card(
            d,
            cx + pad,
            body + 140,
            inner - pad,
            "PRIMARY",
            "Filing deadline: 28 days post-AGM.",
            "gov.cy · 2024-06-01",
        )
        draw_brand_footer(d, cx, w, footer_y)

    return layer


def crop_phone_hero(img: Image.Image, rect: tuple[int, int, int, int], mask: dict) -> Image.Image:
    px = mask.get("crop_pad_x", 0) or 0
    py = mask.get("crop_pad_y", 0) or 0
    if px <= 0 and py <= 0:
        return fit_letterbox(img.convert("RGB"), OUT_SIZE)
    x0, y0, x1, y1 = rect
    pw, ph = x1 - x0, y1 - y0
    iw, ih = img.size
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    crop_w = int(pw * max(px, 1.2) * 2)
    crop_h = int(max(ph * max(py, 1.0) * 2, crop_w * OUT_SIZE[1] / OUT_SIZE[0]))
    left = max(0, cx - crop_w // 2)
    top = max(0, cy - crop_h // 2)
    right = min(iw, left + crop_w)
    bottom = min(ih, top + crop_h)
    if right - left < crop_w:
        left = max(0, right - crop_w)
    if bottom - top < crop_h:
        top = max(0, bottom - crop_h)
    cropped = img.crop((left, top, right, bottom))
    return fit_letterbox(cropped.convert("RGB"), OUT_SIZE)


def compose(base_path: Path, mask: dict, variant: str, out_path: Path, provider_icons: list[str] | None = None) -> None:
    base = Image.open(base_path).convert("RGBA")
    rect = screen_rect(base, mask)
    sw, sh = rect[2] - rect[0], rect[3] - rect[1]
    r = int(min(sw, sh) * mask.get("radius_frac", 0.045))

    ui_hi = render_virtual_ui(variant, provider_icons=provider_icons)
    ui = ui_hi.resize((sw, sh), Image.Resampling.LANCZOS)
    ui_clipped = clip_rounded(ui, r)

    result = base.copy()
    result.paste(ui_clipped, (rect[0], rect[1]), ui_clipped)
    result = crop_phone_hero(result, rect, mask).convert("RGB")
    result.save(out_path, "PNG", optimize=True, compress_level=9)

    if out_path.stat().st_size > 1024 * 1024:
        result = result.resize((1080, 608), Image.Resampling.LANCZOS)
        result.save(out_path, "PNG", optimize=True, compress_level=9)

    kb = out_path.stat().st_size // 1024
    print(f"Wrote {out_path.name} {Image.open(out_path).size[0]}x{Image.open(out_path).size[1]} {kb}KB")


BATCH = [
    {
        "base": "updated-mobile-base-v2-1.png",
        "mask": "v2-1.json",
        "variant": "search",
        "out": "updated-mobile-hybrid-1.png",
        "providers": ["openai.svg", "brave-search.svg"],
    },
    {
        "base": "updated-mobile-base-v2-2.png",
        "mask": "v2-2.json",
        "variant": "waveform",
        "out": "updated-mobile-hybrid-2.png",
        "providers": None,
    },
    {
        "base": "updated-mobile-base-v2-3.png",
        "mask": "v2-3.json",
        "variant": "contested",
        "out": "updated-mobile-hybrid-3.png",
        "providers": ["groq.svg", "anthropic.svg", "mistral-color.svg"],
    },
]


def debug_masks() -> None:
    for i, job in enumerate(BATCH, 1):
        base = Image.open(BASES / job["base"]).convert("RGB")
        mask = json.loads((MASKS / job["mask"]).read_text())
        rect = screen_rect(base, mask)
        d = ImageDraw.Draw(base)
        d.rounded_rectangle(rect, radius=12, outline="red", width=6)
        base.save(ASSETS / f"_debug-v2-mask-{i}.png")


def main() -> None:
    if "--debug" in sys.argv:
        debug_masks()
        return
    for job in BATCH:
        base_path = BASES / job["base"]
        if not base_path.exists():
            print(f"Missing base: {base_path}", file=sys.stderr)
            sys.exit(1)
        mask = json.loads((MASKS / job["mask"]).read_text())
        compose(
            base_path,
            mask,
            job["variant"],
            ASSETS / job["out"],
            provider_icons=job.get("providers"),
        )


if __name__ == "__main__":
    main()
