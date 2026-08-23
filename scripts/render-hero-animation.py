"""Render animated README hero GIF — streaming text on laptop screen with UPDATED app fonts."""
from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs" / "assets"
FONTS = ASSETS / "fonts"

# Design tokens (packages/updated-design/tokens.css)
PAPER = "#f7f8f6"
INK = "#16211f"
GRAPHITE = "#5c6663"
RULE = "#d6dbd7"
FIELD = "#ffffff"
FRESH = "#2a6b4f"
BG = "#eef1ef"

QUERY_FULL = "Cyprus annual return"
RATE_LABEL = "Primary-source rate"
RATE_VALUE = "2 / 5"
CLAIM_LINES = [
    "Annual return filing due within",
    "28 days of AGM.",
]
CLAIM_META = "gov.cy · 1 source · primary"
FOOTER_CHIP = "EU-hosted · GDPR-aligned"
COBRAND = "by AGICY.Ai"

FPS = 10
DURATION_MS = 1000 // FPS
OUTPUT_W, OUTPUT_H = 800, 533  # README width=960 scales up; keeps GIF ≤5 MB
GIF_COLORS = 64
TOTAL_FRAMES = 36
HOLD_TAIL = 2


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont:
    path = FONTS / name
    return ImageFont.truetype(str(path), size)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * max(0.0, min(1.0, t))


