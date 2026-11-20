import { SAMPLE_EVENTS, EVENT_ES } from './events.js';
import { t, getLang, setLang, onLang } from './i18n.js';

const $ = (s, root = document) => root.querySelector(s);
const SEV_WEIGHT = { critical: 26, high: 15, medium: 7, low: 2, none: 0 };
const AREA_ICON = { browsing: 'i-globe', device: 'i-device', accounts: 'i-accounts' };
const AREA_EN = { browsing: 'Browsing', device: 'PC security', accounts: 'Accounts' }; // what the AI and chat context receive
const sevLabel = (s) => t(`sev.${s}`);
const areaLabel = (a) => t(`area.${a}`);
const evTitle = (ev) => (getLang() === 'es' ? EVENT_ES[SAMPLE_EVENTS.indexOf(ev)]?.[1] : null) || ev.title;
const evSource = (ev) => (getLang() === 'es' ? EVENT_ES[SAMPLE_EVENTS.indexOf(ev)]?.[0] : null) || ev.source;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

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
const sevChip = (sev, label) => h('span', { class: 'sev', 'data-sev': sev }, label || sevLabel(sev));
const emptyState = (title, body) => h('div', { class: 'empty' }, h('p', { class: 'empty__title' }, title), h('p', {}, body));

/* ---------- smooth scroll ---------- */
let lenis = null;
function scrollToEl(el, block = 'start') {
  if (lenis) lenis.scrollTo(el, { offset: block === 'center' ? -window.innerHeight / 3 : -76, duration: 1.1 });
  else el.scrollIntoView({ block, behavior: reduceMotion() ? 'auto' : 'smooth' });
}

/* ---------- API ---------- */
const livePill = $('.pill--live');
let aiUp = true;
function paintPill() {
  livePill.classList.toggle('is-down', !aiUp);
  livePill.lastChild.textContent = t(aiUp ? 'status.online' : 'status.fallback');
}
async function analyze(kind, content) {
  const res = await fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, content, lang: getLang() }) });
  const data = await res.json().catch(() => ({ error: 'Unexpected server response.' }));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  aiUp = data.source === 'ai';
  paintPill();
  return data;
}

/* ---------- analysis card (shared by console + scanner) ---------- */
function thinking(container, label) {
  container.replaceChildren(h('div', { class: 'thinking' },
    h('p', { class: 'thinking__label' }, label),
    h('div', { class: 'shimmer', style: 'width:60%' }), h('div', { class: 'shimmer' }), h('div', { class: 'shimmer', style: 'width:85%' }),
  ));
}

function renderAnalysis(container, r, { raw, meta, extra, ask } = {}) {
  const fromAI = r.source === 'ai';
  const askBtn = h('button', { class: 'btn btn--line btn--sm', type: 'button', onclick: () => { openChat(true); send(ask || t('an.askPrompt', { title: r.title, sev: sevLabel(r.severity), summary: r.summary })); } },
    icon('i-spark'), t('an.ask'));
  const card = h('article', { class: 'analysis', 'data-sev': r.severity },
    h('div', { class: 'analysis__top' },
      sevChip(r.severity, r.verdict === 'unverified' ? t('sev.unverified') : null),
      h('span', { class: 'tag' }, r.category),
      meta && h('span', { class: 'tag' }, meta),
      h('span', { class: 'analysis__src' }, icon(fromAI ? 'i-spark' : 'i-shield'), fromAI ? `${r.model}, ${(r.ms / 1000).toFixed(1)} s` : t('an.rules')),
    ),
    h('h3', {}, r.title),
    h('div', { class: 'meter' }, t('an.risk'), h('div', { class: 'meter__bar' }, h('i')), h('b', {}, `${r.risk_score}/100`)),
    h('p', { class: 'analysis__summary' }, r.summary),
    r.explanation && h('p', { class: 'analysis__explain' }, r.explanation),
    !fromAI && h('p', { class: 'note' }, t('an.note')),
    h('div', { class: 'cols' },
      h('div', { class: 'block' }, h('h4', {}, t('an.noticed')), h('ul', { class: 'flags' }, r.indicators.map((x) => h('li', {}, x)))),
      h('div', { class: 'block' }, h('h4', {}, t('an.todo')), h('ul', { class: 'actions' }, r.actions.map((x, i) => h('li', {}, h('span', {}, String(i + 1)), h('span', {}, x))))),
    ),
    h('div', { class: 'block' }, h('h4', {}, t('an.ruleScore', { n: r.rule_score })),
      h('div', { class: 'chips' }, r.signals.length ? r.signals.map((s) => h('span', { class: 'chip' }, s.label)) : h('span', { class: 'chip' }, t('an.noRule')))),
    raw && h('details', { class: 'block' }, h('summary', {}, t('an.raw')), h('pre', { class: 'raw' }, raw)),
    h('div', { class: 'analysis__foot' }, extra, askBtn),
  );
  container.replaceChildren(card);
  requestAnimationFrame(() => requestAnimationFrame(() => { card.querySelector('.meter__bar i').style.width = `${r.risk_score}%`; }));
}

