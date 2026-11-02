/* The other openings for the intro, chosen with ?intro=<name>. Each act
   plays its own beat and returns the screen point the shelf things fly out
   of; intro.js owns the stage, skip, the flight and the hand-off.

   receipt   a thermal receipt prints the proof; tear it off
   deploy    git push in a terminal; deploy it
   knock     the Rinso door in 3D; knock and it swings open
   boarding  a boarding pass slides out; tear the stub
   collect   one sticker in a beam of light, paper to silver to gold; tap
             and it bursts

   Facts are the ones the page already states. */

import { labelFonts } from './label.js';

const INK = '#1f2333';
const SANS = '"Instrument Sans", system-ui, sans-serif';
const MONO = '"Space Mono", ui-monospace, monospace';
const ASSET = f => new URL('../' + f, import.meta.url).href;

/* styles for the acts, kept with them: only a preview ever loads this file */
const CSS = `
.act-piece{position:absolute;left:50%;transform:translateX(-50%)}
.act-printer{top:12%;width:min(340px,80vw);height:58px;border-radius:14px;background:linear-gradient(#3a3d46,#23252c);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 24px 40px -20px #000}
.act-printer::after{content:"";position:absolute;left:12%;right:12%;bottom:12px;height:5px;border-radius:3px;background:#0b0c0f}
.act-paper{position:absolute;left:50%;top:calc(12% + 50px);width:min(282px,72vw);transform:translateX(-50%);transform-origin:50% 0;cursor:grab;touch-action:none}
.act-paper .roll{height:0;overflow:hidden;background:#f7f5ef;transition:height .14s linear;box-shadow:0 30px 50px -30px #000}
.act-paper pre{margin:0;padding:14px 16px 18px;font:400 13px/1.65 ${MONO};color:#2a2c33;white-space:pre}
.act-paper .edge{height:9px;background:linear-gradient(135deg,#f7f5ef 33%,transparent 33%) 0 0/12px 12px,linear-gradient(225deg,#f7f5ef 33%,transparent 33%) 0 0/12px 12px;opacity:0}
.act-paper.torn .edge{opacity:1}
.act-term{top:16%;width:min(620px,90vw);border-radius:12px;overflow:hidden;background:#0b0c10;box-shadow:0 0 0 1px rgba(255,255,255,.08),0 40px 80px -30px #000;text-align:left}
.act-term .bar{display:flex;gap:7px;padding:12px 14px;background:#16181e}
.act-term .bar i{width:11px;height:11px;border-radius:50%;background:#3a3d46}
.act-term .bar i:nth-child(1){background:#ff5f57}.act-term .bar i:nth-child(2){background:#febc2e}.act-term .bar i:nth-child(3){background:#28c840}
.act-term pre{margin:0;padding:18px 20px 8px;min-height:250px;font:400 13px/1.75 ${MONO};color:#cfd3dc;white-space:pre-wrap}
.act-term .ok{color:#5ad18a}.act-term .dim{color:#6b7080}.act-term .tri{color:#f3efe6}
.act-term .caret{display:inline-block;width:8px;height:15px;margin-left:2px;vertical-align:-2px;background:#cfd3dc;animation:act-blink 1s steps(1) infinite}
.act-term button{margin:6px 20px 18px;padding:9px 16px;border-radius:8px;border:0;cursor:pointer;background:#f3efe6;color:#0b0c10;font:700 13px/1 ${MONO};opacity:0;transition:opacity .3s}
.act-term button.on{opacity:1}
@keyframes act-blink{50%{opacity:0}}
.act-pass-slot{top:13%;width:min(560px,88vw);height:16px;border-radius:8px;background:#060607;box-shadow:0 1px 0 rgba(255,255,255,.08)}
.act-pass{position:absolute;left:50%;top:calc(13% + 8px);width:min(540px,84vw);transform:translateX(-50%);display:flex;filter:drop-shadow(0 30px 30px rgba(0,0,0,.55))}
.act-pass canvas{display:block;height:auto}
.act-pass .main{width:74%}.act-pass .stub{width:26%;cursor:grab;touch-action:none}
.act-door2d{top:14%;width:min(200px,46vw);aspect-ratio:104/221;perspective:900px;background:#ffcf8a;box-shadow:0 0 0 10px #ece6d8,0 0 120px rgba(255,207,138,.35)}
.act-door2d i{position:absolute;inset:0;background:url(${ASSET('shelf/door.svg')}) 0 0/100% 100%;transform-origin:0 50%;transition:transform 1.1s cubic-bezier(.3,1.25,.5,1);cursor:pointer}
.act-door2d.knock i{animation:act-knock .18s}
.act-door2d.open i{transform:rotateY(-100deg)}
@keyframes act-knock{40%{transform:rotateY(-3deg)}}
.act-coin2d{top:22%;width:min(190px,48vw);aspect-ratio:1;border-radius:50%;display:grid;place-items:center;cursor:pointer;
  background:radial-gradient(circle at 35% 30%,#e3c49b,#b98a58);box-shadow:inset 0 0 0 7px rgba(0,0,0,.12),0 30px 60px -20px #000;animation:act-spin 2.4s linear infinite;transition:background .5s}
.act-coin2d img{width:46%;height:46%;object-fit:contain}
.act-coin2d.silver{background:radial-gradient(circle at 35% 30%,#ffffff,#b9bdc4 45%,#8c9098)}
.act-coin2d.gold{background:radial-gradient(circle at 35% 30%,#fff1b8,#e8b84a 45%,#a8761c)}
@keyframes act-spin{to{transform:translateX(-50%) rotateY(360deg)}}
.act-bit{position:absolute;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff1b8,#e0ad3c);pointer-events:none}
.act-ripple{position:absolute;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;border:2px solid rgba(255,230,190,.8);pointer-events:none;animation:act-ripple .6s ease-out forwards}
@keyframes act-ripple{to{transform:scale(5);opacity:0}}
.signed.reveal .act-piece,.signed.reveal .act-paper,.signed.reveal .act-pass{opacity:0;transition:opacity .8s ease}
`;

