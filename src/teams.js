// Times / competidores.
// Três tipos de "badge":
//   flag  -> bandeira desenhada proceduralmente (sem precisar de imagens)
//   crest -> escudo estilizado de clube (padrão de listras + sigla)
//   image -> qualquer PNG/JPG/SVG seu em assets/badges (ex.: escudo oficial)
//
// Para adicionar um time com imagem própria:
//   { id: 'meutime', name: 'Meu Time', type: 'image', src: 'assets/badges/meutime.png', color: '#e11d48' }

// ---------------------------------------------------------------- helpers
const hStripes = (colors, ratios) => (g, w, h) => {
  const rs = ratios || colors.map(() => 1);
  const tot = rs.reduce((a, b) => a + b, 0);
  let y = 0;
  colors.forEach((c, i) => {
    const hh = (rs[i] / tot) * h;
    g.fillStyle = c; g.fillRect(0, Math.floor(y), w, Math.ceil(hh) + 1); y += hh;
  });
};
const vStripes = (colors, ratios) => (g, w, h) => {
  const rs = ratios || colors.map(() => 1);
  const tot = rs.reduce((a, b) => a + b, 0);
  let x = 0;
  colors.forEach((c, i) => {
    const ww = (rs[i] / tot) * w;
    g.fillStyle = c; g.fillRect(Math.floor(x), 0, Math.ceil(ww) + 1, h); x += ww;
  });
};
const seq = (...fns) => (g, w, h) => fns.forEach((f) => f(g, w, h));
const circle = (cx, cy, r, color) => (g, w, h) => {
  g.fillStyle = color; g.beginPath(); g.arc(cx * w, cy * h, r * Math.min(w, h), 0, Math.PI * 2); g.fill();
};
function starPath(g, cx, cy, r, points = 5, inner = 0.42, rot = -Math.PI / 2) {
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 === 0 ? r : r * inner;
    const a = rot + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.closePath();
}
const star = (cx, cy, r, color, points = 5) => (g, w, h) => {
  g.fillStyle = color; starPath(g, cx * w, cy * h, r * Math.min(w, h), points); g.fill();
};
const nordic = (bg, cross, inner) => (g, w, h) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const cx = w * 0.36, t = h * 0.22;
  g.fillStyle = cross; g.fillRect(cx - t / 2, 0, t, h); g.fillRect(0, h / 2 - t / 2, w, t);
  if (inner) { const t2 = t * 0.5; g.fillStyle = inner; g.fillRect(cx - t2 / 2, 0, t2, h); g.fillRect(0, h / 2 - t2 / 2, w, t2); }
};
const rect = (x, y, ww, hh, color) => (g, w, h) => { g.fillStyle = color; g.fillRect(x * w, y * h, ww * w, hh * h); };

