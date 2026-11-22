// Landing page (showcase): Plate I, the simulated console, the scanner, the assistant panel and the scroll motion.
import { SAMPLE_EVENTS, EVENT_ES } from './events.js';
import { t, getLang, onLang } from './i18n.js';
import { $, h, icon, sevChip, sevLabel, emptyState, reduceMotion, thinking, md, streamChat, initPrefs, EXAMPLES, EX_LABEL, analyze as apiAnalyze, renderAnalysis as cardOf } from './shared.js';

const SEV_WEIGHT = { critical: 26, high: 15, medium: 7, low: 2, none: 0 };
const AREA_ICON = { browsing: 'i-globe', device: 'i-device', accounts: 'i-accounts' };
const AREA_EN = { browsing: 'Browsing', device: 'PC security', accounts: 'Accounts' }; // what the AI and chat context receive
const areaLabel = (a) => t(`area.${a}`);
const evTitle = (ev) => (getLang() === 'es' ? EVENT_ES[SAMPLE_EVENTS.indexOf(ev)]?.[1] : null) || ev.title;
const evSource = (ev) => (getLang() === 'es' ? EVENT_ES[SAMPLE_EVENTS.indexOf(ev)]?.[0] : null) || ev.source;
initPrefs();

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
  const data = await apiAnalyze(kind, content);
  aiUp = data.source === 'ai';
  paintPill();
  return data;
}
const askAbout = (prompt) => { openChat(true); send(prompt); };
const renderAnalysis = (container, r, opts = {}) => cardOf(container, r, { ...opts, onAsk: askAbout });

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
let lastScan = null;
const scanForm = $('#scan-form'), scanInput = $('#scan-input'), scanBtn = $('#scan-btn'), scanOut = $('#scan-result'), examplesEl = $('#examples');
let scanKind = 'url';
function setKind(kind) {
  scanKind = kind;
  document.querySelectorAll('.tab').forEach((x) => x.setAttribute('aria-selected', String(x.dataset.kind === kind)));
  scanInput.placeholder = t(kind === 'url' ? 'scan.urlPh' : 'scan.msgPh');
  scanInput.maxLength = kind === 'url' ? 2048 : 4000;
  examplesEl.replaceChildren(...EXAMPLES[kind].map(([key, text]) => h('button', { type: 'button', onclick: () => { scanInput.value = typeof text === 'string' ? text : text[getLang()]; paintReadout(); scanInput.focus(); } }, EX_LABEL[getLang()][key])));
  paintReadout();
}
// live readout under the box: what kind of item, how long, and the standing promise that nothing is kept
function paintReadout() {
  $('#scan-readout').textContent = t('scan.readout', { kind: t(scanKind === 'url' ? 'scan.link' : 'scan.message').toLowerCase(), n: scanInput.value.length, max: scanInput.maxLength });
}
scanInput.addEventListener('input', paintReadout);
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
  paintReadout();
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

