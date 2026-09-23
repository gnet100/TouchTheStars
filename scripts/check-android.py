"""בדיקות על מה שהבנייה ייצרה. רצות בענן אחרי gradle, ואפשר להריץ אותן גם על בנייה שהורדה.

מה נבדק בגרסה שמיועדת לפרסום:
1. ההרשאות הן בדיוק מה שציפינו, ובלי מזהה פרסומי (AD_ID). גוגל דורשת הצהרה עליו,
   ובמשחק לילדים הוא אסור.
2. כלי הדיבאג כבויים.
3. הרכיב היחיד שחשוף למערכת הוא מסך הפתיחה של המשחק.
4. המסך נעול לאורך.
5. יעד ה-API הוא מה שגוגל דורשת מאפליקציות חדשות.
6. אין בחבילה ספריות בקוד מקומי (קובצי so). זו דרישת ה-16KB של גוגל.
7. ‏R8 רץ על גרסת הפרסום, ובכל זאת כל מחלקות התוספים נשארו בשמן המקורי.
8. קובצי המשחק שבתוך כל APK זהים בית-בבית למה שנבנה.

    python scripts/check-android.py [--root android]
"""
import argparse
import json
import re
import sys
import zipfile
from pathlib import Path

APP_ID = 'io.github.gnet100.thinkingstars'

# יעד ה-API שגוגל דורשת מאפליקציות חדשות ומעדכונים (מאז 31.8.2026)
TARGET_SDK = 36

# מתחת לזה נניח ש-R8 לא באמת ערפל, למשל כי כלל שמירה רחב מדי שמר את הכל.
# בבנייה אמיתית מספר המחלקות ששמן הוחלף הוא אלפים
MIN_RENAMED_CLASSES = 200

# ההרשאות שאנחנו מצפים להן, ולמה כל אחת כאן. כל הרשאה אחרת מפילה את הבנייה
ALLOWED_PERMISSIONS = {
    'android.permission.INTERNET',                 # הרכישה מול גוגל
    'android.permission.ACCESS_NETWORK_STATE',     # ספריית החיוב בודקת חיבור
    'com.android.vending.BILLING',                 # ספריית החיוב
    # AndroidX מגדירה לעצמה הרשאת חתימה פנימית, ולא מבקשת שום דבר מהמשתמש
    f'{APP_ID}.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION',
}

# רכיבים שהמערכת יכולה לפנות אליהם. במניפסט המאוחד השמות מלאים
ALLOWED_EXPORTED = {
    f'activity {APP_ID}.MainActivity',                              # מסך המשחק, במניפסט המאוחד
    'activity .MainActivity',                                       # אותו מסך, כפי שהוא כתוב במקור
    'receiver androidx.profileinstaller.ProfileInstallReceiver',    # מוגן בהרשאת DUMP של המערכת
}

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

    exported = set()
    for kind in ('activity', 'service', 'receiver', 'provider', 'activity-alias'):
        for element in app.findall(kind):
            if element.get(f'{NS}exported') == 'true':
                exported.add(f"{kind} {element.get(f'{NS}name')}")
    for extra in sorted(exported - ALLOWED_EXPORTED):
        problems.append(f'unexpected exported component: {extra}')

    ours = [a for a in app.findall('activity') if (a.get(f'{NS}name') or '').endswith('MainActivity')]
    if len(ours) != 1:
        problems.append(f'expected exactly one MainActivity, found {len(ours)}')
    elif ours[0].get(f'{NS}screenOrientation') != 'portrait':
        problems.append('the game activity is not locked to portrait')

    sdk = root.find('uses-sdk')
    target = sdk.get(f'{NS}targetSdkVersion') if sdk is not None else None
    if target != str(TARGET_SDK):
        problems.append(f'the target api is {target}, and google expects {TARGET_SDK}')


def check_bundle(path: Path, problems: list) -> None:
    with zipfile.ZipFile(path) as z:
        native = [n for n in z.namelist() if n.endswith('.so')]
    if native:
        problems.append(f'the bundle contains native libraries: {native[:5]}')


