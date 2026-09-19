// הטקסטים הקבועים בדף, בשפה שנבחרה (js/i18n.js). בעברית לא משתנה כלום
I18N.apply(document);

// הצליל הוא תוספת: אם אין בדפדפן Web Audio, או שהוא נכשל, המשחק ממשיך לעבוד בלי צליל
let audioCtx = null;
try {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (AudioCtor) audioCtx = new AudioCtor();
} catch (e) { audioCtx = null; }

// כל הצלילים עוברים דרך masterGain: כיבוי הצליל משתיק מיד גם צליל שכבר מתנגן
const masterGain = audioCtx ? audioCtx.createGain() : null;
if (masterGain) { const speakers = audioCtx.destination; masterGain.connect(speakers); }

// מוכן לנגן? מעיר את הצליל אם הדפדפן השהה אותו. בלי Web Audio מחזיר false
function soundReady() {
  if (!audioCtx) return false;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return true;
}

// בטלפונים הצליל נפתח רק אחרי נגיעה של המשתמש. פותחים אותו בכל נגיעה, כך שגם כשהמחשב מתחיל יש צליל
function unlockAudio() {
  if (!audioCtx || audioCtx.state === 'running') return;
  const p = audioCtx.resume();
  if (p && p.catch) p.catch(() => {});
}
['pointerdown', 'touchend', 'click'].forEach(ev => document.addEventListener(ev, unlockAudio, { passive: true }));

function playSelectSound() {
  if (!soundReady()) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(587.33, now);
  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.08);
}

function playosionSound() {
  if (!soundReady()) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, now);
  osc.frequency.exponentialRampToValueAtTime(70, now + 0.35);
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + 0.35);
}

function playMultipleMoveSoundsAndClear(rowIdx, colIndices, callback) {
  soundReady();
  const round = gameState.roundId; // אם הסיבוב מתאפס באמצע, האנימציה נעצרת ולא נוגעת בלוח החדש

  colIndices.forEach((colIdx, i) => {
    setTimeout(() => {
      if (round !== gameState.roundId) return;
      const btnElem = document.getElementById(`star-btn-${rowIdx}-${colIdx}`);
      if (btnElem) {
        btnElem.classList.add('star-exploding');
      }
      playosionSound();

      setTimeout(() => {
        if (round !== gameState.roundId) return;
        gameState.board[rowIdx][colIdx] = false;
        renderBoard();
      }, 180);

      if (i === colIndices.length - 1) {
        setTimeout(() => {
          if (round !== gameState.roundId) return;
          if (callback) callback();
        }, 350);
      }
    }, i * 350);
  });
}

function playVictorySound() {
  if (!soundReady()) return;
  const now = audioCtx.currentTime;

  // מנגינה מקוצרת ומהירה פי 2 (הוכפלה לרוץ ברצף פעמיים)
  const baseNotes = [
    { freq: 523.25, time: 0.0, duration: 0.18 },
    { freq: 659.25, time: 0.12, duration: 0.18 },
    { freq: 783.99, time: 0.24, duration: 0.18 },
    { freq: 1046.50, time: 0.36, duration: 0.28 },
    { freq: 880.00, time: 0.65, duration: 0.18 },
    { freq: 1046.50, time: 0.80, duration: 0.4 }
  ];

  // רצף כפול - רץ פעם אחת ומיד שוב פעם שנייה ברצף
  [0, 1.25].forEach(offset => {
    baseNotes.forEach(note => {
      const startTime = now + note.time + offset;
      const endTime = startTime + note.duration;

      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.value = note.freq;
      gain1.gain.setValueAtTime(0.25, startTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, endTime);
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(startTime);
      osc1.stop(endTime);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.value = note.freq * 1.5;
      gain2.gain.setValueAtTime(0.12, startTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, endTime);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(startTime);
      osc2.stop(endTime);
    });
  });
}

function playDefeatSound() {
  if (!soundReady()) return;
  const now = audioCtx.currentTime;
  const notes = [300, 260, 220, 180];
  notes.forEach((freq, idx) => {
    const startTime = now + idx * 0.2;
    const endTime = startTime + 0.35;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, endTime);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startTime);
    osc.stop(endTime);
  });
}

