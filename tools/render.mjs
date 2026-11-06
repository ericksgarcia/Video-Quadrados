// Renderiza uma corrida direto para MP4 (1080x1920, 60fps, áudio AAC) — quadro a quadro,
// sem travadas, independente da velocidade do seu PC.
//
//   npm run render -- --level subida --teams br,ar,fr,pt --best 40 --out videos/corrida.mp4
//
// Opções:
//   --level <id|n>       fase (gaiola, derby, serpente, arena8 ou 1..4)
//   --category cores|selecoes|clubes   categoria (padrão: cores)
//   --teams a,b,c,d      ids dos times (veja src/teams.js) — ou --preset "Grandes do Rio"
//   --count n            quantos competidores (quando não passa --teams)
//   --seed <n>           seed da corrida (mesma seed = mesma corrida)
//   --best <n>           testa n seeds e escolhe a mais emocionante (ignora --seed)
//   --theme roxo|agua|lava|acido
//   --title "..." --subtitle "..." --handle "@canal" --cta "..."
//   --fps 60             quadros por segundo (30 ou 60)
//   --no-music           sem música de fundo (bom para usar som em alta do TikTok)
//   --kill               a água elimina quem encosta (padrão: a onda só empurra)
//   --out arquivo.mp4    saída (padrão: videos/<fase>-<seed>.mp4)
//   --batch <n>          gera n vídeos com seeds diferentes de uma vez
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { startServer } from './serve.mjs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch {
  console.error('Playwright não encontrado. Rode:  npm install  &&  npx playwright install chromium');
  process.exit(1);
}

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const k = a.slice(2);
    if (k.startsWith('no-')) { o[k.slice(3)] = false; continue; }
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) o[k] = true; else { o[k] = v; i++; }
  }
  return o;
}

const args = parseArgs(process.argv.slice(2));
const fps = Number(args.fps || 60);
const batch = Number(args.batch || 1);

function ffmpeg(argsList, opts = {}) {
  return spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...argsList], { stdio: ['pipe', 'inherit', 'inherit'], ...opts });
}
const waitExit = (p) => new Promise((res, rej) => p.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg saiu com código ' + c)))));

async function renderOne(page, cfg, out) {
  const info = await page.evaluate((c) => window.__studio.setup(c), cfg);
  console.log(`\n▶ Fase ${info.level} | seed ${info.seed} | times ${info.teams.join(', ')}`);
  out = out || path.join('videos', `${info.level}-${info.seed}.mp4`);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  const tmpV = out.replace(/\.mp4$/i, '') + '.video.tmp.mp4';
  const tmpA = out.replace(/\.mp4$/i, '') + '.audio.tmp.wav';

  const enc = ffmpeg(['-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart', tmpV]);
  let frames = 0;
  const t0 = Date.now();
  while (true) {
    const url = await page.evaluate((f) => window.__studio.frame(f), fps);
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r));
    frames++;
    if (frames % fps === 0) process.stdout.write(`\r  quadros: ${frames} (${(frames / fps).toFixed(0)}s de vídeo, ${((Date.now() - t0) / 1000).toFixed(0)}s gastos)`);
    if (await page.evaluate(() => window.__studio.done())) break;
    if (frames > fps * 240) break;
  }
  enc.stdin.end();
  await waitExit(enc);
  console.log('\n  gerando áudio…');
  const b64 = await page.evaluate(() => window.__studio.audio());
  fs.writeFileSync(tmpA, Buffer.from(b64, 'base64'));
  const mux = ffmpeg(['-i', tmpV, '-i', tmpA, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
  await waitExit(mux);
  fs.rmSync(tmpV); fs.rmSync(tmpA);
  const stats = await page.evaluate(() => window.__studio.stats());
  console.log(`  ✔ ${out}  (vencedor: ${stats.winner ?? 'ninguém'}, ${stats.eliminated} eliminado(s))`);
  return out;
}

const server = await startServer(0);
const port = server.address().port;
const browser = await playwright.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => console.error('Erro na página:', e.message));
await page.goto(`http://127.0.0.1:${port}/index.html?render=1`);
await page.waitForFunction(() => window.__studio);

const { PRESETS, CATEGORY_DEFAULTS } = await import('../src/teams.js');
const category = args.category || (args.teams ? undefined : 'cores'); // com --teams, a categoria é deduzida dos times
// --crests a,b,c,d (ids de src/escudos.json, na ordem dos índices dos quadrados) ou --crests sorteio (4 aleatórios)
if (args.crests === 'sorteio' || args.crests === true) {
  const lib = JSON.parse(fs.readFileSync(new URL('../src/escudos.json', import.meta.url), 'utf8')).filter((c) => c.sorteio !== false); // só os marcados para sorteio
  const n = args.teams ? String(args.teams).split(',').length : Number(args.count || 4);
  const { pickCrests } = await import('../src/teams.js');
  args.crests = pickCrests(lib, n).map((c) => c.id).join(','); // cores de clube bem diferentes
  console.log('Escudos sorteados:', args.crests);
}
const base = {
  level: args.level || 'gaiola',
  category,
  teams: args.teams ? String(args.teams).split(',') : args.preset ? (PRESETS[category] || {})[args.preset] : CATEGORY_DEFAULTS[category].teams.slice(0, Number(args.count || 4)),
  theme: args.theme, subtitle: args.subtitle, handle: args.handle, cta: args.cta ?? (category ? CATEGORY_DEFAULTS[category].cta : undefined),
  music: args.music !== false,
  floodKills: !!args.kill,
  crests: args.crests ? String(args.crests).split(',') : undefined,
  title: args.crests ? (args.title ?? 'QUAL ESCUDO VENCE?') : (args.title ?? (category ? CATEGORY_DEFAULTS[category].title : undefined)),
};
if (base.teams) base.count = base.teams.length;
for (const k of Object.keys(base)) if (base[k] === undefined) delete base[k];

try {
  for (let b = 0; b < batch; b++) {
    const cfg = { ...base };
    if (args.best) {
      const start = args.seed ? Number(args.seed) + b * 1000 : 1 + Math.floor(Math.random() * 1e5);
      const best = await page.evaluate(([c, n, s]) => window.__studio.bestSeed(c, n, s), [cfg, Number(args.best) || 40, start]);
      cfg.seed = best.seed;
      console.log(`Melhor seed: ${best.seed} (score ${best.score.toFixed(1)}, ${best.raceTime.toFixed(0)}s, ${best.eliminated} eliminado(s))`);
    } else cfg.seed = args.seed ? Number(args.seed) + b : Math.floor(Math.random() * 1e6);
    await renderOne(page, cfg, batch === 1 ? args.out : undefined);
  }
} finally {
  await browser.close();
  server.close();
}