function style() {
  if (document.getElementById('act-css')) return;
  const s = document.createElement('style');
  s.id = 'act-css'; s.textContent = CSS;
  document.head.appendChild(s);
}

function piece(ctx, tag, cls, html = '') {
  const e = document.createElement(tag);
  e.className = cls; e.innerHTML = html;
  ctx.el.appendChild(e);
  return e;
}

function mid(e, fy = 0.5) {
  const r = e.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height * fy };
}

/* a loose piece of paper or a window: gravity, a spin, gone off the bottom */
function toss(ctx, e, { vx = 0, vy = 0, va = 0, g = 2400 } = {}) {
  let x = 0, y = 0, a = 0;
  ctx.onFrame(dt => {
    if (y > innerHeight + 600) return;
    dt = Math.min(dt, 0.05);
    vy += g * dt; vx *= 1 - 0.6 * dt;
    x += vx * dt; y += vy * dt; a += va * dt;
    e.style.translate = `${x}px ${y}px`;
    e.style.rotate = `${a}deg`;
  });
}

/* a drag that counts once it travels far enough, a tap that counts at once */
function gesture(e, onAct, { dist = 40 } = {}) {
  let down = null;
  e.addEventListener('pointerdown', ev => { down = { x: ev.clientX, y: ev.clientY }; e.setPointerCapture(ev.pointerId); });
  e.addEventListener('pointermove', ev => {
    if (!down) return;
    const dx = ev.clientX - down.x, dy = ev.clientY - down.y;
    if (Math.hypot(dx, dy) > dist) { onAct({ dx, dy }); down = null; }
  });
  e.addEventListener('pointerup', () => { if (down) onAct({ dx: 0, dy: 0 }); down = null; });
}

/* the flight uses Rapier wherever the 3d stage would have; never waits on it */
function physicsFlight(ctx) {
  if (ctx.mode === '3d') ctx.rapier().then(R => { if (!ctx.done) ctx.useRapier(R); }).catch(() => {});
}

function loadImage(src) {
  return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}

