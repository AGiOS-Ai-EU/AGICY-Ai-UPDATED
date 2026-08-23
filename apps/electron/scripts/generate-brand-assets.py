#!/usr/bin/env python3
"""Generate UPDATED desktop packaging, tray, README, and review assets."""

from __future__ import annotations

import shutil
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ELECTRON_DIR = Path(__file__).resolve().parent.parent
ROOT = ELECTRON_DIR.parents[1]
SOURCE = ELECTRON_DIR / "brand" / "updated-mark.svg"
TRAY_SOURCE = ELECTRON_DIR / "brand" / "updated-tray-template.svg"
BUILD = ELECTRON_DIR / "build"
RESOURCES = ELECTRON_DIR / "resources"
DOCS_ASSETS = ROOT / "docs" / "assets"
LINUX_SIZES = (16, 24, 32, 48, 64, 96, 128, 256, 512)
ICO_SIZES = (16, 24, 32, 48, 64, 128, 256)


def render_svg(source: Path, output: Path, width: int) -> None:
    npx = shutil.which("npx")
    if not npx:
        raise RuntimeError("npx is required to rasterize the canonical SVG")
    subprocess.run(
        [
            npx,
            "--yes",
            "@resvg/resvg-js-cli",
            str(source),
            str(output),
            "--fit-width",
            str(width),
        ],
        cwd=ROOT,
        check=True,
    )


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        Path("C:/Windows/Fonts") / ("segoeuib.ttf" if bold else "segoeui.ttf"),
        Path("/System/Library/Fonts/SFNS.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    )
    for candidate in candidates:
        if candidate.is_file():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def build_contact_sheet(master: Image.Image) -> Image.Image:
    width, height = 1400, 540
    sheet = Image.new("RGB", (width, height), "#F5F0EB")
    draw = ImageDraw.Draw(sheet)
    draw.rectangle((700, 0, width, height), fill="#11111E")
    draw.line((700, 0, 700, height), fill="#C9894A", width=2)

    title_font = font(30, bold=True)
    label_font = font(17, bold=True)
    meta_font = font(14)
    draw.text((42, 28), "UPDATED icon reduction proof", fill="#1A1A2E", font=title_font)
    draw.text((742, 28), "UPDATED icon reduction proof", fill="#F5F0EB", font=title_font)
    draw.text((42, 76), "LIGHT / PAPER", fill="#B87333", font=label_font)
    draw.text((742, 76), "DARK / INK", fill="#C9894A", font=label_font)

    sizes = (256, 128, 64, 32, 16)
    labels = ("LARGE", "128", "64", "32", "16")
    offsets = (40, 330, 492, 590, 646)
    baseline = 412
    for panel_x in (0, 700):
        text_color = "#64748B" if panel_x == 0 else "#ECE5DD"
        for size, label, offset in zip(sizes, labels, offsets, strict=True):
            icon = master.resize((size, size), Image.Resampling.LANCZOS)
            x = panel_x + offset
            y = baseline - size
            sheet.paste(icon, (x, y), icon)
            box = draw.textbbox((0, 0), label, font=meta_font)
            text_width = box[2] - box[0]
            draw.text(
                (x + (size - text_width) / 2, baseline + 22),
                label,
                fill=text_color,
                font=meta_font,
            )
    return sheet


def main() -> None:
    ET.parse(SOURCE)
    ET.parse(TRAY_SOURCE)
    BUILD.mkdir(parents=True, exist_ok=True)
    RESOURCES.mkdir(parents=True, exist_ok=True)
    DOCS_ASSETS.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="updated-brand-") as temp_dir:
        temp = Path(temp_dir)
        master_path = temp / "updated-mark-1024.png"
        tray_16_path = temp / "tray-16.png"
        tray_32_path = temp / "tray-32.png"
        render_svg(SOURCE, master_path, 1024)
        render_svg(TRAY_SOURCE, tray_16_path, 16)
        render_svg(TRAY_SOURCE, tray_32_path, 32)

        master = Image.open(master_path).convert("RGBA")
        tray_16 = Image.open(tray_16_path).convert("RGBA")
        tray_32 = Image.open(tray_32_path).convert("RGBA")

        save_png(master, BUILD / "icon.png")
        save_png(master, RESOURCES / "icon.png")
        master.save(BUILD / "icon.ico", format="ICO", sizes=[(s, s) for s in ICO_SIZES])
        master.save(BUILD / "icon.icns", format="ICNS")

        linux_dir = BUILD / "icons"
        for size in LINUX_SIZES:
            save_png(
                master.resize((size, size), Image.Resampling.LANCZOS),
                linux_dir / f"{size}x{size}.png",
            )

        tray_dir = RESOURCES / "tray"
        save_png(tray_16, tray_dir / "logoTemplate.png")
        save_png(tray_32, tray_dir / "logoTemplate@2x.png")
        tray_32.save(
            tray_dir / "logoTemplate.ico",
            format="ICO",
            sizes=[(16, 16), (32, 32)],
        )

        save_png(
            master.resize((256, 256), Image.Resampling.LANCZOS),
            DOCS_ASSETS / "updated-mark.png",
        )
        save_png(
            build_contact_sheet(master),
            DOCS_ASSETS / "updated-icon-contact-sheet.png",
        )

    print("Generated UPDATED packaging, tray, README, and contact-sheet assets.")


if __name__ == "__main__":
    main()
