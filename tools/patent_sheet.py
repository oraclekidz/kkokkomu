#!/usr/bin/env python3
"""Contact sheet of every rendered page of a patent, so a figure can be chosen."""
import glob, os, sys
from PIL import Image, ImageDraw

SRC = "/workspace/patent_src"
OUT = "/workspace/tmp-patents"


def sheet(number, cols=6, thumb=260, out=None):
    pages = sorted(glob.glob(os.path.join(SRC, number, "page-*.png")),
                   key=lambda p: int(p.rsplit("-", 1)[1].split(".")[0]))
    if not pages:
        print("no pages for", number); return
    rows = (len(pages) + cols - 1) // cols
    ims = []
    for p in pages:
        im = Image.open(p)
        r = thumb / im.width
        ims.append((p, im.resize((thumb, int(im.height * r)))))
    cellh = max(i.height for _, i in ims) + 18
    canvas = Image.new("L", (cols * thumb, rows * cellh), 255)
    d = ImageDraw.Draw(canvas)
    for k, (p, im) in enumerate(ims):
        x, y = (k % cols) * thumb, (k // cols) * cellh
        canvas.paste(im, (x, y + 18))
        d.text((x + 4, y + 3), os.path.basename(p).replace("page-", "p").replace(".png", ""), fill=0)
        d.rectangle([x, y, x + thumb - 1, y + cellh - 1], outline=160)
    out = out or os.path.join(OUT, f"sheet-{number}.png")
    canvas.save(out)
    print(out, canvas.size)


if __name__ == "__main__":
    for n in sys.argv[1:]:
        sheet(n)
