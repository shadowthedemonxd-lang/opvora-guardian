// OPVORA app (beta): Check, History (this browser only), Assistant, First aid, Settings. Hash routes: #/check, #/history[/id], #/assistant, #/help, #/settings.
import { GUIDES } from './strings.js';
import { t, getLang, onLang } from '../i18n.js';
import { $, h, icon, sevChip, sevLabel, emptyState, thinking, renderAnalysis, analyze, streamChat, md, initPrefs, EXAMPLES, EX_LABEL } from '../shared.js';

initPrefs();

/* ---------- this browser's storage (history, history switch, welcome note) ---------- */
const KEYS = { hist: 'opvora-history', keep: 'opvora-keep-history', welcomed: 'opvora-welcomed' };
const store = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; } },
  set(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* storage full or blocked: the app keeps working in memory */ } },
};
const HIST_MAX = 50;
let hist = store.get(KEYS.hist, []);
if (!Array.isArray(hist)) hist = [];
hist = hist.filter((e) => e && e.id && e.r && typeof e.content === 'string');
const keepHistory = () => store.get(KEYS.keep, true) !== false;
let lastCheck = null; // also kept in memory when history is off, so the assistant can see it this session

function saveHist() { store.set(KEYS.hist, hist); paintCount(); }
function addCheck(kind, content, r) {
  const entry = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), at: Date.now(), kind, content, r };
  lastCheck = entry;
  if (keepHistory()) { hist.unshift(entry); hist.length = Math.min(hist.length, HIST_MAX); saveHist(); }
  return entry;
}
function paintCount() {
  const c = $('#hist-count');
  c.hidden = !hist.length;
  c.textContent = hist.length;
}

const kindLabel = (k) => t(k === 'url' ? 'scan.link' : 'scan.message');
const askPrompt = (e) => t('app.askPrompt', { title: e.r.title, what: kindLabel(e.kind).toLowerCase(), sev: sevLabel(e.r.severity) });
const locale = () => (getLang() === 'es' ? 'es-MX' : 'en');
function when(ts) {
  const d = new Date(ts), today = new Date().toDateString() === d.toDateString();
  return new Intl.DateTimeFormat(locale(), today ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);
}

/** Two-step button for anything that deletes: first tap arms it for 4 s, second tap acts. */
function confirmButton(btn, labelKey, confirmKey, action) {
  let armed = false, timer;
  const paint = () => { btn.querySelector('span').textContent = t(armed ? confirmKey : labelKey); btn.classList.toggle('is-armed', armed); };
  btn.addEventListener('click', () => {
    if (!armed) { armed = true; paint(); timer = setTimeout(() => { armed = false; paint(); }, 4000); return; }
    clearTimeout(timer); armed = false; paint(); action();
  });
  onLang(paint);
  paint();
}

/* ---------- AI status (sidebar and Settings) ---------- */
let aiUp = true;
function paintStatus() {
  document.querySelectorAll('[data-ai-status]').forEach((el) => { el.classList.toggle('is-down', !aiUp); el.lastChild.textContent = t(aiUp ? 'status.online' : 'status.fallback'); });
}