/* ── receipt ────────────────────────────────────────────────────── */
export async function receipt(ctx) {
  style(); physicsFlight(ctx);
  const { wait, say } = ctx;
  piece(ctx, 'div', 'act-piece act-printer');
  const paper = piece(ctx, 'div', 'act-paper', '<div class="roll"><pre></pre></div><div class="edge"></div>');
  paper.setAttribute('role', 'button'); paper.setAttribute('tabindex', '0'); paper.setAttribute('aria-label', 'Tear off the receipt');
  const roll = paper.querySelector('.roll'), pre = paper.querySelector('pre');
  const W = 28, row = (k, v) => k + ' '.repeat(Math.max(1, W - k.length - v.length)) + v, rule = '-'.repeat(W);
  const lines = ['     DATTA VELIVELA', '  PRODUCT + DESIGN, 3.5 YRS', rule,
    row('DOORS KNOCKED', '2,000'), row('FIRST ORDERS', '132'), row('DELIVERED BY HAND', '50+'),
    row('AI VISUALS', '700+'), row('BRANDS', '11'), rule, row('TOTAL', 'PROOF BY DOING'), '', '   THANK YOU FOR VISITING'];
  ctx.beat('print');
  await wait(500);
  for (const l of lines) {
    if (ctx.done) return null;
    pre.textContent += (pre.textContent ? '\n' : '') + l;
    roll.style.height = pre.scrollHeight + 'px';
    await wait(150);
  }
  ctx.beat('line');
  say('Everything here has a receipt.');
  await wait(1200); if (ctx.done) return null;
  ctx.hint('Pull the receipt to tear it off, or press Enter');
  let flick = { dx: 0, dy: 200 };
  gesture(paper, f => { flick = f; ctx.act(); });
  await ctx.awaitAction(3000);
  if (ctx.done) return null;
  ctx.emit('act_done', { intro: 'receipt' });
  paper.classList.add('torn');
  toss(ctx, paper, { vx: flick.dx * 3, vy: 120 + Math.max(0, flick.dy), va: (flick.dx || 30) * 0.4 });
  await wait(450);
  return mid(ctx.el.querySelector('.act-printer'), 0.8);
}

/* ── deploy ─────────────────────────────────────────────────────── */
export async function deploy(ctx) {
  style(); physicsFlight(ctx);
  const { wait, say } = ctx;
  const term = piece(ctx, 'div', 'act-piece act-term', '<div class="bar"><i></i><i></i><i></i></div><pre aria-hidden="true"></pre><button type="button">Deploy &#9650;</button>');
  const pre = term.querySelector('pre'), btn = term.querySelector('button');
  const caret = '<span class="caret"></span>';
  let out = '';
  const show = () => { pre.innerHTML = out + caret; };
  const add = html => { out += html; show(); };
  ctx.beat('type');
  add('<span class="dim">datta@dv ~/portfolio %</span> ');
  await wait(400);
  for (const ch of 'git push origin main') { if (ctx.done) return null; add(ch); await wait(45); }
  add('\n');
  await wait(300);
  add('<span class="dim">Enumerating objects: 3.5 years of work, done.</span>\n');
  await wait(400); if (ctx.done) return null;
  ctx.beat('line');
  say('Design, build, sell. Then ship it.');
  btn.classList.add('on');
  ctx.hint('Press Enter or click Deploy');
  btn.addEventListener('click', () => ctx.act());
  await ctx.awaitAction(3000);
  if (ctx.done) return null;
  btn.classList.remove('on');
  ctx.emit('act_done', { intro: 'deploy' });
  add('\n<span class="tri">&#9650; Building dattavelivela.xyz</span>\n');
  for (const [k, v] of [['design', "Procol's agentic products, concept to production"], ['build ', 'Intake AI and the demo platform, built solo'],
    ['sell  ', '700+ AI visuals for 11 brands'], ['ship  ', "2,000 doors for Rinso's first 132 orders"]]) {
    await wait(220); if (ctx.done) return null;
    add(`  <span class="ok">&#10003;</span> ${k}  <span class="dim">${v}</span>\n`);
  }
  await wait(260);
  add('<span class="tri">&#9650; Deployed.</span>\n');
  await wait(500); if (ctx.done) return null;
  const o = mid(term, 0.5);
  toss(ctx, term, { vx: 0, vy: 80, va: -14 });
  return o;
}

