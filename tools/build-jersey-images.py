#!/usr/bin/env python3
"""
Cuts the two garments out of the supplied 2026/27 jersey spec sheet and writes
them as transparent PNGs for the Club Kit section.

The sheet lays both views on a flat light card, so the background comes away
with a flood fill from the corners rather than a colour key -- that keeps the
white sponsor panel and the white type on the garment intact.

  python3 tools/build-jersey-images.py <spec-sheet.png>
"""

import os
import sys
from collections import deque

from PIL import Image, ImageFilter

OUT_DIR = "assets/kit"
TARGET_W = 900          # displayed at roughly 350px, so 2x for retina and a little over
TOLERANCE = 34          # how far a pixel may drift from the card and still be background


def luma(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def garment_bbox(im, x0, x1):
    """Bounding box of the dark pixels in a vertical slice -- i.e. the garment."""
    px = im.load()
    minx, miny, maxx, maxy = x1, im.height, x0, 0
    for y in range(0, im.height, 2):
        for x in range(x0, x1, 2):
            if luma(px[x, y]) < 110:
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
    return minx, miny, maxx, maxy


def knockout(im):
    """Flood fill the card background from the edges and return an RGBA image."""
    w, h = im.size
    px = im.load()
    seed = px[0, 0]
    mask = bytearray(w * h)
    q = deque()

    def push(x, y):
        i = y * w + x
        if mask[i]:
            return
        p = px[x, y]
        if (abs(p[0] - seed[0]) + abs(p[1] - seed[1]) + abs(p[2] - seed[2])) <= TOLERANCE * 3:
            mask[i] = 1
            q.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)

    while q:
        x, y = q.popleft()
        if x > 0: push(x - 1, y)
        if x < w - 1: push(x + 1, y)
        if y > 0: push(x, y - 1)
        if y < h - 1: push(x, y + 1)

    alpha = Image.frombytes("L", (w, h), bytes(255 if not m else 0 for m in mask))
    # Pull the edge in by a pixel to drop the light fringe the anti-aliasing leaves,
    # then soften it so the cut does not look like a cookie cutter.
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    out = im.convert("RGBA")
    out.putalpha(alpha)
    return out


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    sheet = Image.open(sys.argv[1]).convert("RGB")
    os.makedirs(OUT_DIR, exist_ok=True)
    mid = sheet.width // 2

    for name, (x0, x1) in [("front", (0, mid)), ("back", (mid, sheet.width))]:
        # Skip the sheet's own header band and footer notes.
        panel = sheet.crop((x0, int(sheet.height * 0.2), x1, int(sheet.height * 0.8)))
        bx0, by0, bx1, by1 = garment_bbox(panel, 0, panel.width)
        pad = 8
        crop = panel.crop((max(0, bx0 - pad), max(0, by0 - pad),
                           min(panel.width, bx1 + pad), min(panel.height, by1 + pad)))
        cut = knockout(crop)
        cut.thumbnail((TARGET_W, TARGET_W), Image.LANCZOS)
        path = os.path.join(OUT_DIR, f"jersey-{name}.png")
        cut.quantize(colors=250, method=Image.FASTOCTREE).save(path, optimize=True)
        print(f"{path}  {cut.size[0]}x{cut.size[1]}  {os.path.getsize(path) // 1024}KB")


if __name__ == "__main__":
    main()