// The server keeps only the first 2500 characters, so the language and the user's own scan go first; the long console list goes last.
function consoleContext() {
  const done = state.items.filter((i) => i.result);
  let ctx = getLang() === 'es' ? 'The user is reading the site in Spanish; answer in Mexican Spanish unless they write in another language.\n' : '';
  if (lastScan) ctx += `Latest scanner result (real, user-pasted): rated ${lastScan.r.severity} (${lastScan.r.risk_score}/100), "${lastScan.r.title}". ${lastScan.r.summary}\nPasted text: ${lastScan.content}\n`;
  ctx += 'Showcase console (SIMULATED sample alerts, not the user\'s real data). ';
  ctx += done.length
    ? `Guardian score ${shownScore}/100.\n` + done.slice(0, 12).map((i) => `- [${i.result.severity}${i.resolved ? ', handled' : ''}] ${AREA_EN[i.ev.area]}: ${i.ev.title}. AI: ${i.result.summary}`).join('\n')
    : `Guardian score ${shownScore}. No console events analyzed yet; the simulation has not started.`;
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
  try {
    const answer = await streamChat(history, consoleContext(), (text) => {
      bubble.innerHTML = md(text);
      bubble.classList.add('cursor');
      chatLog.scrollTop = chatLog.scrollHeight;
    });
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

/* ---------- language ---------- */
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
if (getLang() !== 'en') repaintLang(); // after drawLeaders' constants exist: it runs on a Spanish first load
if (plateBody) new ResizeObserver(() => drawLeaders()).observe(plateBody);
document.fonts?.ready.then(drawLeaders);

/* ---------- motion: GSAP + ScrollTrigger + Lenis, only when motion is welcome ---------- */
// habitats on phones: each cell carries its column name, refreshed when the language changes
function labelHabitats() {
  const heads = [...document.querySelectorAll('.cover-table thead th')].map((th) => th.textContent.trim());
  document.querySelectorAll('.cover-table tbody tr').forEach((tr) => [...tr.children].forEach((cell, i) => { cell.dataset.label = heads[i]; }));
}
labelHabitats();
onLang(labelHabitats);

const nav = $('.nav'), cover = $('.cover');
function onScrollNav() {
  nav.classList.toggle('is-scrolled', window.scrollY > cover.offsetHeight - nav.offsetHeight - 4);
  const max = document.documentElement.scrollHeight - innerHeight;
  nav.style.setProperty('--sp', max > 0 ? (window.scrollY / max).toFixed(4) : '0');
}
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

  // The one authored moment: the specimen is dissected when it comes into view (on load on desktop, on scroll on phones).
  const plateScore = $('#plate-score'), count = { n: 95 };
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, scrollTrigger: { trigger: '.plate__body', start: 'top 88%', once: true } });
  const tlKey = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.3, scrollTrigger: { trigger: '.plate__key', start: 'top 95%', once: true } });
  const msg = $('.specimen__msg'), lens = { s: 0, r: 16 };
  const setLens = () => { msg.style.setProperty('--scan', lens.s.toFixed(3)); msg.style.setProperty('--ret', `${lens.r.toFixed(1)}px`); };
  setLens();
  // text decodes into place, left to right; digits only shuffle digits
  const scramble = (el, duration = 0.9) => {
    el._unscramble?.(); // a replay must never capture a half-decoded string as its final text
    const final = el.textContent, o = { p: 0 }, lang0 = getLang();
    if (el.dataset.i18n && lang0 === 'en') el.dataset.en ??= el.innerHTML; // i18n must never capture a half-decoded string
    const rnd = (c) => (/\d/.test(c) ? String(Math.floor(Math.random() * 10)) : /\s|\W/.test(c) ? c : 'abcdefghkmnoprstuvxz'[Math.floor(Math.random() * 20)]);
    // lock the width while it decodes so random glyphs never push the neighbouring text around
    el.style.width = `${el.getBoundingClientRect().width}px`; el.style.whiteSpace = 'nowrap';
    const tw = gsap.to(o, { p: 1, duration, ease: 'none',
      onUpdate: () => { if (getLang() !== lang0) return el._unscramble(); el.textContent = [...final].map((c, i) => (i < o.p * final.length ? c : rnd(c))).join(''); },
      onComplete: () => el._unscramble() });
    el._unscramble = () => { tw.kill(); if (!el.dataset.i18n || getLang() === lang0) el.textContent = final; el.style.width = el.style.whiteSpace = ''; el._unscramble = null; };
  };

  // fine pointers: the plate tilts toward the cursor and a soft light follows it; a lamp follows it over the console
  const plate = $('.plate');
  gsap.set(plate, { transformPerspective: 1200 });
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const con = $('.console');
    con.addEventListener('pointermove', (e) => {
      const b = con.getBoundingClientRect();
      con.style.setProperty('--lx', `${e.clientX - b.left}px`); con.style.setProperty('--ly', `${e.clientY - b.top}px`); con.style.setProperty('--lamp', '1');
    });
    con.addEventListener('pointerleave', () => con.style.setProperty('--lamp', '0'));
    const rx = gsap.quickTo(plate, 'rotationX', { duration: 0.8, ease: 'power3' }), ry = gsap.quickTo(plate, 'rotationY', { duration: 0.8, ease: 'power3' });
    plate.addEventListener('pointermove', (e) => {
      const b = plate.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height;
      ry((x - 0.5) * 5); rx((0.5 - y) * 4);
      plate.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`); plate.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      plate.classList.add('is-tilt');
    });
    plate.addEventListener('pointerleave', () => { rx(0); ry(0); plate.classList.remove('is-tilt'); });
  }
  tl.from('.plate', { y: 24, duration: 1.1 }) // no fade: the plate is already painted before GSAP loads
    // the lens locks on (brackets close in), sweeps the message once, then the marks light up
    .to(lens, { r: 8, duration: 0.7, onUpdate: setLens }, 0.1)
    .set(msg, { '--scan-o': 1 }, 0.35)
    .to(lens, { s: 1, duration: 0.9, ease: 'power2.inOut', onUpdate: setLens }, 0.35)
    .to(msg, { '--scan-o': 0, duration: 0.3 }, '>-0.05')
    .add(() => scramble($('.scanread span')), '<')
    .fromTo('.mk', { backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%', duration: 0.6, stagger: 0.22, ease: 'power3.out' }, 0.75)
    .from('.mk .pin', { scale: 0.4, duration: 0.5, stagger: 0.22, ease: 'back.out(3)' }, '<')
    // wipe the whole leader layer left to right: survives drawLeaders() replacing the paths mid-animation
    .fromTo('.leaders', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1, ease: 'power2.inOut', clearProps: 'clipPath' }, '-=0.3')
    .from('.marks__list li', { x: -10, opacity: 0.3, duration: 0.6, stagger: 0.18 }, '-=0.7');
  // every start state stays readable: nothing on the plate is ever blank while it waits for its trigger
  tlKey.from('.tox__sev', { y: 8, opacity: 0.3, duration: 0.5 })
    .fromTo(count, { n: 0 }, { n: 95, duration: 1.2, ease: 'power3.out', immediateRender: false, onUpdate: () => { plateScore.textContent = Math.round(count.n); } }, '<')
    .from('.tox__bar i', { width: 0, duration: 1.2 }, '<')
    .from('.first li', { y: 8, opacity: 0.3, duration: 0.5, stagger: 0.1 }, '-=0.9');

  // Each section gets its own small motion, always starting from visible content.
  // end 'max' everywhere so a trigger already scrolled past still fires on load.
  const onView = (trigger, fn, start = 'top 80%') => ScrollTrigger.create({ trigger, start, end: 'max', once: true, onEnter: fn });

  // console: the desk runs a self-check as it arrives: the meter sweeps and the three areas tick
  onView('.desk', () => gsap.timeline({ defaults: { ease: 'expo.out' } })
    .fromTo('#score-bar', { scaleX: 0, transformOrigin: 'left' }, { scaleX: 1, duration: 1.1, clearProps: 'transform' })
    .from('.area svg', { scale: 0.6, rotate: -12, duration: 0.6, stagger: 0.12, ease: 'back.out(2.5)' }, 0.15)
    .from('.area__count', { y: -6, duration: 0.5, stagger: 0.12 }, '<'));

  // look-alikes: the fake peels off the real one, then its differences get marked (the .is-in hook below)
  document.querySelectorAll('.pair').forEach((el) => onView(el, () => {
    const real = el.querySelector('.pair__side--real'), fake = el.querySelector('.pair__side--fake');
    const stacked = fake.offsetTop > real.offsetTop; // phones stack the pair, so it peels down instead of sideways
    gsap.from(fake, { [stacked ? 'y' : 'x']: stacked ? -real.offsetHeight * 0.6 : -real.offsetWidth * 0.12, rotate: -1.2, duration: 0.9, ease: 'expo.out', clearProps: 'transform' });
  }, 'top 82%'));

  // habitats: rows rise in one after another, then the live/simulated tags settle; nothing grows past its cell
  const rowOf = (el) => [...el.closest('tbody').children].indexOf(el.closest('tr'));
  onView('.cover-table', () => gsap.timeline({ defaults: { ease: 'expo.out', clearProps: 'transform,opacity' } })
    .from('.cover-table tbody tr > *', { y: 12, opacity: 0.3, duration: 0.7, stagger: (i, el) => rowOf(el) * 0.12 })
    .from('.cover-table tbody .tag', { scale: 0.85, opacity: 0.3, duration: 0.5, stagger: (i, el) => rowOf(el) * 0.12, ease: 'back.out(1.7)' }, 0.2));

  // facts strip: numbers decode into place every time the strip scrolls back into view
  const decodeFacts = () => document.querySelectorAll('.facts b').forEach((b, i) => gsap.delayedCall(i * 0.12, () => scramble(b, 0.8)));
  ScrollTrigger.create({ trigger: '.facts', start: 'top 92%', end: 'bottom 8%', onEnter: decodeFacts, onEnterBack: decodeFacts });

  // look-alikes: the difference gets marked as each pair arrives
  document.querySelectorAll('.pair').forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 78%', end: 'max', once: true, onEnter: () => el.classList.add('is-in') }));

  // method: the rail fills with the scroll, each step lights as it is reached
  const method = $('.method'), flow = $('.flow'), steps = [...flow.children];
  ScrollTrigger.create({ trigger: method, start: 'top bottom', end: 'bottom top', onToggle: (s) => method.classList.toggle('is-live', s.isActive) }); // the rail packet only runs on screen
  gsap.fromTo('.rail i', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.method', start: 'top 70%', end: 'bottom 75%', scrub: 0.6,
    onUpdate: (s) => {
      method.style.setProperty('--p', s.progress.toFixed(3)); // drives the vertical rail on phones and the packet's run
      steps.forEach((li, i) => li.classList.toggle('is-on', s.progress >= i / steps.length + 0.02));
    } } });
});

// Exposed for the self-test.
window.__opvora = { state, send, setRunning, analyze };
