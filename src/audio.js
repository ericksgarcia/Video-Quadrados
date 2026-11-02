// Motor de áudio 100% sintetizado (Web Audio API) — sem arquivos de som.
// Funciona igual com AudioContext (tempo real) e OfflineAudioContext (render do vídeo),
// então o som do MP4 exportado é idêntico ao que você ouve no navegador.

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function makeImpulse(ctx, seconds = 2.2, decay = 3.2) {
  const rate = ctx.sampleRate, len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / len;
      // reflexões iniciais + cauda difusa
      const early = i < rate * 0.03 && Math.random() < 0.02 ? 0.8 : 0;
      d[i] = ((Math.random() * 2 - 1) * 0.6 + early) * Math.pow(1 - t, decay);
    }
  }
  return buf;
}

function makeNoise(ctx, seconds = 2) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export class AudioEngine {
  constructor(ctx, { music = true, volume = 0.9 } = {}) {
    this.ctx = ctx;
    this.musicOn = music;
    const c = ctx;
    this.master = c.createGain(); this.master.gain.value = volume;
    this.limiter = c.createDynamicsCompressor();
    this.limiter.threshold.value = -3; this.limiter.knee.value = 0; this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.002; this.limiter.release.value = 0.12;
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -18; this.comp.knee.value = 8; this.comp.ratio.value = 3.5;
    this.comp.attack.value = 0.004; this.comp.release.value = 0.18;
    this.sfx = c.createGain(); this.sfx.gain.value = 1;
    this.musicBus = c.createGain(); this.musicBus.gain.value = 0.42;
    this.reverb = c.createConvolver(); this.reverb.buffer = makeImpulse(c);
    this.revSend = c.createGain(); this.revSend.gain.value = 0.22;
    this.revReturn = c.createGain(); this.revReturn.gain.value = 0.9;
    // "ducking": a música abaixa um pouco quando acontece algo importante
    this.duck = c.createGain(); this.duck.gain.value = 1;
    this.sfx.connect(this.comp);
    this.sfx.connect(this.revSend);
    this.musicBus.connect(this.duck); this.duck.connect(this.comp);
    this.musicBus.connect(this.revSend);
    this.revSend.connect(this.reverb); this.reverb.connect(this.revReturn); this.revReturn.connect(this.comp);
    this.comp.connect(this.limiter); this.limiter.connect(this.master); this.master.connect(c.destination);
    this.noise = makeNoise(c);
    this.voices = 0;
  }

  static realtime(opts) {
    const AC = window.AudioContext || window.webkitAudioContext;
    return new AudioEngine(new AC({ latencyHint: 'interactive' }), opts);
  }

  get now() { return this.ctx.currentTime; }

  play(name, p = {}, t = this.ctx.currentTime) {
    const fn = SFX[name];
    if (fn) fn(this, Math.max(t, this.ctx.currentTime || 0), p);
  }

  duckFor(t, amount = 0.45, dur = 0.8) {
    const g = this.duck.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(amount, t + 0.03);
    g.linearRampToValueAtTime(1, t + dur);
  }

  // ---------------------------------------------------------- blocos de construção
  out(pan = 0, dest = this.sfx) {
    if (!pan || !this.ctx.createStereoPanner) return dest;
    const p = this.ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); p.connect(dest);
    return p;
  }

  env(t, { a = 0.003, d = 0.2, peak = 0.3, dest }) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    g.connect(dest);
    return g;
  }

  osc(t, { type = 'sine', f = 440, f2, glide = 0.1, dur = 0.3, a, d, peak = 0.2, dest = this.sfx, detune = 0, filter }) {
    const o = this.ctx.createOscillator();
    o.type = type; o.detune.value = detune;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + glide);
    let target = this.env(t, { a: a ?? 0.003, d: d ?? dur, peak, dest });
    if (filter) {
      const bq = this.ctx.createBiquadFilter();
      bq.type = filter.type || 'lowpass'; bq.Q.value = filter.Q ?? 0.8;
      bq.frequency.setValueAtTime(filter.f, t);
      if (filter.f2) bq.frequency.exponentialRampToValueAtTime(filter.f2, t + (filter.glide ?? dur));
      bq.connect(target); target = bq;
    }
    o.connect(target);
    o.start(t); o.stop(t + (a ?? 0.003) + (d ?? dur) + 0.05);
    return o;
  }

  noiseHit(t, { dur = 0.2, a = 0.002, peak = 0.3, type = 'bandpass', f = 1000, f2, Q = 1, dest = this.sfx, rate = 1 }) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise; s.playbackRate.value = rate;
    const bq = this.ctx.createBiquadFilter();
    bq.type = type; bq.Q.value = Q; bq.frequency.setValueAtTime(f, t);
    if (f2) bq.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = this.env(t, { a, d: dur, peak, dest });
    s.connect(bq); bq.connect(g);
    const off = Math.random() * 1.5;
    s.start(t, off); s.stop(t + a + dur + 0.05);
  }

  bell(t, { f = 880, dur = 0.9, peak = 0.18, ratio = 2.76, index = 1.6, dest = this.sfx }) {
    const c = this.ctx;
    const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain();
    car.frequency.value = f; mod.frequency.value = f * ratio;
    mg.gain.setValueAtTime(f * index, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + dur * 0.6);
    mod.connect(mg); mg.connect(car.frequency);
    const g = this.env(t, { a: 0.002, d: dur, peak, dest });
    car.connect(g);
    car.start(t); mod.start(t); car.stop(t + dur + 0.1); mod.stop(t + dur + 0.1);
  }
}

