"""מייצר את אייקון האפליקציה ואת אייקון מסך הפתיחה לאנדרואיד, מתוך icons/icon-512-maskable.png.

למה לא כלי מוכן: הכלי הרשמי של Capacitor דורש npm במחשב, ואצלנו npm רץ רק בענן (החלטת אבטחה).

מה נוצר:
  mipmap-<dpi>/ic_launcher.png            אייקון מרובע, למכשירים ישנים
  mipmap-<dpi>/ic_launcher_round.png      אותו אייקון בעיגול
  mipmap-<dpi>/ic_launcher_foreground.png השכבה הקדמית של האייקון האדפטיבי
  values/ic_launcher_background.xml       צבע הרקע, נדגם מהאייקון עצמו

באייקון אדפטיבי אנדרואיד חותך את הקצוות: מתוך ריבוע של 108 יחידות נשארות 72 בלבד.
האייקון שלנו בנוי לפי תקן maskable, שבו התוכן החשוב יושב במעגל הפנימי של 80%.
לכן מקטינים אותו כך שהמעגל הזה ייכנס בדיוק לאזור שנשאר גלוי, ושום דבר לא נחתך.

    python scripts/make-android-icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'icons' / 'icon-512-maskable.png'
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'

LEGACY = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
FOREGROUND = {'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432}
SAFE = 0.8          # המעגל הבטוח בתקן maskable
VISIBLE = 72 / 108  # מה שנשאר גלוי באייקון אדפטיבי


def rounded(image: Image.Image) -> Image.Image:
    mask = Image.new('L', image.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, image.width - 1, image.height - 1), fill=255)
    out = Image.new('RGBA', image.size, (0, 0, 0, 0))
    out.paste(image, (0, 0), mask)
    return out


def main() -> None:
    source = Image.open(SOURCE).convert('RGBA')
    background = source.getpixel((4, 4))            # צבע הרקע של האייקון עצמו
    written = []

    for dpi, size in LEGACY.items():
        icon = source.resize((size, size), Image.LANCZOS)
        for name, image in (('ic_launcher.png', icon), ('ic_launcher_round.png', rounded(icon))):
            path = RES / f'mipmap-{dpi}' / name
            image.save(path)
            written.append(path)

    for dpi, canvas_size in FOREGROUND.items():
        content = round(canvas_size * VISIBLE / SAFE)      # התוכן מוקטן כדי שלא ייחתך
        layer = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
        layer.paste(source.resize((content, content), Image.LANCZOS),
                    ((canvas_size - content) // 2, (canvas_size - content) // 2))
        path = RES / f'mipmap-{dpi}' / 'ic_launcher_foreground.png'
        layer.save(path)
        written.append(path)

    colour = '#%02X%02X%02X' % background[:3]
    (RES / 'values' / 'ic_launcher_background.xml').write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<resources>\n'
        f'    <color name="ic_launcher_background">{colour}</color>\n'
        '</resources>\n', encoding='utf-8')

    print(f'wrote {len(written)} images, icon background {colour}')


if __name__ == '__main__':
    main()
