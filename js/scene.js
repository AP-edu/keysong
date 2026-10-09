/* Keysong · scene.js
   The sky, the garden, and everything that floats. One canvas behind the page. */
'use strict';

const Scene = (() => {
  const cv = document.getElementById('scene');
  const cx = cv.getContext('2d');
  const TAU = Math.PI * 2;
  let W = 0, H = 0, U = 1, T = 0, last = 0;
  const plants = [], parts = [], effects = [], stars = [], flies = [];
  let planted = 0, breeze = 0, starBoost = 0, decoToken = 0;
  const gentle = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const easeBack = (k) => 1 + 2.9 * Math.pow(k - 1, 3) + 1.9 * Math.pow(k - 1, 2);
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

  // Colours glide toward whatever the current mood wants.
  const COLOR_KEYS = ['sky0', 'sky1', 'hill', 'ground'];
  const col = {}, tgt = {};
  function setMood(mk) {
    const M = MOODS[mk];
    tgt.sky0 = hex(M.sky[0]); tgt.sky1 = hex(M.sky[1]);
    tgt.hill = hex(M.hill); tgt.ground = hex(M.ground);
    tgt.stars = M.stars; tgt.moon = M.moon; tgt.flies = M.flies;
  }
  const FADE_KEYS = ['stars', 'moon', 'flies'];
  setMood('calm');
  COLOR_KEYS.forEach((k) => (col[k] = tgt[k].slice()));
  FADE_KEYS.forEach((k) => (col[k] = tgt[k]));

  // ---- landscape ----
  const ROWS = [{ s: 0.95, a: 0.8 }, { s: 1.15, a: 0.95 }, { s: 1.38, a: 1 }];
  const horizon = (x) => H * 0.8 + Math.sin((x / W) * Math.PI * 1.6 + 0.4) * H * 0.022 + Math.sin((x / W) * Math.PI * 5.2) * H * 0.006;
  const bandY = (x) => horizon(x) + H * 0.07 + Math.sin((x / W) * Math.PI * 3.1 + 2) * H * 0.012;
  const rootY = (p) => {
    const x = p.fx * W;
    return p.row === 2 ? bandY(x) + H * 0.03 : horizon(x) + (p.row === 1 ? H * 0.04 : 0);
  };

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    U = Math.max(0.78, Math.min(1.3, Math.min(H / 850, W / 480)));
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---- the garden ----
  const FLOWER = {
    daisy: { petal: ['#fbf8f0', '#eef2ff', '#fff0f5'], core: '#f4c04e' },
    sunflower: { petal: ['#ffd23f', '#ffbe2e', '#ffe36e'], core: '#6b3d1e' },
    heart: { petal: ['#ff5d8f', '#ff86a8', '#f43f75'], core: '#ffd1dc' },
    bluebell: { petal: ['#7c9cff', '#9fb8ff', '#6176e0'], core: '#dfe7ff' },
    flame: { petal: ['#ff6b35', '#ff9f1c', '#f2453d'], core: '#ffd166' },
    orb: { petal: ['#e9ddff', '#ffffff', '#cdb6ff'], core: '#ffffff' },
  };

  function plant(word, mk) {
    const M = MOODS[mk];
    const letters = Array.from(word.replace(/[^\p{L}\p{N}]/gu, ''));
    const emoji = /\p{Extended_Pictographic}/u.test(word) ? word.replace(/[\p{L}\p{N}\p{P}\s]/gu, '') : null;
    const len = letters.length;
    const kind = emoji ? 'emoji'
      : len && letters.every((c) => /\p{N}/u.test(c)) ? 'mushroom'
      : len >= 9 ? 'tree' : M.flower;
    const n = planted++;
    const p = {
      kind, emoji, len,
      fx: 0.05 + ((n * 0.6180339887 + 0.17) % 1) * 0.9,
      row: [1, 2, 0][n % 3],
      born: T, wilt: 0, dead: false,
      phase: Math.random() * TAU, dir: Math.random() < 0.5 ? -1 : 1,
      h: kind === 'tree' ? 105 + Math.min(len, 16) * 4 : kind === 'emoji' ? 46 : 30 + Math.min(len, 12) * 9,
      petals: Math.max(5, Math.min(14, len + 3)),
      color: FLOWER[kind] ? pick(FLOWER[kind].petal) : null,
      core: FLOWER[kind] ? FLOWER[kind].core : null,
      stem: M.stem, canopy: M.canopy,
    };
    plants.push(p);
    burst(p.fx * W, rootY(p) - 4, { n: 6, color: M.accent, speed: 40, up: 30, life: 0.9, size: 2 });
    return p;
  }

  function unplant(p) { if (p && !p.wilt) p.wilt = T; }

  // A little garden for the intro screen, so the first thing you see is alive.
  function decorate() {
    const my = ++decoToken;
    [['hello', 'calm'], ['sing', 'joy'], ['love', 'love'], ['dream', 'wonder'], ['rain', 'blue'], ['flowers', 'joy'],
      ['everything', 'calm'], ['music', 'wonder'], ['heart', 'love'], ['remember', 'blue'], ['spark', 'fire'],
      ['words', 'calm'], ['together', 'love'], ['stars', 'wonder'], ['sunshine', 'joy'], ['quiet', 'calm'],
      ['beautiful', 'love'], ['glow', 'wonder']]
      .forEach(([w, m], i) => setTimeout(() => { if (my === decoToken) plant(w, m); }, 400 + i * 120));
  }

  function clear() {
    decoToken++;
    plants.forEach((p, i) => { if (!p.wilt) p.wilt = T + i * 0.012; });
    planted = 0;
    effects.length = 0;
    starBoost = 0;
  }

  function heartPath(x, y, r) {
    cx.beginPath();
    cx.moveTo(x, y + r * 0.9);
    cx.bezierCurveTo(x - r * 1.6, y - r * 0.1, x - r * 0.7, y - r * 1.3, x, y - r * 0.45);
    cx.bezierCurveTo(x + r * 0.7, y - r * 1.3, x + r * 1.6, y - r * 0.1, x, y + r * 0.9);
    cx.closePath();
  }

  function starPath(x, y, n, R, r, rot) {
    cx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i / (n * 2)) * TAU, rad = i % 2 ? r : R;
      cx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    cx.closePath();
  }

  const HEADS = {
    daisy(x, y, s, p, sway) {
      cx.fillStyle = p.color;
      for (let i = 0; i < p.petals; i++) {
        const a = (i / p.petals) * TAU + sway;
        cx.beginPath(); cx.ellipse(x + Math.cos(a) * 5.5 * s, y + Math.sin(a) * 5.5 * s, 5 * s, 2.2 * s, a, 0, TAU); cx.fill();
      }
      cx.fillStyle = p.core; cx.beginPath(); cx.arc(x, y, 3.2 * s, 0, TAU); cx.fill();
    },
    sunflower(x, y, s, p, sway) {
      const n = p.petals + 6;
      cx.fillStyle = p.color;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + sway;
        cx.beginPath(); cx.ellipse(x + Math.cos(a) * 8 * s, y + Math.sin(a) * 8 * s, 6.5 * s, 2.6 * s, a, 0, TAU); cx.fill();
      }
      cx.fillStyle = p.core; cx.beginPath(); cx.arc(x, y, 5.5 * s, 0, TAU); cx.fill();
      cx.fillStyle = 'rgba(0,0,0,.25)';
      for (let i = 0; i < 5; i++) { cx.beginPath(); cx.arc(x + Math.cos(i * 1.3) * 2.5 * s, y + Math.sin(i * 1.3) * 2.5 * s, 0.9 * s, 0, TAU); cx.fill(); }
    },
    heart(x, y, s, p) {
      heartPath(x, y, 9 * s); cx.fillStyle = p.color; cx.fill();
      cx.fillStyle = 'rgba(255,255,255,.35)'; cx.beginPath(); cx.arc(x - 3 * s, y - 2.5 * s, 1.8 * s, 0, TAU); cx.fill();
    },
    bluebell(x, y, s, p) {
      const hx = x + p.dir * 10 * s, hy = y + 2 * s;
      cx.strokeStyle = p.stem; cx.lineWidth = Math.max(1, 1.8 * s);
      cx.beginPath(); cx.moveTo(x, y); cx.quadraticCurveTo(x + p.dir * 6 * s, y - 6 * s, hx, hy); cx.stroke();
      cx.fillStyle = p.color;
      for (const [bx, by, k] of [[x + p.dir * 2 * s, y - s, 0.75], [x + p.dir * 7 * s, y - 2 * s, 0.9], [hx, hy, 1]]) {
        const r = 4 * s * k;
        cx.save(); cx.translate(bx, by); cx.rotate(Math.sin(T * 2 + p.phase + bx) * 0.15);
        cx.beginPath(); cx.moveTo(-r * 0.6, 0);
        cx.quadraticCurveTo(-r * 0.7, r * 1.4, -r * 1.1, r * 1.8); cx.lineTo(r * 1.1, r * 1.8);
        cx.quadraticCurveTo(r * 0.7, r * 1.4, r * 0.6, 0); cx.closePath(); cx.fill();
        cx.restore();
      }
    },
    flame(x, y, s, p) {
      const f = 1 + Math.sin(T * 11 + p.phase) * 0.08;
      starPath(x, y, p.petals, 9 * s * f, 3.5 * s, T * 0.4 + p.phase); cx.fillStyle = p.color; cx.fill();
      starPath(x, y, p.petals, 5 * s * f, 2 * s, -T * 0.6); cx.fillStyle = p.core; cx.fill();
    },
    orb(x, y, s, p) {
      const R = 18 * s * (1 + Math.sin(T * 2.4 + p.phase) * 0.12);
      const gr = cx.createRadialGradient(x, y, 0, x, y, R);
      gr.addColorStop(0, 'rgba(220,200,255,.55)'); gr.addColorStop(1, 'rgba(220,200,255,0)');
      cx.fillStyle = gr; cx.beginPath(); cx.arc(x, y, R, 0, TAU); cx.fill();
      cx.strokeStyle = 'rgba(255,255,255,.7)'; cx.lineWidth = Math.max(0.6, 0.8 * s); cx.fillStyle = p.color;
      const n = p.petals * 2;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + p.phase, ex = x + Math.cos(a) * 8 * s, ey = y + Math.sin(a) * 8 * s;
        cx.beginPath(); cx.moveTo(x, y); cx.lineTo(ex, ey); cx.stroke();
        cx.beginPath(); cx.arc(ex, ey, 1.2 * s, 0, TAU); cx.fill();
      }
      cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(x, y, 2 * s, 0, TAU); cx.fill();
    },
    emoji(x, y, s, p) {
      cx.font = `${Math.max(1, Math.round(24 * s))}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.fillText(p.emoji, x, y);
    },
  };

  function drawPlant(p) {
    const R = ROWS[p.row], s = R.s * U;
    const bx = p.fx * W, by = rootY(p), age = T - p.born;
    const g = easeOut(clamp01(age / 1.0));
    const head = easeBack(clamp01((age - 0.45) / 0.55));
    let alpha = R.a, droop = 0;
    if (p.wilt && T >= p.wilt) {
      const k = clamp01((T - p.wilt) / 0.9);
      alpha *= 1 - k; droop = k * 1.25 * p.dir;
      if (k >= 1) p.dead = true;
    }
    cx.globalAlpha = alpha;
    const sway = Math.sin(T * 1.1 + p.phase) * 0.045 + breeze * Math.sin(T * 6.5 + p.phase) * 0.16 + droop;

    if (p.kind === 'mushroom') {
      const k = s * g, sh = 12 * k, mx = bx + Math.sin(droop) * 10;
      cx.fillStyle = '#f3e7d3'; cx.fillRect(mx - 3 * k, by - sh, 6 * k, sh);
      cx.fillStyle = '#e5484d'; cx.beginPath(); cx.ellipse(mx, by - sh, 12 * k, 8 * k, droop, Math.PI, 0); cx.fill();
      cx.fillStyle = '#fff';
      for (const [dx, dy] of [[-5, -4], [2, -6], [6, -2]]) { cx.beginPath(); cx.arc(mx + dx * k, by - sh + dy * k, 1.6 * k, 0, TAU); cx.fill(); }
      return;
    }

    const h = p.h * s * g;
    const tx = bx + Math.sin(sway) * h, ty = by - Math.cos(sway) * h;
    const qx = bx + Math.sin(sway * 0.45) * h * 0.5, qy = by - h * 0.55;
    cx.lineCap = 'round';

    if (p.kind === 'tree') {
      cx.strokeStyle = '#4a3428'; cx.lineWidth = Math.max(2, 5.5 * s);
      cx.beginPath(); cx.moveTo(bx, by); cx.quadraticCurveTo(qx, qy, tx, ty); cx.stroke();
      if (head <= 0.02) return;
      const k = s * head, blobs = [[-15, 2, 15], [15, 3, 14], [0, -12, 17], [-8, -2, 13], [9, -6, 13]];
      cx.fillStyle = p.canopy;
      for (const [dx, dy, r] of blobs) { cx.beginPath(); cx.arc(tx + dx * k, ty + dy * k, r * k, 0, TAU); cx.fill(); }
      cx.fillStyle = 'rgba(255,255,255,.14)';
      for (const [dx, dy, r] of blobs.slice(2)) { cx.beginPath(); cx.arc(tx + (dx - 3) * k, ty + (dy - 4) * k, r * k * 0.5, 0, TAU); cx.fill(); }
      return;
    }

    cx.strokeStyle = p.stem; cx.lineWidth = Math.max(1.2, 2.3 * s);
    cx.beginPath(); cx.moveTo(bx, by); cx.quadraticCurveTo(qx, qy, tx, ty); cx.stroke();
    if (g > 0.35) {
      const k = 0.42, a = (1 - k) * (1 - k), b = 2 * (1 - k) * k, c = k * k;
      const lx = a * bx + b * qx + c * tx, ly = a * by + b * qy + c * ty;
      cx.fillStyle = p.stem;
      cx.beginPath(); cx.ellipse(lx + p.dir * 5 * s, ly, 7 * s * g, 2.6 * s * g, p.dir * 0.6 + sway, 0, TAU); cx.fill();
    }
    if (head > 0.02) HEADS[p.kind](tx, ty, s * head, p, sway);
  }

  // ---- particles ----
  function burst(x, y, o = {}) {
    const { n = 6, color = '#ffffff', speed = 70, up = 40, life = 1, size = 2.4, gravity = -30, drag = 0.985 } = o;
    const c = hex(color);
    for (let i = 0; i < (gentle ? Math.ceil(n * 0.3) : n); i++) {
      const a = Math.random() * TAU, v = speed * (0.4 + Math.random() * 0.8);
      parts.push({ kind: 'dot', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - up, g: gravity, drag, age: 0, life: life * (0.6 + Math.random() * 0.8), size: size * (0.6 + Math.random() * 0.9), c });
    }
    if (parts.length > 900) parts.splice(0, parts.length - 900);
  }

  function sparkle(x, y, mk, type) {
    const a = MOODS[mk].accent;
    if (type === 'bang') return burst(x, y, { n: 22, color: a, speed: 220, up: 40, life: 1.1, size: 2.6, gravity: 160 });
    if (type === 'space') return burst(x, y + 6, { n: 3, color: a, speed: 30, up: 20, life: 0.8, size: 1.8 });
    burst(x, y, { n: type === 'vowel' ? 9 : 5, color: a, speed: type === 'vowel' ? 90 : 60, up: 45, life: 1.1, size: 2.4 });
  }

  // A deleted letter tumbles down into the garden.
  function fall(ch, x, y, color, px, family) {
    parts.push({ kind: 'glyph', ch, x, y, vx: rand(-60, 60), vy: rand(-160, -70), g: 900, drag: 1, age: 0, life: 2.2, rot: 0, vr: rand(-5, 5), color, font: `${Math.round(px)}px ${family}` });
  }

  function firework(x, y) {
    const c = pick(['#ffd166', '#ff5d8f', '#4cc9f0', '#7bf1a8', '#c77dff']);
    for (let i = 0; i < 56; i++) {
      const a = (i / 56) * TAU + rand(-0.05, 0.05), v = rand(120, 260) * U;
      parts.push({ kind: 'dot', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 90, drag: 0.97, age: 0, life: rand(1.2, 1.9), size: rand(1.6, 2.6), c: hex(c) });
    }
  }

  function stepParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.age += dt;
      if (q.age >= q.life || q.y > H + 60) { parts.splice(i, 1); continue; }
      const d = Math.pow(q.drag, dt * 60);
      q.vy += q.g * dt; q.vx *= d; q.vy *= d;
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.vr) q.rot += q.vr * dt;
    }
  }

  function drawParts() {
    for (const q of parts) {
      const a = 1 - q.age / q.life;
      if (q.kind === 'glyph') {
        cx.globalCompositeOperation = 'source-over';
        cx.globalAlpha = Math.min(1, a * 1.5);
        cx.fillStyle = q.color; cx.font = q.font; cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.save(); cx.translate(q.x, q.y); cx.rotate(q.rot); cx.fillText(q.ch, 0, 0); cx.restore();
      } else if (q.kind === 'confetti') {
        cx.globalCompositeOperation = 'source-over';
        cx.globalAlpha = Math.min(1, a * 2);
        const hh = q.h * Math.abs(Math.cos(q.age * 8 + q.ph));
        cx.fillStyle = q.color;
        cx.save(); cx.translate(q.x, q.y); cx.rotate(q.rot); cx.fillRect(-q.w / 2, -hh / 2, q.w, hh); cx.restore();
      } else {
        cx.globalCompositeOperation = 'lighter';
        const f = q.flicker ? 0.6 + Math.random() * 0.4 : 1;
        cx.fillStyle = rgba(q.c);
        cx.globalAlpha = a * 0.25 * f; cx.beginPath(); cx.arc(q.x, q.y, q.size * 3, 0, TAU); cx.fill();
        cx.globalAlpha = a * f; cx.beginPath(); cx.arc(q.x, q.y, q.size, 0, TAU); cx.fill();
      }
    }
    cx.globalCompositeOperation = 'source-over';
    cx.globalAlpha = 1;
  }

  // ---- magic words ----
  // Each effect: step(dt, age) -> still alive?; optional back/mid/front(fade, age) drawing hooks.
  const FX = {
    rain() {
      const drops = []; let acc = 0;
      return {
        dur: 8,
        step(dt, age) {
          if (age < this.dur - 1.6) {
            acc += dt * 150 * (W / 1200 + 0.3);
            while (acc >= 1) { acc--; const x = rand(-40, W + 120); drops.push({ x, y: rand(-80, -10), v: rand(750, 980), len: rand(10, 20), stop: horizon(x) + rand(0, H * 0.15) }); }
          }
          for (let i = drops.length - 1; i >= 0; i--) {
            const d = drops[i];
            d.y += d.v * dt; d.x -= d.v * 0.12 * dt;
            if (d.y > d.stop) {
              drops.splice(i, 1);
              if (Math.random() < 0.35) burst(d.x, d.stop, { n: 2, color: '#bcd6ff', speed: 40, up: 50, life: 0.35, size: 1.2, gravity: 400 });
            }
          }
          return age < this.dur || drops.length > 0;
        },
        back(fade) { cx.fillStyle = `rgba(6,12,28,${0.3 * fade})`; cx.fillRect(0, 0, W, H); },
        front() {
          cx.strokeStyle = 'rgba(190,215,255,.55)'; cx.lineWidth = 1.2;
          cx.beginPath();
          for (const d of drops) { cx.moveTo(d.x, d.y); cx.lineTo(d.x + d.len * 0.12, d.y - d.len); }
          cx.stroke();
        },
      };
    },

    snow() {
      const flakes = []; let acc = 0;
      return {
        dur: 9,
        step(dt, age) {
          if (age < this.dur - 2) {
            acc += dt * 45 * (W / 1200 + 0.3);
            while (acc >= 1) { acc--; flakes.push({ x: rand(0, W), y: -10, v: rand(35, 75), r: rand(1.2, 3.4), ph: rand(0, 6) }); }
          }
          for (let i = flakes.length - 1; i >= 0; i--) {
            const f = flakes[i];
            f.y += f.v * dt; f.x += Math.sin(T * 1.5 + f.ph) * 18 * dt;
            if (f.y > horizon(f.x) + f.r * 20) flakes.splice(i, 1);
          }
          return age < this.dur || flakes.length > 0;
        },
        front() {
          cx.fillStyle = 'rgba(255,255,255,.9)';
          for (const f of flakes) { cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, TAU); cx.fill(); }
        },
      };
    },

    stars() {
      starBoost = 1;
      const shoot = [], times = [0.2, 0.9, 1.7, 2.6, 3.4, 4.5]; let i = 0;
      return {
        dur: 6,
        step(dt, age) {
          while (i < times.length && age >= times[i]) { i++; shoot.push({ x: rand(W * 0.3, W), y: rand(H * 0.03, H * 0.3), vx: -rand(520, 760), vy: rand(180, 280), age: 0 }); }
          for (let j = shoot.length - 1; j >= 0; j--) {
            const s = shoot[j];
            s.age += dt; s.x += s.vx * dt; s.y += s.vy * dt;
            if (s.age > 1.1) shoot.splice(j, 1);
          }
          return age < this.dur || shoot.length > 0;
        },
        back() {
          cx.lineWidth = 2; cx.lineCap = 'round';
          for (const s of shoot) {
            const a = 1 - s.age / 1.1, tx = s.x - s.vx * 0.12, ty = s.y - s.vy * 0.12;
            const gr = cx.createLinearGradient(s.x, s.y, tx, ty);
            gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
            cx.strokeStyle = gr; cx.beginPath(); cx.moveTo(s.x, s.y); cx.lineTo(tx, ty); cx.stroke();
          }
        },
      };
    },

    ocean() {
      return {
        dur: 9,
        step(dt, age) { return age < this.dur; },
        front(fade) {
          const lift = (1 - easeOut(fade)) * H * 0.12;
          for (let k = 0; k < 3; k++) {
            const base = H * (0.86 + k * 0.04) + lift, amp = (8 + k * 4) * U, sp = 1.1 + k * 0.35;
            const pts = [];
            for (let x = 0; x <= W + 20; x += 20) pts.push([x, base + Math.sin(x * 0.011 + T * sp + k * 1.7) * amp + Math.sin(x * 0.027 - T * sp * 1.3) * amp * 0.35]);
            cx.beginPath(); cx.moveTo(0, H);
            for (const [x, y] of pts) cx.lineTo(x, y);
            cx.lineTo(W + 20, H); cx.closePath();
            cx.fillStyle = `rgba(${70 + k * 10},${160 + k * 15},${220 - k * 10},${(0.22 + k * 0.08) * fade})`; cx.fill();
            cx.beginPath();
            pts.forEach(([x, y], i) => (i ? cx.lineTo(x, y) : cx.moveTo(x, y)));
            cx.strokeStyle = `rgba(255,255,255,${0.35 * fade})`; cx.lineWidth = 1.5; cx.stroke();
          }
        },
      };
    },

    fire() {
      let acc = 0;
      return {
        dur: 6,
        step(dt, age) {
          if (age < this.dur - 1) {
            acc += dt * 70;
            while (acc >= 1) {
              acc--;
              const x = rand(0, W);
              parts.push({ kind: 'dot', x, y: horizon(x) + rand(0, H * 0.12), vx: rand(-15, 15), vy: rand(-150, -50), g: -20, drag: 0.99, age: 0, life: rand(1.4, 3), size: rand(1.4, 2.8), c: hex(pick(['#ff9f1c', '#ff6b35', '#ffd166'])), flicker: true });
            }
          }
          return age < this.dur;
        },
        front(fade) {
          const gr = cx.createLinearGradient(0, H, 0, H * 0.62);
          gr.addColorStop(0, `rgba(255,90,30,${0.3 * fade})`); gr.addColorStop(1, 'rgba(255,90,30,0)');
          cx.fillStyle = gr; cx.fillRect(0, H * 0.62, W, H * 0.38);
        },
      };
    },

    party() {
      const booms = [0.35, 0.95, 1.6]; let b = 0;
      for (let i = 0; i < (gentle ? 40 : 150); i++) {
        const left = i % 2 === 0;
        parts.push({
          kind: 'confetti', x: left ? -10 : W + 10, y: H * 0.88,
          vx: (left ? 1 : -1) * rand(180, 620) * (W / 1400 + 0.4), vy: -rand(520, 980) * (H / 900),
          g: 520, drag: 0.985, age: 0, life: rand(3.2, 4.8), w: rand(5, 9), h: rand(8, 14),
          rot: rand(0, 6), vr: rand(-9, 9), ph: rand(0, 6),
          color: pick(['#ffd166', '#ff5d8f', '#4cc9f0', '#7bf1a8', '#c77dff', '#ff9f1c']),
        });
      }
      return {
        dur: 2.2,
        step(dt, age) {
          while (b < booms.length && age >= booms[b]) { b++; firework(rand(W * 0.2, W * 0.8), rand(H * 0.1, H * 0.35)); }
          return age < this.dur;
        },
      };
    },

    hearts() {
      const hs = []; let spawned = 0;
      return {
        dur: 7,
        step(dt, age) {
          while (spawned < 18 && age > spawned * 0.14) {
            spawned++;
            const x = rand(W * 0.05, W * 0.95);
            hs.push({ x, y: horizon(x) + rand(0, H * 0.1), v: rand(45, 95) * (H / 900 + 0.3), s: rand(7, 16) * U, ph: rand(0, 6), age: 0, life: rand(4.5, 6.5) });
          }
          for (let i = hs.length - 1; i >= 0; i--) { const h = hs[i]; h.age += dt; h.y -= h.v * dt; if (h.age > h.life) hs.splice(i, 1); }
          return spawned < 18 || hs.length > 0;
        },
        front() {
          cx.fillStyle = '#ff6f9c';
          for (const h of hs) {
            cx.globalAlpha = Math.max(0, Math.min(1, h.age * 2, (h.life - h.age) / 1.2)) * 0.9;
            heartPath(h.x + Math.sin(T * 2 + h.ph) * 14, h.y, h.s); cx.fill();
          }
          cx.globalAlpha = 1;
        },
      };
    },

    sun() {
      return {
        dur: 11,
        step(dt, age) { return age < this.dur; },
        back(fade, age) {
          const x = W * 0.8, r = 34 * U;
          const up = easeOut(clamp01(age / 2.6)) * (1 - easeOut(clamp01((age - (this.dur - 2.4)) / 2.4)));
          const y = horizon(x) + 40 * U - up * (horizon(x) - H * 0.2);
          const gr = cx.createRadialGradient(x, y, r * 0.5, x, y, r * 5);
          gr.addColorStop(0, 'rgba(255,214,130,.55)'); gr.addColorStop(1, 'rgba(255,214,130,0)');
          cx.fillStyle = gr; cx.beginPath(); cx.arc(x, y, r * 5, 0, TAU); cx.fill();
          cx.save(); cx.translate(x, y); cx.rotate(T * 0.15);
          cx.strokeStyle = 'rgba(255,230,160,.35)'; cx.lineWidth = 3 * U; cx.lineCap = 'round';
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * TAU;
            cx.beginPath(); cx.moveTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5); cx.lineTo(Math.cos(a) * r * 2.2, Math.sin(a) * r * 2.2); cx.stroke();
          }
          cx.restore();
          cx.fillStyle = '#ffe9a8'; cx.beginPath(); cx.arc(x, y, r, 0, TAU); cx.fill();
        },
      };
    },

    cat() {
      let x = -70;
      const speed = (W + 140) / 11;
      return {
        dur: 12,
        step(dt) { x += speed * dt; return x < W + 70; },
        mid() {
          const s = 1.15 * U, y = bandY(x) - 1, stride = T * 9, bob = Math.abs(Math.sin(stride)) * 1.5 * s;
          cx.save(); cx.translate(x, y - bob); cx.scale(s, s);
          cx.lineCap = 'round';
          cx.strokeStyle = '#d98a4a'; cx.lineWidth = 3.4;
          for (const [lx, ph] of [[-12, 0], [-6, Math.PI], [8, Math.PI], [14, 0]]) {
            cx.beginPath(); cx.moveTo(lx, -10); cx.lineTo(lx + Math.sin(stride + ph) * 4, 0); cx.stroke();
          }
          cx.strokeStyle = '#f4a259'; cx.lineWidth = 4;
          cx.beginPath(); cx.moveTo(-17, -14); cx.quadraticCurveTo(-30, -18, -28 + Math.sin(T * 3) * 4, -34); cx.stroke();
          cx.fillStyle = '#f4a259';
          cx.beginPath(); cx.ellipse(0, -15, 19, 9.5, 0, 0, TAU); cx.fill();
          cx.strokeStyle = '#d98a4a'; cx.lineWidth = 2;
          for (const sx of [-6, 0, 6]) { cx.beginPath(); cx.moveTo(sx, -24); cx.lineTo(sx + 2, -18); cx.stroke(); }
          cx.beginPath(); cx.arc(19, -24, 8.5, 0, TAU); cx.fill();
          cx.beginPath(); cx.moveTo(13, -29); cx.lineTo(14, -38); cx.lineTo(19, -32); cx.fill();
          cx.beginPath(); cx.moveTo(20, -32); cx.lineTo(25, -38); cx.lineTo(26, -28); cx.fill();
          cx.fillStyle = '#2b1d14';
          cx.beginPath(); cx.arc(21.5, -25, 1.3, 0, TAU); cx.fill();
          cx.beginPath(); cx.arc(25.5, -25, 1.3, 0, TAU); cx.fill();
          cx.fillStyle = '#ff8fab'; cx.beginPath(); cx.arc(27, -22, 1.1, 0, TAU); cx.fill();
          cx.restore();
        },
      };
    },

    birds() {
      const flock = Array.from({ length: 5 }, (_, i) => ({ x: W + 30 + i * rand(30, 70), y: H * rand(0.1, 0.38), v: W / rand(6.5, 9), s: rand(6, 11) * U, ph: rand(0, 6) }));
      return {
        dur: 14,
        step(dt) {
          for (const b of flock) { b.x -= b.v * dt; b.y += Math.sin(T * 1.3 + b.ph) * 8 * dt; }
          return flock.some((b) => b.x > -40);
        },
        back() {
          cx.strokeStyle = 'rgba(255,255,255,.85)'; cx.lineWidth = 1.8; cx.lineCap = 'round'; cx.lineJoin = 'round';
          for (const b of flock) {
            const w = Math.sin(T * 10 + b.ph) * 0.8;
            cx.beginPath();
            cx.moveTo(b.x - b.s, b.y - b.s * w);
            cx.quadraticCurveTo(b.x - b.s * 0.4, b.y - b.s * 0.2, b.x, b.y);
            cx.quadraticCurveTo(b.x + b.s * 0.4, b.y - b.s * 0.2, b.x + b.s, b.y - b.s * w);
            cx.stroke();
          }
        },
      };
    },

    rainbow() {
      return {
        dur: 9,
        step(dt, age) { return age < this.dur; },
        back(fade, age) {
          const ox = W * 0.5, oy = H * 0.86, R = Math.min(W * 0.48, H * 0.62), reveal = easeOut(clamp01(age / 1.8));
          const bands = ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'];
          cx.lineWidth = 9 * U; cx.lineCap = 'butt';
          cx.globalAlpha = 0.4 * fade;
          bands.forEach((c, i) => { cx.strokeStyle = c; cx.beginPath(); cx.arc(ox, oy, R - i * 9 * U, Math.PI, Math.PI + Math.PI * reveal); cx.stroke(); });
          cx.globalAlpha = 1;
        },
      };
    },
  };

  function effect(name) {
    if (!FX[name]) return;
    if (effects.some((e) => e.name === name && e.age < e.dur * 0.6)) {
      if (name === 'stars') starBoost = 1;
      return;
    }
    const e = FX[name]();
    e.name = name; e.age = 0;
    effects.push(e);
  }

  const fadeOf = (e) => clamp01(Math.min(e.age / 1.2, (e.dur - e.age) / 1.8));
  function layer(hook) {
    for (const e of effects) if (e[hook]) { e[hook](fadeOf(e), e.age); cx.globalAlpha = 1; }
  }

  // ---- the loop ----
  function frame(now) {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
    last = now; T += dt;
    const k = 1 - Math.exp(-dt * 1.4);
    for (const key of COLOR_KEYS) for (let i = 0; i < 3; i++) col[key][i] += (tgt[key][i] - col[key][i]) * k;
    for (const key of FADE_KEYS) col[key] += (tgt[key] - col[key]) * k;
    breeze *= Math.exp(-dt * 1.6);
    starBoost = Math.max(0, starBoost - dt * 0.08);
    for (let i = effects.length - 1; i >= 0; i--) { const e = effects[i]; e.age += dt; if (!e.step(dt, e.age)) effects.splice(i, 1); }
    stepParts(dt);
    for (let i = plants.length - 1; i >= 0; i--) if (plants[i].dead) plants.splice(i, 1);
    draw();
    requestAnimationFrame(frame);
  }

  function ridge(yOf, color) {
    cx.fillStyle = color;
    cx.beginPath(); cx.moveTo(0, H);
    for (let x = 0; x <= W + 16; x += 16) cx.lineTo(x, yOf(x));
    cx.lineTo(W + 16, H); cx.closePath(); cx.fill();
  }

  function drawRow(r) {
    for (const p of plants) if (p.row === r) drawPlant(p);
    cx.globalAlpha = 1;
  }

  // A crescent: a bright disc with a second disc of sky laid over it.
  function drawMoon(sky) {
    if (col.moon < 0.02 || W < 640) return;
    const x = W * 0.09, y = H * 0.2, r = 24 * U;
    cx.globalAlpha = col.moon;
    const glow = cx.createRadialGradient(x, y, r * 0.8, x, y, r * 4.5);
    glow.addColorStop(0, 'rgba(220,228,255,.22)'); glow.addColorStop(1, 'rgba(220,228,255,0)');
    cx.fillStyle = glow; cx.beginPath(); cx.arc(x, y, r * 4.5, 0, TAU); cx.fill();
    cx.fillStyle = '#eef1ff'; cx.beginPath(); cx.arc(x, y, r, 0, TAU); cx.fill();
    cx.save();
    cx.beginPath(); cx.arc(x, y, r + 0.5, 0, TAU); cx.clip();
    cx.fillStyle = sky; cx.beginPath(); cx.arc(x + r * 0.45, y - r * 0.2, r * 0.9, 0, TAU); cx.fill();
    cx.restore();
    cx.globalAlpha = 1;
  }

  // Fireflies wander over the garden on quiet nights.
  function drawFlies() {
    if (col.flies < 0.02) return;
    cx.globalCompositeOperation = 'lighter';
    for (const f of flies) {
      const blink = Math.pow(Math.max(0, Math.sin(T * f.sp * 1.7 + f.ph)), 2);
      if (blink < 0.02) continue;
      const x = (f.x + Math.sin(T * 0.3 * f.sp + f.ph) * 0.03) * W;
      const y = (f.y + Math.cos(T * 0.4 * f.sp + f.ph * 1.3) * 0.02) * H;
      const R = 11 * U, glow = cx.createRadialGradient(x, y, 0, x, y, R);
      glow.addColorStop(0, 'rgba(232,255,120,0.9)');
      glow.addColorStop(0.25, 'rgba(200,255,80,0.35)');
      glow.addColorStop(1, 'rgba(180,255,60,0)');
      cx.globalAlpha = col.flies * blink;
      cx.fillStyle = glow; cx.beginPath(); cx.arc(x, y, R, 0, TAU); cx.fill();
      cx.fillStyle = '#fffbd6'; cx.beginPath(); cx.arc(x, y, 1.4 * U, 0, TAU); cx.fill();
    }
    cx.globalCompositeOperation = 'source-over';
    cx.globalAlpha = 1;
  }

  function draw() {
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    const sky = cx.createLinearGradient(0, 0, 0, H * 0.85);
    sky.addColorStop(0, rgba(col.sky0)); sky.addColorStop(1, rgba(col.sky1));
    cx.fillStyle = sky; cx.fillRect(0, 0, W, H);

    const sa = Math.min(1, col.stars + starBoost);
    if (sa > 0.01) {
      for (const s of stars) {
        const tw = 0.55 + 0.45 * Math.sin(T * s.sp + s.ph);
        cx.fillStyle = `rgba(255,255,255,${(sa * tw * s.a).toFixed(3)})`;
        cx.fillRect(s.x * W, s.y * H, s.r, s.r);
      }
    }
    drawMoon(sky);
    layer('back');
    ridge(horizon, rgba(col.hill));
    drawRow(0); drawRow(1);
    ridge(bandY, rgba(col.ground));
    layer('mid');
    drawRow(2);
    drawFlies();
    layer('front');
    drawParts();
  }

  function init() {
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 150; i++) stars.push({ x: Math.random(), y: Math.random() * 0.62, r: rand(1, 2.2), a: rand(0.4, 1), sp: rand(0.6, 2.2), ph: rand(0, 6) });
    for (let i = 0; i < (gentle ? 8 : 22); i++) flies.push({ x: rand(0.03, 0.97), y: rand(0.6, 0.86), sp: rand(0.5, 1.4), ph: rand(0, 6) });
    requestAnimationFrame(frame);
  }

  return {
    init, setMood, plant, unplant, clear, decorate, sparkle, fall, effect,
    gust(a) { breeze = Math.min(1, breeze + (gentle ? a * 0.3 : a)); },
  };
})();
