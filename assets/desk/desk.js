/* The desk: the whole site as one flatlay in hard afternoon sun.

   Four spreads run down a honey-oak desk; scrolling moves the camera from
   one to the next. Every object is part of the portfolio: hover lifts it,
   a click picks it up into view and opens its sheet of real HTML, closing
   the sheet drops it back onto the desk under Rapier physics. The ball
   rolls when you flick it, pens are links, the kraft notebook is the resume.

   Everything is modelled and textured here in code; units are centimetres,
   +z runs down the page. */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const RAPIER_URL = 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.14.0/rapier.es.js';
const SPREADS = [2, 62, 122, 182];
const desk = document.getElementById('desk');
const stage = document.getElementById('deskStage');
const tour = document.getElementById('deskTour');
const tip = document.getElementById('deskTip');
const emit = (n, p) => window.dvEmit && window.dvEmit(n, p);
const posterMode = /[?&]desk-poster\b/.test(location.search);

/* ── sheets: work the same with or without the 3D ──────────────── */
const sheetsEl = document.getElementById('sheets');
const SHEET_OF = { hello: 'hello', notebook: 'hello', work: 'work', keys: 'work', people: 'people', pushed: 'pushed', visual: 'visual', side: 'side', talk: 'talk' };
let openSheet = null, afterClose = null, returnFocus = null;
function showSheet(key, onClose) {
  const el = document.getElementById('sheet-' + SHEET_OF[key]);
  if (!el) return;
  if (openSheet) hideSheet(true);
  returnFocus = document.activeElement;
  el.hidden = false;
  sheetsEl.classList.add('open');
  requestAnimationFrame(() => el.classList.add('on'));
  openSheet = el; afterClose = onClose || null;
  setTimeout(() => el.querySelector('.sheet-x').focus({ preventScroll: true }), 60);
  emit('object_opened', { object: key });
}
function hideSheet(quick) {
  const el = openSheet; if (!el) return;
  el.classList.remove('on'); sheetsEl.classList.remove('open');
  openSheet = null;
  setTimeout(() => { if (!el.classList.contains('on')) el.hidden = true; }, quick ? 0 : 520);
  const cb = afterClose; afterClose = null; if (cb) cb();
  if (returnFocus && returnFocus.focus && !quick) returnFocus.focus({ preventScroll: true });
}
sheetsEl.addEventListener('click', e => { if (e.target.closest('.sheet-x') || e.target.classList.contains('sheet-shade')) hideSheet(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && openSheet) { e.preventDefault(); hideSheet(); } });

/* ── drawing helpers ────────────────────────────────────────────── */
let aniso = 8;
function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); }
  return t;
}
let seed = 9;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
function noise(x, w, h, n, a, light = '255,240,220', dark = '60,30,10') {
  for (let i = 0; i < n; i++) { x.fillStyle = rnd() > 0.5 ? `rgba(${light},${rnd() * a})` : `rgba(${dark},${rnd() * a})`; x.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2); }
}
function img(src) { return new Promise(r => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => r(i); i.onerror = () => r(null); i.src = src; }); }
const HAND = '"Caveat", "Comic Sans MS", cursive', BLOCK = '"Archivo Black", "Arial Black", sans-serif', SANS = '"Instrument Sans", system-ui, sans-serif', MONO = '"Space Mono", monospace';

