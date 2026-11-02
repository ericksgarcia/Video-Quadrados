// Testa as fases sem renderizar: valida o mapa e roda várias seeds.
import { LEVELS } from '../src/levels.js';
import { Game, COLS, ROWS, dramaScore } from '../src/game.js';
const seeds = Number(process.argv[2] || 20);
for (const level of LEVELS) {
  const bad = level.map.map((l, i) => [i, l.length]).filter(([, n]) => n !== COLS);
  if (level.map.length !== ROWS || bad.length) { console.log(level.id, 'TAMANHO INVÁLIDO', level.map.length, bad); continue; }
  const n = Math.min(level.maxRacers, 4 + (level.maxRacers > 4 ? 4 : 0));
  const teams = Array.from({ length: n }, (_, i) => ({ id: 't' + i, name: 'T' + i, color: '#f00' }));
  const res = [];
  for (let s = 1; s <= seeds; s++) {
    const g = new Game({ level, teams, seed: s });
    while (!g.done && g.t < 200) g.step();
    const st = g.stats(); st.score = dramaScore(st, n); res.push(st);
  }
  const avg = (k) => (res.reduce((a, r) => a + (r[k] ?? 0), 0) / res.length).toFixed(1);
  console.log(`${level.id.padEnd(9)} racers=${n} raceTime=${avg('raceTime')} finished=${avg('finished')} elim=${avg('eliminated')} noWinner=${res.filter(r => !r.winner).length}/${res.length} best=${res.sort((a,b)=>b.score-a.score)[0].seed}`);
}