def draw_hybrid_ui(
    frame_state: dict,
    logical_w: int = 390,
    logical_h: int = 300,
) -> Image.Image:
    """Draw cropped Search panel matching updated-mobile-search.svg layout."""
    img = Image.new("RGB", (logical_w, logical_h), hex_rgb(BG))
    d = ImageDraw.Draw(img)

    ui = load_font("InstrumentSans-Variable.ttf", 14)
    ui_sm = load_font("InstrumentSans-Variable.ttf", 11)
    ui_xs = load_font("InstrumentSans-Variable.ttf", 10)
    claim = load_font("Newsreader-Variable.ttf", 16)
    rate = load_font("Newsreader-Variable.ttf", 22)
    mono = load_font("MartianMono-Variable.ttf", 11)
    mono_sm = load_font("MartianMono-Variable.ttf", 10)
    mono_chip = load_font("MartianMono-Variable.ttf", 11)

    rail_x, rail_y, rail_w, rail_h = 12, 8, 52, logical_h - 16
    panel_x, panel_y, panel_w, panel_h = 76, 8, 302, logical_h - 16

    # Glass rail (simplified gradient)
    d.rounded_rectangle(
        (rail_x, rail_y, rail_x + rail_w, rail_y + rail_h),
        radius=20,
        fill=hex_rgb("#fafbf9"),
        outline=hex_rgb(RULE),
        width=1,
    )
    # Search icon highlight on rail
    d.rounded_rectangle(
        (rail_x + 8, rail_y + 72, rail_x + rail_w - 8, rail_y + 108),
        radius=10,
        fill=hex_rgb(FIELD),
        outline=hex_rgb(RULE),
        width=1,
    )

    # Main glass frame
    d.rounded_rectangle(
        (panel_x, panel_y, panel_x + panel_w, panel_y + panel_h),
        radius=16,
        fill=hex_rgb(PAPER),
        outline=hex_rgb(RULE),
        width=1,
    )
    # Header strip
    d.rectangle(
        (panel_x, panel_y, panel_x + panel_w, panel_y + 44),
        fill=hex_rgb("#ffffff"),
    )
    d.text((panel_x + 16, panel_y + 28), "UPDATED", fill=hex_rgb(INK), font=mono)
    d.text((panel_x + 78, panel_y + 28), COBRAND, fill=hex_rgb(FRESH), font=ui_sm)

    content_y = panel_y + 44
    d.rectangle(
        (panel_x, content_y, panel_x + panel_w, panel_y + panel_h),
        fill=hex_rgb(PAPER),
    )

    # Query field
    qx, qy = panel_x + 16, content_y + 16
    qw, qh = panel_w - 32, 36
    d.rounded_rectangle((qx, qy, qx + qw, qy + qh), radius=2, fill=hex_rgb(FIELD), outline=hex_rgb(RULE), width=1)
    query_text = QUERY_FULL[: frame_state["query_len"]]
    if query_text:
        d.text((qx + 12, qy + 22), query_text, fill=hex_rgb(INK), font=ui, anchor="ls")

    # Blinking caret while typing
    if frame_state["query_len"] < len(QUERY_FULL) and frame_state["caret_on"]:
        caret_x = qx + 12 + d.textlength(query_text, font=ui) + 1
        d.line([(caret_x, qy + 10), (caret_x, qy + qh - 10)], fill=hex_rgb(INK), width=1)

    y_cursor = qy + qh + 20

    # Primary rate block
    if frame_state["show_rate"]:
        alpha = frame_state["rate_alpha"]
        label_c = tuple(int(lerp(255, c, alpha)) for c in hex_rgb(GRAPHITE))
        d.text((qx, y_cursor), RATE_LABEL, fill=label_c, font=mono_sm, anchor="ls")
        y_cursor += 28
        if frame_state["rate_alpha"] > 0.3:
            rate_c = tuple(int(lerp(255, c, frame_state["rate_alpha"])) for c in hex_rgb(INK))
            d.text((qx, y_cursor), RATE_VALUE, fill=rate_c, font=rate, anchor="ls")
            y_cursor += 36

    # Claim card
    if frame_state["show_claim"]:
        card_y = y_cursor + 4
        card_h = 118
        card_alpha = frame_state["claim_alpha"]
        card_fill = tuple(int(lerp(247, c, card_alpha)) for c in hex_rgb(FIELD))
        d.rounded_rectangle(
            (qx, card_y, qx + qw, card_y + card_h),
            radius=2,
            fill=card_fill,
            outline=hex_rgb(RULE),
            width=1,
        )

        if frame_state["chip_alpha"] > 0:
            chip_c = tuple(int(lerp(255, c, frame_state["chip_alpha"])) for c in hex_rgb(FRESH))
            d.text((qx + 14, card_y + 24), "PRIMARY", fill=chip_c, font=mono_chip, anchor="ls")

        claim_chars = frame_state["claim_chars"]
        text_so_far = ""
        line_y = card_y + 52
        for line in CLAIM_LINES:
            remaining = claim_chars - len(text_so_far)
            if remaining <= 0:
                break
            segment = line[:remaining]
            text_so_far += line
            if segment:
                d.text((qx + 14, line_y), segment, fill=hex_rgb(INK), font=claim, anchor="ls")
            line_y += 24

        if frame_state["claim_chars"] >= len("".join(CLAIM_LINES)):
            d.line([(qx, card_y + 94), (qx + qw, card_y + 94)], fill=hex_rgb(RULE), width=1)
            d.text((qx + 14, card_y + 112), CLAIM_META, fill=hex_rgb(GRAPHITE), font=mono_sm, anchor="ls")

    # Footer privacy chip
    if frame_state["footer_alpha"] > 0:
        fy = panel_y + panel_h - 34
        fa = frame_state["footer_alpha"]
        chip_fill = tuple(int(lerp(247, c, fa)) for c in hex_rgb(FIELD))
        d.rounded_rectangle(
            (qx, fy, qx + 200, fy + 22),
            radius=4,
            fill=chip_fill,
            outline=hex_rgb(RULE),
            width=1,
        )
        fc = tuple(int(lerp(255, c, fa)) for c in hex_rgb(GRAPHITE))
        d.text((qx + 12, fy + 15), FOOTER_CHIP, fill=fc, font=mono_sm, anchor="ls")

    return img


def build_frame_state(frame_idx: int, total: int) -> dict:
    """Timeline: query stream → rate → claim stream → chips."""
    t = frame_idx / max(1, total - 1)

    # Phase boundaries (frames at 12fps)
    q_end = 20
    rate_start = 18
    rate_end = 28
    claim_start = 26
    claim_end = 44
    chip_start = 38
    footer_start = 40

    query_len = min(len(QUERY_FULL), int(len(QUERY_FULL) * min(1.0, frame_idx / q_end)))
    caret_on = frame_idx % 2 == 0

    show_rate = frame_idx >= rate_start
    rate_alpha = 0.0
    if show_rate:
        rate_alpha = min(1.0, (frame_idx - rate_start) / (rate_end - rate_start))

    show_claim = frame_idx >= claim_start
    claim_alpha = 0.0
    if show_claim:
        claim_alpha = min(1.0, (frame_idx - claim_start) / 6)

    full_claim = "".join(CLAIM_LINES)
    claim_chars = 0
    if frame_idx >= claim_start:
        claim_chars = int(len(full_claim) * min(1.0, (frame_idx - claim_start) / (claim_end - claim_start)))

    chip_alpha = 0.0
    if frame_idx >= chip_start:
        chip_alpha = min(1.0, (frame_idx - chip_start) / 6)

    footer_alpha = 0.0
    if frame_idx >= footer_start:
        footer_alpha = min(1.0, (frame_idx - footer_start) / 6)

    return {
        "query_len": query_len,
        "caret_on": caret_on,
        "show_rate": show_rate,
        "rate_alpha": rate_alpha,
        "show_claim": show_claim,
        "claim_alpha": claim_alpha,
        "claim_chars": claim_chars,
        "chip_alpha": chip_alpha,
        "footer_alpha": footer_alpha,
        "_t": t,
    }


