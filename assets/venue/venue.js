/* The venue's camera.

   Every area sits at a point on one big wall (--x/--y in index.html). On a
   wide screen with motion allowed, the wall is a fixed stage and a camera
   moves over it: page scroll walks the areas in order, pausing at each and
   panning down the tall ones; a click on a sign row glides straight there,
   the way its arrow points, then quietly sets the scroll to match. Each
   area also gets a small "you are here" sign with arrows to the others,
   and every lightbox sways a touch on its brackets when you arrive.

   Without that (phones, reduced motion) the same signs stack down the page
   and rows just scroll to their area. */

const venue = document.getElementById('venue');
const cam = document.getElementById('cam');
const world = document.getElementById('world');
const tour = document.getElementById('tour');
const CW = 2400, CH = 1700;
const ORDER = ['hub', 'hello', 'work', 'pushed', 'visual', 'people', 'side', 'talk'];
const NAMES = { hub: 'DIRECTORY', hello: 'HELLO', work: 'WORK', pushed: 'PUSHED', visual: 'VISUAL', people: 'PEOPLE', side: 'SIDE', talk: 'TALK' };
const emit = (n, p) => window.dvEmit && window.dvEmit(n, p);

const areas = ORDER.map(id => {
  const el = document.getElementById(id);
  return { id, el, lb: el.querySelector('.lb'), x: +el.style.getPropertyValue('--x'), y: +el.style.getPropertyValue('--y'), sway: 0, sv: 0 };
});
const byId = Object.fromEntries(areas.map(a => [a.id, a]));

const wide = matchMedia('(min-width: 1000px)');
const still = matchMedia('(prefers-reduced-motion: reduce)');

/* the arrow from one area to another, to the nearest 45 degrees */
function bearing(a, b) {
  const deg = Math.atan2(b.x - a.x, -(b.y - a.y)) * 180 / Math.PI;
  return Math.round(deg / 45) * 45;
}

/* the "you are here" signs, built once */
function directories() {
  for (const a of areas) {
    if (a.id === 'hub') continue;
    const lb = document.createElement('nav');
    lb.className = 'lb lb-mini';
    lb.setAttribute('aria-label', `You are here: ${NAMES[a.id].toLowerCase()}`);
    lb.innerHTML = '<div class="lb-face">' +
      `<div class="row here"><span class="arw tile" aria-hidden="true"><svg class="ico"><use href="#i-here"/></svg></span><div class="lbl"><span class="go">${NAMES[a.id]}</span></div></div>` +
      areas.filter(b => b !== a).map(b =>
        `<div class="row" data-go="${b.id}"><span class="arw" aria-hidden="true" style="--r:${bearing(a, b)}deg"><svg class="ico"><use href="#i-arw"/></svg></span>` +
        `<div class="lbl"><a class="go" href="#${b.id}">${NAMES[b.id]}</a></div></div>`).join('') +
      '</div>';
    a.el.prepend(lb);
  }
}
directories();

/* ── click and focus: the same rows work in both modes ─────────── */
function light(row) {
  if (!row) return;
  row.classList.add('lit');
  setTimeout(() => row.classList.remove('lit'), 420);
}
venue.addEventListener('click', e => {
  const row = e.target.closest('.row[data-go]');
  if (!row) return;
  const sub = e.target.closest('.sub a');
  const id = row.dataset.go;
  light(row);
  emit('sign_clicked', { row: sub ? sub.getAttribute('href').slice(1) : id });
  if (!on) {
    if (!sub) { e.preventDefault(); byId[id].el.scrollIntoView({ behavior: still.matches ? 'auto' : 'smooth', block: 'start' }); }
    return;
  }
  e.preventDefault();
  kick(areaOf(row), 7);
  go(id, sub ? sub.getAttribute('href') : null);
});

/* ── venue mode ─────────────────────────────────────────────────── */
let on = false, vw = 0, vh = 0, segs = [], current = { x: 0, y: 0, s: 1 }, gliding = false, here = null, raf = 0;

