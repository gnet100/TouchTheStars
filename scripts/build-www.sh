#!/bin/sh
# בונה את תיקיית www, שהיא תוכן האפליקציה הארוזה.
#
# מה נכנס: כל מה שהדף באמת טוען בזמן ריצה, ורישיונות הגופנים שחייבים להישאר לידם.
# מה לא נכנס:
#   sw.js         - באפליקציה הקבצים כבר בתוכה, והקוד ממילא לא רושם service worker שם
#   css/tailwind.css - קובץ מקור לבנייה, לא נטען בזמן ריצה
#   README, .nojekyll, tailwind.config.js, scripts, .github - שייכים למאגר ולאתר, לא לאפליקציה
#
# התיקייה נבנית מחדש בכל הרצה, ואינה נשמרת במאגר.
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
out="$root/www"

rm -rf "$out"
mkdir -p "$out"

for item in index.html manifest.json favicon.ico css fonts icons images js; do
  cp -R "$root/$item" "$out/"
done

rm -f "$out/css/tailwind.css"

# הצלבה מול רשימת השמירה המוקדמת שב-sw.js, שהיא הרשימה הרשמית של קובצי האתר:
# קובץ חדש שנוסף לאתר ולא הגיע לכאן ייתפס מיד, ולא יתגלה רק בטלפון
precached=$(sed -n "/^const PRECACHE = \[/,/^];/p" "$root/sw.js" | grep -o "'\./[^']*'" | tr -d "'")
count=$(printf '%s
' "$precached" | grep -c . || true)
if [ "$count" -lt 10 ]; then
  echo "could not read the precache list from sw.js (found $count entries). Did its format change?" >&2
  exit 1
fi

missing=''
for path in $precached; do
  rel=${path#./}
  [ -z "$rel" ] && rel='index.html'          # './' הוא הדף עצמו
  [ -f "$out/$rel" ] || missing="$missing $rel"
done
if [ -n "$missing" ]; then
  echo "www is missing files that the site precaches:$missing" >&2
  exit 1
fi

files=$(find "$out" -type f | wc -l)
bytes=$(find "$out" -type f -exec cat {} + | wc -c)
echo "www: $files files, $bytes bytes, and every precached file of the site is in it"
