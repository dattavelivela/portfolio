/* The closing suitcase: a ribbed aluminium cabin case, handle up, with the
   work collected on it as travel stickers.

   Everything is built here rather than loaded: the case is a handful of
   rounded boxes, tubes and one ribbed panel, and every sticker is drawn on a
   canvas from the site's own words and colours. Nothing to download beyond
   three.js itself, and every claim on a sticker is one the page already makes.

   Units are centimetres: a 40 x 56 x 24 cm cabin case, origin at its centre,
   front face towards +z. */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { drawShippingLabel, recipient } from '../signed/label.js';

const W = 40, H = 56, D = 24;
const FRONT = D / 2;

// the visible frame: from just over the grip down to where the footer crops
// the case, so the stage and the static poster share one composition
const FRAME_TOP = H / 2 + 25.3, FRAME_H = 72, ASPECT = 0.8;

/* ── the ribbed front ───────────────────────────────────────────────
   Eleven raised ribs with rounded shoulders over flat valleys. The same
   profile places the panel, shades its valleys and bends the stickers. */
const PANEL_HALF = W / 2 - 2.6;
const RIBS = 11, PERIOD = (PANEL_HALF * 2) / RIBS, RIB = 0.55;
const PANEL_TOP = H / 2 - 3.6, PANEL_BOTTOM = -H / 2 + 3.6;

function bump(x) {
  if (Math.abs(x) > PANEL_HALF) return 0;
  const u = (((x + PANEL_HALF) / PERIOD) % 1 + 1) % 1;
  const d = Math.abs(u - 0.5), flat = 0.17, shoulder = 0.13;
  if (d < flat) return 1;
  if (d < flat + shoulder) return 0.5 + 0.5 * Math.cos(Math.PI * (d - flat) / shoulder);
  return 0;
}

function ribbedPanel(material) {
  const nx = RIBS * 40, xs = [], pos = [], col = [], idx = [];
  for (let i = 0; i <= nx; i++) xs.push(-PANEL_HALF + (i / nx) * PANEL_HALF * 2);
  for (const y of [PANEL_TOP, PANEL_BOTTOM]) {
    for (const x of xs) {
      const b = bump(x);
      pos.push(x, y, FRONT + RIB * b);
      // occlusion: the valley floor darkens where it meets a shoulder
      const u = (((x + PANEL_HALF) / PERIOD) % 1 + 1) % 1, d = Math.abs(u - 0.5);
      const foot = Math.exp(-(((d - 0.32) / 0.05) ** 2));
      const ao = b > 0.001 ? 0.94 + 0.06 * b : 0.9 - 0.16 * foot;
      col.push(ao, ao, ao);
    }
  }
  const row = nx + 1;
  for (let i = 0; i < nx; i++) idx.push(i, i + row, i + 1, i + 1, i + row, i + row + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, material);
  m.receiveShadow = true;
  return m;
}

/* ── materials ──────────────────────────────────────────────────── */
function brushedMap() {
  // fine vertical grain for the aluminium's roughness
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 2600; i++) {
    const v = 175 + Math.random() * 60 | 0;
    x.fillStyle = `rgba(${v},${v},${v},${0.12 + Math.random() * 0.18})`;
    x.fillRect(Math.random() * 256, Math.random() * 512, 1, 40 + Math.random() * 220);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  return t;
}

function materials() {
  const grain = brushedMap();
  return {
    alu: new THREE.MeshPhysicalMaterial({
      color: 0xe6e8eb, metalness: 1, roughness: 0.3, roughnessMap: grain, vertexColors: true,
    }),
    shell: new THREE.MeshPhysicalMaterial({ color: 0xe0e2e5, metalness: 1, roughness: 0.27, roughnessMap: grain }),
    cap: new THREE.MeshPhysicalMaterial({ color: 0xb4b7bc, metalness: 1, roughness: 0.38 }),
    chrome: new THREE.MeshPhysicalMaterial({ color: 0xeceef1, metalness: 1, roughness: 0.13 }),
    plastic: new THREE.MeshPhysicalMaterial({ color: 0x9b9ea3, metalness: 0.15, roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.6 }),
    plasticDark: new THREE.MeshPhysicalMaterial({ color: 0x7d8086, metalness: 0.15, roughness: 0.55 }),
    rubber: new THREE.MeshPhysicalMaterial({ color: 0x1b1c1f, metalness: 0, roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.4 }),
    screw: new THREE.MeshPhysicalMaterial({ color: 0xa4a7ac, metalness: 1, roughness: 0.25 }),
  };
}

function box(w, h, d, r, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

function tube(points, radius, mat) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, radius, 20, false), mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

function cylinder(r, h, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}

function screw(mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.2, 20), mat);
  m.rotation.x = Math.PI / 2;
  m.position.set(x, y, z);
  return m;
}

