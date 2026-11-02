/* "Signed for": the page arrives as a parcel.

   A parcel drops onto a doormat in one pool of light, the visitor tears the
   tape, the flaps swing open, and the things on the shelf below fly out of
   it to where they live on the page. Arrival here, departure at the footer
   suitcase.

   The flight drives the real shelf objects, not copies: each .thing gets a
   physics offset (--fx/--fy/--fr/--fs) on top of its own layout transform,
   and a spring pulls that offset to zero. When it reaches zero the thing is
   exactly where the page put it, so there is no hand-off to see.

   '3d' runs the parcel in three.js with Rapier for the drop, the tape, the
   flaps and the flight. '2d' (phones, slow machines) keeps the story with
   an HTML parcel and a small spring integrator, and loads neither. */

import { drawShippingLabel, labelFonts, recipient } from './label.js';

const RAPIER_URL = 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.14.0/rapier.es.js';
const STEP = 1 / 60;
const emit = (name, props) => window.dvEmit && window.dvEmit(name, props);

export function seeded(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function labelRows(to) {
  return [['TO', to || 'YOU'], ['FROM', 'DATTA VELIVELA'], ['CONTENTS', '3.5 YEARS OF WORK']];
}

/* ── the overlay ────────────────────────────────────────────────── */
function overlay(to) {
  const el = document.createElement('section');
  el.className = 'signed';
  el.setAttribute('aria-label', 'Intro');
  el.innerHTML = '<p class="signed-sr"></p><p class="signed-line" aria-live="polite"></p>' +
    '<p class="signed-hint"></p><button class="signed-skip" type="button">Skip intro</button>';
  el.querySelector('.signed-sr').textContent =
    `A parcel from Datta Velivela, addressed to ${to ? to.toLowerCase() : 'you'}. Contents: 3.5 years of work.`;
  document.body.appendChild(el);
  return el;
}

/* ── the flight: shelf things out of the parcel and home ───────────
   Positions are in hundreds of pixels with y up, so gravity and springs
   read in sensible numbers. */
const K = 30, C = 7.8, KR = 34, CR = 8, G = 12;

function targets() {
  const shelf = document.querySelector('.shelf');
  const r = shelf.getBoundingClientRect();
  const floor = parseFloat(getComputedStyle(shelf).getPropertyValue('--floor')) || 0;
  return [...shelf.querySelectorAll('.thing')].map(t => ({
    el: t,
    x: r.left + (parseFloat(t.style.getPropertyValue('--x')) || 0) + t.offsetWidth / 2,
    y: r.top + shelf.clientHeight - floor,
    caption: (t.querySelector('figcaption') || {}).textContent || '',
  }));
}

function paint(t, s) {
  const st = t.el.style;
  st.setProperty('--fx', (s.x * 100).toFixed(2) + 'px');
  st.setProperty('--fy', (-s.y * 100).toFixed(2) + 'px');
  st.setProperty('--fr', (s.a * 57.2958).toFixed(2) + 'deg');
  st.setProperty('--fs', s.s.toFixed(4));
}

function release(t) {
  const st = t.el.style;
  ['--fx', '--fy', '--fr', '--fs', 'transition'].forEach(p => st.removeProperty(p));
  t.el.classList.remove('flying');
  t.el.classList.add('arrived');
}

/* one object's launch: from the parcel mouth, up and out, then home */
function launchState(t, origin, rnd) {
  return {
    x: (origin.x - t.x) / 100, y: -(origin.y - t.y) / 100,
    vx: (rnd() - 0.5) * 3.4, vy: 8.6 + rnd() * 1.8,
    a: (rnd() - 0.5) * 1.4, va: (rnd() - 0.5) * 9,
    s: 0.18, age: 0,
  };
}

function scaleAt(age) {
  // grows out of the box: quick, with a little overshoot
  const k = Math.min(1, age / 0.75);
  return 0.18 + 0.82 * (1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2));
}

function settled(s) {
  return Math.abs(s.x) + Math.abs(s.y) < 0.004 && Math.abs(s.vx) + Math.abs(s.vy) < 0.04 &&
    Math.abs(s.a) < 0.003 && Math.abs(s.va) < 0.04 && s.age > 0.8;
}

/* the 2D integrator, for when Rapier is not loaded */
function springStep(s, dt) {
  const g = G * Math.max(0, 1 - s.age / 0.7);
  s.vx += (-K * s.x - C * s.vx) * dt;
  s.vy += (-K * s.y - C * s.vy - g) * dt;
  s.va += (-KR * s.a - CR * s.va) * dt;
  s.x += s.vx * dt; s.y += s.vy * dt; s.a += s.va * dt;
}

