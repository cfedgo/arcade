/* Tic-Tac-Toe: Player 1 is X, Player 2 is O. Three in a row wins.
   As soon as nobody can win anymore, the game is called a tie. */
(function () {
  'use strict';

  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  const MARKS = [
    '<svg class="mark x" viewBox="0 0 100 100" aria-hidden="true"><path d="M24 24 76 76M76 24 24 76" stroke="var(--p1)" stroke-width="15" stroke-linecap="round" fill="none"/></svg>',
    '<svg class="mark o" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="28" stroke="var(--p2)" stroke-width="14" fill="none"/></svg>'
  ];
  const NAMES = ['X', 'O'];

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
    newRound,
    seatIcon: (i) => MARKS[i]
  });
})();
