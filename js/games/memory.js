/* Memory Match: 16 cards, 8 pairs of dinos and cars.
   Flip two cards. A match is yours and you go again; no match flips back and it's the other player's turn. */
(function () {
  'use strict';

  const PICS = ['🦖', '🦕', '🚗', '🏎️', '🚙', '🚜', '🚒', '🚓'];
  const PEEK_MS = 1200; // how long a non-match stays face up

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function newRound(ctx) {
    const deck = shuffle(PICS.concat(PICS));
    const owner = Array(deck.length).fill(null);
    const counts = [0, 0];
    let up = [];
    let turn = ctx.starter;
    let busy = false;
    let over = false;
    let timer = null;

    ctx.stage.innerHTML =
      '<div class="mem" role="grid" aria-label="Memory cards">' +
      deck.map((pic, i) =>
        '<button class="mem-card" data-i="' + i + '" aria-label="Card ' + (i + 1) + ', face down">' +
          '<span class="mem-inner">' +
            '<span class="mem-face mem-back" aria-hidden="true"></span>' +
            '<span class="mem-face mem-front" aria-hidden="true">' + pic + '</span>' +
          '</span>' +
        '</button>').join('') +
      '</div>';
    const grid = ctx.stage.querySelector('.mem');
    const cards = Array.from(grid.children);

    ctx.setTally(0, 0);
    ctx.setTally(1, 0);

    function flip(i, faceUp) {
      cards[i].classList.toggle('up', faceUp);
      cards[i].setAttribute('aria-label', faceUp ? deck[i] : 'Card ' + (i + 1) + ', face down');
    }

    function onTap(e) {
      const card = e.target.closest('.mem-card');
      if (!card || busy || over) return;
      const i = +card.dataset.i;
      if (owner[i] !== null || up.includes(i)) return;

      flip(i, true);
      up.push(i);
      ctx.sound.tap(turn);
      if (up.length < 2) return;

      const [a, b] = up;
      up = [];
      if (deck[a] === deck[b]) {
        owner[a] = owner[b] = turn;
        cards[a].classList.add('found', 'p' + (turn + 1));
        cards[b].classList.add('found', 'p' + (turn + 1));
        counts[turn] += 1;
        ctx.setTally(turn, counts[turn]);
        if (owner.every((o) => o !== null)) {
          over = true;
          ctx.finish(counts[0] === counts[1] ? null : (counts[0] > counts[1] ? 0 : 1));
          return;
        }
        ctx.setTurn(turn, 'Go again!');
      } else {
        busy = true;
        grid.classList.add('peeking');
        timer = setTimeout(() => {
          flip(a, false);
          flip(b, false);
          grid.classList.remove('peeking');
          busy = false;
          turn = 1 - turn;
          ctx.setTurn(turn);
        }, PEEK_MS);
      }
    }

    grid.addEventListener('click', onTap);
    ctx.setTurn(turn);
    return function cleanup() {
      clearTimeout(timer);
      grid.removeEventListener('click', onTap);
    };
  }

  Arcade.registerGame({ id: 'memory', newRound });
})();
