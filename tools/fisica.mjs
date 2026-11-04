// Verificador de física: roda várias corridas e acusa anomalias (quadrado dentro de parede/tijolo,
// dentro da massa, dentro de pistão, um dentro do outro, travado no lugar, fora do mapa).
//   node tools/fisica.mjs [fase|todas] [seeds]
import { LEVELS } from '../src/levels.js';
import { Game, TILE, COLS, ROWS } from '../src/game.js';

const which = process.argv[2] || 'todas';
const N = Number(process.argv[3] || 10);
const levels = which === 'todas' ? LEVELS.filter((l) => l.massTrack) : LEVELS.filter((l) => l.id === which);
const teams = (n) => Array.from({ length: n }, (_, i) => ({ id: 't' + i, name: 'T' + i, color: '#f00', type: 'color' }));

let total = 0;
for (const level of levels) {
  const agg = {};
  const add = (k, ex) => { (agg[k] ||= { n: 0, ex }); agg[k].n++; };
  for (let s = 1; s <= N; s++) {
    const g = new Game({ level, teams: teams(Math.min(4, level.maxRacers)), seed: s });
    const last = g.racers.map((r) => ({ x: r.x, y: r.y, t: 0 }));
    while (!g.done && g.t < 200) {
      g.step();
      if (g.phase !== 'race') continue;
      const rt = g.raceTime;
      for (const r of g.racers) {
        if (r.state !== 'alive') continue;
        const h = r.size / 2 - 1; // 1px de tolerância
        const where = `seed ${s} t=${rt.toFixed(1)} q${r.i} (${(r.x / TILE).toFixed(1)},${(r.y / TILE).toFixed(1)})`;
        if (r.x < 0 || r.y < 0 || r.x > COLS * TILE || r.y > ROWS * TILE) add('fora do mapa', where);
        if (g.hitTiles({ ...r, size: r.size - 2 }, r.x, r.y, true)) add('dentro de parede/tijolo', where);
        let inMass = false;
        for (let rr = Math.floor((r.y - h) / TILE); rr <= Math.floor((r.y + h) / TILE); rr++) for (let cc = Math.floor((r.x - h) / TILE); cc <= Math.floor((r.x + h) / TILE); cc++) {
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
          const m = g.massRect(rr * COLS + cc);
          if (m && r.x + h > m[0] + 1 && r.x - h < m[2] - 1 && r.y + h > m[1] + 1 && r.y - h < m[3] - 1) inMass = true;
        }
        if (inMass) add('dentro da massa', where);
        for (const p of g.pistons) { const m = p.rect; if (m && m[2] - m[0] > 1 && m[3] - m[1] > 1 && r.x + h > m[0] + 1 && r.x - h < m[2] - 1 && r.y + h > m[1] + 1 && r.y - h < m[3] - 1) add('dentro de pistão', where); }
        for (const o of g.racers) if (o.i > r.i && o.state === 'alive' && Math.abs(o.x - r.x) < (o.size + r.size) / 2 - 4 && Math.abs(o.y - r.y) < (o.size + r.size) / 2 - 4) add('um dentro do outro', where);
        const L = last[r.i];
        if (Math.hypot(r.x - L.x, r.y - L.y) > 20) { L.x = r.x; L.y = r.y; L.t = rt; }
        else if (rt - L.t > 3) { add('travado (>3s parado)', where); L.t = rt; }
      }
    }
  }
  const keys = Object.keys(agg);
  console.log(`\n${level.id}: ${keys.length ? '' : 'nenhuma anomalia ✔'}`);
  for (const k of keys) { console.log(`  ${k}: ${agg[k].n} quadros  (ex.: ${agg[k].ex})`); total += agg[k].n; }
}
process.exitCode = total ? 1 : 0;
