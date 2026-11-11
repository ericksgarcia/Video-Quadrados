// Simulação da corrida (sem nada de desenho/áudio aqui — só física e regras).
// Tudo é determinístico a partir da seed: mesma seed = mesma corrida.
import { makeRng } from './rng.js';

// Grid fino: células de 28px (paredes finas, corredores estreitos como nos vídeos de referência)
export const TILE = 28;
export const COLS = 36;
export const ROWS = 48;
export const U = 56; // unidade de tamanho dos elementos (px)
export const SIM_HZ = 120;

const INTRO = 0.3;          // s parado antes de largar (sem contagem 3-2-1, igual às referências)
export const RACE_START = INTRO;
const RESULTS_HOLD = 3.8;   // s de tela de resultado no final
const AFTER_WIN_LIMIT = 15; // s máx. após o vencedor (só quando endOnWin = false)
const WIN_CELEBRATE = 1.3;  // s de comemoração antes da tela de vencedor (só com endScreen)
const LOOP_HOLD = 0.5;      // s depois que o 1º chega, sem placar: o vídeo acaba e "reinicia" (loop do TikTok)
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
      // 'path' (padrão): a água avança pelos túneis atrás dos bonecos, como uma correnteza
      // 'gravity': enche sempre o ponto mais baixo (sobe como uma piscina)
      mode: f.mode ?? 'path', from: new Int8Array(ROWS * COLS).fill(-1),
      maxRate: f.maxRate ?? Infinity, zoneRate: f.zoneRate, delay2: f.delay2, stage2After: f.stage2After != null && level.ownerPerm ? level.ownerPerm[f.stage2After] : f.stage2After, stage2Gap: f.stage2Gap,
      // massa sólida (padrão): ninguém entra nela; a frente empurra os quadrados na hora
      solid: f.solid ?? true,
      disp: new Float32Array(ROWS * COLS), ddir: new Int8Array(ROWS * COLS).fill(-1),
    };
    this.pistons = (level.pistons || []).map((p) => ({ ...p, h: 0 }));
    this.track = level.massTrack ? this.buildTrack(level.massTrack) : null;
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
        else if (ch >= '1' && ch <= '8') { cell.k = 'brick'; cell.owner = this.level.ownerPerm ? this.level.ownerPerm[Number(ch) - 1] : Number(ch) - 1; } // ownerPerm: regra de justiça (tools/justica.mjs)
        else if (ch === 'D') { cell.k = 'door'; const d = { cell, r, c, open: 0, target: 0, idx: this.doors.length }; cell.door = d; this.doors.push(d); }
        else if (DIRS[ch]) cell.pad = ch;
        else if (ch === 'O') this.bumpers.push({ x: cx, y: cy, R: U * 0.34, flash: 0 });
        else if (ch === '*') this.spinners.push({ x: cx, y: cy, L: U * (this.level.spinnerSize ?? 0.9), a: 0, w: (this.spinners.length % 2 ? -1 : 1) * 1.9 });
        else if ('PpQq'.includes(ch)) { const p = { x: cx, y: cy, key: ch.toUpperCase(), primary: ch === ch.toUpperCase(), pulse: 0 }; this.portals.push(p); (portalMap[p.key] ||= []).push(p); }
        else if (ch === '!') this.pickups.push({ kind: 'knife', x: cx, y: cy, active: true, respawn: Infinity });
        else if (ch === 'H') this.pickups.push({ kind: 'hammer', x: cx + TILE / 2, y: cy + TILE / 2, active: true, respawn: Infinity }); // martelo (centro da unidade): quebra QUALQUER tijolo com 1 batida
        else if (ch === 'L') this.pickups.push({ kind: 'grow', x: cx + TILE / 2, y: cy + TILE / 2, active: true, respawn: 0 }); // quadrado lilás (1 unidade, centro entre 4 blocos): quem encosta CRESCE
        else if (ch === 'z') this.pickups.push({ kind: 'zap', x: cx, y: cy, active: true, respawn: 0 });
        else if (ch === '?') this.pickups.push({ kind: 'mystery', x: cx, y: cy, active: true, respawn: 0 });
        else if (ch === 'S') this.spawns.push(cell);
        else if (ch === '~') { cell.src = true; cell.zone = true; this.sources.push(cell); }
        else if (ch === '%') cell.zone = true;   // zona da 1ª etapa da massa (empurra dentro das baias)
        else if (ch === '=') cell.src2 = true;   // fonte da 2ª etapa (liga em flood.delay2)
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
      const B = this.level.brickBlock;
      if (B) {
        // cada bloco BxB é um tijolo independente (quebram um a um, igual ao vídeo)
        for (let dr = 0; dr < B; dr++) for (let dc = 0; dc < B; dc++) {
          const k = this.cell(r + dr, c + dc);
          if (k && k.k === 'brick' && !k.cluster && k.owner === cell.owner) { k.cluster = cl; cl.cells.push(k); }
        }
        cl.hp = cl.maxHp = cell.owner == null ? (this.level.brickHp ?? 1) : (this.level.colorBrickHp ?? 1);
        this.clusters.push(cl);
        continue;
      }
      const stack = [cell]; cell.cluster = cl;
      while (stack.length) {
        const k = stack.pop(); cl.cells.push(k);
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const n = this.cell(k.r + dr, k.c + dc);
          if (n && n.k === 'brick' && !n.cluster && n.owner === cell.owner) { n.cluster = cl; stack.push(n); }
        }
      }
      // tijolos que protegem a chegada são bem mais duros: o pelotão alcança o líder na reta final
      const guardsFinish = cl.owner == null && cl.cells.some((k) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dr, dc]) => this.cell(k.r + dr, k.c + dc)?.k === 'finish'));
      const base = guardsFinish ? (this.level.finishBrickHp ?? 14) : cl.owner == null ? (this.level.brickHp ?? 4) : (this.level.colorBrickHp ?? 4);
      cl.hp = cl.maxHp = Math.max(1, Math.round(base + (!guardsFinish && cl.cells.length > 24 ? 1 : 0)));
      cl.finish = guardsFinish;
      this.clusters.push(cl);
    }
    for (const [r0, c0, r1, c1] of this.level.noFlood || []) {
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (this.cell(r, c)) this.cell(r, c).noFlood = true; // a massa não entra (atalho)
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
        i, team, size: this.level.racerSize ?? 44,
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
      if (this.t >= INTRO) { this.phase = 'race'; this.emit('go'); this.emit('music', { on: true }); }
      this.updateDecor(dt);
      return;
    }
    if (this.phase === 'done') return;
    this.updateDecor(dt);
    if (this.phase === 'race') {
      this.updateDoors(dt);
      this.updatePistons();
      this.updateFlood(dt);
      if (this.flood.solid) for (const r of this.racers) if (r.state === 'alive') this.pushOut(r);
      for (const r of this.racers) if (r.state === 'alive') this.moveRacer(r, dt);
      this.racerCollisions();
      if (this.flood.solid) for (const r of this.racers) if (r.state === 'alive') this.pushOut(r);
      if (this.flood.solid) this.checkPressure();
      for (const r of this.racers) if (r.state === 'alive') this.interact(r, dt);
      this.checkEnd();
      this.updateIntensity();
      this.trackLeader(dt);
    } else if (this.phase === 'results') {
      this.updatePistons();
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

  // ------------------------------------------------------------ pistões (blocos escuros que sobem e descem nas pontas das paredes)
  // { c, w, r, max, period, phase }: colunas c..c+w-1, crescem para cima a partir da linha r até max blocos
  updatePistons() {
    const rt = this.raceTime;
    const crush = this.level.pistonCrush;
    if (crush) for (const r of this.racers) r.pistonHit = false;
    for (const p of this.pistons) {
      const per = p.period ?? 8;
      const ph = (((rt + (p.phase ?? 0)) % per) + per) % per / per; // 0..1
      const tri = ph < 0.5 ? ph * 2 : 2 - ph * 2;
      p.h = tri * (p.max ?? 4) * TILE;
      // dir 'up' (padrão): base na linha r, cresce para cima nas colunas c..c+w-1
      // dir 'right': base na coluna c, cresce para a direita nas linhas r..r+w-1
      // dir 'down': base na linha r (borda de cima), cresce para baixo nas colunas c..c+w-1
      let x0, y0, x1, y1;
      if (p.dir === 'right') { x0 = p.c * TILE; x1 = x0 + p.h; y0 = p.r * TILE; y1 = (p.r + (p.w ?? 2)) * TILE; }
      else if (p.dir === 'left') { x1 = p.c * TILE; x0 = x1 - p.h; y0 = p.r * TILE; y1 = (p.r + (p.w ?? 2)) * TILE; }
      else if (p.dir === 'down') { x0 = p.c * TILE; x1 = (p.c + (p.w ?? 2)) * TILE; y0 = p.r * TILE; y1 = y0 + p.h; } // base na linha r, cresce para baixo
      else { x0 = p.c * TILE; x1 = (p.c + (p.w ?? 2)) * TILE; y1 = p.r * TILE; y0 = y1 - p.h; }
      p.rect = [x0, y0, x1, y1];
      // empurra quem estiver no caminho (sem espaço nenhum: esmagado)
      for (const r of this.racers) {
        if (r.state !== 'alive') continue;
        const h = r.size / 2;
        if (r.x + h <= x0 || r.x - h >= x1 || r.y + h <= y0 || r.y - h >= y1) continue;
        r.pistonHit = true;
        if (p.dir === 'right') {
          const nx = x1 + h + 0.5;
          if (!this.hitTiles(r, nx, r.y, true) && !this.inOtherPiston(r, nx, r.y, p)) { r.x = nx; r.vx = Math.abs(r.vx); continue; }
        } else if (p.dir === 'left') {
          const nx = x0 - h - 0.5;
          if (!this.hitTiles(r, nx, r.y, true) && !this.inOtherPiston(r, nx, r.y, p)) { r.x = nx; r.vx = -Math.abs(r.vx); continue; }
        } else if (p.dir === 'down') {
          const dn = y1 + h + 0.5;
          if (!this.hitTiles(r, r.x, dn, true) && !this.inOtherPiston(r, r.x, dn, p)) { r.y = dn; r.vy = Math.abs(r.vy); continue; }
        } else {
          const up = y0 - h - 0.5;
          if (!this.hitTiles(r, r.x, up, true) && !this.inOtherPiston(r, r.x, up, p)) { r.y = up; r.vy = -Math.abs(r.vy); continue; }
        }
        // pistonCrush (fase Prensa): entre duas prensas não há escapatória lateral; só sai quem andar para fora da faixa em 0,6s
        if (crush) { // (relógio próprio: o pushOut da massa zera o pinT a cada passo)
          r.pinP ??= this.t;
          if (this.t - r.pinP > (this.level.pinGrace ?? 0.6)) { r.state = 'dead'; r.deathT = this.raceTime; this.emit('eliminate', { i: r.i, x: r.x, y: r.y, crushed: true }); }
        } else if (!this.squeeze(r)) {
          r.pinT ??= this.t; // pistão: também dá 0,6s de graça
          if (this.t - r.pinT > 0.6) { r.state = 'dead'; r.deathT = this.raceTime; this.emit('eliminate', { i: r.i, x: r.x, y: r.y, crushed: true }); }
        }
      }
    }
    if (crush) for (const r of this.racers) if (!r.pistonHit) r.pinP = null;
  }

  // o lugar para onde o pistão empurraria o quadrado está dentro de OUTRO pistão? (duas prensas frente a frente: sem saída)
  inOtherPiston(r, x, y, self) {
    const h = r.size / 2 - 0.5;
    for (const q of this.pistons) {
      if (q === self || !q.rect) continue;
      const m = q.rect;
      if (m[2] - m[0] > 0.5 && m[3] - m[1] > 0.5 && x + h > m[0] && x - h < m[2] && y + h > m[1] && y - h < m[3]) return true;
    }
    return false;
  }

  pistonCovers(row, col) {
    for (const p of this.pistons) {
      if (!p.rect) continue;
      const [x0, y0, x1, y1] = p.rect;
      if (p.dir === 'right' || p.dir === 'left') {
        if (row < p.r || row >= p.r + (p.w ?? 2)) continue;
        const l = col * TILE;
        if (Math.min(l + TILE, x1) - Math.max(l, x0) > TILE * 0.5) return true;
      } else {
        if (col < p.c || col >= p.c + (p.w ?? 2)) continue;
        const top = row * TILE;
        if (Math.min(top + TILE, y1) - Math.max(top, y0) > TILE * 0.5) return true;
      }
    }
    return false;
  }

  // retângulo de massa dentro da célula i (ou null)
  massRect(i) {
    const lv = this.flood.disp[i];
    if (lv <= 0) return null;
    const x = (i % COLS) * TILE, y = ((i / COLS) | 0) * TILE;
    if (lv >= 1) return [x, y, x + TILE, y + TILE];
    const d = this.flood.ddir[i], k = lv * TILE;
    if (d === 0) return [x, y, x + TILE, y + k];
    if (d === 2) return [x, y, x + k, y + TILE];
    if (d === 3) return [x + TILE - k, y, x + TILE, y + TILE];
    return [x, y + TILE - k, x + TILE, y + TILE];
  }

  // a massa é sólida: se a frente avançou sobre um quadrado, ele é empurrado na hora
  pushOut(r) {
    const F = this.flood;
    for (let it = 0; it < 3; it++) {
      const h = r.size / 2;
      const c0 = Math.floor((r.x - h) / TILE), c1 = Math.floor((r.x + h) / TILE);
      const r0 = Math.floor((r.y - h) / TILE), r1 = Math.floor((r.y + h) / TILE);
      let px = 0, py = 0;
      for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
        if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
        const i = rr * COLS + cc, m = this.massRect(i);
        if (!m) continue;
        if (r.x + h <= m[0] || r.x - h >= m[2] || r.y + h <= m[1] || r.y - h >= m[3]) continue;
        const d = F.ddir[i] < 0 ? 1 : F.ddir[i];
        if (d === 0) py = Math.max(py, m[3] - (r.y - h) + 0.3);
        else if (d === 1) py = Math.min(py, m[1] - (r.y + h) - 0.3);
        else if (d === 2) px = Math.max(px, m[2] - (r.x - h) + 0.3);
        else px = Math.min(px, m[0] - (r.x + h) - 0.3);
      }
      if (!px && !py) { r.pinT = null; return; }
      r.pushedT = this.t;
      const nx = r.x + px, ny = r.y + py;
      if (!this.hitTiles(r, nx, ny, true)) {
        r.x = nx; r.y = ny;
        if (px) r.vx = Math.sign(px) * Math.abs(r.vx);
        if (py) r.vy = Math.sign(py) * Math.abs(r.vy);
      } else if (this.slideAlongPath(r)) {
        // prensado contra a parede: escorrega no sentido do caminho (como no vídeo)
      } else if (!this.squeeze(r)) {
        // sem espaço: a massa segura (pressão) e o quadrado tem 0,6s para quebrar o tijolo em que está
        // encostado; só é esmagado se continuar prensado
        r.pinT ??= this.t;
        this.massWait = Math.max(this.massWait ?? 0, this.t + 0.12);
        if (this.t - r.pinT > 0.6) {
          r.state = 'dead'; r.deathT = this.raceTime;
          this.emit('eliminate', { i: r.i, x: r.x, y: r.y, crushed: true });
        }
        return;
      }
      if (!r.pushedSnd || this.t - r.pushedSnd > 0.25) { r.pushedSnd = this.t; this.emit('push', { i: r.i, x: r.x, y: r.y }); }
    }
  }

  // escorrega no sentido do caminho (eixo dominante da direção para a chegada) até sair da massa
  slideAlongPath(r) {
    const d = this.desiredDir(r.x, r.y);
    if (!d) return false;
    const ax = Math.abs(d[0]) >= Math.abs(d[1]);
    const sx = ax ? Math.sign(d[0]) : 0, sy = ax ? 0 : Math.sign(d[1]);
    for (let k = 2; k <= TILE * 6; k += 2) {
      const x = r.x + sx * k, y = r.y + sy * k;
      if (this.hitTiles(r, x, y, true)) return false;
      if (this.freeAt(r, x, y)) {
        r.x = x; r.y = y;
        if (sx) r.vx = sx * Math.abs(r.vx); else r.vy = sy * Math.abs(r.vy);
        return true;
      }
    }
    return false;
  }

  pistonHit(r, x, y) {
    const h = r.size / 2 - 0.01;
    for (const p of this.pistons) { const m = p.rect; if (m && m[2] - m[0] > 0.5 && m[3] - m[1] > 0.5 && x + h > m[0] && x - h < m[2] && y + h > m[1] && y - h < m[3]) return true; }
    return false;
  }

  // pressão: se quadrados empurrados ainda estão sobrepostos depois de tudo, a massa segura um instante
  checkPressure() {
    const rs = this.racers.filter((r) => r.state === 'alive');
    for (let a = 0; a < rs.length; a++) for (let b = a + 1; b < rs.length; b++) {
      const A = rs[a], B = rs[b];
      if (A.pushedT !== this.t && B.pushedT !== this.t) continue;
      const lim = (A.size + B.size) / 2 - 1;
      if (Math.abs(A.x - B.x) < lim && Math.abs(A.y - B.y) < lim) { this.massWait = this.t + 0.2; return; }
    }
  }

  // anda até (dx,dy) sem entrar em parede/tijolo/pistão; devolve quanto andou
  tryMove(r, dx, dy) {
    const L = Math.hypot(dx, dy);
    if (L < 1e-6) return 0;
    let lo = 0, hi = 1;
    const blocked = (x, y) => this.hitTiles(r, x, y, true) || this.pistonHit(r, x, y);
    if (!blocked(r.x + dx, r.y + dy)) lo = 1;
    else for (let k = 0; k < 8; k++) { const m = (lo + hi) / 2; if (blocked(r.x + dx * m, r.y + dy * m)) hi = m; else lo = m; }
    r.x += dx * lo; r.y += dy * lo;
    return L * lo;
  }

  // espaço totalmente livre (sem parede, tijolo, massa, pistão ou outro quadrado)?
  freeAt(r, x, y) {
    if (this.hitTiles(r, x, y, true)) return false;
    for (const o of this.racers) if (o !== r && o.state === 'alive' && Math.abs(o.x - x) < (o.size + r.size) / 2 && Math.abs(o.y - y) < (o.size + r.size) / 2) return false;
    const h = r.size / 2 - 0.01;
    for (const p of this.pistons) { const m = p.rect; if (m && m[3] - m[1] > 0.5 && x + h > m[0] && x - h < m[2] && y + h > m[1] && y - h < m[3]) return false; }
    const c0 = Math.floor((x - h) / TILE), c1 = Math.floor((x + h) / TILE);
    const r0 = Math.floor((y - h) / TILE), r1 = Math.floor((y + h) / TILE);
    for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
      if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
      const m = this.massRect(rr * COLS + cc);
      if (m && x + h > m[0] && x - h < m[2] && y + h > m[1] && y - h < m[3]) return false;
    }
    return true;
  }

  // espremido: escorrega para o espaço livre mais próximo (de preferência à frente da massa)
  squeeze(r) {
    for (let rad = 3; rad <= TILE * 8; rad += 3) {
      let best = null, bd = Infinity;
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const x = r.x + Math.cos(a) * rad, y = r.y + Math.sin(a) * rad;
        if (!this.freeAt(r, x, y)) continue;
        if (!this.clearPath(r, r.x, r.y, x, y)) continue; // nunca atravessa parede/tijolo
        const d = this.distAt(x, y);
        if (d < bd) { bd = d; best = [x, y, a]; }
      }
      if (best) {
        r.x = best[0]; r.y = best[1];
        r.vx = Math.cos(best[2]); r.vy = Math.sin(best[2]); this.jitter(r, 0);
        return true;
      }
    }
    return false;
  }

  // o caminho reto de (x0,y0) a (x1,y1) não passa por parede/tijolo?
  clearPath(r, x0, y0, x1, y1) {
    const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(L / 4));
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      if (this.hitTiles(r, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, true)) return false;
    }
    return true;
  }

  distAt(x, y) {
    const c = Math.floor(x / TILE), rr = Math.floor(y / TILE);
    const d = this.dist?.[rr * COLS + c];
    return Number.isFinite(d) ? d : 9999;
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
    if (this.pistons.length && this.pistonCovers(cell.r, cell.c)) return false;
    if (cell.noFlood) return false;
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
    if (this.track) return this.updateTrack(dt, rt);
    if (F.mode === 'path') return this.updatePathFlood(dt, rt);
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

  // correnteza: cada célula vizinha de água enche em 1/rate segundos -> a frente anda "rate" blocos/s
  updatePathFlood(dt, rt) {
    const F = this.flood, L = F.level;
    const rate = Math.min(F.maxRate, F.rate + F.accel * (rt - F.delay)) * this.speedScale;
    const full = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS && L[r * COLS + c] >= 1;
    const grow = [];
    // 2ª etapa: começa em delay2, mas só depois que o 1º tijolo do dono 'stage2After' quebrar (+stage2Gap)
    if (F.stage2At == null && F.delay2 != null) {
      if (F.stage2After == null) F.stage2At = F.delay2;
      else if (this._ownerBroke?.[F.stage2After] != null) F.stage2At = Math.max(F.delay2, this._ownerBroke[F.stage2After] + (F.stage2Gap ?? 1.5));
    }
    const stage2 = F.stage2At != null && rt >= F.stage2At;
    // a 1ª etapa (zona) não vaza para fora dela; a 2ª etapa nasce nas fontes '='
    const feeds = (r, c, zone) => full(r, c) && (!!this.grid[r][c].zone === zone || !this.grid[r][c].zone);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      if (L[i] >= 1) continue;
      const cell = this.grid[r][c];
      if (!this.floodPassable(cell)) continue;
      const z = !!cell.zone;
      let from = -1;
      if (feeds(r - 1, c, z)) from = 0; else if (feeds(r + 1, c, z)) from = 1; else if (feeds(r, c - 1, z)) from = 2; else if (feeds(r, c + 1, z)) from = 3;
      else if (cell.src) from = 3;
      else if (cell.src2 && stage2) from = 1;
      if (from < 0) continue;
      if (F.from[i] < 0) F.from[i] = from;
      grow.push(i);
    }
    const zr = Math.min(F.maxRate, F.zoneRate ?? rate) * this.speedScale;
    for (const i of grow) L[i] = Math.min(1, L[i] + (this.grid[(i / COLS) | 0][i % COLS].zone ? zr : rate) * dt);
    this.smoothFlood();
    let top = ROWS;
    for (let i = 0; i < L.length; i++) if (L[i] > 0) { top = (i / COLS) | 0; break; }
    F.topRow = top;
    F.rate_now = rate;
  }

  // ------------------------------------------------------------ trilho da massa (fases com massTrack)
  // A massa preenche trechos retangulares do caminho, cada um numa direção fixa (up/down/left/right).
  // A frente é sempre uma linha reta de parede a parede: só empurra, nunca aparece "de cima" prensando.
  // stage1: trechos em paralelo (começam em flood.delay); stage2: em sequência (começam em stage2At).
  buildTrack(t) {
    const u = t.unit ?? 1, [or, oc] = t.origin ?? [0, 0];
    const seg = ([r0, c0, r1, c1, dir, speed]) => {
      const R0 = or + r0 * u, C0 = oc + c0 * u, R1 = or + (r1 + 1) * u - 1, C1 = oc + (c1 + 1) * u - 1;
      const vertical = dir === 'up' || dir === 'down';
      return { R0, C0, R1, C1, dir, speed, p: 0, len: vertical ? R1 - R0 + 1 : C1 - C0 + 1, ddir: { up: 1, down: 0, left: 3, right: 2 }[dir] };
    };
    // lanes: várias sequências em paralelo (ex.: as duas metades de um mapa simétrico)
    const lanes = (t.lanes || []).map((l) => ({ segs: l.map(seg), cur: 0 }));
    return { stage1: (t.stage1 || []).map(seg), stage2: (t.stage2 || []).map(seg), cur: 0, lanes };
  }

  // células da fatia k (0 = a primeira que a massa ocupa) de um trecho
  sliceCells(sg, k) {
    const out = [];
    if (sg.dir === 'up' || sg.dir === 'down') {
      const r = sg.dir === 'up' ? sg.R1 - k : sg.R0 + k;
      for (let c = sg.C0; c <= sg.C1; c++) out.push([r, c]);
    } else {
      const c = sg.dir === 'left' ? sg.C1 - k : sg.C0 + k;
      for (let r = sg.R0; r <= sg.R1; r++) out.push([r, c]);
    }
    return out;
  }

  sliceBlocked(sg, k) {
    if (k >= sg.len) return false;
    return this.sliceCells(sg, k).some(([r, c]) => this.pistons.length && this.pistonCovers(r, c));
  }

  advanceSeg(sg, d) {
    if (sg.p >= sg.len) return true;
    const np = Math.min(sg.len, sg.p + d);
    const k = Math.floor(np);
    if (np > sg.p && this.sliceBlocked(sg, Math.min(k, sg.len - 1)) && k > Math.floor(sg.p) - (sg.p % 1 === 0 ? 1 : 0)) {
      sg.p = Math.max(sg.p, Math.floor(sg.p)); // pistão fechado na frente: a massa espera
      if (this.sliceBlocked(sg, Math.floor(sg.p))) return false;
    }
    sg.p = np;
    return sg.p >= sg.len;
  }

  updateTrack(dt, rt) {
    const F = this.flood, T = this.track;
    const rate = Math.min(F.maxRate, F.rate + F.accel * (rt - F.delay)) * this.speedScale;
    const zr = (F.zoneRate ?? rate) * this.speedScale;
    const hold = this.massWait != null && this.t < this.massWait; // quadrados compactados: espera
    if (!hold) for (const sg of T.stage1) this.advanceSeg(sg, zr * dt);
    if (F.stage2At == null) {
      if (F.stage2After == null) F.stage2At = F.delay2 ?? F.delay;
      else if (this._ownerBroke?.[F.stage2After] != null) F.stage2At = Math.max(F.delay2 ?? 0, this._ownerBroke[F.stage2After] + (F.stage2Gap ?? 1.5));
    }
    const spd = (sg) => (sg.speed != null ? sg.speed * this.speedScale : rate) * dt; // trecho pode ter velocidade própria (blocos/s)
    if (!hold && F.stage2At != null && rt >= F.stage2At && T.cur < T.stage2.length) {
      if (this.advanceSeg(T.stage2[T.cur], spd(T.stage2[T.cur]))) T.cur++;
    }
    if (!hold) for (const ln of T.lanes) if (ln.cur < ln.segs.length && this.advanceSeg(ln.segs[ln.cur], spd(ln.segs[ln.cur]))) ln.cur++;
    // monta o campo de massa (o mesmo usado na física e no desenho)
    const lv = F.disp, dir = F.ddir;
    lv.fill(0); dir.fill(-1);
    let top = ROWS;
    for (const sg of [...T.stage1, ...T.stage2, ...T.lanes.flatMap((l) => l.segs)]) {
      if (sg.p <= 0) continue;
      const full = Math.floor(sg.p), frac = sg.p - full;
      for (let k = 0; k <= Math.min(full, sg.len - 1); k++) {
        const v = k < full ? 1 : frac;
        if (v <= 0) continue;
        for (const [r, c] of this.sliceCells(sg, k)) {
          const cell = this.grid[r][c];
          if (cell.k === 'wall' || cell.k === 'brick' || cell.noFlood) continue; // tijolo inteiro / área protegida: a massa não pinta por cima
          const i = r * COLS + c;
          if (v >= 1 || lv[i] < v) { if (lv[i] < 1) { lv[i] = v; dir[i] = sg.ddir; } }
          if (r < top) top = r;
        }
      }
    }
    F.level.set(lv);
    F.topRow = top;
    F.rate_now = rate;
  }

  // Para cada célula de corredor: as células da seção transversal (a "largura" do corredor).
  buildRuns() {
    const open = (r, c) => { const k = this.cell(r, c); return !!k && k.k !== 'wall' && k.k !== 'brick'; };
    const span = (r, c, dr, dc) => {
      const out = [r * COLS + c];
      for (const sg of [-1, 1]) for (let k = 1; ; k++) {
        const rr = r + dr * k * sg, cc = c + dc * k * sg;
        if (!open(rr, cc)) break;
        out.push(rr * COLS + cc);
        if (out.length > 8) return null; // mais largo que um corredor (4 unidades): é um salão
      }
      return out;
    };
    this.runs = new Array(ROWS * COLS).fill(null);
    this.runAxis = new Int8Array(ROWS * COLS); // 1 = seção horizontal (massa anda na vertical), 2 = vertical
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (!open(r, c)) continue;
      const h = span(r, c, 0, 1), v = span(r, c, 1, 0);
      const pick = h && (!v || h.length <= v.length) ? [h, 1] : v ? [v, 2] : null;
      if (pick) { this.runs[r * COLS + c] = pick[0]; this.runAxis[r * COLS + c] = pick[1]; }
    }
    // cantos: usam a largura do corredor vizinho que chega neles, projetada
    this.corners = new Array(ROWS * COLS).fill(null);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      if (!open(r, c) || this.runs[i]) continue;
      const cands = [];
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        for (let k = 1; k <= 8; k++) {
          const rr = r + dr * k, cc = c + dc * k;
          if (!open(rr, cc)) break;
          const j = rr * COLS + cc, run = this.runs[j];
          if (!run) continue;
          const axis = this.runAxis[j];
          if ((axis === 1) !== (dr !== 0)) break;
          const proj = run.map((q) => (axis === 1 ? r * COLS + (q % COLS) : ((q / COLS) | 0) * COLS + c)).filter((q) => open((q / COLS) | 0, q % COLS));
          cands.push({ src: j, run: proj, axis });
          break;
        }
      }
      if (cands.length) this.corners[i] = cands;
    }
    this._runsDirty = false;
  }

  smoothFlood() {
    const F = this.flood, L = F.level, from = F.from, n = L.length;
    if (!this.runs || this._runsDirty) this.buildRuns();
    const lv = F.disp, dir = F.ddir;
    lv.set(L); dir.set(from);
    const axisOf = this._axis || (this._axis = new Int8Array(n));
    axisOf.set(this.runAxis);
    for (let i = 0; i < n; i++) {
      const run = this.runs[i];
      if (!run && this.corners[i]) {
        let m = L[i];
        for (const cd of this.corners[i]) for (const j of cd.run) if (L[j] > m) { m = L[j]; axisOf[i] = cd.axis; }
        lv[i] = m;
        continue;
      }
      if (!run) continue;
      let m = 0;
      for (const j of run) if (L[j] > m) m = L[j];
      lv[i] = m;
    }
    for (let i = 0; i < n; i++) {
      const v = lv[i];
      if (v <= 0 || v >= 1 || !axisOf[i]) continue;
      const r = (i / COLS) | 0, c = i % COLS;
      const full = (rr, cc) => rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && lv[rr * COLS + cc] >= 1;
      if (axisOf[i] === 1) dir[i] = full(r - 1, c) ? 0 : full(r + 1, c) ? 1 : (from[i] >= 0 && from[i] < 2 ? from[i] : 1);
      else dir[i] = full(r, c - 1) ? 2 : full(r, c + 1) ? 3 : (from[i] >= 2 ? from[i] : 2);
    }
    // a massa nunca invade um pistão nem um tijolo
    for (let i = 0; i < n; i++) {
      if (lv[i] <= 0) continue;
      const cell = this.grid[(i / COLS) | 0][i % COLS];
      if (!this.floodPassable(cell) && L[i] <= 0) lv[i] = 0;
    }
  }

  waterSurfaceAt(x, y) {
    const c = Math.floor(x / TILE), r = Math.floor(y / TILE);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return Infinity;
    const lv = this.flood.level[r * COLS + c];
    if (lv <= 0) return Infinity;
    if (this.flood.mode === 'path') return lv >= 0.5 ? r * TILE : Infinity;
    return (r + 1) * TILE - lv * TILE;
  }

  // ------------------------------------------------------------ racers
  speedOf(r) {
    let s = (this.level.racerSpeed ?? 210) * this.speedScale * (1 + r.boost + (r.zap > 0 ? 0.45 : 0));
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

  hitTiles(r, x, y, wallsOnly = false) {
    const h = r.size / 2 - 0.01;
    const c0 = Math.floor((x - h) / TILE), c1 = Math.floor((x + h) / TILE);
    const r0 = Math.floor((y - h) / TILE), r1 = Math.floor((y + h) / TILE);
    let out = null;
    for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
      if (this.solidAt(r, rr, cc)) (out ||= []).push(this.cell(rr, cc));
      else if (!wallsOnly && this.flood?.solid && rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) {
        const m = this.massRect(rr * COLS + cc);
        // só bloqueia massa em que ele ainda não está encostado (senão um espremido nunca mais sai do lugar)
        if (m && x + h > m[0] && x - h < m[2] && y + h > m[1] && y - h < m[3]
          && !(r.x + h > m[0] && r.x - h < m[2] && r.y + h > m[1] && r.y - h < m[3])) (out ||= []).push({ k: 'mass' });
      }
    }
    if (!wallsOnly) for (const p of this.pistons) {
      const m = p.rect;
      if (m && m[3] - m[1] > 0.5 && x + h > m[0] && x - h < m[2] && y + h > m[1] && y - h < m[3]) (out ||= []).push({ k: 'piston' });
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
      this.jitter(r, this.level.bounceJitter ?? 0); // quique perfeito: ângulo de saída = ângulo de entrada (sem desvio aleatório)
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
      const can = cl.owner == null || cl.owner === r.i || r.sword > 0 || r.hammer;
      if (!can) continue;
      result = 'brick';
      if (r.hitCd > 0) continue;
      r.hitCd = 0.08;
      const x = (cell.c + 0.5) * TILE, y = (cell.r + 0.5) * TILE;
      cl.hp -= r.sword > 0 || r.hammer ? 99 : 1;
      cl.shake = 1;
      if (cl.hp <= 0) {
        for (const k of cl.cells) { k.k = 'floor'; k.broken = true; }
        if (cl.owner != null) (this._ownerBroke ||= {})[cl.owner] ??= this.raceTime;
        this._runsDirty = true;
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
      if (A.state !== 'alive' || B.state !== 'alive') continue;
      const dx = B.x - A.x, dy = B.y - A.y;
      const ox = (A.size + B.size) / 2 - Math.abs(dx), oy = (A.size + B.size) / 2 - Math.abs(dy);
      if (ox <= 0 || oy <= 0) continue;
      // quem está sendo empurrado pela massa (ou prensado) não volta para trás: o outro sai da frente
      const pa = A.pushedT === this.t, pb = B.pushedT === this.t;
      const ka = pa && !pb ? 0 : !pa && pb ? 1 : 0.5; // fração que A anda
      // separa sem nunca entrar em parede: se um não puder andar, o outro anda o resto
      const horiz = ox < oy, need = (horiz ? ox : oy) + 0.2;
      const sg = Math.sign(horiz ? dx : dy) || 1;
      let mA = this.tryMove(A, horiz ? -sg * need * ka : 0, horiz ? 0 : -sg * need * ka);
      let mB = this.tryMove(B, horiz ? sg * need * (1 - ka) : 0, horiz ? 0 : sg * need * (1 - ka));
      let left = need - mA - mB;
      if (left > 0.3 && !pb) left -= this.tryMove(B, horiz ? sg * left : 0, horiz ? 0 : sg * left);
      if (left > 0.3 && !pa) left -= this.tryMove(A, horiz ? -sg * left : 0, horiz ? 0 : -sg * left);
      if (left > 0.3) {
        // eixo bloqueado: tenta separar pelo outro eixo (ex.: lado a lado num corredor largo)
        const need2 = (horiz ? oy : ox) + 0.2, sg2 = Math.sign(horiz ? dy : dx) || 1;
        let l2 = need2 - this.tryMove(B, horiz ? 0 : sg2 * need2 / 2, horiz ? sg2 * need2 / 2 : 0) - this.tryMove(A, horiz ? 0 : -sg2 * need2 / 2, horiz ? -sg2 * need2 / 2 : 0);
        if (l2 > 0.3) l2 -= this.tryMove(B, horiz ? 0 : sg2 * l2, horiz ? sg2 * l2 : 0);
        if (l2 > 0.3) l2 -= this.tryMove(A, horiz ? 0 : -sg2 * l2, horiz ? -sg2 * l2 : 0);
        if (l2 > 2 && !this.squeeze(pa && !pb ? B : pb && !pa ? A : (A.y < B.y ? A : B))) {
          this.massWait = this.t + 0.25; // pilha compactada: a massa segura um instante (pressão)
        }
      }
      if (horiz) { if ((B.vx - A.vx) * sg < 0) { const t = A.vx; A.vx = B.vx; B.vx = t; } }
      else if ((B.vy - A.vy) * sg < 0) { const t = A.vy; A.vy = B.vy; B.vy = t; }
      if (pa && !pb) B.pushedT = this.t; else if (pb && !pa) A.pushedT = this.t; // o empurrão passa adiante
      const hj = this.level.hitJitter ?? 0; this.jitter(A, hj); this.jitter(B, hj); // colisão: só troca as velocidades (sem desvio aleatório)
      this.unstick(A); this.unstick(B);
      A.squash = B.squash = 1;
      const x = (A.x + B.x) / 2, y = (A.y + B.y) / 2;
      // espada: quem está armado arremessa o rival
      // faca: quem está com ela elimina quem encostar (e a faca é gasta)
      const kn = A.knife && !B.knife ? [A, B] : B.knife && !A.knife ? [B, A] : null;
      const sw = A.sword > 0 && !(B.sword > 0) ? [A, B] : B.sword > 0 && !(A.sword > 0) ? [B, A] : null;
      if (kn) {
        const [att, vic] = kn;
        if (!this.level.knifeKeep) att.knife = false; // knifeKeep: a faca não gasta (igual ao vídeo)
        vic.state = 'dead'; vic.deathT = this.raceTime; vic.killedBy = att.i;
        this.emit('stab', { x, y, by: att.i, victim: vic.i });
        this.emit('eliminate', { i: vic.i, x: vic.x, y: vic.y, by: att.i });
      } else if (sw) {
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
      if (p.kind === 'grow') { // fica no mapa; cada quadrado cresce uma vez só (como no vídeo de referência 24)
        if (!r.grown && Math.abs(r.x - p.x) < (r.size + U * 0.8) / 2 && Math.abs(r.y - p.y) < (r.size + U * 0.8) / 2) {
          r.grown = true; r.size *= this.level.growScale ?? 1.8; this.unstick(r);
          this.emit('pickup', { x: p.x, y: p.y, kind: 'grow', i: r.i });
        }
        continue;
      }
      if (Math.hypot(r.x - p.x, r.y - p.y) < U * 0.55) {
        p.active = false; p.respawn = p.kind === 'knife' || p.kind === 'hammer' ? Infinity : 12;
        let kind = p.kind;
        if (kind === 'knife') r.knife = true;
        if (kind === 'hammer') r.hammer = true;
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
    if (this.flood.started && !this.flood.solid) {
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
    // por padrão o vídeo acaba logo que alguém chega (ninguém fica esperando o resto)
    const endOnWin = this.level.endOnWin ?? true;
    const endScreen = this.level.endScreen ?? false; // padrão: sem placar no final
    if (!endScreen && this.winner && rt - this.winner.finishT > LOOP_HOLD) {
      this.phase = 'done'; this.endT = this.t;
      this.emit('music', { on: false });
      this.emit('done');
      return;
    }
    const timeout = rt > TIME_LIMIT || (this.winner && rt - this.winner.finishT > (endOnWin ? WIN_CELEBRATE : AFTER_WIN_LIMIT));
    if ((alive === 0 || timeout) && !endScreen) {
      this.phase = 'done'; this.endT = this.t;
      this.emit('music', { on: false });
      this.emit('done');
      return;
    }
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
      crushed: this.events.filter((e) => e.name === 'eliminate' && e.p.crushed).length,
      margin: fin.length > 1 ? fin[1].finishT - fin[0].finishT : null,
      leadChanges: this.leadChanges,
      knifeKills: this.events.filter((e) => e.name === 'stab').length,
      // quão perto os outros estavam quando o vencedor chegou (em blocos)
      chaseGap: this.winner ? Math.min(999, ...this.racers.filter((r) => r !== this.winner && r.state !== 'dead').map((r) => (r.state === 'finished' ? 0 : this.distOf(r))), 999) : null,
      nearFinish: this.racers.filter((r) => r !== this.winner && r.state !== 'dead' && (r.state === 'finished' || this.distOf(r) < 25)).length,
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
  if (s.chaseGap != null) score += Math.max(0, 10 - s.chaseGap * 0.4); // 2º colado no vencedor
  score += (s.nearFinish || 0) * 3;                          // pelotão perto da chegada
  if (s.firstFinish != null && s.firstFinish > 25) score += 4;
  score -= (s.crushed || 0) * 14;                           // esmagado pela massa: feio, evita
  if (s.eliminated >= 1 && s.eliminated < racerCount - 1) score += 4;
  if (s.knifeKills) score += 7;                              // teve facada!
  return score;
}
