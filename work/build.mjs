/* Encrypts each case study body so the repo only ever carries ciphertext.
 *
 *   node work/build.mjs '<password>'
 *
 * Reads  work/src/<name>.html   (plaintext, git-ignored)
 * Writes work/<name>.enc.json   (committed)
 *
 * Re-run it after editing a body, or after changing the password.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { webcrypto as crypto } from 'node:crypto';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ITERATIONS = 250000;

const password = process.argv[2];
if (!password) {
  console.error("usage: node work/build.mjs '<password>'");
  process.exit(1);
}

const b64 = (buf) => Buffer.from(buf).toString('base64');

async function encrypt(plaintext) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
  );
  const body = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)
  );
  return { iterations: ITERATIONS, salt: b64(salt), iv: b64(iv), body: b64(body) };
}

const srcDir = join(here, 'src');
const files = (await readdir(srcDir)).filter((f) => f.endsWith('.html'));
if (!files.length) {
  console.error(`no .html bodies in ${srcDir}`);
  process.exit(1);
}

for (const file of files) {
  const name = basename(file, '.html');
  const plaintext = await readFile(join(srcDir, file), 'utf8');
  const payload = await encrypt(plaintext);
  const out = join(here, `${name}.enc.json`);
  await writeFile(out, JSON.stringify(payload));
  console.log(`${file} -> work/${name}.enc.json  (${plaintext.length} chars in, ${payload.body.length} b64 out)`);
}
