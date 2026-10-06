/* Dots & Boxes (3 x 3 boxes).
   Take turns drawing a line between two dots. Close a box and it's yours, and you go again.
   Taps are forgiving: the nearest open line to your finger gets drawn. */
(function () {
  'use strict';

  const N = 3;                 // boxes per side
  const M = 10;                // margin, in board units (board is 100 x 100)
  const S = (100 - 2 * M) / N; // distance between dots
  const at = (k) => M + k * S;

  function newRound(ctx) {
    // Every line as a segment. Horizontal lines: h-r-c (r = 0..N, c = 0..N-1). Vertical: v-r-c (r = 0..N-1, c = 0..N).
    const lines = [];
    for (let r = 0; r <= N; r++) for (let c = 0; c < N; c++) {
      lines.push({ id: 'h-' + r + '-' + c, x1: at(c), y1: at(r), x2: at(c + 1), y2: at(r), owner: null });
    }
    for (let r = 0; r < N; r++) for (let c = 0; c <= N; c++) {
      lines.push({ id: 'v-' + r + '-' + c, x1: at(c), y1: at(r), x2: at(c), y2: at(r + 1), owner: null });
    }
    const byId = {};
    lines.forEach((l) => { byId[l.id] = l; });
    const boxes = Array(N * N).fill(null);
    const counts = [0, 0];
    let turn = ctx.starter;
    let over = false;

    let svg = '<svg class="dots" viewBox="0 0 100 100" role="img" aria-label="Dots and Boxes board">';
    svg += '<g class="boxes">';
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      svg += '<g class="box" id="dots-box-' + r + '-' + c + '"></g>';
    }
    svg += '</g><g class="lines">';
    lines.forEach((l) => {
      svg += '<path class="ln" data-id="' + l.id + '" pathLength="1" d="M' + l.x1 + ' ' + l.y1 + 'L' + l.x2 + ' ' + l.y2 + '"/>';
    });
    svg += '</g><g class="dot-points">';
    for (let r = 0; r <= N; r++) for (let c = 0; c <= N; c++) {
      svg += '<circle cx="' + at(c) + '" cy="' + at(r) + '" r="2.4"/>';
    }
    svg += '</g></svg>';
    ctx.stage.innerHTML = svg;
    const el = ctx.stage.querySelector('.dots');

    ctx.setTally(0, 0);
    ctx.setTally(1, 0);

    function distToSegment(px, py, l) {
      const dx = l.x2 - l.x1;
      const dy = l.y2 - l.y1;
      const t = Math.max(0, Math.min(1, ((px - l.x1) * dx + (py - l.y1) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(px - (l.x1 + t * dx), py - (l.y1 + t * dy));
    }

    function boxDone(r, c) {
      return byId['h-' + r + '-' + c].owner !== null && byId['h-' + (r + 1) + '-' + c].owner !== null &&
        byId['v-' + r + '-' + c].owner !== null && byId['v-' + r + '-' + (c + 1)].owner !== null;
    }

    // Boxes touching a line.
    function neighbours(id) {
      const [kind, r, c] = id.split('-').map((v, i) => (i ? +v : v));
      const out = [];
      if (kind === 'h') {
        if (r > 0) out.push([r - 1, c]);
        if (r < N) out.push([r, c]);
      } else {
        if (c > 0) out.push([r, c - 1]);
        if (c < N) out.push([r, c]);
      }
      return out;
    }

    function claimBox(r, c, player) {
      boxes[r * N + c] = player;
      counts[player] += 1;
      ctx.setTally(player, counts[player]);
      const pad = S * 0.2;
      const g = el.querySelector('#dots-box-' + r + '-' + c);
      g.setAttribute('class', 'box owned p' + (player + 1));
      g.innerHTML =
        '<rect x="' + (at(c) + 1.2) + '" y="' + (at(r) + 1.2) + '" width="' + (S - 2.4) + '" height="' + (S - 2.4) + '" rx="2"/>' +
        '<svg x="' + (at(c) + pad) + '" y="' + (at(r) + pad) + '" width="' + (S - 2 * pad) + '" height="' + (S - 2 * pad) +
        '" viewBox="0 0 100 100">' + ctx.markShapes[player] + '</svg>';
    }

    function onTap(e) {
      if (over) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width * 100;
      const py = (e.clientY - rect.top) / rect.height * 100;

      let best = null;
      let bestD = Infinity;
      lines.forEach((l) => {
        if (l.owner !== null) return;
        const d = distToSegment(px, py, l);
        if (d < bestD) { bestD = d; best = l; }
      });
      if (!best || bestD > S * 0.45) return;

      best.owner = turn;
      const path = el.querySelector('[data-id="' + best.id + '"]');
      path.setAttribute('class', 'ln drawn p' + (turn + 1));
      el.querySelectorAll('.ln.last').forEach((p) => p.classList.remove('last'));
      path.classList.add('last');
      ctx.sound.tap(turn);

      let closed = 0;
      neighbours(best.id).forEach(([r, c]) => {
        if (boxes[r * N + c] === null && boxDone(r, c)) { claimBox(r, c, turn); closed += 1; }
      });

      if (boxes.every((b) => b !== null)) {
        over = true;
        el.classList.add('done');
        ctx.finish(counts[0] === counts[1] ? null : (counts[0] > counts[1] ? 0 : 1));
        return;
      }
      if (closed > 0) {
        ctx.setTurn(turn, 'Go again!');
      } else {
        turn = 1 - turn;
        ctx.setTurn(turn);
      }
    }

    el.addEventListener('click', onTap);
    ctx.setTurn(turn);
    return function cleanup() { el.removeEventListener('click', onTap); };
  }

  Arcade.registerGame({ id: 'dots', newRound });
})();
