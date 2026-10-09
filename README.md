# 🌷 Keysong

**Messages that sing, and remember how they were written.**

▶ **Try it: https://ap-edu.github.io/keysong/** (sound on)

Typing a message is one of the most ordinary things we do on a screen: gray bubbles, blinking cursor, send.
Keysong makes it something you *feel*:

- **Every letter is a note.** Vowels ring, consonants pluck, spaces walk a bass line through chord changes, a `.` resolves the phrase, `!` sparkles, `?` floats up unresolved.
- **Every word grows a flower** in a garden at the bottom of the screen. Long words grow trees, numbers grow mushrooms, emoji bloom as themselves.
- **Your words set the mood.** *sorry, miss* turn the sky to a wistful A minor; *stars, night* go dreamy G lydian; *happy, birthday* bring a joyful D major sunset; *love, dear* turn it tender. Every flower keeps the mood it was born in, so the garden becomes a map of how the message felt.
- **Magic words** make things happen: `rain` · `snow` · `stars` · `ocean` · `fire` · `birthday` · `love` · `sunshine` · `cat` 🐈 · `birds` · `rainbow`.
- **Send it as a link.** The person who opens it gets an envelope, and then watches your message being written again, at your pace, **with your real pauses and the letters you erased**. At the end they see: *"longest pause: 7.4s, right before 'i miss you'"*.

There is no backend and no database. The whole performance (every keystroke and every pause) is compressed into the link itself.

## Run it

```bash
node serve.js          # → http://localhost:3000   (zero dependencies)
node serve.js 8080     # another port
```

`serve.js` also prints a **network address** (e.g. `http://192.168.1.23:3000`). Open Keysong through that address, and the links and QR codes it makes will open on phones on the same Wi-Fi. Windows may ask to allow Node through the firewall the first time.

For links that work anywhere, use the live site above. It's GitHub Pages serving this repo's `main` branch, so every push redeploys it within about a minute. Any static host works too, since there's nothing to build.

Requires a modern browser (Chrome/Edge/Firefox/Safari from 2023 or later). Sound needs one click or tap first, because browsers require it.

## 2-minute demo script

1. **(0:00) The hook.** "We type messages all day. They all look the same, and they lose everything about *how* we wrote them: the hesitation, the deleted sentence, the 10 seconds before 'I'm sorry'."
2. **(0:15) Play the love letter.** Click **💝 Play a love letter**, sound up (it's also in the top bar as **💝 Love letter**). In about 55 seconds it sets off all 11 magic words and all 6 moods: a sunrise with birdsong, rain that turns into a rainbow, ocean waves under shooting stars, snow while a cat strolls through the garden, confetti and fireworks, embers and floating hearts. Near the end the writer types *"i like"*, pauses, erases it, and writes *"love you"*. The finale says *"longest pause: 3.9s, right before 'love you'"*. (For a shorter demo, **▶ Short example** runs about 40 seconds.)
3. **(1:00) Live.** Click **✍️ Write your own** and type for a judge: `hey <name>! thanks for judging. it's raining here but the sunshine is coming`. They'll hear it and watch the sky change.
4. **(1:30) Send.** Click **💌 Send**, enter their name, **Make the link**, and they scan the **QR code** with their phone. Their phone shows an envelope and replays what you just typed, hesitations and all.
5. **(1:50) Close.** "No servers, no accounts. The song lives inside the link."

Tips: **Esc** or **⏭ Skip** jumps to the end of a replay. **▶ Hear it** previews your own message the way the recipient will experience it. Untick *"Include my pauses & erased letters"* to send a clean version.

## How it's built

Plain HTML/CSS/JS, no build step, no frameworks.

| File | What it does |
|---|---|
| `js/moods.js` | the 6 moods (sky colours, musical key, instrument, flower), the word lists, and the magic-word table |
| `js/audio.js` | a small Web Audio synth: FM bells, e-piano, kalimba, plucks, pads, bass, reverb and echo, plus sound effects (rain, meows, birdsong, party horn) built from oscillators and noise |
| `js/scene.js` | one full-screen canvas: the sky gradient, stars, hills, the garden (7 plant types), particles and the 11 magic-word effects |
| `js/share.js` | compresses the keystroke log into the URL (`CompressionStream` → base64url) and validates incoming links |
| `js/app.js` | the typewriter (a hidden textarea, so phones and IMEs work), the keystroke recorder, the replay engine, the envelope, the share card and the finale stats |
| `serve.js` | a zero-dependency static file server |

The QR code uses `qrcode-generator` from jsDelivr. If you're offline it's skipped and everything else still works.