// ------------------------------------------------------------------ efeitos
export const SFX = {
  // quique na parede: nota musical (pentatônica) — fica "satisfatório" de ouvir
  bounce(e, t, { note = 72, pan = 0 }) {
    const dest = e.out(pan * 0.7);
    const f = mtof(note);
    e.osc(t, { type: 'triangle', f, dur: 0.22, peak: 0.13, dest });
    e.osc(t, { type: 'sine', f: f * 2, dur: 0.09, peak: 0.05, dest });
    e.osc(t, { type: 'sine', f: f * 0.5, f2: f * 0.48, dur: 0.12, peak: 0.06, dest });
    e.noiseHit(t, { dur: 0.012, peak: 0.05, type: 'highpass', f: 4000, dest });
  },

  // quadrado bate em quadrado
  clack(e, t, { pan = 0 }) {
    const dest = e.out(pan * 0.7);
    e.noiseHit(t, { dur: 0.04, peak: 0.28, type: 'bandpass', f: 1900, Q: 4, dest });
    e.osc(t, { type: 'sine', f: 620, f2: 300, glide: 0.05, dur: 0.07, peak: 0.16, dest });
    e.osc(t, { type: 'square', f: 1240, dur: 0.02, peak: 0.03, dest, filter: { f: 3000 } });
  },

  // tijolo levou dano
  brickHit(e, t, { hp = 1, maxHp = 4, x = 500 }) {
    const dest = e.out((x / 1008) * 1.4 - 0.7);
    const k = 1 - hp / maxHp;
    e.osc(t, { type: 'sine', f: 190 + k * 60, f2: 70, glide: 0.09, dur: 0.14, peak: 0.42, dest });
    e.noiseHit(t, { dur: 0.08, peak: 0.25, type: 'lowpass', f: 1800, f2: 400, dest });
    e.noiseHit(t + 0.004, { dur: 0.03, peak: 0.12, type: 'bandpass', f: 3200, Q: 3, dest });
  },

  // tijolo destruído: estrondo + estilhaços
  brickBreak(e, t, { x = 500, sword = false, cells = [] }) {
    const dest = e.out((x / 1008) * 1.4 - 0.7);
    const big = Math.min(1, cells.length / 6);
    e.osc(t, { type: 'sine', f: 140, f2: 38, glide: 0.3, dur: 0.38, peak: 0.75, dest });
    e.osc(t, { type: 'triangle', f: 90, f2: 45, glide: 0.2, dur: 0.25, peak: 0.25, dest });
    e.noiseHit(t, { dur: 0.45 + big * 0.3, peak: 0.45, type: 'bandpass', f: 2600, f2: 300, Q: 0.7, dest });
    e.noiseHit(t, { dur: 0.25, peak: 0.3, type: 'lowpass', f: 900, f2: 120, dest });
    const n = 7 + Math.floor(big * 6);
    for (let i = 0; i < n; i++) {
      const tt = t + 0.02 + Math.random() * (0.18 + big * 0.2);
      e.noiseHit(tt, { dur: 0.015 + Math.random() * 0.03, peak: 0.08 + Math.random() * 0.1, type: 'bandpass', f: 1800 + Math.random() * 4500, Q: 6, dest });
    }
    if (sword) SFX.swordHit(e, t, { x });
    e.duckFor(t, 0.6, 0.5);
  },

  bumper(e, t, { pan = 0 }) {
    const dest = e.out(pan * 0.7);
    const f = 660 * (1 + Math.floor(Math.random() * 3) * 0.25);
    e.bell(t, { f, dur: 0.6, peak: 0.16, dest });
    e.osc(t, { type: 'sine', f: f / 2, f2: f / 4, glide: 0.12, dur: 0.15, peak: 0.25, dest });
    e.noiseHit(t, { dur: 0.02, peak: 0.12, type: 'highpass', f: 5000, dest });
  },

  spinner(e, t, { pan = 0 }) {
    const dest = e.out(pan * 0.7);
    e.osc(t, { type: 'square', f: 300, f2: 900, glide: 0.08, dur: 0.1, peak: 0.08, dest, filter: { f: 2200 } });
    e.noiseHit(t, { dur: 0.1, peak: 0.2, type: 'bandpass', f: 1400, f2: 4000, Q: 2, dest });
    e.osc(t, { type: 'sine', f: 180, f2: 90, dur: 0.1, peak: 0.25, dest });
  },

  boost(e, t, { x = 500 }) {
    const dest = e.out((x / 1008) * 1.2 - 0.6);
    e.osc(t, { type: 'sawtooth', f: 180, f2: 1100, glide: 0.22, dur: 0.26, peak: 0.1, dest, filter: { f: 500, f2: 5000, glide: 0.22, Q: 4 } });
    e.noiseHit(t, { dur: 0.3, peak: 0.16, type: 'bandpass', f: 600, f2: 5000, Q: 1.5, dest });
  },

  portal(e, t) {
    const c = e.ctx;
    const o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(1500, t + 0.32);
    lfo.frequency.value = 18; lg.gain.value = 40; lfo.connect(lg); lg.connect(o.frequency);
    const g = e.env(t, { a: 0.01, d: 0.42, peak: 0.16, dest: e.sfx });
    o.connect(g); o.start(t); lfo.start(t); o.stop(t + 0.5); lfo.stop(t + 0.5);
    e.osc(t + 0.12, { type: 'triangle', f: 1500, f2: 300, glide: 0.3, dur: 0.35, peak: 0.08 });
    e.noiseHit(t, { dur: 0.4, peak: 0.08, type: 'bandpass', f: 3000, f2: 600, Q: 5 });
  },

  pickup(e, t, { kind }) {
    if (kind === 'sword') {
      // "shiiing" metálico
      e.noiseHit(t, { dur: 0.6, peak: 0.18, type: 'highpass', f: 6000, dest: e.sfx });
      [2350, 3520, 4690, 6100].forEach((f, i) => e.osc(t, { type: 'sine', f, dur: 0.9 - i * 0.15, peak: 0.07, a: 0.005 }));
      e.osc(t, { type: 'sawtooth', f: 900, f2: 2400, glide: 0.08, dur: 0.12, peak: 0.05, filter: { f: 4000 } });
    } else if (kind === 'zap') {
      for (let i = 0; i < 5; i++) e.osc(t + i * 0.035, { type: 'square', f: 600 + i * 260, dur: 0.07, peak: 0.07, filter: { f: 4500 } });
      e.noiseHit(t, { dur: 0.25, peak: 0.12, type: 'bandpass', f: 3000, f2: 8000, Q: 3 });
    } else if (kind === 'freeze') {
      [96, 91, 88, 84, 79].forEach((n, i) => e.bell(t + i * 0.05, { f: mtof(n), dur: 0.7, peak: 0.06, ratio: 3.5, index: 0.6 }));
      e.noiseHit(t, { dur: 0.8, peak: 0.08, type: 'highpass', f: 7000 });
    } else {
      [0, 4, 7, 12].forEach((n, i) => e.osc(t + i * 0.055, { type: 'square', f: mtof(76 + n), dur: 0.12, peak: 0.06, filter: { f: 3500 } }));
    }
  },

  pickupSpawn(e, t) { e.bell(t, { f: 1568, dur: 0.3, peak: 0.04 }); },

  swordHit(e, t, { x = 500 }) {
    const dest = e.out((x / 1008) * 1.2 - 0.6);
    e.noiseHit(t, { dur: 0.35, peak: 0.25, type: 'highpass', f: 3500, dest });
    [1800, 2700, 4100].forEach((f) => e.osc(t, { type: 'sine', f, f2: f * 0.9, glide: 0.4, dur: 0.5, peak: 0.07, dest }));
    e.osc(t, { type: 'sine', f: 120, f2: 50, dur: 0.2, peak: 0.4, dest });
  },

  door(e, t, { open, x = 500 }) {
    const dest = e.out((x / 1008) * 1.2 - 0.6);
    e.noiseHit(t, { dur: 0.22, peak: 0.07, type: 'bandpass', f: open ? 900 : 1600, f2: open ? 2200 : 500, Q: 2, dest });
    e.osc(t + 0.18, { type: 'square', f: 70, dur: 0.07, peak: 0.08, dest, filter: { f: 500 } });
  },

  floodStart(e, t) {
    // sirene de alerta
    for (let i = 0; i < 4; i++) {
      e.osc(t + i * 0.22, { type: 'square', f: i % 2 ? 660 : 880, dur: 0.18, peak: 0.07, a: 0.01, filter: { f: 2500 } });
    }
    e.noiseHit(t, { dur: 1.4, peak: 0.12, type: 'lowpass', f: 300, f2: 900, a: 0.4 });
  },

  bubble(e, t) {
    e.osc(t, { type: 'sine', f: 300 + Math.random() * 300, f2: 900 + Math.random() * 600, glide: 0.06, dur: 0.07, peak: 0.05 });
  },

  eliminate(e, t, { x = 500 }) {
    const dest = e.out((x / 1008) * 1.2 - 0.6);
    // splash
    e.noiseHit(t, { dur: 0.6, peak: 0.4, type: 'lowpass', f: 3000, f2: 250, dest });
    e.noiseHit(t + 0.02, { dur: 0.25, peak: 0.18, type: 'bandpass', f: 1200, Q: 3, dest });
    e.osc(t, { type: 'sine', f: 700, f2: 140, glide: 0.25, dur: 0.3, peak: 0.25, dest });
    for (let i = 0; i < 5; i++) SFX.bubble(e, t + 0.15 + Math.random() * 0.4);
    // "womp womp"
    e.osc(t + 0.15, { type: 'sawtooth', f: 330, f2: 220, glide: 0.25, dur: 0.3, peak: 0.08, filter: { f: 1200 } });
    e.osc(t + 0.5, { type: 'sawtooth', f: 247, f2: 110, glide: 0.5, dur: 0.6, peak: 0.08, filter: { f: 1000, f2: 300 } });
    e.duckFor(t, 0.4, 1.2);
  },

  finish(e, t, { place = 1 }) {
    const base = place === 1 ? 84 : place === 2 ? 81 : 79;
    [0, 4, 7, 12].forEach((n, i) => e.bell(t + i * 0.06, { f: mtof(base + n), dur: 1.2, peak: 0.09, ratio: 2, index: 0.8 }));
    e.noiseHit(t, { dur: 0.6, peak: 0.08, type: 'highpass', f: 8000 });
    if (place === 1) SFX.fanfare(e, t + 0.25);
    e.duckFor(t, 0.35, 1.5);
  },

  fanfare(e, t) {
    const chord = (notes, at, dur, peak = 0.06) => notes.forEach((n) => [-7, 0, 7].forEach((det) => e.osc(at, {
      type: 'sawtooth', f: mtof(n), detune: det, dur, a: 0.02, peak, filter: { f: 900, f2: 4000, glide: 0.1, Q: 1 },
    })));
    chord([67, 72], t, 0.14); chord([72, 76], t + 0.15, 0.14); chord([76, 79], t + 0.3, 0.14);
    chord([72, 76, 79, 84], t + 0.45, 1.4, 0.055);
    e.osc(t + 0.45, { type: 'sine', f: 65, f2: 40, dur: 0.4, peak: 0.6 });
    e.noiseHit(t + 0.45, { dur: 1.6, peak: 0.16, type: 'highpass', f: 6000 });
  },

  count(e, t, { n }) {
    e.osc(t, { type: 'square', f: 660, dur: 0.14, peak: 0.08, filter: { f: 3000 } });
    e.osc(t, { type: 'sine', f: 660, dur: 0.2, peak: 0.15 });
  },

  go(e, t) {
    e.osc(t, { type: 'square', f: 1320, dur: 0.4, peak: 0.08, filter: { f: 5000 } });
    e.osc(t, { type: 'sine', f: 1320, dur: 0.5, peak: 0.15 });
    e.osc(t, { type: 'sine', f: 90, f2: 40, dur: 0.3, peak: 0.6 });
    e.noiseHit(t, { dur: 0.8, peak: 0.12, type: 'highpass', f: 5000 });
  },

  results(e, t) {
    e.noiseHit(t, { dur: 1.2, peak: 0.1, type: 'bandpass', f: 400, f2: 4000, Q: 0.8, a: 0.6 });
  },
};

