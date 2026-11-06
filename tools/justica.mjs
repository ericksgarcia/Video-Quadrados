// Regra de justiça (pedido do usuário): o quadrado que nasce MAIS LONGE da saída é o dono da parede que libera todos
// (a parede de cor entre a prisão e o resto do caminho). Para cada fase, acha essa parede, mede as distâncias e procura a
// troca de donos (permutação dos dígitos 1..N) que cumpre a regra, mantém a corrente SOLUCIONÁVEL (todos conseguem sair) e
// muda o mínimo possível. Resultado vai para `ownerPerm` na fase (aplicado em game.js na leitura do mapa).
//   node tools/justica.mjs [fase ...]
import { LEVELS } from '../src/levels.js';

const ids = process.argv.slice(2);
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function analisa(level) {
  const M = level.map, R = M.length, C = M[0].length;
  const at = (r, c) => (r < 0 || c < 0 || r >= R || c >= C ? '#' : M[r][c]);
  const isDigit = (ch) => ch >= '1' && ch <= '8';
  const pass = (ch) => ch !== '#' && !isDigit(ch); // escuro (B) qualquer um quebra: conta como passagem
  // regiões de passagem
  const reg = Array.from({ length: R }, () => new Array(C).fill(-1));
  let nreg = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    if (!pass(at(r, c)) || reg[r][c] >= 0) continue;
    const st = [[r, c]]; reg[r][c] = nreg;
    while (st.length) { const [y, x] = st.pop(); for (const [dy, dx] of N4) { const yy = y + dy, xx = x + dx; if (pass(at(yy, xx)) && reg[yy][xx] < 0) { reg[yy][xx] = nreg; st.push([yy, xx]); } } }
    nreg++;
  }
  // paredes de cor = componentes de mesmo dígito
  const wid = Array.from({ length: R }, () => new Array(C).fill(-1));
  const walls = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const ch = at(r, c); if (!isDigit(ch) || wid[r][c] >= 0) continue;
    const w = { d: Number(ch), cells: [], regs: new Set() }; const st = [[r, c]]; wid[r][c] = walls.length;
    while (st.length) {
      const [y, x] = st.pop(); w.cells.push([y, x]);
      for (const [dy, dx] of N4) { const yy = y + dy, xx = x + dx, k = at(yy, xx); if (k === ch && wid[yy][xx] < 0) { wid[yy][xx] = walls.length; st.push([yy, xx]); } else if (pass(k)) w.regs.add(reg[yy][xx]); }
    }
    walls.push(w);
  }
  // portais P->p (mão única) ligam regiões
  const portal = {}; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const ch = at(r, c); if ('PpQq'.includes(ch)) (portal[ch] = reg[r][c]); }
  const oneWay = [['P', 'p'], ['Q', 'q']].filter(([a, b]) => portal[a] != null && portal[b] != null).map(([a, b]) => [portal[a], portal[b]]);
  const spawns = []; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (at(r, c) === 'S') spawns.push([r, c]);
  let finReg = -1; for (let r = 0; r < R && finReg < 0; r++) for (let c = 0; c < C; c++) if (at(r, c) === 'F') { finReg = reg[r][c]; break; }
  return { R, C, at, reg, wid, walls, spawns, finReg, oneWay, nreg };
}

