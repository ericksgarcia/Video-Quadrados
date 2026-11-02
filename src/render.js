// Desenho de tudo: arena, elementos, inundação, competidores, partículas e HUD.
// Canvas vertical 1080x1920 (formato TikTok/Reels/Shorts).
import { TILE, COLS, ROWS, RACE_START, U } from './game.js';
import { makeBadge } from './teams.js';

export const W = 1080;
export const H = 1920;
export const AX = (W - COLS * TILE) / 2; // 36
export const AY = 330;
const AW = COLS * TILE, AH = ROWS * TILE;
const FONT = 'Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

export const THEMES = {
  roxo: { name: 'Inundação', verb: 'A INUNDAÇÃO ESTÁ SUBINDO!', top: '#6d5dfc', bottom: '#2a1d7a', surface: '#b4adff', glow: 'rgba(130,110,255,.55)', bubble: 'rgba(220,215,255,.7)' },
  agua: { name: 'Água', verb: 'A ÁGUA ESTÁ SUBINDO!', top: '#38bdf8', bottom: '#1e3a8a', surface: '#bae6fd', glow: 'rgba(56,189,248,.5)', bubble: 'rgba(224,242,254,.75)' },
  lava: { name: 'Lava', verb: 'A LAVA ESTÁ SUBINDO!', top: '#fb923c', bottom: '#991b1b', surface: '#fde68a', glow: 'rgba(251,146,60,.65)', bubble: 'rgba(254,240,138,.85)' },
  acido: { name: 'Ácido', verb: 'O ÁCIDO ESTÁ SUBINDO!', top: '#a3e635', bottom: '#166534', surface: '#ecfccb', glow: 'rgba(163,230,53,.55)', bubble: 'rgba(236,252,203,.8)' },
};

const FLOOR = '#e8ecf3', FLOOR2 = '#e1e6ee', WALL = '#2c3347', WALL_TOP = '#4a5470', WALL_FACE = '#1b2030';
const BRICK_GENERIC = '#c46a3c';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

function shade(hex, amt) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round((f - r) * p + r); g = Math.round((f - g) * p + g); b = Math.round((f - b) * p + b);
  return `rgb(${r},${g},${b})`;
}

function fitText(g, text, maxW, size, weight = 900) {
  let s = size;
  do { g.font = `${weight} ${s}px ${FONT}`; s -= 2; } while (g.measureText(text).width > maxW && s > 10);
  return s + 2;
}

function strokeText(g, text, x, y, { size = 60, fill = '#fff', stroke = '#0b0f1c', lw = 10, weight = 900, align = 'center', maxW = 1000, shadow = true } = {}) {
  fitText(g, text, maxW, size, weight);
  g.textAlign = align; g.textBaseline = 'middle'; g.lineJoin = 'round';
  if (shadow) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillText(text, x + 4, y + 6); }
  if (lw) { g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(text, x, y); }
  g.fillStyle = fill; g.fillText(text, x, y);
}

