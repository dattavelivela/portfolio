/* Uploads the Clara case study to its private Supabase bucket.
 *
 *   SUPABASE_SERVICE_ROLE_KEY=… node work/clara-upload.mjs [path/to/clara.html]
 *
 * Every local asset the page points at (img/, video/, ../assets/, ../fonts/)
 * is uploaded next to it, and its link is rewritten to __ASSET__/<path>.
 * The unlock function signs those links after the password checks out.
 * Re-run it after every edit to the page.
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve, extname, posix } from 'node:path';
import { homedir } from 'node:os';

const URL_ = 'https://auiuyzhptbtxcpqvlnsw.supabase.co';
const BUCKET = 'clara';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const page = resolve(process.argv[2] || `${homedir()}/Downloads/amperos-cfo-slides/site/clara.html`);
if (!KEY) { console.error('set SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const types = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif' };
const auth = { Authorization: `Bearer ${KEY}`, apikey: KEY };

async function ensureBucket() {
  const r = await fetch(`${URL_}/storage/v1/bucket`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }) });
  if (!r.ok && r.status !== 409 && !(await r.text()).includes('already exists')) throw new Error(`bucket: ${r.status}`);
}

async function put(path, body, type) {
  const r = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${path}`, { method: 'POST',
    headers: { ...auth, 'content-type': type, 'x-upsert': 'true', 'cache-control': 'max-age=60' }, body });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
}

await ensureBucket();
const root = dirname(page);
let html = await readFile(page, 'utf8');
const refs = new Set();
/* src/href/poster attributes and css url() that point at local files */
html = html.replace(/((?:src|href|poster)=")([^"]+)(")|(url\(['"]?)([^)'"]+)(['"]?\))/g, (m, a1, p1, a3, b1, p2, b3) => {
  const raw = p1 ?? p2;
  if (/^(https?:|data:|mailto:|#|tel:)/.test(raw)) return m;
  const cut = raw.search(/[?#]/);
  const clean = cut < 0 ? raw : raw.slice(0, cut), tail = cut < 0 ? '' : raw.slice(cut);
  if (!extname(clean) || extname(clean) === '.html') return m;
  const key = posix.normalize(clean).replace(/^(\.\.\/)+/, '');
  refs.add(JSON.stringify([key, resolve(root, clean)]));
  const out = `__ASSET__/${key}${tail}`;
  return p1 !== undefined ? a1 + out + a3 : b1 + out + b3;
});

for (const r of refs) {
  const [key, file] = JSON.parse(r);
  await put(key, await readFile(file), types[extname(file).toLowerCase()] || 'application/octet-stream');
  console.log('up', key);
}
await put('index.html', html, types['.html']);
console.log(`done: index.html + ${refs.size} assets in bucket "${BUCKET}"`);
