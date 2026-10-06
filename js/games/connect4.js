/* Connect 4: tap a column to drop your disc. Four in a row (any direction) wins.
   As soon as no four-in-a-row is possible for anyone, it's called a tie. */
(function () {
  'use strict';

  const COLS = 7;
  const ROWS = 6;

  // Every possible group of four cells. Used to spot an early tie.
  const WINDOWS = [];
  [[0, 1], [1, 0], [1, 1], [1, -1]].forEach(([dr, dc]) => {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const w = [];
      for (let k = 0; k < 4; k++) {
        const rr = r + dr * k;
        const cc = c + dc * k;
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) break;
        w.push(rr * COLS + cc);
      }
      if (w.length === 4) WINDOWS.push(w);
    }
  });

  function newRound(ctx) {
    const cells = Array(ROWS * COLS).fill(null);
    let turn = ctx.starter;
    let over = false;
    let busy = false;

    ctx.setShape(COLS / ROWS);
    let html = '<div class="c4" role="grid" aria-label="Connect 4 board">';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      html += '<div class="c4-cell" data-r="' + r + '" data-c="' + c + '"><span class="c4-hole"></span></div>';
    }
    html += '</div>';
    ctx.stage.innerHTML = html;
    const board = ctx.stage.querySelector('.c4');
    const cellEl = (r, c) => board.children[r * COLS + c];

    function runThrough(r, c, dr, dc) {
      const p = cells[r * COLS + c];
      const run = [[r, c]];
      for (const s of [1, -1]) {
        let rr = r + dr * s;
        let cc = c + dc * s;
        while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && cells[rr * COLS + cc] === p) {
          if (s === 1) run.push([rr, cc]); else run.unshift([rr, cc]);
          rr += dr * s;
          cc += dc * s;
        }
      }
      return run;
    }

    function winningRun(r, c) {
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const run = runThrough(r, c, dr, dc);
        if (run.length >= 4) return run;
      }
      return null;
    }

    function noOneCanWin() {
      return WINDOWS.every((w) => {
        const has0 = w.some((i) => cells[i] === 0);
        const has1 = w.some((i) => cells[i] === 1);
        return has0 && has1;
      });
    }

    function drawWinLine(run) {
      const box = board.getBoundingClientRect();
      const centre = ([r, c]) => {
        const b = cellEl(r, c).getBoundingClientRect();
        return [b.left - box.left + b.width / 2, b.top - box.top + b.height / 2];
      };
      const [x1, y1] = centre(run[0]);
      const [x2, y2] = centre(run[run.length - 1]);
      const d = 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'L' + x2.toFixed(1) + ' ' + y2.toFixed(1);
      const w = box.width;
      board.insertAdjacentHTML('beforeend',
        '<svg class="win-line" viewBox="0 0 ' + box.width.toFixed(1) + ' ' + box.height.toFixed(1) + '" aria-hidden="true">' +
        '<path class="edge" pathLength="1" style="stroke-width:' + (w * 0.034).toFixed(1) + 'px" d="' + d + '"/>' +
        '<path class="chalk" pathLength="1" style="stroke-width:' + (w * 0.02).toFixed(1) + 'px" d="' + d + '"/></svg>');
    }

    function afterDrop(r, c) {
      const run = winningRun(r, c);
      if (run) {
        over = true;
        run.forEach(([rr, cc]) => cellEl(rr, cc).classList.add('win'));
        board.classList.add('done');
        drawWinLine(run);
        ctx.finish(turn);
        return;
      }
      if (noOneCanWin()) {
        over = true;
        board.classList.add('done', 'draw');
        ctx.finish(null);
        return;
      }
      turn = 1 - turn;
      ctx.setTurn(turn);
    }

    function onTap(e) {
      const cell = e.target.closest('.c4-cell');
      if (!cell || over || busy) return;
      const c = +cell.dataset.c;
      let r = -1;
      for (let rr = ROWS - 1; rr >= 0; rr--) {
        if (cells[rr * COLS + c] === null) { r = rr; break; }
      }
      if (r < 0) return; // column full

      cells[r * COLS + c] = turn;
      const target = cellEl(r, c);
      target.querySelector('.c4-hole').innerHTML = ctx.disc(turn);
      target.setAttribute('aria-label', (turn ? 'Green' : 'Blue') + ' disc');
      ctx.sound.tap(turn);

      // Drop it in from above the board.
      const disc = target.querySelector('.disc');
      const fall = target.getBoundingClientRect().top - board.getBoundingClientRect().top + target.offsetHeight;
      const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (disc.animate && !reduce) {
        busy = true;
        const anim = disc.animate(
          [{ transform: 'translateY(' + (-fall) + 'px)' }, { transform: 'translateY(0)' }],
          { duration: 160 + r * 45, easing: 'cubic-bezier(.45, 0, 1, 1)' }
        );
        anim.onfinish = () => { busy = false; if (!over) afterDrop(r, c); };
      } else {
        afterDrop(r, c);
      }
    }

    board.addEventListener('click', onTap);
    ctx.setTurn(turn);
    return function cleanup() { board.removeEventListener('click', onTap); over = true; };
  }

  Arcade.registerGame({
    id: 'c4',
    newRound,
    seatIcon: (i) => Arcade.disc(i)
  });
})();
