"""Split logo.png into its light/dark halves and cut the site's brand assets.

logo.png is the delivered artwork: one square sheet with the dark-background
lockup stacked above the light-background one, both floating in a lot of empty
canvas. This script keys the flat studio backdrop out to alpha, trims each half
to its artwork, and writes the pieces the app actually loads:

    frontend/public/brand/logo-{dark,light}.png   full lockup (emblem + wordmark)
    frontend/public/brand/mark-{dark,light}.png   emblem alone, square
    frontend/public/favicon.ico + favicon-*.png   tab icons, on the ink ground
    frontend/public/apple-touch-icon.png          iOS home screen
    frontend/public/icon-{192,512}.png            PWA install icons
    frontend/public/icon-maskable-512.png         PWA maskable (60% safe zone)
    frontend/public/og-image.png                  link preview card, 1200x630

Run from the repo root:  python assets/build-icons.py
Needs Pillow and NumPy; nothing in the app build depends on it.
"""

import os

import numpy as np
from PIL import Image, ImageDraw

SRC = 'assets/logo.png'
OUT = 'frontend/public'
BRAND = f'{OUT}/brand'

SPLIT = 650   # row where the dark half ends and the light half begins
INSET = 6     # ignore the sheet's own outer edge and the seam between halves
INK = (26, 26, 46, 255)  # --bg in the dark theme, #1a1a2e

# Keying thresholds per half: below `lo` is backdrop (the paper grain reads
# ~24 on the light half), above `hi` is solid ink. Between them is an edge.
VARIANTS = {
    'dark': {'lo': 16.0, 'hi': 46.0},
    'light': {'lo': 26.0, 'hi': 58.0},
}


