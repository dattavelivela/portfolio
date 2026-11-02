// dither.js: shared renderer for the Dither variants (v21-v28). Draws a source (image or procedural scene)
// as an ordered Bayer dither of square dots on a grid; dot size follows tone. Also: easers, noise, clock, demo wiring.
export const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, k) => a + (b - a) * k;
export const sstep = (a, b, v) => { v = clamp((v - a) / (b - a)); return v * v * (3 - 2 * v); };

const B8 = [0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,
  3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21].map(v => (v + .5) / 64);
const B4 = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v => (v + .5) / 16);

// cheap integer hash -> 0..1
export function hash(x, y, s = 0) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
// smooth value noise 0..1 and fractal sum
export function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, oct = 4) {
  let s = 0, a = .5, n = 0;
  for (let i = 0; i < oct; i++) { s += a * noise(x, y); n += a; x = x * 2.03 + 17.1; y = y * 2.03 + 9.7; a *= .5; }
  return s / n;
}

// grain tile, made once
let grainTile;
function grain() {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas'); c.width = c.height = 160;
  const g = c.getContext('2d'), im = g.createImageData(160, 160);
  for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0); return (grainTile = c);
}

/* dither(canvas, opts) -> api
   opts.source   HTMLImageElement, or fn(ctx, cols, rows, t, api) that paints the scene, one pixel per cell
   opts.palette  2-4 colours; palette[0] is the background, dots use the rest (ordered by tone)
   opts.cell     cell size in CSS px          opts.resolve  0 = sparse noise, 1 = clean picture
   opts.invert   map dark source pixels to strong dots (for light backgrounds)
   opts.grain    0..1 film grain              opts.bayer    4 or 8
   opts.dotMin / dotMax  dot size (fraction of cell) at tone 0 / 1
   opts.veil     fn(u, v) -> 0..1 coverage; cells fade out in a dithered edge (e.g. to keep a form area clear)
   opts.frame    fn(dt, t, api) called every frame before drawing (update params here)
   api.p is the live options object; api.ease(x, rate) makes an exponential easer stepped for you. */
