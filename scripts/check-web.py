"""בדיקות על קובצי האתר, שרצות גם בענן לפני כל בנייה של האפליקציה.

מה נבדק:
1. אין קוד שכתוב בתוך תגיות: לא סקריפט בתוך הדף, ולא מאפייני onclick וחבריהם.
   מדיניות האבטחה של הדף (CSP) חוסמת אותם, וכפתור כזה פשוט לא היה עובד.
2. כל קובץ שהאתר טוען נמצא ברשימת השמירה של ה-service worker.
3. דף הפרטיות באתר (privacy.html) זהה למסך הפרטיות שבתוך האפליקציה.
4. תוכן האפליקציה (www) זהה לקובצי האתר.

    python scripts/check-web.py            # על תיקיית הפרויקט
    python scripts/check-web.py --www      # גם על www, אחרי scripts/build-www.sh
"""
import argparse
import hashlib
import importlib.util
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INLINE_HANDLER = re.compile(r'\son[a-z]+\s*=\s*["\']', re.I)
SCRIPT_TAG = re.compile(r'<script\b([^>]*)>(.*?)</script>', re.I | re.S)


def check_page(html: str, where: str) -> list:
    bad = []
    for attrs, body in SCRIPT_TAG.findall(html):
        if body.strip():
            bad.append(f'{where}: a script with code inside the page (the CSP blocks it)')
        if 'src=' not in attrs.lower():
            bad.append(f'{where}: a script tag without src')
    for match in INLINE_HANDLER.finditer(html):
        bad.append(f'{where}: an inline handler {match.group(0).strip()} (the CSP blocks it)')
    return bad


def precached(sw: str) -> list:
    block = re.search(r'const PRECACHE = \[(.*?)\];', sw, re.S)
    if not block:
        return []
    return re.findall(r"'\./([^']*)'", block.group(1))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--www', action='store_true', help='בודק גם את תוכן האפליקציה')
    args = ap.parse_args()

    bad = []
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    bad += check_page(html, 'index.html')

    # כל קובץ שהדף טוען חייב להיות ברשימת השמירה
    listed = set(precached((ROOT / 'sw.js').read_text(encoding='utf-8')))
    if len(listed) < 10:
        bad.append('could not read the precache list from sw.js')
    for ref in set(re.findall(r'(?:src|href)="((?!https?:|data:|#)[^"]+)"', html)):
        if ref in ('manifest.json',) or ref in listed or ref.lstrip('./') in listed:
            continue
        bad.append(f'index.html loads {ref}, which the service worker does not precache')

    # דף הפרטיות באתר חייב להיות זהה למסך הפרטיות שבתוך האפליקציה
    spec = importlib.util.spec_from_file_location('make_privacy', ROOT / 'scripts' / 'make-privacy.py')
    make_privacy = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(make_privacy)
    page = (ROOT / 'privacy.html').read_text(encoding='utf-8') if (ROOT / 'privacy.html').exists() else ''
    if page != make_privacy.render():
        bad.append('privacy.html does not match the in-app privacy screen. Run scripts/make-privacy.py')
    bad += check_page(page, 'privacy.html')

    if args.www:
        www = ROOT / 'www'
        if not www.is_dir():
            bad.append('www does not exist. Run scripts/build-www.sh')
        else:
            bad += check_page((www / 'index.html').read_text(encoding='utf-8'), 'www/index.html')
            for path in sorted(p for p in www.rglob('*') if p.is_file()):
                mirror = ROOT / path.relative_to(www)
                if not mirror.is_file():
                    bad.append(f'www/{path.relative_to(www)} has no matching file in the site')
                elif hashlib.sha256(path.read_bytes()).digest() != hashlib.sha256(mirror.read_bytes()).digest():
                    bad.append(f'www/{path.relative_to(www)} differs from the site file')

    print('\n'.join(bad) if bad else 'web checks passed')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