/* ---------- router ---------- */
const VIEWS = ['check', 'history', 'assistant', 'help', 'settings'];
let current = null, booted = false;
function route() {
  const [name, arg] = location.hash.replace(/^#\/?/, '').split('/');
  const view = VIEWS.includes(name) ? name : 'check';
  const changed = view !== current;
  current = view;
  document.querySelectorAll('[data-view]').forEach((s) => { s.hidden = s.dataset.view !== view; });
  document.querySelectorAll('[data-route]').forEach((a) => { if (a.dataset.route === view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  document.title = `${t(`app.title.${view}`)} · OPVORA`;
  if (view === 'history') showHistory(arg);
  if (view === 'settings') paintSettings();
  if (view === 'assistant') growInput();
  if (changed && booted) {
    window.scrollTo(0, 0);
    $(`[data-view="${view}"] h1`).focus({ preventScroll: true }); // screen readers hear where they landed
  }
}
addEventListener('hashchange', route);

/* ---------- Check ---------- */
const form = $('#check-form'), input = $('#check-input'), btn = $('#check-btn'), out = $('#check-result'), exEl = $('#check-examples');
let kind = 'url', shown = null; // shown: the entry whose verdict is on screen, re-rendered on language change

function setKind(k) {
  kind = k;
  document.querySelectorAll('#check-form .tab').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.kind === k)));
  input.placeholder = t(k === 'url' ? 'scan.urlPh' : 'scan.msgPh');
  input.maxLength = k === 'url' ? 2048 : 4000;
  exEl.replaceChildren(...EXAMPLES[k].map(([key, text]) => h('button', { type: 'button', onclick: () => { input.value = typeof text === 'string' ? text : text[getLang()]; paintReadout(); input.focus(); } }, EX_LABEL[getLang()][key])));
  paintReadout();
}
function paintReadout() { $('#check-readout').textContent = t('app.check.readout', { kind: kindLabel(kind).toLowerCase(), n: input.value.length, max: input.maxLength }); }
function paintNote() { $('#check-note').textContent = t(keepHistory() ? 'app.check.noteOn' : 'app.check.noteOff'); }
function checkEmpty() { shown = null; out.replaceChildren(standby(t('app.check.emptyTitle'), t('app.check.emptyBody'))); }
const standby = (title, body, ...extra) => { const e = emptyState(title, body, ...extra); e.classList.add('standby'); return e; };

function showCheck(entry) {
  shown = entry;
  renderAnalysis(out, entry.r, {
    meta: kindLabel(entry.kind),
    ask: askPrompt(entry),
    onAsk: askAbout,
    extra: hist.includes(entry) && h('a', { class: 'btn btn--quiet btn--sm', href: `#/history/${entry.id}` }, icon('i-history'), t('app.check.inHistory')),
  });
}

async function runCheck(content, k = kind) {
  if (k !== kind) setKind(k);
  if (!navigator.onLine) { out.replaceChildren(standby(t('detail.failed'), t('app.offline'))); return; }
  btn.disabled = true;
  thinking(out, t('scan.thinking'));
  if (matchMedia('(max-width: 900px)').matches) out.scrollIntoView({ block: 'start', behavior: 'smooth' });
  try {
    const r = await analyze(k, content);
    aiUp = r.source === 'ai';
    paintStatus();
    showCheck(addCheck(r.kind || k, content, r));
  } catch (err) {
    shown = null;
    out.replaceChildren(standby(t('detail.failed'), err.message,
      h('button', { class: 'btn btn--line btn--sm', type: 'button', onclick: () => runCheck(content, k) }, icon('i-reset'), t('app.check.retry'))));
  } finally {
    btn.disabled = false;
  }
}
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const content = input.value.trim();
  if (!content) return input.focus();
  runCheck(content);
});
input.addEventListener('input', paintReadout);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) form.requestSubmit(); });
document.querySelectorAll('#check-form .tab').forEach((x) => x.addEventListener('click', () => setKind(x.dataset.kind)));

// first visit: a short note on what works in this beta
const welcome = $('#welcome');
welcome.hidden = store.get(KEYS.welcomed, false) === true;
$('#welcome-ok').addEventListener('click', () => { store.set(KEYS.welcomed, true); welcome.hidden = true; input.focus(); });

/* ---------- History ---------- */
const histWrap = $('#hist'), histList = $('#hist-list'), histDetail = $('#hist-detail'), histEmpty = $('#hist-empty'), histClear = $('#hist-clear');