/* ---------- console simulation ---------- */
const feedEl = $('#feed'), detailEl = $('#detail'), metaEl = $('#feed-meta');
const toggleBtn = $('#sim-toggle'), resetBtn = $('#sim-reset');
const state = { items: [], next: 0, running: false, timer: null, selected: null, inflight: 0, queue: [] };

function paintToggle() {
  toggleBtn.querySelector('use').setAttribute('href', state.running ? '#i-pause' : '#i-play');
  toggleBtn.querySelector('span').textContent = t(state.running ? 'sim.pause' : state.next >= SAMPLE_EVENTS.length ? 'sim.replay' : state.next ? 'sim.resume' : 'sim.start');
}
function setRunning(on) {
  state.running = on;
  clearInterval(state.timer);
  paintToggle();
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
    const content = `Source: ${item.ev.source} (${AREA_EN[item.ev.area]})\nEvent: ${item.ev.title}\nDetails: ${item.ev.raw}`;
    analyze('event', content)
      .then((r) => { item.result = r; item.status = 'done'; })
      .catch((err) => { item.status = 'error'; item.error = err.message; })
      .finally(() => { state.inflight--; pump(); render(); if (state.selected === item.id) select(item.id); });
  }
  updateMeta();
}

function updateMeta() {
  const pending = state.items.filter((i) => i.status === 'pending').length;
  metaEl.textContent = !state.items.length ? t('meta.idle')
    : t('meta.count', { n: state.items.length, total: SAMPLE_EVENTS.length, state: pending ? t('meta.analyzing', { n: pending }) : t(state.running ? 'meta.listening' : 'meta.paused') });
}

function render() {
  feedEl.replaceChildren(...state.items.map((item) => {
    const sev = item.result?.severity;
    const fresh = !item.shown;
    item.shown = true;
    return h('li', {}, h('button', {
      type: 'button', class: `event${fresh ? ' event--new' : ''}${item.resolved ? ' is-resolved' : ''}`, 'aria-current': String(state.selected === item.id), 'data-sev': item.resolved ? null : sev,
      onclick: () => select(item.id),
    },
    h('span', { class: 'event__icon' }, icon(AREA_ICON[item.ev.area])),
    h('span', {}, h('span', { class: 'event__title' }, evTitle(item.ev)),
      h('span', { class: 'event__meta' }, h('span', {}, evSource(item.ev)), h('time', { class: 'mono' }, item.at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })), item.resolved && h('span', {}, t('feed.handled')))),
    item.status === 'pending' ? h('span', { class: 'sev sev--pending' }, 'AI') : item.status === 'error' ? h('span', { class: 'sev', 'data-sev': 'medium' }, t('feed.retry')) : sevChip(sev)));
  }));
  updateScore();
  updateMeta();
}

function detailEmpty() { detailEl.replaceChildren(emptyState(t('detail.emptyTitle'), t('detail.emptyBody'))); }