/* ── boarding ───────────────────────────────────────────────────── */
function drawPass(c, to) {
  const x = c.getContext('2d'), w = c.width, h = c.height;
  x.fillStyle = '#f4efe2'; x.beginPath(); x.roundRect(0, 0, w, h, [16, 0, 0, 16]); x.fill();
  x.fillStyle = '#22386b'; x.fillRect(0, 0, w, 70);
  x.fillStyle = '#e9eefb'; x.font = `700 24px ${MONO}`; x.letterSpacing = '4px'; x.textBaseline = 'middle';
  x.fillText('BOARDING PASS', 30, 36); x.textAlign = 'right'; x.fillText('DV 0350', w - 30, 36); x.textAlign = 'left';
  x.letterSpacing = '0px'; x.textBaseline = 'alphabetic';
  const field = (k, v, X, Y, size = 44) => {
    x.fillStyle = 'rgba(31,35,51,.55)'; x.font = `400 18px ${MONO}`; x.letterSpacing = '2px'; x.fillText(k, X, Y); x.letterSpacing = '0px';
    x.fillStyle = INK; x.font = `700 ${size}px ${SANS}`;
    let s = size; while (x.measureText(v).width > w - X - 30 && s > 20) { s -= 2; x.font = `700 ${s}px ${SANS}`; }
    x.fillText(v, X, Y + s + 6);
  };
  field('PASSENGER', to || 'YOU', 30, 112);
  field('CARRIER', 'DATTA VELIVELA', 30, 206, 32);
  field('DESTINATION', 'BUILD SOMETHING', 30, 286, 40);
}
function drawStub(c) {
  const x = c.getContext('2d'), w = c.width, h = c.height;
  x.fillStyle = '#f4efe2'; x.beginPath(); x.roundRect(0, 0, w, h, [0, 16, 16, 0]); x.fill();
  x.fillStyle = '#22386b'; x.fillRect(0, 0, w, 70);
  x.strokeStyle = 'rgba(31,35,51,.35)'; x.setLineDash([8, 9]); x.lineWidth = 3;
  x.beginPath(); x.moveTo(2, 80); x.lineTo(2, h - 10); x.stroke(); x.setLineDash([]);
  const f = (k, v, Y) => {
    x.fillStyle = 'rgba(31,35,51,.55)'; x.font = `400 18px ${MONO}`; x.fillText(k, 26, Y);
    x.fillStyle = INK; x.font = `700 38px ${SANS}`; x.fillText(v, 26, Y + 44);
  };
  f('SEAT', '01A', 112); f('GATE', 'OPEN', 206);
  x.fillStyle = INK;
  for (let p = 26; p < w - 26; p += 7) if ((p * 7) % 5 > 1) x.fillRect(p, h - 70, 3, 44);
}
export async function boarding(ctx) {
  style(); physicsFlight(ctx);
  const { wait, say, to } = ctx;
  await labelFonts();
  piece(ctx, 'div', 'act-piece act-pass-slot');
  const pass = piece(ctx, 'div', 'act-pass', '<canvas class="main" width="740" height="380" aria-hidden="true"></canvas><canvas class="stub" width="260" height="380" aria-hidden="true"></canvas>');
  drawPass(pass.querySelector('.main'), to); drawStub(pass.querySelector('.stub'));
  const stub = pass.querySelector('.stub');
  stub.setAttribute('role', 'button'); stub.setAttribute('aria-label', 'Tear off the stub');
  // slides out of the slot on a spring
  let y = -260, vy = 0, live = true;
  pass.style.translate = `0 ${y}px`;
  ctx.onFrame(dt => {
    if (!live) return;
    dt = Math.min(dt, 0.05);
    vy += (-140 * y - 16 * vy) * dt; y += vy * dt;
    pass.style.translate = `0 ${y}px`;
    if (Math.abs(y) < 0.2 && Math.abs(vy) < 1) { live = false; pass.style.translate = '0 0'; }
  });
  ctx.beat('print');
  await wait(1400); if (ctx.done) return null;
  ctx.beat('line');
  say("One seat, held for you.");
  await wait(1300); if (ctx.done) return null;
  ctx.hint('Tear off the stub, or press Enter');
  let flick = { dx: 120, dy: 60 };
  gesture(stub, f => { flick = f; ctx.act(); }, { dist: 30 });
  await ctx.awaitAction(3000);
  if (ctx.done) return null;
  ctx.emit('act_done', { intro: 'boarding' });
  // the stub comes away on its own and falls
  const r = stub.getBoundingClientRect();
  const loose = document.createElement('div');
  loose.className = 'act-piece'; loose.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top}px;width:${r.width}px`;
  stub.style.width = '100%';
  loose.appendChild(stub); ctx.el.appendChild(loose);
  pass.querySelector('.main').style.width = '74%';
  toss(ctx, loose, { vx: 200 + flick.dx * 2, vy: -260 + flick.dy, va: 160 });
  await wait(420);
  return mid(pass.querySelector('.main'), 0.5);
}

/* ── shared 3d stage for knock and collect ─────────────────────── */
async function stage3d(ctx, { fov, pos, look, env = 0.3 }) {
  const [THREE, { RoomEnvironment }, R] = await Promise.all([
    import('three'), import('three/addons/environments/RoomEnvironment.js'), ctx.rapier(),
  ]);
  const canvas = document.createElement('canvas');
  canvas.className = 'signed-gl'; canvas.setAttribute('aria-hidden', 'true');
  ctx.el.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x0e0e10, 1);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0e0e10, 400, 900);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = env;
  pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(fov, 1, 5, 2000);
  const size = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.position.set(...pos); camera.lookAt(...look); camera.updateProjectionMatrix();
  };
  size(); addEventListener('resize', size);
  const world = new R.World({ x: 0, y: -981, z: 0 });
  if ('lengthUnit' in world.integrationParameters) world.integrationParameters.lengthUnit = 100;
  ctx.useRapier(R);
  ctx.onDispose(() => { removeEventListener('resize', size); world.free(); renderer.dispose(); });
  const toScreen = v => {
    const p = v.clone().project(camera);
    return { x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight };
  };
  return { THREE, R, canvas, renderer, scene, camera, world, toScreen };
}

/* run a Rapier world on a fixed step with interpolated meshes */
function stepper(ctx, S, tracked, before) {
  const { THREE, world, renderer, scene, camera } = S;
  let acc = 0, t = 0;
  const snap = b => { const p = b.translation(), r = b.rotation(); return { p: new THREE.Vector3(p.x, p.y, p.z), q: new THREE.Quaternion(r.x, r.y, r.z, r.w) }; };
  ctx.onFrame(dt => {
    acc += Math.min(dt, 0.1);
    while (acc >= 1 / 60) {
      acc -= 1 / 60; t += 1 / 60;
      if (before) before(t);
      for (const k of tracked) k.prev = k.cur || snap(k.body);
      world.step();
      for (const k of tracked) k.cur = snap(k.body);
    }
    const a = acc * 60;
    for (const k of tracked) if (k.prev) { k.mesh.position.lerpVectors(k.prev.p, k.cur.p, a); k.mesh.quaternion.slerpQuaternions(k.prev.q, k.cur.q, a); }
    renderer.render(scene, camera);
  });
}

/* ── knock ──────────────────────────────────────────────────────── */
export async function knock(ctx) {
  const { wait, say } = ctx;
  if (ctx.mode === '3d') {
    const S = await Promise.race([stage3d(ctx, { fov: 36, pos: [0, 120, 480], look: [0, 92, 0], env: 0.22 }).catch(() => null), wait(6000).then(() => null)]);
    if (ctx.done) return null;
    if (S) return knock3d(ctx, S);
    ctx.mode = '2d';
  }
  style();
  const door = piece(ctx, 'div', 'act-piece act-door2d', '<i></i>');
  door.setAttribute('role', 'button'); door.setAttribute('tabindex', '0'); door.setAttribute('aria-label', 'Knock on the door');
  await wait(700); if (ctx.done) return null;
  say("I knocked on 2,000 doors for Rinso's first 132 orders.");
  await wait(1500); if (ctx.done) return null;
  ctx.hint('Knock twice, or press Enter');
  let knocks = 0;
  door.addEventListener('click', () => {
    door.classList.remove('knock'); void door.offsetWidth; door.classList.add('knock');
    if (++knocks >= 2) ctx.act();
  });
  await ctx.awaitAction(3000);
  if (ctx.done) return null;
  ctx.emit('act_done', { intro: 'knock' });
  say('Come in.');
  door.classList.add('open');
  await wait(800);
  return mid(door, 0.5);
}

async function knock3d(ctx, S) {
  const { THREE, R, scene, world, canvas, toScreen } = S;
  const { wait, say } = ctx;
  const DW = 92, DH = 196, DT = 4.5;
  const std = o => new THREE.MeshStandardMaterial(o);
  // porch light, and the warm room behind the door
  const spot = new THREE.SpotLight(0xffe2bc, 3.4, 0, 0.55, 0.6, 0);
  spot.position.set(30, 330, 220); spot.target.position.set(0, 60, 0);
  spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0003;
  scene.add(spot, spot.target, new THREE.HemisphereLight(0xfff2e0, 0x1a1612, 0.12));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), std({ color: 0x2b2724, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallMat = std({ color: 0x3a342f, roughness: 0.95 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
  add(new THREE.BoxGeometry(400, 330, 20), wallMat, -(DW / 2 + 9) - 200, 165, -14);
  add(new THREE.BoxGeometry(400, 330, 20), wallMat, (DW / 2 + 9) + 200, 165, -14);
  add(new THREE.BoxGeometry(DW + 18, 330 - DH - 10, 20), wallMat, 0, DH + 10 + (330 - DH - 10) / 2, -14);
  const frameMat = std({ color: 0xece6d8, roughness: 0.8 });
  add(new THREE.BoxGeometry(9, DH + 10, 26), frameMat, -DW / 2 - 4.5, (DH + 10) / 2, -10);
  add(new THREE.BoxGeometry(9, DH + 10, 26), frameMat, DW / 2 + 4.5, (DH + 10) / 2, -10);
  add(new THREE.BoxGeometry(DW + 18, 10, 28), frameMat, 0, DH + 5, -10);
  const room = new THREE.Mesh(new THREE.PlaneGeometry(DW + 40, DH + 40), new THREE.MeshBasicMaterial({ color: 0xffcf8a, toneMapped: false }));
  room.position.set(0, DH / 2, -90); scene.add(room);
  const inside = new THREE.PointLight(0xffc77a, 0, 0, 0); inside.position.set(0, 120, -60); scene.add(inside);
  // the doormat from the shelf
  const matImg = await loadImage(ASSET('shelf/mat.svg'));
  const mc = document.createElement('canvas'); mc.width = 980; mc.height = 400;
  if (matImg) mc.getContext('2d').drawImage(matImg, 0, 0, 980, 400);
  const mt = new THREE.CanvasTexture(mc); mt.colorSpace = THREE.SRGBColorSpace;
  const coir = std({ color: 0x8a5d2e, roughness: 1 });
  add(new THREE.BoxGeometry(110, 2, 45), [coir, coir, std({ map: mt, color: 0xb89a7c, roughness: 1 }), coir, coir, coir], 0, 1, 34);
  // the door: the shelf's own drawing on a slab, a brass knob
  const dImg = await loadImage(ASSET('shelf/door.svg'));
  const dc = document.createElement('canvas'); dc.width = 520; dc.height = 1105;
  if (dImg) dc.getContext('2d').drawImage(dImg, 0, 0, 520, 1105);
  const dt = new THREE.CanvasTexture(dc); dt.colorSpace = THREE.SRGBColorSpace;
  const edge = std({ color: 0x5b3a22, roughness: 0.7 });
  const slab = new THREE.Group(); scene.add(slab);
  const face = new THREE.Mesh(new THREE.BoxGeometry(DW, DH, DT), [edge, edge, edge, edge, std({ map: dt, roughness: 0.65 }), edge]);
  face.position.set(DW / 2, DH / 2, 0); face.castShadow = face.receiveShadow = true; slab.add(face);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(3.4, 32, 16), std({ color: 0xd9a944, metalness: 1, roughness: 0.25 }));
  knob.position.set(DW - 9, 92, DT / 2 + 3.2); knob.castShadow = true; slab.add(knob);
  slab.position.set(-DW / 2, 0, -14);

  // physics: a fixed frame and the slab on a hinge down its left edge
  const frame = world.createRigidBody(R.RigidBodyDesc.fixed());
  const body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(-DW / 2, 0, -14).setAngularDamping(0.4).enabledTranslations(false, false, false));
  world.createCollider(R.ColliderDesc.cuboid(DW / 2, DH / 2, DT / 2).setTranslation(DW / 2, DH / 2, 0).setDensity(0.0008).setCollisionGroups(0x00020000), body);
  world.createImpulseJoint(R.JointData.revolute({ x: -DW / 2, y: 0, z: -14 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }), frame, body, true);
  const I = body.mass() * DW * DW / 3;
  let target = 0, k = 420, c = 26;
  stepper(ctx, S, [{ body, mesh: slab }], () => {
    // the door's angle about the hinge; the latch is a stiff spring at 0
    const q = body.rotation(), a = 2 * Math.atan2(q.y, q.w), w = body.angvel().y;
    let acc = k * (target - a) - c * w;
    if (a < 0) acc += 4000 * -a;
    body.resetTorques(true); body.addTorque({ x: 0, y: acc * I, z: 0 }, true);
  });

  ctx.beat('arrive');
  await wait(700); if (ctx.done) return null;
  ctx.beat('line');
  say("I knocked on 2,000 doors for Rinso's first 132 orders.");
  await wait(1500); if (ctx.done) return null;
  ctx.hint('Knock twice on the door, or press Enter');
  // a knock: a sharp push the latch takes back, and a ring where it landed
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let knocks = 0;
  canvas.addEventListener('pointerdown', e => {
    ndc.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1);
    ray.setFromCamera(ndc, S.camera);
    if (!ray.intersectObject(slab, true).length) return;
    body.applyTorqueImpulse({ x: 0, y: I * 1.6, z: 0 }, true);
    const ring = document.createElement('i'); ring.className = 'act-ripple';
    ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px';
    ctx.el.appendChild(ring); setTimeout(() => ring.remove(), 700);
    if (++knocks >= 2) setTimeout(() => ctx.act(), 220);
  });
  style();
  await ctx.awaitAction(3000);
  if (ctx.done) return null;
  ctx.emit('act_done', { intro: 'knock' });
  say('Come in.');
  // unlatched: it swings in on its own weight and a softer spring
  target = 1.75; k = 52; c = 8;
  ctx.onFrame(dt => { inside.intensity = Math.min(1.6, inside.intensity + dt * 1.4); });
  await wait(1300);
  return toScreen(new THREE.Vector3(0, DH * 0.55, -40));
}

/* ── collect ────────────────────────────────────────────────────── */
const STAGES = [
  { logo: 'pinelabs.svg', line: 'Pine Labs, early 2023: payments for retailers.', color: 0xc49a6c, metal: 0, rough: 0.9 },
  { logo: 'dukaan.png', line: 'Dukaan, 2023-24: PM, design and support in a team of 15.', color: 0xd9dce0, metal: 1, rough: 0.24 },
  { logo: 'procol-mark.svg', line: 'Procol, 2024 to now: Senior Product Designer.', color: 0xe8b84a, metal: 1, rough: 0.22 },
];

export async function collect(ctx) {
  const { wait, say } = ctx;
  const logos = await Promise.all(STAGES.map(s => loadImage(ASSET(s.logo))));
  if (ctx.mode === '3d') {
    const S = await Promise.race([stage3d(ctx, { fov: 32, pos: [0, 0, 120], look: [0, 0, 0], env: 1 }).catch(() => null), wait(6000).then(() => null)]);
    if (ctx.done) return null;
    if (S) return collect3d(ctx, S, logos);
    ctx.mode = '2d';
  }
  style();
  const coin = piece(ctx, 'div', 'act-piece act-coin2d', '<img alt="">');
  coin.setAttribute('role', 'button'); coin.setAttribute('tabindex', '0'); coin.setAttribute('aria-label', 'Tap the sticker');
  const img = coin.querySelector('img');
  for (let i = 0; i < STAGES.length; i++) {
    img.src = ASSET(STAGES[i].logo);
    coin.classList.toggle('silver', i === 1); coin.classList.toggle('gold', i === 2);
    say(STAGES[i].line);
    await wait(1500); if (ctx.done) return null;
  }
  say('Tap it to make it rain.');
  ctx.hint('Tap the sticker, or press Enter');
  coin.addEventListener('click', () => ctx.act());
  await ctx.awaitAction(3000);
  if (ctx.done) return null;
  ctx.emit('act_done', { intro: 'collect' });
  const o = mid(coin, 0.5);
  coin.style.opacity = '0';
  for (let i = 0; i < 36; i++) {
    const b = document.createElement('i'); b.className = 'act-bit';
    b.style.left = o.x + 'px'; b.style.top = o.y + 'px'; ctx.el.appendChild(b);
    const a = ctx.rnd() * Math.PI * 2, sp = 300 + ctx.rnd() * 500;
    let x = 0, y = 0, vx = Math.cos(a) * sp, vy = Math.sin(a) * sp - 400;
    ctx.onFrame(dt => { dt = Math.min(dt, 0.05); vy += 1800 * dt; x += vx * dt; y += vy * dt; b.style.translate = `${x}px ${y}px`; });
  }
  await wait(400);
  return o;
}

async function collect3d(ctx, S, logos) {
  const { THREE, R, scene, world, canvas, toScreen } = S;
  const { wait, say } = ctx;
  // a beam of light from above, the sticker turning in it
  const beam = new THREE.Mesh(new THREE.ConeGeometry(34, 160, 48, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff4dd, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  beam.position.y = 50; scene.add(beam);
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(40, 80, 90); scene.add(key);
  scene.add(new THREE.HemisphereLight(0xfff8ee, 0x221e1a, 0.3));
  const faceCanvas = document.createElement('canvas'); faceCanvas.width = faceCanvas.height = 512;
  const faceTex = new THREE.CanvasTexture(faceCanvas); faceTex.colorSpace = THREE.SRGBColorSpace;
  const drawFace = (i) => {
    const x = faceCanvas.getContext('2d');
    x.clearRect(0, 0, 512, 512);
    x.fillStyle = '#ffffff'; x.beginPath(); x.arc(256, 256, 256, 0, 7); x.fill();
    x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 10; x.beginPath(); x.arc(256, 256, 226, 0, 7); x.stroke();
    if (logos[i]) { const s = 230, r = logos[i].width / logos[i].height || 1; const w = r >= 1 ? s : s * r, h = r >= 1 ? s / r : s; x.drawImage(logos[i], 256 - w / 2, 256 - h / 2, w, h); }
    faceTex.needsUpdate = true;
  };
  const rim = new THREE.MeshPhysicalMaterial({ color: STAGES[0].color, metalness: 0, roughness: 0.9 });
  const face = new THREE.MeshPhysicalMaterial({ map: faceTex, color: 0xffffff, metalness: 0, roughness: 0.8, clearcoat: 0.6 });
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 2.4, 96), [rim, face, face]);
  coin.rotation.x = Math.PI / 2; scene.add(coin);
  const spin = new THREE.Group(); spin.add(coin); scene.add(spin);
  drawFace(0);
  // turn it, and ease its material from one stage to the next
  let stage = 0, mix = 1, from = { ...STAGES[0] }, visible = true;
  const col = new THREE.Color(), c0 = new THREE.Color(), c1 = new THREE.Color();
  const tracked = [];
  stepper(ctx, S, tracked);
  ctx.onFrame(dt => {
    if (!visible) return;
    spin.rotation.y += dt * 2.2;
    if (mix < 1) {
      mix = Math.min(1, mix + dt * 2);
      const to = STAGES[stage];
      c0.setHex(from.color); c1.setHex(to.color); col.copy(c0).lerp(c1, mix);
      rim.color.copy(col); rim.metalness = from.metal + (to.metal - from.metal) * mix; rim.roughness = from.rough + (to.rough - from.rough) * mix;
      face.metalness = rim.metalness * 0.5; face.color.copy(col).lerp(new THREE.Color(0xffffff), 0.3);
      const pop = 1 + Math.sin(mix * Math.PI) * 0.08; spin.scale.setScalar(pop);
    }
  });
  const toStage = i => { from = { color: rim.color.getHex(), metal: rim.metalness, rough: rim.roughness }; stage = i; mix = 0; drawFace(i); };
  ctx.beat('collect');
  for (let i = 0; i < STAGES.length; i++) {
    if (i) toStage(i);
    say(STAGES[i].line);
    await wait(1500); if (ctx.done) return null;
  }
  say('Tap it to make it rain.');
  ctx.hint('Tap the sticker, or press Enter');
  canvas.addEventListener('pointerdown', () => ctx.act());
  await ctx.awaitAction(3000);
  if (ctx.done) return null;
  ctx.emit('act_done', { intro: 'collect' });
  // it bursts into small gold stickers that rain out of the frame
  visible = false; spin.visible = false;
  const bitGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.5, 32);
  for (let i = 0; i < 42; i++) {
    const m = new THREE.Mesh(bitGeo, rim); scene.add(m);
    const a = ctx.rnd() * Math.PI * 2, sp = 60 + ctx.rnd() * 110;
    const b = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation((ctx.rnd() - 0.5) * 10, (ctx.rnd() - 0.5) * 10, 0)
      .setLinvel(Math.cos(a) * sp, Math.sin(a) * sp + 120, (ctx.rnd() - 0.5) * 60)
      .setAngvel({ x: (ctx.rnd() - 0.5) * 20, y: (ctx.rnd() - 0.5) * 20, z: (ctx.rnd() - 0.5) * 20 }));
    world.createCollider(R.ColliderDesc.cylinder(0.25, 2.4).setDensity(0.002).setCollisionGroups(0x00020002), b);
    tracked.push({ body: b, mesh: m });
  }
  world.gravity = { x: 0, y: -260, z: 0 };
  await wait(450);
  return toScreen(new THREE.Vector3(0, 0, 0));
}