// simula a corrente com uma permutação (dono novo = perm[dígito-1]), célula a célula (tijolos empilhados abrem em ordem);
// devolve se TODOS os quadrados chegam à chegada
function solucionavel(A, perm) {
  const n = A.spawns.length, broken = new Set();
  const isDigit = (ch) => ch >= '1' && ch <= '8';
  const pos = {}; for (let r = 0; r < A.R; r++) for (let c = 0; c < A.C; c++) { const ch = A.at(r, c); if ('PpQq'.includes(ch)) pos[ch] = [r, c]; }
  const livre = (r, c) => { const ch = A.at(r, c); return ch !== '#' && (!isDigit(ch) || broken.has(A.wid[r][c])); };
  const reach = (i) => {
    const seen = new Set(); const q = [A.spawns[i]]; seen.add(A.spawns[i][0] * A.C + A.spawns[i][1]);
    for (let h = 0; h < q.length; h++) {
      const [y, x] = q[h]; const nb = N4.map(([dy, dx]) => [y + dy, x + dx]);
      const ch = A.at(y, x); if ((ch === 'P' || ch === 'Q') && pos[ch.toLowerCase()]) nb.push(pos[ch.toLowerCase()]);
      for (const [yy, xx] of nb) { const k = yy * A.C + xx; if (!seen.has(k) && livre(yy, xx)) { seen.add(k); q.push([yy, xx]); } }
    }
    return seen;
  };
  for (let it = 0; it < 200; it++) {
    let mudou = false;
    for (let i = 0; i < n; i++) {
      const rs = reach(i);
      A.walls.forEach((w, k) => {
        if (broken.has(k) || perm[w.d - 1] !== i) return;
        if (w.cells.some(([y, x]) => N4.some(([dy, dx]) => rs.has((y + dy) * A.C + x + dx)))) { broken.add(k); mudou = true; }
      });
    }
    if (!mudou) break;
  }
  const fin = []; for (let r = 0; r < A.R; r++) for (let c = 0; c < A.C; c++) if (A.at(r, c) === 'F') fin.push(r * A.C + c);
  return [...Array(n).keys()].every((i) => { const rs = reach(i); return fin.some((f) => rs.has(f)); });
}

// distância (em células) de cada largada até a parede de saída, atravessando tudo que não é parede de verdade
function distancias(A, exitWall) {
  const alvo = new Set(exitWall.cells.map(([r, c]) => r * A.C + c));
  return A.spawns.map(([r0, c0]) => {
    const dist = new Map([[r0 * A.C + c0, 0]]); const q = [[r0, c0]];
    for (let h = 0; h < q.length; h++) {
      const [y, x] = q[h]; const d = dist.get(y * A.C + x);
      if (alvo.has(y * A.C + x)) return d;
      for (const [dy, dx] of N4) { const yy = y + dy, xx = x + dx, k = A.at(yy, xx); if (k === '#' || dist.has(yy * A.C + xx)) continue; dist.set(yy * A.C + xx, d + 1); q.push([yy, xx]); }
    }
    return Infinity;
  });
}

function perms(a) { if (a.length <= 1) return [a]; const out = []; a.forEach((x, i) => { for (const p of perms([...a.slice(0, i), ...a.slice(i + 1)])) out.push([x, ...p]); }); return out; }

for (const level of LEVELS.filter((l) => (ids.length ? ids.includes(l.id) : true) && l.massTrack)) {
  const A = analisa(level);
  const n = A.spawns.length;
  // parede de saída: parede de cor que encosta na região da chegada (o resto do caminho)
  const saidas = A.walls.filter((w) => w.regs.has(A.finReg));
  const digitos = [...new Set(saidas.map((w) => w.d))];
  const ident = [...Array(n).keys()];
  if (!solucionavel(A, ident)) { console.log(`${level.id}: a corrente ORIGINAL não fecha nesta análise (portal/arranjo especial); pulei`); continue; }
  if (digitos.length !== 1) {
    console.log(`${level.id}: ${digitos.length} cores encostam na saída (${digitos.join(',')}): a regra não se aplica direto (largada junta/duas saídas); fica como está`);
    continue;
  }
  const exitWalls = saidas.filter((w) => w.d === digitos[0]);
  const dist = distancias(A, exitWalls.reduce((a, w) => ({ cells: [...a.cells, ...w.cells] }), { cells: [] }));
  const max = Math.max(...dist);
  const longe = dist.map((d, i) => (d === max ? i : -1)).filter((i) => i >= 0);
  const donoAtual = digitos[0] - 1;
  let melhor = null;
  for (const p of perms(ident)) {
    if (!longe.includes(p[digitos[0] - 1])) continue;
    if (!solucionavel(A, p)) continue;
    const muda = p.filter((x, i) => x !== i).length;
    if (!melhor || muda < melhor.muda) melhor = { p, muda };
  }
  const txt = `dist. até a saída por quadrado [${dist.join(', ')}]; mais longe: ${longe.join('/')}; dono atual da saída: ${donoAtual}`;
  if (longe.includes(donoAtual)) console.log(`${level.id}: OK (${txt})`);
  else if (!melhor) console.log(`${level.id}: SEM permutação válida (${txt})`);
  else console.log(`${level.id}: ownerPerm: [${melhor.p.join(', ')}]  (${melhor.muda} donos trocados; ${txt})`);
}
