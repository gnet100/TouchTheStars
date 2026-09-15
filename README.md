# Thinking Stars

משחק חשיבה לשניים (או מול המחשב, בחמש רמות קושי): בכל תור מסירים כוכבית אחת או רצף של כוכביות זוהרות צמודות, משורה אחת בפירמידה. מי שנשאר עם הכוכבית האחרונה – מפסיד.

**לשחק בטלפון:** https://gnet100.github.io/TouchTheStars/

להתקנה כאפליקציה במסך הבית:
- **Android (Chrome):** תפריט ⋮ → "הוסף למסך הבית" / "התקן אפליקציה"
- **iPhone (Safari):** כפתור שיתוף → "הוסף למסך הבית"

## איך זה בנוי
הדף טוען קבצים רק מהאתר עצמו, בלי שרתים חיצוניים, ועובד גם בלי אינטרנט אחרי הביקור הראשון.

- `index.html`: הדף. אין בו קוד בתוך תגיות, ויש בו מדיניות אבטחה (CSP) שמתירה רק קבצים מהאתר.
- `js/game.js`: המשחק. הכפתורים מחוברים דרך `data-action`.
- `css/app.css`: העיצוב, שנבנה מראש ב-Tailwind CSS 3.4.19 לפי `tailwind.config.js` ו-`css/tailwind.css`.
  **אחרי הוספת מחלקה של Tailwind בונים אותו מחדש**, עם הקובץ העצמאי של Tailwind 3.4.19:
  `tailwindcss -c tailwind.config.js -i css/tailwind.css -o css/app.css --minify`
- `fonts/`: הגופנים Rubik ו-Fredoka (עברית ולטינית), וגופן אייקונים שמכיל רק את האייקונים שבשימוש.
  **אייקון חדש** צריך להיכנס לרשימה שבראש `fonts/fonts.css`, ואז מורידים את גופן האייקונים מחדש.
- `sw.js`: עבודה בלי אינטרנט. שומר מראש את כל קובצי האתר, ולכן **קובץ חדש צריך להיכנס לרשימה שבו**.
- `manifest.json`, `icons/`: התקנה כאפליקציה.

## זכויות
© 2026 gnet100. כל הזכויות על המשחק שמורות, חוץ מהרכיבים של צד שלישי שלמטה.

רכיבים של צד שלישי, כל אחד ברישיון שלו:
- Tailwind CSS: רישיון MIT (ההודעה בתוך `css/app.css`).
- הגופנים Rubik ו-Fredoka: SIL Open Font License 1.1 (`fonts/OFL-Rubik.txt`, `fonts/OFL-Fredoka.txt`).
- האייקונים Material Symbols: Apache License 2.0 (`fonts/LICENSE-MaterialSymbols.txt`).
