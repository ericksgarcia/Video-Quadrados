// Gera um vídeo NOVO, sorteando fase, ordem das cores nas baias e corrida — sem repetir o
// que já está em historico.json. Também escreve uma legenda pronta para o TikTok.
//
//   npm run novo                          # tudo sorteado
//   npm run novo -- --category clubes     # outra categoria (padrão: cores | selecoes | clubes)
//   npm run novo -- --level serpente      # outra fase (padrão: gaiola, cofre, ponte ou escada | derby | serpente | arena8)
//   npm run novo -- --teams verde,azul,vermelho,amarelo
//   npm run novo -- --dry                 # só mostra o que seria gerado
//
// Saída: videos/<data>-<fase>-<seed>.mp4 + .txt (legenda) e uma linha nova em historico.json
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { LEVELS } from '../src/levels.js';
import { TEAMS, CLUBS, COLORS, CATEGORY_DEFAULTS } from '../src/teams.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HIST = path.join(ROOT, 'historico.json');

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const k = argv[i].slice(2), v = argv[i + 1];
  if (v === undefined || v.startsWith('--')) args[k] = true; else { args[k] = v; i++; }
}

const rand = (n) => crypto.randomInt(n);
const pick = (arr) => arr[rand(arr.length)];
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// seleções mais conhecidas (rendem mais comentários)
const SELECOES_POP = ['br', 'ar', 'fr', 'pt', 'es', 'de', 'it', 'en', 'nl', 'be', 'uy', 'co', 'mx', 'us', 'jp', 'hr', 'ma', 'sn', 'kr', 'ch'];
const CLUBES_POP = Object.keys(CLUBS);

const hist = fs.existsSync(HIST) ? JSON.parse(fs.readFileSync(HIST, 'utf8')) : [];
// cores: a ordem importa (qual cor fica em qual baia); times: só a combinação
const key = (c) => `${c.level}|${(c.category === 'cores' ? [...c.teams] : [...c.teams].sort()).join(',')}`;
const used = new Set(hist.map(key));

function sortear() {
  // padrão: quadrados só de cor (estilo das referências)
  const category = args.category || 'cores';
  // padrão: sorteia entre as cópias dos vídeos de referência (gaiola, cofre, ponte, escada); --level escolhe outra
  const level = LEVELS.find((l) => l.id === (args.level || pick(['gaiola', 'cofre', 'ponte', 'escada']))) || LEVELS[0];
  const count = Number(args.count) || Math.min(level.maxRacers, level.maxRacers >= 8 ? 8 : 4);
  const CORES = count > 4 ? Object.keys(COLORS) : ['vermelho', 'azul', 'amarelo', 'verde'];
  const pool = category === 'cores' ? CORES : category === 'clubes' ? CLUBES_POP : SELECOES_POP;
  const teams = args.teams ? String(args.teams).split(',') : shuffle(pool).slice(0, count);
  const theme = args.theme || 'concreto'; // paleta Concreto (prensa), escolhida pelo usuário
  return { category, level: level.id, levelName: level.name, teams, theme };
}

let cfg = sortear();
for (let i = 0; i < 200 && used.has(key(cfg)) && !args.teams; i++) cfg = sortear();
const seedStart = 1 + rand(900000);
const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/^(\d{8})(\d{4})$/, '$1-$2');
const base = `videos/${stamp}-${cfg.level}`;
const names = cfg.teams.map((id) => TEAMS[id]?.name || id);

console.log(`Novo vídeo: fase ${cfg.levelName} | ${cfg.category} | ${names.join(', ')} | água ${cfg.theme}`);
if (args.dry) process.exit(0);

const renderArgs = ['tools/render.mjs', '--level', cfg.level, '--teams', cfg.teams.join(','), '--theme', cfg.theme,
  '--best', String(args.best || 30), '--seed', String(seedStart), '--out', `${base}.mp4`,
  '--title', CATEGORY_DEFAULTS[cfg.category].title, '--cta', CATEGORY_DEFAULTS[cfg.category].cta];
if (args.handle) renderArgs.push('--handle', args.handle);
if (args.music === false || args['no-music']) renderArgs.push('--no-music');

let out = '';
const child = spawn(process.execPath, renderArgs, { cwd: ROOT, stdio: ['ignore', 'pipe', 'inherit'] });
child.stdout.on('data', (d) => { out += d; process.stdout.write(d); });
const code = await new Promise((r) => child.on('close', r));
if (code !== 0) { console.error('Falhou ao renderizar.'); process.exit(code); }

const seed = Number((out.match(/seed (\d+) \|/) || [])[1]);
const winner = (out.match(/vencedor: ([^,)]+)/) || [])[1];
const hadKnife = Number((out.match(/(\d+) eliminado/) || [])[1] || 0) > 0; // só a faca elimina

// legenda (sem spoiler do vencedor)
const lista = names.length > 2 ? `${names.slice(0, -1).join(', ')} ou ${names[names.length - 1]}` : names.join(' ou ');
const cores = cfg.category === 'cores';
const tags = cores ? ['#satisfying', '#corrida', '#cores', '#oddlysatisfying', '#fyp', '#viral']
  : ['#futebol', ...cfg.teams.slice(0, 4).map((id) => '#' + (TEAMS[id]?.name || id).toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '')),
    cfg.category === 'clubes' ? '#brasileirao' : '#copadomundo', '#satisfying', '#fyp', '#viral'];
const ganchos = cores ? [
  `Todo mundo começa preso... qual cor escapa primeiro? 🟥🟦🟨🟩`,
  `${lista}: quem foge da água e chega primeiro? 🌊🏁`,
  `Só uma cor vai cruzar a chegada. Qual é a sua? 👀🏁`,
] : [
  `${lista}: quem escapa da correnteza e chega primeiro? 🌊🏁`,
  `Só um vai cruzar a chegada... e não é o seu 😏🏁`,
  `${cfg.category === 'clubes' ? 'Seu time' : 'Sua seleção'} chega ou fica pelo caminho? 🌊👀`,
];
const extra = hadKnife ? ' Cuidado com quem pegar a faca 🔪' : '';
const legenda = `${pick(ganchos)}${extra} Comenta seu palpite ANTES do final! 👇\n\n${tags.join(' ')}\n`;
fs.writeFileSync(path.join(ROOT, `${base}.txt`), legenda);

hist.push({ data: new Date().toISOString(), category: cfg.category, level: cfg.level, teams: cfg.teams, theme: cfg.theme, seed, winner, arquivo: `${base}.mp4` });
fs.writeFileSync(HIST, JSON.stringify(hist, null, 2) + '\n');

console.log(`\n✔ Vídeo: ${base}.mp4\n✔ Legenda: ${base}.txt\n\n${legenda}`);
