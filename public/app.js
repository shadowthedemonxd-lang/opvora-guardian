import { SAMPLE_EVENTS } from './events.js';

const $ = (s, root = document) => root.querySelector(s);
const SEV_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low', none: 'Safe' };
const SEV_WEIGHT = { critical: 26, high: 15, medium: 7, low: 2, none: 0 };
const AREA_ICON = { browsing: 'i-globe', device: 'i-device', accounts: 'i-accounts' };
const AREA_LABEL = { browsing: 'Browsing', device: 'PC security', accounts: 'Accounts' };

/** Tiny DOM builder. Strings become text nodes, so model output can never inject HTML. */
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
}
const icon = (id) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
};
const sevChip = (sev) => h('span', { class: 'sev', 'data-sev': sev }, SEV_LABEL[sev] || sev);

/* ---------- reveal on scroll ---------- */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el, i) => { el.style.setProperty('--delay', `${(i % 4) * 0.07}s`); io.observe(el); });

/* ---------- API ---------- */
const livePill = $('.pill--live');
async function analyze(kind, content) {
  const res = await fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, content }) });
  const data = await res.json().catch(() => ({ error: 'Unexpected server response.' }));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  const ai = data.source === 'ai';
  livePill.classList.toggle('is-down', !ai);
  livePill.lastChild.textContent = ai ? 'AI online' : 'AI fallback: rules';
  return data;
}

/* ---------- analysis card (shared by console + scanner) ---------- */
function thinking(container, label) {
  container.replaceChildren(h('div', { class: 'thinking' },
    h('p', { class: 'thinking__label' }, label),
    h('div', { class: 'shimmer', style: 'width:60%' }), h('div', { class: 'shimmer' }), h('div', { class: 'shimmer', style: 'width:85%' }),
  ));
}

function renderAnalysis(container, r, { raw, meta, extra } = {}) {
  const fromAI = r.source === 'ai';
  const card = h('article', { class: 'analysis', 'data-sev': r.severity },
    h('div', { class: 'analysis__top' },
      sevChip(r.severity),
      h('span', { class: 'tag' }, r.category),
      meta && h('span', { class: 'tag' }, meta),
      h('span', { class: 'analysis__src' }, icon(fromAI ? 'i-spark' : 'i-shield'), fromAI ? `${r.model} · ${(r.ms / 1000).toFixed(1)}s` : 'Rule engine only'),
    ),
    h('h3', {}, r.title),
    h('div', { class: 'meter' }, 'Risk', h('div', { class: 'meter__bar' }, h('i')), h('b', {}, `${r.risk_score}/100`)),
    h('p', { class: 'analysis__summary' }, r.summary),
    r.explanation && h('p', { class: 'analysis__explain' }, r.explanation),
    !fromAI && h('p', { class: 'note' }, 'The AI analyst did not answer, so this is a rule-based result. Try again in a minute.'),
    h('div', { class: 'cols' },
      h('div', { class: 'block' }, h('h4', {}, 'What the AI noticed'), h('ul', { class: 'flags' }, r.indicators.map((t) => h('li', {}, t)))),
      h('div', { class: 'block' }, h('h4', {}, 'What to do'), h('ul', { class: 'actions' }, r.actions.map((t, i) => h('li', {}, h('span', {}, String(i + 1)), h('span', {}, t))))),
    ),
    h('div', { class: 'block' }, h('h4', {}, `Rule engine · score ${r.rule_score}/100`),
      h('div', { class: 'chips' }, r.signals.length ? r.signals.map((s) => h('span', { class: 'chip' }, s.label)) : h('span', { class: 'chip' }, 'No rule matched'))),
    raw && h('details', { class: 'block' }, h('summary', { class: 'mono muted', style: 'cursor:pointer' }, 'Raw event (simulated sample)'), h('pre', { class: 'raw' }, raw)),
    extra,
  );
  container.replaceChildren(card);
  requestAnimationFrame(() => requestAnimationFrame(() => { card.querySelector('.meter__bar i').style.width = `${r.risk_score}%`; }));
}