/* the same flight in Rapier: one dynamic body per thing, rotation about z
   only, no collisions; a spring force and torque pull it home */
function rapierFlight(R) {
  const world = new R.World({ x: 0, y: 0, z: 0 });
  const bodies = new Map();
  return {
    add(s) {
      const b = world.createRigidBody(R.RigidBodyDesc.dynamic()
        .setTranslation(s.x, s.y, 0).setLinvel(s.vx, s.vy, 0).setAngvel({ x: 0, y: 0, z: s.va })
        .setRotation({ x: 0, y: 0, z: Math.sin(s.a / 2), w: Math.cos(s.a / 2) })
        .enabledRotations(false, false, true).enabledTranslations(true, true, false));
      world.createCollider(R.ColliderDesc.ball(0.5).setDensity(1 / (4 / 3 * Math.PI * 0.125)).setCollisionGroups(0x00080000), b);
      bodies.set(s, b);
    },
    step(list) {
      for (const s of list) {
        const b = bodies.get(s); if (!b) continue;
        const p = b.translation(), v = b.linvel(), q = b.rotation(), w = b.angvel();
        const a = 2 * Math.atan2(q.z, q.w), m = b.mass(), I = 0.1; // a unit-mass ball of radius .5
        const g = G * Math.max(0, 1 - s.age / 0.7);
        b.resetForces(true); b.resetTorques(true);
        b.addForce({ x: m * (-K * p.x - C * v.x), y: m * (-K * p.y - C * v.y - g), z: 0 }, true);
        b.addTorque({ x: 0, y: 0, z: I * (-KR * a - CR * w.z) }, true);
      }
      world.step();
      for (const s of list) {
        const b = bodies.get(s); if (!b) continue;
        const p = b.translation(), v = b.linvel(), q = b.rotation();
        s.x = p.x; s.y = p.y; s.vx = v.x; s.vy = v.y; s.a = 2 * Math.atan2(q.z, q.w); s.va = b.angvel().z;
      }
    },
    remove(s) { const b = bodies.get(s); if (b) { world.removeRigidBody(b); bodies.delete(s); } },
    free() { world.free(); },
  };
}