function select(id) {
  state.selected = id;
  const item = state.items.find((i) => i.id === id);
  feedEl.querySelectorAll('.event').forEach((b, i) => b.setAttribute('aria-current', String(state.items[i]?.id === id)));
  if (!item) return detailEmpty();
  if (item.status === 'pending') return thinking(detailEl, t('detail.reading', { title: evTitle(item.ev) }));
  if (item.status === 'error') {
    return detailEl.replaceChildren(h('div', { class: 'empty' }, h('p', { class: 'empty__title' }, t('detail.failed')), h('p', {}, item.error),
      h('button', { class: 'btn btn--line btn--sm', type: 'button', onclick: () => { item.status = 'pending'; state.queue.push(item); pump(); render(); select(item.id); } }, icon('i-reset'), t('detail.retry'))));
  }
  const r = item.result;
  const resolveBtn = r.severity !== 'none' && h('button', {
    class: `btn btn--sm ${item.resolved ? 'btn--line' : 'btn--ink'}`, type: 'button', title: t('handled.title'),
    onclick: () => { item.resolved = !item.resolved; render(); select(item.id); },
  }, icon('i-check'), t(item.resolved ? 'handled.undo' : 'handled.mark'));
  renderAnalysis(detailEl, r, { raw: item.ev.raw, meta: areaLabel(item.ev.area), extra: resolveBtn });
}

const scoreBar = $('#score-bar'), scoreNum = $('#score-num'), scoreState = $('#score-state');
let shownScore = 100;
function updateScore() {
  const open = state.items.filter((i) => i.result && !i.resolved);
  const score = Math.max(0, 100 - open.reduce((s, i) => s + SEV_WEIGHT[i.result.severity], 0));
  scoreBar.style.width = `${score}%`;
  scoreBar.style.background = score >= 80 ? 'var(--sev-none)' : score >= 50 ? 'var(--sev-medium)' : 'var(--sev-critical)';
  scoreState.textContent = t(score >= 80 ? 'score.clear' : score >= 50 ? 'score.attention' : 'score.attack');
  const from = shownScore; const t0 = performance.now();
  const step = (now) => { const k = Math.min(1, (now - t0) / 800); scoreNum.textContent = Math.round(from + (score - from) * (1 - (1 - k) ** 3)); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
  shownScore = score;

  for (const card of document.querySelectorAll('.area')) {
    const mine = open.filter((i) => i.ev.area === card.dataset.area && i.result.severity !== 'none');
    const worst = ['critical', 'high', 'medium', 'low'].find((s) => mine.some((i) => i.result.severity === s));
    if (worst) card.dataset.sev = worst; else delete card.dataset.sev;
    card.querySelector('.area__count').textContent = mine.length;
    card.querySelector('.area__status').textContent = worst ? t('area.open', { n: mine.length, sev: sevLabel(worst).toLowerCase() }) : t('area.none');
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
  detailEmpty();
  setRunning(false);
}
resetBtn.addEventListener('click', reset);
document.querySelector('[data-sim-start]').addEventListener('click', () => setRunning(true));
document.querySelectorAll('[data-start-demo]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault();
  scrollToEl($('#console'));
  if (!state.running && !state.items.length) setTimeout(() => setRunning(true), 700);
}));