export function dither(canvas, opts) {
  const p = Object.assign({ palette: ['#000', '#fff'], cell: 8, resolve: 1, invert: false, grain: .06, bayer: 8,
    dotMin: .3, dotMax: .94, noise: .8, sparse: .55, flicker: 10, fps: 30 }, opts);
  const ctx = canvas.getContext('2d');
  const off = document.createElement('canvas'), octx = off.getContext('2d', { willReadFrequently: true });
  const easers = [];
  const PERF = /[?&]perf/.test(location.search); let ms = 0, nDraw = 0;
  let W = 1, H = 1, dpr = 1, t = 0, last = 0, raf = 0, dirty = true, pattern = null;

  const api = {
    p, ctx, reduced: RM, get t() { return t; }, cols: 0, rows: 0, W: 0, H: 0,
    ease(x, rate = 4) {
      const e = { x, t: x, rate, to(v) { e.t = v; if (RM) e.x = v; dirty = true; return e; }, snap() { e.x = e.t; dirty = true; } };
      easers.push(e); return e;
    },
    settle() {
      easers.forEach(e => e.snap()); api.draw();
      if (PERF) { const t0 = performance.now(); for (let i = 0; i < 10; i++) { t += 1 / 30; if (p.frame) p.frame(1 / 30, t, api); draw(); } console.log('dither bench ms/frame', ((performance.now() - t0) / 10).toFixed(1), api.cols + 'x' + api.rows); }
    },
    poke() { dirty = true; },
    draw,
  };

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(1, r.width); H = Math.max(1, r.height); api.W = W; api.H = H;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    dirty = true;
  }

  function cover(img, w, h) {
    const iw = img.naturalWidth, ih = img.naturalHeight; if (!iw) return;
    const s = Math.max(w / iw, h / ih), dw = iw * s, dh = ih * s;
    octx.imageSmoothingEnabled = true; octx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  function draw() {
    const t0 = PERF ? performance.now() : 0;
    const cell = Math.max(2, p.cell);
    const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
    const gx = (W - cols * cell) / 2, gy = (H - rows * cell) / 2;   // centre the grid, split the leftover
    api.cols = cols; api.rows = rows; api.cell = cell;
    if (off.width !== cols || off.height !== rows) { off.width = cols; off.height = rows; }
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.globalAlpha = 1; octx.globalCompositeOperation = 'source-over';
    octx.fillStyle = p.invert ? '#fff' : '#000'; octx.fillRect(0, 0, cols, rows);
    if (typeof p.source === 'function') p.source(octx, cols, rows, t, api);
    else if (p.source) cover(p.source, cols, rows);
    const d = octx.getImageData(0, 0, cols, rows).data;

    const pal = p.palette, N = pal.length, paths = pal.map(() => new Path2D());
    const bm = p.bayer === 4 ? B4 : B8, bs = p.bayer === 4 ? 4 : 8;
    const r = clamp(p.resolve), mixN = (1 - r) * p.noise, keep = lerp(p.sparse, 1, r);
    const seed = RM ? 1 : Math.floor(t * p.flicker);
    const lo = p.dotMin, span = p.dotMax - p.dotMin, veil = p.veil, bgp = new Path2D();
    for (let y = 0, i = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++, i += 4) {
        if (veil) { const a = veil(x / cols, y / rows); if (a <= bm[((x + 3) % bs) + ((y + 5) % bs) * bs]) continue; bgp.rect(Math.round((gx + x * cell) * dpr) / dpr, Math.round((gy + y * cell) * dpr) / dpr, cell + .5 / dpr, cell + .5 / dpr); }
        let v = (.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]) / 255;
        if (p.invert) v = 1 - v;
        if (mixN > 0) v = (v + (hash(x, y, seed) - v) * mixN) * keep;
        if (v <= 0) continue;
        const lv = v * (N - 1); let k = lv | 0;
        if (lv - k > bm[(x % bs) + (y % bs) * bs]) k++;
        if (k <= 0) continue; if (k >= N) k = N - 1;
        const s = Math.max(1 / dpr, Math.round(cell * (lo + span * (v > 1 ? 1 : v)) * dpr) / dpr);
        const o = (cell - s) / 2;
        paths[k].rect(Math.round((gx + x * cell + o) * dpr) / dpr, Math.round((gy + y * cell + o) * dpr) / dpr, s, s);
      }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = pal[0];
    if (veil) ctx.fill(bgp); else ctx.fillRect(0, 0, W, H);
    for (let k = 1; k < N; k++) { ctx.fillStyle = pal[k]; ctx.fill(paths[k]); }
    if (p.grain > 0) {
      pattern = pattern || ctx.createPattern(grain(), 'repeat');
      const ox = RM ? 0 : (hash(seed, 3) * 160) | 0, oy = RM ? 0 : (hash(seed, 7) * 160) | 0;
      ctx.save(); ctx.globalAlpha = p.grain; ctx.globalCompositeOperation = 'overlay';
      ctx.translate(-ox, -oy); ctx.fillStyle = pattern;
      if (veil) { ctx.translate(ox, oy); ctx.clip(bgp); ctx.translate(-ox, -oy); }
      ctx.fillRect(ox, oy, W, H); ctx.restore();
    }
    if (p.after) p.after(ctx, W, H, t, api);
    dirty = false;
    if (PERF) { const dt = performance.now() - t0; ms += dt; nDraw++; if (nDraw % 30 === 0) { console.log('dither avg ms', (ms / 30).toFixed(1), cols + 'x' + rows); ms = 0; } else if (nDraw > 2 && nDraw < 8) console.log('dither ms', dt.toFixed(1), cols + 'x' + rows); }
  }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (now - last < 1000 / p.fps - 4) return;                     // the drift is slow; 30 fps is plenty
    const dt = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now;
    let moving = false;
    for (const e of easers) {
      if (RM) { if (e.x !== e.t) { e.x = e.t; moving = true; } continue; }
      const nx = e.x + (e.t - e.x) * (1 - Math.exp(-e.rate * dt));
      if (Math.abs(nx - e.t) < 1e-4) { if (e.x !== e.t) moving = true; e.x = e.t; } else { e.x = nx; moving = true; }
    }
    if (!RM) t += dt;
    if (p.frame) p.frame(dt, t, api);
    if (!RM || moving || dirty) draw();
  }
  function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  new ResizeObserver(() => { resize(); if (raf) draw(); }).observe(canvas);
  if (p.source instanceof HTMLImageElement && !p.source.complete) p.source.addEventListener('load', () => { dirty = true; draw(); });
  resize(); queueMicrotask(() => { if (p.frame) p.frame(0, 0, api); draw(); start(); });
  return api;
}