/* ── the case ───────────────────────────────────────────────────── */
function suitcase(M) {
  const g = new THREE.Group();

  g.add(box(W, H, D, 2.6, M.shell));
  g.add(ribbedPanel(M.alu));

  // the frame bands closing the ribs at the top and bottom, riveted
  for (const y of [H / 2 - 2.75, -H / 2 + 2.75]) {
    g.add(box(W - 3, 1.5, 1.6, 0.6, M.shell, 0, y, FRONT - 0.15));
    for (let i = 0; i < 13; i++) {
      const x = -W / 2 + 4.4 + i * ((W - 8.8) / 12);
      if (y > 0 && Math.abs(x) < 9) continue; // under the handle housing
      g.add(screw(M.screw, x, y, FRONT + 0.66));
    }
  }

  // corner guards, each with a screw facing out
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    g.add(box(4.6, 4.6, D + 1.5, 1.6, M.cap, sx * (W / 2 - 2.3), sy * (H / 2 - 2.3), 0));
    g.add(screw(M.screw, sx * (W / 2 - 2.9), sy * (H / 2 - 2.9), D / 2 + 0.78));
  }

  // telescopic handle housing on the upper front
  const hy = H / 2 - 5.6;
  g.add(box(16, 8.4, 1.9, 0.9, M.plastic, 0, hy, FRONT + 0.25));
  g.add(box(12.4, 4.4, 0.4, 0.3, M.plasticDark, 0, hy + 1, FRONT + 1.1));
  g.add(box(8, 1, 0.4, 0.25, M.plasticDark, 0, hy - 2.8, FRONT + 1.15));

  // two-stage chrome tubes and the grip
  const tz = FRONT + 0.3, base = H / 2 - 2;
  for (const sx of [-1, 1]) {
    const x = sx * 5.8;
    g.add(cylinder(0.95, 12, M.chrome, x, base + 6, tz));
    g.add(cylinder(1.1, 0.7, M.plastic, x, base + 12, tz));
    g.add(cylinder(0.8, 10.5, M.chrome, x, base + 17.2, tz));
    g.add(box(2.7, 3.6, 2.6, 0.7, M.plastic, x, base + 22.2, tz));
  }
  g.add(box(16, 3.2, 3, 1.2, M.plastic, 0, base + 24.6, tz));
  g.add(box(4, 0.5, 0.6, 0.2, M.plasticDark, 0, base + 26.2, tz));

  // the carry handle, standing on the top behind the tubes
  g.add(tube([[-7.6, H / 2 - 0.4, 1.5], [-6.6, H / 2 + 2.6, 1.5], [0, H / 2 + 3.4, 1.5], [6.6, H / 2 + 2.6, 1.5], [7.6, H / 2 - 0.4, 1.5]], 0.8, M.rubber));
  for (const sx of [-1, 1]) g.add(box(2.6, 1, 3.2, 0.4, M.chrome, sx * 7.6, H / 2 + 0.1, 1.5));

  // lock blocks on the right side
  g.add(box(1, 6, 4.2, 0.4, M.cap, W / 2 + 0.25, 5, 0));
  g.add(box(1, 4, 3, 0.4, M.cap, W / 2 + 0.25, -14, 0));

  return g;
}

/* ── stickers ───────────────────────────────────────────────────────
   Each is a canvas at 48 px per cm. The mesh is bent over the ribs: the
   paper rides the crests and sags a little into each valley. */
const PX = 48;
const INK = '#20253f', NAVY = '#22386b', CREAM = '#f4eedf';
const RINSO_BLUE = '#2c7cf6', SLOSH_ORANGE = '#ff8a3d', AIR_RED = '#c94a3f';
const SANS = '"Instrument Sans", system-ui, sans-serif';
const MONO = '"Space Mono", ui-monospace, monospace';
const SERIF = 'Georgia, "Times New Roman", serif';

function sheet(wcm, hcm) {
  const c = document.createElement('canvas');
  c.width = Math.round(wcm * PX); c.height = Math.round(hcm * PX);
  return [c, c.getContext('2d'), c.width, c.height];
}

function rr(x, X, Y, w, h, r) {
  x.beginPath(); x.roundRect(X, Y, w, h, r);
}

function grain(x, w, h, amount = 0.05) {
  // paper tooth and a little wear towards the edges
  for (let i = 0; i < (w * h) / 60; i++) {
    x.fillStyle = Math.random() < 0.5 ? `rgba(80,60,30,${amount})` : `rgba(255,255,255,${amount * 1.2})`;
    x.fillRect(Math.random() * w, Math.random() * h, 1.6, 1.6);
  }
  const v = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(120,95,50,0)');
  v.addColorStop(1, 'rgba(120,95,50,0.14)');
  x.fillStyle = v; x.fillRect(0, 0, w, h);
}