/* ---------- scanner ---------- */
const EXAMPLES = {
  url: [
    ['ex.bank', 'http://bancon0va-secure-login.top/acceso?id=88213'],
    ['ex.brand', 'https://paypal.com.account-review.xyz/signin'],
    ['ex.normalSite', 'https://www.wikipedia.org/'],
  ],
  message: [
    ['ex.package', { en: 'Your package could not be delivered. Pay the 25 MXN customs fee within 24 hours or it will be returned: http://bit.ly/dhl-mx-pago', es: 'Tu paquete no pudo ser entregado. Paga la cuota aduanal de 25 MXN en las próximas 24 horas o será devuelto: http://bit.ly/dhl-mx-pago' }],
    ['ex.support', { en: 'Hello, this is the Security Team. We detected unusual activity and your account will be suspended today. To keep it, reply with the 6-digit verification code we just sent to your phone.', es: 'Hola, somos el Equipo de Seguridad. Detectamos actividad inusual y tu cuenta será suspendida hoy. Para conservarla, responde con el código de verificación de 6 dígitos que enviamos a tu teléfono.' }],
    ['ex.threat', { en: 'I know where you live. Send me your home address and a photo of your ID by tonight or you will regret it.', es: 'Sé dónde vives. Mándame tu dirección y una foto de tu INE antes de esta noche o te vas a arrepentir.' }],
    ['ex.normalMsg', { en: 'Hi! Are we still on for dinner on Friday at 8? I booked the table under my name.', es: '¡Hola! ¿Sigue en pie la cena del viernes a las 8? Reservé la mesa a mi nombre.' }],
  ],
};
const EX_LABEL = {
  en: { 'ex.bank': 'Look-alike bank', 'ex.brand': 'Brand in disguise', 'ex.normalSite': 'Normal site', 'ex.package': 'Package scam SMS', 'ex.support': 'Fake support email', 'ex.threat': 'Threat demanding info', 'ex.normalMsg': 'Normal message' },
  es: { 'ex.bank': 'Banco imitado', 'ex.brand': 'Marca disfrazada', 'ex.normalSite': 'Sitio normal', 'ex.package': 'SMS de paquete falso', 'ex.support': 'Correo de soporte falso', 'ex.threat': 'Amenaza pidiendo datos', 'ex.normalMsg': 'Mensaje normal' },
};
let lastScan = null;
const scanForm = $('#scan-form'), scanInput = $('#scan-input'), scanBtn = $('#scan-btn'), scanOut = $('#scan-result'), examplesEl = $('#examples');
let scanKind = 'url';
function setKind(kind) {
  scanKind = kind;
  document.querySelectorAll('.tab').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.kind === kind)));
  scanInput.placeholder = t(kind === 'url' ? 'scan.urlPh' : 'scan.msgPh');
  scanInput.maxLength = kind === 'url' ? 2048 : 4000;
  examplesEl.replaceChildren(...EXAMPLES[kind].map(([key, text]) => h('button', { type: 'button', onclick: () => { scanInput.value = typeof text === 'string' ? text : text[getLang()]; scanInput.focus(); } }, EX_LABEL[getLang()][key])));
}
document.querySelectorAll('.tab').forEach((x) => x.addEventListener('click', () => setKind(x.dataset.kind)));
setKind('url');

scanForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const content = scanInput.value.trim();
  if (!content) return scanInput.focus();
  scanBtn.disabled = true;
  thinking(scanOut, t('scan.thinking'));
  try {
    const r = await analyze(scanKind, content);
    lastScan = { content: content.slice(0, 600), r };
    const what = t(r.kind === 'url' ? 'scan.link' : 'scan.message');
    renderAnalysis(scanOut, r, { meta: what, ask: t('scan.askPrompt', { what: what.toLowerCase(), sev: sevLabel(r.severity) }) });
  } catch (err) {
    scanOut.replaceChildren(emptyState(t('detail.failed'), err.message));
  } finally {
    scanBtn.disabled = false;
  }
});

/** Every other entry point (hero box, look-alike pairs) feeds the one real scanner. */
function identify(text, kind) {
  text = text.trim();
  if (!text) return;
  setKind(kind || (/^\S+$/.test(text) && /\.\w{2,}/.test(text) ? 'url' : 'message'));
  scanInput.value = text;
  scrollToEl(scanOut, 'center');
  scanForm.requestSubmit();
}
$('#identify-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#identify-input');
  if (!input.value.trim()) return input.focus();
  identify(input.value);
});
document.querySelectorAll('[data-identify]').forEach((b) => b.addEventListener('click', () => identify(b.dataset.identify, b.dataset.kind)));
document.querySelectorAll('[data-focus-scan]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault();
  setKind('message');
  scrollToEl($('#scanner'));
  setTimeout(() => scanInput.focus({ preventScroll: true }), 700);
}));