// ---------------------------------------------------------------- bandeiras
export const FLAGS = {
  br: { name: 'Brasil', color: '#009c3b', draw: (g, w, h) => {
    g.fillStyle = '#009c3b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffdf00'; g.beginPath();
    g.moveTo(w / 2, h * 0.1); g.lineTo(w * 0.93, h / 2); g.lineTo(w / 2, h * 0.9); g.lineTo(w * 0.07, h / 2); g.closePath(); g.fill();
    g.fillStyle = '#002776'; g.beginPath(); g.arc(w / 2, h / 2, w * 0.22, 0, Math.PI * 2); g.fill();
    g.save(); g.beginPath(); g.arc(w / 2, h / 2, w * 0.22, 0, Math.PI * 2); g.clip();
    g.strokeStyle = '#fff'; g.lineWidth = h * 0.045; g.beginPath(); g.arc(w * 0.4, h * 0.95, w * 0.5, -Math.PI * 0.62, -Math.PI * 0.18); g.stroke();
    g.restore();
  } },
  ar: { name: 'Argentina', color: '#74acdf', draw: seq(hStripes(['#74acdf', '#ffffff', '#74acdf']), (g, w, h) => {
    g.fillStyle = '#f6b40e';
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.save(); g.translate(w / 2, h / 2); g.rotate(a); g.fillRect(-w * 0.012, 0, w * 0.024, h * 0.15); g.restore(); }
    g.beginPath(); g.arc(w / 2, h / 2, w * 0.085, 0, Math.PI * 2); g.fill();
  }) },
  pt: { name: 'Portugal', color: '#da291c', draw: seq(vStripes(['#046a38', '#da291c'], [2, 3]), (g, w, h) => {
    g.strokeStyle = '#ffe900'; g.lineWidth = w * 0.05; g.beginPath(); g.arc(w * 0.4, h / 2, w * 0.17, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#fff'; g.fillRect(w * 0.33, h * 0.4, w * 0.14, h * 0.2);
    g.fillStyle = '#da291c'; g.fillRect(w * 0.345, h * 0.415, w * 0.11, h * 0.17);
  }) },
  fr: { name: 'França', color: '#0055a4', draw: vStripes(['#0055a4', '#ffffff', '#ef4135']) },
  it: { name: 'Itália', color: '#009246', draw: vStripes(['#009246', '#ffffff', '#ce2b37']) },
  de: { name: 'Alemanha', color: '#dd0000', draw: hStripes(['#000000', '#dd0000', '#ffce00']) },
  es: { name: 'Espanha', color: '#aa151b', draw: hStripes(['#aa151b', '#f1bf00', '#aa151b'], [1, 2, 1]) },
  en: { name: 'Inglaterra', color: '#ce1124', draw: seq(rect(0, 0, 1, 1, '#ffffff'), rect(0.4, 0, 0.2, 1, '#ce1124'), rect(0, 0.4, 1, 0.2, '#ce1124')) },
  nl: { name: 'Holanda', color: '#f36c21', draw: hStripes(['#ae1c28', '#ffffff', '#21468b']) },
  be: { name: 'Bélgica', color: '#ef3340', draw: vStripes(['#000000', '#fdda24', '#ef3340']) },
  jp: { name: 'Japão', color: '#bc002d', draw: seq(rect(0, 0, 1, 1, '#ffffff'), circle(0.5, 0.5, 0.28, '#bc002d')) },
  us: { name: 'EUA', color: '#3c3b6e', draw: (g, w, h) => {
    for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#b22234'; g.fillRect(0, (i * h) / 13, w, h / 13 + 1); }
    g.fillStyle = '#3c3b6e'; g.fillRect(0, 0, w * 0.5, h * (7 / 13));
    g.fillStyle = '#fff';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.beginPath(); g.arc(w * (0.07 + c * 0.12), h * (0.07 + r * 0.13), w * 0.025, 0, Math.PI * 2); g.fill(); }
  } },
  mx: { name: 'México', color: '#006847', draw: seq(vStripes(['#006847', '#ffffff', '#ce1126']), circle(0.5, 0.5, 0.11, '#8c5a2b'), circle(0.5, 0.56, 0.06, '#5a8f29')) },
  uy: { name: 'Uruguai', color: '#0038a8', draw: (g, w, h) => {
    for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#0038a8' : '#ffffff'; g.fillRect(0, (i * h) / 9, w, h / 9 + 1); }
    g.fillStyle = '#fff'; g.fillRect(0, 0, w * 0.45, h * (5 / 9));
    g.fillStyle = '#fcd116';
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.save(); g.translate(w * 0.225, h * 0.27); g.rotate(a); g.fillRect(-w * 0.012, 0, w * 0.024, h * 0.15); g.restore(); }
    g.beginPath(); g.arc(w * 0.225, h * 0.27, w * 0.08, 0, Math.PI * 2); g.fill();
  } },
  co: { name: 'Colômbia', color: '#fcd116', draw: hStripes(['#fcd116', '#003893', '#ce1126'], [2, 1, 1]) },
  ec: { name: 'Equador', color: '#ffdd00', draw: seq(hStripes(['#ffdd00', '#034ea2', '#ed1c24'], [2, 1, 1]), circle(0.5, 0.5, 0.1, '#7a5c2e')) },
  cl: { name: 'Chile', color: '#d52b1e', draw: seq(rect(0, 0, 1, 0.5, '#ffffff'), rect(0, 0.5, 1, 0.5, '#d52b1e'), rect(0, 0, 0.42, 0.5, '#0039a6'), star(0.21, 0.25, 0.13, '#ffffff')) },
  py: { name: 'Paraguai', color: '#d52b1e', draw: seq(hStripes(['#d52b1e', '#ffffff', '#0038a8']), circle(0.5, 0.5, 0.09, '#0038a8'), circle(0.5, 0.5, 0.06, '#ffffff'), star(0.5, 0.5, 0.05, '#fcd116')) },
  pe: { name: 'Peru', color: '#d91023', draw: vStripes(['#d91023', '#ffffff', '#d91023']) },
  ve: { name: 'Venezuela', color: '#00247d', draw: seq(hStripes(['#ffcc00', '#00247d', '#cf142b']), (g, w, h) => {
    for (let i = 0; i < 8; i++) { const a = Math.PI * (1.15 + (i / 7) * 0.7); starPath(g, w / 2 + Math.cos(a) * w * 0.22, h * 0.62 + Math.sin(a) * h * 0.22, w * 0.035); g.fillStyle = '#fff'; g.fill(); }
  }) },
  bo: { name: 'Bolívia', color: '#007934', draw: hStripes(['#d52b1e', '#f9e300', '#007934']) },
  hr: { name: 'Croácia', color: '#ff0000', draw: seq(hStripes(['#ff0000', '#ffffff', '#171796']), (g, w, h) => {
    const s = w * 0.07, x0 = w / 2 - 2.5 * s, y0 = h / 2 - 2 * s;
    g.fillStyle = '#fff'; g.fillRect(x0 - 2, y0 - 2, 5 * s + 4, 4.5 * s + 4);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) if ((r + c) % 2 === 0) { g.fillStyle = '#ff0000'; g.fillRect(x0 + c * s, y0 + r * s, s, s); }
  }) },
  ma: { name: 'Marrocos', color: '#c1272d', draw: seq(rect(0, 0, 1, 1, '#c1272d'), (g, w, h) => {
    g.strokeStyle = '#006233'; g.lineWidth = w * 0.035; starPath(g, w / 2, h / 2, w * 0.24, 5, 0.38); g.stroke();
  }) },
  sn: { name: 'Senegal', color: '#00853f', draw: seq(vStripes(['#00853f', '#fdef42', '#e31b23']), star(0.5, 0.5, 0.13, '#00853f')) },
  ng: { name: 'Nigéria', color: '#008751', draw: vStripes(['#008751', '#ffffff', '#008751']) },
  gh: { name: 'Gana', color: '#006b3f', draw: seq(hStripes(['#ce1126', '#fcd116', '#006b3f']), star(0.5, 0.5, 0.14, '#000000')) },
  cm: { name: 'Camarões', color: '#007a5e', draw: seq(vStripes(['#007a5e', '#ce1126', '#fcd116']), star(0.5, 0.5, 0.12, '#fcd116')) },
  eg: { name: 'Egito', color: '#ce1126', draw: seq(hStripes(['#ce1126', '#ffffff', '#000000']), circle(0.5, 0.5, 0.08, '#c09300')) },
  ch: { name: 'Suíça', color: '#da291c', draw: seq(rect(0, 0, 1, 1, '#da291c'), rect(0.42, 0.18, 0.16, 0.64, '#ffffff'), rect(0.18, 0.42, 0.64, 0.16, '#ffffff')) },
  se: { name: 'Suécia', color: '#006aa7', draw: nordic('#006aa7', '#fecc00') },
  dk: { name: 'Dinamarca', color: '#c8102e', draw: nordic('#c8102e', '#ffffff') },
  no: { name: 'Noruega', color: '#ba0c2f', draw: nordic('#ba0c2f', '#ffffff', '#00205b') },
  fi: { name: 'Finlândia', color: '#002f6c', draw: nordic('#ffffff', '#002f6c') },
  pl: { name: 'Polônia', color: '#dc143c', draw: hStripes(['#ffffff', '#dc143c']) },
  ua: { name: 'Ucrânia', color: '#0057b7', draw: hStripes(['#0057b7', '#ffd700']) },
  ie: { name: 'Irlanda', color: '#169b62', draw: vStripes(['#169b62', '#ffffff', '#ff883e']) },
  at: { name: 'Áustria', color: '#ed2939', draw: hStripes(['#ed2939', '#ffffff', '#ed2939']) },
  hu: { name: 'Hungria', color: '#477050', draw: hStripes(['#ce2939', '#ffffff', '#477050']) },
  gr: { name: 'Grécia', color: '#0d5eaf', draw: (g, w, h) => {
    for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#0d5eaf'; g.fillRect(0, (i * h) / 9, w, h / 9 + 1); }
    g.fillStyle = '#0d5eaf'; g.fillRect(0, 0, w * 0.45, h * (5 / 9));
    g.fillStyle = '#fff'; g.fillRect(w * 0.18, 0, w * 0.09, h * (5 / 9)); g.fillRect(0, h * (2 / 9), w * 0.45, h / 9);
  } },
  tr: { name: 'Turquia', color: '#e30a17', draw: (g, w, h) => {
    g.fillStyle = '#e30a17'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(w * 0.4, h / 2, w * 0.24, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e30a17'; g.beginPath(); g.arc(w * 0.46, h / 2, w * 0.195, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; starPath(g, w * 0.7, h / 2, w * 0.1, 5, 0.42, Math.PI); g.fill();
  } },
  ru: { name: 'Rússia', color: '#0039a6', draw: hStripes(['#ffffff', '#0039a6', '#d52b1e']) },
  cn: { name: 'China', color: '#de2910', draw: seq(rect(0, 0, 1, 1, '#de2910'), star(0.25, 0.28, 0.15, '#ffde00'), star(0.5, 0.12, 0.05, '#ffde00'), star(0.58, 0.25, 0.05, '#ffde00'), star(0.58, 0.42, 0.05, '#ffde00'), star(0.5, 0.54, 0.05, '#ffde00')) },
  in: { name: 'Índia', color: '#ff9933', draw: seq(hStripes(['#ff9933', '#ffffff', '#138808']), (g, w, h) => {
    g.strokeStyle = '#000080'; g.lineWidth = w * 0.025; g.beginPath(); g.arc(w / 2, h / 2, w * 0.11, 0, Math.PI * 2); g.stroke();
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(a) * w * 0.11, h / 2 + Math.sin(a) * w * 0.11); g.lineWidth = w * 0.01; g.stroke(); }
  }) },
  kr: { name: 'Coreia do Sul', color: '#cd2e3a', draw: (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    const r = w * 0.22, cx = w / 2, cy = h / 2;
    g.fillStyle = '#0047a0'; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#cd2e3a'; g.beginPath(); g.arc(cx, cy, r, Math.PI, 0); g.fill();
    g.beginPath(); g.arc(cx + r / 2, cy, r / 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0047a0'; g.beginPath(); g.arc(cx - r / 2, cy, r / 2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#000';
    [[0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]].forEach(([x, y]) => { for (let k = 0; k < 3; k++) g.fillRect(w * x - w * 0.08, h * y - h * 0.07 + k * h * 0.05, w * 0.16, h * 0.03); });
  } },
  ca: { name: 'Canadá', color: '#d80621', draw: seq(vStripes(['#d80621', '#ffffff', '#d80621'], [1, 2, 1]), (g, w, h) => {
    g.fillStyle = '#d80621'; starPath(g, w / 2, h * 0.48, w * 0.2, 11, 0.55); g.fill(); g.fillRect(w * 0.485, h * 0.55, w * 0.03, h * 0.2);
  }) },
  au: { name: 'Austrália', color: '#012169', draw: seq(rect(0, 0, 1, 1, '#012169'), (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, h * 0.2, w * 0.5, h * 0.1); g.fillRect(w * 0.2, 0, w * 0.1, h * 0.5);
    g.fillStyle = '#e4002b'; g.fillRect(0, h * 0.225, w * 0.5, h * 0.05); g.fillRect(w * 0.225, 0, w * 0.05, h * 0.5);
  }, star(0.25, 0.75, 0.1, '#fff', 7), star(0.75, 0.25, 0.05, '#fff', 7), star(0.62, 0.5, 0.05, '#fff', 7), star(0.88, 0.45, 0.05, '#fff', 7), star(0.75, 0.82, 0.05, '#fff', 7)) },
  cr: { name: 'Costa Rica', color: '#002b7f', draw: hStripes(['#002b7f', '#ffffff', '#ce1126', '#ffffff', '#002b7f'], [1, 1, 2, 1, 1]) },
  ci: { name: 'Costa do Marfim', color: '#f77f00', draw: vStripes(['#f77f00', '#ffffff', '#009e60']) },
  sa: { name: 'Arábia Saudita', color: '#006c35', draw: seq(rect(0, 0, 1, 1, '#006c35'), rect(0.2, 0.62, 0.6, 0.04, '#ffffff'), rect(0.22, 0.3, 0.56, 0.18, 'rgba(255,255,255,.85)')) },
};

