/* Keysong · moods.js
   Every feeling gets a sky, a musical key, an instrument and a flower. */
'use strict';

const MOODS = {
  calm: {
    name: 'calm', emoji: '🌿', key: 'C major',
    root: 60, scale: [0, 2, 4, 7, 9],
    prog: [[0, 'M'], [9, 'm'], [5, 'M'], [7, 'M']],
    voice: 'kalimba',
    sky: ['#132540', '#3b6c85'], hill: '#173a2f', ground: '#0d211b',
    accent: '#8fe3cf', text: '#eef8f5', stem: '#5fae8a', canopy: '#3f9a70',
    stars: 0.35, flower: 'daisy',
  },
  joy: {
    name: 'joyful', emoji: '☀️', key: 'D major',
    root: 62, scale: [0, 2, 4, 7, 9],
    prog: [[0, 'M'], [7, 'M'], [9, 'm'], [5, 'M']],
    voice: 'bell2',
    sky: ['#3b1d5e', '#e9804a'], hill: '#45291a', ground: '#23140d',
    accent: '#ffd166', text: '#fff6dc', stem: '#7cb35f', canopy: '#e9a23b',
    stars: 0.06, flower: 'sunflower',
  },
  love: {
    name: 'tender', emoji: '💗', key: 'F major 7',
    root: 65, scale: [0, 2, 4, 7, 11],
    prog: [[0, 'M7'], [4, 'm7'], [5, 'M7'], [7, 'M']],
    voice: 'epiano',
    sky: ['#2b0d2e', '#a8366c'], hill: '#3a1230', ground: '#200a1a',
    accent: '#ff8fab', text: '#ffe6ee', stem: '#6e9f6a', canopy: '#f49ac1',
    stars: 0.22, flower: 'heart',
  },
  blue: {
    name: 'wistful', emoji: '🌧️', key: 'A minor',
    root: 57, scale: [0, 3, 5, 7, 10],
    prog: [[0, 'm'], [8, 'M'], [3, 'M'], [10, 'M']],
    voice: 'epiano',
    sky: ['#060d22', '#25406f'], hill: '#122339', ground: '#08111f',
    accent: '#86b6ff', text: '#dde9ff', stem: '#4f8088', canopy: '#4467a8',
    stars: 0.6, flower: 'bluebell',
  },
  fire: {
    name: 'fiery', emoji: '🔥', key: 'E blues',
    root: 52, scale: [0, 3, 5, 6, 7, 10],
    prog: [[0, 'm'], [0, 'm'], [8, 'M'], [10, 'M']],
    voice: 'pluck',
    sky: ['#1a0505', '#8f2a12'], hill: '#2a0c08', ground: '#140605',
    accent: '#ff7a3d', text: '#ffe2d2', stem: '#7d6d3c', canopy: '#c2452d',
    stars: 0.04, flower: 'flame',
  },
  wonder: {
    name: 'dreamy', emoji: '✨', key: 'G lydian',
    root: 67, scale: [0, 2, 4, 6, 7, 9, 11],
    prog: [[0, 'M'], [2, 'M'], [0, 'M'], [2, 'M']],
    voice: 'bell',
    sky: ['#07051a', '#3b2470'], hill: '#1b1240', ground: '#0c0820',
    accent: '#c7a8ff', text: '#efe6ff', stem: '#6c7fd8', canopy: '#8b7cf6',
    stars: 1, flower: 'orb',
  },
};

// Words that pull the mood somewhere.
const LEXICON = {
  joy: 'happy happiness happier joy joyful yay great awesome amazing excited exciting fun funny laugh laughing haha lol lmao smile smiling celebrate congrats congratulations birthday bday party win won winning yes best wonderful fantastic sunshine sunny glad hooray woohoo dance dancing delight delighted cheers proud brilliant perfect epic woo yippee',
  love: 'love loved loving lovely heart hearts darling dear dearest honey sweet sweetheart kiss kisses hug hugs xoxo xo adore cute together forever always crush beautiful gorgeous mom mum mama dad papa grandma grandpa friend friends bestie thank thanks thankyou grateful family cuddle cuddles warm',
  blue: 'sad sadness sorry miss missed missing lonely alone cry crying cried tears tired lost hurt hurts gone goodbye bye broken sick hard difficult regret wish gray grey empty sigh blue worried anxious scared afraid sorrow grief remember memories rain rainy cold apart far',
  fire: 'angry anger mad hate hated furious annoyed annoying ugh damn stupid rage fire burn burning hot fight stop worst terrible awful frustrated frustrating wtf argh grr deadline deadlines traffic monday mondays seriously enough unfair',
  wonder: 'wow whoa stars star moon night dream dreams dreaming magic magical space universe galaxy sky curious wonder wondering imagine maybe someday mystery ocean sea infinite secret glow whisper believe aurora cosmos planet planets midnight',
  calm: 'calm peace peaceful okay ok fine chill relax relaxed breathe slow gentle soft tea coffee home sleep sleepy rest cozy quiet nap breeze still',
};