function wear(x, w, h, seed, chips = true) {
  let r = seed * 7919;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  // sun-faded ink
  x.save(); x.globalCompositeOperation = 'source-atop';
  x.fillStyle = 'rgba(250,244,228,.12)'; x.fillRect(0, 0, w, h);
  // grime gathered at the edges
  const e = x.createLinearGradient(0, 0, w, h);
  e.addColorStop(0, 'rgba(110,90,55,.10)'); e.addColorStop(0.5, 'rgba(110,90,55,0)'); e.addColorStop(1, 'rgba(90,75,45,.14)');
  x.fillStyle = e; x.fillRect(0, 0, w, h);
  x.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    // scuffs: short pale strokes where it has rubbed against belts
    const X = rnd() * w, Y = rnd() * h, a = -0.4 + rnd() * 0.8, len = 12 + rnd() * 70;
    x.strokeStyle = `rgba(255,255,255,${0.12 + rnd() * 0.25})`; x.lineWidth = 0.8 + rnd() * 2;
    x.beginPath(); x.moveTo(X, Y); x.lineTo(X + Math.cos(a) * len, Y + Math.sin(a) * len); x.stroke();
  }
  for (let i = 0; i < 10; i++) {
    x.fillStyle = `rgba(80,65,40,${0.04 + rnd() * 0.06})`;
    x.beginPath(); x.ellipse(rnd() * w, rnd() * h, 4 + rnd() * 26, 3 + rnd() * 14, rnd() * 3, 0, 7); x.fill();
  }
  x.restore();
  if (!chips) return;
  // tiny chips out of the edge
  x.save(); x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000';
  for (let i = 0; i < 18; i++) {
    const t = rnd(), side = rnd() * 4 | 0, s = 1.5 + rnd() * 4;
    const X = side < 2 ? t * w : side === 2 ? 0 : w, Y = side < 2 ? (side ? h : 0) : t * h;
    x.beginPath(); x.arc(X, Y, s, 0, 7); x.fill();
  }
  x.restore();
}

function bumpCanvas(w, h, seed, creases) {
  // paper fibre, plus a crease or two from being handled
  const c = document.createElement('canvas');
  c.width = w >> 1; c.height = h >> 1;
  const x = c.getContext('2d'), W2 = c.width, H2 = c.height;
  let r = seed * 104729;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  x.fillStyle = '#808080'; x.fillRect(0, 0, W2, H2);
  const id = x.getImageData(0, 0, W2, H2), d = id.data;
  for (let i = 0; i < d.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 34; d[i] = d[i + 1] = d[i + 2] = v; }
  x.putImageData(id, 0, 0);
  x.lineCap = 'round';
  for (let k = 0; k < creases; k++) {
    const X = rnd() * W2, Y = rnd() * H2, a = rnd() * Math.PI, len = (0.3 + rnd() * 0.5) * Math.max(W2, H2);
    const dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2;
    for (const [col, lw] of [['rgba(255,255,255,.45)', 3], ['rgba(0,0,0,.4)', 1.4]]) {
      x.strokeStyle = col; x.lineWidth = lw;
      x.beginPath(); x.moveTo(X - dx, Y - dy); x.quadraticCurveTo(X + rnd() * 10, Y + rnd() * 10, X + dx, Y + dy); x.stroke();
    }
  }
  return c;
}

function perforate(x, w, h, r = 9, gap = 26) {
  // postage-stamp edge: bite half-circles out of all four sides
  x.save();
  x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000';
  for (let X = gap / 2; X < w; X += gap) for (const Y of [0, h]) { x.beginPath(); x.arc(X, Y, r, 0, 7); x.fill(); }
  for (let Y = gap / 2; Y < h; Y += gap) for (const X of [0, w]) { x.beginPath(); x.arc(X, Y, r, 0, 7); x.fill(); }
  x.restore();
}

function text(x, s, X, Y, font, color, spacing = 0, align = 'left') {
  x.font = font; x.fillStyle = color; x.textAlign = align; x.textBaseline = 'alphabetic';
  x.letterSpacing = spacing + 'px';
  x.fillText(s, X, Y);
  x.letterSpacing = '0px';
}

function barcode(x, X, Y, w, h, color = INK, seed = 7) {
  let r = seed;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  x.fillStyle = color;
  for (let p = X; p < X + w;) {
    const bw = 1.5 + rnd() * 4.5;
    if (rnd() > 0.35) x.fillRect(p, Y, bw, h);
    p += bw + 1.5 + rnd() * 3;
  }
}

