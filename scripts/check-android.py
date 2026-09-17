"""בדיקות על מה שהבנייה ייצרה. רצות בענן אחרי gradle, ואפשר להריץ אותן גם על בנייה שהורדה.

מה נבדק בגרסה שמיועדת לפרסום:
1. ההרשאות הן בדיוק מה שציפינו, ובלי מזהה פרסומי (AD_ID). גוגל דורשת הצהרה עליו,
   ובמשחק לילדים הוא אסור.
2. כלי הדיבאג כבויים.
3. הרכיב היחיד שחשוף למערכת הוא מסך הפתיחה של המשחק.
4. המסך נעול לאורך.
5. אין בחבילה ספריות בקוד מקומי (קובצי so). זו דרישת ה-16KB של גוגל.

    python scripts/check-android.py [--root android]
"""
import argparse
import re
import sys
import zipfile
from pathlib import Path

ALLOWED_PERMISSIONS = {'android.permission.INTERNET'}
NS = '{http://schemas.android.com/apk/res/android}'


def find_one(root: Path, pattern: str, what: str, problems: list):
    hits = sorted(root.glob(pattern))
    if not hits:
        problems.append(f'could not find {what} ({pattern})')
        return None
    return hits[-1]


def check_manifest(path: Path, problems: list) -> None:
    import xml.etree.ElementTree as ET
    root = ET.parse(path).getroot()

    permissions = {e.get(f'{NS}name') for e in root.findall('uses-permission')}
    for extra in sorted(permissions - ALLOWED_PERMISSIONS):
        problems.append(f'unexpected permission: {extra}')
    if any('AD_ID' in (p or '') for p in permissions):
        problems.append('the advertising id permission is in the manifest')

    app = root.find('application')
    if app is None:
        problems.append('the manifest has no application element')
        return
    if app.get(f'{NS}debuggable') == 'true':
        problems.append('the release build is debuggable')

    exported = []
    for kind in ('activity', 'service', 'receiver', 'provider', 'activity-alias'):
        for element in app.findall(kind):
            if element.get(f'{NS}exported') == 'true':
                exported.append(f"{kind} {element.get(f'{NS}name')}")
    if exported != ['activity .MainActivity']:
        problems.append(f'exported components are {exported}, expected only the launcher activity')

    main = app.find('activity')
    if main is not None and main.get(f'{NS}screenOrientation') != 'portrait':
        problems.append('the activity is not locked to portrait')


def check_bundle(path: Path, problems: list) -> None:
    with zipfile.ZipFile(path) as z:
        native = [n for n in z.namelist() if n.endswith('.so')]
    if native:
        problems.append(f'the bundle contains native libraries: {native[:5]}')


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default='android')
    args = ap.parse_args()
    root = Path(args.root)
    problems = []

    manifest = find_one(root, 'app/build/intermediates/merged_manifests/release/**/AndroidManifest.xml',
                        'the merged release manifest', problems)
    if manifest:
        print(f'manifest: {manifest}')
        check_manifest(manifest, problems)

    bundle = find_one(root, 'app/build/outputs/bundle/release/*.aab', 'the release bundle', problems)
    if bundle:
        print(f'bundle: {bundle} ({bundle.stat().st_size} bytes)')
        check_bundle(bundle, problems)

    for apk in sorted(root.glob('app/build/outputs/apk/**/*.apk')):
        print(f'apk: {apk} ({apk.stat().st_size} bytes)')

    print('\n'.join(problems) if problems else 'android checks passed')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
