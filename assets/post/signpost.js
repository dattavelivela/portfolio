/* The signpost: the site's spine.

   One chrome pole with die-cut enamel signs on arms, each sign a place on
   the page (or off it). The pole turns so the sign for the section you are
   reading faces you; a sign swings on its arm when the pole turns under it,
   when you hover it and when you click it, and a click takes you there.

   Every sign is drawn on a canvas, its outline traced from the drawing and
   extruded: a chrome body with a bevelled rim, the enamel face on top. The
   swing is a damped spring per arm on a fixed 120 Hz step, driven by the
   pole's own turning, so the signs lag and settle like hung metal. */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const PINK = '#f7a6c3', PINK2 = '#ffc9dc', RED = '#e8302c', DEEP = '#7c0f1e', WHITE = '#fff4f7';
const HEAVY = '"Anton", "Arial Narrow", Impact, sans-serif';

/* ── drawing helpers ────────────────────────────────────────────── */
function sheet(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.lineJoin = 'round'; x.lineCap = 'round';
  return [c, x];
}
// heavy lettering with a dark keyline and a drop, the enamel look
function letters(x, s, X, Y, size, fill, { keyline = DEEP, drop = RED, kw = 0.1, skew = 0, align = 'center' } = {}) {
  x.save(); x.translate(X, Y); if (skew) x.transform(1, 0, skew, 1, 0, 0);
  x.font = `${size}px ${HEAVY}`; x.textAlign = align; x.textBaseline = 'middle';
  if (drop) { x.fillStyle = drop; x.fillText(s, size * 0.04, size * 0.07); }
  x.lineWidth = size * kw; x.strokeStyle = keyline; x.strokeText(s, 0, 0);
  x.fillStyle = fill; x.fillText(s, 0, 0);
  x.restore();
}
function star(x, X, Y, r, fill) {
  x.save(); x.translate(X, Y); x.beginPath(); x.moveTo(0, -r);
  x.quadraticCurveTo(r * 0.14, -r * 0.14, r, 0); x.quadraticCurveTo(r * 0.14, r * 0.14, 0, r);
  x.quadraticCurveTo(-r * 0.14, r * 0.14, -r, 0); x.quadraticCurveTo(-r * 0.14, -r * 0.14, 0, -r);
  x.fillStyle = fill; x.fill(); x.lineWidth = r * 0.16; x.strokeStyle = DEEP; x.stroke(); x.restore();
}
function badge(x, path, fill, keyline = DEEP, lw = 12) {
  x.beginPath(); path(); x.fillStyle = fill; x.fill(); x.lineWidth = lw; x.strokeStyle = keyline; x.stroke();
}
function figure(x, X, Y, s, flip) {
  // a worker at a laptop: head, bent body, the screen
  x.save(); x.translate(X, Y); x.scale(flip ? -s : s, s); x.fillStyle = RED; x.strokeStyle = DEEP; x.lineWidth = 3;
  x.beginPath(); x.arc(0, -46, 11, 0, 7); x.fill(); x.stroke();
  x.beginPath(); x.moveTo(-10, -30); x.lineTo(12, -30); x.lineTo(20, 4); x.lineTo(30, 36); x.lineTo(18, 40); x.lineTo(6, 10); x.lineTo(-4, 40); x.lineTo(-16, 36); x.lineTo(-8, 2); x.closePath(); x.fill(); x.stroke();
  x.beginPath(); x.moveTo(12, -24); x.lineTo(40, -6); x.lineTo(36, 0); x.lineTo(10, -14); x.closePath(); x.fill(); x.stroke();
  x.beginPath(); x.roundRect(30, -26, 26, 18, 3); x.fillStyle = PINK2; x.fill(); x.stroke();
  x.restore();
}

