/* unlock: checks a case study password and hands back its page.
 *
 *   POST { "case": "clara", "password": "…" }
 *   200  { "html": "…" }   asset links inside are signed and expire
 *   401  wrong password
 *
 * The page and its assets sit in a private bucket named after the case.
 * Uploaded pages carry __ASSET__/<path> placeholders (see work/clara-upload.mjs);
 * each one is swapped for a signed URL here, so nothing is ever public.
 * Passwords live in function secrets: PASSWORD_<CASE>, e.g. PASSWORD_CLARA.
 */
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const CASES = ["clara"];
const TTL = 60 * 60 * 2; // signed links last two hours

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

/* compare digests, not strings, so timing says nothing about the password */
async function same(a: string, b: string) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([a, b].map((s) => crypto.subtle.digest("SHA-256", enc.encode(s))));
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < u.length; i++) diff |= u[i] ^ v[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body: { case?: string; password?: string };
  try { body = await req.json(); } catch { return json({ error: "body" }, 400); }
  const name = String(body.case || "");
  if (!CASES.includes(name)) return json({ error: "case" }, 404);

  const expected = Deno.env.get(`PASSWORD_${name.toUpperCase()}`);
  if (!expected) return json({ error: "not set up" }, 500);
  if (!(await same(String(body.password || ""), expected))) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return json({ error: "password" }, 401);
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const bucket = db.storage.from(name);
  const { data: file, error } = await bucket.download("index.html");
  if (error || !file) return json({ error: "missing page" }, 500);
  let html = await file.text();

  const paths = [...new Set([...html.matchAll(/__ASSET__\/([^"')?#\s]+)/g)].map((m) => m[1]))];
  if (paths.length) {
    const { data: signed, error: e2 } = await bucket.createSignedUrls(paths, TTL);
    if (e2 || !signed) return json({ error: "signing" }, 500);
    const map = new Map(signed.map((s) => [s.path, s.signedUrl]));
    html = html.replace(/__ASSET__\/([^"')?#\s]+)(\?[^"'#)\s]*)?/g, (_, p) => map.get(p) || "");
  }
  return json({ html });
});