/* ---------- console simulation ---------- */
const feedEl = $('#feed'), detailEl = $('#detail'), metaEl = $('#feed-meta');
const toggleBtn = $('#sim-toggle'), resetBtn = $('#sim-reset');
const state = { items: [], next: 0, running: false, timer: null, selected: null, inflight: 0, queue: [] };

function setRunning(on) {
  state.running = on;
  clearInterval(state.timer);
  toggleBtn.querySelector('use').setAttribute('href', on ? '#i-pause' : '#i-play');
  toggleBtn.querySelector('span').textContent = on ? 'Pause' : state.next >= SAMPLE_EVENTS.length ? 'Replay' : state.next ? 'Resume' : 'Start simulation';
  if (on) { pushEvent(); state.timer = setInterval(pushEvent, 4200); }
  updateMeta();
}

function pushEvent() {
  if (state.next >= SAMPLE_EVENTS.length) return setRunning(false);
  const ev = SAMPLE_EVENTS[state.next++];
  const item = { id: state.next, ev, status: 'pending', result: null, resolved: false, at: new Date() };
  state.items.unshift(item);
  state.queue.push(item);
  pump();
  render();
  if (!state.selected) select(item.id);
  if (state.next >= SAMPLE_EVENTS.length) setRunning(false);
}

function pump() {
  while (state.inflight < 2 && state.queue.length) {
    const item = state.queue.shift();
    state.inflight++;
    const content = `Source: ${item.ev.source} (${AREA_LABEL[item.ev.area]})\nEvent: ${item.ev.title}\nDetails: ${item.ev.raw}`;
    analyze('event', content)
      .then((r) => { item.result = r; item.status = 'done'; })
      .catch((err) => { item.status = 'error'; item.error = err.message; })
      .finally(() => { state.inflight--; pump(); render(); if (state.selected === item.id) select(item.id); });
  }
  updateMeta();
}

function updateMeta() {
  const pending = state.items.filter((i) => i.status === 'pending').length;
  metaEl.textContent = !state.items.length ? 'Idle' : `${state.items.length}/${SAMPLE_EVENTS.length} events · ${pending ? `${pending} analyzing` : state.running ? 'listening' : 'paused'}`;
}

function render() {
  feedEl.replaceChildren(...state.items.map((item) => {
    const sev = item.result?.severity;
    return h('li', {}, h('button', {
      type: 'button', class: `event${item.resolved ? ' is-resolved' : ''}`, 'aria-current': String(state.selected === item.id),
      onclick: () => select(item.id),
    },
    h('span', { class: 'event__icon' }, icon(AREA_ICON[item.ev.area])),
    h('span', {}, h('span', { class: 'event__title', style: 'display:block' }, item.ev.title),
      h('span', { class: 'event__meta', style: 'display:block' }, `${item.ev.source} · ${item.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}${item.resolved ? ' · resolved' : ''}`)),
    item.status === 'pending' ? h('span', { class: 'sev sev--pending' }, 'AI') : item.status === 'error' ? h('span', { class: 'sev', 'data-sev': 'medium' }, 'Retry') : sevChip(sev)));
  }));
  updateScore();
  updateMeta();
}

function select(id) {
  state.selected = id;
  const item = state.items.find((i) => i.id === id);
  feedEl.querySelectorAll('.event').forEach((b, i) => b.setAttribute('aria-current', String(state.items[i]?.id === id)));
  if (!item) return;
  if (item.status === 'pending') return thinking(detailEl, `AI analyst reading "${item.ev.title}"…`);
  if (item.status === 'error') {
    return detailEl.replaceChildren(h('div', { class: 'empty' }, icon('i-shield'), h('p', {}, item.error),
      h('button', { class: 'btn', type: 'button', onclick: () => { item.status = 'pending'; state.queue.push(item); pump(); render(); select(item.id); } }, 'Retry analysis')));
  }
  const r = item.result;
  const resolveBtn = r.severity !== 'none' && h('div', { class: 'analysis__foot' },
    h('button', { class: `btn${item.resolved ? '' : ' btn--primary'}`, type: 'button', onclick: () => { item.resolved = !item.resolved; render(); select(item.id); } },
      icon('i-check'), item.resolved ? 'Marked as handled · undo' : 'Mark as handled'),
    h('span', { class: 'mono muted' }, 'Handled events stop counting against your score.'));
  renderAnalysis(detailEl, r, { raw: item.ev.raw, meta: `${AREA_LABEL[item.ev.area]} · ${item.ev.source}`, extra: resolveBtn });
}