function plane(x, X, Y, s, color) {
  // a small airliner glyph, nose to the right
  x.save(); x.translate(X, Y); x.scale(s, s); x.fillStyle = color;
  x.beginPath();
  x.moveTo(-10, -1.2); x.lineTo(8, -1.2); x.quadraticCurveTo(11, 0, 8, 1.2); x.lineTo(-10, 1.2); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(1, -1); x.lineTo(-3, -9); x.lineTo(-5.5, -9); x.lineTo(-2.5, -1); x.fill();
  x.beginPath(); x.moveTo(1, 1); x.lineTo(-3, 9); x.lineTo(-5.5, 9); x.lineTo(-2.5, 1); x.fill();
  x.beginPath(); x.moveTo(-8, -1); x.lineTo(-10.5, -5); x.lineTo(-12, -5); x.lineTo(-10.5, -1); x.fill();
  x.beginPath(); x.moveTo(-8, 1); x.lineTo(-10.5, 5); x.lineTo(-12, 5); x.lineTo(-10.5, 1); x.fill();
  x.restore();
}

function mountains(x, X, Y, s, color, lw = 3) {
  x.save(); x.translate(X, Y); x.scale(s, s);
  x.strokeStyle = color; x.lineWidth = lw / s; x.lineJoin = 'round'; x.lineCap = 'round';
  x.beginPath();
  x.moveTo(-30, 12); x.lineTo(-14, -8); x.lineTo(-6, 2); x.lineTo(6, -16); x.lineTo(30, 12);
  x.moveTo(6, -16); x.lineTo(2, -6); x.lineTo(8, -8); x.lineTo(12, -4);
  x.stroke(); x.restore();
}

function loadImage(src) {
  return new Promise(res => {
    const i = new Image();
    i.onload = () => res(i); i.onerror = () => res(null);
    i.src = src;
  });
}

