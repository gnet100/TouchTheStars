"""יוצר את מפתח ההעלאה לגוגל פליי, ושומר אותו כסוד בגיטהאב. הבעלים מריץ אותו פעם אחת.

מה הוא עושה:
1. בודק שאין כבר מפתח או סודות. הוא לעולם לא דורס מפתח קיים, כי ייתכן שגוגל כבר מכירה אותו.
2. יוצר סיסמה אקראית חזקה, ומפתח RSA 4096 עם תעודה ל-30 שנה, בקובץ PKCS12 עם הכינוי 'upload'.
   הכלי הוא OpenSSL שמגיע עם Git, כך שלא צריך להתקין כלום.
3. שומר ב-C:\\Users\\<שם>\\Keys\\ThinkingStars: את המפתח, את הסיסמה (בקובץ, כדי להעביר אותה למנהל הסיסמאות),
   ואת התעודה הציבורית. מחוץ לכל מאגר.
4. מעלה את המפתח והסיסמה לסודות של הסביבה 'release' בגיטהאב, דרך gh. הם עוברים בקלט, לא בשורת הפקודה.
5. מדפיס רק את טביעת האצבע של התעודה, שהיא ציבורית. **המפתח והסיסמה לא מודפסים אף פעם.**

    python scripts/make-upload-key.py              # יוצר את המפתח האמיתי ומעלה אותו
    python scripts/make-upload-key.py --dry-run    # ניסיון: מפתח זמני בתיקייה זמנית, בלי גיטהאב, ונמחק בסוף

אחרי ההרצה: להעתיק את upload-key.p12 לדיסק און קי, להעביר את הסיסמה למנהל הסיסמאות,
ולמחוק את upload-key-password.txt.
"""
import argparse
import base64
import os
import secrets
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO = 'gnet100/TouchTheStars'
ENVIRONMENT = 'release'
SECRET_KEYSTORE = 'ANDROID_UPLOAD_KEYSTORE_B64'
SECRET_PASSWORD = 'ANDROID_UPLOAD_KEY_PASSWORD'
ALIAS = 'upload'
DAYS = 30 * 365                                  # גוגל דורשת תוקף עד אחרי 22.10.2033
SUBJECT = '/CN=Net100 Apps/O=Net100 Apps/C=IL'
KEY_DIR = Path.home() / 'Keys' / 'ThinkingStars'
PASS_ENV = 'TTS_UPLOAD_KEY_PASS'                 # הסיסמה עוברת ל-OpenSSL במשתנה סביבה, לא בשורת הפקודה

README = """Thinking Stars - Google Play upload key
=======================================
upload-key.p12            the upload key (PKCS12, alias 'upload'). SECRET. Back it up to a USB drive.
upload-key-password.txt   its password. SECRET. Move it to the password manager, then delete this file.
upload-cert.pem           the public certificate. Not secret. Google asks for it only if the key is reset.

The same key and password are stored as secrets of the 'release' environment in
github.com/gnet100/TouchTheStars ({keystore}, {password}).
Google holds the final app signing key (Play App Signing). If this upload key is lost,
make a new one and ask for an upload key reset in the Play Console.

Certificate SHA-256: {fingerprint}
"""


def fail(message):
    print(f'error: {message}', file=sys.stderr)
    sys.exit(1)


def find_openssl():
    found = shutil.which('openssl')
    if found:
        return found
    git = shutil.which('git')
    if git:
        # git.exe יושב ב-Git\cmd או ב-Git\mingw64\bin, ו-OpenSSL ב-Git\mingw64\bin
        for parent in Path(git).resolve().parents:
            candidate = parent / 'mingw64' / 'bin' / 'openssl.exe'
            if candidate.is_file():
                return str(candidate)
    fail('OpenSSL was not found. It comes with Git for Windows.')


def openssl(tool, args, password):
    env = dict(os.environ, MSYS_NO_PATHCONV='1')
    env[PASS_ENV] = password
    result = subprocess.run([tool] + args, env=env, capture_output=True, text=True)
    if result.returncode != 0:
        # OpenSSL לא מדפיס סיסמאות או מפתחות בהודעות שגיאה, אבל ליתר ביטחון מציגים רק את השורות הראשונות
        fail(f'openssl {args[0]} failed: ' + ' | '.join(result.stderr.strip().splitlines()[:3]))
    return result.stdout


def gh(args, stdin=None):
    result = subprocess.run(['gh'] + args, input=stdin, capture_output=True, text=True)
    return result.returncode, result.stdout, result.stderr


def check_github(replace):
    if not shutil.which('gh'):
        fail('the GitHub command line (gh) was not found')
    code, _, _ = gh(['auth', 'status'])
    if code != 0:
        fail('gh is not signed in. Run: gh auth login')
    code, _, _ = gh(['api', f'repos/{REPO}/environments/{ENVIRONMENT}'])
    if code != 0:
        fail(f"the '{ENVIRONMENT}' environment does not exist in {REPO}")
    code, out, err = gh(['secret', 'list', '--repo', REPO, '--env', ENVIRONMENT, '--json', 'name', '--jq', '.[].name'])
    if code != 0:
        fail('could not list the secrets: ' + err.strip())
    existing = {SECRET_KEYSTORE, SECRET_PASSWORD} & set(out.split())
    if existing and not replace:
        fail(f'the secrets {sorted(existing)} already exist. An upload key was made before; '
             'Google may already know it. Stop here, unless you are sure (then use --replace).')


