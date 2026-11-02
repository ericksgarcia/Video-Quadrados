// Desenho de tudo: arena, tijolos, água, competidores e tela final.
// Estilo "flat" (igual aos vídeos de referência): fundo cinza chapado, corredores claros com
// contorno preto fino, tijolos de cor sólida com desenho de tijolinho, água índigo chapada,
// quadrados com rastro em cunha e nada de HUD poluindo a tela.
// Canvas vertical 1080x1920 (formato TikTok/Reels/Shorts).
import { TILE, COLS, ROWS, U } from './game.js';
import { makeBadge } from './teams.js';

export const W = 1080;
export const H = 1920;
const AW = COLS * TILE, AH = ROWS * TILE;
export const AX = (W - AW) / 2;           // 36
export const AY = Math.round((H - AH) / 2); // 288 — mapa centralizado, como nas referências
const FONT = 'Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// cor da água (chapada). 'roxo' é o índigo dos vídeos de referência.
export const THEMES = {
  roxo: { name: 'Índigo (padrão)', water: '#3d328c' },
  agua: { name: 'Azul', water: '#1f4fa8' },
  lava: { name: 'Lava', water: '#b8361a' },
  acido: { name: 'Ácido', water: '#3f7d1c' },
};

// paleta medida nos vídeos de referência
const BG = '#adadad';          // fundo e paredes (mesma cor)
const FLOOR = '#e0e0d9';       // corredores
const LINE = '#151515';        // contornos
const LW = 3.5;                // espessura do contorno
const BRICK_DARK = '#2e2e2e';  // tijolo comum / da chegada
const CHECK_DARK = '#16161e', CHECK_LIGHT = '#f4f4f0';
const PALETTE = ['#d50000', '#265ef3', '#ffd839', '#007d53', '#19b5d1', '#ff8a00', '#8e44ff', '#ff4fa3'];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => t * t * (3 - 2 * t);
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

function hexRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(hex, amt) {
  let [r, g, b] = hexRgb(hex);
  const f = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((f - r) * p + r); g = Math.round((f - g) * p + g); b = Math.round((f - b) * p + b);
  return `rgb(${r},${g},${b})`;
}
function colorDist(a, b) {
  const [r1, g1, b1] = hexRgb(a), [r2, g2, b2] = hexRgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

function fitFont(g, text, maxW, size, weight = 900) {
  let s = size;
  do { g.font = `${weight} ${s}px ${FONT}`; s -= 2; } while (g.measureText(text).width > maxW && s > 10);
}
function text(g, str, x, y, { size = 60, fill = LINE, weight = 900, align = 'center', maxW = 1000 } = {}) {
  fitFont(g, str, maxW, size, weight);
  g.textAlign = align; g.textBaseline = 'middle';
  g.fillStyle = fill; g.fillText(str, x, y);
}

// "tijolinho" das referências: duas linhas horizontais + tracinhos verticais alternados
function brickGlyph(g, x, y, s, color) {
  g.strokeStyle = color; g.lineWidth = Math.max(2, s * 0.055); g.lineCap = 'butt';
  const x0 = x + s * 0.16, x1 = x + s * 0.84;
  const y1 = y + s * 0.38, y2 = y + s * 0.62;
  g.beginPath();
  g.moveTo(x0, y1); g.lineTo(x1, y1);
  g.moveTo(x0, y2); g.lineTo(x1, y2);
  g.moveTo(x + s * 0.5, y + s * 0.18); g.lineTo(x + s * 0.5, y1);
  g.moveTo(x + s * 0.33, y1); g.lineTo(x + s * 0.33, y2);
  g.moveTo(x + s * 0.67, y1); g.lineTo(x + s * 0.67, y2);
  g.moveTo(x + s * 0.5, y2); g.lineTo(x + s * 0.5, y + s * 0.82);
  g.stroke();
}

// faca das referências: lâmina ciano, cabo roxo com pontinhos
function drawKnife(g, x, y, s, rot = -Math.PI / 4) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s / 40, s / 40);
  g.fillStyle = '#3ad6ec';
  g.beginPath(); g.moveTo(-4.5, -2); g.lineTo(-4.5, -22); g.quadraticCurveTo(-3, -31, 4.5, -33); g.lineTo(4.5, -2); g.closePath(); g.fill();
  g.fillStyle = '#1aa5c4'; g.fillRect(-0.5, -22, 2, 16);
  g.fillStyle = '#4b2bd6'; g.fillRect(-7.5, -3, 15, 4.5);
  g.fillStyle = '#5b34e8'; g.fillRect(-4.5, 1.5, 9, 15);
  g.fillStyle = '#c9b8ff'; g.fillRect(-1, 5, 2, 2); g.fillRect(-1, 11, 2, 2);
  g.restore();
}

