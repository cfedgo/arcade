/* Luca's Games — the arcade shell.
   Handles players, scores, settings, sounds and screens.
   Each game lives in js/games/ and registers itself with Arcade.registerGame(). */
(function () {
  'use strict';

  const STORE_KEY = 'dinogarage.v1';
  const AVATARS = ['🦖', '🦕', '🚗', '🏎️', '🚙', '🚜', '🚒', '🚓'];

  /* ---------- Saved data (stays on this phone) ---------- */

  function defaults() {
    return {
      players: [{ name: '', avatar: '🦖' }, { name: '', avatar: '🚗' }],
      settings: { sound: false, faceToFace: true },
      scores: {},   // { gameId: { w: [p1Wins, p2Wins], t: ties } }
      starters: {}  // { gameId: 0 | 1 } who goes first next round
    };
  }

  function loadState() {
    const base = defaults();
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return base;
      const saved = JSON.parse(raw) || {};
      const players = Array.isArray(saved.players) && saved.players.length === 2
        ? saved.players.map((p, i) => ({
            name: typeof p.name === 'string' ? p.name.slice(0, 12) : '',
            avatar: AVATARS.includes(p.avatar) ? p.avatar : base.players[i].avatar
          }))
        : base.players;
      if (players[0].avatar === players[1].avatar) {
        players[1].avatar = AVATARS.find((a) => a !== players[0].avatar);
      }
      return {
        players,
        settings: Object.assign(base.settings, saved.settings || {}),
        scores: saved.scores && typeof saved.scores === 'object' ? saved.scores : {},
        starters: saved.starters && typeof saved.starters === 'object' ? saved.starters : {}
      };
    } catch (e) {
      return base;
    }
  }

  let state = loadState();

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage blocked: play on anyway */ }
  }

  function scoreFor(id) {
    const s = state.scores[id];
    return s && Array.isArray(s.w) ? s : { w: [0, 0], t: 0 };
  }

  function totals() {
    const out = { w: [0, 0], t: 0 };
    Object.keys(state.scores).forEach((id) => {
      const s = scoreFor(id);
      out.w[0] += s.w[0]; out.w[1] += s.w[1]; out.t += s.t;
    });
    return out;
  }

  function record(id, winner) {
    const s = scoreFor(id);
    const next = { w: [s.w[0], s.w[1]], t: s.t };
    if (winner === 0 || winner === 1) next.w[winner] += 1; else next.t += 1;
    state.scores[id] = next;
    save();
  }

  /* ---------- Sound: tiny retro beeps, off by default ---------- */

  const Sound = (function () {
    let ctx = null;
    function audio() {
      if (!state.settings.sound) return null;
      try {
        if (!ctx) {
          const C = window.AudioContext || window.webkitAudioContext;
          if (!C) return null;
          ctx = new C();
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
      } catch (e) { return null; }
    }
    function tone(freq, start, dur, type, vol) {
      const c = audio();
      if (!c) return;
      const t = c.currentTime + start;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    }
    return {
      tap(player) { tone(player === 0 ? 660 : 523, 0, 0.09, 'triangle', 0.09); },
      win() { [523, 659, 784, 1047].forEach((f, k) => tone(f, k * 0.11, 0.16, 'square', 0.04)); },
      tie() { tone(440, 0, 0.14, 'triangle', 0.08); tone(440, 0.2, 0.14, 'triangle', 0.08); },
      click() { tone(880, 0, 0.04, 'triangle', 0.05); }
    };
  })();

  /* ---------- Keep the screen awake during a game ---------- */

  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } else if (!on && wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch (e) { wakeLock = null; }
  }

  /* ---------- Player marks: Player 1 is always blue X, Player 2 always green O ---------- */

  const MARK_SHAPES = [
    '<path d="M24 24 76 76M76 24 24 76" stroke="var(--p1)" stroke-width="15" stroke-linecap="round" fill="none"/>',
    '<circle cx="50" cy="50" r="28" stroke="var(--p2)" stroke-width="14" fill="none"/>'
  ];
  const MARKS = MARK_SHAPES.map((shape, i) =>
    '<svg class="mark ' + (i ? 'o' : 'x') + '" viewBox="0 0 100 100" aria-hidden="true">' + shape + '</svg>');
  const disc = (i) => '<span class="disc p' + (i + 1) + '" aria-hidden="true"></span>';

  /* ---------- Pictures ---------- */

  const ICONS = {
    ttt: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M18 7v34M30 7v34M7 18h34M7 30h34" stroke="var(--ink)" stroke-width="3" stroke-linecap="round" fill="none" opacity=".55"/><circle cx="12" cy="12" r="4.5" fill="var(--p1)"/><circle cx="24" cy="24" r="4.5" fill="var(--p2)"/><circle cx="36" cy="36" r="4.5" fill="var(--p1)"/><circle cx="36" cy="12" r="4.5" fill="var(--p2)"/></svg>',
    dots: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="10" y="10" width="14" height="14" fill="var(--p2)" opacity=".45"/><path d="M10 10h14v14H10z" stroke="var(--p2)" stroke-width="3" fill="none"/><path d="M24 24h14M38 10v14" stroke="var(--p1)" stroke-width="3"/><g fill="var(--ink)"><circle cx="10" cy="10" r="3"/><circle cx="24" cy="10" r="3"/><circle cx="38" cy="10" r="3"/><circle cx="10" cy="24" r="3"/><circle cx="24" cy="24" r="3"/><circle cx="38" cy="24" r="3"/><circle cx="10" cy="38" r="3"/><circle cx="24" cy="38" r="3"/><circle cx="38" cy="38" r="3"/></g></svg>',
    c4: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="9" width="38" height="31" rx="4" fill="var(--line)"/><g fill="var(--bg)"><circle cx="13" cy="17" r="4"/><circle cx="24" cy="17" r="4"/><circle cx="35" cy="17" r="4"/><circle cx="35" cy="32" r="4"/></g><circle cx="13" cy="32" r="4" fill="var(--p1)"/><circle cx="24" cy="32" r="4" fill="var(--p2)"/></svg>',
    memory: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="10" width="17" height="26" rx="3" fill="var(--line)" transform="rotate(-8 14 23)"/><rect x="25" y="10" width="17" height="26" rx="3" fill="var(--ink)" transform="rotate(6 33 23)"/><circle cx="33.5" cy="23" r="4.5" fill="var(--p2)" transform="rotate(6 33 23)"/></svg>',
    checkers: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="6" width="36" height="36" rx="3" fill="var(--line)"/><g fill="var(--bg)"><rect x="6" y="6" width="9" height="9"/><rect x="24" y="6" width="9" height="9"/><rect x="15" y="15" width="9" height="9"/><rect x="33" y="15" width="9" height="9"/><rect x="6" y="24" width="9" height="9"/><rect x="24" y="24" width="9" height="9"/><rect x="15" y="33" width="9" height="9"/><rect x="33" y="33" width="9" height="9"/></g><circle cx="19.5" cy="19.5" r="3.6" fill="var(--p1)"/><circle cx="28.5" cy="37.5" r="3.6" fill="var(--p2)"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 11 12 4l8.5 7M6 9.5V20h4.5v-5.5h3V20H18V9.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M12 2.8v2.6M12 18.6v2.6M2.8 12h2.6M18.6 12h2.6M5.5 5.5l1.8 1.8M16.7 16.7l1.8 1.8M5.5 18.5l1.8-1.8M16.7 7.3l1.8-1.8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    again: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M19.5 4.5v4h-4" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  /* ---------- Game list (later games show as "Soon") ---------- */

  const games = [
    { id: 'ttt', name: 'Tic-Tac-Toe', icon: ICONS.ttt },
    { id: 'dots', name: 'Dots & Boxes', icon: ICONS.dots },
    { id: 'c4', name: 'Connect 4', icon: ICONS.c4 },
    { id: 'memory', name: 'Memory Match', icon: ICONS.memory },
    { id: 'checkers', name: 'Checkers', icon: ICONS.checkers }
  ];

  function registerGame(def) {
    const i = games.findIndex((g) => g.id === def.id);
    if (i >= 0) games[i] = Object.assign({}, games[i], def);
    else games.push(def);
  }

  /* ---------- Helpers ---------- */

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function playerName(i) {
    return state.players[i].name.trim() || 'Player ' + (i + 1);
  }

  function isStandalone() {
    return window.navigator.standalone === true ||
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  }

  /* ---------- Screens ---------- */

  let root = null;
  let current = 'home';
  let leaveCurrent = null;
  let pendingReload = false;

  function go(name, arg) {
    if (leaveCurrent) { leaveCurrent(); leaveCurrent = null; }
    if (pendingReload && name !== 'game') { location.reload(); return; }
    current = name;
    root.scrollTop = 0;
    root.classList.toggle('no-scroll', name === 'game');
    ({ home: screenHome, players: screenPlayers, settings: screenSettings, scores: screenScores, game: screenGame }[name] || screenHome)(arg);
  }

  function subBar(title) {
    return '<header class="bar"><button class="icon-btn back" data-go="home" aria-label="Back to games">' +
      ICONS.back + '</button><h2 class="bar-title">' + title + '</h2><span class="bar-spacer"></span></header>';
  }

  function screenHome() {
    const tot = totals();
    const p = state.players;
    const who = (i) =>
      '<span class="who p' + (i + 1) + '"><span class="av">' + p[i].avatar + '</span><span class="nm">' +
      esc(playerName(i)) + '</span></span>';

    const rows = games.map((g) => {
      if (!g.newRound) {
        return '<li><div class="game-row soon" aria-disabled="true"><span class="gicon">' + g.icon +
          '</span><span class="gname">' + g.name + '</span><span class="chip">Soon</span></div></li>';
      }
      const s = scoreFor(g.id);
      const played = s.w[0] + s.w[1] + s.t > 0;
      const rec = played
        ? '<span class="grec"><b class="p1c">' + s.w[0] + '</b><span>–</span><b class="p2c">' + s.w[1] + '</b></span>'
        : '<span class="grec go">' + ICONS.chevron + '</span>';
      return '<li><button class="game-row" data-play="' + g.id + '"><span class="gicon">' + g.icon +
        '</span><span class="gname">' + g.name + '</span>' + rec + '</button></li>';
    }).join('');

    root.innerHTML =
      '<main class="screen home">' +
        '<header class="home-head">' +
          '<h1 class="logo"><span class="l1">Luca\u2019s</span><span class="l2">Games</span></h1>' +
          '<button class="icon-btn" data-go="settings" aria-label="Settings">' + ICONS.gear + '</button>' +
        '</header>' +
        '<button class="matchup" data-go="players" aria-label="Change players">' +
          who(0) + '<span class="vs">vs</span>' + who(1) +
        '</button>' +
        '<ul class="game-list">' + rows + '</ul>' +
        '<button class="score-strip" data-go="scores">' +
          '<span class="label">Scoreboard</span>' +
          '<span class="tally"><span class="av">' + p[0].avatar + '</span><b class="p1c">' + tot.w[0] +
          '</b><span class="dash">–</span><b class="p2c">' + tot.w[1] + '</b><span class="av">' + p[1].avatar + '</span></span>' +
        '</button>' +
      '</main>';
  }

  function screenPlayers() {
    const card = (i) => {
      const other = state.players[1 - i].avatar;
      const opts = AVATARS.map((a) => {
        const on = state.players[i].avatar === a;
        const taken = other === a;
        return '<button class="av-opt' + (on ? ' on' : '') + '" data-avatar="' + i + '" data-val="' + a + '"' +
          (taken ? ' disabled aria-label="' + a + ' taken"' : ' aria-pressed="' + on + '"') + '>' + a + '</button>';
      }).join('');
      return '<section class="pcard p' + (i + 1) + '">' +
        '<div class="pcard-head"><span class="av big">' + state.players[i].avatar + '</span>' +
        '<label for="name-' + i + '">Player ' + (i + 1) + '</label></div>' +
        '<input id="name-' + i + '" class="name-input" type="text" maxlength="12" autocomplete="off" autocapitalize="words" ' +
        'placeholder="' + (i === 0 ? 'Dad' : 'Name') + '" value="' + esc(state.players[i].name) + '" data-name="' + i + '">' +
        '<div class="av-grid">' + opts + '</div>' +
      '</section>';
    };
    root.innerHTML =
      '<main class="screen sub">' + subBar('Players') +
        '<p class="hint">Player 1 sits at the bottom of the screen, Player 2 at the top.</p>' +
        card(0) + card(1) +
        '<button class="primary" data-go="home">Done</button>' +
      '</main>';
  }

  function screenSettings() {
    const sw = (key, label, note) =>
      '<button class="setting" role="switch" aria-checked="' + !!state.settings[key] + '" data-toggle="' + key + '">' +
        '<span class="setting-text"><span class="setting-label">' + label + '</span><span class="setting-note">' + note + '</span></span>' +
        '<span class="switch" aria-hidden="true"><span></span></span>' +
      '</button>';
    const install = isStandalone() ? '' :
      '<section class="panel"><h3>Put it on your home screen</h3>' +
      '<p>Open this page in Safari, tap the Share button, then tap <b>Add to Home Screen</b>. ' +
      'It will open full-screen like an app and work without signal.</p></section>';
    root.innerHTML =
      '<main class="screen sub">' + subBar('Settings') +
        sw('sound', 'Sounds', 'Little retro beeps. Off keeps the table quiet.') +
        sw('faceToFace', 'Across the table', 'Flips Player 2’s side so it reads right from across the table.') +
        install +
        '<p class="fineprint">Luca\u2019s Games · version 6 · no ads, no accounts, nothing leaves this phone.</p>' +
      '</main>';
  }

  function screenScores() {
    const p = state.players;
    const rows = games.filter((g) => g.newRound).map((g) => {
      const s = scoreFor(g.id);
      return '<tr><th scope="row"><span class="gicon sm">' + g.icon + '</span>' + g.name + '</th>' +
        '<td class="p1c">' + s.w[0] + '</td><td class="tie">' + s.t + '</td><td class="p2c">' + s.w[1] + '</td></tr>';
    }).join('');
    const tot = totals();
    root.innerHTML =
      '<main class="screen sub">' + subBar('Scoreboard') +
        '<div class="table-wrap"><table class="scores">' +
          '<thead><tr><th scope="col"><span class="sr">Game</span></th>' +
          '<th scope="col" class="p1c"><span class="av">' + p[0].avatar + '</span><span class="col-name">' + esc(playerName(0)) + '</span></th>' +
          '<th scope="col" class="tie">Ties</th>' +
          '<th scope="col" class="p2c"><span class="av">' + p[1].avatar + '</span><span class="col-name">' + esc(playerName(1)) + '</span></th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
          '<tfoot><tr><th scope="row">All games</th><td class="p1c">' + tot.w[0] + '</td><td class="tie">' + tot.t +
          '</td><td class="p2c">' + tot.w[1] + '</td></tr></tfoot>' +
        '</table></div>' +
        '<button class="danger" data-reset>Reset scores</button>' +
      '</main>';
  }

  function screenGame(id) {
    const g = games.find((x) => x.id === id && x.newRound);
    if (!g) { go('home'); return; }
    const p = state.players;
    // Seats show the player's game piece: X / O by default, or the game's own (discs).
    const seatPiece = (i) => '<span class="av piece-badge">' + (g.seatIcon ? g.seatIcon(i) : MARKS[i]) + '</span>';
    const seat = (i, pos) =>
      '<div class="seat seat-' + pos + ' p' + (i + 1) + '" data-seat="' + i + '">' +
        seatPiece(i) +
        '<span class="seat-text"><span class="nm">' + esc(playerName(i)) + '</span>' +
        '<span class="status"></span></span>' +
        '<span class="seat-tally" hidden></span>' +
        '<span class="seat-score" aria-label="Wins"></span>' +
      '</div>';

    root.innerHTML =
      '<main class="screen game' + (state.settings.faceToFace ? ' f2f' : '') + '" data-game="' + g.id + '">' +
        '<header class="bar"><button class="icon-btn" data-go="home" aria-label="Home">' + ICONS.home + '</button>' +
          '<h2 class="bar-title">' + g.name + '</h2>' +
          '<button class="icon-btn" data-restart aria-label="Start this game over">' + ICONS.again + '</button></header>' +
        seat(1, 'top') +
        '<div class="stage"><div class="board-slot"></div>' +
          '<div class="action-row">' +
            '<button class="again-btn" data-again hidden>' + ICONS.again + '<span>Again</span></button>' +
          '</div>' +
        '</div>' +
        seat(0, 'bottom') +
        '<div class="game-foot"><button class="reset-score" data-reset-score hidden>Reset score</button></div>' +
      '</main>';

    const screen = root.querySelector('.game');
    const slot = screen.querySelector('.board-slot');
    const againBtn = screen.querySelector('[data-again]');
    const resetBtn = screen.querySelector('[data-reset-score]');
    let resetTimer = null;
    const seats = [screen.querySelector('[data-seat="0"]'), screen.querySelector('[data-seat="1"]')];
    let roundCleanup = null;
    let finished = false;
    let againTimer = null;

    function updateMini() {
      const s = scoreFor(g.id);
      seats.forEach((el, k) => {
        const n = s.w[k];
        el.querySelector('.seat-score').innerHTML = n > 0 ? '<span class="trophy">🏆</span>' + n : '';
        el.querySelector('.seat-score').setAttribute('aria-label', n + (n === 1 ? ' win' : ' wins'));
      });
    }

    function hasScore() {
      const s = scoreFor(g.id);
      return s.w[0] + s.w[1] + s.t > 0;
    }

    function disarmReset() {
      clearTimeout(resetTimer);
      resetBtn.dataset.armed = '';
      resetBtn.textContent = 'Reset score';
      resetBtn.classList.remove('armed');
    }

    function setStatus(i, text) { seats[i].querySelector('.status').textContent = text; }

    function startRound() {
      if (roundCleanup) { roundCleanup(); roundCleanup = null; }
      clearTimeout(againTimer);
      finished = false;
      againBtn.hidden = true;
      disarmReset();
      resetBtn.hidden = !hasScore();
      screen.classList.remove('over');
      seats.forEach((s, k) => {
        s.classList.remove('active', 'won', 'lost', 'tied');
        setStatus(k, '');
        const t = s.querySelector('.seat-tally');
        t.hidden = true;
        t.textContent = '';
      });
      const starter = state.starters[g.id] === 1 ? 1 : 0;
      slot.innerHTML = '';
      slot.className = 'board-slot';
      slot.removeAttribute('style');
      const ctx = {
        players: p.map((x) => ({ avatar: x.avatar, name: x.name })),
        starter,
        stage: slot,
        sound: Sound,
        marks: MARKS,
        markShapes: MARK_SHAPES,
        disc,
        // Board shape, as width / height (Connect 4 is 7 / 6). Square by default.
        setShape(ratio) { slot.style.setProperty('--ar', String(ratio)); },
        setTurn(i, text) {
          if (finished) return;
          seats.forEach((s, k) => s.classList.toggle('active', k === i));
          setStatus(i, text || 'Your turn');
          setStatus(1 - i, '');
        },
        // A running count shown in the seat during the round (boxes, pairs).
        setTally(i, n) {
          const t = seats[i].querySelector('.seat-tally');
          t.hidden = false;
          t.textContent = n;
        },
        finish(winner) {
          if (finished) return;
          finished = true;
          record(g.id, winner);
          state.starters[g.id] = 1 - starter;
          save();
          screen.classList.add('over');
          seats.forEach((s) => s.classList.remove('active'));
          if (winner === 0 || winner === 1) {
            seats[winner].classList.add('won');
            seats[1 - winner].classList.add('lost');
            setStatus(winner, 'Winner! 🏆');
            setStatus(1 - winner, '');
            Sound.win();
          } else {
            seats.forEach((s, k) => { s.classList.add('tied'); setStatus(k, 'Tie!'); });
            Sound.tie();
          }
          updateMini();
          disarmReset();
          resetBtn.hidden = true;
          againTimer = setTimeout(() => { againBtn.hidden = false; }, 600);
        }
      };
      roundCleanup = g.newRound(ctx) || null;
    }

    againBtn.addEventListener('click', () => { Sound.click(); startRound(); });

    // Reset this game's score. Two taps, so a stray finger can't wipe it.
    resetBtn.addEventListener('click', () => {
      if (resetBtn.dataset.armed === '1') {
        delete state.scores[g.id];
        save();
        updateMini();
        disarmReset();
        resetBtn.hidden = true;
        Sound.click();
        return;
      }
      resetBtn.dataset.armed = '1';
      resetBtn.textContent = 'Tap again to reset';
      resetBtn.classList.add('armed');
      resetTimer = setTimeout(disarmReset, 3000);
    });
    // Start over mid-game: clears the board, doesn't count as a game.
    screen.querySelector('[data-restart]').addEventListener('click', () => { Sound.click(); startRound(); });

    updateMini();
    startRound();
    keepAwake(true);

    leaveCurrent = () => {
      clearTimeout(againTimer);
      clearTimeout(resetTimer);
      if (roundCleanup) roundCleanup();
      keepAwake(false);
    };
  }

  /* ---------- Taps ---------- */

  function onClick(e) {
    const t = e.target;
    const goBtn = t.closest('[data-go]');
    if (goBtn) { Sound.click(); go(goBtn.dataset.go); return; }

    const play = t.closest('[data-play]');
    if (play) { Sound.click(); go('game', play.dataset.play); return; }

    const av = t.closest('[data-avatar]');
    if (av && !av.disabled) {
      state.players[+av.dataset.avatar].avatar = av.dataset.val;
      save();
      Sound.click();
      screenPlayers();
      return;
    }

    const tog = t.closest('[data-toggle]');
    if (tog) {
      const key = tog.dataset.toggle;
      state.settings[key] = !state.settings[key];
      save();
      tog.setAttribute('aria-checked', String(state.settings[key]));
      Sound.click();
      return;
    }

    const reset = t.closest('[data-reset]');
    if (reset) {
      if (reset.dataset.armed === '1') {
        state.scores = {};
        save();
        screenScores();
      } else {
        reset.dataset.armed = '1';
        reset.textContent = 'Tap again to erase all scores';
        setTimeout(() => {
          if (reset.isConnected) { reset.dataset.armed = ''; reset.textContent = 'Reset scores'; }
        }, 3000);
      }
    }
  }

  function onInput(e) {
    const t = e.target;
    if (t.matches('[data-name]')) {
      state.players[+t.dataset.name].name = t.value.slice(0, 12);
      save();
    }
  }

  /* ---------- Offline support ---------- */

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    if (window.self !== window.top) return; // skip inside previews
    // When a new version arrives, switch to it — but never in the middle of a game.
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController) return; // first install, nothing to refresh
      if (current === 'game') pendingReload = true;
      else location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then((reg) => reg.update())
        .catch(() => {});
    });
  }

  function start() {
    root = document.getElementById('app');
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && current === 'game') keepAwake(true);
    });
    go('home');
    registerServiceWorker();
  }

  window.Arcade = { registerGame, start, MARKS, MARK_SHAPES, disc };
})();
