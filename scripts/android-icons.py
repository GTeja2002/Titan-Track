"""Generates the Android launcher icons and splash screens from the PWA icon
(public/icons/maskable-512.png), so the app, the PWA and the APK share one
mark. Re-run after changing the icon:  python scripts/android-icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'public' / 'icons' / 'maskable-512.png'
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'

LAUNCHER = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
FOREGROUND = {'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432}

src = Image.open(SRC).convert('RGBA')
bg = src.getpixel((4, 4))
bg_hex = '#{:02X}{:02X}{:02X}'.format(*bg[:3])


def glyph_only(img):
    """The white mark on a transparent background (for the adaptive icon foreground)."""
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    px, opx = img.load(), out.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            # distance from the background colour -> alpha, keeps anti-aliased edges
            d = max(abs(r - bg[0]), abs(g - bg[1]), abs(b - bg[2]))
            alpha = min(255, int(d * 255 / max(1, 255 - min(bg[:3]))))
            if alpha > 8:
                opx[x, y] = (255, 255, 255, alpha)
    return out


glyph = glyph_only(src)

for density, size in LAUNCHER.items():
    folder = RES / f'mipmap-{density}'
    folder.mkdir(parents=True, exist_ok=True)
    square = src.resize((size, size), Image.LANCZOS)
    square.save(folder / 'ic_launcher.png')
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    rnd = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    rnd.paste(square, (0, 0), mask)
    rnd.save(folder / 'ic_launcher_round.png')

for density, size in FOREGROUND.items():
    # The maskable icon already keeps the mark inside the safe zone.
    glyph.resize((size, size), Image.LANCZOS).save(RES / f'mipmap-{density}' / 'ic_launcher_foreground.png')

(RES / 'values' / 'ic_launcher_background.xml').write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
    f'    <color name="ic_launcher_background">{bg_hex}</color>\n</resources>\n', encoding='utf-8')

# Splash screens: brand green with the mark centred, at each existing size.
for splash in RES.glob('drawable*/splash.png'):
    w, h = Image.open(splash).size
    canvas = Image.new('RGBA', (w, h), bg)
    mark = int(min(w, h) * 0.45)
    g = src.resize((mark, mark), Image.LANCZOS)
    canvas.paste(g, ((w - mark) // 2, (h - mark) // 2), g)
    canvas.convert('RGB').save(splash)

print('icons + splash generated, background', bg_hex)
