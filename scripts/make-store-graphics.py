"""מייצר את התמונות לדף החנות בגוגל פליי, מתוך המשחק עצמו, אל store/graphics.

מה נוצר:
  icon-512.png        אייקון 512x512. ריבוע מלא ואטום, כי גוגל מעגלת את הפינות בעצמה
  feature-1024x500.png  הבאנר, בלי שקיפות
  screenshot-1..5.png צילומי מסך 1080x1920 (מסך של 360x640 בצפיפות 3)

הצילומים מצולמים במצב אפליקציה, עם הדמיה קטנה של Capacitor: כך רואים בדיוק את מה שיש בטלפון,
כולל הקישור לפרטיות והמנעול על מה שנפתח ברכישה. ההדמיה לא מבצעת שום רכישה.

דרישות: Python עם playwright (Chromium) ו-Pillow.

    python scripts/make-store-graphics.py                 # הכול
    python scripts/make-store-graphics.py icon feature    # רק חלק
"""
import functools
import io
import http.server
import random
import sys
import threading
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'store' / 'graphics'
BACKGROUND = (13, 17, 29)          # צבע הרקע של האייקון ושל מסך הפתיחה באנדרואיד (#0D111D)

# גוגל פליי מדומה, רק מה ששכבת האפליקציה (js/app.js) קוראת בזמן שהמסכים מוצגים
MOCK_JS = r"""
(() => {
  const ok = (v) => Promise.resolve(v);
  window.Capacitor = {
    isNativePlatform: () => true,
    getPlatform: () => 'android',
    Plugins: {
      App: { addListener: () => ok({ remove() {} }), toggleBackButtonHandler: () => ok(), minimizeApp: () => ok() },
      NativePurchases: {
        isBillingSupported: () => ok({ isBillingSupported: true }),
        getProducts: () => ok({ products: [{ identifier: 'full_unlock', priceString: '‏4.90 ₪' }] }),
        getPurchases: () => ok({ purchases: [] }),
      },
    },
  };
})();
"""


def make_icon():
    """האייקון של האתר (icons/icon-512.png) על ריבוע מלא, באותו צבע רקע."""
    star = Image.open(ROOT / 'icons' / 'icon-512.png').convert('RGBA')
    icon = Image.new('RGBA', star.size, BACKGROUND + (255,))
    icon.alpha_composite(star)
    path = OUT / 'icon-512.png'
    icon.save(path, optimize=True)
    return [path]


def feature_html():
    rnd = random.Random(7)          # אותם כוכבי רקע בכל הרצה
    dots = ''.join(
        f'<i style="left:{rnd.uniform(0, 1024):.0f}px;top:{rnd.uniform(0, 500):.0f}px;'
        f'width:{s}px;height:{s}px;opacity:{rnd.uniform(.25, .8):.2f}"></i>'
        for s in (rnd.choice((1, 1, 2, 2, 3)) for _ in range(110)))
    rows = ''.join('<div class="row">' + '<span class="star"><b>star</b></span>' * n + '</div>' for n in (1, 2, 3))
    return f"""<!DOCTYPE html>
<html dir="rtl" lang="he"><head><meta charset="utf-8">
<link rel="stylesheet" href="../fonts/fonts.css">
<style>
  html, body {{ margin: 0; width: 1024px; height: 500px; overflow: hidden; }}
  body {{ position: relative; background: radial-gradient(ellipse at 50% 45%, #16213a 0%, #0b1020 55%, #02040a 100%); }}
  i {{ position: absolute; border-radius: 50%; background: #fff; }}
  .pic {{ position: absolute; top: 140px; width: 220px; height: 220px; border-radius: 50%;
          box-shadow: 0 0 34px rgba(76, 215, 246, .55); }}
  .center {{ position: absolute; left: 262px; width: 500px; top: 64px; text-align: center; }}
  h1 {{ margin: 0; font: 700 58px/1 'Fredoka', sans-serif; color: #4cd7f6; letter-spacing: 1px; direction: ltr;
        text-shadow: 0 0 18px rgba(76, 215, 246, .65); white-space: nowrap; }}
  h1 b {{ font: 400 52px/1 'Material Symbols Outlined'; font-variation-settings: 'FILL' 1; color: #fcd34d;
          vertical-align: -4px; text-shadow: 0 0 16px rgba(252, 211, 77, .8); }}
  h2 {{ margin: 18px 0 0; font: 700 30px/1.2 'Rubik', sans-serif; color: #e2e8f0; }}
  .pyramid {{ margin-top: 30px; display: flex; flex-direction: column; align-items: center; gap: 10px; }}
  .row {{ display: flex; gap: 12px; padding: 7px 14px; border-radius: 14px; background: #171c2b;
          border: 1px solid rgba(255, 255, 255, .1); }}
  .star {{ width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
           background: rgba(255, 255, 255, .1); border: 1px solid rgba(255, 255, 255, .1); }}
  .star b {{ font: 400 28px/1 'Material Symbols Outlined'; font-variation-settings: 'FILL' 1; color: #4cd7f6; }}
</style></head>
<body>{dots}
  <img class="pic" style="right:34px" src="../images/two-players.png" alt="">
  <img class="pic" style="left:34px" src="../images/vs-computer.png" alt="">
  <div class="center">
    <h1>THINKING STARS <b>star</b></h1>
    <h2>משחק חשיבה לכל המשפחה</h2>
    <div class="pyramid">{rows}</div>
  </div>
</body></html>"""


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class Site:
    """שרת מקומי על תיקיית הפרויקט. הדף של הבאנר מוגש מהזיכרון, כדי שלא ייכתב לפרויקט."""

    def __init__(self):
        handler = functools.partial(_Quiet, directory=str(ROOT))
        self.httpd = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
        self.base = f'http://127.0.0.1:{self.httpd.server_address[1]}/'
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()

    def close(self):
        self.httpd.shutdown()
        self.httpd.server_close()


