// Gerador de fases INÉDITAS no estilo dos vídeos de referência (não renderiza nem publica nada).
// Sorteia uma planta (prisão + serpentina + elementos), monta a massa, distribui os donos pela regra de justiça,
// valida com simulações e, com --salvar, grava a fase pronta para o tools/render.mjs.
//
//   node tools/gerador.mjs --seed 123              mostra a fase gerada (mesma seed = mesma fase)
//   node tools/gerador.mjs --seed 123 --salvar     grava em src/levels.js (id gen-123), tools/levelgen.py, tools/novo.mjs,
//                                                  CLAUDE.md e gerados.json
//   --tipo baixo|lado|topo|juntos   força a família da largada (padrão: sorteia)
//   --n 3                           gera 3 fases (seeds N, N+1, N+2)
//   --tentativas 50                 quantas plantas tentar por seed até uma passar na validação
//   --forcar                        regrava uma seed já salva
//
// Famílias (tiradas de referencias/LEIA-ME.md e das fases de src/levels.js):
//   baixo  = 4 baias verticais embaixo, tijolos de cor entre elas, saída lateral (Pilares/Serra/Coroa)
//   lado   = 4 baias horizontais empilhadas, barras de cor, saída em cima (Gaiola/Escadaria/Mirante/Degraus)
//   topo   = 4 baias penduradas no topo, tijolo ao lado de cada uma (Teto/Balcão)
//   juntos = sem prisão, os 4 nascem juntos com a massa logo atrás (Zigue-zague)
// Depois da saída: serpentina de corredores horizontais (zigue-zague) ou verticais ("M"), 2-3 unidades de largura.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { LEVELS } from '../src/levels.js';
import { Game, TILE, COLS, ROWS, dramaScore } from '../src/game.js';
import { makeRng } from '../src/rng.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) { const k = a.slice(2); const v = process.argv[i + 1]; if (v == null || v.startsWith('--')) args[k] = true; else { args[k] = v; i++; } }
}
const GERADOS = path.join(ROOT, 'gerados.json');
const CRIT = { seeds: 30, minWinners: 27, tMin: 50, tMax: 80, maxCrush: 1, maxShare: 0.5 };
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const OPP = { left: 'right', right: 'left', up: 'up', down: 'down' };
const isDigit = (ch) => ch >= '1' && ch <= '8';

// ------------------------------------------------------------------ planta (em unidades de 2x2 blocos)
class Plan {
  constructor(W, H, tipo) {
    this.W = W; this.H = H; this.tipo = tipo;
    this.g = Array.from({ length: H }, () => new Array(W).fill('#'));
    this.stage1 = []; this.sweep = []; this.path = []; this.lanes = [];
    this.bays = []; this.extras = []; this.pistons = []; this.notas = [];
  }
  carve(r0, c0, r1, c1, ch = '.') {
    if (r0 < 0 || c0 < 0 || r1 >= this.H || c1 >= this.W || r0 > r1 || c0 > c1) throw new Error('fora da planta');
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) this.g[r][c] = ch;
  }
}

// divide o comprimento L em n corredores de 2-3 unidades separados por paredes de 1
function splitLanes(rng, L, { first, minN = 3, maxN = 6 } = {}) {
  const opts = [];
  for (let n = minN; n <= maxN; n++) {
    const m = n - (first ? 1 : 0), total = L - (n - 1) - (first || 0);
    if (m >= 1 && total >= 2 * m && total <= 3 * m) opts.push(n);
  }
  let n, maxW = 3;
  if (opts.length) n = rng.pick(opts);
  else { // sem divisão exata: aceita um corredor de 4
    for (let k = minN; k <= maxN && n == null; k++) { const m = k - (first ? 1 : 0), total = L - (k - 1) - (first || 0); if (m >= 1 && total >= 2 * m && total <= 4 * m) n = k; }
    if (n == null) throw new Error('área não divide em corredores');
    maxW = 4;
  }
  const m = n - (first ? 1 : 0);
  const w = new Array(m).fill(2);
  let extra = L - (n - 1) - (first || 0) - 2 * m;
  for (let guard = 0; extra > 0 && guard < 200; guard++) { const i = rng.int(0, m - 1); if (w[i] < maxW) { w[i]++; extra--; } }
  if (extra > 0) throw new Error('sobrou largura');
  return first ? [first, ...w] : w;
}

// serpentina genérica: orient 'H' = corredores horizontais empilhados nas linhas; 'V' = verticais lado a lado.
// a = eixo do empilhamento, b = eixo do percurso. stack: +1 começa em a0, -1 começa em a1. firstSign: sentido do 1º corredor.
function serp(P, rng, area, orient, stack, firstSign, opt = {}) {
  const A0 = orient === 'H' ? area.r0 : area.c0, A1 = orient === 'H' ? area.r1 : area.c1;
  const B0 = orient === 'H' ? area.c0 : area.r0, B1 = orient === 'H' ? area.c1 : area.r1;
  const rect = (a0, b0, a1, b1) => (orient === 'H' ? [a0, b0, a1, b1] : [b0, a0, b1, a1]);
  const along = (s) => (orient === 'H' ? (s > 0 ? 'right' : 'left') : (s > 0 ? 'down' : 'up'));
  const across = (s) => (orient === 'H' ? (s > 0 ? 'down' : 'up') : (s > 0 ? 'right' : 'left'));
  const widths = splitLanes(rng, A1 - A0 + 1, { first: opt.firstWidth, minN: opt.minN, maxN: opt.maxN });
  let a = stack > 0 ? A0 : A1;
  const lanes = [];
  widths.forEach((w, i) => {
    const aLo = stack > 0 ? a : a - w + 1, aHi = aLo + w - 1, s = firstSign * (i % 2 ? -1 : 1);
    const b0 = i === 0 && opt.first ? opt.first.B0 : B0, b1 = i === 0 && opt.first ? opt.first.B1 : B1;
    const rc = rect(aLo, b0, aHi, b1);
    P.carve(...rc);
    const lane = { orient, aLo, aHi, B0: b0, B1: b1, s, w, usados: [], idx: P.lanes.length };
    const seg = { rect: rc, dir: along(s), kind: 'lane', lane };
    lane.seg = seg; lanes.push(lane); P.lanes.push(lane); P.path.push(seg);
    if (i < widths.length - 1) {
      const wallA = stack > 0 ? aHi + 1 : aLo - 1, gw = Math.min(rng.int(2, 3), B1 - B0 - 2);
      const g0 = s > 0 ? B1 - gw + 1 : B0, g1 = s > 0 ? B1 : B0 + gw - 1;
      const cr = rect(wallA, g0, wallA, g1);
      P.carve(...cr);
      P.path.push({ rect: cr, dir: across(stack), kind: 'conn' });
      a = stack > 0 ? wallA + 1 : wallA - 1;
    }
  });
  return lanes;
}