/* each sign: its drawing, its size in cm, where it hangs */
const SIGNS = [
  {
    key: 'hello', href: '#about', label: 'About', w: 79, y: 262, side: 1, rest: 0.46, arm: 10,
    draw() {
      const [c, x] = sheet(1000, 640);
      badge(x, () => { x.moveTo(120, 330); x.lineTo(880, 330); x.lineTo(800, 560); x.lineTo(200, 560); x.closePath(); }, RED);
      letters(x, 'HELLO', 500, 300, 330, PINK, { drop: DEEP, kw: 0.06 });
      x.save(); x.globalAlpha = 0.85; x.translate(500, 470); x.scale(1, -0.55); letters(x, 'HELLO', 0, 0, 300, '#ff6f73', { drop: null, keyline: DEEP, kw: 0.05 }); x.restore();
      star(x, 905, 120, 78, RED); star(x, 120, 470, 52, RED);
      return c;
    },
  },
  {
    key: 'visual', href: '#visual', label: 'Visual work', w: 66, y: 226, side: -1, rest: -0.41, arm: 12, ball: true,
    draw() {
      const [c, x] = sheet(900, 900);
      // the splash the ball lands in
      badge(x, () => {
        const n = 13; for (let i = 0; i <= n * 2; i++) {
          const a = Math.PI * 0.15 + (i / (n * 2)) * Math.PI * 1.7, r = i % 2 ? 250 : 420 + (i % 4 === 0 ? 30 : 0);
          const px = 450 + Math.cos(a) * r, py = 470 + Math.sin(a) * r;
          i ? x.lineTo(px, py) : x.moveTo(px, py);
        }
        x.closePath();
      }, PINK);
      x.beginPath(); x.arc(450, 380, 300, 0, 7); x.fillStyle = DEEP; x.fill();
      return c;
    },
  },
  {
    key: 'work', href: '#work', label: 'Work', w: 59, y: 190, side: 1, rest: -0.29, arm: 10,
    draw(img) {
      const [c, x] = sheet(800, 920);
      badge(x, () => x.roundRect(40, 40, 720, 840, 170), PINK2, RED, 30);
      // two hands holding up a block: the work
      const hand = flip => {
        x.save(); if (flip) { x.translate(800, 0); x.scale(-1, 1); }
        x.beginPath(); x.moveTo(170, 840); x.lineTo(150, 520); x.quadraticCurveTo(140, 420, 210, 400); x.lineTo(250, 560); x.lineTo(380, 690); x.lineTo(400, 840); x.closePath();
        x.fillStyle = RED; x.fill(); x.lineWidth = 22; x.strokeStyle = DEEP; x.stroke(); x.restore();
      };
      hand(false); hand(true);
      badge(x, () => { for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const px = 400 + Math.cos(a) * 190, py = 380 + Math.sin(a) * 190; i ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); }, PINK, RED, 26);
      if (img.procol) x.drawImage(img.procol, 320, 290, 160, 150);
      letters(x, 'WORK', 400, 500, 92, RED, { drop: null, keyline: PINK2, kw: 0.08 });
      return c;
    },
  },
  {
    key: 'slosh', href: 'https://www.slosh.agency/', label: 'Slosh: 700+ AI visuals for 11 brands', w: 46, y: 158, side: -1, rest: 0.52, arm: 8,
    draw() {
      const [c, x] = sheet(700, 640);
      badge(x, () => x.roundRect(40, 140, 620, 430, 70), PINK, DEEP, 22);
      badge(x, () => x.roundRect(110, 70, 170, 110, 26), PINK, DEEP, 22);
      x.beginPath(); x.arc(350, 355, 150, 0, 7); x.fillStyle = RED; x.fill(); x.lineWidth = 22; x.strokeStyle = DEEP; x.stroke();
      x.beginPath(); x.arc(350, 355, 80, 0, 7); x.fillStyle = DEEP; x.fill();
      x.beginPath(); x.arc(318, 322, 22, 0, 7); x.fillStyle = PINK2; x.fill();
      letters(x, '700+', 560, 220, 80, RED, { drop: null, kw: 0.06 });
      return c;
    },
  },
  {
    key: 'people', href: '#people', label: 'What people say', w: 63, y: 126, side: 1, rest: 0.61, arm: 10,
    draw() {
      const [c, x] = sheet(1000, 700);
      badge(x, () => { x.roundRect(40, 40, 920, 470, 120); x.moveTo(250, 500); x.lineTo(200, 660); x.lineTo(420, 505); }, RED, DEEP, 24);
      letters(x, 'WHAT', 500, 150, 150, PINK, { drop: DEEP, kw: 0.07 });
      letters(x, 'PEOPLE SAY', 500, 340, 190, PINK, { drop: DEEP, kw: 0.06 });
      return c;
    },
  },
  {
    key: 'pushed', href: '#pushed', label: 'What I pushed', w: 97, y: 92, side: 1, rest: -0.17, arm: 6,
    draw() {
      const [c, x] = sheet(1300, 560);
      badge(x, () => x.roundRect(40, 60, 1220, 440, 90), PINK, '#d8d8de', 34);
      figure(x, 175, 320, 2.6, false); figure(x, 1125, 320, 2.6, true);
      letters(x, 'DESIGN BUILD', 650, 205, 190, RED, { drop: null, keyline: DEEP, kw: 0.045, skew: -0.08 });
      letters(x, '& SELL', 650, 385, 190, RED, { drop: null, keyline: DEEP, kw: 0.045, skew: -0.08 });
      return c;
    },
  },
  {
    key: 'rinso', href: 'https://www.rinsoindia.com/', label: 'Rinso: 2,000 doors for the first 132 orders', w: 66, y: 58, side: -1, rest: -0.43, arm: 10,
    draw() {
      const [c, x] = sheet(900, 820);
      badge(x, () => { x.moveTo(450, 40); x.lineTo(820, 330); x.lineTo(740, 330); x.lineTo(740, 560); x.lineTo(160, 560); x.lineTo(160, 330); x.lineTo(80, 330); x.closePath(); x.moveTo(600, 140); }, RED, DEEP, 22);
      badge(x, () => x.roundRect(600, 100, 70, 130, 8), RED, DEEP, 18);
      letters(x, '2,000', 450, 520, 300, PINK, { drop: DEEP, kw: 0.06 });
      letters(x, 'DOORS', 450, 715, 230, PINK, { drop: DEEP, kw: 0.06 });
      return c;
    },
  },
  {
    key: 'talk', href: '#contact', label: "Let's talk", w: 62, y: 24, side: 1, rest: 0.32, arm: 10,
    draw() {
      const [c, x] = sheet(900, 640);
      badge(x, () => x.roundRect(50, 60, 800, 520, 50), PINK2, DEEP, 22);
      x.beginPath(); x.moveTo(70, 90); x.lineTo(450, 360); x.lineTo(830, 90); x.lineWidth = 22; x.strokeStyle = DEEP; x.stroke();
      letters(x, "LET'S", 450, 410, 190, RED, { drop: DEEP, kw: 0.06, skew: -0.06 });
      letters(x, 'TALK', 450, 545, 170, RED, { drop: DEEP, kw: 0.06, skew: -0.06 });
      return c;
    },
  },
];

