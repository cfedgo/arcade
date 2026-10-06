/* Tic-Tac-Toe: take turns placing your dino or car. Three in a row wins. */
(function () {
  'use strict';

  const LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

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

    function winningLine() {
      return LINES.find(([a, b, c]) => cells[a] !== null && cells[a] === cells[b] && cells[a] === cells[c]) || null;
    }

    function onTap(e) {
      const btn = e.target.closest('.ttt-cell');
      if (!btn || over) return;
      const i = +btn.dataset.i;
      if (cells[i] !== null) return;

      cells[i] = turn;
      btn.classList.add('taken', 'p' + (turn + 1));
      btn.innerHTML = '<span class="piece">' + ctx.players[turn].avatar + '</span>';
      btn.setAttribute('aria-label', ctx.players[turn].avatar + ' on square ' + (i + 1));
      ctx.sound.tap(turn);

      const line = winningLine();
      if (line) {
        over = true;
        line.forEach((k) => buttons[k].classList.add('win'));
        board.classList.add('done');
        ctx.finish(turn);
      } else if (cells.every((c) => c !== null)) {
        over = true;
        board.classList.add('done', 'draw');
        ctx.finish(null);
      } else {
        turn = 1 - turn;
        ctx.setTurn(turn);
      }
    }

    board.addEventListener('click', onTap);
    ctx.setTurn(turn);

    return function cleanup() { board.removeEventListener('click', onTap); };
  }

  Arcade.registerGame({ id: 'ttt', newRound });
})();