// célula (unidade) de um corredor nas coordenadas a/b
const cellOf = (lane, a, b) => (lane.orient === 'H' ? [a, b] : [b, a]);
const laneLen = (l) => l.B1 - l.B0 + 1;
// posições livres no miolo do corredor (longe das curvas, da chegada e de outros elementos)
function vaga(rng, lane, margem = 3) {
  const cand = [];
  for (let b = lane.B0 + margem; b <= lane.B1 - margem; b++) if (!lane.usados.some((u) => Math.abs(u - b) < 3)) cand.push(b);
  if (!cand.length) return null;
  const b = rng.pick(cand); lane.usados.push(b); return b;
}

function chegada(P, rng) {
  const L = P.lanes[P.lanes.length - 1];
  if (laneLen(L) < 6) throw new Error('último corredor curto demais');
  const fw = rng.int(1, 2), nb = rng.int(1, 2);
  const put = (bFrom, bTo, ch) => { for (let b = Math.min(bFrom, bTo); b <= Math.max(bFrom, bTo); b++) for (let a = L.aLo; a <= L.aHi; a++) { const [r, c] = cellOf(L, a, b); P.g[r][c] = ch; } };
  if (L.s > 0) { put(L.B1 - fw + 1, L.B1, 'F'); put(L.B1 - fw - nb + 1, L.B1 - fw, 'B'); for (let b = L.B1 - fw - nb - 1; b <= L.B1; b++) L.usados.push(b); }
  else { put(L.B0, L.B0 + fw - 1, 'F'); put(L.B0 + fw, L.B0 + fw + nb - 1, 'B'); for (let b = L.B0; b <= L.B0 + fw + nb + 1; b++) L.usados.push(b); }
  P.notas.push(`chegada de ${fw}x${L.w} unid. atrás de ${nb * L.w} tijolos escuros`);
}

function elementos(P, rng) {
  const R0 = 24 - P.H, C0 = 18 - P.W, n = P.lanes.length;
  const conns = P.path.filter((s) => s.kind === 'conn');
  // tijolos escuros nas curvas
  let curvas = 0;
  for (const s of conns) if (rng() < 0.3) { P.carve(...s.rect, 'B'); curvas++; }
  if (curvas) P.notas.push(`${curvas} curva(s) fechada(s) por tijolos escuros`);
  // portões de cor (só o dono quebra) em até 4 curvas
  if (P.tipo !== 'juntos' && conns.length >= 3 && rng() < 0.08) {
    const livres = conns.filter((s) => P.g[s.rect[0]][s.rect[1]] === '.');
    const k = Math.min(4, livres.length);
    for (let i = 0; i < k; i++) P.carve(...livres[i].rect, 'wxyz'[i]);
    if (k) { P.portoes = k; P.notas.push(`${k} portões de cor no caminho`); }
  }
  // pistões: atravessam o corredor inteiro
  const nPist = [0, 0, 1, 1, 1, 2, 2, 3][rng.int(0, 7)], periodo = rng.pick([6, 8, 10]);
  const pistLanes = P.lanes.filter((l) => laneLen(l) >= 8);
  for (let k = 0; k < nPist && pistLanes.length; k++) {
    const l = rng.pick(pistLanes), b = vaga(rng, l);
    if (b == null) continue;
    const ok = (a) => { const [r, c] = cellOf(l, a, b); return r >= 0 && c >= 0 && r < P.H && c < P.W && P.g[r][c] === '#'; };
    const lados = [ok(l.aLo - 1) ? 'lo' : null, ok(l.aHi + 1) ? 'hi' : null].filter(Boolean);
    const lado = lados.length ? rng.pick(lados) : rng.pick(['lo', 'hi']);
    const per = rng() < 0.6 ? periodo : rng.pick([6, 8, 10]);
    const p = l.orient === 'H'
      ? (lado === 'lo' ? { c: C0 + 2 * b, r: R0 + 2 * l.aLo, dir: 'down' } : { c: C0 + 2 * b, r: R0 + 2 * (l.aHi + 1), dir: 'up' })
      : (lado === 'lo' ? { c: C0 + 2 * l.aLo, r: R0 + 2 * b, dir: 'right' } : { c: C0 + 2 * (l.aHi + 1), r: R0 + 2 * b, dir: 'left' });
    P.pistons.push({ ...p, w: 2, max: 2 * l.w, period: per, phase: 0 });
  }
  if (P.pistons.length) P.notas.push(`${P.pistons.length} pistão(ões) de ${[...new Set(P.pistons.map((p) => p.period))].join('/')}s`);
  // tijolos escuros soltos na parede dos corredores largos
  let soltos = 0;
  for (let k = rng.int(0, 3); k > 0; k--) {
    const largos = P.lanes.filter((l) => l.w >= 3 && laneLen(l) >= 8);
    if (!largos.length) break;
    const l = rng.pick(largos), b = vaga(rng, l);
    if (b == null) continue;
    const [r, c] = cellOf(l, rng() < 0.5 ? l.aLo : l.aHi, b);
    if (P.g[r][c] === '.') { P.g[r][c] = 'B'; soltos++; }
  }
  if (soltos) P.notas.push(`${soltos} tijolo(s) escuro(s) solto(s) na parede`);
  // no máximo 1 item especial
  const item = ['', '', '', 'faca', 'faca', 'lilas', 'lilas', 'martelo', 'portal', 'portal'][rng.int(0, 9)];
  const blk = (lane, a, b) => { const [r, c] = cellOf(lane, a, b); return [R0 + 2 * r, C0 + 2 * c]; };
  const meio = (l) => l.aLo + Math.floor((l.w - 1) / 2);
  if (item === 'faca') {
    const l = P.lanes[rng.int(Math.ceil(n / 2), n - 1)], b = vaga(rng, l, 2);
    if (b != null) { const [r, c] = blk(l, meio(l), b); P.extras.push({ r, c, ch: '!' }); P.knife = true; P.notas.push('faca permanente no caminho'); }
  } else if (item === 'lilas') {
    const l = P.lanes[rng.int(0, Math.max(0, Math.floor(n / 2) - 1))], b = vaga(rng, l, 2);
    if (b != null) { const [r, c] = blk(l, rng() < 0.5 ? l.aLo : l.aHi, b); P.extras.push({ r, c, ch: 'L', unidade: true }); P.grow = 1.3; P.notas.push('quadrado lilás (quem encosta cresce)'); }
  } else if (item === 'martelo') {
    const l = P.lanes[rng.int(0, n - 1)], b = vaga(rng, l, 2);
    if (b != null) { const [r, c] = blk(l, meio(l), b); P.extras.push({ r, c, ch: 'H', unidade: true }); P.notas.push('martelo (quem pega quebra qualquer tijolo)'); }
  } else if (item === 'portal' && n >= 3) {
    const atalho = n >= 4 && rng() < 0.5;
    const lp = atalho ? P.lanes[rng.int(0, 1)] : P.lanes[rng.int(Math.max(1, n - 2), n - 1)];
    const lq = atalho ? P.lanes[Math.min(n - 1, lp.idx + rng.int(2, 3))] : P.lanes[0];
    const bp = vaga(rng, lp, 2), bq = lq !== lp ? vaga(rng, lq, 2) : null;
    if (bp != null && bq != null) {
      const [r, c] = blk(lp, lp.aLo, bp), [r2, c2] = blk(lq, lq.aHi, bq);
      P.extras.push({ r, c, ch: 'P' }, { r: r2, c: c2, ch: 'p' });
      P.notas.push(atalho ? 'portal de mão única que pula um trecho (atalho)' : 'portal de mão única que manda de volta para o começo');
    }
  }
}