function showHistory(id) {
  histClear.hidden = !hist.length;
  if (!hist.length) {
    histWrap.hidden = true;
    histEmpty.hidden = false;
    histEmpty.replaceChildren(keepHistory()
      ? standby(t('app.hist.emptyTitle'), t('app.hist.emptyBody'), h('a', { class: 'btn btn--ink btn--sm', href: '#/check' }, icon('i-search'), t('app.hist.go')))
      : standby(t('app.hist.offTitle'), t('app.hist.offBody'), h('a', { class: 'btn btn--ink btn--sm', href: '#/settings' }, icon('i-sliders'), t('app.hist.openSettings'))));
    return;
  }
  histWrap.hidden = false;
  histEmpty.hidden = true;
  const entry = id && hist.find((e) => e.id === id);
  histWrap.classList.toggle('is-detail', Boolean(id));
  histList.replaceChildren(...hist.map((e) => h('li', {}, h('a', { class: 'hrow', href: `#/history/${e.id}`, 'aria-current': e === entry ? 'true' : null },
    sevChip(e.r.severity, e.r.verdict === 'unverified' ? t('sev.unverified') : null),
    h('span', { class: 'hrow__main' }, h('span', { class: 'hrow__title' }, e.r.title), h('span', { class: 'hrow__text' }, e.content)),
    h('time', { class: 'hrow__time', datetime: new Date(e.at).toISOString() }, when(e.at))))));

  if (!id) { histDetail.replaceChildren(standby(t('app.hist.pick'), t('app.hist.pickBody'))); return; }
  const back = h('a', { class: 'btn btn--quiet btn--sm hdetail__back', href: '#/history' }, icon('i-back'), t('app.hist.back'));
  if (!entry) { histDetail.replaceChildren(h('div', { class: 'hdetail__bar' }, back), standby(t('app.hist.missing'), '')); return; }
  const card = h('div');
  histDetail.replaceChildren(
    h('div', { class: 'hdetail__bar' }, back, h('time', { class: 'hrow__time', datetime: new Date(entry.at).toISOString() }, when(entry.at))),
    h('div', { class: 'hdetail__item' }, h('p', { class: 'hdetail__label' }, t('app.hist.checked'), ' · ', kindLabel(entry.kind)), h('p', { class: 'hdetail__quote' }, entry.content)),
    card);
  renderAnalysis(card, entry.r, {
    meta: kindLabel(entry.kind),
    ask: askPrompt(entry),
    onAsk: askAbout,
    extra: [
      h('button', { class: 'btn btn--ink btn--sm', type: 'button', onclick: () => { location.hash = '#/check'; input.value = entry.content; paintReadout(); runCheck(entry.content, entry.kind); } }, icon('i-reset'), t('app.hist.again')),
      h('button', { class: 'btn btn--quiet btn--sm', type: 'button', onclick: () => { hist = hist.filter((e) => e !== entry); saveHist(); location.hash = '#/history'; } }, icon('i-trash'), t('app.hist.delete')),
    ],
  });
  if (matchMedia('(max-width: 900px)').matches) window.scrollTo(0, 0);
}
function clearHistory() {
  hist = [];
  saveHist();
  if (shown) showCheck(shown); // drops the "Open in History" link
  route();
}
confirmButton(histClear, 'app.hist.clear', 'app.hist.confirm', clearHistory);

/* ---------- Assistant ---------- */
const log = $('#asst-log'), aForm = $('#asst-form'), aInput = $('#asst-input'), aSend = $('#asst-send'), suggest = $('#asst-suggest');
const convo = [];
let busy = false;

