/* The shipping label: one drawing shared by the parcel that opens the page
   and the suitcase that closes it, so the delivery reads as one story.
   Draws onto a 2D context at any size; 5:3 looks right. */

const INK = '#1f2333';
const SANS = '"Instrument Sans", system-ui, sans-serif';
const MONO = '"Space Mono", ui-monospace, monospace';

export async function labelFonts() {
  await Promise.all([
    document.fonts.load(`700 40px ${SANS}`), document.fonts.load(`600 40px ${SANS}`),
    document.fonts.load(`700 20px ${MONO}`), document.fonts.load(`400 20px ${MONO}`),
  ].map(p => p.catch(() => {})));
}

function barcode(x, X, Y, w, h, seed) {
  let r = seed;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  x.fillStyle = INK;
  for (let p = X; p < X + w;) {
    const bw = 1 + rnd() * 3.4 * (w / 300);
    if (rnd() > 0.35) x.fillRect(p, Y, bw, h);
    p += bw + 1 + rnd() * 2.6 * (w / 300);
  }
}

/* rows: [[label, value], ...]; top: the header line; code: tracking number */
export function drawShippingLabel(x, w, h, { top = 'PRIORITY DELIVERY', rows, code = 'DV-0001', seed = 3 }) {
  const u = w / 600; // everything is laid out on a 600-wide label
  x.save();
  x.fillStyle = '#fbfaf5';
  x.beginPath(); x.roundRect(0, 0, w, h, 10 * u); x.fill();

  // header band
  x.fillStyle = INK; x.fillRect(0, 0, w, 58 * u);
  x.fillStyle = '#fbfaf5';
  x.font = `700 ${22 * u}px ${MONO}`; x.letterSpacing = `${4 * u}px`; x.textBaseline = 'middle';
  x.fillText(top, 26 * u, 30 * u);
  x.textAlign = 'right'; x.fillText(code, w - 26 * u, 30 * u); x.textAlign = 'left';
  x.letterSpacing = '0px';

  // rows, ruled like a courier slip
  const rowH = (h - 58 * u - 92 * u) / rows.length;
  rows.forEach(([k, v], i) => {
    const y = 58 * u + i * rowH;
    if (i) { x.fillStyle = 'rgba(31,35,51,.18)'; x.fillRect(26 * u, y, w - 52 * u, 1.5 * u); }
    x.fillStyle = 'rgba(31,35,51,.55)';
    x.font = `400 ${17 * u}px ${MONO}`; x.letterSpacing = `${2.5 * u}px`; x.textBaseline = 'alphabetic';
    x.fillText(k, 26 * u, y + rowH * 0.42);
    x.letterSpacing = '0px';
    x.fillStyle = INK;
    let size = 38 * u;
    x.font = `700 ${size}px ${SANS}`;
    while (x.measureText(v).width > w - 52 * u && size > 16 * u) { size -= 2 * u; x.font = `700 ${size}px ${SANS}`; }
    x.fillText(v, 26 * u, y + rowH * 0.86);
  });

  // barcode strip
  x.fillStyle = 'rgba(31,35,51,.18)'; x.fillRect(26 * u, h - 92 * u, w - 52 * u, 1.5 * u);
  barcode(x, 26 * u, h - 72 * u, w - 220 * u, 50 * u, seed);
  x.fillStyle = INK; x.font = `700 ${30 * u}px ${MONO}`;
  x.textAlign = 'right'; x.fillText('1/1', w - 26 * u, h - 32 * u); x.textAlign = 'left';
  x.restore();
}

/* the visitor's name from ?for=, safe for a label: letters, digits and a few
   marks only, capped, uppercased. It is only ever drawn or set as text. */
export function recipient() {
  const raw = new URLSearchParams(location.search).get('for') || '';
  const clean = raw.replace(/[^\p{L}\p{N} &.'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 24);
  return clean ? clean.toUpperCase() : '';
}