def key_out(arr, lo, hi):
    """Turn the flat backdrop into alpha while keeping antialiased edges."""
    border = np.concatenate([arr[:, :40].reshape(-1, 3), arr[:, -40:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    dist = np.abs(arr - bg).max(axis=2)
    alpha = np.clip((dist - lo) / (hi - lo), 0.0, 1.0)
    alpha[alpha < 0.06] = 0.0
    # Un-premultiply, so an edge pixel keeps its ink colour rather than a
    # muddied blend of ink and backdrop.
    safe = np.where(alpha > 0, alpha, 1.0)[..., None]
    rgb = np.clip(bg + (arr - bg) / safe, 0, 255)
    rgb[alpha == 0] = 0  # clear pixels compress far better flattened
    return np.dstack([rgb, alpha * 255]).astype(np.uint8)


def art_box(alpha):
    ys, xs = np.where(alpha > 24)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def gap_row(rgba):
    """Middle of the blank band that separates the emblem from the wordmark."""
    rows = (rgba[..., 3] > 24).sum(axis=1)
    ys = np.where(rows > 0)[0]
    best, run = None, None
    for y in range(ys.min(), ys.max() + 1):
        if rows[y] == 0:
            run = y if run is None else run
        elif run is not None:
            if best is None or (y - run) > (best[1] - best[0]):
                best = (run, y)
            run = None
    return (best[0] + best[1]) // 2


def trim(rgba, pad_frac, square=False):
    x0, y0, x1, y1 = art_box(rgba[..., 3])
    pad = int(round(max(x1 - x0, y1 - y0) * pad_frac))
    if square:
        side = max(x1 - x0, y1 - y0) + 2 * pad
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        x0, y0 = int(round(cx - side / 2)), int(round(cy - side / 2))
        x1, y1 = x0 + side, y0 + side
    else:
        x0, y0, x1, y1 = x0 - pad, y0 - pad, x1 + pad, y1 + pad
    canvas = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    sx0, sy0 = max(x0, 0), max(y0, 0)
    sx1, sy1 = min(x1, rgba.shape[1]), min(y1, rgba.shape[0])
    canvas[sy0 - y0:sy1 - y0, sx0 - x0:sx1 - x0] = rgba[sy0:sy1, sx0:sx1]
    return Image.fromarray(canvas, 'RGBA')


def save(img, path):
    """256 colours is indistinguishable here and roughly a fifth of the bytes."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.convert('RGBA').quantize(colors=256, method=Image.FASTOCTREE).save(path, optimize=True)


sheet = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float64)
halves = {
    'dark': sheet[INSET:SPLIT - INSET, INSET:-INSET],
    'light': sheet[SPLIT + INSET:-INSET, INSET:-INSET],
}

def pair(images):
    """Pad two variants onto one canvas so the light/dark swap is registered:
    the app cross-fades them in place, and a pixel of drift would show."""
    w = max(i.width for i in images.values())
    h = max(i.height for i in images.values())
    out = {}
    for name, img in images.items():
        canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        canvas.alpha_composite(img, ((w - img.width) // 2, (h - img.height) // 2))
        out[name] = canvas
    return out


keyed = {n: key_out(h, VARIANTS[n]['lo'], VARIANTS[n]['hi']) for n, h in halves.items()}
lockups = pair({n: trim(r, 0.045) for n, r in keyed.items()})
marks = pair({n: trim(r[:gap_row(r)].copy(), 0.05, square=True) for n, r in keyed.items()})

for name in keyed:
    save(lockups[name], f'{BRAND}/logo-{name}.png')
    save(marks[name], f'{BRAND}/mark-{name}.png')

MARK = marks['dark']
_ax0, _ay0, _ax1, _ay1 = art_box(np.array(MARK)[..., 3])


def brighten(img, factor):
    arr = np.array(img).astype(np.float32)
    arr[..., :3] = np.clip(arr[..., :3] * factor, 0, 255)
    return Image.fromarray(arr.astype(np.uint8), 'RGBA')


def ground(size, radius):
    g = Image.new('RGBA', (size, size), INK)
    if radius:
        m = Image.new('L', (size * 4, size * 4), 0)
        ImageDraw.Draw(m).rounded_rectangle(
            [0, 0, size * 4 - 1, size * 4 - 1], radius=int(size * 4 * radius), fill=255)
        g.putalpha(m.resize((size, size), Image.LANCZOS))
    return g


def icon(size, fill=0.80, radius=0.22, factor=1.0):
    """The gold emblem on the ink ground — the same icon on any tab bar."""
    base = ground(size, radius)
    w = int(size * fill)
    base.alpha_composite(brighten(MARK, factor).resize((w, w), Image.LANCZOS),
                         ((size - w) // 2, (size - w) // 2))
    return base


def tiny_icon(size):
    """At 16px the full emblem turns to mush, so the favicon drops to the open
    book — the one shape that survives, brightened to hold up on a pale tab."""
    top = int(_ay0 + (_ay1 - _ay0) * 0.50)
    crop = brighten(MARK.crop((_ax0, top, _ax1, _ay1)), 1.6)
    w = int(size * 0.92)
    h = int(crop.height * w / crop.width)
    base = ground(size, 0.22)
    base.alpha_composite(crop.resize((w, h), Image.LANCZOS), ((size - w) // 2, (size - h) // 2))
    return base


save(icon(512, 0.80, 0.22), f'{OUT}/icon-512.png')
save(icon(192, 0.80, 0.22), f'{OUT}/icon-192.png')
save(icon(512, 0.60, 0.00), f'{OUT}/icon-maskable-512.png')  # 40% safe-zone margin
save(icon(180, 0.80, 0.00), f'{OUT}/apple-touch-icon.png')   # iOS applies its own mask
save(icon(32, 0.88, 0.22, 1.15), f'{OUT}/favicon-32.png')
tiny_icon(16).save(f'{OUT}/favicon-16.png', optimize=True)

icon(48, 0.88, 0.22, 1.15).convert('RGBA').save(
    f'{OUT}/favicon.ico', sizes=[(48, 48), (32, 32), (16, 16)],
    append_images=[icon(32, 0.88, 0.22, 1.15).convert('RGBA'), tiny_icon(16).convert('RGBA')])


# Link preview card: the full lockup on the ink ground, at the 1.91:1 every
# social scraper crops to.
card = Image.new('RGBA', (1200, 630), INK)
lock = lockups['dark']
lw = 430
card.alpha_composite(lock.resize((lw, round(lock.height * lw / lock.width)), Image.LANCZOS),
                     ((1200 - lw) // 2, (630 - round(lock.height * lw / lock.width)) // 2))
save(card, f'{OUT}/og-image.png')

print('brand assets written to', OUT)