def ready(page):
    page.evaluate('document.fonts.ready.then(() => true)')
    page.wait_for_timeout(400)


def make_feature(browser, site):
    page = browser.new_page(viewport={'width': 1024, 'height': 500}, device_scale_factor=1)
    page.route('**/store/feature.html', lambda route: route.fulfill(
        status=200, content_type='text/html; charset=utf-8', body=feature_html()))
    page.goto(site.base + 'store/feature.html', wait_until='networkidle')
    ready(page)
    png = page.screenshot()
    page.close()
    path = OUT / 'feature-1024x500.png'
    Image.open(io.BytesIO(png)).convert('RGB').save(path, optimize=True)      # בלי ערוץ שקיפות
    return [path]


def make_screenshots(browser, site):
    ctx = browser.new_context(viewport={'width': 360, 'height': 640}, device_scale_factor=3,
                              locale='he-IL', has_touch=False)
    ctx.add_init_script(MOCK_JS)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: m.type == 'error' and errors.append(m.text))
    page.goto(site.base + 'index.html', wait_until='networkidle')
    page.locator('#setup-view-step1').wait_for(state='visible')
    ready(page)
    if not page.locator('#privacy-link').is_visible():
        raise SystemExit('app mode did not start: the privacy link is missing')

    shots = {}
    def shot(name):
        page.mouse.move(0, 0)
        ready(page)
        shots[name] = page.screenshot(animations='disabled')

    click = lambda sel: page.locator(sel).first.click()

    def idle():
        # אחרי "שחק" יש אנימציה, ובזמנה המשחק מתעלם מלחיצות. wait_for_function לא עובד כאן,
        # כי מדיניות האבטחה של הדף חוסמת הרצה של קוד מטקסט
        for _ in range(100):
            page.wait_for_timeout(100)
            if not page.evaluate('gameState.busy'):
                page.wait_for_timeout(300)
                return
        raise SystemExit('the game stayed busy after a move')
    shot('home')

    click('#setup-view-step1 button:has-text("שחקן מול מחשב")')
    shot('difficulty')
    click('#setup-view-step2 button:has-text("חזור")')

    click('#setup-view-step1 button:has-text("הוראות")')
    shot('instructions')
    click('#setup-view-step5 button:has-text("חזור") >> nth=0')

    # משחק של שני שחקנים, 5 שורות: כמה מהלכים, ובחירה פתוחה כדי שיראו איך מסמנים כוכביות
    click('#setup-view-step1 button:has-text("שני שחקנים")')
    click('#starter-btn-1')
    click('#setup-view-step3 button:has-text("המשך")')
    click('#row-btn-5')
    click('#setup-view-step4 button:has-text("התחל משחק")')
    page.locator('#star-btn-4-0').wait_for(state='visible')
    for stars in (('4-3', '4-4'), ('2-2',), ('3-0', '3-1', '3-2')):
        for s in stars:
            click(f'#star-btn-{s}')
        click('#commit-btn')
        idle()
    click('#star-btn-1-0')
    click('#star-btn-1-1')
    if page.evaluate('gameState.selectedIndices.length') != 2:
        raise SystemExit('the two stars for the game screenshot were not selected')
    shot('game')

    # עד הסוף: בכל תור לוקחים כוכבית אחת
    click('#star-btn-1-1')                       # מבטלים את הבחירה הפתוחה
    for _ in range(40):
        if page.evaluate('gameState.isGameOverHandled'):
            break
        page.locator('#board-container button[id^="star-btn-"]').first.click()
        click('#commit-btn')
        idle()
    page.locator('#victory-modal').wait_for(state='visible', timeout=10000)
    page.wait_for_timeout(1500)
    shot('victory')
    ctx.close()
    if errors:
        raise SystemExit(f'errors in the page: {errors}')

    written = []
    for n, name in enumerate(('game', 'home', 'difficulty', 'victory', 'instructions'), 1):
        path = OUT / f'screenshot-{n}-{name}.png'
        Image.open(io.BytesIO(shots[name])).convert('RGB').save(path, optimize=True)
        written.append(path)
    return written


def main():
    wanted = set(sys.argv[1:]) or {'icon', 'feature', 'screenshots'}
    unknown = wanted - {'icon', 'feature', 'screenshots'}
    if unknown:
        raise SystemExit(f'unknown parts: {sorted(unknown)}')
    OUT.mkdir(parents=True, exist_ok=True)
    written = make_icon() if 'icon' in wanted else []
    if wanted & {'feature', 'screenshots'}:
        from playwright.sync_api import sync_playwright
        site = Site()
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch()
                if 'feature' in wanted:
                    written += make_feature(browser, site)
                if 'screenshots' in wanted:
                    written += make_screenshots(browser, site)
                browser.close()
        finally:
            site.close()
    for path in written:
        im = Image.open(path)
        print(f'{path.relative_to(ROOT).as_posix()}: {im.size[0]}x{im.size[1]} {im.mode}, '
              f'{path.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