(function initSpaceBg() {
  const canvas = document.getElementById('space-bg-canvas');
  const ctx = canvas.getContext('2d');
  let width = 0, height = 0;

  function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    width = window.innerWidth; height = window.innerHeight;
    canvas.width = width * dpr; canvas.height = height * dpr;
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    ctx.resetTransform(); ctx.scale(dpr, dpr);
  }
  window.addEventListener('resize', resizeCanvas); resizeCanvas();

  const stars = [];
  for (let i = 0; i < 200; i++) {
    stars.push({ x: Math.random() * width, y: Math.random() * height, radius: Math.random() * 1.5 + 0.5, alpha: Math.random(), speed: Math.random() * 0.02 + 0.005 });
  }

  function renderFrame() {
    ctx.fillStyle = '#040712'; ctx.fillRect(0, 0, width, height);
    stars.forEach(s => {
      s.alpha += s.speed;
      if (s.alpha > 1 || s.alpha < 0.2) s.speed = -s.speed;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.abs(s.alpha)})`; ctx.fill();
    });
    requestAnimationFrame(renderFrame);
  }
  renderFrame();
})();

let setupGameMode = 'ai';
let setupRows = 5;
let setupAiDiffLevel = 1;
let setupStarterPlayer = 1;

let gameState = {
  gameMode: 'ai',
  aiDifficultyLevel: 1,
  player1Name: I18N.t('p1'),
  player2Name: I18N.t('computer'),
  numRows: 5,
  board: [],
  currentPlayer: 1,
  starterPlayer: 1,
  scores: { 1: 0, 2: 0 },
  selectedRow: null,
  selectedIndices: [],
  history: [],  // הלוח לפני כל מהלך, בשביל "מהלך אחד לאחור" מול המחשב
  isGameOverHandled: false,
  roundId: 0,   // מתחלף בכל סיבוב חדש, כדי שטיימרים מסיבוב קודם לא ישנו את הלוח
  busy: false   // מהלך באמצע אנימציה או מחשב חושב: חוסם לחיצות
};

function goToStep(stepNumber) {
  clearTimeout(endTimer);
  gameState.roundId++;   // עוצר מהלך מחשב או אנימציה שעדיין רצים
  gameState.busy = false;
  // הזירה מוסתרת כל עוד אחד ממסכי ההגדרות פתוח (נשאר רק רקע הכוכבים)
  document.getElementById('tab-arena').classList.add('invisible');
  document.getElementById('victory-modal').classList.add('hidden');
  demo.token++;          // יציאה מההדגמה עוצרת אותה
  document.querySelectorAll('[id^="setup-view-step"]').forEach(el => el.classList.add('hidden'));
  document.getElementById(`setup-view-step${stepNumber}`).classList.remove('hidden');
  if (stepNumber === 4) renderPyramidPreview(setupRows);
  if (stepNumber === 6) startDemo();
}

function selectGameMode(mode) {
  setupGameMode = mode;
  const p2Box = document.getElementById('p2-name-box');
  const starterLabel2 = document.getElementById('starter-label-2');
  const starterIcon2 = document.getElementById('starter-icon-2');

  if (mode === 'pvp') {
    p2Box.classList.remove('hidden');
    starterLabel2.innerText = I18N.t('p2');
    starterIcon2.innerText = "person_outline";
    goToStep(3);
  } else {
    p2Box.classList.add('hidden');
    starterLabel2.innerText = I18N.t('computer');
    starterIcon2.innerText = "smart_toy";
    goToStep(2);
  }
}

function goBackFromStep3() {
  if (setupGameMode === 'ai') goToStep(2);
  else goToStep(1);
}

function setAiDiff(level) {
  setupAiDiffLevel = level;
  for (let l = 1; l <= 5; l++) {
    const btn = document.getElementById(`diff-btn-${l}`);
    btn.className = (l === level)
      ? "w-full h-10 rounded-xl bg-primary-container text-on-primary border border-primary font-bold text-xs shadow-md"
      : "w-full h-10 rounded-xl bg-[#171c2b] border border-white/20 font-bold text-xs hover:bg-white/10";
  }
}

function setStarterPlayer(num) {
  setupStarterPlayer = num;
  document.getElementById('starter-btn-1').className = (num === 1)
    ? "flex-1 h-11 rounded-xl bg-primary-container text-on-primary border border-primary font-bold text-xs shadow-md flex items-center justify-center gap-1.5"
    : "flex-1 h-11 rounded-xl bg-[#171c2b] border border-white/20 font-bold text-xs hover:bg-white/10 flex items-center justify-center gap-1.5";
  document.getElementById('starter-btn-2').className = (num === 2)
    ? "flex-1 h-11 rounded-xl bg-primary-container text-on-primary border border-primary font-bold text-xs shadow-md flex items-center justify-center gap-1.5"
    : "flex-1 h-11 rounded-xl bg-[#171c2b] border border-white/20 font-bold text-xs hover:bg-white/10 flex items-center justify-center gap-1.5";
}

function renderPyramidPreview(count) {
  const container = document.getElementById('pyramid-preview-container');
  container.innerHTML = '';
  for (let r = 1; r <= count; r++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = "flex items-center justify-center gap-1.5";
    for (let c = 0; c < r; c++) {
      const star = document.createElement('span');
      star.className = "material-symbols-outlined text-primary text-[18px]";
      star.style.fontVariationSettings = "'FILL' 1";
      star.innerText = "star";
      rowDiv.appendChild(star);
    }
    container.appendChild(rowDiv);
  }
}

function selectRows(count) {
  setupRows = count;
  for (let i = 2; i <= 6; i++) {
    const btn = document.getElementById(`row-btn-${i}`);
    btn.className = (i === count)
      ? "row-sel-btn flex-1 h-12 rounded-xl bg-primary-container text-on-primary border border-primary font-bold text-base shadow-md"
      : "row-sel-btn flex-1 h-12 rounded-xl bg-[#171c2b] border border-white/20 font-bold text-base hover:bg-white/10";
  }
  renderPyramidPreview(count);
}

function applySetupAndStart() {
  gameState.gameMode = setupGameMode;
  gameState.aiDifficultyLevel = setupAiDiffLevel;
  gameState.player1Name = document.getElementById('setup-p1-name').value.trim() || I18N.t('p1');
  gameState.player2Name = gameState.gameMode === 'ai' ? I18N.t('computer') : (document.getElementById('setup-p2-name').value.trim() || I18N.t('p2'));
  gameState.numRows = setupRows;
  gameState.starterPlayer = setupStarterPlayer;
  gameState.scores = { 1: 0, 2: 0 }; // משחק חדש מההגדרות מתחיל מניקוד אפס

  document.getElementById('setup-view-step4').classList.add('hidden');
  document.getElementById('tab-arena').classList.remove('invisible');
  resetCurrentRound();
}

function resetCurrentRound() {
  clearTimeout(endTimer);
  gameState.roundId++;
  gameState.busy = false;
  document.getElementById('victory-modal').classList.add('hidden');
  gameState.isGameOverHandled = false;
  gameState.board = Array.from({ length: gameState.numRows }, (_, i) => new Array(i + 1).fill(true));
  gameState.currentPlayer = gameState.starterPlayer;
  gameState.selectedRow = null;
  gameState.selectedIndices = [];
  gameState.history = [];
  updateHeaderUI();
  renderBoard();
  if (gameState.currentPlayer === 2 && gameState.gameMode === 'ai') handleAiTurn();
}

// שומר את הלוח לפני מהלך, ואת מי שעשה אותו
function pushHistory() {
  gameState.history.push({ board: gameState.board.map(row => row.slice()), player: gameState.currentPlayer });
}

// אפשר ללחוץ על הכפתור העגול? מול המחשב: כשיש בחירה לבטל, או מהלך שלך לחזור ממנו
function canUndo() {
  return gameState.gameMode === 'ai' && !gameState.isGameOverHandled && !gameState.busy &&
    (gameState.selectedIndices.length > 0 || gameState.history.some(s => s.player === 1));
}

// הכפתור העגול בזירה. בשני שחקנים: התחלת הסיבוב מחדש.
// מול המחשב: קודם מבטל בחירה שעוד לא שוחקה, ואם אין בחירה חוזר שני צעדים,
// כלומר מבטל גם את התשובה של המחשב וגם את המהלך שלך, והתור חוזר אליך
function undoOrRestart() {
  if (gameState.gameMode !== 'ai') { resetCurrentRound(); return; }
  if (gameState.busy || gameState.isGameOverHandled) return;
  if (gameState.selectedIndices.length) {
    gameState.selectedRow = null;
    gameState.selectedIndices = [];
    renderBoard();
    return;
  }
  let snap = null;
  while (gameState.history.length && !snap) {
    const s = gameState.history.pop();
    if (s.player === 1) snap = s;
  }
  if (!snap) return;
  gameState.roundId++;          // עוצר טיימרים של מהלך שעדיין רץ
  gameState.busy = false;
  gameState.board = snap.board.map(row => row.slice());
  gameState.currentPlayer = 1;
  gameState.selectedRow = null;
  gameState.selectedIndices = [];
  updateHeaderUI();
  renderBoard();
}

// ממסך סוף הסיבוב: בוחרים מי מתחיל ומתחילים סיבוב חדש. הניקוד נשמר
function startNextRound(starter) {
  gameState.starterPlayer = starter;
  resetCurrentRound();
}

// "שחק שוב" במסך הסיום: במקום הכפתור מופיעה השאלה מי מתחיל. לחיצה על שחקן מתחילה סיבוב חדש (startNextRound)
function playAgain() {
  document.getElementById('play-again-btn').classList.add('hidden');
  document.getElementById('starter-choice').classList.remove('hidden');
}

function goToStartFromModal() {
  document.getElementById('victory-modal').classList.add('hidden');
  goToStep(1);
}

function updateHeaderUI() {
  document.getElementById('p1-display-label').innerText = gameState.player1Name;
  document.getElementById('p2-display-label').innerText = gameState.player2Name;
  document.getElementById('p2-icon-header').innerText = gameState.gameMode === 'ai' ? "smart_toy" : "person_outline";
  document.getElementById('score-p1-num').innerText = gameState.scores[1];
  document.getElementById('score-p2-num').innerText = gameState.scores[2];
  document.getElementById('p1-score-text').innerText = winsText(gameState.scores[1]);
  document.getElementById('p2-score-text').innerText = winsText(gameState.scores[2]);

  if (!gameState.isGameOverHandled) {
    const computerTurn = gameState.gameMode === 'ai' && gameState.currentPlayer === 2;
    const curName = gameState.currentPlayer === 1 ? gameState.player1Name : gameState.player2Name;
    document.getElementById('turn-text').innerText = computerTurn ? I18N.t('computerThinking') : curName;
  }
  styleTurnBanner();
}

// הבאנר של התור: שחקן 1 בכחול והנקודה המהבהבת בתחילת השורה, שחקן 2 או המחשב בוורוד והנקודה בסוף השורה.
// בסוף הסיבוב הנקודה נעלמת, כי אין יותר תור
function styleTurnBanner() {
  const p1 = gameState.currentPlayer === 1;
  const showDot = !gameState.isGameOverHandled;
  document.getElementById('active-turn-banner').className =
    'w-[67.5%] flex items-center gap-[5px] py-[5px] px-6 rounded-xl border shadow-lg transition-colors ' +
    (p1 ? 'bg-player1/15 border-player1/50' : 'bg-secondary-container/30 border-secondary/40');
  document.getElementById('turn-text').className =
    // תמיד שורה אחת: שם ארוך מקבל שלוש נקודות, כך שהשורה לא משנה גובה והלוח לא קופץ
    'flex-1 min-w-0 truncate text-center text-base leading-[1.375rem] font-black tracking-wide ' + (p1 ? 'text-player1' : 'text-secondary');
  document.getElementById('turn-dot-start').classList.toggle('invisible', !(p1 && showDot));
  document.getElementById('turn-dot-end').classList.toggle('invisible', !(!p1 && showDot));
}

function winsText(n) {
  return n === 1 ? I18N.t('winsOne') : I18N.t('winsMany', { n });
}

let endTimer = null;

function checkWinnerAndHandle() {
  const remainingStars = gameState.board.flat().filter(Boolean).length;
  if (remainingStars > 1 || gameState.isGameOverHandled) return;
  gameState.isGameOverHandled = true;

  // נשארה כוכבית אחת: מי שהתור שלו לקחת אותה מפסיד, כלומר מי שביצע את המהלך האחרון מנצח.
  // (אם נלקחו כל הכוכביות במהלך אחד: מי שלקח את האחרונה מפסיד.)
  const winnerNum = remainingStars === 1
    ? gameState.currentPlayer
    : (gameState.currentPlayer === 1 ? 2 : 1);
  const winnerName = winnerNum === 1 ? gameState.player1Name : gameState.player2Name;
  // למחשב ניסוח בזכר בלבד; לשחקנים ניסוח ניטרלי (ניצח/ה)
  const isComputer = (num) => gameState.gameMode === 'ai' && num === 2;
  const winText = isComputer(winnerNum) ? I18N.t('winComputer', { name: winnerName }) : I18N.t('winPlayer', { name: winnerName });

  // הכוכבית האחרונה מהבהבת באדום 3 פעמים. שורת התור לא מקבלת טקסט ארוך, כדי שהלוח לא יקפוץ
  renderBoard();

  clearTimeout(endTimer);
  endTimer = setTimeout(() => {
    gameState.scores[winnerNum]++;
    gameState.currentPlayer = winnerNum;
    document.getElementById('turn-text').innerText = winnerName; // רק השם, כמו בכל תור
    updateHeaderUI();

    document.getElementById('modal-winner-title').innerText = winText;
    document.getElementById('modal-p1-name').innerText = gameState.player1Name;
    document.getElementById('modal-p2-name').innerText = gameState.player2Name;
    document.getElementById('next-starter-1-name').innerText = gameState.player1Name;
    document.getElementById('next-starter-2-name').innerText = gameState.player2Name;
    document.getElementById('next-starter-2-icon').innerText = gameState.gameMode === 'ai' ? 'smart_toy' : 'person_outline';
    document.getElementById('modal-p1-score').innerText = gameState.scores[1];
    document.getElementById('modal-p2-score').innerText = gameState.scores[2];
    // מסך הסיום נפתח תמיד במצב הראשון: "שחק שוב" ו"חזור להתחלה"
    document.getElementById('play-again-btn').classList.remove('hidden');
    document.getElementById('starter-choice').classList.add('hidden');
    document.getElementById('victory-modal').classList.remove('hidden');

    if (gameState.gameMode === 'ai' && winnerNum === 2) {
      playDefeatSound();
    } else {
      playVictorySound();
    }
  }, remainingStars === 1 ? 1600 : 0);
}

function renderBoard() {
  const container = document.getElementById('board-container');
  container.innerHTML = '';
  const isGameOver = gameState.isGameOverHandled;

  gameState.board.forEach((row, rowIndex) => {
    const isRowActiveSelection = gameState.selectedRow === rowIndex;
    const rowBox = document.createElement('div');
    rowBox.className = "inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl bg-[#171c2b] border border-white/10";
    const starsContainer = document.createElement('div');
    starsContainer.className = "flex justify-center items-center gap-2";

    row.forEach((active, colIndex) => {
      const isSelected = isRowActiveSelection && gameState.selectedIndices.includes(colIndex);
      if (!active) {
        const emptyStar = document.createElement('div');
        emptyStar.className = "w-9 h-9 flex items-center justify-center opacity-20";
        emptyStar.innerHTML = `<span class="material-symbols-outlined text-[18px] text-outline">close</span>`;
        starsContainer.appendChild(emptyStar);
      } else {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = `star-btn-${rowIndex}-${colIndex}`;

        if (isGameOver) {
          btn.className = "w-11 h-11 rounded-full flex items-center justify-center shadow-lg last-star-blink-3 cursor-default";
          btn.innerHTML = `<span class="material-symbols-outlined text-[26px]" style="font-variation-settings: 'FILL' 1;">star</span>`;
        } else if (isSelected) {
          btn.onclick = () => { playSelectSound(); toggleStar(rowIndex, colIndex); };
          btn.className = "w-9 h-9 rounded-full bg-pink-500/30 text-pink-300 border border-pink-400/60 flex items-center justify-center shadow scale-105 transition-all";
          btn.innerHTML = `<span class="material-symbols-outlined text-[20px] font-bold">close</span>`;
        } else {
          btn.onclick = () => { playSelectSound(); toggleStar(rowIndex, colIndex); };
          btn.className = "w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shadow hover:bg-white/20 transition-all border border-white/10";
          btn.innerHTML = `<span class="material-symbols-outlined text-[22px] text-primary" style="font-variation-settings: 'FILL' 1;">star</span>`;
        }
        if (gameState.currentPlayer === 2 && gameState.gameMode === 'ai' || isGameOver) btn.onclick = null;
        starsContainer.appendChild(btn);
      }
    });
    rowBox.appendChild(starsContainer);
    container.appendChild(rowBox);
  });

  // "שחק" פעיל רק בתור של שחקן אנושי, כשיש כוכביות מסומנות
  const canPlay = !gameState.isGameOverHandled && !gameState.busy && gameState.selectedIndices.length > 0 &&
    !(gameState.gameMode === 'ai' && gameState.currentPlayer === 2);
  const commitBtn = document.getElementById('commit-btn');
  commitBtn.disabled = !canPlay;
  commitBtn.classList.toggle('opacity-50', !canPlay);
  commitBtn.classList.toggle('cursor-not-allowed', !canPlay);

  // הכפתור העגול: מול המחשב "מהלך אחד לאחור" (או ביטול בחירה), ובשני שחקנים "התחל מחדש"
  const undoMode = gameState.gameMode === 'ai';
  const restartBtn = document.getElementById('restart-btn');
  document.getElementById('restart-icon').innerText = undoMode ? 'restore' : 'refresh';
  restartBtn.title = !undoMode ? I18N.t('restart')
    : (gameState.selectedIndices.length ? I18N.t('clearSelection') : I18N.t('undoMove'));
  restartBtn.setAttribute('aria-label', restartBtn.title);
  restartBtn.disabled = undoMode && !canUndo();
  restartBtn.classList.toggle('opacity-50', restartBtn.disabled);
  restartBtn.classList.toggle('cursor-not-allowed', restartBtn.disabled);

  styleTurnBanner();
}

function toggleStar(row, col) {
  if (gameState.busy || gameState.currentPlayer === 2 && gameState.gameMode === 'ai' || gameState.isGameOverHandled) return;
  if (gameState.selectedRow !== null && gameState.selectedRow !== row) gameState.selectedIndices = [];
  gameState.selectedRow = row;
  const indexInSelected = gameState.selectedIndices.indexOf(col);
  if (indexInSelected > -1) {
    gameState.selectedIndices.splice(indexInSelected, 1);
  } else {
    gameState.selectedIndices.push(col);
    gameState.selectedIndices.sort((a, b) => a - b);
  }
  // חוק הרצף: לחיצה ששוברת את הרצף מתחילה רצף חדש מהכוכבית שנלחצה
  if (RULES.contiguous && !isContiguous(gameState.selectedIndices)) gameState.selectedIndices = [col];
  if (gameState.selectedIndices.length === 0) gameState.selectedRow = null;
  renderBoard();
}

// רצף = מיקומים עוקבים. אפשר לבחור רק כוכביות זוהרות, ולכן כוכבית כבויה תמיד שוברת את הרצף
function isContiguous(cols) {
  return cols.every((c, i) => i === 0 || c === cols[i - 1] + 1);
}

function commitMove() {
  if (gameState.busy || (gameState.currentPlayer === 2 && gameState.gameMode === 'ai') || gameState.isGameOverHandled) return;
  if (gameState.selectedIndices.length === 0) return;
  if (RULES.contiguous && !isContiguous(gameState.selectedIndices)) return;

  const rIdx = gameState.selectedRow;
  const cIndices = [...gameState.selectedIndices];
  pushHistory();
  gameState.busy = true; // חוסם בחירה ולחיצה נוספת עד שהמהלך מסתיים

  playMultipleMoveSoundsAndClear(rIdx, cIndices, () => {
    gameState.busy = false;
    gameState.selectedRow = null;
    gameState.selectedIndices = [];
    checkWinnerAndHandle();
    if (!gameState.isGameOverHandled) {
      gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
      updateHeaderUI();
      renderBoard();
      if (gameState.currentPlayer === 2 && gameState.gameMode === 'ai') handleAiTurn();
    }
  });
}

// ================= מנוע המחשב =================
// המשחק שייך למשפחת "נים" בגרסת מיזר: מי שנשאר עם הכוכבית האחרונה מפסיד. אפשר לפתור אותו במדויק,
// ולכן המנוע יודע לכל לוח אם השחקן שבתור מנצח במשחק מושלם, ומהם המהלכים המנצחים.
// contiguous: true  = רק רצף של כוכביות זוהרות צמודות (חוק הרצף, כמו בהוראות)
// contiguous: false = מותר לקחת כל כוכביות מאותה שורה
const RULES = { contiguous: true };

// winIn1    - הסיכוי שהמחשב ינצל ניצחון מיידי (להשאיר ליריב כוכבית אחת)
// safe      - לא משאיר ליריב ניצחון מיידי
// pBest     - הסיכוי לבחור במהלך המושלם בכל תור
// perfectAt - כשנשארו כך או פחות כוכביות, המחשב משחק בלי טעויות
// tricky    - כשאין מהלך מנצח, בוחר את המהלך שהכי קשה ליריב למצוא נגדו תשובה נכונה
const AI_LEVELS = {
  1: { winIn1: 0.5, safe: false, pBest: 0,    perfectAt: 0 },                      // מתחיל
  2: { winIn1: 1,   safe: true,  pBest: 0,    perfectAt: 0 },                      // חובבן
  3: { winIn1: 1,   safe: true,  pBest: 0.35, perfectAt: 4 },                      // בינוני
  4: { winIn1: 1,   safe: true,  pBest: 0.5,  perfectAt: 5 },                      // מתקדם
  5: { winIn1: 1,   safe: true,  pBest: 1,    perfectAt: Infinity, tricky: true }  // אלוף
};

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const colRange = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const countStars = (board) => board.reduce((n, row) => n + row.filter(Boolean).length, 0);

// הלוח כקבוצות בלתי תלויות: כמות הכוכביות בכל שורה, או אורך כל רצף בחוק הרצף
function starGroups(board) {
  const groups = [];
  board.forEach(row => {
    if (RULES.contiguous) {
      let run = 0;
      row.forEach(lit => {
        if (lit) run++;
        else { if (run) groups.push(run); run = 0; }
      });
      if (run) groups.push(run);
    } else {
      const n = row.filter(Boolean).length;
      if (n) groups.push(n);
    }
  });
  return groups.sort((a, b) => a - b);
}

// האם השחקן שבתור מנצח במשחק מושלם? לוח ריק = היריב לקח את האחרונה = ניצחון
const winMemo = new Map();
function isWinningGroups(groups) {
  const key = (RULES.contiguous ? 'c:' : 'n:') + groups.join(',');
  if (winMemo.has(key)) return winMemo.get(key);
  let win = groups.length === 0;
  for (let i = 0; i < groups.length && !win; i++) {
    const g = groups[i];
    if (i > 0 && groups[i - 1] === g) continue; // קבוצה באותו גודל כבר נבדקה
    const rest = groups.slice(0, i).concat(groups.slice(i + 1));
    for (let take = 1; take <= g && !win; take++) {
      const maxLeft = RULES.contiguous ? Math.floor((g - take) / 2) : 0;
      for (let left = 0; left <= maxLeft && !win; left++) {
        const next = rest.slice();
        if (RULES.contiguous) {
          const right = g - take - left;
          if (left) next.push(left);
          if (right) next.push(right);
        } else if (g - take) {
          next.push(g - take);
        }
        if (!isWinningGroups(next.sort((a, b) => a - b))) win = true;
      }
    }
  }
  winMemo.set(key, win);
  return win;
}
const boardIsWin = (board) => isWinningGroups(starGroups(board));

// בחוק הרגיל לא משנה אילו כוכביות לוקחים מהשורה; מעדיפים צמודות כדי שייראה טבעי
function pickNimCols(row, lit, k) {
  const windows = [];
  for (let i = 0; i + k <= row.length; i++) {
    if (row.slice(i, i + k).every(Boolean)) windows.push(colRange(i, i + k - 1));
  }
  if (windows.length) return pickRandom(windows);
  const s = Math.floor(Math.random() * (lit.length - k + 1));
  return lit.slice(s, s + k);
}

// כל המהלכים החוקיים, עם הלוח שנוצר אחרי כל מהלך ומספר הכוכביות שנשארו
function listMoves(board) {
  const moves = [];
  board.forEach((row, r) => {
    if (RULES.contiguous) {
      for (let i = 0; i < row.length; i++) {
        for (let j = i; j < row.length && row[j]; j++) moves.push({ row: r, cols: colRange(i, j) });
      }
    } else {
      const lit = [];
      row.forEach((v, c) => { if (v) lit.push(c); });
      for (let k = 1; k <= lit.length; k++) moves.push({ row: r, cols: pickNimCols(row, lit, k) });
    }
  });
  moves.forEach(m => {
    m.next = board.map(row => row.slice());
    m.cols.forEach(c => { m.next[m.row][c] = false; });
    m.left = countStars(m.next);
  });
  return moves;
}

// עמדה מפסידה: המהלך שאחריו ליריב יש הכי מעט תשובות נכונות (בשוויון, לוקחים פחות כוכביות)
function trickiestMove(moves) {
  let bestScore = Infinity, pool = [];
  moves.forEach(m => {
    const replies = listMoves(m.next);
    const good = replies.filter(r => !boardIsWin(r.next)).length;
    const score = good / replies.length + m.cols.length * 0.0001;
    if (score < bestScore - 1e-9) { bestScore = score; pool = [m]; }
    else if (score < bestScore + 1e-9) pool.push(m);
  });
  return pickRandom(pool);
}

function chooseAiMove(board, level) {
  const cfg = AI_LEVELS[level] || AI_LEVELS[1];
  const all = listMoves(board);
  if (!all.length) return null;
  const moves = all.filter(m => m.left > 0); // לא לוקחים מרצון את הכוכבית האחרונה
  if (!moves.length) return pickRandom(all);

  // 1. ניצחון מיידי: להשאיר ליריב כוכבית אחת
  const winNow = moves.filter(m => m.left === 1);
  if (winNow.length && Math.random() < cfg.winIn1) return pickRandom(winNow);

  // 2. מהלך מושלם: משאיר ליריב עמדה מפסידה
  const best = moves.filter(m => !boardIsWin(m.next));
  if (best.length && (countStars(board) <= cfg.perfectAt || Math.random() < cfg.pBest)) return pickRandom(best);

  // 3. אלוף בעמדה מפסידה: מקשה על היריב ככל האפשר
  if (cfg.tricky && !best.length) return trickiestMove(moves);

  // 4. מהלך אקראי; מרמה 2 ומעלה בלי להשאיר ליריב ניצחון מיידי
  let pool = moves;
  if (cfg.safe) {
    const safe = moves.filter(m => !opponentCanWinNow(m.next));
    if (safe.length) pool = safe;
  }
  return pickRandom(pool);
}

// האם השחקן שבתור יכול להשאיר מיד כוכבית אחת: לקחת קבוצה שלמה כשבשאר הלוח נשארה כוכבית אחת,
// או כשנשארה קבוצה אחת בלבד, לקחת את כולה חוץ מכוכבית אחת בקצה
function opponentCanWinNow(board) {
  const groups = starGroups(board);
  const total = groups.reduce((a, b) => a + b, 0);
  if (groups.length === 1) return total >= 2;
  return groups.some(g => total - g === 1);
}

function handleAiTurn() {
  const round = gameState.roundId;
  gameState.busy = true;
  setTimeout(() => {
    if (round !== gameState.roundId || gameState.isGameOverHandled) return;
    const move = chooseAiMove(gameState.board, gameState.aiDifficultyLevel);
    if (!move) { gameState.busy = false; return; }
    pushHistory();
    // מציגים לרגע אילו כוכביות המחשב בחר, ואז הן מתפוצצות
    playSelectSound();
    gameState.selectedRow = move.row;
    gameState.selectedIndices = move.cols.slice();
    renderBoard();
    setTimeout(() => {
      if (round !== gameState.roundId) return;
      playMultipleMoveSoundsAndClear(move.row, move.cols, () => {
        gameState.busy = false;
        gameState.selectedRow = null;
        gameState.selectedIndices = [];
        checkWinnerAndHandle();
        if (!gameState.isGameOverHandled) {
          gameState.currentPlayer = 1;
          updateHeaderUI();
          renderBoard();
        }
      });
    }, 600);
  }, 700);
}

// ================= הדגמה =================
// משחק לדוגמה בפירמידה של 5 שורות, שמראה את סוגי המהלכים ואת סוף המשחק
const DEMO_STEPS = [
  { text: I18N.t('demo0') },
  { player: 1, row: 0, cols: [0], text: I18N.t('demo1') },
  { player: 2, row: 4, cols: [0, 1, 2], text: I18N.t('demo2') },
  { player: 1, row: 3, cols: [1, 2], text: I18N.t('demo3') },
  { player: 2, row: 3, cols: [0, 3], illegal: true, text: I18N.t('demo4') },
  { player: 2, row: 2, cols: [0, 1, 2], text: I18N.t('demo5') },
  { player: 1, row: 4, cols: [3, 4], text: I18N.t('demo6') },
  { player: 2, row: 3, cols: [0], text: I18N.t('demo7') },
  { player: 1, row: 1, cols: [0, 1], text: I18N.t('demo8') },
  { end: true, text: I18N.t('demo9') }
];
// token מתחלף בכל מעבר שלב או יציאה, וכך טיימרים ישנים לא ממשיכים לרוץ
const demo = { index: 0, playing: true, busy: false, token: 0 };

// הלוח לפני שלב מסוים: לוח מלא, בלי הכוכביות שהורדו במהלכים החוקיים שקדמו לו
function demoBoardBefore(index) {
  const board = Array.from({ length: 5 }, (_, i) => new Array(i + 1).fill(true));
  DEMO_STEPS.slice(0, index).forEach(s => {
    if (s.cols && !s.illegal) s.cols.forEach(c => { board[s.row][c] = false; });
  });
  return board;
}

function renderDemoBoard(board, step, phase) {
  const box = document.getElementById('demo-board');
  box.innerHTML = '';
  const starIcon = (size) => `<span class="material-symbols-outlined text-[${size}px]" style="font-variation-settings: 'FILL' 1;">star</span>`;
  board.forEach((row, r) => {
    const rowBox = document.createElement('div');
    rowBox.className = 'inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#171c2b] border border-white/10';
    row.forEach((lit, c) => {
      const cell = document.createElement('div');
      cell.id = `demo-star-${r}-${c}`;
      const picked = phase === 'select' && step.row === r && step.cols.includes(c);
      if (!lit) {
        cell.className = 'w-8 h-8 flex items-center justify-center opacity-20';
        cell.innerHTML = '<span class="material-symbols-outlined text-[16px] text-outline">close</span>';
      } else if (phase === 'end') {
        cell.className = 'w-8 h-8 rounded-full flex items-center justify-center shadow-lg last-star-blink-3';
        cell.innerHTML = starIcon(20);
      } else if (picked && step.illegal) {
        cell.className = 'w-8 h-8 rounded-full bg-red-500/25 text-red-300 border-2 border-red-400/80 flex items-center justify-center scale-105';
        cell.innerHTML = '<span class="material-symbols-outlined text-[18px] font-bold">block</span>';
      } else if (picked) {
        cell.className = 'w-8 h-8 rounded-full bg-pink-500/30 text-pink-300 border border-pink-400/60 flex items-center justify-center shadow scale-105';
        cell.innerHTML = '<span class="material-symbols-outlined text-[18px] font-bold">close</span>';
      } else {
        cell.className = 'w-8 h-8 rounded-full bg-white/10 text-primary flex items-center justify-center shadow border border-white/10';
        cell.innerHTML = starIcon(20);
      }
      rowBox.appendChild(cell);
    });
    box.appendChild(rowBox);
  });
}

function updateDemoCaption(step, index) {
  const pill = document.getElementById('demo-player');
  pill.innerText = step.end ? I18N.t('demoEnd') : step.player ? I18N.t('demoTurn', { n: step.player }) : I18N.t('demoOpening');
  pill.className = 'text-[11px] font-black px-2 py-0.5 rounded-full border ' + (
    step.player === 1 ? 'text-player1 border-player1/50 bg-player1/10'
    : step.player === 2 ? 'text-secondary border-secondary/50 bg-secondary/10'
    : 'text-amber-400 border-amber-400/50 bg-amber-400/10');
  document.getElementById('demo-counter').innerText = I18N.t('demoCounter', { i: index + 1, n: DEMO_STEPS.length });
  document.getElementById('demo-text').innerText = step.text;
}

function updateDemoPlayButton() {
  const atEnd = demo.index >= DEMO_STEPS.length - 1 && !demo.busy;
  document.getElementById('demo-play-icon').innerText = demo.playing ? 'pause' : (atEnd ? 'replay' : 'play_arrow');
}

// מציג שלב אחד: מסמן את הכוכביות שנבחרו, ואז הן מתפוצצות. מהלך אסור מסומן באדום ולא מתבצע
function playDemoStep(index) {
  const token = ++demo.token;
  const later = (ms, fn) => setTimeout(() => { if (token === demo.token) fn(); }, ms);
  const finish = (pauseMs) => {
    demo.busy = false;
    if (index >= DEMO_STEPS.length - 1) demo.playing = false;
    updateDemoPlayButton();
    if (demo.playing) later(pauseMs, () => { if (demo.playing) playDemoStep(index + 1); });
  };
  demo.index = index;
  demo.busy = true;
  const step = DEMO_STEPS[index];
  const board = demoBoardBefore(index);
  updateDemoCaption(step, index);
  updateDemoPlayButton();

  if (!step.cols) {                      // פתיחה או סוף המשחק
    renderDemoBoard(board, step, step.end ? 'end' : 'idle');
    finish(2600);
    return;
  }
  renderDemoBoard(board, step, 'select');
  if (step.illegal) {
    playErrorSound();
    later(2800, () => { renderDemoBoard(board, step, 'idle'); finish(600); });
    return;
  }
  playSelectSound();
  later(1300, () => {
    step.cols.forEach((c, i) => later(i * 300, () => {
      const el = document.getElementById(`demo-star-${step.row}-${c}`);
      if (el) el.classList.add('star-exploding');
      playosionSound();
    }));
    later(step.cols.length * 300 + 250, () => {
      step.cols.forEach(c => { board[step.row][c] = false; });
      renderDemoBoard(board, step, 'done');
      finish(1500);
    });
  });
}

function startDemo() {
  demo.playing = true;
  playDemoStep(0);
}

function demoStep(delta) {
  demo.playing = false;
  playDemoStep(Math.min(DEMO_STEPS.length - 1, Math.max(0, demo.index + delta)));
}

function demoTogglePlay() {
  if (demo.playing) { demo.playing = false; updateDemoPlayButton(); return; }
  demo.playing = true;
  updateDemoPlayButton();
  if (demo.busy) return;                  // השלב הנוכחי עוד רץ, וההדגמה תמשיך ממנו לבד
  playDemoStep(demo.index >= DEMO_STEPS.length - 1 ? 0 : demo.index + 1);
}

function playErrorSound() {
  if (!soundReady()) return;
  const now = audioCtx.currentTime;
  [0, 0.16].forEach(offset => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = 160;
    gain.gain.setValueAtTime(0.06, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now + offset);
    osc.stop(now + offset + 0.12);
  });
}

// ================= צליל =================
// מצב הצליל נשמר בטלפון, כך שהבחירה נשארת גם אחרי סגירת המשחק
let soundOn = true;
try { soundOn = localStorage.getItem('tts-sound') !== 'off'; } catch (e) {}

function applySoundState() {
  if (masterGain) masterGain.gain.value = soundOn ? 1 : 0;
  const btn = document.getElementById('sound-btn');
  document.getElementById('sound-off-line').classList.toggle('hidden', soundOn);
  document.getElementById('sound-icon').classList.toggle('opacity-50', !soundOn);
  btn.title = soundOn ? I18N.t('soundOn') : I18N.t('soundOff');
  btn.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
}

function toggleSound() {
  soundOn = !soundOn;
  try { localStorage.setItem('tts-sound', soundOn ? 'on' : 'off'); } catch (e) {}
  applySoundState();
  if (soundOn) playSelectSound();
}

applySoundState();
renderPyramidPreview(5);
resetCurrentRound();

// האם המשחק רץ כאפליקציה ארוזה (Capacitor) ולא בדפדפן. js/app.js משתמש בזה בשביל המנעול,
// מסך הפרטיות וכפתור "חזור". נבדק בכל קריאה, ולא פעם אחת, כדי שגשר שנטען רגע מאוחר לא יפספס
function isInApp() {
  return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' &&
    window.Capacitor.isNativePlatform());
}

// התקנה כאפליקציה ועבודה בלי אינטרנט (ב-https, או ב-localhost לבדיקות).
// ה-service worker שומר מראש את כל קובצי האתר (הרשימה ב-sw.js).
// באפליקציה לא רושמים אותו: הקבצים כבר בתוכה, והכתובת שם היא https://localhost
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    if (isInApp()) return;
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// ================= כפתורים =================
// הכפתורים בדף לא מחזיקים קוד (onclick), כי מדיניות האבטחה של הדף (CSP) חוסמת קוד שכתוב בתוך תגיות.
// כל כפתור מסמן data-action (שם הפעולה) ו-data-arg (הערך, אם יש), ומאזין אחד מפעיל את הפעולה
const ACTIONS = { selectGameMode, toggleSound, goToStep, goBackFromStep3, setAiDiff, setStarterPlayer, selectRows,
  applySetupAndStart, demoStep, demoTogglePlay, undoOrRestart, commitMove, startNextRound, playAgain, goToStartFromModal,
  toggleLang: () => I18N.toggle() };
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn || btn.disabled) return;
  const action = ACTIONS[btn.dataset.action];
  if (!action) return;
  const arg = btn.dataset.arg;
  if (arg === undefined) action();
  else action(/^-?\d+$/.test(arg) ? Number(arg) : arg);
});