// ---------------------------------------------------------------- clubes (estilizados)
// pattern: solid | hstripes | vstripes | sash | band | halves | tricolorV
export const CLUBS = {
  fla: { name: 'Flamengo', short: 'FLA', color: '#c4161c', pattern: 'hstripes', colors: ['#c4161c', '#111111'], stripes: 6 },
  cor: { name: 'Corinthians', short: 'COR', color: '#f2f2f2', pattern: 'band', colors: ['#f4f4f4', '#111111'], text: '#111111' },
  pal: { name: 'Palmeiras', short: 'PAL', color: '#006437', pattern: 'solid', colors: ['#006437'] },
  sao: { name: 'São Paulo', short: 'SPFC', color: '#e30613', pattern: 'band3', colors: ['#ffffff', '#e30613', '#ffffff', '#111111'], text: '#111111' },
  vas: { name: 'Vasco', short: 'VAS', color: '#222222', pattern: 'sash', colors: ['#111111', '#ffffff'] },
  flu: { name: 'Fluminense', short: 'FLU', color: '#7a1f3d', pattern: 'vstripes', colors: ['#7a1f3d', '#ffffff', '#00613c'], stripes: 6 },
  bot: { name: 'Botafogo', short: 'BOT', color: '#111111', pattern: 'vstripes', colors: ['#111111', '#ffffff'], stripes: 6, star: true },
  gre: { name: 'Grêmio', short: 'GRE', color: '#0d80bf', pattern: 'vstripes', colors: ['#0d80bf', '#111111', '#ffffff'], stripes: 6 },
  int: { name: 'Internacional', short: 'INT', color: '#e30613', pattern: 'solid', colors: ['#e30613'] },
  cam: { name: 'Atlético-MG', short: 'CAM', color: '#111111', pattern: 'vstripes', colors: ['#111111', '#ffffff'], stripes: 8 },
  cru: { name: 'Cruzeiro', short: 'CRU', color: '#0033a0', pattern: 'solid', colors: ['#0033a0'], cruzeiro: true },
  san: { name: 'Santos', short: 'SAN', color: '#ffffff', pattern: 'band', colors: ['#ffffff', '#111111'], text: '#111111' },
  bah: { name: 'Bahia', short: 'BAH', color: '#0047ab', pattern: 'tricolorV', colors: ['#0047ab', '#ffffff', '#e30613'] },
  for: { name: 'Fortaleza', short: 'FOR', color: '#0047ab', pattern: 'hstripes', colors: ['#e30613', '#ffffff', '#0047ab'], stripes: 3 },
  cap: { name: 'Athletico-PR', short: 'CAP', color: '#d4001a', pattern: 'hstripes', colors: ['#d4001a', '#111111'], stripes: 8 },
  vit: { name: 'Vitória', short: 'VIT', color: '#d4001a', pattern: 'hstripes', colors: ['#d4001a', '#111111'], stripes: 4 },
  cea: { name: 'Ceará', short: 'CEA', color: '#111111', pattern: 'vstripes', colors: ['#111111', '#ffffff'], stripes: 4 },
  spt: { name: 'Sport', short: 'SPT', color: '#d4001a', pattern: 'hstripes', colors: ['#111111', '#d4001a'], stripes: 6 },
  cfc: { name: 'Coritiba', short: 'CFC', color: '#00543c', pattern: 'band', colors: ['#ffffff', '#00543c'], text: '#00543c' },
  rbb: { name: 'Bragantino', short: 'RBB', color: '#ffffff', pattern: 'band', colors: ['#ffffff', '#d4001a'], text: '#d4001a' },
};

