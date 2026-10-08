/* Keysong · audio.js
   A tiny synth orchestra made only of oscillators and noise: no samples, no libraries. */
'use strict';

const Sound = (() => {
  let ctx = null, master, dry, wetIn, echoIn, noiseBuf;
  let muted = false, step = 0;
  const lastMagic = {};
  const LETTERS = 'abcdefghijklmnopqrstuvwxyz';
  const CHORDS = { M: [0, 4, 7], m: [0, 3, 7], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10] };
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const rand = (a, b) => a + Math.random() * (b - a);

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -20; comp.knee.value = 18; comp.ratio.value = 5;
    comp.attack.value = 0.004; comp.release.value = 0.25;
    master.connect(comp); comp.connect(ctx.destination);

    dry = ctx.createGain(); dry.gain.value = 0.75; dry.connect(master);

    const verb = ctx.createConvolver();
    verb.buffer = impulse(3.4, 2.6);
    wetIn = ctx.createGain(); wetIn.gain.value = 0.5;
    wetIn.connect(verb); verb.connect(master);

    const delay = ctx.createDelay(1.5), fb = ctx.createGain(), tone = ctx.createBiquadFilter();
    delay.delayTime.value = 0.36; fb.gain.value = 0.32;
    tone.type = 'lowpass'; tone.frequency.value = 2600;
    echoIn = ctx.createGain(); echoIn.gain.value = 0.22;
    echoIn.connect(delay); delay.connect(tone); tone.connect(fb); fb.connect(delay); tone.connect(wetIn); tone.connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function impulse(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function resume() {
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  const ready = () => ctx && !muted && ctx.state === 'running';

  // Send a voice to the dry bus, the reverb and the echo.
  function route(node, { pan = 0, wet = 0.35, echo = 0 } = {}) {
    let n = node;
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      n.connect(p); n = p;
    }
    n.connect(dry);
    if (wet) { const g = ctx.createGain(); g.gain.value = wet; n.connect(g); g.connect(wetIn); }
    if (echo) { const g = ctx.createGain(); g.gain.value = echo; n.connect(g); g.connect(echoIn); }
  }

  // One note on one of our little instruments.
  function tone(kind, m, t, vel = 0.6, dur = 0.6, o = {}) {
    const f = mtof(m), out = ctx.createGain(), oscs = [];
    let peak = 0.25, attack = 0.004;
    const osc = (type, freq) => { const x = ctx.createOscillator(); x.type = type; x.frequency.value = freq; oscs.push(x); return x; };
    const fm = (ratio, index, idur) => {
      const car = osc('sine', f), mod = osc('sine', f * ratio), mg = ctx.createGain();
      mg.gain.setValueAtTime(f * index * (0.5 + vel), t);
      mg.gain.exponentialRampToValueAtTime(Math.max(0.01, f * 0.005), t + idur);
      mod.connect(mg); mg.connect(car.frequency); car.connect(out);
    };
    switch (kind) {
      case 'kalimba': {
        osc('sine', f).connect(out);
        const h = osc('sine', f * 4.07), hg = ctx.createGain();
        hg.gain.setValueAtTime(0.35, t); hg.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        h.connect(hg); hg.connect(out);
        peak = 0.32; attack = 0.003; break;
      }
      case 'bell2': fm(2, 1.1, dur * 0.6); peak = 0.2; break;
      case 'epiano': fm(1, 0.9, dur * 0.5); peak = 0.24; attack = 0.008; break;
      case 'bell': fm(3.5, 1.7, dur * 0.5); peak = 0.17; break;
      case 'gong': fm(1.41, 2.2, dur * 0.7); peak = 0.22; attack = 0.01; break;
      case 'pluck': {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.Q.value = 5;
        lp.frequency.setValueAtTime(Math.min(12000, f * 10), t);
        lp.frequency.exponentialRampToValueAtTime(f * 1.3, t + 0.25);
        osc('sawtooth', f).connect(lp);
        const b = osc('sawtooth', f); b.detune.value = 9; b.connect(lp);
        lp.connect(out); peak = 0.16; attack = 0.003; break;
      }
      case 'glass': {
        osc('sine', f).connect(out);
        const a = osc('sine', f * 2.003), ag = ctx.createGain(); ag.gain.value = 0.35; a.connect(ag); ag.connect(out);
        const b = osc('sine', f * 3.01), bg = ctx.createGain(); bg.gain.value = 0.12; b.connect(bg); bg.connect(out);
        peak = 0.16; attack = 0.015; break;
      }
      case 'bass': {
        osc('sine', f).connect(out);
        const b = osc('triangle', f * 2), bg = ctx.createGain(); bg.gain.value = 0.12; b.connect(bg); bg.connect(out);
        peak = 0.42; attack = 0.012; break;
      }
    }
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * vel), t + attack);
    out.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
    route(out, o);
    for (const x of oscs) { x.start(t); x.stop(t + attack + dur + 0.05); }
  }

  // Soft held chord.
  function pad(notes, t, dur, gain = 0.035, attack = 0.5) {
    const out = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.6;
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(gain, t + attack);
    out.gain.setValueAtTime(gain, t + Math.max(attack, dur - 1));
    out.gain.linearRampToValueAtTime(0.0001, t + dur);
    lp.connect(out);
    for (const m of notes) for (const det of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
      o.connect(lp); o.start(t); o.stop(t + dur + 0.05);
    }
    route(out, { wet: 0.6 });
  }

  function noise(t, dur, { type = 'bandpass', f0 = 1000, f1 = f0, q = 1, peak = 0.08, attack = 0.02, release = dur * 0.6, pan = 0, wet = 0.3 } = {}) {
    const src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; src.loop = true;
    fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t);
    fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + Math.max(attack, dur - release));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.connect(fl); fl.connect(g); route(g, { pan, wet });
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }

  function noteAt(M, deg) {
    const n = M.scale.length;
    return M.root + M.scale[((deg % n) + n) % n] + 12 * Math.floor(deg / n);
  }

  function chordNotes(M, i, base) {
    const [off, q] = M.prog[i % M.prog.length];
    return CHORDS[q].map((x) => base + off + x);
  }

  function bassNote(M, off) {
    let m = M.root - 24 + off;
    while (m < 36) m += 12;
    return m;
  }

  // ---- the keyboard ----
  function key(ch, mk, { vel = 0.7, pan = 0 } = {}) {
    if (!ready()) return;
    const M = MOODS[mk], t = ctx.currentTime + 0.01;
    const lower = ch.toLowerCase();
    const base = lower.normalize('NFD')[0];
    const li = ch.length <= 2 ? LETTERS.indexOf(base) : -1;
    if (li >= 0) {
      const vowel = 'aeiouy'.includes(base);
      let m = noteAt(M, li % 10);
      if (ch !== lower) m += 12;
      tone(M.voice, m, t, vel * (vowel ? 1 : 0.8), vowel ? 1.4 : 0.5, { pan, wet: 0.35, echo: vowel ? 0.25 : 0.06 });
      return;
    }
    if (/^[0-9]$/.test(ch)) { tone('kalimba', noteAt(M, +ch) - 12, t, vel, 0.6, { pan, wet: 0.3 }); return; }
    switch (ch) {
      case ' ': {
        step = (step + 1) % M.prog.length;
        tone('bass', bassNote(M, M.prog[step][0]), t, 0.75, 1.6, { wet: 0.15 });
        if (step % 2 === 0) pad(chordNotes(M, step, M.root - 12), t, 2.2);
        return;
      }
      case '\n':
        tone('gong', M.root - 12, t, 0.7, 3.2, { wet: 0.6, echo: 0.2 });
        tone('bass', bassNote(M, 0), t, 0.7, 2, { wet: 0.2 });
        step = 0;
        return;
      case '.': case '…': {
        const c = chordNotes(M, 0, M.root + 12);
        [c[2], c[1], c[0]].forEach((m, i) => tone(M.voice, m, t + i * 0.09, 0.45, 0.9, { pan, wet: 0.45, echo: 0.15 }));
        step = M.prog.length - 1;
        return;
      }
      case '!':
        for (let i = 0; i < 6; i++) tone('bell', noteAt(M, 5 + i) + 12, t + i * 0.045, 0.35, 0.5, { pan, wet: 0.5, echo: 0.3 });
        noise(t, 0.16, { type: 'highpass', f0: 6000, peak: 0.05, attack: 0.005, release: 0.12 });
        return;
      case '?':
        [2, 3, 4, 6].forEach((d, i) => tone('glass', noteAt(M, d + 5), t + i * 0.1, 0.5, i === 3 ? 1.4 : 0.5, { pan, wet: 0.5, echo: 0.2 }));
        return;
      case ',':
        noise(t, 0.35, { f0: 500, f1: 1500, q: 0.8, peak: 0.05, attack: 0.12, release: 0.2 });
        return;
      default: {
        let h = 0;
        for (const c of ch) h = (h * 31 + c.codePointAt(0)) | 0;
        tone('glass', noteAt(M, 7 + (Math.abs(h) % 4)), t, 0.55, 1.3, { pan, wet: 0.6, echo: 0.3 });
      }
    }
  }

  function backspace(pan = 0) {
    if (!ready()) return;
    const t = ctx.currentTime + 0.005, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(1100, t);
    o.frequency.exponentialRampToValueAtTime(180, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g); route(g, { pan, wet: 0.1 });
    o.start(t); o.stop(t + 0.17);
  }

  function moodShift(mk) {
    step = 0;
    if (!ready()) return;
    const M = MOODS[mk], t = ctx.currentTime + 0.02;
    pad(chordNotes(M, 0, M.root - 12).concat([M.root + 7]), t, 3.4, 0.05, 0.8);
    noise(t, 1.3, { type: 'lowpass', f0: 300, f1: 3200, q: 0.7, peak: 0.05, attack: 0.6, release: 0.6, wet: 0.6 });
    chordNotes(M, 0, M.root + 12).forEach((m, i) => tone('glass', m, t + 0.25 + i * 0.12, 0.35, 1.6, { wet: 0.6, echo: 0.3 }));
  }

  // ---- the surprises ----
  function meow(t, p = 1) {
    const o = ctx.createOscillator(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(380 * p, t);
    o.frequency.linearRampToValueAtTime(720 * p, t + 0.16);
    o.frequency.exponentialRampToValueAtTime(420 * p, t + 0.6);
    bp.type = 'bandpass'; bp.Q.value = 4;
    bp.frequency.setValueAtTime(800, t);
    bp.frequency.linearRampToValueAtTime(1800, t + 0.18);
    bp.frequency.exponentialRampToValueAtTime(900, t + 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.06);
    g.gain.setValueAtTime(0.3, t + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
    o.connect(bp); bp.connect(g); route(g, { wet: 0.25 });
    o.start(t); o.stop(t + 0.7);
  }

  function chirp(t, f, pan) {
    for (let i = 0; i < 3; i++) {
      const s = t + i * 0.11, o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(f, s);
      o.frequency.exponentialRampToValueAtTime(f * 1.5, s + 0.04);
      o.frequency.exponentialRampToValueAtTime(f * 1.1, s + 0.08);
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.1, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.09);
      o.connect(g); route(g, { pan, wet: 0.3, echo: 0.15 });
      o.start(s); o.stop(s + 0.1);
    }
  }

  function thump(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.14);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); route(g, { wet: 0.1 });
    o.start(t); o.stop(t + 0.22);
  }

  function horn(t) {
    const lp = ctx.createBiquadFilter(), g = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 2200;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.05);
    g.gain.setValueAtTime(0.14, t + 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
    lp.connect(g); route(g, { wet: 0.25 });
    for (const det of [0, 12]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.detune.value = det;
      o.frequency.setValueAtTime(330, t);
      o.frequency.exponentialRampToValueAtTime(540, t + 0.3);
      o.connect(lp); o.start(t); o.stop(t + 0.65);
    }
  }

  function magic(name, mk) {
    if (!ready()) return;
    const now = ctx.currentTime;
    if (lastMagic[name] && now - lastMagic[name] < 3) return;
    lastMagic[name] = now;
    const M = MOODS[mk], t = now + 0.02;
    switch (name) {
      case 'rain':
        noise(t, 8, { type: 'lowpass', f0: 1600, q: 0.5, peak: 0.07, attack: 1.5, release: 2.5, wet: 0.2 });
        for (let i = 0; i < 12; i++) tone('glass', noteAt(M, 7 + ((Math.random() * 6) | 0)) + 12, t + rand(0.3, 7), 0.22, 0.5, { pan: rand(-0.8, 0.8), wet: 0.5 });
        break;
      case 'snow':
        for (let i = 0; i < 8; i++) tone('glass', noteAt(M, 8 + ((Math.random() * 5) | 0)) + 12, t + i * 0.7 + rand(0, 0.3), 0.25, 1.8, { pan: rand(-0.7, 0.7), wet: 0.7, echo: 0.4 });
        break;
      case 'stars':
        for (let i = 0; i < 8; i++) tone('bell', noteAt(M, 5 + i) + 12, t + i * 0.12, 0.3, 1.2, { pan: -0.6 + i * 0.17, wet: 0.6, echo: 0.4 });
        noise(t, 2, { type: 'highpass', f0: 8000, peak: 0.02, attack: 0.5, release: 1.2, wet: 0.8 });
        break;
      case 'ocean':
        noise(t, 3.6, { type: 'lowpass', f0: 350, f1: 1400, q: 0.6, peak: 0.1, attack: 1.6, release: 1.8, wet: 0.4 });
        noise(t + 3.2, 3.6, { type: 'lowpass', f0: 350, f1: 1200, q: 0.6, peak: 0.08, attack: 1.6, release: 1.8, wet: 0.4 });
        break;
      case 'fire':
        noise(t, 5, { type: 'lowpass', f0: 180, q: 0.7, peak: 0.08, attack: 0.8, release: 1.5 });
        for (let i = 0; i < 30; i++) noise(t + rand(0, 5), 0.03, { type: 'highpass', f0: 1800, peak: rand(0.04, 0.12), attack: 0.002, release: 0.025, pan: rand(-0.8, 0.8), wet: 0.1 });
        break;
      case 'party': {
        horn(t);
        const c = chordNotes(M, 0, M.root);
        [c[0], c[1], c[2], c[0] + 12, c[1] + 12, c[2] + 12].forEach((m, i) => tone('bell2', m, t + 0.45 + i * 0.08, 0.5, 0.9, { pan: -0.5 + i * 0.2, wet: 0.4, echo: 0.2 }));
        for (let i = 0; i < 3; i++) noise(t + 0.35 + i * 0.6, 0.12, { type: 'highpass', f0: 2500, peak: 0.12, attack: 0.003, release: 0.1, pan: rand(-0.6, 0.6) });
        break;
      }
      case 'hearts': {
        thump(t); thump(t + 0.22);
        const c = chordNotes(M, 0, M.root + 12);
        c.forEach((m, i) => tone('glass', m, t + 0.5 + i * 0.05, 0.4, 1.8, { wet: 0.6, echo: 0.3 }));
        break;
      }
      case 'sun': {
        const c = chordNotes(M, 0, M.root);
        pad(c.concat([c[0] + 12]), t, 4, 0.04, 1.4);
        c.forEach((m, i) => tone('bell2', m + 12, t + 0.4 + i * 0.3, 0.35, 1.4, { wet: 0.5, echo: 0.3 }));
        break;
      }
      case 'cat':
        meow(t + 0.6); meow(t + 1.6, 1.15);
        break;
      case 'birds':
        for (let i = 0; i < 5; i++) chirp(t + rand(0.2, 3.5), rand(2400, 3600), rand(-0.8, 0.8));
        break;
      case 'rainbow':
        for (let i = 0; i < 10; i++) tone('glass', noteAt(M, i) + 12, t + i * 0.07, 0.4, 1.2, { pan: -0.7 + i * 0.15, wet: 0.6, echo: 0.3 });
        break;
    }
  }

  return {
    init, resume, key, backspace, moodShift, magic,
    resetProgression() { step = 0; },
    setMuted(v) {
      muted = v;
      if (master) master.gain.setTargetAtTime(v ? 0 : 0.9, ctx.currentTime, 0.05);
    },
    get muted() { return muted; },
  };
})();
