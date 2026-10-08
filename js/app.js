/* Keysong · app.js
   The typewriter, the replay, the envelope. Everything you type is recorded as
   [pause before it, what was typed] so it can be performed again, hesitations and all. */
'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const paper = $('paper'), caret = $('caret'), ta = $('ta'), placeholder = $('placeholder');
  const pill = $('pausePill'), forLine = $('forLine'), hints = $('hints'), counter = $('counter');
  const MAX_CHARS = 500, MAX_EVENTS = 4000;

  const seg = window.Intl && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
  const graphemes = (s) => (seg ? Array.from(seg.segment(s), (x) => x.segment) : Array.from(s));
  const isSpace = (c) => c === ' ' || c === '\n';
  const isSep = (c) => isSpace(c) || /^[.,!?;:…]$/.test(c);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const S = {
    mode: 'intro',     // intro | compose | replay | received | envelope
    chars: [],         // { ch, el, word }
    plants: [],        // { idx, plant, tail }
    events: [],        // [centiseconds of pause before, grapheme | 0 for backspace]
    lastAt: 0,
    overflow: false,
    mood: new MoodState(),
    trail: ['calm'],
    token: 0,
    replaying: null,
    received: null,
    lockPlaceholder: false,
  };

  const textOf = () => S.chars.map((c) => c.ch).join('');

  function setMode(m) {
    S.mode = m;
    document.body.dataset.mode = m;
  }

  // ---------- mood ----------
  function setMood(mk, quiet) {
    const M = MOODS[mk];
    if (S.trail[S.trail.length - 1] !== mk) S.trail.push(mk);
    Scene.setMood(mk);
    const root = document.documentElement.style;
    root.setProperty('--accent', M.accent);
    root.setProperty('--ink', M.text);
    const chip = $('moodChip');
    chip.querySelector('.emoji').textContent = M.emoji;
    chip.querySelector('.label').textContent = M.name;
    chip.querySelector('.key').textContent = M.key;
    chip.classList.remove('pop'); void chip.offsetWidth; chip.classList.add('pop');
    if (!quiet) Sound.moodShift(mk);
  }

  // ---------- typing ----------
  function addChar(ch, o = {}) {
    const lastPlant = S.plants[S.plants.length - 1];
    if (lastPlant && lastPlant.tail) Scene.unplant(S.plants.pop().plant);
    const prev = S.chars[S.chars.length - 1];
    let el, word = null;
    if (isSpace(ch)) {
      el = document.createElement('span');
      el.className = 'sp';
      el.textContent = ch;
      paper.insertBefore(el, caret);
    } else {
      word = prev && !isSpace(prev.ch) ? prev.word : null;
      if (!word) {
        word = document.createElement('span');
        word.className = 'word';
        paper.insertBefore(word, caret);
      }
      el = document.createElement('span');
      el.className = 'ch';
      el.textContent = ch;
      el.style.color = MOODS[S.mood.current].text;
      word.appendChild(el);
    }
    S.chars.push({ ch, el, word });
    placeholder.hidden = true;
    if (!o.silent) feedback(ch, el, o.dt);
    if (isSep(ch)) commitWord(S.chars.length - 1, o);
    paper.scrollTop = paper.scrollHeight;
  }

  function feedback(ch, el, dt) {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const vel = dt == null ? 0.7 : clamp(0.42 + (dt - 40) / 700, 0.42, 0.95);
    const pan = clamp((x / window.innerWidth) * 1.4 - 0.7, -0.8, 0.8);
    Sound.key(ch, S.mood.current, { vel, pan });
    Scene.sparkle(x, y, S.mood.current, ch === '!' ? 'bang' : /[aeiou]/i.test(ch) ? 'vowel' : isSpace(ch) ? 'space' : 'key');
    Scene.gust(isSpace(ch) ? 0.25 : 0.08);
  }

  // The run of letters before a separator becomes a word: it feeds the mood and grows a plant.
  function runBefore(end) {
    const run = [];
    for (let i = end - 1; i >= 0 && !isSep(S.chars[i].ch); i--) run.unshift(S.chars[i]);
    return run;
  }

  function commitWord(sepIdx, o) {
    const run = runBefore(sepIdx);
    if (run.length) plantWord(run, sepIdx, o, false);
  }

  function plantWord(run, idx, o, tail) {
    const word = run.map((c) => c.ch).join('');
    const res = S.mood.feed(word);
    if (res.matched) run.forEach((c) => { c.el.style.color = MOODS[res.matched].accent; c.el.classList.add('felt'); });
    if (res.changed) setMood(res.mood, o.silent);
    const fx = magicOf(word);
    if (fx) {
      run.forEach((c) => c.el.classList.add('magic'));
      if (!o.silent) { Scene.effect(fx); Sound.magic(fx, S.mood.current); hints.classList.add('gone'); }
    }
    S.plants.push({ idx, plant: Scene.plant(word, S.mood.current), tail });
    if (S.plants.length > 10) hints.classList.add('gone');
  }

  // The last word has no space after it yet. Plant it anyway when the message is "done".
  function finalizeTail(o) {
    const last = S.chars[S.chars.length - 1];
    if (!last || isSep(last.ch)) return;
    const lp = S.plants[S.plants.length - 1];
    if (lp && lp.tail) return;
    plantWord(runBefore(S.chars.length), S.chars.length, o, true);
  }

  function removeLast(o = {}) {
    const c = S.chars.pop();
    if (!c) return;
    if (!o.silent) {
      const r = c.el.getBoundingClientRect();
      if (r.width || r.height) {
        const cs = getComputedStyle(c.el);
        Scene.fall(c.ch, r.left + r.width / 2, r.top + r.height / 2, cs.color, parseFloat(cs.fontSize), cs.fontFamily);
      }
      Sound.backspace(clamp((r.left / window.innerWidth) * 1.4 - 0.7, -0.8, 0.8));
    }
    c.el.remove();
    if (c.word && !c.word.firstChild) c.word.remove();
    while (S.plants.length && S.plants[S.plants.length - 1].idx >= S.chars.length) Scene.unplant(S.plants.pop().plant);
    if (!S.chars.length && S.mode === 'compose') placeholder.hidden = false;
  }

  function resetAll() {
    paper.querySelectorAll('.word, .sp').forEach((n) => n.remove());
    S.chars = []; S.plants = []; S.trail = ['calm'];
    S.mood.reset();
    Scene.clear();
    Sound.resetProgression();
    setMood('calm', true);
    hidePause(); hideFinale();
  }

  // ---------- live input ----------
  // A hidden textarea catches every keyboard (including phones and IMEs).
  // Keysong is a typewriter: you can only add at the end or backspace.
  let composing = false;
  ta.addEventListener('compositionstart', () => { composing = true; });
  ta.addEventListener('compositionend', () => { composing = false; onInput(); });
  ta.addEventListener('input', () => { if (!composing) onInput(); });

  function record(c, now) {
    const dt = S.events.length ? now - S.lastAt : 0;
    S.lastAt = now;
    if (S.events.length >= MAX_EVENTS) S.overflow = true;
    else S.events.push([Math.min(6000, Math.round(dt / 10)), c]);
    return dt;
  }

  function onInput() {
    if (S.mode !== 'compose') { ta.value = textOf(); return; }
    const oldG = S.chars.map((c) => c.ch);
    const newG = graphemes(ta.value.replace(/\r\n?/g, '\n').replace(/\t/g, ' '));
    let p = 0;
    while (p < oldG.length && p < newG.length && oldG[p] === newG[p]) p++;
    const now = performance.now();
    for (let d = oldG.length - p; d > 0; d--) { record(0, now); removeLast(); }
    let add = newG.slice(p);
    const room = MAX_CHARS - S.chars.length;
    if (add.length > room) {
      add = add.slice(0, Math.max(0, room));
      paper.classList.remove('full'); void paper.offsetWidth; paper.classList.add('full');
    }
    for (const g of add) addChar(g, { dt: record(g, now) });
    const t = textOf();
    if (ta.value !== t) ta.value = t;
    hideFinale();
    updateCounter();
  }

  ta.addEventListener('keydown', (e) => {
    if (/^(Arrow|Home|End|Page)/.test(e.key) || e.key === 'Tab') e.preventDefault();
    if ((e.ctrlKey || e.metaKey) && /^[zya]$/i.test(e.key)) e.preventDefault();
  });
  const pinCaret = () => { const n = ta.value.length; if (ta.selectionStart !== n || ta.selectionEnd !== n) ta.setSelectionRange(n, n); };
  ['select', 'click', 'keyup', 'focus'].forEach((ev) => ta.addEventListener(ev, pinCaret));

  function focusInput() {
    if (S.mode === 'compose' && $('share').hidden) ta.focus({ preventScroll: true });
  }

  function updateCounter() {
    const left = MAX_CHARS - S.chars.length;
    counter.textContent = left <= 80 ? `${left} left` : '';
  }

  // ---------- replay ----------
  async function replay(events, onDone) {
    const my = ++S.token;
    resetAll();
    placeholder.hidden = true;
    setMode('replay');
    S.replaying = { events, onDone };
    for (let i = 0; i < events.length; i++) {
      const [cs, c] = events[i], real = cs * 10;
      if (real >= 3000) showPause(real, my);
      await sleep(i === 0 ? 600 : Math.min(real, 2400));
      if (my !== S.token) return;
      hidePause();
      if (c === 0) removeLast();
      else if (S.chars.length < 600) addChar(c, { dt: real });
    }
    finalizeTail({});
    S.replaying = null;
    onDone();
  }

  function skipReplay() {
    const r = S.replaying;
    if (!r) return;
    S.token++;
    S.replaying = null;
    resetAll();
    for (const [, c] of r.events) {
      if (c === 0) removeLast({ silent: true });
      else if (S.chars.length < 600) addChar(c, { silent: true });
    }
    finalizeTail({ silent: true });
    r.onDone();
  }

  let pauseTimer = 0;
  function showPause(ms, token) {
    caret.classList.add('thinking');
    clearTimeout(pauseTimer);
    pauseTimer = setTimeout(() => {
      if (token !== S.token) return;
      const r = caret.getBoundingClientRect();
      pill.textContent = `paused ${fmtSec(ms)}`;
      pill.hidden = false;
      pill.style.left = Math.max(8, Math.min(window.innerWidth - pill.offsetWidth - 8, r.right + 10)) + 'px';
      pill.style.top = r.top + r.height / 2 - pill.offsetHeight / 2 + 'px';
    }, 450);
  }

  function hidePause() {
    clearTimeout(pauseTimer);
    pill.hidden = true;
    caret.classList.remove('thinking');
  }

  // ---------- stats & finale ----------
  const fmtSec = (ms) => (ms < 10000 ? (ms / 1000).toFixed(1) : Math.round(ms / 1000)) + 's';
  function fmtDur(ms) {
    const s = Math.max(1, Math.round(ms / 1000));
    return s < 60 ? `${s} second${s === 1 ? '' : 's'}` : `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  function summarize(events) {
    let total = 0, erased = 0, longest = 0, at = -1;
    events.forEach(([cs, c], i) => {
      const ms = cs * 10;
      if (i) { total += ms; if (ms > longest) { longest = ms; at = i; } }
      if (c === 0) erased++;
    });
    // what came right after the longest pause?
    let after = '';
    if (at >= 0 && events[at][1] === 0) after = null;
    else if (at >= 0) {
      for (let j = at; j < events.length; j++) {
        const c = events[j][1];
        if (c === 0 || /^[.,!?;:…\n]$/.test(c)) { if (after.trim()) break; else continue; }
        after += c;
        if (after.length > 28) break;
      }
      after = after.trim();
    }
    return { total, erased, longest, after };
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function showFinale(kind, events, messy, p) {
    const st = summarize(events);
    let title;
    if (kind === 'preview') title = 'This is what they’ll experience';
    else if (p && p.example) title = `An example Keysong, written in ${fmtDur(st.total)}`;
    else if (!messy) title = p && p.from ? `A Keysong from ${p.from}` : 'A Keysong, just for you';
    else title = `${p && p.from ? p.from : 'Someone'} wrote this in ${fmtDur(st.total)}`;
    $('finTitle').textContent = title;

    const list = $('finStats');
    list.replaceChildren();
    const item = (icon, ...bits) => {
      const li = el('li');
      li.append(el('span', 'ico', icon));
      const body = el('span');
      bits.forEach((b) => body.append(typeof b === 'string' ? document.createTextNode(b) : b));
      li.append(body);
      list.append(li);
    };
    const n = S.plants.length;
    item('🌱', `${n} flower${n === 1 ? '' : 's'} grew, one for every word`);
    if (messy) {
      item('⌫', st.erased ? `${st.erased} letter${st.erased === 1 ? '' : 's'} erased along the way` : 'not a single letter erased');
      if (st.longest >= 1500) {
        const tail = st.after ? [', right before ', el('q', null, st.after)] : st.after === null ? [', right before deleting something'] : [];
        item('⏳', 'longest pause: ', el('b', null, fmtSec(st.longest)), ...tail);
      }
    } else {
      item('✨', 'sent without the messy parts');
    }

    const journey = $('finMoods');
    journey.replaceChildren();
    S.trail.forEach((mk, i) => {
      if (i) journey.append(el('span', 'arrow', '→'));
      const M = MOODS[mk], chip = el('span', 'mchip', `${M.emoji} ${M.name}`);
      chip.style.setProperty('--c', M.accent);
      journey.append(chip);
    });

    const actions = $('finActions');
    actions.replaceChildren();
    const btn = (label, cls, fn) => { const b = el('button', 'pill ' + cls, label); b.type = 'button'; b.onclick = fn; actions.append(b); return b; };
    if (kind === 'preview') {
      btn('✎ Keep writing', '', () => { hideFinale(); focusInput(); });
      btn('💌 Send it', 'primary', openShare);
    } else {
      btn('↺ Play again', '', () => playReceived());
      btn(p && p.example ? '✍️ Write your own' : '✍️ Write back', 'primary', writeBack);
    }
    $('finale').hidden = false;
  }

  function hideFinale() { $('finale').hidden = true; }

  // ---------- flows ----------
  function hideOverlay(o) {
    if (o.hidden) return;
    o.classList.add('out');
    setTimeout(() => { o.hidden = true; o.classList.remove('out'); }, 520);
  }

  function startCompose(fresh = true) {
    Sound.resume();
    hideOverlay($('intro'));
    setMode('compose');
    if (fresh) {
      resetAll();
      S.events = []; S.overflow = false;
      hints.classList.remove('gone');
    }
    placeholder.hidden = S.chars.length > 0;
    ta.value = textOf();
    S.lastAt = performance.now();
    updateCounter();
    focusInput();
  }

  function preview() {
    if (!S.chars.length) return toast('Type something first ✍️');
    Sound.resume();
    const evs = S.overflow ? cleanEvents(textOf()) : S.events.slice();
    replay(evs, () => {
      setMode('compose');
      ta.value = textOf();
      S.lastAt = performance.now();
      showFinale('preview', evs, true);
    });
  }

  function playReceived() {
    const p = S.received;
    if (!p) return;
    hideFinale();
    forLine.textContent = p.example ? 'an example Keysong' : [p.to && `for ${p.to}`, p.from && `from ${p.from}`].filter(Boolean).join(' · ');
    forLine.hidden = !forLine.textContent;
    replay(p.e, () => { setMode('received'); showFinale('received', p.e, !!p.m, p); });
  }

  function writeBack() {
    const p = S.received;
    history.replaceState(null, '', location.pathname + location.search);
    S.received = null;
    forLine.hidden = true;
    hideFinale();
    if (p && p.from && !p.example) {
      $('fTo').value = p.from;
      placeholder.textContent = `Write back to ${p.from}…`;
      S.lockPlaceholder = true;
    }
    startCompose(true);
  }

  function showEnvelope(p) {
    setMode('envelope');
    $('intro').hidden = true;
    $('envTo').textContent = p.to ? `A Keysong for ${p.to}` : 'A Keysong for you';
    $('envFrom').textContent = p.from ? `from ${p.from}` : 'from someone who typed it just for you';
    $('envelope').hidden = false;
  }

  $('btnOpen').addEventListener('click', () => {
    Sound.resume();
    $('btnOpen').classList.add('open');
    setTimeout(() => { hideOverlay($('envelope')); playReceived(); }, 1100);
  });

  // ---------- example ----------
  function makeExample() {
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const e = [];
    let wait = 0;
    const push = (c, ms) => { e.push([Math.min(6000, Math.round((wait + ms) / 10)), c]); wait = 0; };
    const type = (s, pace = 105) => {
      let prev = '';
      for (const g of graphemes(s)) {
        let ms = pace * (0.55 + rnd() * 0.9);
        if (prev === ' ') ms += 60 * rnd();
        if (/[.,!?]/.test(prev)) ms += 260;
        push(g, ms);
        prev = g;
      }
    };
    const pause = (ms) => { wait += ms; };
    const erase = (n) => { for (let i = 0; i < n; i++) push(0, 140 + rnd() * 60); };

    type('hey you.'); pause(1300); type('\n');
    type("sorry it's been so long. "); pause(7400); type('i miss you.'); pause(900); type('\n');
    type('remember that night we counted stars by the ocaen'); pause(500); erase(3); type('ean?'); pause(1500); type('\n');
    type('anyway... happy birthday!! 🎉'); pause(1600); type('\n');
    type('give the cat a kiss from me.'); pause(5200); type('\n');
    type('love you ❤️', 130);
    return { v: 1, to: '', from: '', m: 1, e, example: true };
  }

  // ---------- sharing ----------
  function cleanEvents(text) {
    let prev = '';
    return graphemes(text).map((g, i) => {
      const cs = i === 0 ? 0 : prev === '\n' ? 40 : /[.,!?]/.test(prev) ? 30 : prev === ' ' ? 14 : 9;
      prev = g;
      return [cs, g];
    });
  }

  function openShare() {
    if (!S.chars.length) return toast('Write something first ✍️');
    hideFinale();
    $('shareOut').hidden = true;
    try { if (!$('fFrom').value) $('fFrom').value = localStorage.getItem('keysong.from') || ''; } catch (e) { /* storage blocked */ }
    $('share').hidden = false;
    ($('fTo').value ? $('fFrom') : $('fTo')).focus();
  }

  function closeShare() {
    hideOverlay($('share'));
    setTimeout(focusInput, 60);
  }

  $('shareForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const messy = $('fMessy').checked && !S.overflow;
    const from = $('fFrom').value.trim(), to = $('fTo').value.trim();
    const payload = { v: 1, to, from, m: messy ? 1 : 0, e: messy ? S.events : cleanEvents(textOf()) };
    const url = location.href.split('#')[0] + '#k=' + (await Share.encode(payload));
    $('shareUrl').value = url;
    $('shareOpen').href = url;
    const hasQr = Share.qr(url, $('qr'));
    $('qr').hidden = !hasQr;
    let note = 'Nothing is stored on a server. The whole song lives inside the link.';
    if (location.protocol === 'file:') note = '⚠️ Opened as a local file, so this link only works on this computer. Run “node serve.js” or deploy the folder to share it.';
    else if (/^(localhost|127\.)/.test(location.hostname)) note = '⚠️ This link points to localhost. For phones, open Keysong via the network address that serve.js prints, or deploy the folder.';
    $('shareNote').textContent = note;
    $('shareOut').hidden = false;
    try { localStorage.setItem('keysong.from', from); } catch (err) { /* storage blocked */ }
  });

  $('btnCopy').addEventListener('click', async () => {
    const input = $('shareUrl');
    try { await navigator.clipboard.writeText(input.value); }
    catch (e) { input.select(); document.execCommand('copy'); }
    $('btnCopy').textContent = 'Copied ✓';
    setTimeout(() => { $('btnCopy').textContent = 'Copy'; }, 1800);
  });

  // ---------- chrome ----------
  let toastTimer = 0;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
  }

  function setMuted(v) {
    Sound.setMuted(v);
    $('btnMute').textContent = v ? '🔇' : '🔊';
    $('btnMute').setAttribute('aria-label', v ? 'Unmute' : 'Mute');
    try { localStorage.setItem('keysong.muted', v ? '1' : '0'); } catch (e) { /* storage blocked */ }
  }

  let newArmed = 0;
  function newPage() {
    const label = $('btnNew').querySelector('.txt');
    if (!S.chars.length) return focusInput();
    if (Date.now() - newArmed < 2500) {
      newArmed = 0; label.textContent = 'New';
      S.lockPlaceholder = false;
      startCompose(true);
    } else {
      newArmed = Date.now(); label.textContent = 'Clear page?';
      setTimeout(() => { label.textContent = 'New'; }, 2500);
      focusInput();
    }
  }

  const PROMPTS = ['Write something to someone…', 'Tell someone you miss them…', 'Wish someone a happy birthday…', 'Describe the sky where you are…', 'Say thank you to someone…', 'Tell your cat a secret…'];
  let promptIdx = 0;
  setInterval(() => {
    if (S.mode !== 'compose' || S.chars.length || S.lockPlaceholder) return;
    promptIdx = (promptIdx + 1) % PROMPTS.length;
    placeholder.classList.add('swap');
    setTimeout(() => { placeholder.textContent = PROMPTS[promptIdx]; placeholder.classList.remove('swap'); }, 350);
  }, 4200);

  $('btnStart').addEventListener('click', () => startCompose(true));
  $('btnExample').addEventListener('click', () => {
    Sound.resume();
    hideOverlay($('intro'));
    S.received = makeExample();
    playReceived();
  });
  $('btnPlay').addEventListener('click', preview);
  $('btnSend').addEventListener('click', openShare);
  $('btnNew').addEventListener('click', newPage);
  $('btnSkip').addEventListener('click', skipReplay);
  $('btnMute').addEventListener('click', () => { Sound.resume(); setMuted(!Sound.muted); focusInput(); });
  $('btnCloseShare').addEventListener('click', closeShare);
  $('share').addEventListener('pointerdown', (e) => { if (e.target === $('share')) closeShare(); });
  $('moodChip').addEventListener('click', () => {
    const M = MOODS[S.mood.current];
    toast(`${M.emoji} ${M.name} · ${M.key}. Your words set the mood. Try happy, miss, love, ugh or stars.`);
    focusInput();
  });

  document.addEventListener('pointerdown', (e) => {
    Sound.resume();
    if (S.mode === 'compose' && !e.target.closest('button, input, label, a, .card')) setTimeout(focusInput, 0);
  });

  document.addEventListener('keydown', (e) => {
    Sound.resume();
    if (e.key === 'Escape') {
      if (!$('share').hidden) closeShare();
      else if (S.replaying) skipReplay();
      return;
    }
    if (S.mode === 'intro' && !$('intro').hidden && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      startCompose(true);
      return;
    }
    if (S.mode === 'compose' && $('share').hidden && document.activeElement !== ta && !e.target.closest('input, textarea')) focusInput();
  });

  window.addEventListener('hashchange', () => { if (/^#k=/.test(location.hash)) location.reload(); });

  // ---------- boot ----------
  async function boot() {
    Scene.init();
    let muted = false;
    try { muted = localStorage.getItem('keysong.muted') === '1'; } catch (e) { /* storage blocked */ }
    setMuted(muted);
    setMood('calm', true);
    setMode('intro');
    const m = location.hash.match(/^#k=([A-Za-z0-9_-]+)/);
    if (m) {
      try {
        S.received = await Share.decode(m[1]).catch(() => sleep(300).then(() => Share.decode(m[1])));
        showEnvelope(S.received);
        return;
      } catch (err) {
        console.warn('Keysong link could not be read', err);
        toast('That Keysong link looks broken 💔');
      }
    }
    $('intro').hidden = false;
  }

  boot();
})();