const drawers = {
  // the same courier label as the parcel that opened the page, same number:
  // what arrived at the top leaves from here
  ship(_, [c, x, w, h]) {
    drawShippingLabel(x, w, h, { rows: [['TO', recipient() || 'YOU'], ['FROM', 'DATTA VELIVELA'], ['VIA', 'DATTAVELIVELA.XYZ']], code: 'DV-0350', seed: 9 });
    return c;
  },

  site(_, [c, x, w, h]) {
    rr(x, 4, 4, w - 8, h - 8, 22); x.fillStyle = '#fbf9f3'; x.fill();
    grain(x, w, h, 0.03);
    text(x, 'dattavelivela.xyz', w / 2, h / 2 + 15, `500 44px ${SANS}`, INK, 0, 'center');
    return c;
  },

  procol(img, [c, x, w, h]) {
    x.fillStyle = '#fbfaf6'; x.fillRect(0, 0, w, h);
    const m = 30, iw = w - 2 * m, ih = h - 2 * m;
    const bg = x.createLinearGradient(0, m, 0, m + ih);
    bg.addColorStop(0, '#dbe7fc'); bg.addColorStop(1, '#a9c5f6');
    x.fillStyle = bg; x.fillRect(m, m, iw, ih);
    if (img.procol) x.drawImage(img.procol, m + 26, m + 30, 52, 48);
    text(x, 'PROCOL AI', m + 92, m + 70, `600 40px ${SANS}`, NAVY, 1);
    // two product windows, one in front of the other
    const win = (X, Y, ww, hh, front) => {
      x.save();
      x.shadowColor = 'rgba(34,56,107,.22)'; x.shadowBlur = 18; x.shadowOffsetY = 6;
      rr(x, X, Y, ww, hh, 14); x.fillStyle = front ? '#ffffff' : '#eef3fd'; x.fill();
      x.restore();
      x.fillStyle = '#c9d6ef'; x.fillRect(X, Y + 30, ww, 2);
      for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(X + 20 + i * 18, Y + 16, 5, 0, 7); x.fillStyle = '#b5c5e6'; x.fill(); }
      if (!front) return;
      for (let i = 0; i < 3; i++) {
        rr(x, X + 22, Y + 52 + i * 38, 34, 20, 5); x.fillStyle = i === 0 ? '#4d82f0' : '#9ab8f2'; x.fill();
        rr(x, X + 70, Y + 55 + i * 38, ww - 100 - i * 30, 14, 7); x.fillStyle = '#d7e1f4'; x.fill();
      }
    };
    win(m + 40, m + 112, 280, 190, false);
    win(m + 92, m + 160, 300, 200, true);
    // the AI sparkle
    x.save(); x.translate(m + iw - 70, m + 130); x.fillStyle = NAVY;
    x.beginPath(); x.moveTo(0, -34);
    x.quadraticCurveTo(4, -4, 34, 0); x.quadraticCurveTo(4, 4, 0, 34);
    x.quadraticCurveTo(-4, 4, -34, 0); x.quadraticCurveTo(-4, -4, 0, -34);
    x.fill(); x.restore();
    text(x, 'SOURCE TO PAY', w / 2, m + ih - 30, `700 26px ${MONO}`, NAVY, 3, 'center');
    grain(x, w, h, 0.03);
    perforate(x, w, h, 14, 36);
    return c;
  },

  pass(_, [c, x, w, h]) {
    rr(x, 0, 0, w, h, 16); x.fillStyle = CREAM; x.fill();
    x.save(); x.clip();
    x.fillStyle = NAVY; x.fillRect(0, 0, w, 78);
    x.restore();
    text(x, 'BOARDING PASS', 34, 50, `700 26px ${MONO}`, '#e9eefb', 4);
    plane(x, w - 64, 39, 2.2, '#e9eefb');
    const stub = w - 196;
    x.setLineDash([8, 9]); x.strokeStyle = 'rgba(32,37,63,.35)'; x.lineWidth = 2.5;
    x.beginPath(); x.moveTo(stub, 92); x.lineTo(stub, h - 16); x.stroke(); x.setLineDash([]);
    text(x, 'PASSENGER', 36, 130, `400 22px ${MONO}`, 'rgba(32,37,63,.6)', 2);
    text(x, 'DATTA', 36, 182, `700 54px ${SANS}`, INK, 2);
    text(x, 'DESTINATION', 36, 236, `400 22px ${MONO}`, 'rgba(32,37,63,.6)', 2);
    text(x, 'BUILD SOMETHING', 36, 290, `700 48px ${SANS}`, INK, 1);
    barcode(x, 36, h - 104, stub - 90, 66, INK, 11);
    text(x, 'SEAT', stub + 30, 130, `400 22px ${MONO}`, 'rgba(32,37,63,.6)', 2);
    text(x, '01A', stub + 30, 176, `700 42px ${SANS}`, INK, 1);
    text(x, 'GATE', stub + 30, 230, `400 22px ${MONO}`, 'rgba(32,37,63,.6)', 2);
    text(x, 'OPEN', stub + 30, 274, `700 36px ${SANS}`, INK, 1);
    barcode(x, stub + 30, h - 104, 140, 66, INK, 5);
    grain(x, w, h, 0.04);
    // the tear notches either side of the stub
    x.save(); x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000';
    for (const Y of [0, h]) { x.beginPath(); x.arc(stub, Y, 16, 0, 7); x.fill(); }
    x.restore();
    return c;
  },

  dbs(_, [c, x, w, h]) {
    rr(x, 0, 0, w, h, 30); x.fillStyle = '#f7f3e8'; x.fill();
    ['DESIGN', 'BUILD', 'SELL'].forEach((s, i) => text(x, s, 38, 86 + i * 58, `700 52px ${SANS}`, INK, 1));
    ['#c9d9f2', '#3c64b4', '#6e9a62', '#e7c35a'].forEach((col, i) => {
      rr(x, 40 + i * 64, 238, 48, 48, 9); x.fillStyle = col; x.fill();
    });
    // a cursor clicking the green chip
    x.save(); x.translate(232, 266); x.rotate(-0.2);
    x.beginPath(); x.moveTo(0, 0); x.lineTo(0, 58); x.lineTo(14, 44); x.lineTo(24, 66); x.lineTo(33, 62); x.lineTo(23, 40); x.lineTo(42, 40); x.closePath();
    x.fillStyle = INK; x.fill(); x.lineWidth = 4; x.strokeStyle = '#fff'; x.stroke(); x.restore();
    x.strokeStyle = INK; x.lineWidth = 4;
    x.beginPath(); x.moveTo(40, h - 40); x.lineTo(68, h - 40); x.moveTo(54, h - 54); x.lineTo(54, h - 26); x.stroke();
    grain(x, w, h, 0.035);
    return c;
  },

  rinso(img, [c, x, w, h]) {
    x.fillStyle = '#f6efdc'; x.fillRect(0, 0, w, h);
    // airmail border in Rinso blue and post-office red
    const b = 26;
    x.save();
    x.beginPath(); x.rect(0, 0, w, h); x.rect(b, b, w - 2 * b, h - 2 * b); x.clip('evenodd');
    for (let i = -h; i < w + h; i += 72) {
      for (const [off, col] of [[0, AIR_RED], [36, RINSO_BLUE]]) {
        x.beginPath();
        x.moveTo(i + off, 0); x.lineTo(i + off + 24, 0); x.lineTo(i + off + 24 - h, h); x.lineTo(i + off - h, h); x.closePath();
        x.fillStyle = col; x.fill();
      }
    }
    x.restore();
    text(x, 'Rinso', 64, 150, `700 112px ${SERIF}`, RINSO_BLUE, -1);
    text(x, '2,000 DOORS /', 66, 222, `700 42px ${SANS}`, NAVY, 1);
    text(x, '132 ORDERS', 66, 272, `700 42px ${SANS}`, NAVY, 1);
    // the machine
    rr(x, 66, 316, 116, 136, 14); x.fillStyle = RINSO_BLUE; x.fill();
    x.fillStyle = '#f6efdc'; x.fillRect(80, 330, 88, 12);
    x.beginPath(); x.arc(124, 400, 38, 0, 7); x.fillStyle = '#f6efdc'; x.fill();
    x.beginPath(); x.arc(124, 400, 26, 0, 7); x.fillStyle = '#9cc2fb'; x.fill();
    x.strokeStyle = RINSO_BLUE; x.lineWidth = 4; x.beginPath();
    for (let X = 100; X <= 148; X += 2) x.lineTo(X, 404 + Math.sin(X / 5) * 3); x.stroke();
    // a stamp cut from the Rinso card, and its postmark
    const sx = w - 178, sy = 52;
    x.fillStyle = '#fff'; x.fillRect(sx, sy, 118, 140);
    if (img.rinso) x.drawImage(img.rinso, 150, 40, 220, 212, sx + 10, sy + 10, 98, 120);
    x.strokeStyle = 'rgba(34,56,107,.55)'; x.lineWidth = 3;
    x.beginPath(); x.arc(w - 236, 300, 62, 0, 7); x.stroke();
    x.beginPath(); x.arc(w - 236, 300, 48, 0, 7); x.stroke();
    text(x, 'FIRST', w - 236, 294, `700 22px ${MONO}`, 'rgba(34,56,107,.6)', 2, 'center');
    text(x, 'ORDERS', w - 236, 320, `700 22px ${MONO}`, 'rgba(34,56,107,.6)', 2, 'center');
    for (let k = 0; k < 4; k++) {
      x.beginPath();
      for (let X = w - 300; X < w - 60; X += 4) x.lineTo(X, 420 + k * 18 + Math.sin(X / 16) * 6);
      x.stroke();
    }
    grain(x, w, h, 0.045);
    return c;
  },

  slosh(img, [c, x, w, h]) {
    x.fillStyle = '#fbfaf6'; x.fillRect(0, 0, w, h);
    const m = 28, iw = w - 2 * m, ih = h - 2 * m;
    x.fillStyle = SLOSH_ORANGE; x.fillRect(m, m, iw, ih);
    // Slosh's own grid lines, as on its card
    x.strokeStyle = 'rgba(30,20,10,.55)'; x.lineWidth = 1.5;
    for (const X of [m + 64, m + iw - 64]) { x.beginPath(); x.moveTo(X, m); x.lineTo(X, m + ih); x.stroke(); }
    for (const Y of [m + 64, m + ih - 64]) { x.beginPath(); x.moveTo(m, Y); x.lineTo(m + iw, Y); x.stroke(); }
    for (const X of [m + 64, m + iw - 64]) for (const Y of [m + 64, m + ih - 64]) { x.beginPath(); x.arc(X, Y, 4, 0, 7); x.fillStyle = '#1e140a'; x.fill(); }
    text(x, 'slosh', w / 2, m + 200, `400 112px ${SERIF}`, '#1e140a', -1, 'center');
    if (img.print) {
      x.save(); x.translate(w / 2, m + 330); x.rotate(-0.06);
      x.fillStyle = '#fffaf2'; x.fillRect(-82, -70, 164, 150);
      x.drawImage(img.print, -72, -60, 144, 126);
      x.restore();
    }
    text(x, '700+', w / 2, m + ih - 112, `700 64px ${SANS}`, '#1e140a', 0, 'center');
    text(x, 'AI VISUALS · 11 BRANDS', w / 2, m + ih - 76, `700 22px ${MONO}`, '#1e140a', 2, 'center');
    grain(x, w, h, 0.03);
    perforate(x, w, h, 14, 36);
    return c;
  },

  zero(_, [c, x, w, h]) {
    x.beginPath(); x.ellipse(w / 2, h / 2, w / 2 - 3, h / 2 - 3, 0, 0, 7); x.fillStyle = '#dfe7d8'; x.fill();
    x.strokeStyle = '#4c6a55'; x.lineWidth = 5;
    x.beginPath(); x.ellipse(w / 2, h / 2, w / 2 - 18, h / 2 - 18, 0, 0, 7); x.stroke();
    mountains(x, w / 2, h / 2 - 34, 2.2, '#3f5a48', 5);
    text(x, 'ZERO TO ONE', w / 2, h / 2 + 52, `700 36px ${MONO}`, '#3f5a48', 3, 'center');
    // a small compass star under the words
    x.save(); x.translate(w / 2, h - 46); x.fillStyle = '#3f5a48';
    x.beginPath(); x.moveTo(0, -12); x.lineTo(3, -3); x.lineTo(12, 0); x.lineTo(3, 3); x.lineTo(0, 12); x.lineTo(-3, 3); x.lineTo(-12, 0); x.lineTo(-3, -3); x.closePath(); x.fill();
    x.restore();
    grain(x, w, h, 0.035);
    return c;
  },

  role(_, [c, x, w, h]) {
    x.fillStyle = '#f5f0e3'; x.fillRect(0, 0, w, h);
    // torn short ends
    x.save(); x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000';
    for (const X of [0, w]) {
      x.beginPath(); x.moveTo(X, 0);
      for (let Y = 0; Y <= h; Y += 14) x.lineTo(X + (X ? -1 : 1) * (4 + Math.random() * 9), Y);
      x.lineTo(X, h); x.lineTo(X + (X ? 20 : -20), h); x.lineTo(X + (X ? 20 : -20), 0); x.closePath(); x.fill();
    }
    x.restore();
    mountains(x, 110, h / 2 + 6, 1.9, INK, 4);
    x.fillStyle = INK; x.fillRect(206, 56, 3, h - 112);
    ['· SENIOR', '· PRODUCT DESIGNER', '· AT PROCOL'].forEach((s, i) => text(x, s, 238, 112 + i * 54, `700 32px ${MONO}`, INK, 2));
    grain(x, w, h, 0.045);
    return c;
  },
};

