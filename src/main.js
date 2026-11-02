import { Game, SIM_HZ, dramaScore } from './game.js';
import { LEVELS, getLevel } from './levels.js';
import { TEAMS, CATEGORIES, CATEGORY_DEFAULTS, PRESETS, teamsIn, resolveTeams, loadTeamImages } from './teams.js';
import { Renderer, THEMES } from './render.js';
import { AudioEngine, Music, renderOffline } from './audio.js';
import { seedFrom } from './rng.js';

const DT = 1 / SIM_HZ;
const params = new URLSearchParams(location.search);
const RENDER_MODE = params.has('render');

const DEFAULTS = {
  level: 'zigue', count: 4, category: 'selecoes', teams: ['br', 'ar', 'fr', 'pt', 'es', 'de', 'it', 'en'],
  theme: 'roxo', seed: 7, music: true,
  title: 'QUAL SELEÇÃO VENCE?', subtitle: 'Comente seu palpite!', handle: '', cta: 'COMENTE SEU TIME!',
};

// ------------------------------------------------------------------ config
function loadCfg() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('quadrados.cfg') || '{}'); } catch { /* sem storage */ }
  const cfg = { ...DEFAULTS, ...saved };
  for (const k of ['level', 'category', 'theme', 'title', 'subtitle', 'handle', 'cta']) if (params.has(k)) cfg[k] = params.get(k);
  if (params.has('teams')) cfg.teams = params.get('teams').split(',').map((s) => s.trim()).filter(Boolean);
  if (params.has('count')) cfg.count = Number(params.get('count'));
  if (params.has('seed')) cfg.seed = seedFrom(params.get('seed'));
  if (params.has('music')) cfg.music = params.get('music') !== '0';
  if (params.has('teams') && !params.has('count')) cfg.count = cfg.teams.length;
  return cfg;
}
function saveCfg(cfg) { try { localStorage.setItem('quadrados.cfg', JSON.stringify(cfg)); } catch { /* ok */ } }

function makeGame(cfg) {
  const level = getLevel(cfg.level);
  const count = Math.max(2, Math.min(level.maxRacers, cfg.count || 4));
  const teams = resolveTeams(cfg.teams.slice(0, count));
  const pool = teamsIn(cfg.category || 'selecoes').filter((id) => !teams.some((t) => t.id === id));
  while (teams.length < count) teams.push(...resolveTeams([...teams.map((t) => t.id), pool.shift() || Object.keys(TEAMS)[teams.length]]).slice(-1));
  return { level, teams, game: new Game({ level, teams, seed: cfg.seed }) };
}

// Simula N seeds sem desenhar e devolve a mais "emocionante"
export function findBestSeed(cfg, tries = 40, start = 1) {
  let best = null;
  for (let s = start; s < start + tries; s++) {
    const { game } = makeGame({ ...cfg, seed: s });
    while (!game.done && game.t < 220) game.step(DT);
    const st = game.stats();
    st.score = dramaScore(st, game.racers.length);
    if (!best || st.score > best.score) best = st;
  }
  return best;
}

// ------------------------------------------------------------------ modo render (usado pelo tools/render.mjs)
if (RENDER_MODE) {
  document.body.classList.add('render');
  const canvas = document.getElementById('stage');
  let cur = null;
  window.__studio = {
    async setup(cfg) {
      const first = TEAMS[(cfg.teams || [])[0]];
      const category = cfg.category || first?.category || DEFAULTS.category;
      cfg = { ...DEFAULTS, title: CATEGORY_DEFAULTS[category]?.title || DEFAULTS.title, ...cfg, category };
      if (cfg.best) cfg.seed = findBestSeed(cfg, cfg.best).seed;
      const made = makeGame(cfg);
      await loadTeamImages(made.teams);
      try { await document.fonts.ready; } catch { /* ok */ }
      const renderer = new Renderer(canvas, { title: cfg.title, subtitle: cfg.subtitle, handle: cfg.handle, theme: cfg.theme, cta: cfg.cta });
      renderer.attach(made.game);
      made.game.onEvent = (n, p) => renderer.onEvent(n, p);
      cur = { ...made, renderer, cfg };
      return { seed: cfg.seed, level: made.level.id, teams: made.teams.map((t) => t.id) };
    },
    frame(fps = 60) {
      const steps = Math.round(SIM_HZ / fps);
      for (let i = 0; i < steps; i++) cur.game.step(DT);
      cur.renderer.draw(1 / fps);
      return canvas.toDataURL('image/jpeg', 0.93);
    },
    done() { return cur.game.done; },
    stats() { return cur.game.stats(); },
    async audio() {
      const wav = await renderOffline(cur.game.events, cur.game.t + 0.5, { music: cur.cfg.music });
      let bin = '';
      for (let i = 0; i < wav.length; i += 0x8000) bin += String.fromCharCode.apply(null, wav.subarray(i, i + 0x8000));
      return btoa(bin);
    },
    bestSeed(cfg, n, start = 1) { return findBestSeed({ ...DEFAULTS, ...cfg }, n, start); },
  };
} else {
  initApp();
}