// ---- famílias de largada (todas com a saída do lado direito/em cima; o espelho é sorteado depois) ----
function tipoBaixo(rng) {
  const ec = rng.int(2, 3), W = 12 + ec, bh = rng.int(3, 4), yh = rng.int(3, 4), H = rng.int(18, 22), A = H - bh - yh - 1;
  if (A < 8) throw new Error('área pequena');
  const P = new Plan(W, H, 'baixo');
  [9, 6, 3, 0].forEach((c, k) => {
    P.carve(A + 1, c, H - 1, c + 1);
    P.carve(A + 1, c + 2, A + bh, c + 2, k === 0 ? 'e' : 'abc'[k - 1]); // tijolo à direita da baia: k=0 é a saída
    P.bays.push({ k, r: 2 * (H - 2), c: 2 * c + 1 });
    P.stage1.push([A + bh + 1, c, H - 1, c + 1, 'up']);
  });
  P.carve(A, 12, A + bh, W - 1);
  if (rng() < 0.5) { P.carve(A + bh + 1, W - 1, A + bh + 1, W - 1); P.carve(A + bh + 2, 12, H - 1, W - 1); P.notas.push('bolsinho sem saída embaixo da saída'); }
  P.sweep.push([A + 1, 0, A + bh, 11, 'right']);
  const orient = rng() < 0.5 ? 'H' : 'V';
  if (orient === 'H') { P.path.push({ rect: [A, 12, A + bh, W - 1], dir: 'up', kind: 'exit' }); serp(P, rng, { r0: 0, c0: 0, r1: A - 1, c1: W - 1 }, 'H', -1, -1, { minN: 3, maxN: 5 }); }
  else serp(P, rng, { r0: 0, c0: 0, r1: A - 1, c1: W - 1 }, 'V', -1, -1, { firstWidth: ec, first: { B0: 0, B1: A + bh }, minN: 3, maxN: 5 });
  P.desc = `4 baias verticais embaixo com tijolos de cor de ${bh} unidades e saída lateral; serpentina de corredores ${orient === 'H' ? 'horizontais' : 'verticais ("M")'}`;
  return P;
}

function tipoTopo(rng) {
  const ec = rng.int(2, 3), W = 13 + ec, yh = rng.int(2, 3), bh = rng.int(3, 4), Pw = yh + bh, H = rng.int(18, 22);
  if (H - Pw - 1 < 8) throw new Error('área pequena');
  const P = new Plan(W, H, 'topo');
  [10, 7, 4, 1].forEach((c, k) => {
    P.carve(0, c, Pw - 1, c + 1);
    P.carve(yh, c + 2, Pw - 1, c + 2, k === 0 ? 'e' : 'abc'[k - 1]);
    P.bays.push({ k, r: 2 * Math.min(1, yh - 1), c: 2 * c + 1 });
    P.stage1.push([0, c, yh - 1, c + 1, 'down']);
  });
  P.carve(yh, 13, Pw, W - 1);
  P.sweep.push([yh, 1, Pw - 1, 12, 'right']);
  const orient = rng() < 0.55 ? 'H' : 'V';
  if (orient === 'H') { P.path.push({ rect: [yh, 13, Pw, W - 1], dir: 'down', kind: 'exit' }); serp(P, rng, { r0: Pw + 1, c0: 0, r1: H - 1, c1: W - 1 }, 'H', +1, -1, { minN: 3, maxN: 5 }); }
  else serp(P, rng, { r0: Pw + 1, c0: 0, r1: H - 1, c1: W - 1 }, 'V', -1, +1, { firstWidth: ec, first: { B0: yh, B1: H - 1 }, minN: 3, maxN: 5 });
  P.desc = `4 baias penduradas no topo, cada uma com um tijolo de cor de ${bh} unidades ao lado, saída lateral; serpentina de corredores ${orient === 'H' ? 'horizontais' : 'verticais'}`;
  return P;
}