function growInput() { aInput.style.height = 'auto'; aInput.style.height = `${Math.min(aInput.scrollHeight, 140)}px`; }
const aiRow = (bubble) => h('div', { class: 'row row--ai' }, h('span', { class: 'chat__avatar', 'aria-hidden': 'true' }, icon('i-logo')), bubble);
function resetChat() {
  if (busy) return;
  convo.length = 0;
  const hello = h('div', { class: 'msg msg--ai' });
  hello.innerHTML = md(t('app.asst.greeting'));
  log.replaceChildren(aiRow(hello));
  suggest.hidden = false;
}
// What the assistant may see: this browser's own checks, labelled as real. Never the console demo.
// The server keeps only the first 2500 characters, so language and the latest check text go first.
function context() {
  const recent = keepHistory() ? hist.slice(0, 6) : lastCheck ? [lastCheck] : [];
  const lines = [];
  if (getLang() === 'es') lines.push('The user is reading the app in Spanish; answer in Mexican Spanish unless they write in another language.');
  if (lastCheck) lines.push(`Text of the most recent check: ${lastCheck.content.slice(0, 600)}`);
  lines.push(recent.length
    ? "The user's own recent checks in this browser (real results, newest first):\n" + recent.map((e) => `- ${e.kind === 'url' ? 'Link' : 'Message'} rated ${e.r.severity} (${e.r.risk_score}/100): "${e.r.title}". ${e.r.summary}`).join('\n')
    : 'The user has not checked anything in this browser yet.');
  return lines.join('\n');
}
async function send(text) {
  text = text.trim();
  if (!text || busy) return;
  busy = true;
  aSend.disabled = true;
  log.setAttribute('aria-busy', 'true');
  aInput.value = '';
  growInput();
  suggest.hidden = true;
  log.append(h('div', { class: 'row row--user' }, h('div', { class: 'msg msg--user' }, text)));
  convo.push({ role: 'user', content: text });
  const bubble = h('div', { class: 'msg msg--ai' }, h('span', { class: 'typing', 'aria-label': t('chat.typing') }, h('i'), h('i'), h('i')));
  log.append(aiRow(bubble));
  log.scrollTop = log.scrollHeight;
  try {
    const answer = await streamChat(convo, context(), (so) => { bubble.innerHTML = md(so); bubble.classList.add('cursor'); log.scrollTop = log.scrollHeight; });
    convo.push({ role: 'assistant', content: answer });
  } catch (err) {
    convo.pop();
    bubble.classList.add('msg--err');
    bubble.textContent = err.message;
  } finally {
    bubble.classList.remove('cursor');
    log.removeAttribute('aria-busy');
    busy = false;
    aSend.disabled = false;
  }
}
function askAbout(prompt) { location.hash = '#/assistant'; send(prompt); }
aForm.addEventListener('submit', (e) => { e.preventDefault(); send(aInput.value); });
aInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(aInput.value); } });
aInput.addEventListener('input', growInput);
suggest.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) send(b.textContent); });
$('#asst-clear').addEventListener('click', () => { resetChat(); aInput.focus(); });

/* ---------- First aid ---------- */
function renderGuides() {
  $('#guides').replaceChildren(...GUIDES[getLang()].map((g) => h('details', { class: 'guide' },
    h('summary', {}, h('span', { class: 'guide__head' }, h('span', { class: 'guide__title' }, g.title), h('span', { class: 'guide__when' }, g.when)), icon('i-chevron')),
    h('div', { class: 'guide__body' },
      h('ol', { class: 'actions' }, g.steps.map((s, i) => h('li', {}, h('span', {}, String(i + 1)), h('span', {}, s)))),
      h('button', { class: 'btn btn--line btn--sm', type: 'button', onclick: () => askAbout(g.ask) }, icon('i-spark'), t('app.help.ask'))))));
}

/* ---------- Settings ---------- */
const keepBox = $('#keep-hist');
function paintSettings() {
  keepBox.checked = keepHistory();
  $('#hist-size').textContent = t(hist.length === 1 ? 'app.set.histOne' : hist.length ? 'app.set.histSize' : 'app.set.histNone', { n: hist.length });
  $('#set-clear').disabled = !hist.length;
}
keepBox.addEventListener('change', () => { store.set(KEYS.keep, keepBox.checked); paintNote(); paintSettings(); });
confirmButton($('#set-clear'), 'app.set.clearBtn', 'app.set.confirm', () => { clearHistory(); paintSettings(); });
confirmButton($('#set-reset'), 'app.set.resetBtn', 'app.set.confirm', () => {
  for (const k of [...Object.values(KEYS), 'opvora-theme', 'opvora-lang']) try { localStorage.removeItem(k); } catch { /* storage blocked */ }
  location.replace('/app/#/check');
  location.reload();
});

/* ---------- keyboard: "/" jumps to the checker ---------- */
document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea, [contenteditable]')) return;
  e.preventDefault();
  if (current !== 'check') location.hash = '#/check';
  input.focus();
});

/* ---------- language ---------- */
onLang(() => {
  setKind(kind);
  paintNote();
  paintStatus();
  if (shown) showCheck(shown); else checkEmpty();
  if (!convo.length) resetChat();
  renderGuides();
  route();
});

setKind('url');
paintNote();
paintStatus();
paintCount();
checkEmpty();
resetChat();
renderGuides();
route();
booted = true;