// the frame the camera composes in: the viewport less the pill along the bottom
const PILL = 150;
const view = () => vh - PILL - 40;
function measure() {
  vw = innerWidth; vh = innerHeight;
  let y = 0;
  segs = areas.map((a, i) => {
    const w = a.el.offsetWidth, h = a.el.offsetHeight;
    // fit the whole sign above the contact pill; only very tall areas pan
    const s = Math.min(1.05, Math.max(0.5, Math.min((vw * 0.92) / w, view() / h)));
    const pan = Math.max(0, h * s - view());
    const dwell = vh * 0.22;
    const seg = { a, s, pan, h, start: y, dwell, hold: dwell * 2 + pan, trans: i < areas.length - 1 ? vh * 0.8 : 0 };
    y += seg.hold + seg.trans;
    return seg;
  });
  tour.style.height = (y + vh) + 'px';
}

/* where the camera sits inside an area's hold, t from 0 (top) to 1 (bottom) */
function inside(seg, t) {
  const panW = seg.pan / seg.s;
  return { x: seg.a.x * CW, y: seg.a.y * CH - panW / 2 + t * panW, s: seg.s };
}
const ease = u => u * u * u * (u * (6 * u - 15) + 10); // smootherstep
function between(p, q, u) {
  const e = ease(u), dip = 1 - 0.16 * Math.sin(Math.PI * u);
  return { x: p.x + (q.x - p.x) * e, y: p.y + (q.y - p.y) * e, s: (p.s + (q.s - p.s) * e) * dip };
}
// a click's glide: position on the eased curve, a gentle zoom-out mid-way
function glide(p, q, e, u) {
  const dip = 1 - 0.14 * Math.sin(Math.PI * u);
  return { x: p.x + (q.x - p.x) * e, y: p.y + (q.y - p.y) * e, s: (p.s + (q.s - p.s) * e) * dip };
}
function camAt(y) {
  for (let i = 0; i < segs.length; i++) {
    const g = segs[i];
    if (y < g.start + g.hold || i === segs.length - 1) {
      const t = g.pan ? Math.min(1, Math.max(0, (y - g.start - g.dwell) / g.pan)) : 0;
      return { c: inside(g, t), i };
    }
    if (y < g.start + g.hold + g.trans) {
      const u = (y - g.start - g.hold) / g.trans;
      return { c: between(inside(g, 1), inside(segs[i + 1], 0), u), i: u < 0.5 ? i : i + 1 };
    }
  }
  return { c: current, i: 0 };
}
function render(c) {
  current = c;
  // the frame's centre: 20px down from the top plus half the frame
  world.style.transform = `translate3d(${vw / 2}px,${20 + view() / 2}px,0) scale(${c.s}) translate3d(${-c.x}px,${-c.y}px,0)`;
}

/* a lightbox on two brackets: a small damped sway */
function areaOf(el) { const s = el.closest('.area'); return s ? byId[s.id] : null; }
function kick(a, v) { if (!a || still.matches) return; a.sv += v; tick(); }
let lastT = 0;
function tick() {
  if (raf) return;
  lastT = performance.now();
  const loop = now => {
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    let moving = false;
    for (const a of areas) {
      a.sv += (-70 * a.sway - 3.6 * a.sv) * dt; a.sway += a.sv * dt;
      if (Math.abs(a.sway) + Math.abs(a.sv) > 0.002) moving = true;
      a.lb.style.setProperty('--sway', a.sway.toFixed(3) + 'deg');
      a.lb.style.setProperty('--bob', (Math.abs(a.sway) * 3).toFixed(2) + 'px');
    }
    raf = moving ? requestAnimationFrame(loop) : 0;
  };
  raf = requestAnimationFrame(loop);
}

function arrive(i) {
  const a = areas[i];
  if (here === a) return;
  here = a;
  kick(a, 5);
}

/* scroll sets where the camera should be; the camera eases after it every
   frame, so wheel notches and trackpad flicks come out as one glide */