def make_key(tool, folder, password):
    key_pem = folder / 'key.pem'
    cert = folder / 'upload-cert.pem'
    p12 = folder / 'upload-key.p12'
    null_config = 'NUL' if os.name == 'nt' else '/dev/null'
    openssl(tool, ['req', '-x509', '-newkey', 'rsa:4096', '-sha256', '-days', str(DAYS),
                   '-subj', SUBJECT, '-config', null_config,
                   '-keyout', str(key_pem), '-passout', f'env:{PASS_ENV}', '-out', str(cert)], password)
    try:
        # הצפנה מודרנית (AES-256 ו-PBKDF2). ג'אווה קוראת אותה מגרסה 11.0.12, ובענן רצה 21
        openssl(tool, ['pkcs12', '-export', '-name', ALIAS, '-inkey', str(key_pem), '-passin', f'env:{PASS_ENV}',
                       '-in', str(cert), '-keypbe', 'AES-256-CBC', '-certpbe', 'AES-256-CBC', '-macalg', 'sha256',
                       '-out', str(p12), '-passout', f'env:{PASS_ENV}'], password)
    finally:
        # המפתח הפרטי צריך להישאר רק בתוך קובץ ה-PKCS12
        if key_pem.exists():
            key_pem.write_bytes(os.urandom(key_pem.stat().st_size))
            key_pem.unlink()
    return p12, cert


def verify(tool, p12, cert, password):
    """קורא את הקובץ חזרה בסיסמה, ומוודא שהכינוי נכון ושהתעודה שבתוכו זהה ל-upload-cert.pem."""
    info = openssl(tool, ['pkcs12', '-in', str(p12), '-passin', f'env:{PASS_ENV}', '-info', '-nokeys',
                          '-clcerts'], password)
    if f'friendlyName: {ALIAS}' not in info:
        fail(f"the key file does not carry the alias '{ALIAS}'")
    from_p12 = openssl(tool, ['pkcs12', '-in', str(p12), '-passin', f'env:{PASS_ENV}', '-nokeys', '-clcerts'],
                       password)
    tmp = p12.with_name('check-cert.pem')
    tmp.write_text(from_p12)
    try:
        a = openssl(tool, ['x509', '-in', str(tmp), '-noout', '-fingerprint', '-sha256'], password)
    finally:
        tmp.unlink()
    b = openssl(tool, ['x509', '-in', str(cert), '-noout', '-fingerprint', '-sha256'], password)
    if a != b:
        fail('the certificate inside the key file does not match upload-cert.pem')
    dates = openssl(tool, ['x509', '-in', str(cert), '-noout', '-enddate', '-subject'], password)
    return b.split('=', 1)[1].strip(), dates.strip()


def upload(p12, password):
    encoded = base64.b64encode(p12.read_bytes()).decode('ascii')
    for name, value in ((SECRET_KEYSTORE, encoded), (SECRET_PASSWORD, password)):
        # gh קורא את הערך מהקלט כשאין --body, ולכן הוא לא מופיע בשורת הפקודה
        code, _, err = gh(['secret', 'set', name, '--repo', REPO, '--env', ENVIRONMENT], stdin=value)
        if code != 0:
            fail(f'could not save the secret {name}: {err.strip()}\n'
                 f'The key itself is ready in {p12.parent}. Do not run this script again; '
                 'the secrets can be saved from that folder.')
    code, out, _ = gh(['secret', 'list', '--repo', REPO, '--env', ENVIRONMENT, '--json', 'name', '--jq', '.[].name'])
    missing = {SECRET_KEYSTORE, SECRET_PASSWORD} - set(out.split())
    if code != 0 or missing:
        fail(f'the secrets were not found after saving: {sorted(missing)}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true', help='temporary key in a temporary folder, no GitHub')
    ap.add_argument('--replace', action='store_true', help='allow replacing existing secrets (dangerous)')
    args = ap.parse_args()

    tool = find_openssl()
    if args.dry_run:
        folder = Path(tempfile.mkdtemp(prefix='upload-key-dry-run-'))
    else:
        check_github(args.replace)
        if KEY_DIR.exists() and any(KEY_DIR.iterdir()):
            fail(f'{KEY_DIR} already has files. This script never overwrites a key.')
        KEY_DIR.mkdir(parents=True, exist_ok=True)
        folder = KEY_DIR

    password = secrets.token_urlsafe(32)
    p12, cert = make_key(tool, folder, password)
    fingerprint, dates = verify(tool, p12, cert, password)

    if args.dry_run:
        print(f'dry run OK: {p12.stat().st_size} byte key file, {dates.replace(chr(10), ", ")}')
        print(f'certificate SHA-256: {fingerprint}')
        shutil.rmtree(folder)
        print('the temporary key was deleted')
        return

    (folder / 'upload-key-password.txt').write_text(password + '\n', encoding='ascii')
    (folder / 'README.txt').write_text(README.format(keystore=SECRET_KEYSTORE, password=SECRET_PASSWORD,
                                                     fingerprint=fingerprint), encoding='utf-8')
    upload(p12, password)
    print(f'Upload key created in {folder}')
    print(f'  {dates.replace(chr(10), ", ")}')
    print(f'  certificate SHA-256: {fingerprint}')
    print(f"Saved as secrets of the '{ENVIRONMENT}' environment in {REPO}: {SECRET_KEYSTORE}, {SECRET_PASSWORD}")
    print('Next: copy upload-key.p12 to a USB drive, move the password to the password manager,')
    print('      then delete upload-key-password.txt.')


if __name__ == '__main__':
    main()