// ------------------------------------------------------------------ música procedural
// Loop eletrônico em lá menor (Am - F - C - G). Intensidade 0..3 adiciona camadas.
const PROG = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const BASS = [45, 41, 36, 43];

export class Music {
  constructor(engine, bpm = 124) {
    this.e = engine; this.bpm = bpm;
    this.step16 = 60 / bpm / 4;
    this.nextStep = 0; this.nextTime = 0; this.playing = false;
  }

  start(t) { this.playing = true; this.nextTime = t; this.nextStep = 0; }
  stop() { this.playing = false; }

  // agenda notas entre agora e "until" (usado em tempo real e offline)
  schedule(until, intensityAt) {
    while (this.playing && this.nextTime < until) {
      this.playStep(this.nextStep, this.nextTime, intensityAt(this.nextTime));
      this.nextStep++; this.nextTime += this.step16;
    }
  }

  playStep(i, t, lvl) {
    const e = this.e, bus = e.musicBus;
    const s = i % 16, bar = Math.floor(i / 16), chordIdx = bar % 4;
    const chord = PROG[chordIdx];
    // bumbo
    if (s % 4 === 0) {
      e.osc(t, { type: 'sine', f: 150, f2: 42, glide: 0.12, dur: 0.28, peak: lvl >= 1 ? 0.85 : 0.5, dest: bus });
      e.noiseHit(t, { dur: 0.01, peak: 0.1, type: 'highpass', f: 3000, dest: bus });
    }
    // chimbal
    if (s % 2 === 1 || (lvl >= 3 && s % 2 === 0)) e.noiseHit(t, { dur: s % 4 === 2 ? 0.07 : 0.03, peak: s % 4 === 2 ? 0.1 : 0.06, type: 'highpass', f: 8000, dest: bus });
    // palma
    if (lvl >= 2 && (s === 4 || s === 12)) {
      for (let k = 0; k < 3; k++) e.noiseHit(t + k * 0.01, { dur: 0.12, peak: 0.16, type: 'bandpass', f: 1500, Q: 1.2, dest: bus });
    }
    // baixo (oitavas, pulsando)
    if (lvl >= 1 && s % 2 === 0) {
      const n = BASS[chordIdx] + (s % 4 === 2 ? 12 : 0);
      e.osc(t, { type: 'sawtooth', f: mtof(n), dur: this.step16 * 1.6, peak: 0.13, dest: bus, filter: { f: lvl >= 3 ? 1400 : 700, f2: 200, glide: 0.15, Q: 4 } });
    }
    // pad de acordes (início de cada compasso)
    if (s === 0) chord.forEach((n) => [-9, 9].forEach((det) => e.osc(t, {
      type: 'sawtooth', f: mtof(n), detune: det, a: 0.25, dur: this.step16 * 16, peak: 0.022, dest: bus, filter: { f: 1600, Q: 0.5 },
    })));
    // arpejo
    if (lvl >= 2) {
      const pattern = [0, 1, 2, 1, 0, 2, 1, 2];
      const n = chord[pattern[s % 8]] + 12 + (s >= 8 && lvl >= 3 ? 12 : 0);
      e.osc(t, { type: 'square', f: mtof(n), dur: this.step16 * 0.9, peak: 0.035, dest: bus, filter: { f: 2600, f2: 800, glide: 0.1 } });
    }
    // riser na intensidade máxima
    if (lvl >= 3 && s === 0 && bar % 2 === 0) e.noiseHit(t, { dur: this.step16 * 16, a: this.step16 * 14, peak: 0.05, type: 'bandpass', f: 500, f2: 6000, Q: 1, dest: bus });
  }
}

