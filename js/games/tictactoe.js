/* Tic-Tac-Toe: Player 1 is X, Player 2 is O. Three in a row wins.
   As soon as nobody can win anymore, the game is called a tie. */
(function () {
  'use strict';

  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  const MARKS = Arcade.MARKS;
  const NAMES = ['X', 'O'];

  // A line through the winning three, drawn on top of the board (board is 100 x 100 units).
  // Cell centers sit at 15.5, 50 and 84.5 because of the gaps between cells.
  const CENTER = [15.5, 50, 84.5];
  function winLineSvg(line) {
    const pt = (i) => [CENTER[i % 3], CENTER[Math.floor(i / 3)]];
    const [x1, y1] = pt(line[0]);
    const [x2, y2] = pt(line[2]);
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ext = 9; // run a little past the outer pieces
    const dx = (x2 - x1) / len * ext;
    const dy = (y2 - y1) / len * ext;
    const d = 'M' + (x1 - dx).toFixed(1) + ' ' + (y1 - dy).toFixed(1) + 'L' + (x2 + dx).toFixed(1) + ' ' + (y2 + dy).toFixed(1);
    return '<svg class="win-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
      '<path class="edge" pathLength="1" d="' + d + '"/><path class="chalk" pathLength="1" d="' + d + '"/></svg>';
  }

  function winnerOf(cells) {
    for (const [a, b, c] of LINES) {
      if (cells[a] !== null && cells[a] === cells[b] && cells[a] === cells[c]) return [a, b, c];
    }
    return null;
  }

  // Could anyone still get three in a row, if the rest of the game is played out any way at all?
  function someoneCanStillWin(cells, turn) {
    for (let i = 0; i < 9; i++) {
      if (cells[i] !== null) continue;
      cells[i] = turn;
      const won = winnerOf(cells) !== null || someoneCanStillWin(cells, 1 - turn);
      cells[i] = null;
      if (won) return true;
    }
    return false;
  }

  function newRound(ctx) {
    const cells = Array(9).fill(null);
    let turn = ctx.starter;
    let over = false;

    ctx.stage.classList.add('square');
    ctx.stage.innerHTML =
      '<div class="ttt" role="grid" aria-label="Tic-Tac-Toe board">' +
      cells.map((_, i) => '<button class="ttt-cell" data-i="' + i + '" aria-label="Empty square ' + (i + 1) + '"></button>').join('') +
      '</div>';
    const board = ctx.stage.querySelector('.ttt');
    const buttons = Array.from(board.children);

    function onTap(e) {
      const btn = e.target.closest('.ttt-cell');
      if (!btn || over) return;
      const i = +btn.dataset.i;
      if (cells[i] !== null) return;

      cells[i] = turn;
      btn.classList.add('taken', 'p' + (turn + 1));
      btn.innerHTML = '<span class="piece">' + MARKS[turn] + '</span>';
      btn.setAttribute('aria-label', NAMES[turn] + ' on square ' + (i + 1));
      ctx.sound.tap(turn);

      const line = winnerOf(cells);
      if (line) {
        over = true;
        line.forEach((k) => buttons[k].classList.add('win'));
        board.classList.add('done');
        board.insertAdjacentHTML('beforeend', winLineSvg(line));
        ctx.finish(turn);
        return;
      }
      if (!someoneCanStillWin(cells, 1 - turn)) {
        over = true;
        board.classList.add('done', 'draw');
        ctx.finish(null);
        return;
      }
      turn = 1 - turn;
      ctx.setTurn(turn);
    }

    board.addEventListener('click', onTap);
    ctx.setTurn(turn);

    return function cleanup() { board.removeEventListener('click', onTap); };
  }

  Arcade.registerGame({
    id: 'ttt',
    newRound
  });
})();