// live clock "7:34:12 PM | BENGALURU, IN"
export function clock(el, tz = 'Asia/Kolkata', place = 'BENGALURU, IN') {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  const up = () => { el.textContent = f.format(new Date()) + ' | ' + place; };
  let last = '';
  const loop = () => { const s = f.format(new Date()); if (s !== last) { last = s; el.textContent = s + ' | ' + place; } requestAnimationFrame(loop); };
  up(); requestAnimationFrame(loop);   // rAF, not setInterval: it also pauses with the tab
}
// hours (0..24, fractional) in a time zone
export function hoursIn(tz = 'Asia/Kolkata') {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const g = k => +parts.find(x => x.type === k).value;
  return g('hour') + g('minute') / 60 + g('second') / 3600;
}

// ?demo=N | wrong | right : fills the boxes as if typed, then settles everything for a still screenshot
export function wireDemo(settle) {
  const q = new URLSearchParams(location.search).get('demo');
  if (!q) return null;
  document.documentElement.classList.add('demo');
  setTimeout(() => {
    const bx = [...document.querySelectorAll('#lk .bx')];
    if (q === 'wrong') {
      '654321'.split('').forEach((c, i) => bx[i].value = c);
      document.querySelector('#lk .msg').textContent = 'Not quite. Try again.';
      lk.count = 6; lk.state = 'wrong'; lk.emit('type', 6); lk.emit('wrong'); return;
    }
    const n = q === 'right' ? 6 : clamp(+q || 0, 0, 5);
    for (let i = 0; i < n; i++) bx[i].value = '123456'[i];
    if (n) bx[n - 1].dispatchEvent(new Event('input'));
  }, 400);
  setTimeout(() => settle && settle(), 1100);
  return q;
}

// shade(fn): a source that sets every cell from fn(x, y, cols, rows, t, api) -> tone 0..1.
// fn may also read api.under (the grey value already painted by an optional `paint(ctx, w, h, t, api)` step), 0..1.
export function shade(fn, paint) {
  let im = null;
  return (ctx, w, h, t, api) => {
    let src = null;
    if (paint) { paint(ctx, w, h, t, api); src = ctx.getImageData(0, 0, w, h).data; }
    if (!im || im.width !== w || im.height !== h) im = ctx.createImageData(w, h);
    const d = im.data;
    for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i += 4) {
      api.under = src ? src[i + 1] / 255 : 0;
      const v = Math.round(clamp(fn(x, y, w, h, t, api)) * 255);
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    ctx.putImageData(im, 0, 0);
  };
}

// mask(paint, W, H): paint(ctx, W, H) once onto an offscreen canvas (white = on), then sample it with .at(u, v) in 0..1.
// Keeps text and shapes independent of the cell size, so easing the grid never re-rasterises them.
export function mask(paint, W = 640, H = 640) {
  W = Math.max(1, Math.round(W)); H = Math.max(1, Math.round(H));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; paint(g, W, H);
  const d = g.getImageData(0, 0, W, H).data, m = new Float32Array(W * H);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] / 255;
  return { W, H, at(u, v) { const x = (u * W) | 0, y = (v * H) | 0; return x < 0 || y < 0 || x >= W || y >= H ? 0 : m[y * W + x]; } };
}