export class Renderer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    this.opts = { title: 'QUAL TIME VENCE?', subtitle: 'Comente seu palpite!', handle: '', theme: 'roxo', cta: 'COMENTE SEU TIME!', ...opts };
    this.particles = [];
    this.time = 0;
    this.trails = new Map();
    this.cam = { z: 1, x: AW / 2, y: AH / 2 };
  }

  get theme() { return THEMES[this.opts.theme] || THEMES.roxo; }

  attach(game) {
    this.game = game;
    this.badges = game.racers.map((r) => makeBadge(r.team, 128, { flat: true }));
    // cor de cada competidor (tijolos + rastro): a do time, trocando se ficar parecida com outra
    const used = [];
    this.colors = game.racers.map((r) => {
      let col = r.team.color || PALETTE[r.i % PALETTE.length];
      if (used.some((u) => colorDist(u, col) < 95)) col = PALETTE.find((p) => !used.some((u) => colorDist(u, p) < 95)) || col;
      used.push(col);
      return col;
    });
    this.trails = new Map();
    this.particles = [];
    this.resultsT = null;
    this.cam = { z: 1, x: AW / 2, y: AH / 2 };
    this.buildStatic();
  }

  colorOf(i) { return this.colors?.[i] || '#888'; }

  // ------------------------------------------------------------ camadas estáticas
  buildStatic() {
    const game = this.game;
    const solid = (r, c) => { const k = game.cell(r, c); return !k || k.k === 'wall'; };
    const mk = () => { const c = document.createElement('canvas'); c.width = AW + 40; c.height = AH + 40; const g = c.getContext('2d'); g.translate(20, 20); return [c, g]; };

    // chão (corredores claros + chegada quadriculada)
    const [fc, g] = mk();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const cell = game.grid[r][c];
      if (cell.k === 'wall') continue;
      const x = c * TILE, y = r * TILE;
      if (cell.k === 'finish') {
        g.fillStyle = (r + c) % 2 ? CHECK_DARK : CHECK_LIGHT;
        g.fillRect(x, y, TILE, TILE);
      } else { g.fillStyle = FLOOR; g.fillRect(x - 0.5, y - 0.5, TILE + 1, TILE + 1); }
    }
    this.floorLayer = fc;

    // contorno preto entre corredor e parede (+ borda da chegada)
    const [lc, l] = mk();
    l.strokeStyle = LINE; l.lineWidth = LW; l.lineCap = 'square';
    l.beginPath();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (solid(r, c)) continue;
      const x = c * TILE, y = r * TILE;
      const fin = game.grid[r][c].k === 'finish';
      const edge = (rr, cc) => solid(rr, cc) || (fin && game.cell(rr, cc)?.k !== 'finish');
      if (edge(r - 1, c)) { l.moveTo(x, y); l.lineTo(x + TILE, y); }
      if (edge(r + 1, c)) { l.moveTo(x, y + TILE); l.lineTo(x + TILE, y + TILE); }
      if (edge(r, c - 1)) { l.moveTo(x, y); l.lineTo(x, y + TILE); }
      if (edge(r, c + 1)) { l.moveTo(x + TILE, y); l.lineTo(x + TILE, y + TILE); }
    }
    l.stroke();
    this.lineLayer = lc;
  }

  // ------------------------------------------------------------ eventos -> efeitos (bem discretos)
  onEvent(name, p) {
    switch (name) {
      case 'brickBreak': {
        const col = p.owner == null ? BRICK_DARK : this.colorOf(p.owner);
        for (const [c, r] of p.cells) if ((c + r) % 2 === 0) this.debris((c + 0.5) * TILE, (r + 0.5) * TILE, 2, col);
        break;
      }
      case 'stab': this.debris(p.x, p.y, 10, '#d50000'); break;
      case 'results': this.resultsT = 0; break;
      default: break;
    }
  }

  debris(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 120 + Math.random() * 220;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120, life: 0.5 + Math.random() * 0.4, max: 0.9, size: 7 + Math.random() * 7, color, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 16 });
    }
  }

  // ------------------------------------------------------------ frame
  draw(dt) {
    const g = this.g, game = this.game;
    this.time += dt;
    if (this.resultsT != null) this.resultsT += dt;
    this.updateCamera(dt);

    g.fillStyle = BG; g.fillRect(0, 0, W, H);
    this.drawTitle();

    const { z, x: cx, y: cy } = this.cam;
    g.save();
    g.translate(W / 2, AY + AH / 2); g.scale(z, z); g.translate(-cx, -cy);
    g.drawImage(this.floorLayer, -20, -20);
    this.drawFlood();
    this.drawPads();
    this.drawBricks();
    this.drawDoors();
    this.drawPickups();
    this.drawBumpers();
    this.drawPortals();
    g.drawImage(this.lineLayer, -20, -20);
    this.drawRacers('under');
    this.drawSpinners();
    this.drawRacers('over');
    this.drawParticles(dt);
    g.restore();

    if (game.phase === 'results' || game.phase === 'done') this.drawResults();
  }

  // zoom no vencedor durante a comemoração (como no 1º vídeo de referência)
  updateCamera(dt) {
    const game = this.game, cam = this.cam;
    let tz = 1, tx = AW / 2, ty = AH / 2;
    const win = game.winner;
    if (win && game.phase === 'race') {
      tz = 1.9;
      const hw = AW / 2 / tz, hh = (H / 2) / tz;
      tx = clamp(win.x, hw - AX / tz, AW - hw + AX / tz);
      ty = clamp(win.y, Math.min(AH / 2, hh - AY / tz), Math.max(AH / 2, AH - hh + AY / tz));
    }
    const k = 1 - Math.exp(-dt * 3.2);
    cam.z += (tz - cam.z) * k; cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  }

  drawTitle() {
    const o = this.opts, g = this.g;
    const a = clamp(1 - (this.cam.z - 1) * 2, 0, 1);
    if (a <= 0 || !o.title) return;
    g.save(); g.globalAlpha = a;
    text(g, o.title, W / 2, AY / 2 - (o.subtitle ? 22 : 0), { size: 74, maxW: 1000 });
    if (o.subtitle) text(g, o.subtitle, W / 2, AY / 2 + 50, { size: 38, weight: 700, fill: '#2b2b2b', maxW: 900 });
    g.restore();
  }

  drawFlood() {
    const g = this.g, F = this.game.flood;
    if (!F.started && !F.level.some((v) => v > 0)) return;
    const L = F.level;
    g.fillStyle = this.theme.water;
    g.beginPath();
    if (F.mode === 'path') {
      // correnteza: cada célula enche a partir do lado de onde a água veio. Para a frente da água
      // ficar reta de parede a parede (como nas referências), o nível de cada célula é espalhado
      // pela largura do corredor (perpendicular ao fluxo).
      const { lv: DL, dir: DD } = this.smoothFlood(L, F.from);
      for (let i = 0; i < DL.length; i++) {
        const lv = DL[i];
        if (lv <= 0) continue;
        const x = (i % COLS) * TILE, y = ((i / COLS) | 0) * TILE;
        if (lv >= 1) { g.rect(x - 0.5, y - 0.5, TILE + 1, TILE + 1); continue; }
        const d = DD[i], k = lv * TILE;
        if (d === 0) g.rect(x - 0.5, y, TILE + 1, k);
        else if (d === 1) g.rect(x - 0.5, y + TILE - k, TILE + 1, k);
        else if (d === 2) g.rect(x, y - 0.5, k, TILE + 1);
        else g.rect(x + TILE - k, y - 0.5, k, TILE + 1);
      }
    } else {
      for (let i = 0; i < L.length; i++) {
        const lv = Math.min(1, L[i]);
        if (lv <= 0) continue;
        const x = (i % COLS) * TILE, y = ((i / COLS) | 0) * TILE;
        g.rect(x - 0.5, y + (1 - lv) * TILE - 0.5, TILE + 1, lv * TILE + 1);
      }
    }
    g.fill();
  }

  smoothFlood(L, from) {
    const game = this.game, n = L.length;
    if (!this._fl || this._fl.lv.length !== n) this._fl = { lv: new Float32Array(n), dir: new Int8Array(n) };
    const { lv, dir } = this._fl;
    lv.set(L); dir.set(from);
    const open = (r, c) => { const k = game.cell(r, c); return k && k.k !== 'wall' && k.k !== 'brick'; };
    for (let i = 0; i < n; i++) {
      const v = L[i];
      if (v <= 0 || from[i] < 0) continue;
      const r = (i / COLS) | 0, c = i % COLS, d = from[i];
      const [dr, dc] = d < 2 ? [0, 1] : [1, 0];
      for (const sgn of [-1, 1]) for (let s = 1; s <= 4; s++) {
        const rr = r + dr * s * sgn, cc = c + dc * s * sgn;
        if (!open(rr, cc)) break;
        const j = rr * COLS + cc;
        if (lv[j] < v) { lv[j] = v; if (L[j] <= 0 || dir[j] < 0) dir[j] = d; }
      }
    }
    return this._fl;
  }

  drawBricks() {
    const g = this.g, game = this.game;
    for (const cl of game.clusters) {
      if (cl.hp <= 0) continue;
      const base = cl.owner == null ? BRICK_DARK : this.colorOf(cl.owner);
      const ink = cl.owner == null ? '#0c0c0c' : shade(base, -0.78);
      const sh = (cl.shake || 0) * 3;
      const ox = (Math.random() - 0.5) * sh, oy = (Math.random() - 0.5) * sh;
      const inCl = (r, c) => { const k = game.cell(r, c); return k?.cluster === cl && k.k === 'brick'; };
      g.save(); g.translate(ox, oy);
      g.fillStyle = base;
      for (const cell of cl.cells) g.fillRect(cell.c * TILE - 0.5, cell.r * TILE - 0.5, TILE + 1, TILE + 1);
      // tijolinhos: um desenho a cada bloco 2x2; sobras ganham um desenho pequeno
      if (cl.r0 == null) { cl.r0 = Math.min(...cl.cells.map((k) => k.r)); cl.c0 = Math.min(...cl.cells.map((k) => k.c)); }
      const done = new Set();
      for (const cell of cl.cells) {
        if ((cell.r - cl.r0) % 2 || (cell.c - cl.c0) % 2) continue;
        if (inCl(cell.r, cell.c + 1) && inCl(cell.r + 1, cell.c) && inCl(cell.r + 1, cell.c + 1)) {
          brickGlyph(g, cell.c * TILE, cell.r * TILE, TILE * 2, ink);
          for (const [dr, dc] of [[0, 0], [0, 1], [1, 0], [1, 1]]) done.add((cell.r + dr) * COLS + cell.c + dc);
        }
      }
      for (const cell of cl.cells) if (!done.has(cell.r * COLS + cell.c)) brickGlyph(g, cell.c * TILE, cell.r * TILE, TILE, ink);
      // contorno do bloco
      g.strokeStyle = LINE; g.lineWidth = LW; g.lineCap = 'square';
      g.beginPath();
      for (const cell of cl.cells) {
        const x = cell.c * TILE, y = cell.r * TILE;
        if (!inCl(cell.r - 1, cell.c)) { g.moveTo(x, y); g.lineTo(x + TILE, y); }
        if (!inCl(cell.r + 1, cell.c)) { g.moveTo(x, y + TILE); g.lineTo(x + TILE, y + TILE); }
        if (!inCl(cell.r, cell.c - 1)) { g.moveTo(x, y); g.lineTo(x, y + TILE); }
        if (!inCl(cell.r, cell.c + 1)) { g.moveTo(x + TILE, y); g.lineTo(x + TILE, y + TILE); }
      }
      g.stroke();
      g.restore();
    }
  }

  drawPickups() {
    const g = this.g;
    for (const p of this.game.pickups) {
      if (!p.active) continue;
      if (p.kind === 'knife') drawKnife(g, p.x, p.y, 48, Math.PI / 4);
      else {
        g.fillStyle = p.kind === 'zap' ? '#ffd839' : '#8e44ff';
        g.fillRect(p.x - 14, p.y - 14, 28, 28);
        g.strokeStyle = LINE; g.lineWidth = 3; g.strokeRect(p.x - 14, p.y - 14, 28, 28);
      }
    }
  }

  // elementos extras (as fases padrão não usam): versões chapadas simples
  drawPads() {
    const g = this.g, game = this.game;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (!game.grid[r][c].pad) continue;
      g.fillStyle = 'rgba(38,94,243,.18)'; g.fillRect(c * TILE, r * TILE, TILE, TILE);
    }
  }
  drawDoors() {
    const g = this.g;
    for (const d of this.game.doors) {
      const k = 1 - d.open;
      if (k <= 0.01) continue;
      const x = d.c * TILE, y = d.r * TILE;
      g.fillStyle = '#555'; if (d.horizontal) g.fillRect(x, y + 3, TILE * k, TILE - 6); else g.fillRect(x + 3, y, TILE - 6, TILE * k);
    }
  }
  drawBumpers() {
    const g = this.g;
    for (const b of this.game.bumpers) {
      g.fillStyle = '#ff4fa3'; g.strokeStyle = LINE; g.lineWidth = 3;
      g.beginPath(); g.arc(b.x, b.y, b.R * (1 + b.flash * 0.2), 0, Math.PI * 2); g.fill(); g.stroke();
    }
  }
  drawPortals() {
    const g = this.g;
    for (const p of this.game.portals) {
      g.fillStyle = p.primary ? '#8e44ff' : '#ff8a00'; g.strokeStyle = LINE; g.lineWidth = 3;
      g.beginPath(); g.arc(p.x, p.y, U * 0.4, 0, Math.PI * 2); g.fill(); g.stroke();
    }
  }
  drawSpinners() {
    const g = this.g;
    for (const s of this.game.spinners) {
      g.save(); g.translate(s.x, s.y); g.rotate(s.a);
      g.fillStyle = BRICK_DARK; g.fillRect(-s.L, -6, s.L * 2, 12);
      g.restore();
    }
  }

  drawRacers(layer) {
    const g = this.g, game = this.game;
    for (const r of game.racers) {
      const under = r.state === 'dead';
      if ((layer === 'under') !== under) continue;
      // rastro em cunha (afina para trás e acompanha as curvas)
      let tr = this.trails.get(r.i);
      if (!tr || tr.reset !== r.trailReset) { tr = []; tr.reset = r.trailReset; this.trails.set(r.i, tr); }
      if (r.state === 'alive') { tr.unshift([r.x, r.y]); if (tr.length > 22) tr.length = 22; } else if (tr.length) tr.length = Math.max(0, tr.length - 2);
      if (tr.length > 3) {
        const w0 = r.size * 0.46;
        const left = [], right = [];
        for (let k = 0; k < tr.length; k++) {
          const [x, y] = tr[k];
          const [nx, ny] = tr[Math.min(tr.length - 1, k + 1)];
          const [px, py] = tr[Math.max(0, k - 1)];
          let dx = px - nx, dy = py - ny; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
          const w = w0 * (1 - k / (tr.length - 1));
          left.push([x - dy * w, y + dx * w]); right.push([x + dy * w, y - dx * w]);
        }
        g.save();
        g.globalAlpha = 0.72;
        g.fillStyle = this.colorOf(r.i);
        g.beginPath();
        left.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
        for (let k = right.length - 1; k >= 0; k--) g.lineTo(right[k][0], right[k][1]);
        g.closePath(); g.fill();
        g.restore();
      }
      this.drawRacer(r);
    }
  }

  drawRacer(r) {
    const g = this.g;
    const s = r.size;
    g.save();
    g.translate(Math.round(r.x), Math.round(r.y));
    g.drawImage(this.badges[r.i], -s / 2, -s / 2, s, s);
    g.strokeStyle = LINE; g.lineWidth = 3; g.strokeRect(-s / 2, -s / 2, s, s);
    if (r.state === 'dead') {
      // eliminado: fica parado com um X, igual às referências
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-s / 2, -s / 2, s, s);
      g.strokeStyle = LINE; g.lineWidth = 3;
      g.beginPath(); g.moveTo(-s / 2 + 5, -s / 2 + 5); g.lineTo(s / 2 - 5, s / 2 - 5); g.moveTo(s / 2 - 5, -s / 2 + 5); g.lineTo(-s / 2 + 5, s / 2 - 5); g.stroke();
    }
    if (r.state === 'alive' && r.knife) drawKnife(g, s / 2 + 10, -2, 34, Math.PI / 4 + Math.sin(this.time * 10) * 0.2);
    g.restore();
  }

  drawParticles(dt) {
    const g = this.g;
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;
      p.vy += 1100 * dt; p.vx *= Math.exp(-dt * 2);
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      g.save(); g.globalAlpha = Math.min(1, (p.life / p.max) * 1.6);
      g.translate(p.x, p.y); g.rotate(p.rot);
      g.fillStyle = p.color; g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      g.restore();
      return true;
    });
  }

  // ------------------------------------------------------------ tela final (chapada, mesmo estilo)
  drawResults() {
    const g = this.g, game = this.game;
    const t = this.resultsT ?? 0;
    const k = ease(clamp(t / 0.35, 0, 1));
    g.save(); g.globalAlpha = k; g.fillStyle = BG; g.fillRect(0, 0, W, H); g.restore();
    if (t < 0.15) return;
    const win = game.winner;
    const pop = easeOutBack(clamp((t - 0.15) / 0.45, 0, 1));
    text(g, win ? 'VENCEDOR!' : 'NINGUÉM CHEGOU!', W / 2, 300, { size: 110 * pop + 1 });
    const cy = 640;
    if (win) {
      const s = 300 * pop;
      const bob = Math.sin(t * 3) * 8;
      g.save(); g.translate(W / 2, cy + bob);
      // rastro em cunha atrás do quadrão
      g.globalAlpha = 0.72; g.fillStyle = this.colorOf(win.i);
      g.beginPath(); g.moveTo(-s * 0.42, -s * 0.42); g.lineTo(-s * 1.7, s * 1.7); g.lineTo(s * 0.42, s * 0.42); g.closePath(); g.fill();
      g.globalAlpha = 1;
      g.drawImage(this.badges[win.i], -s / 2, -s / 2, s, s);
      g.strokeStyle = LINE; g.lineWidth = 8; g.strokeRect(-s / 2, -s / 2, s, s);
      g.restore();
      text(g, win.team.name.toUpperCase(), W / 2, cy + 230, { size: 92 * pop + 1, maxW: 980 });
    }
    // ranking
    const rank = game.ranking();
    const rowH = Math.min(92, 560 / rank.length);
    const y0 = 1010;
    rank.forEach((r, idx) => {
      const appear = clamp((t - 0.6 - idx * 0.15) / 0.3, 0, 1);
      if (appear <= 0) return;
      const y = y0 + idx * rowH;
      g.save(); g.globalAlpha = appear; g.translate((1 - easeOutBack(appear)) * 200, 0);
      g.fillStyle = FLOOR; g.fillRect(140, y - rowH / 2 + 6, W - 280, rowH - 12);
      g.strokeStyle = LINE; g.lineWidth = LW; g.strokeRect(140, y - rowH / 2 + 6, W - 280, rowH - 12);
      text(g, `${idx + 1}º`, 205, y, { size: Math.min(46, rowH * 0.5) });
      const bs = Math.min(56, rowH - 28);
      g.drawImage(this.badges[r.i], 255, y - bs / 2, bs, bs);
      g.lineWidth = 3; g.strokeRect(255, y - bs / 2, bs, bs);
      text(g, r.team.name, 335, y, { size: Math.min(40, rowH * 0.45), weight: 800, align: 'left', maxW: 400 });
      const d = r.state === 'alive' ? game.distOf(r) : 0;
      const info = r.state === 'finished' ? `${r.finishT.toFixed(1)}s` : r.state === 'dead' ? 'ELIMINADO' : d < 12 ? 'POR POUCO!' : `faltou ${Math.round(d * 0.28)}m`;
      text(g, info, W - 165, y, { size: Math.min(30, rowH * 0.34), weight: 800, align: 'right', fill: r.state === 'finished' ? '#007d53' : r.state === 'dead' ? '#b00000' : '#2b2b2b' });
      g.restore();
    });
    // CTA
    if (t > 1.4 && this.opts.cta) {
      const p2 = easeOutBack(clamp((t - 1.4) / 0.4, 0, 1));
      g.save(); g.translate(W / 2, 1700); g.scale(p2, p2);
      g.fillStyle = '#d50000'; g.fillRect(-380, -56, 760, 112);
      g.strokeStyle = LINE; g.lineWidth = 5; g.strokeRect(-380, -56, 760, 112);
      text(g, this.opts.cta, 0, 2, { size: 54, fill: '#ffffff', maxW: 680 });
      g.restore();
    }
  }
}