/* ── outline: trace the drawing's silhouette, grown by a border ─── */
function silhouette(canvas, grow) {
  const g = 6, w = canvas.width, h = canvas.height;
  const gw = Math.ceil(w / g) + 2 * grow + 2, gh = Math.ceil(h / g) + 2 * grow + 2, off = grow + 1;
  const a = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const base = new Uint8Array(gw * gh);
  for (let j = 0; j < Math.ceil(h / g); j++) for (let i = 0; i < Math.ceil(w / g); i++) {
    const px = Math.min(w - 1, i * g + g / 2 | 0), py = Math.min(h - 1, j * g + g / 2 | 0);
    if (a[(py * w + px) * 4 + 3] > 40) base[(j + off) * gw + i + off] = 1;
  }
  const m = new Uint8Array(gw * gh), r2 = grow * grow;
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    if (!base[j * gw + i]) continue;
    for (let dj = -grow; dj <= grow; dj++) for (let di = -grow; di <= grow; di++)
      if (di * di + dj * dj <= r2) { const y = j + dj, x = i + di; if (x >= 0 && y >= 0 && x < gw && y < gh) m[y * gw + x] = 1; }
  }
  // fill enclosed gaps so only the outer edge is traced
  const seen = new Uint8Array(gw * gh), stack = [0];
  while (stack.length) {
    const k = stack.pop(); if (seen[k] || m[k]) continue; seen[k] = 1;
    const x = k % gw, y = k / gw | 0;
    if (x > 0) stack.push(k - 1); if (x < gw - 1) stack.push(k + 1); if (y > 0) stack.push(k - gw); if (y < gh - 1) stack.push(k + gw);
  }
  const filled = (x, y) => x >= 0 && y >= 0 && x < gw && y < gh && !seen[y * gw + x];
  // Moore neighbour trace round the outside
  let sx = -1, sy = -1;
  for (let k = 0; k < gw * gh && sx < 0; k++) if (filled(k % gw, k / gw | 0)) { sx = k % gw; sy = k / gw | 0; }
  const dx = [1, 1, 0, -1, -1, -1, 0, 1], dy = [0, 1, 1, 1, 0, -1, -1, -1];
  const pts = []; let cx = sx, cy = sy, dir = 7;
  do {
    pts.push([cx, cy]);
    let moved = false;
    for (let k = 0; k < 8; k++) {
      const d = (dir + 6 + k) % 8;
      if (filled(cx + dx[d], cy + dy[d])) { cx += dx[d]; cy += dy[d]; dir = d; moved = true; break; }
    }
    if (!moved) break;
  } while (!(cx === sx && cy === sy) && pts.length < 40000);
  // simplify, then round the corners off
  const keep = rdp(pts, 0.9);
  let ring = keep.map(([x, y]) => [(x - off + 0.5) * g, (y - off + 0.5) * g]);
  for (let it = 0; it < 2; it++) {
    const n = []; for (let i = 0; i < ring.length; i++) {
      const p = ring[i], q = ring[(i + 1) % ring.length];
      n.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]);
    }
    ring = n;
  }
  return ring;
}
function rdp(p, e) {
  if (p.length < 3) return p;
  const [ax, ay] = p[0], [bx, by] = p[p.length - 1];
  let md = 0, mi = 0;
  const L = Math.hypot(bx - ax, by - ay) || 1;
  for (let i = 1; i < p.length - 1; i++) {
    const d = Math.abs((by - ay) * p[i][0] - (bx - ax) * p[i][1] + bx * ay - by * ax) / L;
    if (d > md) { md = d; mi = i; }
  }
  if (md <= e) return [p[0], p[p.length - 1]];
  return rdp(p.slice(0, mi + 1), e).slice(0, -1).concat(rdp(p.slice(mi), e));
}

