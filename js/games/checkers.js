/* Checkers, official (American) rules:
   - Pieces move diagonally forward one square; kings move forward or back.
   - If you can jump, you must. Keep jumping with the same piece while you can.
   - Reach the far row to become a king (that ends the move).
   - Win by taking all the other pieces or leaving them with no moves.
   Player 1 (blue) starts at the bottom, Player 2 (green) at the top.
   Tap a piece to see where it can go. If a jump is required, the pieces that must jump light up. */
(function () {
  'use strict';

  const SIZE = 8;
  const CROWN = '<svg class="crown" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18 4.5 8l4.5 4L12 5l3 7 4.5-4L21 18z" fill="var(--gold)" stroke="var(--edge)" stroke-width="1.5" stroke-linejoin="round"/></svg>';

  function newRound(ctx) {
    // board[r][c] = null or { p: 0 | 1, king: bool }
    const board = [];
    for (let r = 0; r < SIZE; r++) {
      board.push([]);
      for (let c = 0; c < SIZE; c++) {
        let piece = null;
        if ((r + c) % 2 === 1) {
          if (r <= 2) piece = { p: 1, king: false };
          else if (r >= 5) piece = { p: 0, king: false };
        }
        board[r].push(piece);
      }
    }
    let turn = ctx.starter;
    let over = false;
    let selected = null;   // [r, c]
    let chain = false;     // in the middle of a multi-jump
    let lastMove = null;   // { from, to }
    let hintTimer = null;

    ctx.stage.innerHTML = '<div class="ck" role="grid" aria-label="Checkers board"></div>';
    const el = ctx.stage.querySelector('.ck');

    const inside = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;

    function directions(piece) {
      if (piece.king) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      const f = piece.p === 0 ? -1 : 1; // blue moves up the screen, green moves down
      return [[f, -1], [f, 1]];
    }

    function jumpsFrom(r, c) {
      const piece = board[r][c];
      const out = [];
      directions(piece).forEach(([dr, dc]) => {
        const mr = r + dr, mc = c + dc, tr = r + 2 * dr, tc = c + 2 * dc;
        if (inside(tr, tc) && board[mr][mc] && board[mr][mc].p !== piece.p && !board[tr][tc]) {
          out.push({ to: [tr, tc], cap: [mr, mc] });
        }
      });
      return out;
    }

    function stepsFrom(r, c) {
      const out = [];
      directions(board[r][c]).forEach(([dr, dc]) => {
        const tr = r + dr, tc = c + dc;
        if (inside(tr, tc) && !board[tr][tc]) out.push({ to: [tr, tc], cap: null });
      });
      return out;
    }

    // All legal moves for a player: jumps only, if any jump exists.
    function legalMoves(p) {
      const jumps = [];
      const steps = [];
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
        const piece = board[r][c];
        if (!piece || piece.p !== p) continue;
        jumpsFrom(r, c).forEach((m) => jumps.push(Object.assign({ from: [r, c] }, m)));
        stepsFrom(r, c).forEach((m) => steps.push(Object.assign({ from: [r, c] }, m)));
      }
      return jumps.length ? { moves: jumps, mustJump: true } : { moves: steps, mustJump: false };
    }

    function movesFor(r, c) {
      if (chain) {
        return selected && selected[0] === r && selected[1] === c
          ? jumpsFrom(r, c).map((m) => Object.assign({ from: [r, c] }, m)) : [];
      }
      return legalMoves(turn).moves.filter((m) => m.from[0] === r && m.from[1] === c);
    }

    const same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1];

    // flash: squares to call out, with a class ('must' = has to jump, 'nope' = can't move).
    function render(flash, flashClass) {
      const targets = selected ? movesFor(selected[0], selected[1]) : [];
      let html = '';
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
        const dark = (r + c) % 2 === 1;
        const piece = board[r][c];
        const cls = ['ck-sq', dark ? 'dark' : 'light'];
        if (lastMove && (same(lastMove.from, [r, c]) || same(lastMove.to, [r, c]))) cls.push('moved');
        if (targets.some((m) => same(m.to, [r, c]))) cls.push('target');
        let inner = '';
        if (piece) {
          const pc = ['ck-piece', 'p' + (piece.p + 1)];
          if (piece.king) pc.push('king');
          if (same(selected, [r, c])) pc.push('selected');
          if (flash && flash.some((f) => same(f, [r, c]))) pc.push(flashClass || 'must');
          inner = '<span class="' + pc.join(' ') + '">' + ctx.disc(piece.p) + (piece.king ? CROWN : '') + '</span>';
        }
        const label = piece ? (piece.p ? 'Green' : 'Blue') + (piece.king ? ' king' : ' piece') : (dark ? 'Empty' : '');
        html += '<div class="' + cls.join(' ') + '" data-r="' + r + '" data-c="' + c + '"' +
          (label ? ' aria-label="' + label + '"' : '') + '>' + inner + '</div>';
      }
      el.innerHTML = html;
    }

    function showMustJump() {
      const { moves } = legalMoves(turn);
      const froms = [];
      moves.forEach((m) => { if (!froms.some((f) => same(f, m.from))) froms.push(m.from); });
      // Only one piece can jump? Pick it up for him and show where it goes.
      if (froms.length === 1) { selected = froms[0]; }
      render(froms, 'must');
      clearTimeout(hintTimer);
      hintTimer = setTimeout(() => { if (!over) render(); }, 1400);
    }

    function endTurn() {
      selected = null;
      chain = false;
      const next = 1 - turn;
      if (legalMoves(next).moves.length === 0) {
        over = true;
        render();
        el.classList.add('done');
        ctx.finish(turn);
        return;
      }
      turn = next;
      render();
      ctx.setTurn(turn);
    }

    function doMove(m) {
      const [fr, fc] = m.from;
      const [tr, tc] = m.to;
      const piece = board[fr][fc];
      board[tr][tc] = piece;
      board[fr][fc] = null;
      if (m.cap) board[m.cap[0]][m.cap[1]] = null;
      lastMove = { from: m.from, to: m.to };
      ctx.sound.tap(turn);

      const crowned = !piece.king && ((piece.p === 0 && tr === 0) || (piece.p === 1 && tr === SIZE - 1));
      if (crowned) piece.king = true;

      if (m.cap && !crowned && jumpsFrom(tr, tc).length) {
        selected = [tr, tc];
        chain = true;
        render();
        ctx.setTurn(turn, 'Jump again!');
        return;
      }
      endTurn();
    }

    function onTap(e) {
      const sq = e.target.closest('.ck-sq');
      if (!sq || over) return;
      const r = +sq.dataset.r;
      const c = +sq.dataset.c;
      const piece = board[r][c];

      // Move the selected piece to a highlighted square.
      if (selected) {
        const m = movesFor(selected[0], selected[1]).find((x) => same(x.to, [r, c]));
        if (m) { doMove(m); return; }
      }
      if (chain) { render(); return; } // must keep jumping with the same piece

      if (piece && piece.p === turn) {
        if (movesFor(r, c).length) {
          selected = same(selected, [r, c]) ? null : [r, c];
          render();
        } else if (legalMoves(turn).mustJump) {
          selected = null;
          showMustJump();
        } else {
          selected = null;
          render([[r, c]], 'nope');
        }
        return;
      }
      selected = null;
      render();
    }

    el.addEventListener('click', onTap);
    render();
    ctx.setTurn(turn);

    return function cleanup() {
      clearTimeout(hintTimer);
      el.removeEventListener('click', onTap);
    };
  }

  Arcade.registerGame({
    id: 'checkers',
    newRound,
    seatIcon: (i) => Arcade.disc(i)
  });
})();
