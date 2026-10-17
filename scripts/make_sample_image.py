#!/usr/bin/env python3
"""Generate the conventional test image of contract case D2 (1376 x 1020 px).

Standard library only, so it runs anywhere. The picture is deliberately asymmetric (a red
corner, a blue corner, an "F", a diagonal and a grid) to make a flipped, shifted or blurred
tile obvious in the viewer. The output goes to `data/images/samples/`, which Git ignores
(ADR-12): nothing generated here is ever committed.

    python scripts/make_sample_image.py
"""

from __future__ import annotations

import argparse
import math
import struct
import zlib
from collections.abc import Callable
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = REPO_ROOT / "data" / "images" / "samples" / "prueba-1376x1020.png"

Pixel = tuple[int, int, int]


def make_pixel_function(width: int, height: int) -> Callable[[int, int], Pixel]:
    diagonal_length = math.hypot(width, height)

    def pixel(x: int, y: int) -> Pixel:
        if x < 200 and y < 120:
            return (200, 40, 40)  # top-left corner: red
        if x >= width - 120 and y >= height - 80:
            return (40, 40, 200)  # bottom-right corner: blue
        if abs(x * height - y * width) / diagonal_length < 2:
            return (20, 20, 20)  # main diagonal
        in_f = (
            (300 <= x < 340 and 300 <= y < 500)  # stem
            or (300 <= x < 420 and 300 <= y < 340)  # top bar
            or (300 <= x < 400 and 380 <= y < 410)  # middle bar
        )
        if in_f:
            return (30, 120, 60)
        if x % 500 == 0 or y % 500 == 0:
            return (80, 80, 80)  # heavy grid every 500 px
        if x % 100 == 0 or y % 100 == 0:
            return (150, 150, 150)  # light grid every 100 px
        return (200 + 55 * x // width, 210 + 45 * y // height, 230)  # soft gradient

    return pixel


def png_bytes(width: int, height: int, pixel: Callable[[int, int], Pixel]) -> bytes:
    def chunk(kind: bytes, data: bytes) -> bytes:
        body = kind + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter type 0 (none) for every scanline
        for x in range(width):
            raw.extend(pixel(x, y))
    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)  # 8-bit RGB
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", header)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--width", type=int, default=1376)
    parser.add_argument("--height", type=int, default=1020)
    args = parser.parse_args()
    if args.width < 400 or args.height < 600:
        parser.error("el tamaño mínimo es 400 x 600 px para que entren las marcas de orientación")

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_bytes(png_bytes(args.width, args.height, make_pixel_function(args.width, args.height)))
    print(f"{args.out} ({args.width} x {args.height} px, {args.out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
