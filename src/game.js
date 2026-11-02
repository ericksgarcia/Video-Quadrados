// Simulação da corrida (sem nada de desenho/áudio aqui — só física e regras).
// Tudo é determinístico a partir da seed: mesma seed = mesma corrida.
import { makeRng } from './rng.js';

// Grid fino: células de 28px (paredes finas, corredores estreitos como nos vídeos de referência)
export const TILE = 28;
export const COLS = 36;
export const ROWS = 48;
export const U = 56; // unidade de tamanho dos elementos (px)
export const SIM_HZ = 120;

const INTRO = 0.5;          // s antes da contagem
const BEAT = 0.6;           // s entre 3, 2, 1, VAI
export const RACE_START = INTRO + BEAT * 3;
const RESULTS_HOLD = 5.0;   // s de tela de resultado no final
const AFTER_WIN_LIMIT = 15; // s máx. após o vencedor até encerrar
const TIME_LIMIT = 150;     // s máx. de corrida

const PENTA = [0, 2, 4, 7, 9]; // escala pentatônica (soa "satisfatório")

const DIRS = { '^': [0, -1], v: [0, 1], '<': [-1, 0], '>': [1, 0] };

export class Game {
  constructor({ level, teams, seed = 1, speed = 1, floodKills = false }) {
    this.level = level;
    this.teams = teams;
    this.seed = seed;
    this.rng = makeRng(seed);
    this.arng = makeRng(seed ^ 0x9e3779b9); // rng só para notas musicais
    this.t = 0;
    this.phase = 'intro';
    this.events = [];
    this.onEvent = null;
    this.finishedCount = 0;
    this.winner = null;
    this.endT = null;
    this.speedScale = speed;
    this.floodKills = level.floodKills ?? floodKills; // false = a onda só empurra
    this.leader = null; this.leadChanges = 0; this._leadT = 0;
    this.intensity = 0;
    this._countStep = 0;
    this.parse(level.map);
    this.spawnRacers();
    const f = level.flood || {};
    // no modo "água elimina" a onda vem mais devagar (senão ninguém sobrevive)
    const k = this.floodKills ? (level.killFloodScale ?? 0.3) : 1;
    this.flood = {
      delay: (f.delay ?? 4) + (this.floodKills ? 4 : 0), rate: (f.rate ?? 0.5) * k, accel: (f.accel ?? 0.012) * k,
      level: new Float32Array(ROWS * COLS), started: false, topRow: ROWS,
    };
  }

