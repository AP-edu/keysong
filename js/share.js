/* Keysong · share.js
   The whole song (every keystroke and every pause) is compressed into the link itself.
   No server, no database: whoever holds the link holds the message. */
'use strict';

const Share = (() => {
  function b64u(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function unb64u(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }

  const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

  async function encode(payload) {
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    if (window.CompressionStream) {
      try { return 'z' + b64u(await pipe(bytes, new CompressionStream('deflate'))); } catch (e) { /* fall through */ }
    }
    return 'j' + b64u(bytes);
  }

  async function decode(code) {
    let bytes = unb64u(code.slice(1));
    if (code[0] === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate'));
    return validate(JSON.parse(new TextDecoder().decode(bytes)));
  }

  // Links come from strangers: keep only well-formed events and short names.
  function validate(p) {
    if (!p || p.v !== 1 || !Array.isArray(p.e)) throw new Error('not a Keysong');
    const e = p.e.slice(0, 5000)
      .filter((x) => Array.isArray(x) && Number.isFinite(x[0]) && (x[1] === 0 || (typeof x[1] === 'string' && x[1].length > 0 && x[1].length <= 16)))
      .map(([d, c]) => [Math.max(0, Math.min(6000, Math.round(d))), c]);
    if (!e.length) throw new Error('empty Keysong');
    return { to: String(p.to || '').slice(0, 40), from: String(p.from || '').slice(0, 40), m: p.m ? 1 : 0, e };
  }

  function qr(url, el) {
    el.innerHTML = '';
    if (!window.qrcode) return false;
    try {
      const q = window.qrcode(0, 'L');
      q.addData(url); q.make();
      const img = new Image();
      img.alt = 'QR code for this Keysong';
      img.src = q.createDataURL(4, 4);
      el.appendChild(img);
      return true;
    } catch (e) { return false; }
  }

  return { encode, decode, qr };
})();
