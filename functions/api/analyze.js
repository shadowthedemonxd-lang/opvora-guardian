import { analyze } from '../../lib/ai.js';
import { json, rateLimited, badOrigin, readJson } from '../../lib/http.js';

const KINDS = new Set(['url', 'message', 'event']);
const MAX = { url: 2048, message: 4000, event: 2000 };

export async function onRequestPost({ request, env }) {
  if (badOrigin(request)) return json({ error: 'Cross-origin requests are not allowed.' }, 403);
  if (rateLimited(request, 'analyze', 30)) return json({ error: 'Too many analyses. Wait a minute and try again.' }, 429);

  let body;
  try { body = await readJson(request); } catch { return json({ error: 'Invalid JSON body.' }, 400); }
  const kind = body?.kind;
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!KINDS.has(kind)) return json({ error: 'kind must be url, message or event.' }, 400);
  if (!content) return json({ error: 'Nothing to analyze.' }, 400);
  if (content.length > MAX[kind]) return json({ error: `Too long (max ${MAX[kind]} characters).` }, 413);

  return json(await analyze(env, kind, content, body?.lang === 'es' ? 'es' : 'en'));
}