/* ── the scene ──────────────────────────────────────────────────── */
export async function mount(stage, { poster = false, onSelect } = {}) {
  await Promise.all(['400 100px "Anton"'].map(f => document.fonts.load(f).catch(() => {})));
  const procol = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = new URL('../procol-mark.svg', import.meta.url).href; });
  const img = { procol };

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: poster });
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  scene.environmentIntensity = 1.25;
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xfff0f2, 1.7); key.position.set(-120, 260, 300); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff8aa0, 1.1); rim.position.set(260, 120, -200); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xffe8ee, 0x3a0d14, 0.35));

  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xe6e7ea, metalness: 1, roughness: 0.16 });
  const chromeSoft = new THREE.MeshPhysicalMaterial({ color: 0xd6d8dc, metalness: 1, roughness: 0.32 });
  const post = new THREE.Group(); scene.add(post);

  // the pole: a tall chrome tube with collars and a capped top
  const H = 300;
  const lathe = (pts, mat) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 48), mat);
  post.add(lathe([[3.4, -60], [3.4, H], [3.9, H], [3.9, H + 4], [2.6, H + 7], [2.2, H + 12], [3.2, H + 15], [0.01, H + 22]], chrome));
  for (let y = 40; y < H; y += 78) post.add(lathe([[3.4, y], [4.1, y + 0.5], [4.1, y + 3.5], [3.4, y + 4]], chromeSoft));

  const aniso = renderer.capabilities.getMaxAnisotropy();
  const arms = [];
  for (const s of SIGNS) {
    const art = s.draw(img);
    const scale = s.w / art.width, h = art.height * scale;
    const toShape = ring => new THREE.Shape(ring.map(([px, py]) => new THREE.Vector2((px - art.width / 2) * scale, -(py - art.height / 2) * scale)));
    const outer = toShape(silhouette(art, 4)), face = toShape(silhouette(art, 2));
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: 1.4, bevelEnabled: true, bevelThickness: 0.7, bevelSize: 0.9, bevelSegments: 4, curveSegments: 4 }), chrome);
    body.position.z = -0.7;
    const tex = new THREE.CanvasTexture(art); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = aniso;
    const fg = new THREE.ShapeGeometry(face, 4), uv = fg.attributes.uv, pos = fg.attributes.position;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / s.w + 0.5, pos.getY(i) / h + 0.5);
    const enamel = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.2 });
    const front = new THREE.Mesh(fg, enamel); front.position.z = 1.45;
    const back = new THREE.Mesh(fg, new THREE.MeshPhysicalMaterial({ color: PINK, roughness: 0.4, clearcoat: 0.6 })); back.rotation.y = Math.PI; back.position.z = -1.45;
    const sign = new THREE.Group(); sign.add(body, front, back);
    if (s.ball) {
      // a real glossy ball sits in the splash, Dribbble's seams on it
      const bc = document.createElement('canvas'); bc.width = 1024; bc.height = 512;
      const bx = bc.getContext('2d'); bx.fillStyle = '#d62a4a'; bx.fillRect(0, 0, 1024, 512);
      bx.strokeStyle = PINK2; bx.lineWidth = 14;
      for (const f of [t => 256 + Math.sin(t * Math.PI * 2) * 150, t => 120 + Math.sin(t * Math.PI * 2 + 1) * 60, t => 400 + Math.sin(t * Math.PI * 2 - 1) * 60]) {
        bx.beginPath(); for (let i = 0; i <= 64; i++) bx.lineTo(i * 16, f(i / 64)); bx.stroke();
      }
      bx.beginPath(); bx.moveTo(512, 0); bx.lineTo(512, 512); bx.stroke();
      const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(s.w * 0.3, 64, 32), new THREE.MeshPhysicalMaterial({ map: bt, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 }));
      ball.position.set(0, h * 0.078, s.w * 0.12); ball.rotation.set(0.3, -0.6, 0.2);
      sign.add(ball);
    }
    // the arm: a clamp on the pole and a rod out to the sign's edge
    const assembly = new THREE.Group(); assembly.position.y = s.y; post.add(assembly);
    const reach = s.arm + s.w / 2;
    sign.position.set(s.side * reach, 0, 0);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, s.arm + 4, 20), chromeSoft);
    rod.rotation.z = Math.PI / 2; rod.position.x = s.side * (s.arm + 4) / 2;
    const clamp = lathe([[3.5, -4], [4.6, -3.4], [4.6, 3.4], [3.5, 4]], chromeSoft);
    assembly.add(rod, clamp, sign);
    sign.traverse(o => { o.userData.key = s.key; });
    arms.push({ s, assembly, sign, a: 0, w: 0 });
  }

  const camera = new THREE.PerspectiveCamera(26, 1, 10, 3000);
  const look = new THREE.Vector3(0, 146, 0);
  function size(w, h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the whole post in frame, wider stages see it from a little further
    const fit = Math.max(318 / 2 / Math.tan(THREE.MathUtils.degToRad(13)), (300 / camera.aspect) / 2 / Math.tan(THREE.MathUtils.degToRad(13)));
    camera.position.set(0, look.y + 18, fit);
    camera.lookAt(look); camera.updateProjectionMatrix();
  }

  if (poster) {
    renderer.setPixelRatio(1); size(1000, 1300);
    post.rotation.y = 0.12;
    arms.forEach(r => { r.assembly.rotation.y = r.s.rest; });
    renderer.render(scene, camera);
    return renderer.domElement;
  }

  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.className = 'post-canvas'; canvas.setAttribute('aria-hidden', 'true');
  stage.appendChild(canvas);

  /* motion: the post turns on a spring; each arm swings on its own spring,
     pushed by the post's angular acceleration, a hover, a click */
  let P = 0, Pv = 0, Pt = 0, lastPv = 0, idle = 0, active = null, tilt = 0, tiltT = 0;
  const STEP = 1 / 120;
  let acc = 0, raf = 0, last = performance.now(), awake = 0, visible = true;
  function step(dt) {
    const pa = 34 * (Pt - P) - 11 * Pv;
    Pv += pa * STEP; P += Pv * STEP;
    const kick = (Pv - lastPv) / STEP; lastPv = Pv;
    for (const r of arms) {
      // a hung sign: stiff near rest, lagging when the post spins under it
      const aa = -46 * r.a - 2.6 * r.w - kick * 0.55;
      r.w += aa * STEP; r.a += r.w * STEP;
    }
    tilt += (tiltT - tilt) * 0.06;
  }
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    acc += dt; while (acc >= STEP) { step(STEP); acc -= STEP; }
    idle += dt;
    post.rotation.y = P + (active ? 0 : Math.sin(idle * 0.35) * 0.08);
    for (const r of arms) {
      r.assembly.rotation.y = r.s.rest + r.a;
      // the sign for the section in view stands a little proud
      const ts = r.assembly.userData.lit ? 1.07 : 1;
      r.sign.scale.setScalar(r.sign.scale.x + (ts - r.sign.scale.x) * 0.12);
    }
    camera.position.x = tilt * 26; camera.lookAt(look);
    renderer.render(scene, camera);
    const moving = Math.abs(Pt - P) + Math.abs(Pv) + arms.reduce((m, r) => m + Math.abs(r.a) + Math.abs(r.w) + Math.abs(r.sign.scale.x - (r.assembly.userData.lit ? 1.07 : 1)), 0) > 0.002;
    if ((moving || !active || performance.now() < awake) && visible) raf = requestAnimationFrame(frame);
  }
  const wake = (ms = 0) => { awake = Math.max(awake, performance.now() + ms); if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  /* face the sign for the section in view */
  function face(k) {
    const r = arms.find(a => a.s.key === k);
    active = k;
    if (r) { Pt = -r.s.rest; arms.forEach(a => a.assembly.userData.lit = a === r); }
    wake(400);
  }

  // pointer: hover nudges a sign, a click sends it swinging and goes there
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hover = null;
  function pick(e) {
    const b = canvas.getBoundingClientRect();
    ndc.set((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(arms.map(a => a.sign), true)[0];
    return hit ? arms.find(a => a.s.key === hit.object.userData.key) : null;
  }
  canvas.addEventListener('pointermove', e => {
    const b = canvas.getBoundingClientRect();
    tiltT = ((e.clientX - b.left) / b.width - 0.5) * 2;
    const r = pick(e);
    if (r !== hover) {
      if (r) { r.w += r.s.side * 1.1; }
      hover = r;
      canvas.style.cursor = r ? 'pointer' : '';
      canvas.title = r ? r.s.label : '';
    }
    wake(300);
  });
  canvas.addEventListener('pointerleave', () => { tiltT = 0; hover = null; wake(300); });
  canvas.addEventListener('click', e => {
    const r = pick(e); if (!r) return;
    r.w += r.s.side * 5.5;
    wake(600);
    setTimeout(() => onSelect && onSelect(r.s), 220);
  });

  const ro = new ResizeObserver(() => { const b = stage.getBoundingClientRect(); if (b.width) { size(b.width, b.height); wake(); } });
  ro.observe(stage);
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) wake(); }).observe(stage);
  const b = stage.getBoundingClientRect(); size(b.width || 600, b.height || 800);
  wake(1000);
  return { face, signs: SIGNS, nudge: k => { const r = arms.find(a => a.s.key === k); if (r) { r.w += r.s.side * 2; wake(300); } } };
}

export { SIGNS };