function tipoLado(rng) {
  const W = rng.pick([15, 16, 16, 17, 18]), rh = rng.int(1, 2), E = 2 + rh, Z = E + 12, H = rng.int(Math.max(18, Z + 1), 22);
  const P = new Plan(W, H, 'lado');
  const bolso = rng() < 0.5;
  P.carve(0, bolso ? 0 : 3, 1, W - 1);                 // faixa do topo (com bolsinho à esquerda da saída)
  if (bolso) P.notas.push('bolsinho sem saída no canto de cima');
  P.carve(2, 3, E - 1, 6);                             // sala da saída
  P.carve(E, 3, E, 6, 'e');                            // barra de saída
  for (let i = 0; i < 4; i++) {
    const r = E + 1 + 3 * i;
    P.carve(r, 0, r + 1, 6);
    if (i < 3) P.carve(r + 2, 3, r + 2, 6, 'abc'[i]);
    P.bays.push({ k: i, r: 2 * r + 1, c: 2 });
    P.stage1.push([r, 0, r + 1, 2, 'right']);
  }
  P.sweep.push([2, 3, E + 11, 6, 'up']);
  const faixa = { orient: 'H', aLo: 0, aHi: 1, B0: 3, B1: W - 1, s: 1, w: 2, usados: [], idx: 0 };
  faixa.seg = { rect: [0, 3, 1, W - 1], dir: 'right', kind: 'lane', lane: faixa };
  for (let b = 3; b <= 8; b++) faixa.usados.push(b);
  P.lanes.push(faixa); P.path.push(faixa.seg);
  const area = { r0: 3, c0: 8, r1: H - 1, c1: W - 1 }, sob = H - 1 - Z; // linhas livres embaixo da prisão
  const orient = rng() < 0.6 ? 'V' : 'H';
  if (orient === 'V') {
    const lanes = serp(P, rng, area, 'V', -1, +1, { first: { B0: 2, B1: H - 1 }, minN: 2, maxN: 4 });
    const ult = lanes[lanes.length - 1];
    if (ult.s > 0 && sob >= 2) { // corredor final por baixo da prisão
      const lw = Math.min(3, sob), rc = [H - lw, 0, H - 1, 7];
      P.carve(...rc);
      const leg = { orient: 'H', aLo: H - lw, aHi: H - 1, B0: 0, B1: 7, s: -1, w: lw, usados: [], idx: P.lanes.length };
      leg.seg = { rect: rc, dir: 'left', kind: 'lane', lane: leg };
      P.lanes.push(leg); P.path.push(leg.seg);
    }
  } else {
    const gw = 2;
    P.carve(2, W - gw, 2, W - 1); P.path.push({ rect: [2, W - gw, 2, W - 1], dir: 'down', kind: 'conn' });
    const lanes = serp(P, rng, area, 'H', +1, -1, { minN: 3, maxN: 6 });
    const ult = lanes[lanes.length - 1];
    if (ult.s < 0 && ult.aLo > Z) { ult.B0 = 0; ult.seg.rect = [ult.aLo, 0, ult.aHi, ult.B1]; P.carve(...ult.seg.rect); }
  }
  P.desc = `4 baias horizontais empilhadas com barras de cor de 4 unidades e saída em cima; faixa do topo e serpentina de corredores ${orient === 'V' ? 'verticais' : 'horizontais'}`;
  return P;
}

function tipoJuntos(rng) {
  const W = 14, H = rng.int(18, 20);
  const P = new Plan(W, H, 'juntos');
  const orient = rng() < 0.6 ? 'H' : 'V';
  const full = { r0: 0, c0: 0, r1: H - 1, c1: W - 1 };
  if (orient === 'H') {
    const l0 = serp(P, rng, full, 'H', -1, +1, { firstWidth: 3, minN: 4, maxN: 6 })[0];
    [[l0.aLo, 1], [l0.aLo, 2], [l0.aLo + 1, 1], [l0.aLo + 1, 2]].forEach(([r, c], k) => P.bays.push({ k, r: 2 * r + 1, c: 2 * c + 1 }));
    for (let b = 0; b <= 4; b++) l0.usados.push(b);
  } else {
    const l0 = serp(P, rng, full, 'V', +1, -1, { firstWidth: 3, minN: 3, maxN: 4 })[0];
    [[H - 3, 0], [H - 3, 1], [H - 2, 0], [H - 2, 1]].forEach(([r, c], k) => P.bays.push({ k, r: 2 * r + 1, c: 2 * c + 1 }));
    for (let b = H - 5; b <= H - 1; b++) l0.usados.push(b);
  }
  P.desc = `sem prisão: os 4 nascem juntos com a massa logo atrás; serpentina de corredores ${orient === 'H' ? 'horizontais' : 'verticais'}`;
  return P;
}

// ------------------------------------------------------------------ da planta para a fase do motor
function montar(P, rng, seed) {
  const R0 = 24 - P.H, C0 = 18 - P.W, mirror = rng() < 0.5;
  let B = Array.from({ length: ROWS }, () => new Array(COLS).fill('#'));
  for (let r = 0; r < P.H; r++) for (let c = 0; c < P.W; c++) for (let dr = 0; dr < 2; dr++) for (let dc = 0; dc < 2; dc++) B[R0 + 2 * r + dr][C0 + 2 * c + dc] = P.g[r][c];
  let extras = P.extras.map((e) => ({ ...e }));
  let spawns = P.bays.map((b) => ({ k: b.k, r: R0 + b.r, c: C0 + b.c }));
  let piece = (p) => p.slice();
  let pistons = P.pistons.map((p) => ({ ...p }));
  if (mirror) {
    B = B.map((row) => row.slice().reverse());
    extras = extras.map((e) => ({ ...e, c: e.unidade ? COLS - 2 - e.c : COLS - 1 - e.c }));
    spawns = spawns.map((s) => ({ ...s, c: COLS - 1 - s.c }));
    piece = ([r0, c0, r1, c1, dir, v]) => [r0, P.W - 1 - c1, r1, P.W - 1 - c0, OPP[dir], ...(v != null ? [v] : [])];
    pistons = pistons.map((p) => (p.dir === 'left' || p.dir === 'right' ? { ...p, c: COLS - p.c, dir: OPP[p.dir] } : { ...p, c: COLS - p.c - p.w }));
  }
  for (const e of extras) B[e.r][e.c] = e.ch;
  for (const s of spawns) B[s.r][s.c] = 'S';
  // índice de cada quadrado = ordem das células S (linha a linha)
  const ordem = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (B[r][c] === 'S') ordem.push(`${r},${c}`);
  for (const s of spawns) s.idx = ordem.indexOf(`${s.r},${s.c}`);
  const idxDe = (k) => spawns.find((s) => s.k === k).idx;
  // REGRA DE JUSTIÇA: a saída ('e') é do quadrado que nasce mais longe dela (k=3); cada parede entre baias ('a','b','c') fica,
  // de preferência, com o vizinho do lado da saída (corrente rápida); às vezes outra troca que também fecha a corrente
  let donos = null, corrente = null;
  if (P.tipo !== 'juntos') {
    const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    const gates = shuffle(rng, [0, 1, 2, 3]); // donos dos portões de cor (se houver)
    const mk = (pm) => ({ e: idxDe(3), a: idxDe(pm[0]), b: idxDe(pm[1]), c: idxDe(pm[2]), w: idxDe(gates[0]), x: idxDe(gates[1]), y: idxDe(gates[2]), z: idxDe(gates[3]) });
    const boas = perms.filter((pm) => resolver(B, mk(pm)).ok);
    if (!boas.length) throw new Error('corrente sem solução');
    const rapida = boas.find((pm) => pm.join() === '0,1,2');
    const escolhida = rapida && rng() < 0.65 ? rapida : rng.pick(boas);
    donos = mk(escolhida);
    corrente = resolver(B, donos);
  } else if (!resolver(B, {}).ok) throw new Error('sem caminho até a chegada');
  const dist = donos ? distancias(B) : null;
  // retângulo (em blocos) da parede de saída: o render desenha o cadeado nela e a chave no dono
  let saida = null;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (B[r][c] === 'e') saida = saida ? [Math.min(saida[0], r), Math.min(saida[1], c), Math.max(saida[2], r), Math.max(saida[3], c)] : [r, c, r, c];
  const map = B.map((row) => row.map((ch) => (donos && donos[ch] != null ? String(donos[ch] + 1) : ch)).join(''));
  // massa: velocidade base pelo comprimento do caminho (a massa empurra o pelotão: é ela que dita a duração)
  const blocos = P.path.reduce((a, s) => a + 2 * (s.dir === 'up' || s.dir === 'down' ? s.rect[2] - s.rect[0] + 1 : s.rect[3] - s.rect[1] + 1), 0);
  const v0 = Math.max(1.5, Math.min(3.2, blocos / 42));
  const level = {
    id: `gen-${seed}`, name: `Gerada ${seed}`, maxRacers: 4, racers: 4,
    racerSize: P.tipo === 'juntos' ? 40 : rng.pick([40, 42, 44, 46]), racerSpeed: 235, homing: 0, steer: 0, snap: 0,
    brickBlock: 2, colorBrickHp: 1, brickHp: 1, efeitos: true,
    ...(P.knife ? { knifeKeep: true } : {}), ...(P.grow ? { growScale: P.grow } : {}),
    flood: P.tipo === 'juntos' ? { delay: 0.5, delay2: 0.5, rate: v0, accel: 0 }
      : { delay: 0.5, zoneRate: 0.8, delay2: 8, stage2After: donos.e, stage2Gap: 1, rate: v0, accel: 0 },
    massTrack: { unit: 2, origin: [R0, C0], stage1: P.stage1.map(piece), stage2: [...P.sweep.map((p) => piece([...p, 2.4])), ...P.path.map((s) => piece([...s.rect, s.dir, v0]))] },
    ...(pistons.length ? { pistons } : {}),
    ...(saida ? { saida } : {}),
    map,
  };
  return { level, P, mirror, donos, corrente, dist, spawns, v0, nSweep: P.sweep.length, blocos };
}

