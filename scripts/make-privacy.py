"""בונה את privacy.html מתוך מסך הפרטיות שבתוך האפליקציה.

מדיניות הפרטיות חייבת להופיע גם בתוך האפליקציה וגם בכתובת ציבורית (לדף החנות). כדי ששתי הגרסאות
לא ייפרדו אף פעם, יש מקור אחד בלבד: המסך שב-<template id="app-parts"> שב-index.html.
הסקריפט מעתיק ממנו את שורת הפרטים ואת הסעיפים כמו שהם, ועוטף אותם בדף עצמאי.

    python scripts/make-privacy.py            # כותב את privacy.html
    python scripts/make-privacy.py --check    # נכשל אם privacy.html לא תואם למסך שבאפליקציה

הדף משתמש רק במחלקות שכבר קיימות ב-css/app.css, ולכן אין צורך לבנות את העיצוב מחדש.
לפי ההחלטה במדריך, הדף לא מקשר למשחק.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / 'privacy.html'

SHELL = """<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8"/>
  <meta content="width=device-width, initial-scale=1.0, viewport-fit=cover" name="viewport"/>
  <!-- נוצר אוטומטית מ-index.html על ידי scripts/make-privacy.py. לא לערוך ביד: משנים את המסך שבאפליקציה -->
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"/>
  <meta name="color-scheme" content="dark"/>
  <title>מדיניות פרטיות - Thinking Stars</title>
  <meta name="description" content="מדיניות הפרטיות של המשחק Thinking Stars"/>
  <link rel="icon" href="favicon.ico" sizes="any"/>
  <link rel="stylesheet" href="fonts/fonts.css"/>
  <link rel="stylesheet" href="css/app.css"/>
</head>
<body class="bg-[#02040a] font-body-md text-on-surface min-h-screen antialiased">
  <main class="w-full max-w-md mx-auto p-6 flex flex-col gap-2 text-right">
    <h1 class="text-2xl font-black text-primary text-center mb-1">מדיניות פרטיות</h1>
{body}
  </main>
</body>
</html>
"""


def extract(index_html: str) -> str:
    """שורת הפרטים וחמשת הסעיפים, מתוך מסך הפרטיות שבתבנית של האפליקציה."""
    tpl = re.search(r'<template id="app-parts">(.*?)</template>', index_html, re.S)
    if not tpl:
        raise SystemExit('the app-parts template was not found in index.html')
    # מסך הפרטיות הוא החלק האחרון בתבנית, ולכן לוקחים ממנו ועד סופה
    screen = re.search(r'<div id="setup-view-step7".*', tpl.group(1), re.S)
    if not screen:
        raise SystemExit('the privacy screen (setup-view-step7) was not found')
    body = screen.group(0)
    meta = re.search(r'\s*<p class="text-xs text-on-surface-variant font-bold">.*?</p>', body, re.S)
    articles = re.findall(r'\s*<article .*?</article>', body, re.S)
    if not meta or len(articles) < 5:
        raise SystemExit(f'expected the details line and 5 sections, found {bool(meta)} and {len(articles)}')
    # ההזחה מהתבנית (10 רווחים) מתיישרת להזחה של הדף (4 רווחים)
    blocks = [meta.group(0)] + articles
    return '\n'.join(re.sub(r'^ {6}', '', b.strip('\n'), flags=re.M) for b in blocks)


def render() -> str:
    return SHELL.replace('{body}', extract((ROOT / 'index.html').read_text(encoding='utf-8')))


def missing_classes(html: str) -> list:
    """מחלקות שהדף משתמש בהן ואינן קיימות ב-css/app.css."""
    css = (ROOT / 'css' / 'app.css').read_text(encoding='utf-8')
    used = set()
    for attr in re.findall(r'class="([^"]+)"', html):
        used.update(attr.split())
    def escaped(c):
        return '.' + re.sub(r'([\[\]#/.:%()])', r'\\\1', c)
    return sorted(c for c in used if escaped(c) + '{' not in css and escaped(c) + ',' not in css
                  and escaped(c) + ':' not in css)


def main() -> int:
    page = render()
    absent = missing_classes(page)
    if absent:
        print(f'privacy.html uses classes that css/app.css does not have: {absent}')
        return 1
    if '--check' in sys.argv:
        current = PAGE.read_text(encoding='utf-8') if PAGE.exists() else ''
        if current != page:
            print('privacy.html does not match the privacy screen inside the app. Run scripts/make-privacy.py')
            return 1
        print('privacy.html matches the in-app privacy screen')
        return 0
    PAGE.write_text(page, encoding='utf-8', newline='\n')
    print(f'wrote {PAGE.name} ({len(page)} characters)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