// ------------------------------------------------------------------ render offline
// Gera o áudio completo do vídeo a partir da lista de eventos da simulação.
export async function renderOffline(events, duration, { music = true, sampleRate = 48000 } = {}) {
  const len = Math.ceil(duration * sampleRate);
  const ctx = new OfflineAudioContext(2, len, sampleRate);
  const e = new AudioEngine(ctx, { music });
  const intensity = [];
  let lvl = 0;
  for (const ev of events) if (ev.name === 'intensity') intensity.push([ev.t, ev.p.level]);
  const intensityAt = (t) => { lvl = 0; for (const [tt, l] of intensity) { if (tt <= t) lvl = l; else break; } return lvl; };
  if (music) {
    const m = new Music(e);
    let on = null;
    for (const ev of events) {
      if (ev.name !== 'music') continue;
      if (ev.p.on) { on = ev.t; m.start(ev.t); }
      else if (on != null) { m.schedule(ev.t, intensityAt); m.stop(); on = null; }
    }
    if (on != null) m.schedule(duration, intensityAt);
  }
  for (const ev of events) if (SFX[ev.name]) SFX[ev.name](e, ev.t + 0.0001, ev.p);
  const buf = await ctx.startRendering();
  return encodeWav(buf);
}

export function encodeWav(buf) {
  const ch = buf.numberOfChannels, sr = buf.sampleRate, n = buf.length;
  const out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
  out.setUint32(24, sr, true); out.setUint32(28, sr * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true);
  w(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) {
    const v = Math.max(-1, Math.min(1, data[c][i]));
    out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2;
  }
  return new Uint8Array(out.buffer);
}