function shuffle(rng, a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rng.int(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function ajustaMassa(level, nSweep, v, gap) {
  level.flood.rate = +v.toFixed(2);
  if (level.flood.stage2Gap != null) level.flood.stage2Gap = gap;
  level.massTrack.stage2 = level.massTrack.stage2.map((p, i) => (i < nSweep ? p : [...p.slice(0, 5), +v.toFixed(2)]));
}

// corrente da prisão no mapa de blocos: quem alcança qual parede de cor, em que rodada; no fim todos têm de chegar ao F
function resolver(B, donos) {
  const cor = (ch) => donos[ch] != null || isDigit(ch);
  const dono = (ch) => (donos[ch] != null ? donos[ch] : Number(ch) - 1);
  const comp = Array.from({ length: ROWS }, () => new Array(COLS).fill(-1)), walls = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (!cor(B[r][c]) || comp[r][c] >= 0) continue;
    const w = { ch: B[r][c], dono: dono(B[r][c]), cells: [] }, st = [[r, c]]; comp[r][c] = walls.length;
    while (st.length) { const [y, x] = st.pop(); w.cells.push([y, x]); for (const [dy, dx] of N4) { const yy = y + dy, xx = x + dx; if (yy >= 0 && xx >= 0 && yy < ROWS && xx < COLS && B[yy][xx] === w.ch && comp[yy][xx] < 0) { comp[yy][xx] = walls.length; st.push([yy, xx]); } } }
    walls.push(w);
  }
  const spawns = [], pos = {};
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { if (B[r][c] === 'S') spawns.push([r, c]); if (B[r][c] === 'P' || B[r][c] === 'p') pos[B[r][c]] = [r, c]; }
  const broken = new Set();
  const livre = (r, c) => r >= 0 && c >= 0 && r < ROWS && c < COLS && B[r][c] !== '#' && (comp[r][c] < 0 || broken.has(comp[r][c]));
  const reach = (i) => {
    const seen = new Set([spawns[i][0] * COLS + spawns[i][1]]), q = [spawns[i]];
    for (let h = 0; h < q.length; h++) {
      const [y, x] = q[h], nb = N4.map(([dy, dx]) => [y + dy, x + dx]);
      if (B[y][x] === 'P' && pos.p) nb.push(pos.p);
      for (const [yy, xx] of nb) { const k = yy * COLS + xx; if (!seen.has(k) && livre(yy, xx)) { seen.add(k); q.push([yy, xx]); } }
    }
    return seen;
  };
  const passos = [];
  for (let rodada = 1; rodada < 50; rodada++) {
    const agora = [];
    for (let i = 0; i < spawns.length; i++) {
      const rs = reach(i);
      walls.forEach((w, k) => { if (!broken.has(k) && !agora.includes(k) && w.dono === i && w.cells.some(([y, x]) => N4.some(([dy, dx]) => rs.has((y + dy) * COLS + x + dx)))) agora.push(k); });
    }
    if (!agora.length) break;
    for (const k of agora) { broken.add(k); passos.push({ rodada, ch: walls[k].ch, dono: walls[k].dono }); }
  }
  const fin = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (B[r][c] === 'F') fin.push(r * COLS + c);
  const ok = spawns.length === 4 && fin.length > 0 && spawns.every((_, i) => { const rs = reach(i); return fin.some((f) => rs.has(f)); });
  return { ok, passos };
}

// distância (em blocos) de cada largada até a parede de saída
function distancias(B) {
  const out = [];
  let i = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (B[r][c] !== 'S') continue;
    const d = new Map([[r * COLS + c, 0]]), q = [[r, c]]; let achou = Infinity;
    for (let h = 0; h < q.length && achou === Infinity; h++) {
      const [y, x] = q[h], dd = d.get(y * COLS + x);
      if (B[y][x] === 'e') { achou = dd; break; }
      for (const [dy, dx] of N4) { const yy = y + dy, xx = x + dx; if (yy < 0 || xx < 0 || yy >= ROWS || xx >= COLS || B[yy][xx] === '#' || d.has(yy * COLS + xx)) continue; d.set(yy * COLS + xx, dd + 1); q.push([yy, xx]); }
    }
    out[i++] = achou;
  }
  return out;
}

// impressão digital da planta (igual para o mapa espelhado e para qualquer troca de donos)
function digital(map) {
  const norm = (rows) => rows.map((l) => l.replace(/[1-8]/g, 'c').replace(/[S!LHPp]/g, '.')).join('\n');
  const h = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);
  const a = h(norm(map)), b = h(norm(map.map((l) => [...l].reverse().join(''))));
  return a < b ? a : b;
}

