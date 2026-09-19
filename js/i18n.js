// שפת הממשק: עברית או אנגלית. נטען ב-<head> לפני כל השאר, כדי שהשפה והכיוון ייקבעו לפני שהדף מוצג.
// הטקסטים בעברית כתובים ב-index.html עצמו, ולכן בעברית apply לא נוגע בדף. באנגלית apply מחליף כל רכיב
// שמסומן ב-data-i18n (טקסט), data-i18n-title, data-i18n-aria, data-i18n-alt ו-data-i18n-value.
// מחרוזות שנבנות בקוד עוברות דרך I18N.t, ולכן יש להן גם עברית וגם אנגלית כאן.
// החלפת שפה שומרת את הבחירה וטוענת את הדף מחדש: אין מצב ביניים שבו רק חלק מהמסך תורגם.
(function () {
  const STRINGS = {
    he: {
      p1: 'שחקן 1',
      p2: 'שחקן 2',
      computer: 'מחשב',
      computerThinking: 'המחשב חושב...',
      winsOne: 'ניצחון אחד',
      winsMany: '{n} ניצחונות',
      winComputer: '{name} ניצח!',
      winPlayer: '{name} ניצח/ה!',
      restart: 'התחל מחדש',
      clearSelection: 'ביטול הבחירה',
      undoMove: 'מהלך אחד לאחור',
      demo0: 'בתחילת המשחק יש 5 שורות ו-15 כוכביות. שחקן 1 מתחיל',
      demo1: 'שחקן 1 לוקח כוכבית אחת',
      demo2: 'שחקן 2 לוקח 3 כוכביות צמודות מאותה שורה',
      demo3: 'שחקן 1 לוקח 2 כוכביות מאמצע השורה. עכשיו השורה מפוצלת לשני חלקים',
      demo4: 'אסור לקחת את שתי הכוכביות האלה יחד: כוכבית כבויה עוצרת את הרצף',
      demo5: 'שחקן 2 בוחר מהלך אחר ולוקח שורה שלמה',
      demo6: 'שחקן 1 לוקח 2 כוכביות צמודות',
      demo7: 'שחקן 2 לוקח כוכבית אחת',
      demo8: 'שחקן 1 לוקח שורה שלמה ומשאיר לשחקן 2 כוכבית אחת בלבד',
      demo9: 'הכוכבית האחרונה מהבהבת באדום: שחקן 2 נשאר איתה והפסיד. שחקן 1 ניצח!',
      demoEnd: 'סוף המשחק',
      demoTurn: 'תור שחקן {n}',
      demoOpening: 'פתיחה',
      demoCounter: 'שלב {i} מתוך {n}',
      soundOn: 'צליל פעיל',
      soundOff: 'צליל כבוי',
      lockPending: 'התשלום ממתין לאישור, למשל של הורה. הגרסה המלאה תיפתח לבד אחרי האישור.',
      lockFailed: 'הרכישה לא הושלמה. אפשר לנסות שוב מתי שרוצים.',
      lockOffline: 'אין חיבור ל-Google Play כרגע. אפשר לנסות שוב מאוחר יותר.',
      lockedTitle: 'נעול בגרסה החינמית',
      lockOpening: 'רגע, פותחים את Google Play...',
      lockChecking: 'בודקים מול Google Play...',
      lockNotFound: 'לא נמצאה רכישה בחשבון Google הזה.'
    },
    en: {
      // מחרוזות שנבנות בקוד (לכל אחת יש גם עברית למעלה)
      p1: 'Player 1',
      p2: 'Player 2',
      computer: 'Computer',
      computerThinking: 'Computer is thinking...',
      winsOne: '1 win',
      winsMany: '{n} wins',
      winComputer: '{name} wins!',
      winPlayer: '{name} wins!',
      restart: 'Start over',
      clearSelection: 'Clear selection',
      undoMove: 'Undo one move',
      demo0: 'The game starts with 5 rows and 15 stars. Player 1 goes first',
      demo1: 'Player 1 takes one star',
      demo2: 'Player 2 takes 3 adjacent stars from the same row',
      demo3: 'Player 1 takes 2 stars from the middle of the row. The row is now split in two',
      demo4: 'These two stars cannot be taken together: a dimmed star breaks the run',
      demo5: 'Player 2 chooses another move and takes a whole row',
      demo6: 'Player 1 takes 2 adjacent stars',
      demo7: 'Player 2 takes one star',
      demo8: 'Player 1 takes a whole row and leaves Player 2 just one star',
      demo9: 'The last star flashes red: Player 2 is left with it and loses. Player 1 wins!',
      demoEnd: 'Game over',
      demoTurn: 'Player {n}’s turn',
      demoOpening: 'Start',
      demoCounter: 'Step {i} of {n}',
      soundOn: 'Sound on',
      soundOff: 'Sound off',
      lockPending: 'The payment is waiting for approval, for example from a parent. The full version will unlock by itself once it is approved.',
      lockFailed: 'The purchase was not completed. You can try again any time.',
      lockOffline: 'Google Play cannot be reached right now. Please try again later.',
      lockedTitle: 'Locked in the free version',
      lockOpening: 'One moment, opening Google Play...',
      lockChecking: 'Checking with Google Play...',
      lockNotFound: 'No purchase was found on this Google account.',
      // הטקסטים הקבועים בדף (data-i18n ב-index.html). בעברית הם כתובים בדף עצמו
      langSwitch: 'עברית',
      langSwitchAria: 'עברית',
      tagline: 'Whoever is left with the last star loses!',
      modePvp: 'Two players',
      modeAi: 'Player vs computer',
      sound: 'Sound',
      rules: 'Rules',
      rulesTitle: 'How to play',
      back: 'Back',
      rulesIntro: 'An ancient math thinking game. Simple rules,\nstrategic depth',
      rulesGoal: 'The goal: leave your opponent the last star',
      rulesBoardTitle: '1. The board',
      rulesBoard: 'A pyramid of stars, 2 to 6 rows, your choice (default: 5 rows, 15 stars).',
      rulesTurnTitle: '2. Your turn',
      rulesTurn: 'On each turn, choose one or more stars from a single row, in an unbroken run of glowing stars (a dimmed star breaks the run), and press “Play”. The chosen stars disappear.',
      rulesLastTitle: '3. Whoever is left with the last star loses!',
      rulesLast: 'When only one star is left, it flashes red, and the player whose turn it is has to take it and loses.',
      demo: 'Demo',
      prev: 'Previous',
      pauseResume: 'Pause / resume',
      next: 'Next',
      difficulty: 'Difficulty',
      level1: '1. Beginner',
      level2: '2. Amateur',
      level3: '3. Intermediate',
      level4: '4. Advanced',
      level5: '5. Champion',
      continue: 'Continue',
      playersTitle: 'Players',
      p1NameLabel: 'Player 1 name:',
      p2NameLabel: 'Player 2 name:',
      whoStartsFirst: 'Who goes first?',
      boardSize: 'Board size',
      rowsLabel: 'Pyramid rows:',
      startGame: 'Start game',
      play: 'Play',
      homeScreen: 'Home screen',
      playAgain: 'Play again',
      whoStarts: 'Who starts?',
      backToStart: 'Back to start',
      privacy: 'Privacy',
      fullVersion: 'Full version',
      fullVersionDesc: 'Unlocks levels 4 and 5, and a 6-row board.',
      oneTimePayment: 'One-time payment through Google Play',
      buy: 'Buy',
      restore: 'Restore purchase',
      notNow: 'Not now',
      privacyMeta: 'Thinking Stars · Net100 Apps · net100apps@gmail.com\nUpdated: 19 September 2026',
      privCollectTitle: 'What information is collected',
      privCollect: 'No personal information is collected or sent. There are no accounts, no ads and no analytics.',
      privDeviceTitle: 'What is saved on the device',
      privDevice: 'The sound setting, the chosen language and whether the full version is unlocked, on the device only. Player names are not saved.',
      privPurchaseTitle: 'Purchase',
      privPurchase: 'Purchases are made through Google Play, under Google’s privacy policy. Payment details never reach us.',
      privKidsTitle: 'Children',
      privKids: 'The game is suitable for children, and no information is collected from them.',
      privChangesTitle: 'Changes',
      privChanges: 'Any change to this policy will appear on this screen and on the game’s policy page.'
    }
  };

  // אנגלית היא השפה הראשית. עברית למכשיר שיש בו עברית ברשימת השפות (גם לא כשפה ראשית, כמו טלפון באנגלית
  // עם עברית כשפה שנייה) או שנמצא באזור הזמן של ישראל. בחירה שמורה מהכפתור גוברת על הכול.
  // כל המשחקים תחת gnet100.github.io חולקים אחסון אחד, ולכן המפתח מתחיל ב-tts-, כמו שאר המפתחות של המשחק
  const KEY = 'tts-lang';
  function detect() {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'he' || saved === 'en') return saved;
    } catch (e) { /* אחסון חסום: ממשיכים לפי המכשיר */ }
    const list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    if (list.some((l) => /^(he|iw)\b/i.test(String(l)))) return 'he';
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (zone === 'Asia/Jerusalem' || zone === 'Asia/Tel_Aviv') return 'he';
    } catch (e) { /* בלי מידע על אזור הזמן: אנגלית */ }
    return 'en';
  }

  const lang = detect();
  const html = document.documentElement;
  html.lang = lang;
  html.dir = lang === 'he' ? 'rtl' : 'ltr';
  // באנגלית הדף מוסתר עד שהטקסטים הוחלפו (apply), כדי שלא יבהב לרגע הטקסט העברי שכתוב בדף.
  // בספארי הדפדפן מצייר עוד לפני שהקוד בסוף הדף רץ. רשת ביטחון: אחרי 1.5 שניות הדף מוצג בכל מקרה
  if (lang !== 'he') {
    html.classList.add('i18n-wait');
    setTimeout(() => html.classList.remove('i18n-wait'), 1500);
  }

  function t(key, vars) {
    const table = STRINGS[lang] || {};
    let s = key in table ? table[key] : STRINGS.he[key];
    if (s === undefined) return key;
    if (vars) Object.keys(vars).forEach((k) => { s = s.split('{' + k + '}').join(String(vars[k])); });
    return s;
  }

  // טקסט עם מעבר שורה ("\n") נבנה מצמתים, בלי innerHTML
  function setText(el, s) {
    const parts = s.split('\n');
    el.textContent = parts[0];
    for (let i = 1; i < parts.length; i++) {
      el.appendChild(document.createElement('br'));
      el.appendChild(document.createTextNode(parts[i]));
    }
  }

  function apply(root) {
    const scope = root || document;
    if (scope === document) {
      // כפתור השפה מציג את השפה השנייה, ולכן גם מסומן בה (בשביל קורא מסך)
      const sw = document.getElementById('lang-btn');
      if (sw) sw.lang = lang === 'he' ? 'en' : 'he';
    }
    if (lang === 'he') return;
    const table = STRINGS[lang] || {};
    const pick = (sel) => {
      const list = Array.from(scope.querySelectorAll(sel));
      if (scope.matches && scope.matches(sel)) list.unshift(scope);
      return list;
    };
    pick('[data-i18n]').forEach((el) => { const s = table[el.dataset.i18n]; if (s !== undefined) setText(el, s); });
    pick('[data-i18n-title]').forEach((el) => { const s = table[el.dataset.i18nTitle]; if (s !== undefined) el.title = s; });
    pick('[data-i18n-aria]').forEach((el) => { const s = table[el.dataset.i18nAria]; if (s !== undefined) el.setAttribute('aria-label', s); });
    pick('[data-i18n-alt]').forEach((el) => { const s = table[el.dataset.i18nAlt]; if (s !== undefined) el.alt = s; });
    pick('[data-i18n-value]').forEach((el) => { const s = table[el.dataset.i18nValue]; if (s !== undefined) { el.value = s; el.defaultValue = s; } });
    if (scope === document) html.classList.remove('i18n-wait');   // הטקסטים מוכנים: מציגים את הדף
  }

  // מעבר לשפה השנייה: שומרים וטוענים מחדש. הכפתור נמצא רק במסך הפתיחה, כך שלא נקטע משחק
  function toggle() {
    const next = lang === 'he' ? 'en' : 'he';
    try { localStorage.setItem(KEY, next); } catch (e) { return; }
    location.reload();
  }

  window.I18N = { lang, t, apply, toggle, strings: STRINGS };
})();