/* ---------- assistant ---------- */
const chat = $('#chat'), chatOpen = $('#chat-open'), chatLog = $('#chat-log'), chatForm = $('#chat-form'), chatInput = $('#chat-input'), chatSend = $('#chat-send'), suggest = $('#chat-suggest');
const history = [];
let chatBusy = false;

function openChat(open) {
  chat.hidden = !open;
  chatOpen.setAttribute('aria-expanded', String(open));
  if (open) chatInput.focus(); else chatOpen.focus();
}
chatOpen.addEventListener('click', () => openChat(chat.hidden));
document.querySelectorAll('[data-open-chat]').forEach((b) => b.addEventListener('click', () => openChat(true)));
$('#chat-close').addEventListener('click', () => openChat(false));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !chat.hidden) openChat(false); });
suggest.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) send(b.textContent); });
chatForm.addEventListener('submit', (e) => { e.preventDefault(); send(chatInput.value); });
chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(chatInput.value); } });
chatInput.addEventListener('input', growInput);
function growInput() { chatInput.style.height = 'auto'; chatInput.style.height = `${Math.min(chatInput.scrollHeight, 120)}px`; }

function aiRow(bubble) {
  return h('div', { class: 'row row--ai' }, h('span', { class: 'chat__avatar', 'aria-hidden': 'true' }, icon('i-logo')), bubble);
}
function resetChat() {
  if (chatBusy) return;
  history.length = 0;
  const hello = h('div', { class: 'msg msg--ai' });
  hello.innerHTML = md(t('chat.greeting'));
  chatLog.replaceChildren(aiRow(hello));
  suggest.hidden = false;
}
$('#chat-clear').addEventListener('click', () => { resetChat(); chatInput.focus(); });

/** Safe mini-markdown: escape first, then allow **bold**, `code`, headings and lists. */
function md(text) {
  const esc = text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
  let html = '', list = null;
  const close = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const line of esc.split('\n')) {
    const ul = line.match(/^\s*[-*•]\s+(.*)/), ol = line.match(/^\s*\d+[.)]\s+(.*)/), hd = line.match(/^\s*#{1,4}\s+(.*)/);
    const item = ul || ol;
    if (item) {
      const want = ol ? 'ol' : 'ul';
      if (list !== want) { close(); html += `<${want}>`; list = want; }
      html += `<li>${inline(item[1])}</li>`;
      continue;
    }
    close();
    if (hd) html += `<p class="msg__h">${inline(hd[1])}</p>`;
    else if (line.trim()) html += `<p>${inline(line)}</p>`;
  }
  close();
  return html;
}

function consoleContext() {
  const done = state.items.filter((i) => i.result);
  let ctx = done.length
    ? `Guardian score ${shownScore}/100.\n` + done.slice(0, 12).map((i) => `- [${i.result.severity}${i.resolved ? ', handled' : ''}] ${AREA_EN[i.ev.area]}: ${i.ev.title}. AI: ${i.result.summary}`).join('\n')
    : `Guardian score ${shownScore}. No console events analyzed yet; the simulation has not started.`;
  if (lastScan) ctx += `\nLatest scanner result (real, user-pasted): rated ${lastScan.r.severity} (${lastScan.r.risk_score}/100), "${lastScan.r.title}". ${lastScan.r.summary}\nPasted text: ${lastScan.content}`;
  if (getLang() === 'es') ctx += '\nThe user is reading the site in Spanish; answer in Mexican Spanish unless they write in another language.';
  return ctx;
}