// glossy vinyl rather than paper
const VINYL = new Set(['site', 'dbs', 'zero']);

// where each sticker sits, in cm on the front, and its turn in radians
const LAYOUT = [
  { key: 'ship', w: 9.6, h: 5.8, x: -12.8, y: 18.9, rot: 0.07 },
  { key: 'procol', w: 10.2, h: 11.8, x: -9.4, y: 9.6, rot: 0.06 },
  { key: 'pass', w: 15, h: 9.3, x: 9.9, y: 11.6, rot: 0.08 },
  { key: 'dbs', w: 7.2, h: 7.2, x: 3.6, y: 3.4, rot: -0.05 },
  { key: 'rinso', w: 16.4, h: 10.9, x: -8.2, y: -3.4, rot: -0.015, curl: 0.5 },
  { key: 'slosh', w: 10.2, h: 12.7, x: 11.4, y: -2.2, rot: -0.1 },
  { key: 'role', w: 14.4, h: 6.2, x: 8.4, y: -13.4, rot: -0.09, curl: 0.35 },
  { key: 'zero', w: 9, h: 5.8, x: -10.6, y: -13.8, rot: 0.12 },
];

function stickerShadow(src, blur) {
  // a soft silhouette of the sticker, drawn with the 2D shadow so it works
  // in every browser that has canvas
  const pad = blur * 2, c = document.createElement('canvas');
  c.width = src.width + pad * 2; c.height = src.height + pad * 2;
  const x = c.getContext('2d');
  x.shadowColor = 'rgba(30,25,15,1)'; x.shadowBlur = blur; x.shadowOffsetX = 10000;
  x.drawImage(src, pad - 10000, pad);
  return [c, pad / PX];
}