def screen_rect(base_size: tuple[int, int], mask: dict) -> tuple[int, int, int, int]:
    bw, bh = base_size
    x0 = int(bw * mask["x0"])
    y0 = int(bh * mask["y0"])
    x1 = int(bw * mask["x1"])
    y1 = int(bh * mask["y1"])
    return x0, y0, x1 - x0, y1 - y0


def composite_frame(base: Image.Image, ui: Image.Image, rect: tuple[int, int, int, int], radius: int) -> Image.Image:
    x, y, w, h = rect
    scaled = ui.resize((w, h), Image.Resampling.LANCZOS)

    frame = base.copy()
    mask = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, w, h), radius=radius, fill=255)

    region = frame.crop((x, y, x + w, y + h))
    region.paste(scaled, (0, 0), mask)
    frame.paste(region, (x, y))
    return frame


def to_gif_palette(frames: list[Image.Image], colors: int) -> list[Image.Image]:
    """Shared adaptive palette across frames for smaller GIF."""
    ref = Image.new("RGB", frames[0].size)
    picks = [0, len(frames) // 3, (2 * len(frames)) // 3, len(frames) - 1]
    for idx in picks:
        ref = Image.blend(ref, frames[idx], 0.55)
    palette_ref = ref.quantize(colors=colors, method=Image.Quantize.MEDIANCUT)
    return [f.quantize(palette=palette_ref, dither=Image.Dither.NONE) for f in frames]


def render_gif() -> None:
    mask_path = ASSETS / "hero-laptop-mask.json"
    base_path = ASSETS / "updated-github-hero.png"
    out_gif = ASSETS / "updated-github-hero.gif"
    out_webp = ASSETS / "updated-github-hero.webp"

    mask = json.loads(mask_path.read_text(encoding="utf-8"))
    base_full = Image.open(base_path).convert("RGB")
    base = base_full.resize((OUTPUT_W, OUTPUT_H), Image.Resampling.LANCZOS)
    rect = screen_rect(base.size, mask)
    radius = max(4, int(base.size[1] * mask.get("radius_frac", 0.018)))

    frames_rgb: list[Image.Image] = []
    for i in range(TOTAL_FRAMES):
        state = build_frame_state(i, TOTAL_FRAMES)
        ui = draw_hybrid_ui(state)
        frames_rgb.append(composite_frame(base, ui, rect, radius))

    for _ in range(HOLD_TAIL):
        frames_rgb.append(frames_rgb[-1].copy())

    frames_p = to_gif_palette(frames_rgb, GIF_COLORS)
    frames_p[0].save(
        out_gif,
        save_all=True,
        append_images=frames_p[1:],
        duration=DURATION_MS,
        loop=0,
        optimize=True,
        disposal=2,
    )

    # Optional WebP — often smaller for photo + UI loops
    frames_rgb[0].save(
        out_webp,
        save_all=True,
        append_images=frames_rgb[1:],
        duration=DURATION_MS,
        loop=0,
        quality=82,
        method=6,
    )

    gif_kb = out_gif.stat().st_size / 1024
    webp_kb = out_webp.stat().st_size / 1024
    print(f"Wrote {out_gif.name} {OUTPUT_W}x{OUTPUT_H} frames={len(frames_p)} {gif_kb:.1f} KB")
    print(f"Wrote {out_webp.name} {webp_kb:.1f} KB")
    print(f"Screen rect @ {OUTPUT_W}x{OUTPUT_H}: x={rect[0]} y={rect[1]} w={rect[2]} h={rect[3]} radius={radius}")


if __name__ == "__main__":
    render_gif()