async function send(text) {
  text = text.trim();
  if (!text || chatBusy) return;
  chatBusy = true;
  chatSend.disabled = true;
  chatLog.setAttribute('aria-busy', 'true');
  chatInput.value = '';
  growInput();
  suggest.hidden = true;
  chatLog.append(h('div', { class: 'row row--user' }, h('div', { class: 'msg msg--user' }, text)));
  history.push({ role: 'user', content: text });
  const bubble = h('div', { class: 'msg msg--ai' }, h('span', { class: 'typing', 'aria-label': t('chat.typing') }, h('i'), h('i'), h('i')));
  chatLog.append(aiRow(bubble));
  chatLog.scrollTop = chatLog.scrollHeight;
  let answer = '';
  try {
    const res = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages: history, context: consoleContext() }) });
    if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error || t('chat.down'));
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
          answer += j.response || j.choices?.[0]?.delta?.content || '';
        } catch { /* partial keep-alive line */ }
      }
      if (answer) { bubble.innerHTML = md(answer); bubble.classList.add('cursor'); }
      chatLog.scrollTop = chatLog.scrollHeight;
    }
    if (!answer.trim()) throw new Error(t('chat.empty'));
    history.push({ role: 'assistant', content: answer });
  } catch (err) {
    history.pop();
    bubble.classList.add('msg--err');
    bubble.textContent = err.message;
  } finally {
    bubble.classList.remove('cursor');
    chatLog.removeAttribute('aria-busy');
    chatBusy = false;
    chatSend.disabled = false;
  }
}
resetChat();
detailEmpty();

/* ---------- theme (Auto / Light / Dark) and language ---------- */
const themeBtns = document.querySelectorAll('[data-theme-set]');
function applyTheme(x) {
  if (x === 'light' || x === 'dark') document.documentElement.dataset.theme = x; else delete document.documentElement.dataset.theme;
  themeBtns.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.themeSet === (x || 'system'))));
}
let savedTheme = null;
try { savedTheme = localStorage.getItem('opvora-theme'); } catch { /* storage blocked */ }
applyTheme(savedTheme);
themeBtns.forEach((b) => b.addEventListener('click', () => {
  applyTheme(b.dataset.themeSet);
  try { localStorage.setItem('opvora-theme', b.dataset.themeSet); } catch { /* storage blocked */ }
}));

document.querySelectorAll('[data-lang-set]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.langSet)));
function repaintLang() {
  paintPill();
  paintToggle();
  setKind(scanKind);
  render();
  if (state.selected) select(state.selected); else detailEmpty();
  if (!history.length) resetChat();
  drawLeaders();
}
onLang(repaintLang);
if (getLang() !== 'en') repaintLang();

/* ---------- keyboard: "/" jumps to the scanner ---------- */
document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest?.('input, textarea, [contenteditable]')) return;
  e.preventDefault();
  scrollToEl(scanInput, 'center');
  scanInput.focus({ preventScroll: true });
});

/* ---------- Plate I: leader lines from each mark to its label ---------- */
const plateBody = $('.plate__body'), leaders = $('.leaders');
function drawLeaders() {
  if (!plateBody || getComputedStyle(leaders).display === 'none') return;
  const box = plateBody.getBoundingClientRect();
  const edge = plateBody.querySelector('.specimen__msg').getBoundingClientRect().right - box.left;
  const ns = 'http://www.w3.org/2000/svg';
  const parts = [];
  for (const li of plateBody.querySelectorAll('.marks__list li')) {
    const from = plateBody.querySelector(`.mk[data-n="${li.dataset.n}"] .pin`)?.getBoundingClientRect();
    const to = li.querySelector('.pin').getBoundingClientRect();
    if (!from) continue;
    // drop from the pin into the gap under its text line, run along the gap out of the bubble, then to the label
    const x1 = from.left + from.width / 2 - box.left, y1 = from.bottom - box.top;
    const gap = y1 + 3 + (li.dataset.n - 1) * 3.5; // staggered so two marks on one line never share a track
    const x2 = to.left - box.left - 7, y2 = to.top + to.height / 2 - box.top;
    const d = `M${x1},${y1} V${gap} H${edge + 10} L${x2 - 16},${y2} H${x2}`;
    { const p = document.createElementNS(ns, 'path'); p.setAttribute('class', 'line'); p.setAttribute('d', d); parts.push(p); }
    const c = document.createElementNS(ns, 'circle'); c.setAttribute('cx', x2); c.setAttribute('cy', y2); c.setAttribute('r', 2.5); parts.push(c);
  }
  leaders.replaceChildren(...parts);
}
drawLeaders();
if (plateBody) new ResizeObserver(() => drawLeaders()).observe(plateBody);
document.fonts?.ready.then(drawLeaders);

