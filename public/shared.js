// Shared by every OPVORA page: DOM builder, icons, the verdict card, API calls, the assistant stream, theme, language and the release badge.
import { t, getLang, setLang, onLang } from './i18n.js';

/** The one place the release is named. Bump it here and in package.json. */
export const VERSION = '0.1.0-beta';
export const versionLabel = () => { const [num, stage] = VERSION.split('-'); return `${stage ? `${stage} · ` : ''}v${num}`; };

export const $ = (s, root = document) => root.querySelector(s);
export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const sevLabel = (s) => t(`sev.${s}`);

/** Tiny DOM builder. Strings become text nodes, so model output can never inject HTML. */
export function h(tag, attrs = {}, ...kids) {
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
export const icon = (id) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `/icons.svg#${id}`);
  svg.append(use);
  return svg;
};
export const sevChip = (sev, label) => h('span', { class: 'sev', 'data-sev': sev }, label || sevLabel(sev));
export const emptyState = (title, body, ...extra) => h('div', { class: 'empty' }, h('p', { class: 'empty__title' }, title), h('p', {}, body), ...extra);

/** Sample inputs for the checker, one tap each. */
export const EXAMPLES = {
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
export const EX_LABEL = {
  en: { 'ex.bank': 'Look-alike bank', 'ex.brand': 'Brand in disguise', 'ex.normalSite': 'Normal site', 'ex.package': 'Package scam SMS', 'ex.support': 'Fake support email', 'ex.threat': 'Threat demanding info', 'ex.normalMsg': 'Normal message' },
  es: { 'ex.bank': 'Banco imitado', 'ex.brand': 'Marca disfrazada', 'ex.normalSite': 'Sitio normal', 'ex.package': 'SMS de paquete falso', 'ex.support': 'Correo de soporte falso', 'ex.threat': 'Amenaza pidiendo datos', 'ex.normalMsg': 'Mensaje normal' },
};

/* ---------- API ---------- */
export async function analyze(kind, content) {
  const res = await fetch('/api/analyze', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, content, lang: getLang() }) });
  const data = await res.json().catch(() => ({ error: 'Unexpected server response.' }));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/** Streams the assistant's answer; onText gets the whole answer so far. Resolves with the final text. */
export async function streamChat(messages, context, onText) {
  const res = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages, context }) });
  if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error || t('chat.down'));
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '', answer = '';
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
    if (answer) onText(answer);
  }
  if (!answer.trim()) throw new Error(t('chat.empty'));
  return answer;
}

/** Safe mini-markdown: escape first, then allow **bold**, `code`, headings and lists. */
export function md(text) {
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

/* ---------- verdict card ---------- */
export function thinking(container, label) {
  container.replaceChildren(h('div', { class: 'thinking' },
    h('p', { class: 'thinking__label' }, label),
    h('div', { class: 'shimmer', style: 'width:60%' }), h('div', { class: 'shimmer' }), h('div', { class: 'shimmer', style: 'width:85%' }),
  ));
}

/** onAsk(prompt) adds the "Ask OPVORA about this" button; extra is any node for the footer. */
export function renderAnalysis(container, r, { raw, meta, extra, ask, onAsk } = {}) {
  const fromAI = r.source === 'ai';
  const askBtn = onAsk && h('button', { class: 'btn btn--line btn--sm', type: 'button', onclick: () => onAsk(ask || t('an.askPrompt', { title: r.title, sev: sevLabel(r.severity), summary: r.summary })) },
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
    (extra || askBtn) && h('div', { class: 'analysis__foot' }, extra, askBtn),
  );
  container.replaceChildren(card);
  requestAnimationFrame(() => requestAnimationFrame(() => { card.querySelector('.meter__bar i').style.width = `${r.risk_score}%`; }));
  return card;
}

/* ---------- theme (Auto / Light / Dark), language, release badge ---------- */
const THEME_ICON = { system: 'i-auto', light: 'i-sun', dark: 'i-moon' };
let themeNow = 'system';
function applyTheme(x) {
  themeNow = x === 'light' || x === 'dark' ? x : 'system';
  if (themeNow === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = themeNow;
  document.querySelectorAll('[data-theme-set]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.themeSet === themeNow)));
  paintThemeCycle();
}
// phones get one button that steps Auto → Light → Dark; its label reuses the (translated) labels of the full switch
function paintThemeCycle() {
  const cycle = $('#theme-cycle'), seg = $('.seg--theme'), active = $(`[data-theme-set="${themeNow}"]`);
  if (!cycle || !seg || !active) return;
  cycle.querySelector('use').setAttribute('href', `/icons.svg#${THEME_ICON[themeNow]}`);
  cycle.setAttribute('aria-label', `${seg.getAttribute('aria-label')}: ${active.getAttribute('aria-label')}`);
  cycle.title = cycle.getAttribute('aria-label');
}
function saveTheme(x) {
  applyTheme(x);
  try { localStorage.setItem('opvora-theme', themeNow); } catch { /* storage blocked */ }
}

/** Wires every theme and language control on the page and fills each [data-version] badge. */
export function initPrefs() {
  let saved = null;
  try { saved = localStorage.getItem('opvora-theme'); } catch { /* storage blocked */ }
  applyTheme(saved);
  document.querySelectorAll('[data-theme-set]').forEach((b) => b.addEventListener('click', () => saveTheme(b.dataset.themeSet)));
  $('#theme-cycle')?.addEventListener('click', () => saveTheme({ system: 'light', light: 'dark', dark: 'system' }[themeNow]));
  onLang(paintThemeCycle);
  document.querySelectorAll('[data-lang-set]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.langSet)));
  document.querySelectorAll('[data-version]').forEach((el) => { el.textContent = versionLabel(); });
}