  // ------------------------------------------------------------ parsing
  parse(map) {
    this.grid = [];
    this.bumpers = []; this.spinners = []; this.portals = []; this.pickups = [];
    this.doors = []; this.spawns = []; this.sources = []; this.finishTiles = [];
    const portalMap = {};
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      const line = (map[r] || '').padEnd(COLS, '#');
      for (let c = 0; c < COLS; c++) {
        const ch = line[c];
        const cell = { k: 'floor', r, c };
        const cx = (c + 0.5) * TILE, cy = (r + 0.5) * TILE;
        if (ch === '#') cell.k = 'wall';
        else if (ch === 'F') { cell.k = 'finish'; this.finishTiles.push(cell); }
        else if (ch === 'B') { cell.k = 'brick'; cell.owner = null; }
        else if (ch >= '1' && ch <= '8') { cell.k = 'brick'; cell.owner = Number(ch) - 1; }
        else if (ch === 'D') { cell.k = 'door'; const d = { cell, r, c, open: 0, target: 0, idx: this.doors.length }; cell.door = d; this.doors.push(d); }
        else if (DIRS[ch]) cell.pad = ch;
        else if (ch === 'O') this.bumpers.push({ x: cx, y: cy, R: U * 0.34, flash: 0 });
        else if (ch === '*') this.spinners.push({ x: cx, y: cy, L: U * (this.level.spinnerSize ?? 1.15), a: 0, w: (this.spinners.length % 2 ? -1 : 1) * 1.9 });
        else if ('PpQq'.includes(ch)) { const p = { x: cx, y: cy, key: ch.toUpperCase(), primary: ch === ch.toUpperCase(), pulse: 0 }; this.portals.push(p); (portalMap[p.key] ||= []).push(p); }
        else if (ch === '!') this.pickups.push({ kind: 'sword', x: cx, y: cy, active: true, respawn: 0 });
        else if (ch === 'z') this.pickups.push({ kind: 'zap', x: cx, y: cy, active: true, respawn: 0 });
        else if (ch === '?') this.pickups.push({ kind: 'mystery', x: cx, y: cy, active: true, respawn: 0 });
        else if (ch === 'S') this.spawns.push(cell);
        else if (ch === '~') { cell.src = true; this.sources.push(cell); }
        row.push(cell);
      }
      this.grid.push(row);
    }
    // tijolos conectados (mesmo dono) formam um bloco com vida compartilhada
    this.clusters = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const cell = this.grid[r][c];
      if (cell.k !== 'brick' || cell.cluster) continue;
      const cl = { owner: cell.owner, cells: [], hp: 0, maxHp: 0 };
      const stack = [cell]; cell.cluster = cl;
      while (stack.length) {
        const k = stack.pop(); cl.cells.push(k);
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = this.cell(k.r + dr, k.c + dc);
          if (n && n.k === 'brick' && !n.cluster && n.owner === cell.owner) { n.cluster = cl; stack.push(n); }
        }
      }
      const base = cl.owner == null ? (this.level.brickHp ?? 4) : (this.level.colorBrickHp ?? 4);
      cl.hp = cl.maxHp = Math.max(1, Math.round(base + (cl.cells.length > 24 ? 1 : 0)));
      this.clusters.push(cl);
    }
    this.buildDistField();
    for (const list of Object.values(portalMap)) if (list.length === 2) { list[0].pair = list[1]; list[1].pair = list[0]; }
    let group = 0;
    for (const d of this.doors) {
      const L = this.cell(d.r, d.c - 1), R = this.cell(d.r, d.c + 1);
      const solidish = (k) => !k || k.k === 'wall' || k.k === 'door';
      d.horizontal = solidish(L) && solidish(R); // bloqueia passagem vertical
      if (d.group != null) continue;
      const st = [d]; d.group = group;
      while (st.length) {
        const x = st.pop();
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = this.cell(x.r + dr, x.c + dc);
          if (n?.door && n.door.group == null) { n.door.group = group; st.push(n.door); }
        }
      }
      group++;
    }
  }

  // Distância (em células) de cada célula até a chegada — usada para o "instinto" dos quadrados
  buildDistField() {
    const D = new Float32Array(ROWS * COLS).fill(Infinity);
    const q = [];
    for (const f of this.finishTiles) { D[f.r * COLS + f.c] = 0; q.push(f.r * COLS + f.c); }
    for (let h = 0; h < q.length; h++) {
      const i = q[h], r = (i / COLS) | 0, c = i % COLS;
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
        const j = rr * COLS + cc;
        if (D[j] !== Infinity || this.grid[rr][cc].k === 'wall') continue;
        D[j] = D[i] + 1; q.push(j);
      }
    }
    this.dist = D;
  }

  desiredDir(x, y) {
    const c = Math.floor(x / TILE), r = Math.floor(y / TILE);
    const here = this.dist[r * COLS + c];
    let best = here, bx = 0, by = 0;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
      if (dr && dc && (this.grid[r][cc].k === 'wall' || this.grid[rr][c].k === 'wall')) continue;
      const d = this.dist[rr * COLS + cc] + (dr && dc ? 0.4 : 0);
      if (d < best) { best = d; bx = (cc + 0.5) * TILE - x; by = (rr + 0.5) * TILE - y; }
    }
    const m = Math.hypot(bx, by);
    return m ? [bx / m, by / m] : null;
  }

  cell(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS ? this.grid[r][c] : null; }

  spawnRacers() {
    const rng = this.rng;
    const spawns = this.spawns.length ? this.spawns : [this.grid[ROWS - 2][1]];
    this.racers = this.teams.map((team, i) => {
      const s = spawns[i % spawns.length];
      const extra = Math.floor(i / spawns.length);
      const ang = (rng.range(25, 65) * Math.PI) / 180 + rng.int(0, 3) * (Math.PI / 2);
      return {
        i, team, size: 44,
        x: (s.c + 0.5) * TILE + extra * 8, y: (s.r + 0.5) * TILE - extra * 8,
        vx: Math.cos(ang), vy: Math.sin(ang),
        state: 'alive', place: 0, finishT: 0, deathT: 0,
        boost: 0, sword: 0, zap: 0, frozen: 0,
        portalCd: 0, padCd: 0, hitCd: 0, sndCd: 0, spinCd: 0,
        note: 5 + (i % 3) * 2, squash: 0, trailReset: 0, parkX: 0, parkY: 0,
      };
    });
  }

  emit(name, p = {}) {
    const ev = { t: this.t, name, p };
    this.events.push(ev);
    if (this.onEvent) this.onEvent(name, p, this);
  }

  get raceTime() { return Math.max(0, this.t - RACE_START); }
  get done() { return this.phase === 'done'; }

  // ------------------------------------------------------------ main step
  step(dt = 1 / SIM_HZ) {
    this.t += dt;
    if (this.phase === 'intro' || this.phase === 'countdown') {
      const k = Math.floor((this.t - INTRO) / BEAT);
      if (this.t >= INTRO && k >= this._countStep && k <= 3) {
        this.phase = 'countdown';
        if (k < 3) this.emit('count', { n: 3 - k });
        else { this.phase = 'race'; this.emit('go'); this.emit('music', { on: true }); }
        this._countStep = k + 1;
      }
      this.updateDecor(dt);
      return;
    }
    if (this.phase === 'done') return;
    this.updateDecor(dt);
    if (this.phase === 'race') {
      this.updateDoors(dt);
      this.updateFlood(dt);
      for (const r of this.racers) if (r.state === 'alive') this.moveRacer(r, dt);
      this.racerCollisions();
      for (const r of this.racers) if (r.state === 'alive') this.interact(r, dt);
      this.checkEnd();
      this.updateIntensity();
      this.trackLeader(dt);
    } else if (this.phase === 'results') {
      this.updateFlood(dt);
      if (this.t - this.endT > RESULTS_HOLD) { this.phase = 'done'; this.emit('done'); }
    }
    for (const r of this.racers) {
      if (r.state === 'finished') { r.x += (r.parkX - r.x) * Math.min(1, dt * 6); r.y += (r.parkY - r.y) * Math.min(1, dt * 6); }
    }
  }

  updateDecor(dt) {
    for (const s of this.spinners) s.a += s.w * dt;
    for (const b of this.bumpers) b.flash = Math.max(0, b.flash - dt * 4);
    for (const cl of this.clusters) if (cl.shake) cl.shake = Math.max(0, cl.shake - dt * 5);
    for (const p of this.portals) p.pulse = Math.max(0, p.pulse - dt * 2);
    for (const r of this.racers) { r.squash *= Math.exp(-dt * 10); if (r.wet) r.wet = Math.max(0, r.wet - dt * 0.8); }
  }

  // ------------------------------------------------------------ doors
  updateDoors(dt) {
    const period = this.level.doors?.period ?? 4.2;
    const rt = this.raceTime;
    for (const d of this.doors) {
      const phase = ((rt + d.group * 1.37) % period) / period;
      let target = phase > 0.45 ? 1 : 0;
      if (target === 0 && d.open > 0.4 && this.racers.some((r) => r.state === 'alive' && this.doors.some((o) => o.group === d.group && this.overlapsCell(r, o.r, o.c)))) target = 1;
      if (target !== d.target) {
        d.target = target;
        if (!this._doorSnd || this._doorSnd[d.group] !== target) { (this._doorSnd ||= {})[d.group] = target; this.emit('door', { open: !!target, x: (d.c + 0.5) * TILE, y: (d.r + 0.5) * TILE }); }
      }
      d.open += Math.sign(d.target - d.open) * Math.min(Math.abs(d.target - d.open), dt * 3.5);
    }
  }

  overlapsCell(r, row, col) {
    const h = r.size / 2;
    return r.x + h > col * TILE && r.x - h < (col + 1) * TILE && r.y + h > row * TILE && r.y - h < (row + 1) * TILE;
  }

  // ------------------------------------------------------------ flood (água sobe "de verdade": enche sempre a linha mais baixa alcançável)
  floodPassable(cell) {
    if (!cell) return false;
    if (cell.k === 'wall' || cell.k === 'brick') return false;
    if (cell.k === 'door') return cell.door.open >= 0.5;
    return true;
  }

  updateFlood(dt) {
    const F = this.flood;
    const rt = this.raceTime;
    if (!F.started) {
      if (this.phase !== 'race' || rt < F.delay) return;
      F.started = true;
      this.emit('floodStart');
    }
    const rate = (F.rate + F.accel * (rt - F.delay)) * this.speedScale * (U / TILE);
    const L = F.level;
    const full = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS && L[r * COLS + c] >= 1;
    let targetRow = -1;
    const frontier = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      if (L[i] >= 1) continue;
      const cell = this.grid[r][c];
      if (!this.floodPassable(cell)) continue;
      const isSrc = cell.src;
      if (isSrc || full(r - 1, c) || full(r + 1, c) || full(r, c - 1) || full(r, c + 1)) {
        frontier.push(i);
        if (r > targetRow) targetRow = r;
      }
    }
    let top = ROWS;
    for (const i of frontier) {
      const r = (i / COLS) | 0, c = i % COLS;
      if (r !== targetRow) continue;
      const rising = full(r + 1, c) || this.grid[r][c].src;
      const speed = rising ? rate : rate * 7;
      L[i] = Math.min(1, L[i] + speed * dt);
    }
    for (let i = 0; i < L.length; i++) if (L[i] > 0) { top = (i / COLS) | 0; break; }
    F.topRow = top;
    F.rate_now = rate;
  }

  waterSurfaceAt(x, y) {
    const c = Math.floor(x / TILE), r = Math.floor(y / TILE);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return Infinity;
    const lv = this.flood.level[r * COLS + c];
    if (lv <= 0) return Infinity;
    return (r + 1) * TILE - lv * TILE;
  }

  // ------------------------------------------------------------ racers
  speedOf(r) {
    let s = (this.level.racerSpeed ?? 320) * this.speedScale * (1 + r.boost + (r.zap > 0 ? 0.45 : 0));
    if (r.frozen > 0) s *= 0.4;
    return s;
  }

  solidAt(r, row, col) {
    const cell = this.cell(row, col);
    if (!cell) return true;
    if (cell.k === 'wall' || cell.k === 'brick') return true;
    if (cell.k === 'door') return cell.door.open < 0.5;
    return false;
  }

  hitTiles(r, x, y) {
    const h = r.size / 2 - 0.01;
    const c0 = Math.floor((x - h) / TILE), c1 = Math.floor((x + h) / TILE);
    const r0 = Math.floor((y - h) / TILE), r1 = Math.floor((y + h) / TILE);
    let out = null;
    for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
      if (this.solidAt(r, rr, cc)) (out ||= []).push(this.cell(rr, cc));
    }
    return out;
  }

  moveRacer(r, dt) {
    r.boost *= Math.exp(-dt * 1.6);
    r.sword = Math.max(0, r.sword - dt); r.zap = Math.max(0, r.zap - dt); r.frozen = Math.max(0, r.frozen - dt);
    r.portalCd -= dt; r.padCd -= dt; r.hitCd -= dt; r.sndCd -= dt; r.spinCd -= dt;
    this.home(r, dt);
    const dist = this.speedOf(r) * dt;
    const n = Math.max(1, Math.ceil(dist / 3));
    const step = dist / n;
    let bounced = null;
    for (let k = 0; k < n; k++) {
      const nx = r.x + r.vx * step;
      const hx = this.hitTiles(r, nx, r.y);
      if (hx) { r.vx = -r.vx; bounced = this.onWallHit(r, hx) || bounced || 'wall'; } else r.x = nx;
      const ny = r.y + r.vy * step;
      const hy = this.hitTiles(r, r.x, ny);
      if (hy) { r.vy = -r.vy; bounced = this.onWallHit(r, hy) || bounced || 'wall'; } else r.y = ny;
    }
    if (bounced) {
      const sx = Math.sign(r.vx), sy = Math.sign(r.vy);
      this.jitter(r, 0.14);
      this.steer(r, sx, sy);
      r.squash = 1;
      if (bounced === 'wall' && r.sndCd <= 0) {
        r.sndCd = 0.055;
        r.note = Math.max(0, Math.min(14, r.note + this.arng.pick([-2, -1, 1, 1, 2, 3, -3])));
        const oct = Math.floor(r.note / 5), deg = PENTA[r.note % 5];
        this.emit('bounce', { i: r.i, note: 60 + oct * 12 + deg, x: r.x, y: r.y, pan: (r.x / (COLS * TILE)) * 2 - 1 });
      }
    }
  }

  onWallHit(r, cells) {
    let result = null;
    for (const cell of cells) {
      if (!cell || cell.k !== 'brick') continue;
      const cl = cell.cluster;
      const can = cl.owner == null || cl.owner === r.i || r.sword > 0;
      if (!can) continue;
      result = 'brick';
      if (r.hitCd > 0) continue;
      r.hitCd = 0.08;
      const x = (cell.c + 0.5) * TILE, y = (cell.r + 0.5) * TILE;
      cl.hp -= r.sword > 0 ? 99 : 1;
      cl.shake = 1;
      if (cl.hp <= 0) {
        for (const k of cl.cells) { k.k = 'floor'; k.broken = true; }
        this.emit('brickBreak', { x, y, owner: cl.owner, by: r.i, sword: r.sword > 0, cells: cl.cells.map((k) => [k.c, k.r]) });
      } else this.emit('brickHit', { x, y, owner: cl.owner, by: r.i, hp: cl.hp, maxHp: cl.maxHp });
    }
    return result;
  }

  // curva contínua e suave em direção à chegada (o "instinto")
  home(r, dt) {
    const rate = this.level.homing ?? 0.15;
    if (rate <= 0) return;
    const d = this.desiredDir(r.x, r.y);
    if (!d) return;
    const a = Math.atan2(r.vy, r.vx);
    let diff = Math.atan2(d[1], d[0]) - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const na = a + Math.max(-rate * dt, Math.min(rate * dt, diff));
    this.turnTo(r, na, d[0], d[1]);
  }

  // aplica um novo ângulo; se cair perto de um eixo, cruza para o lado do alvo
  // (sem isso a curva "trava" no eixo e nunca chega na direção desejada)
  turnTo(r, ang, tx, ty) {
    const MIN = 0.24;
    let vx = Math.cos(ang), vy = Math.sin(ang);
    if (Math.abs(vx) < MIN) vx = (Math.sign(tx) || Math.sign(vx) || 1) * MIN;
    if (Math.abs(vy) < MIN) vy = (Math.sign(ty) || Math.sign(vy) || 1) * MIN;
    const m = Math.hypot(vx, vy);
    r.vx = vx / m; r.vy = vy / m;
  }

  // puxa levemente o ângulo na direção da chegada sem desfazer o quique
  steer(r, sx, sy) {
    const amt = this.level.steer ?? 0.25;
    const d = amt > 0 && this.desiredDir(r.x, r.y);
    if (!d) return;
    const a = Math.atan2(r.vy, r.vx);
    let diff = Math.atan2(d[1], d[0]) - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    // às vezes o quadrado "acerta a mira" e segue o caminho; senão só puxa um pouco
    const snap = this.rng() < (this.level.snap ?? 0.1);
    const na = snap ? a + diff + this.rng.range(-0.5, 0.5) : a + Math.max(-amt, Math.min(amt, diff)) * this.rng.range(0.3, 1);
    const vx = Math.cos(na), vy = Math.sin(na);
    if (Math.sign(vx) !== sx || Math.sign(vy) !== sy) return;
    r.vx = vx; r.vy = vy;
    this.jitter(r, 0);
  }

  jitter(r, amt) {
    const a = Math.atan2(r.vy, r.vx) + this.rng.range(-amt, amt);
    let vx = Math.cos(a), vy = Math.sin(a);
    const MIN = 0.24;
    if (Math.abs(vx) < MIN) vx = (Math.sign(vx) || this.rng.sign()) * MIN;
    if (Math.abs(vy) < MIN) vy = (Math.sign(vy) || this.rng.sign()) * MIN;
    const m = Math.hypot(vx, vy);
    r.vx = vx / m; r.vy = vy / m;
  }

  unstick(r) {
    if (!this.hitTiles(r, r.x, r.y)) return;
    for (let rad = 2; rad <= TILE; rad += 2) {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const x = r.x + Math.cos(a) * rad, y = r.y + Math.sin(a) * rad;
        if (!this.hitTiles(r, x, y)) { r.x = x; r.y = y; return; }
      }
    }
  }

  racerCollisions() {
    const rs = this.racers.filter((r) => r.state === 'alive');
    for (let a = 0; a < rs.length; a++) for (let b = a + 1; b < rs.length; b++) {
      const A = rs[a], B = rs[b];
      const dx = B.x - A.x, dy = B.y - A.y;
      const ox = (A.size + B.size) / 2 - Math.abs(dx), oy = (A.size + B.size) / 2 - Math.abs(dy);
      if (ox <= 0 || oy <= 0) continue;
      if (ox < oy) {
        const s = Math.sign(dx) || 1;
        A.x -= (s * ox) / 2; B.x += (s * ox) / 2;
        if ((B.vx - A.vx) * s < 0) { const t = A.vx; A.vx = B.vx; B.vx = t; }
      } else {
        const s = Math.sign(dy) || 1;
        A.y -= (s * oy) / 2; B.y += (s * oy) / 2;
        if ((B.vy - A.vy) * s < 0) { const t = A.vy; A.vy = B.vy; B.vy = t; }
      }
      this.jitter(A, 0.2); this.jitter(B, 0.2);
      this.unstick(A); this.unstick(B);
      A.squash = B.squash = 1;
      const x = (A.x + B.x) / 2, y = (A.y + B.y) / 2;
      // espada: quem está armado arremessa o rival
      const sw = A.sword > 0 && !(B.sword > 0) ? [A, B] : B.sword > 0 && !(A.sword > 0) ? [B, A] : null;
      if (sw) {
        const [att, vic] = sw;
        const m = Math.hypot(vic.x - att.x, vic.y - att.y) || 1;
        vic.vx = (vic.x - att.x) / m; vic.vy = (vic.y - att.y) / m; this.jitter(vic, 0.05);
        vic.boost += 1.4; vic.frozen = 0;
        this.emit('swordHit', { x, y, by: att.i, victim: vic.i });
      } else if (A.sndCd <= 0 || B.sndCd <= 0) {
        A.sndCd = B.sndCd = 0.06;
        this.emit('clack', { x, y, pan: (x / (COLS * TILE)) * 2 - 1 });
      }
    }
  }

  interact(r, dt) {
    const T = TILE;
    // bumpers
    const rr = r.size * 0.55;
    for (const b of this.bumpers) {
      const dx = r.x - b.x, dy = r.y - b.y, d = Math.hypot(dx, dy);
      if (d < b.R + rr && d > 0.001) {
        const nx = dx / d, ny = dy / d;
        const dot = r.vx * nx + r.vy * ny;
        if (dot < 0) { r.vx -= 2 * dot * nx; r.vy -= 2 * dot * ny; }
        r.x = b.x + nx * (b.R + rr + 0.5); r.y = b.y + ny * (b.R + rr + 0.5);
        this.jitter(r, 0.1);
        this.unstick(r);
        r.boost = Math.min(1.6, r.boost + 0.75); r.squash = 1;
        b.flash = 1;
        this.emit('bumper', { x: b.x, y: b.y, pan: (b.x / (COLS * T)) * 2 - 1 });
      }
    }
    // hélices
    for (const s of this.spinners) {
      const ex = Math.cos(s.a) * s.L, ey = Math.sin(s.a) * s.L;
      const ax = s.x - ex, ay = s.y - ey;
      const vx = 2 * ex, vy = 2 * ey;
      let u = ((r.x - ax) * vx + (r.y - ay) * vy) / (vx * vx + vy * vy);
      u = Math.max(0, Math.min(1, u));
      const px = ax + vx * u, py = ay + vy * u;
      const dx = r.x - px, dy = r.y - py, d = Math.hypot(dx, dy);
      const lim = rr + 7;
      if (d < lim && d > 0.001) {
        const nx = dx / d, ny = dy / d;
        const dot = r.vx * nx + r.vy * ny;
        if (dot < 0) { r.vx -= 2 * dot * nx; r.vy -= 2 * dot * ny; }
        r.x = px + nx * (lim + 0.5); r.y = py + ny * (lim + 0.5);
        this.jitter(r, 0.1);
        this.unstick(r);
        if (r.spinCd <= 0) {
          r.spinCd = 0.2; r.boost = Math.min(1.6, r.boost + 0.5); r.squash = 1;
          this.emit('spinner', { x: px, y: py, pan: (px / (COLS * T)) * 2 - 1 });
        }
      }
    }
    // portais
    if (r.portalCd <= 0) {
      for (const p of this.portals) {
        if (!p.pair || !p.primary) continue; // portais são de mão única: P -> p, Q -> q
        if (Math.hypot(r.x - p.x, r.y - p.y) < U * 0.38) {
          const q = p.pair;
          this.emit('portal', { x: p.x, y: p.y, x2: q.x, y2: q.y, i: r.i });
          r.x = q.x; r.y = q.y; r.portalCd = 0.9; r.trailReset++;
          p.pulse = q.pulse = 1;
          this.unstick(r);
          break;
        }
      }
    }
    // aceleradores
    const cell = this.cell(Math.floor(r.y / T), Math.floor(r.x / T));
    if (cell?.pad && r.padCd <= 0) {
      const [dx, dy] = DIRS[cell.pad];
      const a = Math.atan2(dy, dx) + this.rng.range(-0.45, 0.45);
      r.vx = Math.cos(a); r.vy = Math.sin(a); this.jitter(r, 0);
      r.boost = Math.min(1.8, r.boost + 1.0); r.padCd = 0.12;
      this.emit('boost', { x: r.x, y: r.y, i: r.i });
    }
    // power-ups
    for (const p of this.pickups) {
      if (!p.active) { p.respawn -= dt; if (p.respawn <= 0) { p.active = true; this.emit('pickupSpawn', { x: p.x, y: p.y }); } continue; }
      if (Math.hypot(r.x - p.x, r.y - p.y) < U * 0.55) {
        p.active = false; p.respawn = 12;
        let kind = p.kind;
        if (kind === 'mystery') kind = this.rng.pick(['sword', 'zap', 'freeze']);
        if (kind === 'sword') r.sword = 7;
        if (kind === 'zap') r.zap = 5;
        if (kind === 'freeze') for (const o of this.racers) if (o !== r && o.state === 'alive') o.frozen = 3.5;
        this.emit('pickup', { x: p.x, y: p.y, kind, i: r.i });
      }
    }
    // chegada
    if (cell?.k === 'finish') {
      r.state = 'finished';
      r.place = ++this.finishedCount; r.finishT = this.raceTime;
      const slot = this.finishTiles[(r.place - 1) % this.finishTiles.length];
      r.parkX = (slot.c + 0.5) * T; r.parkY = (slot.r + 0.5) * T;
      if (r.place === 1) this.winner = r;
      this.emit('finish', { i: r.i, place: r.place, x: r.x, y: r.y });
      return;
    }
    // inundação
    if (this.flood.started) {
      const surf = this.waterSurfaceAt(r.x, r.y);
      const under = r.y > surf;
      if (under && this.floodKills) {
        r.state = 'dead'; r.deathT = this.raceTime;
        this.emit('eliminate', { i: r.i, x: r.x, y: r.y });
      } else if (under) {
        // a onda empurra: arrasta o quadrado para a frente/para cima, sem eliminar
        if (!r.inWater) { r.inWater = true; this.emit('splash', { i: r.i, x: r.x, y: r.y }); }
        const d = this.desiredDir(r.x, r.y) || [0, -1];
        let tx = d[0] * 0.8, ty = d[1] * 0.8 - 0.6;
        const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
        const a = Math.atan2(r.vy, r.vx);
        let diff = Math.atan2(ty, tx) - a;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const push = this.level.floodPush ?? 5;
        const na = a + Math.max(-push * dt, Math.min(push * dt, diff));
        this.turnTo(r, na, tx, ty);
        r.boost = Math.max(r.boost, 0.35);
        r.wet = 1;
      } else if (r.inWater && r.y < surf - r.size) r.inWater = false;
    }
  }

  distOf(r) {
    const c = Math.floor(r.x / TILE), rr = Math.floor(r.y / TILE);
    const d = this.dist[rr * COLS + c];
    return Number.isFinite(d) ? d : 9999;
  }

  // quem está na frente (para medir viradas de liderança = emoção)
  trackLeader(dt) {
    this._leadT += dt;
    if (this._leadT < 0.5) return;
    this._leadT = 0;
    if (this.winner) return;
    const alive = this.racers.filter((r) => r.state === 'alive');
    if (!alive.length) return;
    const lead = alive.reduce((a, b) => (this.distOf(b) < this.distOf(a) ? b : a));
    if (this.leader && lead !== this.leader && this.distOf(this.leader) - this.distOf(lead) > 2) { this.leadChanges++; this.leader = lead; }
    else if (!this.leader) this.leader = lead;
  }

  updateIntensity() {
    const alive = this.racers.filter((r) => r.state === 'alive');
    let lvl = 1;
    if (this.flood.started) lvl = 2;
    if (this.winner || (alive.length && alive.some((r) => r.y / TILE > this.flood.topRow - 6))) lvl = 3;
    if (lvl !== this.intensity) { this.intensity = lvl; this.emit('intensity', { level: lvl }); }
  }

  checkEnd() {
    const alive = this.racers.filter((r) => r.state === 'alive').length;
    const rt = this.raceTime;
    const timeout = rt > TIME_LIMIT || (this.winner && rt - this.winner.finishT > AFTER_WIN_LIMIT);
    if (alive === 0 || timeout) {
      this.phase = 'results'; this.endT = this.t;
      this.emit('music', { on: false });
      this.emit('results', { winner: this.winner ? this.winner.i : null });
    }
  }

  ranking() {
    const fin = this.racers.filter((r) => r.state === 'finished').sort((a, b) => a.place - b.place);
    const alive = this.racers.filter((r) => r.state === 'alive').sort((a, b) => this.distOf(a) - this.distOf(b));
    const dead = this.racers.filter((r) => r.state === 'dead').sort((a, b) => b.deathT - a.deathT);
    return [...fin, ...alive, ...dead];
  }

  // estatísticas (para escolher seeds "emocionantes")
  stats() {
    const fin = this.racers.filter((r) => r.state === 'finished').sort((a, b) => a.place - b.place);
    return {
      seed: this.seed,
      duration: this.t,
      raceTime: this.endT ? this.endT - RACE_START : this.raceTime,
      winner: this.winner ? this.winner.team.id : null,
      finished: fin.length,
      eliminated: this.racers.filter((r) => r.state === 'dead').length,
      margin: fin.length > 1 ? fin[1].finishT - fin[0].finishT : null,
      leadChanges: this.leadChanges,
      firstFinish: fin.length ? fin[0].finishT : null,
    };
  }
}

// Pontua uma corrida: queremos final apertado, alguma eliminação e duração boa pra TikTok.
export function dramaScore(s, racerCount) {
  if (!s.winner) return -100;
  let score = 0;
  score -= Math.abs(s.raceTime - 55) * 0.35;                 // ~55s é um ótimo tamanho
  score += Math.min(8, (s.leadChanges || 0) * 2);           // viradas na liderança
  if (s.margin != null) score += Math.max(0, 10 - s.margin * 2.5); // chegada colada
  if (s.firstFinish != null && s.firstFinish > 25) score += 4;
  if (s.eliminated >= 1 && s.eliminated < racerCount - 1) score += 4;
  return score;
}