// ------------------------------------------------------------------ validação por simulação
function simular(level, nSeeds, fisicaSeeds = 0) {
  const teams = [0, 1, 2, 3].map((i) => ({ id: 't' + i, name: 'T' + i, color: '#f00', type: 'color' }));
  const res = [], wins = [0, 0, 0, 0], anom = { parede: 0, fora: 0, travado: 0 };
  for (let s = 1; s <= nSeeds; s++) {
    const g = new Game({ level, teams, seed: s });
    const fis = s <= fisicaSeeds, last = fis ? g.racers.map((r) => ({ x: r.x, y: r.y, t: 0 })) : null;
    while (!g.done && g.t < 200) {
      g.step();
      if (!fis || g.phase !== 'race') continue;
      const rt = g.raceTime;
      for (const r of g.racers) {
        if (r.state !== 'alive') continue;
        if (r.x < 0 || r.y < 0 || r.x > COLS * TILE || r.y > ROWS * TILE) anom.fora++;
        if (g.hitTiles({ ...r, size: r.size - 2 }, r.x, r.y, true)) anom.parede++;
        const L = last[r.i];
        if (Math.hypot(r.x - L.x, r.y - L.y) > 20) { L.x = r.x; L.y = r.y; L.t = rt; } else if (rt - L.t > 3) { anom.travado++; L.t = rt; }
      }
    }
    const st = g.stats(); st.score = dramaScore(st, 4); res.push(st);
    if (g.winner) wins[g.winner.i]++;
  }
  const com = res.filter((r) => r.winner);
  const media = (arr, k) => (arr.length ? arr.reduce((a, r) => a + (r[k] ?? 0), 0) / arr.length : 0);
  return {
    n: nSeeds, vencedores: com.length, tempo: media(com, 'raceTime'), esmagados: media(res, 'crushed'), eliminados: media(res, 'eliminated'),
    wins, maiorFatia: com.length ? Math.max(...wins) / com.length : 1, anom,
    melhor: res.slice().sort((a, b) => b.score - a.score)[0],
    tempos: com.map((r) => Math.round(r.raceTime)),
  };
}

function reprova(st, n = CRIT.seeds) {
  const f = n / CRIT.seeds, motivos = [];
  if (st.vencedores < Math.ceil(CRIT.minWinners * f)) motivos.push(`só ${st.vencedores}/${n} corridas com vencedor`);
  if (st.tempo > CRIT.tMax) motivos.push(`corrida longa (${st.tempo.toFixed(0)}s)`);
  if (st.tempo < CRIT.tMin) motivos.push(`corrida curta (${st.tempo.toFixed(0)}s)`);
  if (st.esmagados > CRIT.maxCrush) motivos.push(`${st.esmagados.toFixed(1)} esmagados por corrida`);
  if (n >= CRIT.seeds && st.maiorFatia > CRIT.maxShare) motivos.push(`uma baia vence ${(st.maiorFatia * 100).toFixed(0)}% das vezes`);
  if (st.anom.parede || st.anom.fora) motivos.push('quadrado dentro de parede/fora do mapa');
  if (st.anom.travado > 3) motivos.push('quadrado travado');
  return motivos;
}

// afina a massa (velocidade e folga depois da saída) até a fase passar nos critérios; devolve null se não der
function afinar(R, log) {
  let v = R.v0, gap = 1;
  for (let it = 0; it < 5; it++) {
    ajustaMassa(R.level, R.nSweep, v, gap);
    const q = simular(R.level, 10);
    let st = q, motivos = reprova(q, 10);
    if (!motivos.length) { st = simular(R.level, CRIT.seeds, 10); motivos = reprova(st); }
    log(`    massa ${v.toFixed(2)} bloco/s, folga ${gap}s: ${st.vencedores}/${st.n} com vencedor, ${st.tempo.toFixed(0)}s, ${st.esmagados.toFixed(2)} esmagados${motivos.length ? ' -> ' + motivos.join('; ') : ' -> aprovada'}`);
    if (!motivos.length) return st;
    const longa = st.tempo > CRIT.tMax, curta = st.tempo < CRIT.tMin, mortes = st.esmagados > CRIT.maxCrush || st.vencedores < Math.ceil(CRIT.minWinners * st.n / CRIT.seeds);
    if (st.anom.parede || st.anom.fora || (mortes && longa)) return null;   // sem conserto com a massa
    if (mortes) { v *= 0.8; gap = Math.min(3, gap + 1); }
    else if (longa) v *= 1.3;
    else if (curta) v *= 0.75;
    else return null;                                                         // só o equilíbrio entre baias: troca de planta
    if (v < 0.9 || v > 4.5) return null;
  }
  return null;
}

// ------------------------------------------------------------------ geração
const TIPOS = { baixo: tipoBaixo, lado: tipoLado, topo: tipoTopo, juntos: tipoJuntos };
function sorteiaTipo(rng) { const x = rng(); return x < 0.3 ? 'baixo' : x < 0.6 ? 'lado' : x < 0.85 ? 'topo' : 'juntos'; }

function candidato(seed, tentativa) {
  const rng = makeRng((Math.imul(seed >>> 0, 2654435761) ^ Math.imul(tentativa + 1, 40503)) >>> 0);
  const tipo = TIPOS[args.tipo] ? args.tipo : sorteiaTipo(rng);
  const P = TIPOS[tipo](rng);
  chegada(P, rng);
  elementos(P, rng);
  return montar(P, rng, seed);
}

function gerar(seed, log = console.log) {
  const max = Number(args.tentativas) || 50;
  const feitos = fs.existsSync(GERADOS) ? JSON.parse(fs.readFileSync(GERADOS, 'utf8')) : [];
  const usadas = new Set([...LEVELS.filter((l) => l.id !== `gen-${seed}`).map((l) => digital(l.map)), ...feitos.filter((g) => g.seed !== seed).map((g) => g.digital)]);
  for (let t = 0; t < max; t++) {
    let R;
    try { R = candidato(seed, t); } catch (e) { log(`  tentativa ${t + 1}: planta descartada (${e.message})`); continue; }
    R.digital = digital(R.level.map);
    if (usadas.has(R.digital)) { log(`  tentativa ${t + 1}: planta repetida, descartada`); continue; }
    log(`  tentativa ${t + 1}: ${R.P.tipo}${R.mirror ? ' (espelhada)' : ''}, ${R.P.W}x${R.P.H} unidades, ${R.P.lanes.length} corredores`);
    const st = afinar(R, log);
    if (st) { R.stats = st; R.tentativa = t + 1; return R; }
  }
  return null;
}