function bentPlane(w, h, s, lift, curl = 0) {
  // a plane in world space, turned by s.rot and pressed into the ribs; a
  // curl lifts the top-right corner where the glue has given up
  const g = new THREE.PlaneGeometry(w, h, Math.ceil(w * 18), Math.ceil(h * 8));
  const p = g.attributes.position, cos = Math.cos(s.rot), sin = Math.sin(s.rot);
  for (let i = 0; i < p.count; i++) {
    const lx = p.getX(i), ly = p.getY(i);
    const wx = s.x + cos * lx - sin * ly, wy = s.y + sin * lx + cos * ly;
    const cd = Math.max(0, (lx - w / 2) + (ly - h / 2) + 2.6) / 2.6; // 0 → 1 into the corner
    const peel = curl * cd * cd * 0.9;
    p.setXYZ(i, wx, wy, FRONT + RIB * (0.45 + 0.55 * bump(wx)) * (1 - Math.min(cd, 1) * curl * 0.4) + lift + peel);
  }
  g.computeVertexNormals();
  return g;
}

async function stickers(renderer) {
  await Promise.all([
    document.fonts.load(`700 40px ${SANS}`), document.fonts.load(`500 40px ${SANS}`),
    document.fonts.load(`700 20px ${MONO}`), document.fonts.load(`400 20px ${MONO}`),
  ].map(p => p.catch(() => {})));
  const root = new URL('../', import.meta.url);
  const [procol, rinso, print] = await Promise.all(
    ['procol-mark.svg', 'rinso-thumbnail.jpg', 'shelf/print.svg'].map(f => loadImage(new URL(f, root).href)));
  const img = { procol, rinso, print };
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const g = new THREE.Group();

  LAYOUT.forEach((s, i) => {
    const canvas = drawers[s.key](img, sheet(s.w, s.h));
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = aniso;
    const lift = 0.14 + i * 0.02; // later stickers overlap earlier ones
    wear(canvas.getContext('2d'), canvas.width, canvas.height, i + 3, !VINYL.has(s.key));
    tex.needsUpdate = true;

    // a tight contact shadow under a wide soft one
    for (const [blur, op, dx, dy, k] of [[6, 0.38, 0.06, -0.1, 0], [26, 0.22, 0.3, -0.5, 1]]) {
      const [sc, pad] = stickerShadow(canvas, blur);
      const shadow = new THREE.Mesh(
        bentPlane(s.w + pad * 2, s.h + pad * 2, { ...s, x: s.x + dx, y: s.y + dy }, lift - 0.006 + k * 0.001),
        new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, opacity: op, depthWrite: false }));
      shadow.renderOrder = i * 3 + k;
      g.add(shadow);
    }

    const vinyl = VINYL.has(s.key);
    const bmp = new THREE.CanvasTexture(bumpCanvas(canvas.width, canvas.height, i + 1, vinyl ? 0 : 1 + (i % 2)));
    const paper = new THREE.Mesh(bentPlane(s.w, s.h, s, lift, s.curl || 0), new THREE.MeshPhysicalMaterial({
      map: tex, alphaTest: 0.5, metalness: 0, side: THREE.DoubleSide,
      bumpMap: bmp, bumpScale: vinyl ? 0.4 : 1.2,
      roughness: vinyl ? 0.42 : 0.86,
      clearcoat: vinyl ? 1 : 0, clearcoatRoughness: 0.18,
      sheen: vinyl ? 0 : 0.3, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xfff6e6),
    }));
    paper.receiveShadow = true;
    paper.renderOrder = i * 3 + 2;
    g.add(paper);
  });
  return g;
}