/* ── the scene ──────────────────────────────────────────────────── */
async function build(R) {
  await Promise.all([`400 80px ${BLOCK}`, `600 40px ${HAND}`, `600 30px ${SANS}`, `400 20px ${MONO}`].map(f => document.fonts.load(f).catch(() => {})));
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: posterMode });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  aniso = renderer.capabilities.getMaxAnisotropy();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb47b45);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();

  // the sun: hard, low, from the upper left; long shadows to the lower right
  const sun = new THREE.DirectionalLight(0xffeccc, 3.7);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 80, bottom: -80, near: 10, far: 400 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.05; sun.shadow.radius = 1.6;
  scene.add(sun, sun.target);
  const SUN = new THREE.Vector3(-70, 95, -62);
  scene.add(new THREE.HemisphereLight(0xdfeaff, 0x7a4a22, 0.32));

  const std = (o) => new THREE.MeshStandardMaterial(o);
  const phys = (o) => new THREE.MeshPhysicalMaterial(o);
  const shadowy = m => { m.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return m; };

  /* the desk: honey oak, planks running across */
  const oak = canvasTex(1024, 1024, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#bd8044'); g.addColorStop(1, '#b0743a'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const y = rnd() * h, a = 0.04 + rnd() * 0.1, dark = rnd() > 0.35;
      x.strokeStyle = dark ? `rgba(110,60,20,${a})` : `rgba(240,200,150,${a})`; x.lineWidth = 0.6 + rnd() * 2.2;
      x.beginPath(); x.moveTo(0, y); for (let px = 0; px <= w; px += 32) x.lineTo(px, y + Math.sin(px / (60 + rnd() * 90) + i) * (2 + rnd() * 4)); x.stroke();
    }
    for (let y = 0; y < h; y += 256) { x.fillStyle = 'rgba(70,35,10,.35)'; x.fillRect(0, y, w, 2); x.fillStyle = 'rgba(255,225,180,.15)'; x.fillRect(0, y + 2, w, 1); }
    noise(x, w, h, 30000, 0.06);
  }, [4, 5.2]);
  const deskTop = new THREE.Mesh(new THREE.PlaneGeometry(400, 520), phys({ map: oak, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.35 }));
  deskTop.rotation.x = -Math.PI / 2; deskTop.position.z = 105; deskTop.receiveShadow = true; scene.add(deskTop);

  /* cutting mats */
  const matTex = (bg, line) => canvasTex(1480, 1040, (x, w, h) => {
    x.fillStyle = bg; x.fillRect(0, 0, w, h);
    for (let i = 0; i <= w; i += 20) { x.fillStyle = i % 100 === 0 ? `rgba(${line},.42)` : `rgba(${line},.16)`; x.fillRect(i, 0, i % 100 === 0 ? 2 : 1, h); }
    for (let j = 0; j <= h; j += 20) { x.fillStyle = j % 100 === 0 ? `rgba(${line},.42)` : `rgba(${line},.16)`; x.fillRect(0, j, w, j % 100 === 0 ? 2 : 1); }
    x.fillStyle = `rgba(${line},.55)`; x.font = `400 14px ${MONO}`;
    for (let i = 100; i < w; i += 100) x.fillText(String(i / 20), i + 4, 18);
    for (let j = 100; j < h; j += 100) x.fillText(String(j / 20), 6, j - 4);
    x.strokeStyle = `rgba(${line},.3)`; x.lineWidth = 2; x.beginPath(); x.moveTo(0, h); x.lineTo(w * 0.42, 0); x.stroke();
    noise(x, w, h, 20000, 0.05, '255,255,255', '0,0,0');
  });
  const mats = [];
  const mat = (tex, w, d, x, z, ry) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, 0.3, d, 2, 0.12), std({ map: tex, roughness: 0.85 }));
    m.position.set(x, 0.15, z); m.rotation.y = ry; m.receiveShadow = true; m.castShadow = true; scene.add(m);
    mats.push({ w, d, x, z, ry });
  };
  mat(matTex('#1f7a5e', '220,255,235'), 74, 52, -4, 4, 0.04);
  mat(matTex('#8a9198', '255,255,255'), 82, 56, 2, 124, -0.05);
  const MAT = 0.3;

  /* ── objects ── */
  const objs = [];
  function add(def) {
    const o = { ...def, home: new THREE.Vector3(def.x, def.y, def.z), lift: 0, liftT: 0, state: 'rest' };
    o.group.position.copy(o.home); o.group.rotation.y = def.ry || 0;
    o.group.traverse(c => { c.userData.obj = o; });
    shadowy(o.group); scene.add(o.group); objs.push(o);
    return o;
  }
  const box = (w, h, d, mat, r = 0) => new THREE.Mesh(r ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d), mat);
  const faced = (w, h, d, top, side) => box(w, h, d, [side, side, top, side, side, side]);

  // business card
  {
    const t = canvasTex(900, 540, (x, w, h) => {
      x.fillStyle = '#f7f1e6'; x.fillRect(0, 0, w, h); noise(x, w, h, 6000, 0.05);
      x.fillStyle = '#e9482a'; x.fillRect(60, 64, 46, 46);
      x.fillStyle = '#2a2420'; x.font = `400 66px ${BLOCK}`; x.fillText('DATTA VELIVELA', 60, 230);
      x.font = `600 36px ${SANS}`; x.fillStyle = '#4a4038'; x.fillText('Senior Product Designer at Procol', 60, 300);
      x.fillText('ex Dukaan, ex Pine Labs', 60, 350);
      x.font = `400 28px ${MONO}`; x.fillStyle = '#7a6e62'; x.fillText('dattavelivela.xyz', 60, 470);
    });
    const g = new THREE.Group(); g.add(faced(9, 0.06, 5.4, std({ map: t, roughness: 0.8 }), std({ color: 0xf2ece0 })));
    add({ key: 'hello', label: 'Business card: hello', group: g, x: 23, y: MAT + 0.03, z: 20, ry: 0.18, shape: ['cuboid', 4.5, 0.03, 2.7], density: 0.6 });
  }

  // the hero: orange spiral notebook, its cover on a hinge at the coil
  let cover;
  {
    const W = 25, D = 31;
    const coverTex = canvasTex(1250, 1550, (x, w, h) => {
      x.fillStyle = '#ec4a22'; x.fillRect(0, 0, w, h); noise(x, w, h, 26000, 0.05, '255,200,170', '120,20,0');
      x.fillStyle = '#f8b9c6'; x.font = `400 250px ${BLOCK}`; x.textBaseline = 'alphabetic';
      x.letterSpacing = '-6px';
      x.fillText('DESIGN', 70, 300); x.fillText('BUILD', 70, 540);
      x.font = `400 300px ${BLOCK}`; x.fillText('AND', 70, 1190); x.fillText('SELL', 70, 1460);
      x.letterSpacing = '4px'; x.font = `400 34px ${MONO}`; x.fillText('DATTAVELIVELA.XYZ', 650, 700); x.fillText('NOTES 2023-2026', 650, 750);
    });
    const inside = canvasTex(1250, 1550, (x, w, h) => {
      x.fillStyle = '#f6f0e3'; x.fillRect(0, 0, w, h);
      for (let y = 160; y < h; y += 62) { x.fillStyle = 'rgba(80,120,200,.25)'; x.fillRect(80, y, w - 160, 2); }
      x.fillStyle = '#25304e'; x.font = `600 92px ${HAND}`;
      ['Hello!', "I'm Datta.", 'Product + design,', '3.5 years.', 'Procol, Dukaan,', 'Pine Labs.', 'Pick things up', 'on this desk.'].forEach((s, i) => x.fillText(s, 110, 210 + i * 124));
    });
    const paper = std({ color: 0xf3ecdf, roughness: 0.9 });
    const g = new THREE.Group();
    const pages = box(W - 0.6, 1.1, D - 0.6, [paper, paper, std({ map: inside, roughness: 0.85 }), paper, paper, paper]);
    const back = box(W, 0.22, D, std({ color: 0xd8401c, roughness: 0.7 })); back.position.y = -0.66;
    const pivot = new THREE.Group(); pivot.position.set(-W / 2, 0.66, 0);
    const front = box(W, 0.22, D, [std({ color: 0xd8401c }), std({ color: 0xd8401c }), std({ map: coverTex, roughness: 0.62 }), std({ color: 0xc23a18 }), std({ color: 0xd8401c }), std({ color: 0xd8401c })]);
    front.position.x = W / 2; pivot.add(front); cover = pivot;
    g.add(pages, back, pivot);
    const coilMat = phys({ color: 0xf2a7b6, metalness: 0.6, roughness: 0.3, clearcoat: 0.6 });
    for (let i = 0; i < 22; i++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.16, 10, 24), coilMat);
      t.position.set(-W / 2 - 0.15, 0, -D / 2 + 1.2 + i * ((D - 2.4) / 21)); g.add(t);
    }
    add({ key: 'notebook', label: 'Notebook: about', group: g, x: -8, y: MAT + 0.9, z: 6, ry: -0.09, shape: ['cuboid', W / 2 + 0.6, 0.9, D / 2], density: 0.5 });
  }

  // pencil cup, its pens are links
  {
    const g = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [4.2, 0], [4.25, 10.5], [3.9, 10.5], [3.85, 0.6], [0, 0.6]].map(([a, b]) => new THREE.Vector2(a, b)), 48),
      phys({ color: 0x1d7a4a, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }));
    cup.position.y = -5.25; g.add(cup);
    const pens = [['LinkedIn', 'https://www.linkedin.com/in/dattavelivela/', 0x2d64bc], ['X', 'https://x.com/wdattavelivela', 0x1d1d1f], ['GitHub', 'https://github.com/dattavelivela', 0x8a8f98], ['Dribbble', 'https://dribbble.com/wdattavelivela', 0xe9578d], ['Email', 'mailto:withgurudatta@gmail.com', 0xe9482a]];
    pens.forEach(([label, href, col], i) => {
      const pen = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 15, 16), phys({ color: col, roughness: 0.35, clearcoat: 0.6 }));
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2.6, 16), phys({ color: 0xf2f2f0, roughness: 0.3, metalness: 0.4 }));
      cap.position.y = 7.6; pen.add(body, cap);
      const a = (i / pens.length) * Math.PI * 2;
      pen.position.set(Math.cos(a) * 1.8, 2.2, Math.sin(a) * 1.8); pen.rotation.set(Math.sin(a) * 0.22, 0, -Math.cos(a) * 0.22);
      pen.traverse(c => { c.userData.link = { label: `Pen: ${label}`, href }; });
      g.add(pen);
    });
    add({ key: 'cup', label: 'Pencil cup', group: g, x: 41, y: 5.25, z: -27, ry: 0, shape: ['cylinder', 5.25, 4.25], density: 0.4, still: true });
  }

  // green pencil sharpener
  {
    const g = new THREE.Group();
    const body = box(7, 8, 6.4, phys({ color: 0x14804f, roughness: 0.28, clearcoat: 0.9 }), 0.9);
    const plate = box(5, 3.2, 0.3, phys({ color: 0xdfe2e6, metalness: 1, roughness: 0.2 }), 0.12); plate.position.set(0, 1.2, 3.25);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.4, 24), std({ color: 0x111111 })); hole.rotation.x = Math.PI / 2; hole.position.set(0, 1.2, 3.45);
    const win = box(5, 2.2, 0.2, phys({ color: 0x9ab0b8, roughness: 0.1, transparent: true, opacity: 0.7 })); win.position.set(0, -2.2, 3.25);
    g.add(body, plate, hole, win);
    add({ key: 'sharpener', label: 'Sharpener', group: g, x: -47, y: 4, z: -15, ry: 0.32, shape: ['cuboid', 3.5, 4, 3.2], density: 0.8, still: true });
  }

  // espresso: contact
  {
    const g = new THREE.Group();
    const white = phys({ color: 0xf7f6f2, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 });
    const lathe = (pts) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), 64), white);
    const saucer = lathe([[0, 0], [5.2, 0], [7.4, 0.7], [7.6, 1], [7.2, 1], [5, 0.55], [0, 0.55]]); saucer.position.y = -3.1;
    const cup = lathe([[0, 0], [2.6, 0], [3.7, 1.2], [4, 5.2], [3.7, 5.2], [3.4, 1.4], [0, 1]]); cup.position.y = -2.5;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.42, 12, 24, Math.PI * 1.3), white); handle.position.set(4.4, 0.4, 0); handle.rotation.z = -Math.PI * 0.65;
    const crema = canvasTex(256, 256, (x, w) => { const r = x.createRadialGradient(w / 2, w / 2, 10, w / 2, w / 2, w / 2); r.addColorStop(0, '#5a3214'); r.addColorStop(0.6, '#8a5527'); r.addColorStop(1, '#c08a4e'); x.fillStyle = r; x.fillRect(0, 0, w, w); noise(x, w, w, 2000, 0.15); });
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(3.55, 48), std({ map: crema, roughness: 0.35 })); coffee.rotation.x = -Math.PI / 2; coffee.position.y = 2.1;
    g.add(saucer, cup, handle, coffee);
    add({ key: 'talk', label: "Espresso: let's talk", group: g, x: 47, y: 3.1, z: 19, ry: 0.5, shape: ['cylinder', 3.1, 7.4], density: 0.4 });
  }

  // a couple of orange pencils
  const pencil = (x, z, ry) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 16, 6), phys({ color: 0xe8662a, roughness: 0.4, clearcoat: 0.5 }));
    const wood = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 6), std({ color: 0xe7c08a })); wood.position.y = -8.8; wood.rotation.x = Math.PI;
    const lead = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 6), std({ color: 0x2a2a2a })); lead.position.y = -9.6; lead.rotation.x = Math.PI;
    const inner = new THREE.Group(); inner.add(body, wood, lead); inner.rotation.z = Math.PI / 2; g.add(inner);
    add({ key: 'pencil', label: 'Pencil', group: g, x, y: 0.45, z, ry, shape: ['cuboid', 8.8, 0.4, 0.45], density: 0.6, still: true });
  };
  pencil(-51, 34, 0.7); pencil(12, 86, -0.35); pencil(-40, 202, 0.5);

  // keys in a ceramic dish: the case studies
  {
    const g = new THREE.Group();
    const dish = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [6.4, 0], [7.4, 0.8], [7.2, 2], [6.4, 2.1], [5.6, 1.2], [0, 0.9]].map(([a, b]) => new THREE.Vector2(a, b)), 64),
      phys({ color: 0xf1ede4, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12 }));
    dish.position.y = -1.05; g.add(dish);
    const brass = phys({ color: 0xd8b25a, metalness: 1, roughness: 0.28 });
    const keyShape = () => {
      const s = new THREE.Shape(); s.absarc(0, 0, 1.3, 0, Math.PI * 2, false);
      const hole = new THREE.Path(); hole.absarc(0, 0, 0.45, 0, Math.PI * 2, true); s.holes.push(hole);
      const b = new THREE.Shape(); b.moveTo(1, -0.35); b.lineTo(6, -0.35); b.lineTo(6, 0.35); b.lineTo(5.4, 0.35); b.lineTo(5.2, 0.9); b.lineTo(4.8, 0.35); b.lineTo(4.4, 0.8); b.lineTo(4, 0.35); b.lineTo(1, 0.35);
      const m = new THREE.Group();
      [s, b].forEach(sh => { const k = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1 }), brass); k.rotation.x = -Math.PI / 2; m.add(k); });
      return m;
    };
    const k1 = keyShape(); k1.position.set(-1, 0.3, 0.5); k1.rotation.y = 0.4;
    const k2 = keyShape(); k2.position.set(-0.4, 0.55, -0.6); k2.rotation.y = -0.5;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.16, 10, 32), phys({ color: 0xcfd3d8, metalness: 1, roughness: 0.2 })); ring.rotation.x = -Math.PI / 2; ring.position.set(-2.2, 0.45, 0);
    const strap = box(2.4, 0.4, 9, phys({ color: 0x1c6b45, roughness: 0.55, clearcoat: 0.3 }), 0.18); strap.position.set(-4.6, 0.4, 4); strap.rotation.y = -0.6;
    g.add(k1, k2, ring, strap);
    add({ key: 'keys', label: 'Keys: case studies', group: g, x: -28, y: 1.05, z: 52, ry: 0.2, shape: ['cylinder', 1.05, 7.4], density: 0.5 });
  }

  // sticky notes, handwritten
  const sticky = (key, label, color, lines, x, z, ry, size = 12) => {
    const t = canvasTex(800, 800, (c, w, h) => {
      c.fillStyle = color; c.fillRect(0, 0, w, h); noise(c, w, h, 9000, 0.05);
      const sh = c.createLinearGradient(0, 0, 0, 120); sh.addColorStop(0, 'rgba(0,0,0,.1)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = sh; c.fillRect(0, 0, w, 120);
      c.fillStyle = '#1d2333'; lines.forEach(([s, sz], i) => { c.font = `600 ${sz}px ${HAND}`; c.fillText(s, 60, 150 + i * 118); });
    });
    const g = new THREE.Group(); g.add(faced(size, 0.12, size, std({ map: t, roughness: 0.8 }), std({ color })));
    return add({ key, label, group: g, x, y: 0.06, z, ry, shape: ['cuboid', size / 2, 0.06, size / 2], density: 0.4 });
  };
  sticky('work', 'Sticky note: work', '#63e08f', [['Work:', 110], ['- Agentic source-to-pay', 66], ['- AI Demo Platform', 66], ['- Dukaan app + system', 66], ['(case studies inside)', 54]], -2, 64, -0.08, 13);
  sticky('side', 'Note: Rinso', '#ffd447', [['Rinso', 120], ['2,000 doors', 84], ['132 first orders', 84]], -34, 76, 0.12);
  sticky('side', 'Note: Slosh', '#ff9fc6', [['Slosh', 120], ['700+ AI visuals', 80], ['11 brands', 84]], -15, 81, -0.14);

  // kraft notebook: the resume
  {
    const t = canvasTex(1000, 1300, (x, w, h) => {
      x.fillStyle = '#c9a272'; x.fillRect(0, 0, w, h); noise(x, w, h, 40000, 0.1, '255,230,190', '90,60,25');
      x.fillStyle = '#121212'; x.fillRect(150, 780, 700, 260);
      x.fillStyle = '#f4f1ea'; x.font = `400 96px ${BLOCK}`; x.fillText('DATTA', 190, 890); x.fillText('VELIVELA', 190, 1000);
      x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.moveTo(560, 200); x.lineTo(760, 200); x.lineTo(660, 420); x.closePath(); x.fill();
      x.beginPath(); x.arc(380, 560, 120, Math.PI, Math.PI * 1.5); x.lineTo(380, 560); x.fill();
      x.fillStyle = '#2a2420'; x.font = `400 30px ${MONO}`; x.fillText('RESUME', 150, 1200);
    });
    const g = new THREE.Group();
    g.add(faced(20, 1.4, 26, std({ map: t, roughness: 0.9 }), std({ color: 0xe9e0cf })));
    ['#f2a7c0', '#f7d04c', '#9fd3b6', '#b4c4f0', '#f2a7c0'].forEach((c, i) => { const tab = box(1.2, 0.9, 2.2, std({ color: c })); tab.position.set(10.4, 0, -9 + i * 4.2); g.add(tab); });
    g.traverse(c => { c.userData.link = { label: 'Kraft notebook: resume', href: 'https://drive.google.com/file/d/1GrxufCc-0qrAGlAs6X_98Efg1V-69fZb/view?usp=sharing' }; });
    add({ key: 'resume', label: 'Kraft notebook: resume', group: g, x: 31, y: 0.7, z: 59, ry: 0.14, shape: ['cuboid', 10, 0.7, 13], density: 0.5 });
  }

  // the book stack: one spine per testimonial
  const names = [...document.querySelectorAll('.sheet-says .tcard .nm')].map(e => e.textContent.trim());
  {
    const cols = ['#2b44a8', '#d23b2d', '#efe6d2', '#1d6e4d', '#e9662c', '#ef9db2'];
    let y = MAT;
    names.slice(0, 6).forEach((nm, i) => {
      const w = 22 + rnd() * 4, h = 2.2 + rnd() * 1.2, d = 16 + rnd() * 2.5;
      const spine = canvasTex(1100, 140, (x, W, H) => {
        x.fillStyle = cols[i]; x.fillRect(0, 0, W, H); noise(x, W, H, 4000, 0.08);
        x.fillStyle = i === 2 ? '#2a2420' : '#fbf6ec'; x.font = `400 64px ${BLOCK}`; x.textBaseline = 'middle'; x.fillText(nm.toUpperCase(), 40, H / 2 + 4);
        x.font = `400 26px ${MONO}`; x.textAlign = 'right'; x.fillText(String(i + 1).padStart(3, '0'), W - 40, H / 2);
      });
      const coverT = i === names.length - 1 || i === 5 ? canvasTex(800, 600, (x, W, H) => {
        x.fillStyle = cols[i]; x.fillRect(0, 0, W, H); x.fillStyle = '#fbf6ec'; x.font = `400 92px ${BLOCK}`; x.fillText('KIND', 60, 240); x.fillText('WORDS', 60, 340);
        x.font = `400 26px ${MONO}`; x.fillText('001 TO 006', 60, 420);
      }) : null;
      const base = std({ color: cols[i], roughness: 0.75 });
      const pagesM = std({ color: 0xf2ead8, roughness: 0.9 });
      const g = new THREE.Group();
      g.add(box(w, h, d, [pagesM, base, coverT ? std({ map: coverT, roughness: 0.7 }) : base, base, std({ map: spine, roughness: 0.7 }), pagesM]));
      g.userData.person = i;
      add({ key: 'people', label: `Book: ${nm}`, person: i, group: g, x: -27 + (rnd() - 0.5) * 2.4, y: y + h / 2, z: 115 + (rnd() - 0.5) * 2, ry: (rnd() - 0.5) * 0.24, shape: ['cuboid', w / 2, h / 2, d / 2], density: 0.6 });
      y += h;
    });
  }

  // calendar card: what I pushed
  {
    let weeks = null;
    try {
      const r = await fetch('https://github-contributions-api.jogruber.de/v4/dattavelivela?y=last');
      if (r.ok) { const j = await r.json(); weeks = j.contributions; }
    } catch (e) {}
    const t = canvasTex(1400, 850, (x, w, h) => {
      x.fillStyle = '#fbf8f1'; x.fillRect(0, 0, w, h); noise(x, w, h, 6000, 0.04);
      x.fillStyle = '#2a2420'; x.font = `400 64px ${BLOCK}`; x.fillText('WHAT I PUSHED', 70, 130);
      x.font = `400 28px ${MONO}`; x.fillStyle = '#7a6e62'; x.fillText('2026 · github.com/dattavelivela', 70, 185);
      const colsL = ['#ebe5d8', '#9fd3b6', '#4fae7f', '#227a57', '#11503a'];
      if (weeks && weeks.length) {
        const last = weeks.slice(-371);
        last.forEach((d, i) => { const col = Math.floor(i / 7), row = i % 7; x.fillStyle = colsL[Math.min(4, d.level || 0)]; x.fillRect(70 + col * 23.5, 250 + row * 23.5, 19, 19); });
        const total = last.reduce((a, d) => a + (d.count || 0), 0);
        x.fillStyle = '#2a2420'; x.font = `600 40px ${SANS}`; x.fillText(`${total.toLocaleString()} contributions in the last year`, 70, 480);
      } else {
        for (let i = 0; i < 371; i++) { x.fillStyle = colsL[(i * 7) % 5 === 0 ? 2 : 0]; x.fillRect(70 + Math.floor(i / 7) * 23.5, 250 + (i % 7) * 23.5, 19, 19); }
      }
    });
    const g = new THREE.Group(); g.add(faced(28, 0.25, 17, std({ map: t, roughness: 0.75 }), std({ color: 0xf3eee4 })));
    add({ key: 'pushed', label: 'Calendar: what I pushed', group: g, x: 15, y: MAT + 0.125, z: 114, ry: 0.05, shape: ['cuboid', 14, 0.125, 8.5], density: 0.5 });
  }

  // blue tape, an orange set square
  {
    const g = new THREE.Group();
    const roll = new THREE.Mesh(new THREE.LatheGeometry([[2.7, 0], [4.7, 0], [4.7, 2], [2.7, 2]].map(([a, b]) => new THREE.Vector2(a, b)), 48), phys({ color: 0x2550d8, roughness: 0.35, clearcoat: 0.8 }));
    const core = new THREE.Mesh(new THREE.LatheGeometry([[2.3, 0], [2.7, 0], [2.7, 2], [2.3, 2]].map(([a, b]) => new THREE.Vector2(a, b)), 32, 0, Math.PI * 2), std({ color: 0xc9a86f, side: THREE.DoubleSide }));
    roll.position.y = core.position.y = -1; g.add(roll, core);
    add({ key: 'tape', label: 'Tape', group: g, x: 36, y: MAT + 1, z: 139, ry: 0, shape: ['cylinder', 1, 4.7], density: 0.5, still: true });
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(28, 0); s.lineTo(0, 28); s.closePath();
    const h = new THREE.Path(); h.moveTo(5, 5); h.lineTo(16, 5); h.lineTo(5, 16); h.closePath(); s.holes.push(h);
    const sq = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false }), phys({ color: 0xff5a1f, roughness: 0.25, transparent: true, opacity: 0.74, clearcoat: 1 }));
    sq.rotation.x = -Math.PI / 2; sq.position.set(-9, -0.15, 9);
    const g2 = new THREE.Group(); g2.add(sq);
    add({ key: 'square', label: 'Set square', group: g2, x: -3, y: MAT + 0.15, z: 140, ry: 0.42, shape: ['cuboid', 9, 0.15, 9], density: 0.8, still: true });
  }

  // prints of the visual work
  {
    const srcs = [...document.querySelectorAll('.sheet-shots .shot img')].slice(0, 4).map(i => i.getAttribute('src'));
    const ims = await Promise.all(srcs.map(s => img(s)));
    const spots = [[-28, 175, -0.1], [-6, 184, 0.11], [16, 173, -0.06], [33, 190, 0.08]];
    ims.forEach((im, i) => {
      const t = canvasTex(900, 700, (x, w, h) => {
        x.fillStyle = '#fbfaf6'; x.fillRect(0, 0, w, h);
        if (im) { const r = im.width / im.height, bw = w - 70, bh = h - 70; let sw = im.width, sh = im.height, sx = 0, sy = 0; if (r > bw / bh) { sw = im.height * bw / bh; sx = (im.width - sw) / 2; } else { sh = im.width * bh / bw; sy = (im.height - sh) / 2; } x.drawImage(im, sx, sy, sw, sh, 35, 35, bw, bh); }
      });
      const g = new THREE.Group(); g.add(faced(15, 0.08, 11.7, phys({ map: t, roughness: 0.4, clearcoat: 0.5 }), std({ color: 0xf6f4ee })));
      add({ key: 'visual', label: 'Prints: visual work', group: g, x: spots[i][0], y: 0.04, z: spots[i][1], ry: spots[i][2], shape: ['cuboid', 7.5, 0.04, 5.85], density: 0.5 });
    });
  }

  // the red ball: flick it
  {
    const t = canvasTex(1024, 512, (x, w, h) => {
      x.fillStyle = '#d4222a'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#fbf8f1'; x.beginPath(); x.ellipse(w * 0.25, h / 2, 64, 120, 0, 0, 7); x.fill();
      x.fillStyle = '#1d1d1f'; x.font = `400 92px ${BLOCK}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('11', w * 0.25, h / 2 + 6);
    });
    const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.SphereGeometry(3.6, 64, 32), phys({ map: t, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04 })));
    g.children[0].rotation.y = -0.4;
    add({ key: 'ball', label: 'Ball: flick it', group: g, x: 6, y: 3.6, z: 203, ry: 0, shape: ['ball', 3.6], density: 1.2, ball: true });
  }

  /* ── physics ── */
  let world = null;
  if (R) {
    world = new R.World({ x: 0, y: -981, z: 0 });
    if ('lengthUnit' in world.integrationParameters) world.integrationParameters.lengthUnit = 100;
    world.createCollider(R.ColliderDesc.cuboid(400, 10, 400).setTranslation(0, -10, 105).setFriction(0.8));
    for (const m of mats) {
      world.createCollider(R.ColliderDesc.cuboid(m.w / 2, 0.15, m.d / 2).setTranslation(m.x, 0.15, m.z)
        .setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, m.ry, 0))).setFriction(0.9));
    }
    for (const o of objs) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, o.ry || 0, 0));
      o.body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(o.home.x, o.home.y, o.home.z).setRotation(q)
        .setLinearDamping(o.ball ? 0.25 : 0.4).setAngularDamping(o.ball ? 0.3 : 0.6).setCanSleep(true));
      const [type, a, b, c] = o.shape;
      const cd = type === 'ball' ? R.ColliderDesc.ball(a) : type === 'cylinder' ? R.ColliderDesc.cylinder(a, b) : R.ColliderDesc.cuboid(a, b, c);
      world.createCollider(cd.setDensity(o.density / 1000).setFriction(o.ball ? 0.6 : 0.85).setRestitution(o.ball ? 0.35 : 0.08), o.body);
      o.body.sleep();
    }
  }

  return { renderer, scene, sun, SUN, objs, world, cover };
}

/* ── the camera over the desk ───────────────────────────────────── */
function rig(camera) {
  return (z, w, h) => {
    camera.aspect = w / h;
    const fit = w >= h ? 96 : 70;                           // desk width across the frame
    const d = fit / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    camera.position.set(0, d * Math.cos(0.36), z + d * Math.sin(0.36));
    camera.lookAt(0, 0, z);
    camera.updateProjectionMatrix();
  };
}

async function main() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let gl = false; try { gl = !!document.createElement('canvas').getContext('webgl2'); } catch (e) {}
  const save = navigator.connection && navigator.connection.saveData;
  if (!posterMode && (reduce || !gl || save)) return still();

  const R = posterMode ? null : await import(RAPIER_URL).then(async m => { await m.default.init(); return m.default; }).catch(() => null);
  const S = await build(R);
  const { renderer, scene, sun, SUN, objs, world, cover } = S;
  const camera = new THREE.PerspectiveCamera(32, 1, 5, 1200);
  const place = rig(camera);

  if (posterMode) {
    renderer.setPixelRatio(1); renderer.setSize(1600, 1000, false);
    window.__deskStills = SPREADS.map(z => {
      place(z, 1600, 1000); sun.position.set(0, 0, z).add(SUN); sun.target.position.set(0, 0, z);
      renderer.render(scene, camera); return renderer.domElement.toDataURL('image/webp', 0.88);
    });
    return;
  }

  const canvas = renderer.domElement; stage.prepend(canvas);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  let W = 0, H = 0;
  const size = () => { W = innerWidth; H = innerHeight; renderer.setSize(W, H, false); };
  size(); addEventListener('resize', size);
  tour.style.height = (SPREADS.length * 100 + 40) + 'vh';

  /* scroll: hold on each spread, glide between; the camera eases after it */
  const ease = u => u * u * u * (u * (6 * u - 15) + 10);
  const zFor = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const p = Math.min(1, scrollY / max) * (SPREADS.length - 1);
    const i = Math.min(SPREADS.length - 2, Math.floor(p)), u = p - i;
    const t = ease(Math.min(1, Math.max(0, (u - 0.2) / 0.6)));
    return SPREADS[i] + (SPREADS[i + 1] - SPREADS[i]) * t;
  };
  let camZ = zFor();

  /* hover, pick up, put down */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hover = null, hoverLink = null, held = null;
  const pickables = objs.map(o => o.group);
  function hit(e) {
    ndc.set(e.clientX / W * 2 - 1, -e.clientY / H * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(pickables, true)[0];
    return h ? { obj: h.object.userData.obj, link: h.object.userData.link } : null;
  }
  canvas.addEventListener('pointermove', e => {
    if (held || e.pointerType === 'touch') return;
    const h = hit(e);
    const o = h && !h.obj.still ? h.obj : null;
    hoverLink = h && h.link ? h.link : null;
    if (o !== hover) { if (hover) hover.liftT = 0; hover = o; if (o) o.liftT = 0.9; }
    const label = hoverLink ? hoverLink.label : o ? o.label : '';
    tip.textContent = label; tip.classList.toggle('on', !!label);
    canvas.style.cursor = label ? 'pointer' : '';
  });
  canvas.addEventListener('click', e => {
    if (held) return;
    const h = hit(e); if (!h) return;
    if (h.link) { emit('object_opened', { object: h.link.label }); window.open(h.link.href, h.link.href.startsWith('mailto') ? '_self' : '_blank', 'noopener'); return; }
    const o = h.obj;
    if (o.ball) return flick(o, e);
    if (o.still) return nudge(o);
    pickUp(o);
  });
  function nudge(o) { if (!o.body) return; o.body.wakeUp(); o.body.applyImpulse({ x: (Math.random() - 0.5) * 30 * o.body.mass(), y: 120 * o.body.mass(), z: (Math.random() - 0.5) * 30 * o.body.mass() }, true); }
  function flick(o) {
    if (!o.body) return showSheet('visual');
    const m = o.body.mass(), a = Math.random() * Math.PI * 2;
    o.body.wakeUp(); o.body.applyImpulse({ x: Math.cos(a) * 140 * m - 60 * m, y: 0, z: Math.sin(a) * 60 * m - 90 * m }, true);
    emit('object_opened', { object: 'ball' });
    setTimeout(() => showSheet('visual'), 700);
  }

  const tmpQ = new THREE.Quaternion(), faceQ = new THREE.Quaternion(), tmpV = new THREE.Vector3();
  function focusPose(o) {
    // in front of the camera, left of centre (the sheet takes the right), top face to you
    const size = new THREE.Box3().setFromObject(o.group).getSize(tmpV).length() * 0.8;
    // big things float nearer: never further than halfway to the desk
    const toDesk = camera.position.y / Math.cos(0.36);
    const dist = Math.min(toDesk * 0.55, size / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.5));
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const viewW = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist * camera.aspect;
    const pos = camera.position.clone().addScaledVector(fwd, dist);
    if (W > 700) pos.addScaledVector(right, -viewW * 0.2); else pos.addScaledVector(up, viewW * 0.55);
    faceQ.copy(camera.quaternion).multiply(tmpQ.setFromEuler(new THREE.Euler(Math.PI / 2 - 0.12, 0, 0.06)));
    return { pos, quat: faceQ.clone() };
  }
  function pickUp(o) {
    held = o; hover = null; o.liftT = 0; tip.classList.remove('on');
    o.from = { pos: o.group.position.clone(), quat: o.group.quaternion.clone() };
    o.state = 'up'; o.t = 0;
    if (o.body) { o.body.setEnabled(false); world.forEachRigidBody(b => b.wakeUp()); }
    showSheet(o.person != null ? 'people' : o.key, () => putDown(o));
    if (o.person != null) {
      const cards = document.querySelectorAll('.sheet-says .tcard');
      const c = cards[o.person]; if (c) setTimeout(() => c.scrollIntoView({ block: 'center' }), 420);
    }
  }
  function putDown(o) {
    // dropped back over its spot, a little turned, and left to physics
    const drop = o.home.clone(); drop.y += 7 + Math.random() * 3;
    drop.x += (Math.random() - 0.5) * 3; drop.z += (Math.random() - 0.5) * 3;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.4, (o.ry || 0) + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.4));
    o.from = { pos: o.group.position.clone(), quat: o.group.quaternion.clone() };
    o.to = { pos: drop, quat: q };
    o.state = 'down'; o.t = 0;
  }

  /* one loop: physics on a fixed step, the camera, the held object */
  const STEP = 1 / 60;
  let acc = 0, last = performance.now();
  const easeIO = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    camZ += (zFor() - camZ) * (1 - Math.exp(-dt * 6));
    place(camZ, W, H);
    sun.position.set(0, 0, camZ).add(SUN); sun.target.position.set(0, 0, camZ); sun.target.updateMatrixWorld();
    if (world) { acc += dt; while (acc >= STEP) { world.step(); acc -= STEP; } }
    if (cover) cover.rotation.z += ((held && held.key === 'notebook' && held.state !== 'down' ? 2.75 : 0) - cover.rotation.z) * (1 - Math.exp(-dt * 6));
    for (const o of objs) {
      if (o.state === 'up' || o.state === 'held') {
        const f = focusPose(o);
        if (o.state === 'up') { o.t = Math.min(1, o.t + dt / 0.75); const e = easeIO(o.t); o.group.position.lerpVectors(o.from.pos, f.pos, e); o.group.quaternion.slerpQuaternions(o.from.quat, f.quat, e); if (o.t >= 1) o.state = 'held'; }
        else { o.group.position.copy(f.pos); o.group.quaternion.copy(f.quat); }
        continue;
      }
      if (o.state === 'down') {
        o.t = Math.min(1, o.t + dt / 0.55); const e = easeIO(o.t);
        o.group.position.lerpVectors(o.from.pos, o.to.pos, e); o.group.quaternion.slerpQuaternions(o.from.quat, o.to.quat, e);
        if (o.t >= 1) {
          o.state = 'rest'; held = null;
          if (o.body) {
            o.body.setTranslation(o.to.pos, true); o.body.setRotation(o.to.quat, true);
            o.body.setLinvel({ x: 0, y: -40, z: 0 }, true); o.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
            o.body.setEnabled(true); o.body.wakeUp();
          } else { o.group.position.copy(o.home); o.group.rotation.set(0, o.ry || 0, 0); }
        }
        continue;
      }
      o.lift += (o.liftT - o.lift) * (1 - Math.exp(-dt * 14));
      if (o.body) { const p = o.body.translation(), r = o.body.rotation(); o.group.position.set(p.x, p.y + o.lift, p.z); o.group.quaternion.set(r.x, r.y, r.z, r.w); }
      else o.group.position.y = o.home.y + o.lift;
    }
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  /* the HTML list of objects does the same as clicking them */
  desk.querySelector('.desk-nav').addEventListener('click', e => {
    const b = e.target.closest('[data-open]'); if (!b) return;
    const key = b.dataset.open;
    const o = objs.find(x => x.key === key && !x.still);
    if (o && !held) pickUp(o); else showSheet(key);
  });
  window.__desk = { objs, pickUp, flick: () => flick(objs.find(o => o.ball)) };
}

/* no 3D: stills of the spreads, the list of objects as buttons */
function still() {
  desk.classList.add('still');
  desk.querySelector('.desk-nav').addEventListener('click', e => {
    const b = e.target.closest('[data-open]'); if (b) showSheet(b.dataset.open);
  });
}

main().catch(err => { console.error(err); still(); });