let goal = null, follow = 0, lastF = 0;
function onScroll() {
  if (!on || gliding) return;
  const r = camAt(scrollY);
  goal = r.c; arrive(r.i);
  if (!follow) { lastF = performance.now(); world.style.willChange = 'transform'; follow = requestAnimationFrame(chase); }
}
function chase(now) {
  const dt = Math.min(0.05, (now - lastF) / 1000); lastF = now;
  const k = 1 - Math.exp(-dt * 7.5);   // about 0.13 s to close most of the gap
  const c = current;
  const next = { x: c.x + (goal.x - c.x) * k, y: c.y + (goal.y - c.y) * k, s: c.s * Math.pow(goal.s / c.s, k) };
  const far = Math.abs(goal.x - next.x) + Math.abs(goal.y - next.y) + Math.abs(goal.s - next.s) * 2000;
  if (far < 0.4) { render(goal); follow = 0; sharpen(); return; }
  render(next);
  follow = requestAnimationFrame(chase);
}
// once the camera rests, let the text re-raster crisply at the new zoom
function sharpen() { world.style.willChange = 'auto'; }

function holdY(i) { return segs[i].start + segs[i].dwell * 0.5; }

/* glide straight to an area along the wall, then match the scroll */
function go(id, focusSel) {
  const i = ORDER.indexOf(id); if (i < 0) return;
  const to = inside(segs[i], 0), from = { ...current };
  const done = () => {
    gliding = false;
    scrollTo({ top: holdY(i), behavior: 'instant' });
    render(to); goal = to; arrive(i);
    sharpen();
    if (focusSel) {
      const t = document.querySelector(focusSel);
      if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); t.classList.add('lit'); setTimeout(() => t.classList.remove('lit'), 900); }
    }
  };
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const ms = Math.min(1700, 800 + dist * 0.2);
  if (follow) { cancelAnimationFrame(follow); follow = 0; }
  gliding = true; world.style.willChange = 'transform';
  const t0 = performance.now();
  const step = now => {
    const u = Math.min(1, (now - t0) / ms);
    // ease in and out on a quintic, softer at both ends than smoothstep
    const e = u < 0.5 ? 16 * u ** 5 : 1 - (-2 * u + 2) ** 5 / 2;
    render(glide(from, to, e, u));
    if (u < 1) requestAnimationFrame(step); else done();
  };
  requestAnimationFrame(step);
}

/* a keyboard user tabbing into another area takes the camera with them */
venue.addEventListener('focusin', e => {
  if (!on || gliding) return;
  const a = areaOf(e.target);
  if (a && a !== here) go(a.id);
});

function setup() {
  const want = wide.matches && !still.matches;
  if (want === on) { if (on) { measure(); onScroll(); } return; }
  on = want;
  venue.classList.toggle('on', on);
  document.documentElement.classList.toggle('venue-on', on);
  if (on) {
    if (!world.querySelector('.glow')) {
      for (const a of areas) for (const k of ['', ' core']) {
        const g = document.createElement('div');
        g.className = 'glow' + k; g.setAttribute('aria-hidden', 'true');
        g.style.cssText = `--x:${a.x};--y:${a.y}`;
        world.insertBefore(g, world.children[1]);
      }
      const v = document.createElement('div'); v.className = 'vignette'; cam.appendChild(v);
    }
    measure();
    const h = location.hash.slice(1);
    const startAt = byId[h] ? ORDER.indexOf(h) : -1;
    if (startAt > 0) scrollTo({ top: holdY(startAt), behavior: 'instant' });
    render(camAt(scrollY).c); onScroll();
  } else {
    world.style.transform = ''; tour.style.height = '';
  }
}

addEventListener('scroll', onScroll, { passive: true });
let rs = 0;
addEventListener('resize', () => { clearTimeout(rs); rs = setTimeout(setup, 120); });
wide.addEventListener('change', setup); still.addEventListener('change', setup);
document.fonts.ready.then(setup);
setup();