/* ── stage ──────────────────────────────────────────────────────── */
export async function mount(stage, { poster = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: poster, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
  scene.environmentIntensity = 1.15;
  pmrem.dispose();

  // one soft key from the upper left, for the handle's shadow on the case
  const key = new THREE.DirectionalLight(0xfff6ea, 1.5);
  key.position.set(-50, 90, 130);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -45, right: 45, top: 65, bottom: -45, near: 50, far: 320 });
  key.shadow.radius = 6; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xfffaf0, 0xc9c2b2, 0.35));

  const rig = new THREE.Group();
  rig.add(suitcase(materials()));
  rig.add(await stickers(renderer));
  scene.add(rig);

  const cy = FRAME_TOP - FRAME_H / 2, fov = 18;
  const dist = FRAME_H / 2 / Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const camera = new THREE.PerspectiveCamera(fov, ASPECT, 10, 1000);
  camera.position.set(0, cy, FRONT + dist);
  camera.lookAt(0, cy, 0);

  const canvas = renderer.domElement;
  canvas.className = 'trip-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  function size(w, h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  if (poster) {
    renderer.setPixelRatio(1);
    size(1600, 2000);
    renderer.render(scene, camera);
    return canvas;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  stage.appendChild(canvas);

  // restrained parallax: a few degrees towards the pointer, easing home
  const target = { x: 0, y: 0 }, now = { x: 0, y: 0 };
  let raf = 0, visible = true;
  function frame() {
    raf = 0;
    now.x += (target.x - now.x) * 0.07;
    now.y += (target.y - now.y) * 0.07;
    rig.rotation.y = now.x * 0.13;
    rig.rotation.x = now.y * 0.05;
    renderer.render(scene, camera);
    if (Math.abs(target.x - now.x) + Math.abs(target.y - now.y) > 0.0005) wake();
  }
  function wake() { if (!raf && visible) raf = requestAnimationFrame(frame); }

  function point(e) {
    const r = stage.getBoundingClientRect();
    target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    wake();
  }
  function home() { target.x = target.y = 0; wake(); }
  stage.addEventListener('pointermove', point);
  stage.addEventListener('pointerleave', home);
  stage.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') home(); });
  stage.addEventListener('pointercancel', home);

  const ro = new ResizeObserver(() => {
    const r = canvas.getBoundingClientRect();
    if (r.width) { size(r.width, r.height); wake(); }
  });
  ro.observe(canvas);
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) wake(); });
  io.observe(stage);

  canvas.addEventListener('webglcontextlost', () => stage.classList.remove('is-3d'));

  // hand over from the poster once the first frame is on screen
  const r = canvas.getBoundingClientRect();
  size(r.width || 800, r.height || 1000);
  renderer.render(scene, camera);
  requestAnimationFrame(() => stage.classList.add('is-3d'));
}
