import { MODEL, CHAT_SYSTEM } from '../../lib/ai.js';
import { json, rateLimited, badOrigin, readJson } from '../../lib/http.js';

const clip = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '');

export async function onRequestPost({ request, env }) {
  if (badOrigin(request)) return json({ error: 'Cross-origin requests are not allowed.' }, 403);
  if (rateLimited(request, 'chat', 20)) return json({ error: 'Too many messages. Wait a minute and try again.' }, 429);
  if (!env.AI) return json({ error: 'The AI assistant is not available on this server.' }, 503);

  let body;
  try { body = await readJson(request, 24_000); } catch { return json({ error: 'Invalid JSON body.' }, 400); }

  const history = (Array.isArray(body?.messages) ? body.messages : [])
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-10)
    .map((m) => ({ role: m.role, content: clip(m.content, 1500) }));
  if (!history.length || history.at(-1).role !== 'user') return json({ error: 'Send a user message.' }, 400);

  const context = clip(body?.context, 2500);
  const messages = [
    { role: 'system', content: `${CHAT_SYSTEM}\n\nPage context:\n<context>\n${context || 'Nothing analyzed yet.'}\n</context>` },
    ...history,
  ];

  try {
    const stream = await env.AI.run(MODEL, { messages, stream: true, max_tokens: 600, temperature: 0.4 });
    return new Response(stream, { headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store' } });
  } catch (err) {
    console.error('chat failed', err?.message);
    return json({ error: 'The AI assistant is busy right now. Try again in a minute.' }, 502);
  }
}