/* ── the parcel scene (3d) ──────────────────────────────────────── */
async function parcelScene(canvas, to, { poster = false } = {}) {
  const [THREE, { RoomEnvironment }, R] = await Promise.all([
    import('three'), import('three/addons/environments/RoomEnvironment.js'),
    poster ? Promise.resolve(null) : loadRapier(),
  ]);
  await labelFonts();

  const rnd = seeded(20240807);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: poster, preserveDrawingBuffer: poster });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x0e0e10, poster ? 0 : 1);

  const scene = new THREE.Scene();
  if (!poster) scene.fog = new THREE.Fog(0x0e0e10, 150, 300);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = poster ? 0.7 : 0.18;
  pmrem.dispose();

  // one warm pool of light from above, a faint cool edge from behind
  const spot = new THREE.SpotLight(0xffe7cc, poster ? 3.2 : 4.6, 0, 0.4, 0.7, 0);
  spot.position.set(16, 150, 46); spot.target.position.set(0, 0, 2);
  spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048);
  spot.shadow.bias = -0.0002; spot.shadow.normalBias = 0.04; spot.shadow.radius = 5;
  Object.assign(spot.shadow.camera, { near: 60, far: 260 });
  scene.add(spot, spot.target);
  const rim = new THREE.DirectionalLight(0xa9bcff, 0.35); rim.position.set(-80, 60, -90); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xfff2e0, 0x1a1612, poster ? 0.5 : 0.1));

  // the floor, lost in the dark beyond the light
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(900, 900),
    poster ? new THREE.ShadowMaterial({ opacity: 0.22 }) : new THREE.MeshStandardMaterial({ color: 0x2b2724, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  /* textures, all drawn here */
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (c, rep) => {
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); }
    return t;
  };
  const kraft = (base, dark) => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) {
      x.fillStyle = `rgba(${dark},${0.04 + rnd() * 0.09})`;
      x.fillRect(rnd() * 512, rnd() * 512, 20 + rnd() * 90, 0.8 + rnd() * 1.2);
    }
    for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(255,240,210,${rnd() * 0.06})`; x.fillRect(rnd() * 512, rnd() * 512, 1.5, 1.5); }
    return c;
  };
  const outer = new THREE.MeshStandardMaterial({ map: tex(kraft('#b78f63', '84,58,30'), [1.2, 1.2]), roughness: 0.92 });
  const inner = new THREE.MeshStandardMaterial({ map: tex(kraft('#9c7650', '64,42,20'), [1.2, 1.2]), roughness: 0.95 });
  const edge = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.9 });

  // the doormat from the shelf's Rinso door: the same drawing, now under the parcel
  const matImg = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = new URL('../shelf/mat.svg', import.meta.url).href; });
  const mc = document.createElement('canvas'); mc.width = 980; mc.height = 400;
  if (matImg) mc.getContext('2d').drawImage(matImg, 0, 0, 980, 400);
  const coir = new THREE.MeshStandardMaterial({ color: 0x8a5d2e, roughness: 1 });
  const MAT = { w: 80, h: 1.4, d: 33 };
  const mat = new THREE.Mesh(new THREE.BoxGeometry(MAT.w, MAT.h, MAT.d),
    [coir, coir, new THREE.MeshStandardMaterial({ map: tex(mc), color: 0xb89a7c, roughness: 1 }), coir, coir, coir]);
  mat.position.y = MAT.h / 2; mat.receiveShadow = true; mat.castShadow = true; scene.add(mat);
  const TOP = MAT.h;

  /* the parcel: an open box with flaps, built thin-walled so it can open */
  const P = { hx: 16, hy: 10.5, hz: 12, t: 0.5 };
  const box = new THREE.Group(); scene.add(box);
  const wall = (w, h, d, x, y, z, innerFace) => {
    const mats = [outer, outer, edge, outer, outer, outer]; mats[innerFace] = inner;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; box.add(m); return m;
  };
  wall(P.hx * 2, P.t, P.hz * 2, 0, -P.hy + P.t / 2, 0, 2);
  wall(P.hx * 2, P.hy * 2, P.t, 0, 0, P.hz - P.t / 2, 5);
  wall(P.hx * 2, P.hy * 2, P.t, 0, 0, -P.hz + P.t / 2, 4);
  wall(P.t, P.hy * 2, P.hz * 2 - P.t * 2, -P.hx + P.t / 2, 0, 0, 0);
  wall(P.t, P.hy * 2, P.hz * 2 - P.t * 2, P.hx - P.t / 2, 0, 0, 1);

  // tissue paper inside, crumpled
  const tg = new THREE.PlaneGeometry(P.hx * 2 - 1.4, P.hz * 2 - 1.4, 40, 30);
  const tp = tg.attributes.position;
  for (let i = 0; i < tp.count; i++) tp.setZ(i, Math.sin(tp.getX(i) * 0.9 + rnd()) * 0.5 + Math.cos(tp.getY(i) * 1.3) * 0.6 + rnd() * 0.5);
  tg.computeVertexNormals();
  const tissue = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ color: 0xf3eee4, roughness: 0.85, side: THREE.DoubleSide }));
  tissue.rotation.x = -Math.PI / 2; tissue.position.y = -P.hy + 7; tissue.receiveShadow = true; box.add(tissue);

  // the label on the front
  const lc = document.createElement('canvas'); lc.width = 900; lc.height = 540;
  drawShippingLabel(lc.getContext('2d'), 900, 540, { rows: labelRows(to), code: 'DV-0350', seed: 9 });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(15.5, 9.3), new THREE.MeshStandardMaterial({ map: tex(lc), roughness: 0.75 }));
  label.position.set(-P.hx + 9.6, -0.6, P.hz + 0.03); label.rotation.z = 0.025; label.receiveShadow = true; box.add(label);

  // flaps: each on a pivot at its hinge, closed to start
  const flaps = [];
  const flap = (pivot, size, offset, axis, open) => {
    const piv = new THREE.Group(); piv.position.set(...pivot); box.add(piv);
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), [outer, outer, outer, inner, outer, outer]);
    m.position.set(...offset); m.castShadow = m.receiveShadow = true; piv.add(m);
    flaps.push({ piv, size, offset, axis, open, delay: flaps.length > 1 ? 0.14 : 0 });
  };
  flap([0, P.hy, P.hz], [P.hx * 2 - 0.2, P.t, P.hz - 0.1], [0, P.t / 2, -(P.hz - 0.1) / 2], [1, 0, 0], 1);
  flap([0, P.hy, -P.hz], [P.hx * 2 - 0.2, P.t, P.hz - 0.1], [0, P.t / 2, (P.hz - 0.1) / 2], [1, 0, 0], -1);
  flap([-P.hx, P.hy - P.t, 0], [P.hx * 0.8, P.t, P.hz * 2 - 1.2], [P.hx * 0.4, P.t / 2, 0], [0, 0, 1], 1);
  flap([P.hx, P.hy - P.t, 0], [P.hx * 0.8, P.t, P.hz * 2 - 1.2], [-P.hx * 0.4, P.t / 2, 0], [0, 0, 1], -1);

  // packing tape over the seam, printed with the site, in tearable pieces
  const tc = document.createElement('canvas'); tc.width = 2048; tc.height = 128;
  const tx = tc.getContext('2d'); tx.fillStyle = '#9a6a2e'; tx.fillRect(0, 0, 2048, 128);
  tx.fillStyle = 'rgba(255,238,210,.72)'; tx.font = '700 46px "Space Mono", monospace'; tx.textBaseline = 'middle';
  for (let X = 10; X < 2048; X += 560) tx.fillText('DATTAVELIVELA.XYZ ·', X, 66);
  const tapeTex = tex(tc);
  const N = 12, segW = (P.hx * 2 + 0.8) / N, tapeY = P.hy + P.t + 0.07;
  const tape = [];
  for (let i = 0; i < N; i++) {
    const t = tapeTex.clone(); t.repeat.set(1 / N, 1); t.offset.set(i / N, 0); t.needsUpdate = true;
    const tm = new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.25, transparent: true, opacity: 0.94 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(segW + 0.02, 0.14, 4.8), tm);
    m.position.set(-P.hx - 0.4 + segW * (i + 0.5), tapeY, 0); m.castShadow = true;
    box.add(m); tape.push({ m, torn: false, body: null });
  }

  const camera = new THREE.PerspectiveCamera(30, 1, 10, 600);
  const aimAt = new THREE.Vector3(0, 9, 0);
  function frame(w, h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.set(0, 92, 102);
    camera.lookAt(aimAt);
    camera.updateProjectionMatrix();
  }

  if (poster) {
    // the still: at rest on the mat, tape gone, flaps open
    box.position.set(0, TOP + P.hy, 0); box.rotation.y = -0.18;
    tape.forEach(t => t.m.visible = false);
    // the front flap propped up so the label still reads
    flaps.forEach((f, i) => { const ang = f.open * (i === 0 ? 2.25 : 3.6); f.piv.rotation.set(f.axis[0] * ang, 0, f.axis[2] * ang); });
    renderer.setPixelRatio(1); frame(900, 640);
    camera.position.set(0, 84, 118); camera.lookAt(0, 8, 0);
    renderer.render(scene, camera);
    return { canvas };
  }

  /* ── physics ── */
  const world = new R.World({ x: 0, y: -981, z: 0 });
  if ('lengthUnit' in world.integrationParameters) world.integrationParameters.lengthUnit = 100;
  world.timestep = STEP;
  world.createCollider(R.ColliderDesc.cuboid(400, 20, 400).setTranslation(0, -20, 0));
  world.createCollider(R.ColliderDesc.cuboid(MAT.w / 2, MAT.h / 2, MAT.d / 2).setTranslation(0, MAT.h / 2, 0).setFriction(1));

  // dropped from a little above the frame, tipped so one corner lands first
  const q0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.09, -0.22, 0.06));
  const parcel = world.createRigidBody(R.RigidBodyDesc.dynamic()
    .setTranslation(9, TOP + P.hy + 46, -3).setRotation(q0).setAngularDamping(0.8).setCcdEnabled(true));
  world.createCollider(R.ColliderDesc.cuboid(P.hx, P.hy, P.hz).setDensity(0.0009).setRestitution(0.26).setFriction(0.9).setCollisionGroups(0x0010ffef), parcel);

  const tracked = [{ body: parcel, obj: box, prev: null, cur: null }];
  const snap = t => {
    const p = t.body.translation(), r = t.body.rotation();
    return { p: new THREE.Vector3(p.x, p.y, p.z), q: new THREE.Quaternion(r.x, r.y, r.z, r.w) };
  };
  tracked[0].prev = tracked[0].cur = snap(tracked[0]);

  // dust: a few hundred specks, kicked out where the box meets the mat
  const DUST = 160, dpos = new Float32Array(DUST * 3), dvel = new Float32Array(DUST * 3), dlife = new Float32Array(DUST);
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const sc = document.createElement('canvas'); sc.width = sc.height = 64;
  const sx = sc.getContext('2d'), grd = sx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(235,220,195,.9)'); grd.addColorStop(1, 'rgba(235,220,195,0)');
  sx.fillStyle = grd; sx.fillRect(0, 0, 64, 64);
  const dmat = new THREE.PointsMaterial({ size: 1.8, map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false, opacity: 0 });
  const dust = new THREE.Points(dg, dmat); scene.add(dust);
  let dustAge = 99;
  function puff(strength) {
    const c = parcel.translation();
    for (let i = 0; i < DUST; i++) {
      const a = rnd() * Math.PI * 2, r = 0.8 + rnd() * 0.35;
      dpos[i * 3] = c.x + Math.cos(a) * P.hx * r; dpos[i * 3 + 1] = TOP + 0.4 + rnd(); dpos[i * 3 + 2] = c.z + Math.sin(a) * P.hz * r;
      const sp = (14 + rnd() * 30) * strength;
      dvel[i * 3] = Math.cos(a) * sp; dvel[i * 3 + 1] = (4 + rnd() * 12) * strength; dvel[i * 3 + 2] = Math.sin(a) * sp;
      dlife[i] = 0.6 + rnd() * 0.9;
    }
    dustAge = 0; dg.attributes.position.needsUpdate = true;
  }
  function dustStep(dt) {
    if (dustAge > 2) return;
    dustAge += dt;
    for (let i = 0; i < DUST; i++) {
      dvel[i * 3] *= 1 - 3.2 * dt; dvel[i * 3 + 2] *= 1 - 3.2 * dt; dvel[i * 3 + 1] = dvel[i * 3 + 1] * (1 - 2 * dt) - 6 * dt;
      dpos[i * 3] += dvel[i * 3] * dt; dpos[i * 3 + 1] = Math.max(TOP, dpos[i * 3 + 1] + dvel[i * 3 + 1] * dt); dpos[i * 3 + 2] += dvel[i * 3 + 2] * dt;
    }
    dg.attributes.position.needsUpdate = true;
    dmat.opacity = 0.55 * Math.max(0, 1 - dustAge / 1.6);
  }

  let landed = false, lastVy = 0, bounces = 0, frozen = false;

  function freeze() {
    // once it rests, the box becomes fixed so the flaps can hinge on it
    if (frozen) return;
    frozen = true;
    parcel.setBodyType(R.RigidBodyType.Fixed, true);
  }

  /* tape: a piece comes off as its own body, flicked the way the pointer went */
  let tornCount = 0, onTorn = null;
  function tear(i, dir = 1) {
    const t = tape[i]; if (!t || t.torn) return;
    t.torn = true; tornCount++;
    t.m.updateWorldMatrix(true, false);
    const pos = new THREE.Vector3(), quat = new THREE.Quaternion();
    t.m.matrixWorld.decompose(pos, quat, new THREE.Vector3());
    box.remove(t.m); scene.add(t.m); t.m.position.copy(pos); t.m.quaternion.copy(quat);
    const b = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z)
      .setRotation(quat).setLinvel(dir * (90 + rnd() * 70), 150 + rnd() * 90, 40 + rnd() * 60)
      .setAngvel({ x: (rnd() - 0.5) * 16, y: (rnd() - 0.5) * 8, z: dir * (4 + rnd() * 10) }).setLinearDamping(0.8).setAngularDamping(0.6));
    world.createCollider(R.ColliderDesc.cuboid(segW / 2, 0.07, 2.4).setDensity(0.0006).setRestitution(0.1).setFriction(0.8)
      .setCollisionGroups(0x00040001), b);
    t.body = b;
    const tr = { body: b, obj: t.m }; tr.prev = tr.cur = snap(tr); tracked.push(tr);
    if (onTorn) onTorn(tornCount / N);
  }

  /* flaps: each becomes a body on a plain hinge. Its angle is read every
     step from the two rotations and unwrapped, so it runs past ±π without
     jumping; a damped spring swings it open, gravity lets it droop, and a
     stiff stop catches it before it folds into the box side. */
  let opened = false, openAt = 0;
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), ax = new THREE.Vector3();
  function open() {
    if (opened) return;
    opened = true; openAt = clock;
    freeze();
    const bq = parcel.rotation();
    flaps.forEach(f => {
      f.piv.updateWorldMatrix(true, false);
      const pos = new THREE.Vector3(), quat = new THREE.Quaternion();
      f.piv.matrixWorld.decompose(pos, quat, new THREE.Vector3());
      f.body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z).setRotation(quat).setAngularDamping(0.3));
      world.createCollider(R.ColliderDesc.cuboid(f.size[0] / 2, f.size[1] / 2, f.size[2] / 2)
        .setTranslation(...f.offset).setDensity(0.0006).setCollisionGroups(0x00020000), f.body);
      const a1 = { x: f.piv.position.x, y: f.piv.position.y, z: f.piv.position.z };
      f.joint = world.createImpulseJoint(R.JointData.revolute(a1, { x: 0, y: 0, z: 0 }, { x: f.axis[0], y: f.axis[1], z: f.axis[2] }), parcel, f.body, true);
      f.joint.setContactsEnabled(false);
      // closed is angle 0; opening runs in the flap's own direction
      f.base = new THREE.Quaternion(bq.x, bq.y, bq.z, bq.w).invert().multiply(quat);
      f.angle = 0; f.len = Math.abs(f.offset[0]) * 2 || Math.abs(f.offset[2]) * 2;
      f.target = 0; f.stop = 3.95;
      box.remove(f.piv); scene.add(f.piv); f.piv.position.copy(pos); f.piv.quaternion.copy(quat);
      const tr = { body: f.body, obj: f.piv }; tr.prev = tr.cur = snap(tr); tracked.push(tr);
    });
  }

  function hinge(f) {
    // the flap's angle about its hinge, relative to closed, unwrapped
    const b = parcel.rotation(), r = f.body.rotation();
    qa.set(b.x, b.y, b.z, b.w).multiply(f.base).invert();
    qb.set(r.x, r.y, r.z, r.w).premultiply(qa);
    let a = 2 * Math.atan2(qb.x * f.axis[0] + qb.y * f.axis[1] + qb.z * f.axis[2], qb.w) * f.open;
    while (a - f.angle > Math.PI) a -= 2 * Math.PI;
    while (a - f.angle < -Math.PI) a += 2 * Math.PI;
    f.angle = a;
    const w = f.body.angvel();
    ax.set(...f.axis).applyQuaternion(qa.set(b.x, b.y, b.z, b.w));
    const rate = (w.x * ax.x + w.y * ax.y + w.z * ax.z) * f.open;
    const I = f.body.mass() * f.len * f.len / 3;
    let acc = 210 * (f.target - a) - 26 * rate;
    if (a > f.stop) acc += 3000 * (f.stop - a) - 60 * rate;
    if (a < -0.05) acc += 3000 * (-0.05 - a);
    f.body.resetTorques(true);
    f.body.addTorque({ x: ax.x * acc * I * f.open, y: ax.y * acc * I * f.open, z: ax.z * acc * I * f.open }, true);
  }

  let clock = 0, acc = 0;
  function step(dt) {
    acc += Math.min(dt, 0.1);
    while (acc >= STEP) {
      acc -= STEP; clock += STEP;
      // each flap is held shut until its turn, then swung open
      if (opened) for (const f of flaps) { f.target = clock - openAt >= f.delay ? 3.3 : 0; hinge(f); }
      for (const t of tracked) t.prev = t.cur;
      world.step();
      for (const t of tracked) t.cur = snap(t);
      dustStep(STEP);
      if (!frozen) {
        const vy = parcel.linvel().y;
        if (lastVy < -90 && vy > lastVy + 60) { bounces++; puff(bounces === 1 ? 1 : 0.45); landed = true; }
        lastVy = vy;
        if (landed && (parcel.isSleeping() || clock > 2.4)) freeze();
      }
    }
    const k = acc / STEP;
    for (const t of tracked) {
      t.obj.position.lerpVectors(t.prev.p, t.cur.p, k);
      t.obj.quaternion.slerpQuaternions(t.prev.q, t.cur.q, k);
    }
  }

  // the seam's two ends on screen (the test harness drags along it)
  function seam() {
    const r = canvas.getBoundingClientRect();
    return [-P.hx, P.hx].map(x => {
      const v = new THREE.Vector3(x * 0.9, tapeY, 0).applyMatrix4(box.matrixWorld).project(camera);
      return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
    });
  }

  // where the box mouth sits on screen, for the shelf things to leave from
  function mouth() {
    const v = new THREE.Vector3(0, P.hy, 0).applyMatrix4(box.matrixWorld).project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height };
  }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set((clientX - r.left) / r.width * 2 - 1, -(clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(tape.filter(t => !t.torn).map(t => t.m), false)[0];
    if (hit) return tape.findIndex(t => t.m === hit.object);
    return ray.intersectObject(box, true).length ? -2 : -1;
  }

  return {
    THREE, R, renderer, camera, frame, step, tear, open, mouth, seam, pick,
    render: () => renderer.render(scene, camera),
    get frozen() { return frozen; }, get torn() { return tornCount; }, N,
    set onTorn(f) { onTorn = f; },
    dispose() { world.free(); renderer.dispose(); },
  };
}

/* ── the 2d parcel: an HTML box with the same label ─────────────── */
function parcel2d(el, to) {
  const box = document.createElement('div');
  box.className = 'signed-box';
  box.innerHTML = '<div class="signed-flap l"></div><div class="signed-flap r"></div><div class="signed-tape"></div><canvas width="600" height="360" aria-hidden="true"></canvas>';
  el.appendChild(box);
  return labelFonts().then(() => {
    drawShippingLabel(box.querySelector('canvas').getContext('2d'), 600, 360, { rows: labelRows(to), code: 'DV-0350', seed: 9 });
    return box;
  });
}

/* ── the stage every intro shares ───────────────────────────────
   One overlay, one clock, skip and Esc, and the flight home. An act
   (signed for here, the rest in acts.js) plays its own opening and returns
   the screen point the shelf things should leave from. */
const ACTS = ['signed', 'receipt', 'deploy', 'knock', 'boarding', 'collect'];
let rapierLoad = null;
export const loadRapier = () => rapierLoad || (rapierLoad = import(RAPIER_URL).then(async m => { await m.default.init(); return m.default; }));

export async function play(mode, name = 'signed') {
  if (!ACTS.includes(name)) name = 'signed';
  const to = recipient();
  const el = overlay(to);
  el.dataset.act = name;
  const line = el.querySelector('.signed-line'), hintEl = el.querySelector('.signed-hint');
  const skipBtn = el.querySelector('.signed-skip');
  const rnd = seeded(7);
  let beat = 'load', done = false, raf = 0, flight = null, trigger = null;
  const timers = new Set(), frames = new Set(), disposers = [];
  const wait = ms => new Promise(res => { const t = setTimeout(() => { timers.delete(t); res(); }, ms); timers.add(t); });
  const say = s => { line.textContent = s; };

  emit('intro_started', { mode, intro: name, addressed: !!to });

  let finishResolve;
  const finished = new Promise(r => { finishResolve = r; });
  const flying = new Set();
  const things = targets();

  const ctx = {
    el, to, rnd, wait, say, emit, name,
    get mode() { return mode; }, set mode(m) { mode = m; },
    get done() { return done; },
    beat(b) { beat = b; },
    hint(s) { hintEl.textContent = s || ''; },
    onFrame(fn) { frames.add(fn); },
    onDispose(fn) { disposers.push(fn); },
    useRapier(R) { flight = rapierFlight(R); },
    rapier: loadRapier,
    /* the act's one gesture: resolves on its own trigger, Enter or Space,
       or by itself after ms if the visitor does nothing */
    awaitAction(ms = 3000) {
      beat = 'act';
      return new Promise(res => {
        let fired = false;
        const go = () => { if (fired) return; fired = true; trigger = null; res(); };
        trigger = go; wait(ms).then(go);
      });
    },
    act() { if (trigger) trigger(); },
  };

  function finish() {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout); timers.clear();
    cancelAnimationFrame(raf);
    things.forEach(release);
    document.removeEventListener('keydown', onKey, true);
    const root = document.documentElement;
    root.classList.add('intro-reveal');
    el.classList.add('gone');
    setTimeout(() => {
      el.remove();
      root.classList.remove('intro', 'intro-reveal');
      disposers.forEach(f => { try { f(); } catch (e) {} });
      if (flight && flight.free) flight.free();
      const hello = document.querySelector('.intro .hello');
      if (hello) { hello.setAttribute('tabindex', '-1'); hello.focus({ preventScroll: true }); }
      window.dispatchEvent(new CustomEvent('dv:intro-done'));
      finishResolve();
    }, 420);
  }
  function skip() {
    if (done) return;
    emit('skipped', { beat, intro: name });
    finish();
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); skip(); }
    else if ((e.key === 'Enter' || e.key === ' ') && trigger && document.activeElement !== skipBtn) { e.preventDefault(); trigger(); }
  }
  skipBtn.addEventListener('click', skip);
  document.addEventListener('keydown', onKey, true);

  /* one clock for the act's scene and the flight */
  let last = performance.now();
  const fps = window.__signedFrames = [];
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = (now - last) / 1000; last = now;
    fps.push(dt);
    frames.forEach(f => f(dt));
    if (flying.size) flyStep(dt);
  }

  let flyAcc = 0, allOut = false;
  function flyStep(dt) {
    flyAcc += Math.min(dt, 0.1);
    while (flyAcc >= STEP) {
      flyAcc -= STEP;
      const list = [...flying];
      list.forEach(s => { s.age += STEP; s.s = scaleAt(s.age); });
      if (flight) flight.step(list); else list.forEach(s => springStep(s, STEP));
      for (const s of list) {
        if (settled(s)) {
          flying.delete(s); if (flight) flight.remove(s);
          release(s.t);
        } else paint(s.t, s);
      }
    }
    if (!flying.size && beat === 'fly' && allOut) finish();
  }

  async function fly(origin) {
    beat = 'fly';
    hintEl.textContent = '';
    // the stage stays dark while the first things leave, then clears
    wait(700).then(() => { if (done) return; document.documentElement.classList.add('intro-reveal'); el.classList.add('reveal'); });
    for (const t of things) {
      if (done) return;
      const s = launchState(t, origin, rnd); s.t = t;
      t.el.style.transition = 'none';
      t.el.classList.add('flying');
      paint(t, s);
      if (flight) flight.add(s);
      flying.add(s);
      say(t.caption);
      await wait(520);
    }
    allOut = true;
  }

  try {
    raf = requestAnimationFrame(loop);
    const run = name === 'signed' ? signed : (await import('./acts.js'))[name];
    const origin = await run(ctx);
    if (!done && origin) fly(origin);
    else if (!done) finish();
  } catch (err) {
    finish();
  }
  return finished;
}

/* ── act: signed for ────────────────────────────────────────────── */
async function signed(ctx) {
  const { el, to, wait, say } = ctx;
  let sceneApi = null;
  if (ctx.mode === '3d') {
    const canvas = document.createElement('canvas');
    canvas.className = 'signed-gl'; canvas.setAttribute('aria-hidden', 'true');
    el.prepend(canvas);
    const slow = wait(6000).then(() => 'slow');
    const got = await Promise.race([parcelScene(canvas, to).catch(() => null), slow]);
    if (ctx.done) return null;
    if (!got || got === 'slow') { canvas.remove(); ctx.mode = '2d'; }
    else {
      sceneApi = got;
      const size = () => sceneApi.frame(innerWidth, innerHeight);
      sceneApi.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); size();
      addEventListener('resize', size);
      ctx.onDispose(() => { removeEventListener('resize', size); sceneApi.dispose(); });
      ctx.onFrame(dt => { sceneApi.step(dt); sceneApi.render(); });
      ctx.useRapier(sceneApi.R);
      window.__signedSeam = () => sceneApi.seam(); // for the headless test: where to drag
      sceneApi.onTorn = frac => { if (frac >= 0.5) ctx.act(); };

      // drag across the tape; a tap anywhere on the parcel opens it outright
      let down = null, lastX = 0, live = false;
      canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, moved: false }; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
      canvas.addEventListener('pointermove', e => {
        if (!live) { canvas.style.cursor = ''; return; }
        const hit = sceneApi.pick(e.clientX, e.clientY);
        canvas.style.cursor = hit === -1 ? '' : 'grab';
        if (!down) return;
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) down.moved = true;
        if (hit >= 0) sceneApi.tear(hit, e.clientX >= lastX ? 1 : -1);
        lastX = e.clientX;
      });
      canvas.addEventListener('pointerup', e => {
        if (down && !down.moved && live && sceneApi.pick(e.clientX, e.clientY) !== -1) ctx.act();
        down = null;
      });
      ctx.beat('drop');
      await wait(1900); if (ctx.done) return null;
      ctx.beat('line');
      say("I've hand-delivered 50+ orders. This one's for you.");
      await wait(1700); if (ctx.done) return null;
      ctx.hint('Drag across the tape to open it, or press Enter');
      live = true;
      await ctx.awaitAction(3000);
      live = false; ctx.hint('');
      if (ctx.done) return null;
      // pull the rest of the tape off along the seam, then the flaps go
      for (let i = 0; i < sceneApi.N; i++) { sceneApi.tear(i, 1); await wait(28); if (ctx.done) return null; }
      ctx.emit('tape_torn', { mode: '3d' });
      await wait(120); sceneApi.open();
      await wait(520);
      return sceneApi.mouth();
    }
  }
  // 2d
  const box = await parcel2d(el, to);
  box.setAttribute('role', 'button'); box.setAttribute('tabindex', '0'); box.setAttribute('aria-label', 'Open the parcel');
  box.addEventListener('click', () => ctx.act());
  el.classList.add('flat');
  ctx.beat('drop');
  await wait(900); if (ctx.done) return null;
  ctx.beat('line');
  say("I've hand-delivered 50+ orders. This one's for you.");
  await wait(1700); if (ctx.done) return null;
  ctx.hint('Tap the parcel to open it');
  box.focus({ preventScroll: true });
  await ctx.awaitAction(3000);
  if (ctx.done) return null;
  ctx.emit('tape_torn', { mode: '2d' });
  box.classList.add('open');
  await wait(560);
  const r = box.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height * 0.3 };
}

/* the still for reduced motion: the parcel open on its mat */
export async function poster() {
  const canvas = document.createElement('canvas');
  await parcelScene(canvas, '', { poster: true });
  return canvas;
}
