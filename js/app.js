// שכבת האפליקציה של Thinking Stars.
//
// הקובץ הזה עושה משהו רק כשהמשחק רץ כאפליקציה ארוזה (Capacitor, אנדרואיד). באתר בדפדפן הוא יוצא
// בשורה הראשונה, ושום דבר לא משתנה: המסכים הנוספים יושבים ב-<template> שהדפדפן לא מציג ולא טוען,
// ולא נוספת אף בקשה לרשת.
//
// מה יש כאן: מסך פרטיות, כפתור "חזור" של אנדרואיד, ובהמשך גם המנעול והרכישה.
(function () {
  if (typeof isInApp !== 'function' || !isInApp()) return;

  const Plugins = (window.Capacitor && window.Capacitor.Plugins) || {};
  const App = Plugins.App;

  // כל הקריאות לגוגל פליי רצות בזו אחר זו. ברכיב התשלום כל קריאה סוגרת ופותחת מחדש את החיבור
  // לגוגל, ולכן שתי קריאות במקביל עלולות לקטוע זו את זו
  let queue = Promise.resolve();
  function serial(fn) {
    const run = () => fn();
    const result = queue.then(run, run);
    queue = result.catch(() => {});
    return result;
  }

  // ================= המסכים הנוספים =================
  function addAppParts() {
    const tpl = document.getElementById('app-parts');
    if (!tpl) { console.error('app: the app-parts template is missing'); return; }
    document.body.appendChild(tpl.content.cloneNode(true));
    // הקישור לפרטיות נכנס לשורה התחתונה של מסך הפתיחה, בין הצליל להוראות
    const row = document.getElementById('home-bottom-row');
    const link = document.getElementById('privacy-link');
    if (row && link) row.insertBefore(link, row.lastElementChild);
  }

  // ================= כפתור "חזור" של אנדרואיד =================
  // כל מסך חוזר למקום שאליו מחזיר כפתור "חזור" שלו עצמו
  const BACK_TO = { step2: 1, step4: 3, step5: 1, step6: 5, step7: 1 };

  function currentScreen() {
    const lock = document.getElementById('lock-modal');
    if (lock && !lock.classList.contains('hidden')) return 'lock';
    if (!document.getElementById('victory-modal').classList.contains('hidden')) return 'modal';
    const open = Array.prototype.slice.call(document.querySelectorAll('[id^="setup-view-step"]'))
      .find((el) => !el.classList.contains('hidden'));
    if (open) return open.id.replace('setup-view-', '');
    return document.getElementById('tab-arena').classList.contains('invisible') ? 'none' : 'arena';
  }

  function goBack() {
    const at = currentScreen();
    if (at === 'lock') { closeLock(); return; }
    if (at === 'modal') { goToStartFromModal(); return; }
    if (at === 'arena') { goToStep(1); return; }
    if (at === 'step3') { goBackFromStep3(); return; }
    if (BACK_TO[at]) { goToStep(BACK_TO[at]); return; }
    minimize();                       // מסך הפתיחה: יוצאים מהאפליקציה
  }

  function minimize() {
    if (App && typeof App.minimizeApp === 'function') serial(() => App.minimizeApp()).catch(() => {});
  }

  // במסך הפתיחה מחזירים את "חזור" לאנדרואיד עצמו, כדי שתהיה אנימציית היציאה הרגילה.
  // אם הפעולה הזאת לא קיימת בגרסת הרכיב, המאזין שלנו פשוט יצמצם את האפליקציה
  let handlerEnabled = true;
  function syncBackHandler() {
    if (!App || typeof App.toggleBackButtonHandler !== 'function') return;
    const wanted = currentScreen() !== 'step1';
    if (wanted === handlerEnabled) return;
    handlerEnabled = wanted;
    serial(() => App.toggleBackButtonHandler({ enabled: wanted })).catch(() => {});
  }

  function startBackButton() {
    if (!App || typeof App.addListener !== 'function') { console.error('app: the App plugin is missing'); return; }
    App.addListener('backButton', () => { goBack(); syncBackHandler(); });
    // כל לחיצה בדף עשויה להחליף מסך, ולכן בודקים מחדש מי אמור לטפל ב"חזור"
    document.addEventListener('click', () => setTimeout(syncBackHandler, 0));
    syncBackHandler();
  }

  // ================= המנעול והרכישה =================
  // המנעול אינו מחסום אבטחה: באתר הכול פתוח ממילא, ובטלפון פרוץ אפשר לעקוף אותו.
  // המטרה היחידה היא שהרכישה תהיה ברורה והוגנת
  const Purchases = Plugins.NativePurchases;
  const PRODUCT_ID = 'full_unlock';
  const FREE_MAX_LEVEL = 3;
  const FREE_MAX_ROWS = 5;
  const UNLOCK_KEY = 'tts-full';
  const MISS_KEY = 'tts-full-miss';
  const LOCK_TARGETS = ['diff-btn-4', 'diff-btn-5', 'row-btn-6'];
  const PENDING_TEXT = 'התשלום ממתין לאישור, למשל של הורה. הגרסה המלאה תיפתח לבד אחרי האישור.';
  const FAILED_TEXT = 'הרכישה לא הושלמה. אפשר לנסות שוב מתי שרוצים.';
  const OFFLINE_TEXT = 'אין חיבור ל-Google Play כרגע. אפשר לנסות שוב מאוחר יותר.';

  let unlocked = read(UNLOCK_KEY) === '1';
  let wanted = null;        // מה נלחץ כשהמנעול נפתח, כדי לבחור אותו מיד אחרי הרכישה
  let busy = false;
  let priceFromStore = false;

  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function write(key, value) { try { localStorage.setItem(key, value); } catch (e) {} }
  function drop(key) { try { localStorage.removeItem(key); } catch (e) {} }

  function setUnlocked(on) {
    unlocked = on;
    if (on) { write(UNLOCK_KEY, '1'); drop(MISS_KEY); } else { drop(UNLOCK_KEY); }
    refreshLocks();
  }

  // אייקון מנעול על הפריטים הנעולים. setAiDiff ו-selectRows מחליפים רק את המחלקות של הכפתור,
  // ולכן האייקון שמוסיפים כאן נשאר גם אחרי בחירה
  function refreshLocks() {
    LOCK_TARGETS.forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const mark = btn.querySelector('.lock-mark');
      if (unlocked) {
        if (mark) mark.remove();
        btn.removeAttribute('title');
        return;
      }
      if (!mark) {
        const span = document.createElement('span');
        span.className = 'lock-mark material-symbols-outlined text-[14px] align-middle ms-1';
        span.setAttribute('aria-hidden', 'true');
        span.textContent = 'lock';
        btn.appendChild(span);
        btn.title = 'נעול בגרסה החינמית';
      }
    });
    if (unlocked) closeLock();
  }

  const lockedLevel = (value) => !unlocked && Number(value) > FREE_MAX_LEVEL;
  const lockedRows = (value) => !unlocked && Number(value) > FREE_MAX_ROWS;

  // הכפתורים בדף מחוברים דרך טבלת ACTIONS שב-js/game.js, וזו נקודת החיבור היחידה שלנו אליהם.
  // שם פעולה שישתנה ייתפס כאן מיד, ולא ייעלם בשקט
  function guard(name, isLocked) {
    const original = ACTIONS[name];
    if (typeof original !== 'function') { console.error('app: missing action ' + name); return; }
    ACTIONS[name] = function (value) {
      if (isLocked(value)) { openLock({ action: name, value: value }); return; }
      original(value);
    };
  }

  // אחרי נעילה מחדש, ולפני תחילת משחק, מחזירים בחירות נעולות לערך המותר הגבוה ביותר
  function clampToFree() {
    if (unlocked) return;
    if (setupAiDiffLevel > FREE_MAX_LEVEL) setAiDiff(FREE_MAX_LEVEL);
    if (setupRows > FREE_MAX_ROWS) selectRows(FREE_MAX_ROWS);
    if (gameState.aiDifficultyLevel > FREE_MAX_LEVEL) gameState.aiDifficultyLevel = FREE_MAX_LEVEL;
    if (gameState.numRows > FREE_MAX_ROWS) gameState.numRows = FREE_MAX_ROWS;
  }

  // ---------- חלון המנעול ----------
  function openLock(target) {
    wanted = target || null;
    const modal = document.getElementById('lock-modal');
    if (!modal) return;
    setStatus('');
    setBusy(false);
    modal.classList.remove('hidden');
    loadPrice();
  }

  function closeLock() {
    const modal = document.getElementById('lock-modal');
    if (modal) modal.classList.add('hidden');
  }

  function setStatus(text) {
    const el = document.getElementById('lock-status');
    if (el) el.textContent = text;          // טקסט בלבד, אף פעם לא innerHTML
  }

  function setBusy(on) {
    busy = on;
    ['lock-buy', 'lock-restore', 'lock-close'].forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.disabled = on;
      btn.classList.toggle('opacity-50', on);
    });
  }

  // המחיר מגיע מגוגל עם המטבע והפורמט הנכונים. עד שהוא מגיע, ואם הוא לא מגיע, נשאר המחיר שבדף
  function loadPrice() {
    const el = document.getElementById('lock-price');
    if (!el || priceFromStore || !Purchases || typeof Purchases.getProducts !== 'function') return;
    serial(() => Purchases.getProducts({ productIdentifiers: [PRODUCT_ID], productType: 'inapp' }))
      .then((res) => {
        const product = res && res.products && res.products[0];
        if (product && product.priceString) {
          el.textContent = product.priceString;
          priceFromStore = true;
        }
      })
      .catch(() => {});
  }

  // ---------- מה גוגל אומרת ----------
  // "1" הוא נקנה ו-"2" הוא ממתין. גרסה שלא מחזירה מצב בכלל נחשבת קנויה, כי היא הופיעה
  // ברשימת הרכישות של המשתמש
  function isPurchased(p) {
    if (!p || (p.productIdentifier && p.productIdentifier !== PRODUCT_ID)) return false;
    const state = String(p.purchaseState === undefined ? '1' : p.purchaseState).toUpperCase();
    return state === '1' || state === 'PURCHASED';
  }

  // מחזיר purchased, pending או none, ונכשל רק כשאין חיבור לגוגל
  function checkPurchases() {
    return serial(() => Purchases.getPurchases({ productType: 'inapp' })).then((res) => {
      const list = (res && res.purchases) || [];
      const mine = list.filter((p) => p && p.productIdentifier === PRODUCT_ID);
      const bought = mine.filter(isPurchased);
      if (bought.length) return finishPurchase(bought[0]).then(() => 'purchased');
      return mine.length ? 'pending' : 'none';
    });
  }

  // רכישה שלא אושרה מוחזרת על ידי גוגל אחרי שלושה ימים, ולכן משלימים אישור בכל הזדמנות
  function finishPurchase(purchase) {
    if (purchase.isAcknowledged || !purchase.purchaseToken ||
        !Purchases || typeof Purchases.acknowledgePurchase !== 'function') return Promise.resolve();
    return serial(() => Purchases.acknowledgePurchase({ purchaseToken: purchase.purchaseToken }))
      .catch(() => {});                     // אם האישור נכשל, ננסה שוב בפתיחה הבאה
  }

  function unlockNow() {
    setUnlocked(true);
    closeLock();
    const target = wanted;
    wanted = null;
    if (!target) return;
    if (target.action === 'setAiDiff') setAiDiff(Number(target.value));
    if (target.action === 'selectRows') selectRows(Number(target.value));
  }

  // ---------- רכישה ושחזור ----------
  function buyUnlock() {
    if (busy || !Purchases || typeof Purchases.purchaseProduct !== 'function') return;
    setBusy(true);
    setStatus('רגע, פותחים את Google Play...');
    serial(() => Purchases.purchaseProduct({
      productIdentifier: PRODUCT_ID, productType: 'inapp', autoAcknowledgePurchases: false
    }))
      .then(
        // רכישה שהצליחה פותחת מיד, גם אם הרשת נופלת מיד אחריה. אחרת שואלים את גוגל מה המצב,
        // כי ביטול, המתנה ושגיאה מגיעים כשגיאה עם אותו טקסט
        (tx) => (isPurchased(tx) ? finishPurchase(tx).then(() => 'purchased') : checkPurchases()),
        () => checkPurchases())
      .then((state) => {
        setBusy(false);
        if (state === 'purchased') { unlockNow(); return; }
        setStatus(state === 'pending' ? PENDING_TEXT : FAILED_TEXT);
      })
      .catch(() => { setBusy(false); setStatus(OFFLINE_TEXT); });
  }

  function restoreUnlock() {
    if (busy || !Purchases || typeof Purchases.getPurchases !== 'function') return;
    setBusy(true);
    setStatus('בודקים מול Google Play...');
    checkPurchases()
      .then((state) => {
        setBusy(false);
        if (state === 'purchased') { unlockNow(); return; }
        setStatus(state === 'pending' ? PENDING_TEXT : 'לא נמצאה רכישה בחשבון Google הזה.');
      })
      .catch(() => { setBusy(false); setStatus(OFFLINE_TEXT); });
  }

  // ---------- בדיקה מול גוגל בכל פתיחה, ובכל חזרה לאפליקציה ----------
  // "אין רכישה" אינו בהכרח החזר כספי: הרכיב מחזיר רשימה ריקה גם כששאילתה לגוגל נכשלת אחרי
  // שהחיבור כבר עלה. לכן נועלים מחדש רק אחרי שתי תשובות ריקות רצופות, בבדיקות נפרדות
  const MISS_LIMIT = 2;

  function syncWithStore() {
    if (!Purchases || typeof Purchases.getPurchases !== 'function') return;
    checkPurchases()
      .then((state) => {
        if (state === 'purchased') {
          if (unlocked) drop(MISS_KEY); else setUnlocked(true);
          return;
        }
        if (state === 'pending' || !unlocked) return;     // ממתין: לא פותחים, וגם לא נועלים
        const misses = Number(read(MISS_KEY) || '0') + 1;
        if (misses < MISS_LIMIT) { write(MISS_KEY, String(misses)); return; }
        setUnlocked(false);       // החזר כספי או ביטול: נועלים, ומחזירים בחירות למותר
        drop(MISS_KEY);
        clampToFree();
      })
      .catch(() => {});           // שגיאה או אין אינטרנט: נשאר המצב האחרון ששמור במכשיר
  }

  function startSync() {
    syncWithStore();
    // חזרה לאפליקציה: אולי ההורה אישר בינתיים את התשלום, ואולי בוטלה רכישה
    if (App && typeof App.addListener === 'function') App.addListener('resume', () => syncWithStore());
  }

  function startLock() {
    if (!Purchases) { console.error('app: the NativePurchases plugin is missing'); return; }
    ACTIONS.buyUnlock = buyUnlock;
    ACTIONS.restoreUnlock = restoreUnlock;
    ACTIONS.closeLock = closeLock;
    guard('setAiDiff', lockedLevel);
    guard('selectRows', lockedRows);
    const startGame = ACTIONS.applySetupAndStart;
    if (typeof startGame !== 'function') { console.error('app: missing action applySetupAndStart'); return; }
    ACTIONS.applySetupAndStart = function () { clampToFree(); startGame(); };
    refreshLocks();
  }

  addAppParts();
  startBackButton();
  startLock();
  startSync();
})();