/* ---------- motion: GSAP + ScrollTrigger + Lenis, only when motion is welcome ---------- */
const nav = $('.nav'), cover = $('.cover');
function onScrollNav() { nav.classList.toggle('is-scrolled', window.scrollY > cover.offsetHeight - nav.offsetHeight - 4); }
addEventListener('scroll', onScrollNav, { passive: true });
onScrollNav();

addEventListener('load', () => {
  const { gsap, ScrollTrigger, Lenis } = window;
  const thumbs = [...document.querySelectorAll('.thumbs a')];
  const marks = (id) => thumbs.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === id));

  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const motion = !reduceMotion();

  if (motion && Lenis) {
    lenis = new Lenis({ duration: 1.1, easing: (x) => 1 - Math.pow(1 - x, 4) });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]:not([data-start-demo]):not([data-focus-scan])').forEach((a) => a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(a.getAttribute('href') === '#top' ? 0 : target, { offset: -76, duration: 1.2 });
    }));
  }

  // thumb index follows the plate in view
  [['#top', '.cover'], ['#console', '#console'], ['#scanner', '#scanner'], ['#lookalikes', '#lookalikes'], ['#habitats', '#habitats'], ['#method', '#method']].forEach(([id, sel]) => {
    ScrollTrigger.create({ trigger: sel, start: 'top 45%', end: 'bottom 45%', onToggle: (s) => s.isActive && marks(id) });
  });

  if (!motion) return;
  document.documentElement.classList.add('js-motion');

  // The one authored moment: the specimen is dissected on load.
  const lines = leaders.querySelectorAll('.line');
  lines.forEach((p) => { const len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len; });
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.15 });
  // copy and plate stay visible from the first paint; only the dissection animates
  tl.from('.plate', { y: 18, rotate: 0.6, duration: 1.2 })
    .fromTo('.mk', { backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%', duration: 0.6, stagger: 0.22, ease: 'power3.out' }, 0.2)
    .from('.mk .pin', { scale: 0, duration: 0.5, stagger: 0.22, ease: 'back.out(3)' }, '<')
    .to(lines, { strokeDashoffset: 0, duration: 0.9, stagger: 0.12, ease: 'power2.inOut' }, '-=0.4')
    .from('.leaders circle', { scale: 0, transformOrigin: 'center', duration: 0.3, stagger: 0.2 }, '-=0.5')
    .from('.marks__list li', { x: -8, opacity: 0.25, duration: 0.6, stagger: 0.18 }, '<')
    .from('.tox__bar i', { width: 0, duration: 1.2 }, '-=0.5')
    .from('.first li', { y: 6, opacity: 0.25, duration: 0.5, stagger: 0.1 }, '-=0.9')
    .add(() => lines.forEach((p) => { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; }));

  // look-alikes: the difference gets marked as each pair arrives
  document.querySelectorAll('.pair').forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 78%', once: true, onEnter: () => el.classList.add('is-in') }));

  // method: the rail fills with the scroll, each step lights as it is reached
  const steps = [...document.querySelectorAll('.flow li')];
  gsap.fromTo('.rail i', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.method', start: 'top 70%', end: 'bottom 75%', scrub: 0.6,
    onUpdate: (s) => steps.forEach((li, i) => li.classList.toggle('is-on', s.progress >= i / steps.length + 0.02)) } });
});

// Exposed for the self-test and the showcase recording.
window.__opvora = { state, send, setRunning, analyze };