// ------------------------------------------------------------------ saída
const CORES = ['vermelho', 'azul', 'amarelo', 'verde'];
const NOME_PAREDE = { e: 'a SAÍDA', a: 'a parede entre as baias 1-2 (contando da saída)', b: 'a parede entre as baias 2-3', c: 'a parede entre as baias 3-4', w: 'o 1º portão', x: 'o 2º portão', y: 'o 3º portão', z: 'o 4º portão' };

function plantaAscii(level) {
  const { origin } = level.massTrack, out = [];
  const rows = level.map.map((l, i) => i).filter((i) => /[^#]/.test(level.map[i]));
  const r0 = Math.min(...rows), r1 = Math.max(...rows);
  let c0 = COLS, c1 = 0;
  for (const l of level.map) for (let c = 0; c < COLS; c++) if (l[c] !== '#') { c0 = Math.min(c0, c); c1 = Math.max(c1, c); }
  for (let r = r0 - ((r0 - origin[0]) % 2 + 2) % 2; r <= r1; r += 2) {
    let s = '';
    for (let c = c0 - ((c0 - origin[1]) % 2 + 2) % 2; c <= c1; c += 2) {
      const q = [level.map[r][c], level.map[r][c + 1], level.map[r + 1][c], level.map[r + 1][c + 1]];
      s += q.find((ch) => 'S!LHPp'.includes(ch)) || q[0];
    }
    out.push('    ' + s);
  }
  return out.join('\n');
}

function relatorio(R, seed) {
  const L = R.level, st = R.stats, o = [];
  o.push(`\n=== ${L.id}  (${R.P.tipo}${R.mirror ? ', espelhada' : ''}; ${R.P.W}x${R.P.H} unidades; tentativa ${R.tentativa}) ===`);
  o.push(R.P.desc + '.'); if (R.P.notas.length) o.push('Elementos: ' + R.P.notas.join('; ') + '.');
  o.push('\nPlanta (1 caractere = 1 unidade; # parede, . chão, S largada, 1-4 tijolo do quadrado, B escuro, F chegada, ! faca, L lilás, H martelo, P→p portal):');
  o.push(plantaAscii(L));
  if (R.donos) {
    o.push('\nCorrente (quem quebra o quê):');
    for (const p of R.corrente.passos) o.push(`  rodada ${p.rodada}: o quadrado ${p.dono + 1} quebra ${NOME_PAREDE[p.ch] || p.ch}`);
    const longe = R.dist.indexOf(Math.max(...R.dist));
    o.push(`Dono da saída: quadrado ${R.donos.e + 1}. Distância de cada largada até a saída (blocos): ${R.dist.map((d, i) => `q${i + 1}=${d}`).join(', ')} -> o mais longe é o q${longe + 1} ${longe === R.donos.e ? '(regra de justiça OK)' : '(ATENÇÃO: não é o dono)'}.`);
  } else o.push('\nSem prisão (largada junta): a regra de justiça não se aplica.');
  o.push(`\nSimulação (${st.n} corridas): ${st.vencedores} com vencedor, duração média ${st.tempo.toFixed(0)}s (${Math.min(...st.tempos)}–${Math.max(...st.tempos)}s), ${st.esmagados.toFixed(2)} esmagados e ${st.eliminados.toFixed(1)} eliminados por corrida, vitórias por quadrado ${st.wins.join('/')}.`);
  o.push(`Física (10 corridas): ${st.anom.parede + st.anom.fora + st.anom.travado ? JSON.stringify(st.anom) : 'nenhuma anomalia'}. Massa: ${L.flood.rate} bloco/s${L.flood.stage2Gap != null ? `, começa ${L.flood.stage2Gap}s depois que a saída abre` : ''}.`);
  o.push(`Seed sugerida para o render: ${st.melhor.seed} (${st.melhor.raceTime.toFixed(0)}s, ${st.melhor.eliminated} eliminado(s)).`);
  o.push(`\nRender (depois de --salvar):\n  node tools/render.mjs --level ${L.id} --teams ${CORES.join(',')} --crests sorteio --theme concreto --best 30 --out videos/${L.id}-concreto.mp4`);
  return o.join('\n');
}

// ------------------------------------------------------------------ gravação
const js = (v) => (Array.isArray(v) ? `[${v.map(js).join(', ')}]` : typeof v === 'string' ? `'${v}'` : v && typeof v === 'object' ? `{ ${Object.entries(v).map(([k, x]) => `${k}: ${js(x)}`).join(', ')} }` : String(v));

function fonteLevel(R, seed) {
  const L = R.level, o = [];
  o.push('  {');
  o.push(`    // GERADA por tools/gerador.mjs --seed ${seed} (não é cópia de vídeo): ${R.P.desc}.`);
  if (R.P.notas.length) o.push(`    // ${R.P.notas.join('; ')}.`);
  o.push(`    id: '${L.id}',`, `    name: '${L.name}',`, '    maxRacers: 4,', '    racers: 4,');
  o.push(`    racerSize: ${L.racerSize},`, `    racerSpeed: ${L.racerSpeed}, homing: 0, steer: 0, snap: 0,`, '    brickBlock: 2,', '    colorBrickHp: 1,', '    brickHp: 1,');
  o.push('    efeitos: true, // efeitos visuais discretos no render (src/render.js)');
  if (L.knifeKeep) o.push('    knifeKeep: true,');
  if (L.growScale) o.push(`    growScale: ${L.growScale},`);
  o.push(`    flood: ${js(L.flood)},${L.flood.stage2After != null ? ' // a massa só varre a prisão depois que a SAÍDA abre' : ''}`);
  o.push('    massTrack: {', `      unit: 2, origin: ${js(L.massTrack.origin)}, // unidades (planta ${R.P.W}x${R.P.H}); velocidades em blocos/s`);
  o.push(`      stage1: [${L.massTrack.stage1.map(js).join(', ')}],`, '      stage2: [');
  for (const p of L.massTrack.stage2) o.push(`        ${js(p)},`);
  o.push('      ],', '    },');
  if (L.pistons) { o.push('    pistons: ['); for (const p of L.pistons) o.push(`      ${js(p)},`); o.push('    ],'); }
  if (L.saida) o.push(`    saida: ${js(L.saida)}, // parede de saída (blocos): cadeado no render`);
  o.push('    map: [', ...L.map.map((l) => `      '${l}',`), '    ],', '  },');
  return o.join('\n') + '\n';
}

function fontePython(R, seed) {
  const L = R.level, [R0, C0] = L.massTrack.origin, U = [], puts = [];
  for (let r = 0; r < R.P.H; r++) {
    let s = '';
    for (let c = 0; c < R.P.W; c++) {
      const base = [0, 1, 2, 3].map((k) => L.map[R0 + 2 * r + (k >> 1)][C0 + 2 * c + (k & 1)]).find((ch) => !'S!LHPp'.includes(ch)) || '.';
      s += base;
      for (let k = 0; k < 4; k++) { const br = R0 + 2 * r + (k >> 1), bc = C0 + 2 * c + (k & 1); if (L.map[br][bc] !== base) puts.push([br, bc, L.map[br][bc]]); }
    }
    U.push(s);
  }
  const fn = `gen_${seed}`, o = [];
  o.push(`def ${fn}():`, `    """GERADA por tools/gerador.mjs --seed ${seed}: ${R.P.desc}.${R.P.notas.length ? ' ' + R.P.notas.join('; ') + '.' : ''}"""`, '    U = [');
  for (const l of U) o.push(`        '${l}',`);
  o.push('    ]', `    m = unitmap(U, {}, ${R0}, ${C0})`);
  for (const [r, c, ch] of puts) o.push(`    m.put(${r}, ${c}, '${ch}')`);
  o.push('    return m.lines()', '');
  return { fn, src: o.join('\n') + '\n' };
}

function salvar(R, seed) {
  const id = R.level.id, rel = (p) => path.join(ROOT, p);
  // src/levels.js
  let s = fs.readFileSync(rel('src/levels.js'), 'utf8');
  if (s.includes(`id: '${id}'`)) {
    if (!args.forcar) throw new Error(`${id} já existe em src/levels.js (use --forcar para regravar)`);
    const i = s.indexOf(`id: '${id}'`), a = s.lastIndexOf('\n  {\n', i) + 1, b = s.indexOf('\n  },\n', i) + 6;
    s = s.slice(0, a) + s.slice(b);
  }
  const key = 'export const LEVELS = [\n';
  if (!s.includes(key)) throw new Error('não achei a lista LEVELS');
  fs.writeFileSync(rel('src/levels.js'), s.replace(key, key + fonteLevel(R, seed)));
  // tools/levelgen.py (a função reproduz o mesmo mapa; conferido abaixo)
  const py = fontePython(R, seed);
  let g = fs.readFileSync(rel('tools/levelgen.py'), 'utf8');
  const ja = g.indexOf(`def ${py.fn}():`);
  if (ja >= 0) g = g.slice(0, ja) + g.slice(g.indexOf('\n    return m.lines()\n', ja) + 23).replace(/^\n/, '');
  g = g.replace("if __name__ == '__main__':", py.src + "if __name__ == '__main__':");
  if (!g.includes(`('${id}', ${py.fn})`)) g = g.replace("('derby', derby), ", `('${id}', ${py.fn}), ('derby', derby), `);
  fs.writeFileSync(rel('tools/levelgen.py'), g);
  try {
    const out = execFileSync('python3', ['-c', `import re,sys\nsrc=open(sys.argv[1]).read().split("if __name__")[0]\nns={}\nexec(src,ns)\nprint("\\n".join(ns[sys.argv[2]]()))`, rel('tools/levelgen.py'), py.fn], { encoding: 'utf8' }).trim().split('\n');
    if (out.join('\n') !== R.level.map.join('\n')) throw new Error('o mapa do levelgen.py saiu diferente do gerado');
  } catch (e) { if (/diferente/.test(e.message)) throw e; console.log('  (aviso: não consegui conferir o levelgen.py com python3)'); }
  // tools/novo.mjs: entra no sorteio
  let n = fs.readFileSync(rel('tools/novo.mjs'), 'utf8');
  if (!n.includes(`'${id}'`)) n = n.replace(/(pick\(\['gaiola'[^\]]*)\]/, `$1, '${id}']`);
  fs.writeFileSync(rel('tools/novo.mjs'), n);
  // CLAUDE.md: uma linha por fase gerada
  let c = fs.readFileSync(rel('CLAUDE.md'), 'utf8');
  const marca = '<!-- gerador:fases -->', st = R.stats;
  const linha = `- \`${id}\` — ${R.P.desc}${R.P.notas.length ? '; ' + R.P.notas.join('; ') : ''}. ${R.donos ? `Saída do quadrado ${R.donos.e + 1} (o mais longe); ` : 'Justiça não se aplica; '}massa ${R.level.flood.rate} bloco/s. Sim.: ${st.n - st.vencedores}/${st.n} sem vencedor, ~${st.tempo.toFixed(0)}s, ${st.esmagados.toFixed(2)} esmagados/corrida.`;
  c = c.split('\n').filter((l) => !l.startsWith(`- \`${id}\` — `)).join('\n');
  if (c.includes(marca)) c = c.replace(marca, linha + '\n' + marca); else console.log('  (aviso: marcador do gerador não encontrado no CLAUDE.md; a linha da fase não foi gravada)');
  fs.writeFileSync(rel('CLAUDE.md'), c);
  // gerados.json: impressão digital (não repete planta)
  const feitos = (fs.existsSync(GERADOS) ? JSON.parse(fs.readFileSync(GERADOS, 'utf8')) : []).filter((x) => x.seed !== seed);
  feitos.push({ seed, id, digital: R.digital, tipo: R.P.tipo, espelhada: R.mirror, tamanho: `${R.P.W}x${R.P.H}`, elementos: R.P.notas, massa: R.level.flood.rate,
    sim: { corridas: st.n, comVencedor: st.vencedores, tempo: Math.round(st.tempo), esmagados: +st.esmagados.toFixed(2), vitorias: st.wins }, seedRender: st.melhor.seed });
  fs.writeFileSync(GERADOS, JSON.stringify(feitos, null, 2) + '\n');
  console.log(`\n✔ ${id} gravada em src/levels.js, tools/levelgen.py, tools/novo.mjs, CLAUDE.md e gerados.json`);
  try { console.log('  justiça: ' + execFileSync('node', [rel('tools/justica.mjs'), id], { encoding: 'utf8' }).trim()); } catch { /* só informativo */ }
}

// ------------------------------------------------------------------ principal
const seed0 = args.seed != null && args.seed !== true ? Number(args.seed) : Math.floor(Date.now() % 1e6);
const quantos = Number(args.n) || 1;
let falhas = 0;
for (let k = 0; k < quantos; k++) {
  const seed = seed0 + k;
  console.log(`\nGerando fase com a seed ${seed}…`);
  const R = gerar(seed);
  if (!R) { console.log(`✘ seed ${seed}: nenhuma planta passou na validação em ${Number(args.tentativas) || 50} tentativas`); falhas++; continue; }
  console.log(relatorio(R, seed));
  if (args.salvar) { try { salvar(R, seed); } catch (e) { console.log(`\n✘ não gravei: ${e.message}`); falhas++; } }
  else console.log('\n(nada foi gravado; repita com --salvar para gravar a fase)');
}
process.exitCode = falhas ? 1 : 0;