function drawCrest(g, w, h, c) {
  const cols = c.colors;
  switch (c.pattern) {
    case 'hstripes': { const n = c.stripes || 4; for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(0, (i * h) / n, w, h / n + 1); } break; }
    case 'vstripes': { const n = c.stripes || 4; for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect((i * w) / n, 0, w / n + 1, h); } break; }
    case 'sash': g.fillStyle = cols[0]; g.fillRect(0, 0, w, h);
      g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.PI / 4); g.fillStyle = cols[1]; g.fillRect(-w, -h * 0.13, w * 2, h * 0.26); g.restore(); break;
    case 'band': g.fillStyle = cols[0]; g.fillRect(0, 0, w, h); g.fillStyle = cols[1]; g.fillRect(0, h * 0.78, w, h * 0.22); g.fillRect(0, 0, w, h * 0.1); break;
    case 'band3': g.fillStyle = cols[0]; g.fillRect(0, 0, w, h);
      g.fillStyle = cols[1]; g.fillRect(0, h * 0.18, w, h * 0.12); g.fillStyle = cols[2]; g.fillRect(0, h * 0.3, w, h * 0.06); g.fillStyle = cols[3]; g.fillRect(0, h * 0.36, w, h * 0.12); break;
    case 'halves': vStripes(cols.slice(0, 2))(g, w, h); break;
    case 'tricolorV': vStripes(cols)(g, w, h); break;
    default: g.fillStyle = cols[0]; g.fillRect(0, 0, w, h);
  }
  if (c.star) { g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = w * 0.02; starPath(g, w / 2, h * 0.24, w * 0.12); g.fill(); g.stroke(); }
  if (c.cruzeiro) [[0.5, 0.14], [0.5, 0.86], [0.2, 0.5], [0.8, 0.5], [0.66, 0.68]].forEach(([x, y]) => { g.fillStyle = '#fff'; starPath(g, w * x, h * y, w * 0.07); g.fill(); });
  // sigla
  const txt = c.short || c.name.slice(0, 3).toUpperCase();
  const size = txt.length > 3 ? w * 0.27 : w * 0.34;
  g.font = `900 ${size}px Inter, "Segoe UI", "Arial Black", Arial, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round';
  const light = c.text && c.text !== '#ffffff';
  g.lineWidth = w * 0.07; g.strokeStyle = light ? '#ffffff' : 'rgba(0,0,0,.85)';
  g.strokeText(txt, w / 2, h * 0.56);
  g.fillStyle = c.text || '#ffffff'; g.fillText(txt, w / 2, h * 0.56);
}

// ---------------------------------------------------------------- catálogo
export const TEAMS = {};
for (const [id, f] of Object.entries(FLAGS)) TEAMS[id] = { id, type: 'flag', name: f.name, color: f.color };
for (const [id, c] of Object.entries(CLUBS)) TEAMS[id] = { id, type: 'crest', name: c.name, color: c.color };

// Times com imagem própria: adicione aqui (coloque os arquivos em assets/badges/).
export const CUSTOM_TEAMS = [
  // { id: 'meutime', name: 'Meu Time', type: 'image', src: 'assets/badges/meutime.png', color: '#e11d48' },
];
for (const t of CUSTOM_TEAMS) TEAMS[t.id] = t;

export const PRESETS = {
  'Seleções': ['br', 'ar', 'fr', 'pt'],
  'Seleções (Europa)': ['es', 'de', 'it', 'en'],
  'Sul-Americanos': ['br', 'ar', 'uy', 'co'],
  'Clássicos BR': ['fla', 'cor', 'pal', 'sao'],
  'Rio x SP': ['fla', 'flu', 'bot', 'vas'],
  'Clubes (8)': ['fla', 'cor', 'pal', 'sao', 'gre', 'int', 'cam', 'cru'],
  'Seleções (8)': ['br', 'ar', 'fr', 'pt', 'es', 'de', 'it', 'en'],
};

// cores bem distintas para trilhas/tijolos quando dois times têm a mesma cor
const FALLBACK = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#06b6d4', '#ec4899'];

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function colorDist(a, b) { const x = hexToRgb(a), y = hexToRgb(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); }
function luminance(hex) { const [r, g, b] = hexToRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }

// Resolve a lista de ids em times prontos (cor de jogo única e legível)
export function resolveTeams(ids) {
  const out = [];
  ids.forEach((id, i) => {
    const base = TEAMS[id] || { id, type: 'crest', name: String(id).toUpperCase(), color: FALLBACK[i % FALLBACK.length] };
    let color = base.color;
    const l = luminance(color);
    if (l > 0.9 || l < 0.08 || out.some((o) => colorDist(o.color, color) < 90)) {
      color = FALLBACK.find((c) => !out.some((o) => colorDist(o.color, c) < 90)) || FALLBACK[i % FALLBACK.length];
    }
    out.push({ ...base, color });
  });
  return out;
}

const imageCache = new Map();
export function loadTeamImages(teams) {
  return Promise.all(teams.filter((t) => t.type === 'image').map((t) => {
    if (imageCache.has(t.src)) return imageCache.get(t.src);
    const p = new Promise((res) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => res(null); img.src = t.src; })
      .then((img) => { t.img = img; return img; });
    imageCache.set(t.src, p);
    return p;
  }));
}

// Desenha o badge quadrado num canvas offscreen (cache por tamanho)
export function makeBadge(team, size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (team.type === 'flag' && FLAGS[team.id]) FLAGS[team.id].draw(g, size, size);
  else if (team.type === 'crest' && CLUBS[team.id]) drawCrest(g, size, size, CLUBS[team.id]);
  else if (team.type === 'image' && team.img) {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, size, size);
    const img = team.img, s = Math.min(size / img.width, size / img.height) * 0.9;
    g.drawImage(img, (size - img.width * s) / 2, (size - img.height * s) / 2, img.width * s, img.height * s);
  } else drawCrest(g, size, size, { colors: [team.color], short: (team.name || '?').slice(0, 3).toUpperCase() });
  // leve brilho por cima (dá volume)
  const grd = g.createLinearGradient(0, 0, 0, size);
  grd.addColorStop(0, 'rgba(255,255,255,0.22)'); grd.addColorStop(0.5, 'rgba(255,255,255,0)'); grd.addColorStop(1, 'rgba(0,0,0,0.18)');
  g.fillStyle = grd; g.fillRect(0, 0, size, size);
  return c;
}
