#!/usr/bin/env python3
"""Fetch a patent's Google Patents page and its original PDF, then render the
drawing pages at 300 dpi so a figure can be cropped for the site.

    python3 tools/patent_fetch.py US5726435A [US7931449B2 ...]

Writes, under /workspace/patent_src/<number>/:
    page.html    the Google Patents page (bibliographic data, drawing image URLs)
    info.json    title / inventors / assignees / filed & granted dates / drawing URLs
    <number>.pdf the original document from patentimages.storage.googleapis.com
    page-N.png   every page rendered at 300 dpi, grayscale
"""
import json, os, re, sys, urllib.request

SRC = "/workspace/patent_src"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"}


def get(url, timeout=120):
    req = urllib.request.Request(url, headers=UA)
    return urllib.request.urlopen(req, timeout=timeout).read()


def meta(html, name, scheme=None):
    out = []
    for m in re.finditer(r'<meta name="' + re.escape(name) + r'" content="([^"]*)"'
                         r'(?:\s+scheme="([^"]*)")?', html):
        if scheme is None or m.group(2) == scheme:
            out.append(m.group(1))
    return out


def fetch(number):
    d = os.path.join(SRC, number)
    os.makedirs(d, exist_ok=True)
    html = get(f"https://patents.google.com/patent/{number}/en").decode("utf-8", "replace")
    open(os.path.join(d, "page.html"), "w", encoding="utf-8").write(html)

    title_m = re.search(r'<meta name="DC.title" content="([^"]*)"', html)
    title = title_m.group(1) if title_m else ""
    info = {
        "number": number,
        "title": title,
        "inventors": meta(html, "DC.contributor", "inventor"),
        "assignees": meta(html, "DC.contributor", "assignee"),
        "filed": meta(html, "DC.date", "dateSubmitted"),
        "granted": meta(html, "DC.date", "issue"),
        "priority": meta(html, "DC.date", "priority"),
        "pdfs": sorted(set(re.findall(r'https://patentimages[^"\']+\.pdf', html))),
        "drawings": [],
    }
    # drawing pages, as the page's own image viewer lists them
    for m in re.finditer(r'"https://patentimages[^"]+/([A-Za-z0-9._-]+?)-drawings-page-(\d+)\.(png|jpg)"', html):
        info["drawings"].append({"page": int(m.group(2)), "url": m.group(0)[1:-1]})
    info["drawings"].sort(key=lambda x: x["page"])
    json.dump(info, open(os.path.join(d, "info.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(number, "|", title, "|", info["filed"], "->", info["granted"], "|", len(info["drawings"]), "drawing pages")
    return d, info


def render(d, number, info):
    import pymupdf
    pdf = info["pdfs"][0] if info["pdfs"] else None
    if not pdf:
        print("  no PDF link found")
        return
    path = os.path.join(d, os.path.basename(pdf))
    if not os.path.exists(path):
        open(path, "wb").write(get(pdf))
    doc = pymupdf.open(path)
    print(f"  pdf pages: {len(doc)}  ({os.path.getsize(path)//1024} KB)")
    for i, page in enumerate(doc, 1):
        out = os.path.join(d, f"page-{i}.png")
        if os.path.exists(out):
            continue
        pix = page.get_pixmap(dpi=300, colorspace=pymupdf.csGRAY)
        pix.save(out)
    return path


if __name__ == "__main__":
    for number in sys.argv[1:]:
        d, info = fetch(number)
        render(d, number, info)