def check_app_content(apk: Path, www: Path, problems: list) -> None:
    """מה שבאמת נמצא בתוך האפליקציה הוא בדיוק הקבצים שלנו, בית בבית."""
    if not www.is_dir():
        problems.append('www does not exist, so the content inside the app cannot be compared')
        return
    with zipfile.ZipFile(apk) as z:
        inside = set(z.namelist())
        checked = 0
        for local in sorted(p for p in www.rglob('*') if p.is_file()):
            entry = 'assets/public/' + local.relative_to(www).as_posix()
            if entry not in inside:
                problems.append(f'{entry} is missing from the app')
                continue
            if z.read(entry) != local.read_bytes():
                problems.append(f'{entry} inside the app differs from the file we built')
            checked += 1
    print(f'app content: {checked} files compared against www')


def plugin_classes(apk: Path, problems: list) -> list:
    """המחלקות שהאפליקציה טוענת לפי שם, מתוך הרשימה ש-Capacitor מייצר.

    היא נקראת מתוך ה-APK ולא מהמאגר, ולכן הבדיקה מתעדכנת מעצמה כשמתווסף תוסף.
    """
    with zipfile.ZipFile(apk) as z:
        try:
            listed = json.loads(z.read('assets/capacitor.plugins.json'))
        except KeyError:
            problems.append('assets/capacitor.plugins.json is missing from the app')
            return []
    names = sorted({entry['classpath'] for entry in listed if entry.get('classpath')})
    if not names:
        problems.append('capacitor.plugins.json lists no plugin classes')
    return names


def check_shrinking(root: Path, apk: Path, bundle: Path, problems: list) -> None:
    """‏R8 באמת רץ, ובכל זאת כל מה שנטען לפי שם שרד בשמו המקורי.

    ‏Capacitor מוצא את התוספים דרך Class.forName, ולכן מחלקה ששמה הוחלף או שנמחקה
    שוברת את הרכישה בלי שהמשחק עצמו ייראה שבור.
    """
    mapping = root / 'app/build/outputs/mapping/release/mapping.txt'
    if not mapping.is_file():
        problems.append('R8 did not run on the release build: there is no mapping.txt')
        return

    kept, renamed = {}, 0
    for line in mapping.read_text(encoding='utf-8', errors='replace').splitlines():
        match = re.match(r'^(\S+) -> (\S+):$', line)
        if not match:
            continue
        original, new = match.groups()
        kept[original] = new
        if original != new:
            renamed += 1
    print(f'R8: {len(kept)} classes in the mapping, {renamed} of them renamed')
    if renamed < MIN_RENAMED_CLASSES:
        problems.append(f'only {renamed} classes were renamed, so R8 barely did anything')

    for name in [f'{APP_ID}.MainActivity'] + plugin_classes(apk, problems):
        if name not in kept:
            problems.append(f'{name} did not survive R8')
        elif kept[name] != name:
            problems.append(f'{name} was renamed to {kept[name]}, and Capacitor looks it up by name')

    if bundle is not None:
        with zipfile.ZipFile(bundle) as z:
            inside = [n for n in z.namelist() if n.endswith('proguard.map')]
        # בלי הקובץ הזה דוחות הקריסה בקונסולה יגיעו מעורפלים. לא מפיל את הבנייה
        print(f'the mapping inside the bundle: {inside[0] if inside else "MISSING"}')


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

    apks = sorted(root.glob('app/build/outputs/apk/**/*.apk'))
    for apk in apks:
        print(f'apk: {apk} ({apk.stat().st_size} bytes)')
        check_app_content(apk, Path('www'), problems)
    if not apks:
        problems.append('no apk was built')

    release_apk = next((a for a in apks if a.parent.name == 'release'), None)
    if release_apk is None:
        problems.append('no release apk was built, so R8 cannot be checked')
    else:
        check_shrinking(root, release_apk, bundle, problems)

    print('\n'.join(problems) if problems else 'android checks passed')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