// ícones vetoriais (sem depender de emoji)
function drawSword(g, x, y, s, rot = -Math.PI / 4) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s / 40, s / 40);
  g.fillStyle = '#e5e7eb'; g.strokeStyle = '#111827'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(-3.5, -4); g.lineTo(-3.5, -26); g.lineTo(0, -33); g.lineTo(3.5, -26); g.lineTo(3.5, -4); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#facc15'; g.fillRect(-11, -5, 22, 5); g.strokeRect(-11, -5, 22, 5);
  g.fillStyle = '#7c3aed'; g.fillRect(-3, 0, 6, 12); g.strokeRect(-3, 0, 6, 12);
  g.fillStyle = '#facc15'; g.beginPath(); g.arc(0, 15, 3.5, 0, Math.PI * 2); g.fill(); g.stroke();
  g.restore();
}
function drawBolt(g, x, y, s, color = '#facc15') {
  g.save(); g.translate(x, y); g.scale(s / 40, s / 40);
  g.fillStyle = color; g.strokeStyle = '#111827'; g.lineWidth = 2.5; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(4, -20); g.lineTo(-10, 3); g.lineTo(-1, 3); g.lineTo(-5, 20); g.lineTo(11, -4); g.lineTo(2, -4); g.closePath(); g.fill(); g.stroke();
  g.restore();
}
function drawMystery(g, x, y, s, t) {
  g.save(); g.translate(x, y); g.scale(s / 40, s / 40);
  const grd = g.createLinearGradient(0, -16, 0, 16);
  grd.addColorStop(0, '#f472b6'); grd.addColorStop(1, '#7c3aed');
  g.fillStyle = grd; g.strokeStyle = '#111827'; g.lineWidth = 2.5;
  roundRect(g, -16, -16, 32, 32, 6); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.font = `900 24px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('?', 0, 2 + Math.sin(t * 6) * 1.5);
  g.restore();
}
function drawSnow(g, x, y, s) {
  g.save(); g.translate(x, y); g.strokeStyle = '#e0f2fe'; g.lineWidth = s * 0.09; g.lineCap = 'round';
  for (let i = 0; i < 3; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(-s / 2, 0); g.lineTo(s / 2, 0); g.stroke(); }
  g.restore();
}

export class Renderer {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    canvas.width = W; canvas.height = H;
    this.opts = { title: 'QUAL TIME VENCE?', subtitle: 'Comente seu palpite!', handle: '', theme: 'roxo', cta: 'COMENTE SEU TIME!', ...opts };
    this.particles = [];
    this.popups = [];
    this.shake = 0;
    this.flash = 0;
    this.time = 0;
    this.trails = new Map();
    this.banner = null;
    this.countdown = null;
  }

  get theme() { return THEMES[this.opts.theme] || THEMES.roxo; }

  attach(game) {
    this.game = game;
    this.badges = game.racers.map((r) => makeBadge(r.team, 128));
    this.smallBadges = game.racers.map((r) => makeBadge(r.team, 48));
    this.trails = new Map();
    this.particles = []; this.popups = []; this.banner = null; this.countdown = null;
    this.buildStatic();
    this.bgPattern = this.makeBgPattern();
  }

  // ------------------------------------------------------------ camada estática (chão + paredes)
  buildStatic() {
    const game = this.game;
    const c = document.createElement('canvas');
    c.width = AW + 40; c.height = AH + 40;
    const g = c.getContext('2d');
    g.translate(20, 20);
    const isWall = (r, cc) => { const k = game.cell(r, cc); return !k || k.k === 'wall'; };
    // chão
    for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) {
      const cell = game.grid[r][cc];
      if (cell.k === 'wall') continue;
      const x = cc * TILE, y = r * TILE;
      if (cell.k === 'finish') {
        const n = 2, s = TILE / n;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? '#101321' : '#f8fafc'; g.fillRect(x + i * s, y + j * s, s, s); }
      } else {
        g.fillStyle = ((r >> 1) + (cc >> 1)) % 2 ? FLOOR : FLOOR2; g.fillRect(x, y, TILE, TILE);
        if (cell.src) { g.fillStyle = 'rgba(80,90,120,.12)'; g.fillRect(x, y, TILE, TILE); }
      }
    }
    // sombra das paredes projetada no chão
    g.fillStyle = 'rgba(15,20,40,.22)';
    for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) if (isWall(r, cc)) g.fillRect(cc * TILE + 5, r * TILE + 7, TILE, TILE);
    // paredes
    for (let r = 0; r < ROWS; r++) for (let cc = 0; cc < COLS; cc++) {
      if (!isWall(r, cc)) continue;
      const x = cc * TILE, y = r * TILE;
      g.fillStyle = WALL; g.fillRect(x, y, TILE, TILE);
      if (!isWall(r + 1, cc)) { g.fillStyle = WALL_FACE; g.fillRect(x, y + TILE - 7, TILE, 7); }
      if (!isWall(r - 1, cc)) { g.fillStyle = WALL_TOP; g.fillRect(x, y, TILE, 3); }
      if (!isWall(r, cc - 1)) { g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x, y, 3, TILE); }
    }
    // contorno arredondado da arena
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 2; g.strokeRect(1, 1, AW - 2, AH - 2);
    this.staticLayer = c;
  }

  makeBgPattern() {
    const c = document.createElement('canvas'); c.width = c.height = 120;
    const g = c.getContext('2d');
    g.strokeStyle = 'rgba(255,255,255,.035)'; g.lineWidth = 18;
    g.beginPath(); g.moveTo(-30, 150); g.lineTo(150, -30); g.stroke();
    g.beginPath(); g.moveTo(-90, 90); g.lineTo(90, -90); g.stroke();
    g.beginPath(); g.moveTo(30, 210); g.lineTo(210, 30); g.stroke();
    return this.g.createPattern(c, 'repeat');
  }

  // ------------------------------------------------------------ eventos -> efeitos visuais
  onEvent(name, p) {
    const game = this.game;
    const teamColor = (i) => game.racers[i]?.team.color || '#fff';
    switch (name) {
      case 'count': this.countdown = { text: String(p.n), t: 0, color: '#ffffff' }; break;
      case 'go': this.countdown = { text: 'VAI!', t: 0, color: '#4ade80' }; this.flash = 0.5; break;
      case 'bounce': this.burst(p.x, p.y, 4, { color: teamColor(p.i), speed: 120, life: 0.25, size: 3, type: 'spark' }); break;
      case 'clack': this.burst(p.x, p.y, 8, { color: '#ffffff', speed: 220, life: 0.3, size: 3, type: 'spark' }); this.ring(p.x, p.y, '#ffffff', 30); break;
      case 'brickHit': this.burst(p.x, p.y, 6, { color: p.owner == null ? BRICK_GENERIC : teamColor(p.owner), speed: 160, life: 0.5, size: 6, type: 'debris' }); this.shake = Math.max(this.shake, 4); break;
      case 'brickBreak': {
        const col = p.owner == null ? BRICK_GENERIC : teamColor(p.owner);
        for (const [c, r] of p.cells) this.burst((c + 0.5) * TILE, (r + 0.5) * TILE, 10, { color: col, speed: 320, life: 0.9, size: 9, type: 'debris' });
        this.ring(p.x, p.y, col, 90);
        this.shake = Math.max(this.shake, 14);
        if (p.owner != null) this.popup(p.x, p.y - 30, 'QUEBROU!', teamColor(p.by));
        break;
      }
      case 'bumper': this.ring(p.x, p.y, '#f472b6', 50); this.burst(p.x, p.y, 6, { color: '#f9a8d4', speed: 200, life: 0.3, size: 3, type: 'spark' }); break;
      case 'spinner': this.burst(p.x, p.y, 10, { color: '#fde047', speed: 300, life: 0.3, size: 3, type: 'spark' }); break;
      case 'boost': this.burst(p.x, p.y, 10, { color: '#22d3ee', speed: 200, life: 0.4, size: 4, type: 'spark' }); break;
      case 'portal':
        this.ring(p.x, p.y, '#c084fc', 60); this.ring(p.x2, p.y2, '#fb923c', 60);
        this.burst(p.x2, p.y2, 14, { color: '#e9d5ff', speed: 260, life: 0.5, size: 4, type: 'star' });
        this.trails.set(p.i, []);
        break;
      case 'pickup': {
        const label = { sword: 'ESPADA!', zap: 'TURBO!', freeze: 'CONGELOU TODOS!' }[p.kind] || '!';
        const col = { sword: '#e5e7eb', zap: '#facc15', freeze: '#7dd3fc' }[p.kind] || '#fff';
        this.popup(p.x, p.y - 40, label, col);
        this.burst(p.x, p.y, 18, { color: col, speed: 280, life: 0.6, size: 5, type: 'star' });
        this.ring(p.x, p.y, col, 70);
        if (p.kind === 'freeze') this.flash = 0.35;
        break;
      }
      case 'swordHit': this.popup(p.x, p.y - 40, 'PANCADA!', '#f87171'); this.ring(p.x, p.y, '#fff', 80); this.shake = Math.max(this.shake, 10); this.burst(p.x, p.y, 16, { color: '#fff', speed: 380, life: 0.4, size: 4, type: 'spark' }); break;
      case 'floodStart': this.banner = { text: this.theme.verb, t: 0, dur: 2.4 }; this.shake = Math.max(this.shake, 6); break;
      case 'splash': {
        const th = this.theme;
        this.burst(p.x, p.y, 14, { color: th.surface, speed: 300, life: 0.7, size: 5, type: 'drop', gy: 900 });
        this.ring(p.x, p.y, th.surface, 50);
        if (!this._splashPop || this.time - this._splashPop > 3) { this._splashPop = this.time; this.popup(p.x, p.y - 40, 'SPLASH!', th.surface); }
        break;
      }
      case 'eliminate': {
        const th = this.theme;
        this.burst(p.x, p.y, 24, { color: th.surface, speed: 380, life: 0.9, size: 6, type: 'drop', gy: 900 });
        this.ring(p.x, p.y, th.surface, 80);
        this.popup(p.x, p.y - 50, 'ELIMINADO', '#f87171');
        this.shake = Math.max(this.shake, 10);
        break;
      }
      case 'finish': {
        const col = p.place === 1 ? '#facc15' : p.place === 2 ? '#e5e7eb' : p.place === 3 ? '#f59e0b' : '#ffffff';
        this.popup(p.x, p.y + 70, `${p.place}º LUGAR!`, col, 1.4);
        this.confetti(p.x, p.y, p.place === 1 ? 90 : 30);
        this.ring(p.x, p.y, col, 120);
        if (p.place === 1) { this.flash = 0.7; this.shake = Math.max(this.shake, 12); }
        break;
      }
      case 'results': this.resultsT = 0; this.confetti(AW / 2, -20, 160, true); break;
      default: break;
    }
  }

  burst(x, y, n, { color, speed = 200, life = 0.5, size = 4, type = 'spark', gy }) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * rand(0.35, 1);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (type === 'debris' ? 120 : 0), life: life * rand(0.6, 1.2), max: life, size: size * rand(0.6, 1.3), color, type, rot: Math.random() * 6, vr: rand(-12, 12), gy: gy ?? (type === 'debris' ? 1100 : type === 'spark' ? 0 : 200) });
    }
  }
  ring(x, y, color, r) { this.particles.push({ x, y, type: 'ring', color, life: 0.45, max: 0.45, r }); }
  confetti(x, y, n, rain = false) {
    const cols = ['#f43f5e', '#facc15', '#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const a = rain ? Math.PI / 2 + rand(-0.6, 0.6) : rand(-Math.PI, 0);
      const s = rain ? rand(100, 500) : rand(250, 800);
      this.particles.push({ x: rain ? rand(0, AW) : x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(1.6, 3), max: 3, size: rand(8, 16), color: cols[i % cols.length], type: 'confetti', rot: Math.random() * 6, vr: rand(-10, 10), gy: 520 });
    }
  }
  popup(x, y, text, color, scale = 1) { this.popups.push({ x, y, text, color, t: 0, life: 1.2, scale }); }

  // ------------------------------------------------------------ frame
  draw(dt) {
    const g = this.g, game = this.game;
    this.time += dt;
    this.shake *= Math.exp(-dt * 9);
    this.flash = Math.max(0, this.flash - dt * 1.6);
    if (this.resultsT != null) this.resultsT += dt;

    this.drawBackground();
    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;

    // moldura da arena
    g.save();
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 50; g.shadowOffsetY = 18;
    g.fillStyle = '#0d1120'; roundRect(g, AX - 14, AY - 14, AW + 28, AH + 28, 26); g.fill();
    g.restore();
    g.save();
    roundRect(g, AX - 14, AY - 14, AW + 28, AH + 28, 26);
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 3; g.stroke();
    g.restore();

    g.save();
    g.translate(AX + sx, AY + sy);
    g.save(); g.beginPath(); g.rect(-6, -6, AW + 12, AH + 12); g.clip();
    g.drawImage(this.staticLayer, -20, -20);
    this.drawFinishShine();
    this.drawPads();
    this.drawPortals();
    this.drawBricks();
    this.drawDoors();
    this.drawPickups();
    this.drawBumpers();
    this.drawRacers('under');
    this.drawFlood(dt);
    this.drawSpinners();
    this.drawRacers('over');
    this.drawParticles(dt);
    this.drawPopups(dt);
    g.restore();
    g.restore();

    this.drawHUD(dt);
    if (this.flash > 0) { g.fillStyle = `rgba(255,255,255,${this.flash * 0.45})`; g.fillRect(0, 0, W, H); }
    if (game.phase === 'results' || game.phase === 'done') this.drawResults(dt);
  }

  drawBackground() {
    const g = this.g;
    const grd = g.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#111733'); grd.addColorStop(0.55, '#1c1640'); grd.addColorStop(1, '#2b1648');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    g.save();
    const off = (this.time * 30) % 120;
    g.translate(off, -off);
    g.fillStyle = this.bgPattern; g.fillRect(-120, -120, W + 240, H + 240);
    g.restore();
    // brilho radial atrás do título
    const rg = g.createRadialGradient(W / 2, 170, 10, W / 2, 170, 520);
    rg.addColorStop(0, 'rgba(168,85,247,.28)'); rg.addColorStop(1, 'rgba(168,85,247,0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, 600);
  }

  drawFinishShine() {
    const g = this.g, game = this.game;
    if (!game.finishTiles.length) return;
    g.save();
    g.beginPath();
    for (const f of game.finishTiles) g.rect(f.c * TILE, f.r * TILE, TILE, TILE);
    g.clip();
    const x = ((this.time * 260) % (AW + 600)) - 300;
    const grd = g.createLinearGradient(x - 80, 0, x + 80, 0);
    grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.5, 'rgba(255,230,120,.38)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, AW, AH);
    g.restore();
  }

  drawPads() {
    const g = this.g, game = this.game;
    const ang = { '^': -Math.PI / 2, v: Math.PI / 2, '<': Math.PI, '>': 0 };
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const cell = game.grid[r][c];
      if (!cell.pad) continue;
      const x = c * TILE, y = r * TILE;
      g.fillStyle = 'rgba(14,165,233,.16)'; g.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
      g.save(); g.translate(x + TILE / 2, y + TILE / 2); g.rotate(ang[cell.pad]); g.scale(TILE / 56, TILE / 56);
      for (let k = 0; k < 2; k++) {
        const ph = ((this.time * 2.2 + k * 0.5) % 1);
        const px = -14 + ph * 26;
        g.strokeStyle = `rgba(6,182,212,${0.9 * Math.sin(ph * Math.PI)})`; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(px - 8, -12); g.lineTo(px + 4, 0); g.lineTo(px - 8, 12); g.stroke();
      }
      g.restore();
    }
  }

  drawPortals() {
    const g = this.g;
    for (const p of this.game.portals) {
      const col = p.primary ? ['#a855f7', '#e9d5ff'] : ['#f97316', '#fed7aa'];
      g.save(); g.translate(p.x, p.y);
      const pul = 1 + p.pulse * 0.35;
      const rg = g.createRadialGradient(0, 0, 2, 0, 0, U * 0.55 * pul);
      rg.addColorStop(0, col[1]); rg.addColorStop(0.45, col[0]); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(0, 0, U * 0.55 * pul, 0, Math.PI * 2); g.fill();
      g.rotate(this.time * (p.primary ? 3 : -3));
      g.strokeStyle = col[1]; g.lineWidth = 3.5;
      for (let k = 0; k < 3; k++) { g.rotate((Math.PI * 2) / 3); g.beginPath(); g.arc(0, 0, U * 0.3, 0, Math.PI * 0.7); g.stroke(); }
      g.fillStyle = '#0b0b17'; g.beginPath(); g.arc(0, 0, U * 0.12, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }

  drawBricks() {
    const g = this.g, game = this.game;
    for (const cl of game.clusters) {
      if (cl.hp <= 0) continue;
      const base = cl.owner == null ? BRICK_GENERIC : game.racers[cl.owner]?.team.color || '#64748b';
      const sh = (cl.shake || 0) * 4;
      const ox = (Math.random() - 0.5) * sh, oy = (Math.random() - 0.5) * sh;
      const dmg = 1 - cl.hp / cl.maxHp;
      for (const cell of cl.cells) {
        const x = cell.c * TILE + ox, y = cell.r * TILE + oy;
        g.fillStyle = shade(base, -0.25); g.fillRect(x, y, TILE, TILE);
        // tijolinhos
        const rowsB = 2, bh = TILE / rowsB;
        for (let i = 0; i < rowsB; i++) {
          const off = i % 2 ? TILE / 4 : 0;
          for (let j = -1; j < 2; j++) {
            const bx = x + off + j * (TILE / 2) + 1, by = y + i * bh + 1;
            const x0 = Math.max(x + 1, bx), x1 = Math.min(x + TILE - 1, bx + TILE / 2 - 2);
            if (x1 <= x0) continue;
            g.fillStyle = (i + j) % 2 ? base : shade(base, 0.08);
            g.fillRect(x0, by, x1 - x0, bh - 2);
            g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x0, by, x1 - x0, 1.5);
          }
        }
        // rachaduras conforme o dano
        if (dmg > 0) {
          g.strokeStyle = `rgba(10,10,20,${0.35 + dmg * 0.5})`; g.lineWidth = 2.5;
          const seed = cell.r * 31 + cell.c * 17;
          const n = Math.ceil(dmg * 2);
          for (let k = 0; k < n; k++) {
            const sx0 = x + ((seed * (k + 3)) % 18) + 4, sy0 = y + ((seed * (k + 7)) % 14) + 3;
            g.beginPath(); g.moveTo(sx0, sy0);
            g.lineTo(sx0 + ((seed + k * 13) % 10) - 5, sy0 + 7);
            g.lineTo(sx0 + ((seed + k * 29) % 12) - 6, sy0 + 13);
            g.stroke();
          }
        }
      }
      // escudo/bandeira do dono (um a cada bloco 2x2 do tijolo colorido)
      if (cl.owner != null && this.smallBadges[cl.owner]) {
        const inCl = (r, c) => game.cell(r, c)?.cluster === cl;
        if (cl.r0 == null) { cl.r0 = Math.min(...cl.cells.map((k) => k.r)); cl.c0 = Math.min(...cl.cells.map((k) => k.c)); }
        for (const cell of cl.cells) {
          if ((cell.r - cl.r0) % 2 || (cell.c - cl.c0) % 2) continue;
          if (!inCl(cell.r + 1, cell.c + 1) || !inCl(cell.r, cell.c + 1) || !inCl(cell.r + 1, cell.c)) continue;
          const cx = (cell.c + 1) * TILE + ox, cy = (cell.r + 1) * TILE + oy;
          g.fillStyle = '#fff'; roundRect(g, cx - 14, cy - 14, 28, 28, 5); g.fill();
          g.drawImage(this.smallBadges[cl.owner], cx - 12, cy - 12, 24, 24);
        }
      }
      // contorno do bloco
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2;
      for (const cell of cl.cells) {
        const x = cell.c * TILE + ox, y = cell.r * TILE + oy;
        const same = (r, c) => game.cell(r, c)?.cluster === cl && game.cell(r, c).k === 'brick';
        g.beginPath();
        if (!same(cell.r - 1, cell.c)) { g.moveTo(x, y + 1); g.lineTo(x + TILE, y + 1); }
        if (!same(cell.r + 1, cell.c)) { g.moveTo(x, y + TILE - 1); g.lineTo(x + TILE, y + TILE - 1); }
        if (!same(cell.r, cell.c - 1)) { g.moveTo(x + 1, y); g.lineTo(x + 1, y + TILE); }
        if (!same(cell.r, cell.c + 1)) { g.moveTo(x + TILE - 1, y); g.lineTo(x + TILE - 1, y + TILE); }
        g.stroke();
      }
    }
  }

  drawDoors() {
    const g = this.g;
    for (const d of this.game.doors) {
      const x = d.c * TILE, y = d.r * TILE;
      const k = 1 - d.open;
      // trilho
      g.fillStyle = 'rgba(20,24,40,.25)'; g.fillRect(x, y, TILE, TILE);
      if (k <= 0.01) continue;
      g.save();
      g.beginPath();
      if (d.horizontal) g.rect(x, y + 3, TILE * k, TILE - 6); else g.rect(x + 3, y, TILE - 6, TILE * k);
      g.clip();
      g.fillStyle = '#374151'; g.fillRect(x, y, TILE, TILE);
      // listras de perigo
      g.fillStyle = '#facc15';
      for (let i = -2; i < 3; i++) { const sx = x + i * 14 + (d.c % 2) * 7; g.beginPath(); g.moveTo(sx, y + TILE); g.lineTo(sx + 7, y + TILE); g.lineTo(sx + 7 + TILE, y); g.lineTo(sx + TILE, y); g.closePath(); g.fill(); }
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x, y + TILE - 4, TILE, 4);
      g.restore();
    }
  }

  drawPickups() {
    const g = this.g;
    for (const p of this.game.pickups) {
      if (!p.active) continue;
      const bob = Math.sin(this.time * 3 + p.x) * 4;
      const rg = g.createRadialGradient(p.x, p.y, 2, p.x, p.y, 34);
      const glow = p.kind === 'sword' ? 'rgba(167,139,250,.55)' : p.kind === 'zap' ? 'rgba(250,204,21,.55)' : 'rgba(244,114,182,.55)';
      rg.addColorStop(0, glow); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(p.x, p.y, 34, 0, Math.PI * 2); g.fill();
      if (p.kind === 'sword') drawSword(g, p.x, p.y + bob, 40, -Math.PI / 4 + Math.sin(this.time * 2) * 0.2);
      else if (p.kind === 'zap') drawBolt(g, p.x, p.y + bob, 40);
      else drawMystery(g, p.x, p.y + bob, 40, this.time);
    }
  }

  drawBumpers() {
    const g = this.g;
    for (const b of this.game.bumpers) {
      const R = b.R * (1 + b.flash * 0.25);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(b.x + 4, b.y + 6, R, 0, Math.PI * 2); g.fill();
      const rg = g.createRadialGradient(b.x - R * 0.3, b.y - R * 0.3, 2, b.x, b.y, R);
      rg.addColorStop(0, b.flash > 0 ? '#fff' : '#fbcfe8'); rg.addColorStop(0.6, '#ec4899'); rg.addColorStop(1, '#9d174d');
      g.fillStyle = rg; g.beginPath(); g.arc(b.x, b.y, R, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#fdf2f8'; g.lineWidth = 3; g.beginPath(); g.arc(b.x, b.y, R * 0.62, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#500724'; g.lineWidth = 3; g.beginPath(); g.arc(b.x, b.y, R, 0, Math.PI * 2); g.stroke();
    }
  }

  drawSpinners() {
    const g = this.g;
    for (const s of this.game.spinners) {
      g.save(); g.translate(s.x, s.y); g.rotate(s.a);
      g.fillStyle = 'rgba(0,0,0,.25)'; roundRect(g, -s.L + 4, -7 + 6, s.L * 2, 14, 7); g.fill();
      const grd = g.createLinearGradient(-s.L, 0, s.L, 0);
      grd.addColorStop(0, '#ef4444'); grd.addColorStop(0.5, '#fca5a5'); grd.addColorStop(1, '#ef4444');
      g.fillStyle = grd; roundRect(g, -s.L, -7, s.L * 2, 14, 7); g.fill();
      g.strokeStyle = '#450a0a'; g.lineWidth = 3; g.stroke();
      g.fillStyle = '#fff';
      for (let i = -3; i <= 3; i++) if (i) g.fillRect(i * (s.L / 4) - 3, -7, 6, 14);
      g.fillStyle = '#1f2937'; g.beginPath(); g.arc(0, 0, 11, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#9ca3af'; g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  }

  drawFlood(dt) {
    const g = this.g, game = this.game, F = game.flood, th = this.theme;
    if (!F.started && !F.level.some((v) => v > 0)) return;
    if (!this.floodGrad) {
      this.floodGrad = {};
    }
    const key = th.top + th.bottom;
    if (!this.floodGrad[key]) {
      const grd = g.createLinearGradient(0, 0, 0, AH);
      grd.addColorStop(0, th.top); grd.addColorStop(1, th.bottom);
      this.floodGrad[key] = grd;
    }
    const L = F.level, t = this.time;
    const wave = (x) => Math.sin(x * 0.045 + t * 3.2) * 3 + Math.sin(x * 0.09 - t * 2.1) * 2;
    g.save();
    g.globalAlpha = 0.93;
    g.fillStyle = this.floodGrad[key];
    g.beginPath();
    const surfaces = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const lv = L[r * COLS + c];
      if (lv <= 0) continue;
      const x = c * TILE, y = r * TILE;
      const aboveFull = r > 0 && L[(r - 1) * COLS + c] > 0;
      if (lv >= 1 && aboveFull) { g.rect(x - 0.5, y - 0.5, TILE + 1, TILE + 1); continue; }
      const top = y + (1 - lv) * TILE;
      // superfície ondulada
      g.moveTo(x - 0.5, y + TILE + 0.5);
      for (let k = 0; k <= 4; k++) { const xx = x + (k / 4) * TILE; g.lineTo(xx + (k === 4 ? 0.5 : k === 0 ? -0.5 : 0), Math.min(y + TILE, top + wave(xx) * Math.min(1, lv * 3))); }
      g.lineTo(x + TILE + 0.5, y + TILE + 0.5);
      g.closePath();
      surfaces.push([x, top, lv]);
    }
    g.fill();
    g.globalAlpha = 1;
    // brilho da superfície
    g.strokeStyle = th.surface; g.lineWidth = 3; g.globalAlpha = 0.8;
    g.beginPath();
    for (const [x, top, lv] of surfaces) {
      if (lv < 0.06) continue;
      for (let k = 0; k <= 4; k++) { const xx = x + (k / 4) * TILE; const yy = top + wave(xx) * Math.min(1, lv * 3); k ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
    }
    g.stroke();
    g.restore();
    // bolhas
    if (!this.bubbles) this.bubbles = [];
    if (surfaces.length && Math.random() < dt * 14) {
      const flooded = [];
      for (let i = 0; i < L.length; i++) if (L[i] >= 1) flooded.push(i);
      if (flooded.length) {
        const i = flooded[Math.floor(Math.random() * flooded.length)];
        this.bubbles.push({ x: (i % COLS + Math.random()) * TILE, y: ((i / COLS | 0) + 1) * TILE, r: rand(2, 6), vy: rand(30, 80), life: rand(0.8, 2) });
      }
    }
    g.fillStyle = th.bubble;
    this.bubbles = this.bubbles.filter((b) => {
      b.life -= dt; b.y -= b.vy * dt; b.x += Math.sin(b.y * 0.1) * 0.3;
      const s = game.waterSurfaceAt(b.x, b.y);
      if (b.life <= 0 || b.y < s) return false;
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, Math.PI * 2); g.fill();
      return true;
    });
  }

  drawRacers(layer) {
    const g = this.g, game = this.game;
    for (const r of game.racers) {
      const under = r.state === 'dead';
      if ((layer === 'under') !== under) continue;
      // trilha
      let tr = this.trails.get(r.i);
      if (!tr || tr.reset !== r.trailReset) { tr = []; tr.reset = r.trailReset; this.trails.set(r.i, tr); }
      if (r.state === 'alive') { tr.unshift([r.x, r.y]); if (tr.length > 16) tr.length = 16; } else if (tr.length) tr.pop();
      if (tr.length > 2 && r.state === 'alive') {
        g.save();
        const col = r.team.color;
        const w0 = r.size * 0.42;
        g.beginPath();
        const left = [], right = [];
        for (let k = 0; k < tr.length; k++) {
          const [x, y] = tr[k];
          const [nx, ny] = tr[Math.min(tr.length - 1, k + 1)];
          const [px, py] = tr[Math.max(0, k - 1)];
          let dx = px - nx, dy = py - ny; const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
          const w = w0 * (1 - k / tr.length);
          left.push([x - dy * w, y + dx * w]); right.push([x + dy * w, y - dx * w]);
        }
        left.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
        for (let k = right.length - 1; k >= 0; k--) g.lineTo(right[k][0], right[k][1]);
        g.closePath();
        const [hx, hy] = tr[0], [ex, ey] = tr[tr.length - 1];
        const grd = g.createLinearGradient(hx, hy, ex, ey);
        grd.addColorStop(0, col); grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.globalAlpha = r.boost > 0.3 || r.zap > 0 ? 0.85 : 0.6;
        g.fillStyle = grd; g.fill();
        g.restore();
      }
      this.drawRacer(r);
    }
  }

  drawRacer(r) {
    const g = this.g;
    let s = r.size * (1 + r.squash * 0.18);
    let alpha = 1, sink = 0;
    if (r.state === 'dead') {
      const k = clamp((this.game.raceTime - r.deathT) / 1.4, 0, 1);
      alpha = 1 - k * 0.75; s *= 1 - k * 0.3; sink = k * 26; // afundando
    }
    g.save();
    g.translate(r.x, r.y + sink);
    if (r.inWater && r.state === 'alive') g.rotate(Math.sin(this.time * 9 + r.i) * 0.18); // boiando
    g.globalAlpha = alpha;
    if (r.state === 'dead') g.filter = 'grayscale(1) brightness(.8)';
    // aura de power-up
    if (r.state === 'alive' && (r.sword > 0 || r.zap > 0 || r.boost > 0.6)) {
      const col = r.sword > 0 ? 'rgba(167,139,250,.65)' : r.zap > 0 ? 'rgba(250,204,21,.7)' : 'rgba(34,211,238,.45)';
      const rg = g.createRadialGradient(0, 0, s * 0.3, 0, 0, s * 1.2);
      rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg; g.beginPath(); g.arc(0, 0, s * 1.2, 0, Math.PI * 2); g.fill();
    }
    // sombra
    g.fillStyle = 'rgba(0,0,0,.28)'; roundRect(g, -s / 2 + 4, -s / 2 + 7, s, s, 7); g.fill();
    // borda branca
    g.fillStyle = r.state === 'finished' ? '#facc15' : '#ffffff';
    roundRect(g, -s / 2 - 3, -s / 2 - 3, s + 6, s + 6, 8); g.fill();
    // badge
    g.save(); roundRect(g, -s / 2, -s / 2, s, s, 6); g.clip();
    g.drawImage(this.badges[r.i], -s / 2, -s / 2, s, s);
    if (r.frozen > 0) { g.fillStyle = 'rgba(186,230,253,.55)'; g.fillRect(-s / 2, -s / 2, s, s); }
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 2; roundRect(g, -s / 2 - 3, -s / 2 - 3, s + 6, s + 6, 8); g.stroke();
    g.filter = 'none';
    if (r.frozen > 0) drawSnow(g, s / 2, -s / 2, 16);
    if (r.state === 'alive' && r.sword > 0) drawSword(g, Math.cos(this.time * 7) * s * 0.75, Math.sin(this.time * 7) * s * 0.75, 30, this.time * 7 + Math.PI / 2);
    if (r.state === 'alive' && r.zap > 0) drawBolt(g, s / 2 + 2, -s / 2 - 2, 20);
    if (r.state === 'finished') {
      g.fillStyle = '#111827'; g.beginPath(); g.arc(s / 2, -s / 2, 14, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#facc15'; g.font = `900 17px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(r.place), s / 2, -s / 2 + 1);
    }
    g.restore();
  }

  drawParticles(dt) {
    const g = this.g;
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;
      const k = p.life / p.max;
      if (p.type === 'ring') {
        const e = 1 - k;
        g.strokeStyle = p.color; g.globalAlpha = k; g.lineWidth = 6 * k + 1;
        g.beginPath(); g.arc(p.x, p.y, 8 + p.r * e, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
        return true;
      }
      p.vy += (p.gy || 0) * dt;
      if (p.type === 'confetti') { p.vx *= Math.exp(-dt * 1.5); p.vy = Math.min(p.vy, 260); }
      else p.vx *= Math.exp(-dt * 2);
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      g.globalAlpha = Math.min(1, k * 1.5);
      g.fillStyle = p.color;
      if (p.type === 'spark') {
        g.strokeStyle = p.color; g.lineWidth = p.size; g.lineCap = 'round';
        g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); g.stroke();
      } else if (p.type === 'debris') {
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-p.size / 2, p.size * 0.1, p.size, p.size * 0.25); g.restore();
      } else if (p.type === 'confetti') {
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.scale(1, Math.cos(p.rot * 2)); g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); g.restore();
      } else if (p.type === 'star') {
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
        g.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? p.size * 0.35 : p.size; const a = (i * Math.PI) / 4; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); g.restore();
      } else { g.beginPath(); g.arc(p.x, p.y, p.size * k + 1, 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = 1;
      return true;
    });
  }

  drawPopups(dt) {
    const g = this.g;
    this.popups = this.popups.filter((p) => {
      p.t += dt;
      if (p.t > p.life) return false;
      const k = p.t / p.life;
      const sc = (k < 0.2 ? easeOutBack(k / 0.2) : 1) * p.scale;
      g.save(); g.translate(clamp(p.x, 130, AW - 130), p.y - k * 40); g.scale(sc, sc);
      g.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
      strokeText(g, p.text, 0, 0, { size: 40, fill: p.color, lw: 9, maxW: 400 });
      g.restore();
      return true;
    });
  }

  // ------------------------------------------------------------ HUD
  drawHUD(dt) {
    const g = this.g, game = this.game, o = this.opts;
    // título
    const pulse = 1 + Math.sin(this.time * 4) * 0.015;
    g.save(); g.translate(W / 2, 150); g.scale(pulse, pulse);
    strokeText(g, o.title, 0, 0, { size: 76, fill: '#ffffff', lw: 14, maxW: 1000 });
    g.restore();
    if (o.subtitle) strokeText(g, o.subtitle, W / 2, 222, { size: 38, fill: '#facc15', lw: 8, maxW: 900, weight: 800 });

    // chips de status dos competidores
    const n = game.racers.length;
    const rowY = 278;
    const chipW = Math.min(250, (W - 60) / n - 10);
    const total = n * chipW + (n - 1) * 10;
    let x = (W - total) / 2;
    for (const r of game.racers) {
      const cx = x;
      g.save();
      g.globalAlpha = r.state === 'dead' ? 0.55 : 1;
      g.fillStyle = r.state === 'finished' ? 'rgba(250,204,21,.22)' : 'rgba(10,14,30,.7)';
      roundRect(g, cx, rowY - 26, chipW, 52, 14); g.fill();
      g.strokeStyle = r.state === 'finished' ? '#facc15' : r.team.color; g.lineWidth = 3; g.stroke();
      const wide = chipW > 150;
      const bs = 38;
      const bx = wide ? cx + 8 : cx + (chipW - bs) / 2;
      g.fillStyle = '#fff'; roundRect(g, bx - 1, rowY - bs / 2 - 1, bs + 2, bs + 2, 5); g.fill();
      g.drawImage(this.badges[r.i], bx, rowY - bs / 2, bs, bs);
      if (wide) {
        let label = r.team.name;
        if (r.state === 'finished') label = `${r.place}º ${r.team.name}`;
        g.fillStyle = r.state === 'finished' ? '#facc15' : '#fff';
        fitText(g, label, chipW - bs - 26, 24, 800);
        g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillText(label, cx + bs + 18, rowY + 1);
      } else if (r.state === 'finished') {
        g.fillStyle = '#111827'; g.beginPath(); g.arc(bx + bs, rowY - bs / 2 + 2, 13, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#facc15'; g.font = `900 16px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(`${r.place}º`, bx + bs, rowY - bs / 2 + 3);
      }
      if (r.state === 'dead') {
        g.globalAlpha = 1; g.strokeStyle = '#ef4444'; g.lineWidth = 5; g.lineCap = 'round';
        g.beginPath(); g.moveTo(bx + 2, rowY - 16); g.lineTo(bx + bs - 2, rowY + 16); g.moveTo(bx + bs - 2, rowY - 16); g.lineTo(bx + 2, rowY + 16); g.stroke();
      }
      g.restore();
      x += chipW + 10;
    }

    // cronômetro + @
    const rt = game.phase === 'intro' || game.phase === 'countdown' ? 0 : (game.endT ? game.endT - RACE_START : game.raceTime);
    const mm = Math.floor(rt / 60), ss = Math.floor(rt % 60), cs = Math.floor((rt * 10) % 10);
    strokeText(g, `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${cs}`, W / 2, AY + AH + 60, { size: 44, fill: '#e2e8f0', lw: 8, weight: 800 });
    if (o.handle) strokeText(g, o.handle, W / 2, AY + AH + 112, { size: 32, fill: 'rgba(255,255,255,.75)', lw: 6, weight: 700 });

    // contagem regressiva
    if (this.countdown) {
      const c = this.countdown; c.t += dt;
      const k = c.t / 0.6;
      if (k < 1.2) {
        const sc = k < 0.35 ? easeOutBack(k / 0.35) * 1.15 : 1.15 - (k - 0.35) * 0.2;
        g.save(); g.translate(W / 2, AY + AH * 0.42); g.scale(sc, sc);
        g.globalAlpha = k > 0.9 ? Math.max(0, (1.2 - k) / 0.3) : 1;
        strokeText(g, c.text, 0, 0, { size: 230, fill: c.color, lw: 22 });
        g.restore();
      } else this.countdown = null;
    }
    // faixa de alerta
    if (this.banner) {
      const b = this.banner; b.t += dt;
      if (b.t < b.dur) {
        const inK = clamp(b.t / 0.25, 0, 1), outK = clamp((b.dur - b.t) / 0.3, 0, 1);
        const y = AY + 90;
        g.save(); g.globalAlpha = Math.min(inK, outK);
        g.fillStyle = 'rgba(220,38,38,.92)';
        g.translate(W / 2, y); g.rotate(-0.03); g.scale(0.6 + 0.4 * easeOutBack(inK), 1);
        g.fillRect(-W / 2 - 20, -46, W + 40, 92);
        g.fillStyle = '#facc15';
        for (let i = -12; i < 12; i++) { g.fillRect(i * 90 + ((b.t * 200) % 90), -46, 40, 8); g.fillRect(i * 90 - ((b.t * 200) % 90), 38, 40, 8); }
        const blink = Math.floor(b.t * 6) % 2 ? '#ffffff' : '#fef08a';
        strokeText(g, b.text, 0, 0, { size: 52, fill: blink, lw: 10, maxW: 980 });
        g.restore();
      } else this.banner = null;
    }
  }

  drawResults(dt) {
    const g = this.g, game = this.game;
    const t = this.resultsT ?? 0;
    const k = clamp(t / 0.5, 0, 1);
    g.fillStyle = `rgba(6,8,20,${0.78 * k})`; g.fillRect(0, 0, W, H);
    if (t < 0.15) return;
    const win = game.winner;
    const cy = 640;
    // raios girando
    g.save(); g.translate(W / 2, cy); g.rotate(t * 0.4); g.globalAlpha = 0.25 * k;
    for (let i = 0; i < 16; i++) { g.rotate((Math.PI * 2) / 16); g.fillStyle = i % 2 ? '#facc15' : '#f97316'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-60, -700); g.lineTo(60, -700); g.closePath(); g.fill(); }
    g.restore();
    const pop = easeOutBack(clamp((t - 0.15) / 0.5, 0, 1));
    strokeText(g, win ? 'VENCEDOR!' : 'NINGUÉM ESCAPOU!', W / 2, 330, { size: 110 * pop + 1, fill: '#facc15', lw: 18 });
    if (win) {
      const s = 300 * pop;
      const bob = Math.sin(t * 3) * 10;
      g.save(); g.translate(W / 2, cy + bob); g.rotate(Math.sin(t * 2) * 0.05);
      g.shadowColor = win.team.color; g.shadowBlur = 60;
      g.fillStyle = '#fff'; roundRect(g, -s / 2 - 10, -s / 2 - 10, s + 20, s + 20, 26); g.fill();
      g.shadowBlur = 0;
      g.save(); roundRect(g, -s / 2, -s / 2, s, s, 18); g.clip(); g.drawImage(this.badges[win.i], -s / 2, -s / 2, s, s); g.restore();
      g.restore();
      strokeText(g, win.team.name.toUpperCase(), W / 2, cy + 230, { size: 96 * pop + 1, fill: '#ffffff', lw: 16, maxW: 980 });
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
      g.fillStyle = idx === 0 && win ? 'rgba(250,204,21,.2)' : 'rgba(255,255,255,.08)';
      roundRect(g, 140, y - rowH / 2 + 6, W - 280, rowH - 12, 18); g.fill();
      const medal = ['#facc15', '#e5e7eb', '#f59e0b'][idx] || '#94a3b8';
      strokeText(g, `${idx + 1}º`, 210, y, { size: Math.min(48, rowH * 0.5), fill: medal, lw: 8, shadow: false });
      const bs = Math.min(60, rowH - 26);
      g.fillStyle = '#fff'; roundRect(g, 262, y - bs / 2 - 3, bs + 6, bs + 6, 6); g.fill();
      g.drawImage(this.badges[r.i], 265, y - bs / 2, bs, bs);
      g.fillStyle = '#fff'; fitText(g, r.team.name, 420, Math.min(42, rowH * 0.45), 800); g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(r.team.name, 350, y);
      const info = r.state === 'finished' ? `${r.finishT.toFixed(1)}s` : r.state === 'dead' ? 'ELIMINADO' : 'NÃO CHEGOU';
      g.fillStyle = r.state === 'finished' ? '#86efac' : '#fca5a5'; g.font = `800 ${Math.min(30, rowH * 0.34)}px ${FONT}`; g.textAlign = 'right';
      g.fillText(info, W - 170, y);
      g.restore();
    });
    // CTA
    if (t > 1.4 && this.opts.cta) {
      const p2 = easeOutBack(clamp((t - 1.4) / 0.4, 0, 1));
      g.save(); g.translate(W / 2, 1700); g.scale(p2, p2);
      g.fillStyle = '#ef4444'; roundRect(g, -380, -56, 760, 112, 56); g.fill();
      strokeText(g, this.opts.cta, 0, 2, { size: 54, fill: '#ffffff', lw: 0, maxW: 680, shadow: false });
      g.restore();
    }
  }
}