const scoreBar = $('#score-bar'), scoreNum = $('#score-num'), scoreState = $('#score-state');
let shownScore = 100;
function updateScore() {
  const open = state.items.filter((i) => i.result && !i.resolved);
  const score = Math.max(0, 100 - open.reduce((s, i) => s + SEV_WEIGHT[i.result.severity], 0));
  const color = score >= 80 ? 'var(--accent)' : score >= 50 ? 'var(--sev-medium)' : 'var(--sev-critical)';
  scoreBar.style.strokeDashoffset = String(326.7 * (1 - score / 100));
  scoreBar.style.stroke = color;
  scoreBar.style.color = color;
  scoreState.textContent = score >= 80 ? 'All clear' : score >= 50 ? 'Needs attention' : 'Under attack';
  const from = shownScore; const t0 = performance.now();
  const step = (t) => { const k = Math.min(1, (t - t0) / 800); scoreNum.textContent = Math.round(from + (score - from) * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
  shownScore = score;

  for (const card of document.querySelectorAll('.area')) {
    const mine = open.filter((i) => i.ev.area === card.dataset.area && i.result.severity !== 'none');
    const order = ['critical', 'high', 'medium', 'low'];
    const worst = order.find((s) => mine.some((i) => i.result.severity === s));
    if (worst) card.dataset.sev = worst; else delete card.dataset.sev;
    card.querySelector('.area__count').textContent = mine.length;
    card.querySelector('.area__status').textContent = worst ? `${mine.length} open · worst: ${SEV_LABEL[worst]}` : 'No threats';
  }
}

toggleBtn.addEventListener('click', () => {
  if (!state.running && state.next >= SAMPLE_EVENTS.length) reset();
  setRunning(!state.running);
});
function reset() {
  setRunning(false);
  Object.assign(state, { items: [], next: 0, selected: null, queue: [] });
  render();
  detailEl.replaceChildren(h('div', { class: 'empty' }, icon('i-spark'), h('p', {}, 'Select an event to read the AI\'s analysis.')));
  setRunning(false);
}
resetBtn.addEventListener('click', reset);
document.querySelectorAll('[data-start-demo]').forEach((a) => a.addEventListener('click', () => { if (!state.running && !state.items.length) setTimeout(() => setRunning(true), 600); }));

/* ---------- scanner ---------- */
const EXAMPLES = {
  url: [
    ['Look-alike bank', 'http://bancon0va-secure-login.top/acceso?id=88213'],
    ['Brand in disguise', 'https://paypal.com.account-review.xyz/signin'],
    ['Normal site', 'https://www.wikipedia.org/'],
  ],
  message: [
    ['Package scam SMS', 'Your package could not be delivered. Pay the 25 MXN customs fee within 24 hours or it will be returned: http://bit.ly/dhl-mx-pago'],
    ['Fake support email', 'Hello, this is the Security Team. We detected unusual activity and your account will be suspended today. To keep it, reply with the 6-digit verification code we just sent to your phone.'],
    ['Normal message', 'Hi! Are we still on for dinner on Friday at 8? I booked the table under my name.'],
  ],
};
const scanForm = $('#scan-form'), scanInput = $('#scan-input'), scanBtn = $('#scan-btn'), scanOut = $('#scan-result'), examplesEl = $('#examples');
let scanKind = 'url';
function setKind(kind) {
  scanKind = kind;
  document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.kind === kind)));
  scanInput.placeholder = kind === 'url' ? 'https://example.com/login' : 'Paste the email, SMS or chat message here…';
  scanInput.maxLength = kind === 'url' ? 2048 : 4000;
  examplesEl.replaceChildren(...EXAMPLES[kind].map(([label, text]) => h('button', { type: 'button', onclick: () => { scanInput.value = text; scanInput.focus(); } }, label)));
}
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => setKind(t.dataset.kind)));
setKind('url');

scanForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = scanInput.value.trim();
  if (!content) return scanInput.focus();
  scanBtn.disabled = true;
  thinking(scanOut, 'Rule engine done · AI analyst thinking…');
  try {
    renderAnalysis(scanOut, await analyze(scanKind, content), { meta: scanKind === 'url' ? 'Link' : 'Message' });
  } catch (err) {
    scanOut.replaceChildren(h('div', { class: 'empty' }, icon('i-shield'), h('p', {}, err.message)));
  } finally {
    scanBtn.disabled = false;
  }
});

/* ---------- assistant ---------- */
const chat = $('#chat'), chatOpen = $('#chat-open'), chatLog = $('#chat-log'), chatForm = $('#chat-form'), chatInput = $('#chat-input'), suggest = $('#chat-suggest');
const history = [];
let chatBusy = false;

function openChat(open) {
  chat.hidden = !open;
  chatOpen.hidden = open;
  chatOpen.setAttribute('aria-expanded', String(open));
  if (open) chatInput.focus(); else chatOpen.focus();
}
chatOpen.addEventListener('click', () => openChat(true));
$('#chat-close').addEventListener('click', () => openChat(false));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !chat.hidden) openChat(false); });
suggest.addEventListener('click', (e) => { if (e.target.closest('button')) send(e.target.closest('button').textContent); });
chatForm.addEventListener('submit', (e) => { e.preventDefault(); send(chatInput.value); });

/** Safe mini-markdown: escape first, then allow **bold** and "- " bullets. */
function md(text) {
  const esc = text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const bold = (s) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  let html = '', inList = false;
  for (const line of esc.split('\n')) {
    const li = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)/);
    if (li) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${bold(li[1])}</li>`; continue; }
    if (inList) { html += '</ul>'; inList = false; }
    if (line.trim()) html += `<p>${bold(line)}</p>`;
  }
  return html + (inList ? '</ul>' : '');
}

function consoleContext() {
  const done = state.items.filter((i) => i.result);
  if (!done.length) return `Guardian score ${shownScore}. No events analyzed yet. The simulation has not started.`;
  return `Guardian score ${shownScore}/100.\n` + done.slice(0, 12).map((i) => `- [${i.result.severity}${i.resolved ? ', handled' : ''}] ${AREA_LABEL[i.ev.area]}: ${i.ev.title}. AI: ${i.result.summary}`).join('\n');
}

async function send(text) {
  text = text.trim();
  if (!text || chatBusy) return;
  chatBusy = true;
  chatInput.value = '';
  suggest.hidden = true;
  chatLog.append(h('div', { class: 'msg msg--user' }, text));
  history.push({ role: 'user', content: text });
  const bubble = h('div', { class: 'msg msg--ai cursor' });
  chatLog.append(bubble);
  chatLog.scrollTop = chatLog.scrollHeight;
  let answer = '';
  try {
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: history, context: consoleContext() }) });
    if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error || 'The assistant is unavailable.');
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const j = JSON.parse(data);
          answer += j.response ?? j.choices?.[0]?.delta?.content ?? '';
        } catch { /* partial keep-alive line */ }
      }
      bubble.innerHTML = md(answer);
      chatLog.scrollTop = chatLog.scrollHeight;
    }
    if (!answer.trim()) throw new Error('The assistant returned an empty answer. Try again.');
    history.push({ role: 'assistant', content: answer });
  } catch (err) {
    history.pop();
    bubble.classList.add('msg--err');
    bubble.textContent = err.message;
  } finally {
    bubble.classList.remove('cursor');
    chatBusy = false;
  }
}

// Exposed for the self-test and the showcase recording.
window.__opvora = { state, send, setRunning, analyze };
