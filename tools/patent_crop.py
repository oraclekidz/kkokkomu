#!/usr/bin/env python3
"""Crop the figures used in 꼬꼬무 from the 300 dpi renders of the original patents.

    python3 tools/patent_crop.py            # build every figure in tools/patent_figures.json
    python3 tools/patent_crop.py s23 s24    # only the named stories

The spec file records, for each figure, the patent, the PDF page, the fractional
box taken from that page's 300 dpi render (tools/patent_fetch.py), whether the
crop should be trimmed to its ink and any rotation — so every image on the site
can be reproduced from the public original.
"""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = "/workspace/patent_src"
OUT = os.path.join(ROOT, "assets", "patents")
SPEC = os.path.join(ROOT, "tools", "patent_figures.json")


def trim(im, thresh=205, pad=0.04, min_count=4):
    a = np.array(im.convert("L"))
    ink = a < thresh
    rows = np.where(ink.sum(1) >= min_count)[0]
    cols = np.where(ink.sum(0) >= min_count)[0]
    if len(rows) == 0 or len(cols) == 0:
        return im
    y0, y1, x0, x1 = rows.min(), rows.max(), cols.min(), cols.max()
    px, py = int((x1 - x0) * pad), int((y1 - y0) * pad)
    return im.crop((max(0, x0 - px), max(0, y0 - py),
                    min(im.width, x1 + px), min(im.height, y1 + py)))


def clean(im, white=248, black=60):
    a = np.array(im.convert("L")).astype(np.float32)
    a = np.clip((a - black) / (white - black) * 255.0, 0, 255)
    return Image.fromarray(a.astype(np.uint8))


def build(spec):
    page_png = os.path.join(SRC, spec["patent"], f"page-{spec['page']}.png")
    im = Image.open(page_png).convert("L")
    W, H = im.size
    x0, y0, x1, y1 = spec["box"]
    crop = im.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
    if spec.get("rotate"):
        crop = crop.rotate(spec["rotate"], expand=True)
    if spec.get("trim", True):
        crop = trim(crop, thresh=spec.get("thresh", 205))
    if spec.get("inset"):  # fractional [left, top, right, bottom] shaved off after trimming
        l, t, r, b = spec["inset"]
        crop = crop.crop((int(l * crop.width), int(t * crop.height),
                          crop.width - int(r * crop.width), crop.height - int(b * crop.height)))
    crop = clean(crop)
    longest = spec.get("max_long", 1400)
    if max(crop.size) > longest:
        r = longest / max(crop.size)
        crop = crop.resize((round(crop.width * r), round(crop.height * r)), Image.LANCZOS)
    out = os.path.join(OUT, spec["file"])
    crop.save(out, optimize=True)
    print(f"{spec['file']:32s} {crop.width}x{crop.height} {os.path.getsize(out)//1024:4d} KB  ← "
          f"{spec['patent']} p.{spec['page']} {spec['tag']}")
    return crop.size


if __name__ == "__main__":
    specs = json.load(open(SPEC, encoding="utf-8"))
    want = set(sys.argv[1:])
    for s in specs:
        if want and not (s.get("story") in want or s["file"] in want):
            continue
        build(s)
