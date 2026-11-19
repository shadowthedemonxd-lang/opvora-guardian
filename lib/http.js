export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

// shortcut: per-isolate memory, so limits are approximate across Cloudflare's edge; upgrade to a Rate Limiting binding or KV if abused.
const hits = new Map();
export function rateLimited(request, bucket, max, windowMs = 60_000) {
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > max;
}

/** Rejects cross-site browser calls; non-browser clients (no Origin header) are still rate limited. */
export function badOrigin(request) {
  const origin = request.headers.get('origin');
  return origin !== null && origin !== new URL(request.url).origin;
}

export async function readJson(request, maxBytes = 16_000) {
  const text = await request.text();
  if (text.length > maxBytes) throw new Error('too large');
  return JSON.parse(text);
}