// ------------------------------------------------------------------ app interativo
function initApp() {
  const cfg = loadCfg();
  const $ = (id) => document.getElementById(id);
  const canvas = $('stage');
  const renderer = new Renderer(canvas, {});
  let game = null, audio = null, music = null, running = false, recorder = null;

  // ---- preencher controles
  $('level').innerHTML = LEVELS.map((l) => `<option value="${l.id}">${l.name} (até ${l.maxRacers})</option>`).join('');
  $('theme').innerHTML = Object.entries(THEMES).map(([k, t]) => `<option value="${k}">${t.name}</option>`).join('');
  $('category').innerHTML = Object.entries(CATEGORIES).filter(([k]) => teamsIn(k).length).map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
  const teamOptions = () => teamsIn(cfg.category).map((id) => `<option value="${id}">${TEAMS[id].name}</option>`).join('');
  const presetOptions = () => '<option value="">— escolher —</option>' + Object.keys(PRESETS[cfg.category] || {}).map((k) => `<option>${k}</option>`).join('');

  function renderSlots() {
    const level = getLevel(cfg.level);
    const max = level.maxRacers;
    cfg.count = Math.max(2, Math.min(max, cfg.count));
    $('count').innerHTML = Array.from({ length: max - 1 }, (_, i) => i + 2).map((n) => `<option ${n === cfg.count ? 'selected' : ''}>${n}</option>`).join('');
    const opts = teamOptions();
    $('preset').innerHTML = presetOptions();
    $('slots').innerHTML = Array.from({ length: cfg.count }, (_, i) => `<label class="slot"><span>${i + 1}</span><select data-slot="${i}">${opts}</select></label>`).join('');
    $('slots').querySelectorAll('select').forEach((sel) => {
      const i = Number(sel.dataset.slot);
      sel.value = cfg.teams[i]; if (!sel.value) { cfg.teams[i] = teamsIn(cfg.category)[i]; sel.value = cfg.teams[i]; }
      sel.onchange = () => { cfg.teams[i] = sel.value; reset(); };
    });
  }

  function syncInputs() {
    $('level').value = getLevel(cfg.level).id;
    $('category').value = cfg.category;
    $('theme').value = cfg.theme;
    $('seed').value = cfg.seed;
    $('music').checked = cfg.music;
    for (const k of ['title', 'subtitle', 'handle', 'cta']) $(k).value = cfg[k];
    renderSlots();
  }

  async function reset() {
    saveCfg(cfg);
    running = false;
    if (music) music.stop();
    const made = makeGame(cfg);
    await loadTeamImages(made.teams);
    game = made.game;
    Object.assign(renderer.opts, { title: cfg.title, subtitle: cfg.subtitle, handle: cfg.handle, theme: cfg.theme, cta: cfg.cta });
    renderer.attach(game);
    game.onEvent = (n, p) => {
      renderer.onEvent(n, p);
      if (!audio) return;
      audio.play(n, p);
      if (n === 'music' && music) { if (p.on && cfg.music) music.start(audio.now + 0.05); else music.stop(); }
      if (n === 'done') onDone();
    };
    $('cli').textContent = `npm run render -- --level ${getLevel(cfg.level).id} --teams ${cfg.teams.slice(0, cfg.count).join(',')} --seed ${cfg.seed} --theme ${cfg.theme}` +
      ` --title "${cfg.title}" --subtitle "${cfg.subtitle}"${cfg.handle ? ` --handle "${cfg.handle}"` : ''}${cfg.music ? '' : ' --no-music'}`;
  }

  function ensureAudio() {
    if (!audio) { audio = AudioEngine.realtime({ music: cfg.music }); music = new Music(audio); }
    if (audio.ctx.state === 'suspended') audio.ctx.resume();
  }

  async function play() {
    ensureAudio();
    await reset();
    running = true;
  }

  function onDone() {
    running = false;
    if (recorder && recorder.state === 'recording') setTimeout(() => recorder.stop(), 300);
  }

  async function record() {
    ensureAudio();
    await reset();
    const vStream = canvas.captureStream(60);
    const dest = audio.ctx.createMediaStreamDestination();
    audio.master.connect(dest);
    const stream = new MediaStream([...vStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const types = ['video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'];
    const mimeType = types.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || '';
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 14_000_000, audioBitsPerSecond: 192_000 });
    const chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      audio.master.disconnect(dest);
      const blob = new Blob(chunks, { type: recorder.mimeType });
      const ext = recorder.mimeType.includes('mp4') ? 'mp4' : 'webm';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `quadrados-${getLevel(cfg.level).id}-${cfg.seed}.${ext}`;
      a.click();
      $('rec').classList.remove('on'); $('rec').textContent = '⏺ Gravar vídeo';
      recorder = null;
    };
    recorder.start(250);
    $('rec').classList.add('on'); $('rec').textContent = '■ Gravando…';
    running = true;
  }

  // ---- eventos de UI
  $('level').onchange = (e) => { cfg.level = e.target.value; renderSlots(); reset(); };
  $('count').onchange = (e) => { cfg.count = Number(e.target.value); renderSlots(); reset(); };
  $('category').onchange = (e) => {
    const old = cfg.category; cfg.category = e.target.value;
    const d = CATEGORY_DEFAULTS[cfg.category];
    cfg.teams = [...d.teams];
    if (!cfg.title || cfg.title === CATEGORY_DEFAULTS[old]?.title) { cfg.title = d.title; $('title').value = d.title; }
    renderSlots(); reset();
  };
  $('preset').onchange = (e) => { const p = (PRESETS[cfg.category] || {})[e.target.value]; if (p) { cfg.teams = [...p, ...cfg.teams.filter((t) => !p.includes(t))]; cfg.count = Math.min(p.length, getLevel(cfg.level).maxRacers); renderSlots(); reset(); } e.target.value = ''; };
  $('theme').onchange = (e) => { cfg.theme = e.target.value; reset(); };
  $('seed').onchange = (e) => { cfg.seed = seedFrom(e.target.value); reset(); };
  $('music').onchange = (e) => { cfg.music = e.target.checked; saveCfg(cfg); };
  for (const k of ['title', 'subtitle', 'handle', 'cta']) $(k).oninput = (e) => { cfg[k] = e.target.value; renderer.opts[k] = e.target.value; saveCfg(cfg); };
  $('dice').onclick = () => { cfg.seed = Math.floor(Math.random() * 1e6); $('seed').value = cfg.seed; reset(); };
  $('best').onclick = () => {
    $('best').disabled = true; $('best').textContent = 'Simulando…';
    setTimeout(() => {
      const start = Math.floor(Math.random() * 1e5);
      const best = findBestSeed(cfg, 40, start);
      cfg.seed = best.seed; $('seed').value = best.seed;
      $('bestInfo').textContent = `Seed ${best.seed}: ${best.raceTime.toFixed(0)}s, ${best.eliminated} eliminado(s)${best.margin != null ? `, chegada com ${best.margin.toFixed(1)}s de diferença` : ''}`;
      $('best').disabled = false; $('best').textContent = '✨ Achar corrida emocionante';
      reset();
    }, 30);
  };
  $('play').onclick = play;
  $('rec').onclick = () => { if (recorder) { recorder.stop(); running = false; } else record(); };
  window.addEventListener('keydown', (e) => { if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); play(); } });

  // ---- loop
  let last = performance.now(), acc = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (game) {
      if (running) { acc += dt; while (acc >= DT) { game.step(DT); acc -= DT; } } else acc = 0;
      if (music && audio) music.schedule(audio.now + 0.25, () => game.intensity);
      renderer.draw(dt);
    }
    requestAnimationFrame(frame);
  }
  syncInputs();
  reset().then(() => requestAnimationFrame(frame));
}