const EMOJI_MOODS = {
  joy: '😂😄😃😁😆😊🥳🎉🎊🙌👏😎🤩☀🎂',
  love: '❤💕💖💗💘💞💓😍🥰😘💋🤗',
  blue: '😢😭💔😔😞🥺😿🌧',
  fire: '😡🤬😤💢🔥',
  wonder: '✨🌙⭐🌟🌌🔮🪐💫',
  calm: '😌🍵☕🌿🧘',
};

// Words that make something happen in the sky.
const MAGIC_WORDS = {
  rain: 'rain raining rainy storm stormy drizzle umbrella 🌧 ☔ 🌦',
  snow: 'snow snowing snowy winter snowflake frozen ❄ ☃ ⛄',
  stars: 'star stars starry night midnight moon galaxy cosmos 🌙 ⭐ 🌟 🌌 💫 ✨',
  ocean: 'ocean sea beach waves wave surf 🌊 🏖',
  fire: 'fire burn burning flames campfire 🔥',
  party: 'birthday bday party congrats congratulations celebrate hooray yay woohoo 🎉 🎊 🥳 🎂',
  hearts: 'love heart hearts xoxo ❤ 💕 💖 💗 💘 💞 😍 🥰',
  sun: 'sun sunny sunshine morning sunrise summer ☀ 🌞 🌅',
  cat: 'cat cats kitty kitten kittens meow 🐱 🐈',
  birds: 'bird birds sing singing song tweet 🐦 🕊',
  rainbow: 'rainbow rainbows 🌈',
};

const WORD_MOOD = new Map();
const WORD_MAGIC = new Map();
for (const [mood, list] of Object.entries(LEXICON)) for (const w of list.split(/\s+/)) if (w) WORD_MOOD.set(w, mood);
for (const [mood, list] of Object.entries(EMOJI_MOODS)) for (const e of Array.from(list)) WORD_MOOD.set(e, mood);
for (const [fx, list] of Object.entries(MAGIC_WORDS)) for (const w of list.split(/\s+/)) if (w) WORD_MAGIC.set(w.replace(/️/g, ''), fx);

function normWord(w) {
  return w.toLowerCase().normalize('NFKC').replace(/’/g, "'")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

function lookup(map, word) {
  // emoji first: any single code point that means something
  for (const cp of word) { if (cp.codePointAt(0) > 0x2000) { const v = map.get(cp); if (v) return v; } }
  const w = normWord(word);
  if (!w) return null;
  const tries = [w, w.replace(/(.)\1{2,}/g, '$1'), w.replace(/(.)\1{2,}/g, '$1$1'), w.replace(/s$/, '')];
  for (const t of tries) { const v = map.get(t); if (v) return v; }
  if (map === WORD_MOOD && /^(ha){2,}h?$|^(he){2,}$|^l+o+l+$/.test(w)) return 'joy';
  return null;
}

const moodOf = (word) => lookup(WORD_MOOD, word);
const magicOf = (word) => lookup(WORD_MAGIC, word);

// Feelings build up word by word, fade when you stop feeding them, and drift back to calm.
class MoodState {
  constructor() { this.reset(); }
  reset() {
    this.scores = { calm: 0, joy: 0, love: 0, blue: 0, fire: 0, wonder: 0 };
    this.current = 'calm';
  }
  feed(word) {
    const matched = moodOf(word);
    for (const k in this.scores) this.scores[k] *= 0.84;
    if (matched) this.scores[matched] += 1;
    let next = this.current;
    for (const k in this.scores) if (this.scores[k] > this.scores[next] + 0.02) next = k;
    if (this.scores[next] < 0.5) next = this.current;
    if (next === this.current && next !== 'calm' && !matched && this.scores[next] < 0.1) next = 'calm';
    const changed = next !== this.current;
    this.current = next;
    return { matched, changed, mood: next };
  }
}
