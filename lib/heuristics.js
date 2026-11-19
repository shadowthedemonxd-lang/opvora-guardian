// Deterministic rule engine. Runs before the AI on every request and is the fallback when the AI is unavailable.

const RISKY_TLDS = new Set(['zip', 'mov', 'top', 'xyz', 'click', 'country', 'gq', 'tk', 'ml', 'cf', 'ga', 'work', 'rest', 'support', 'cam', 'lol', 'icu', 'buzz', 'monster']);
const SHORTENERS = new Set(['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'cutt.ly', 'rb.gy', 'shorturl.at', 'tiny.cc']);
const BRANDS = ['paypal', 'apple', 'microsoft', 'google', 'amazon', 'netflix', 'facebook', 'instagram', 'whatsapp', 'outlook', 'office365', 'icloud', 'mercadolibre', 'bbva', 'santander', 'banorte', 'banamex', 'coinbase', 'binance', 'steam', 'dhl', 'fedex'];
const SECOND_LEVEL = new Set(['com.mx', 'co.uk', 'com.br', 'com.ar', 'gob.mx', 'org.mx', 'co.jp', 'com.au']);

const TEXT_RULES = [
  { id: 'urgency', label: 'Pressure or urgency language', weight: 15, re: /\b(urgent|immediately|within 24 hours|account (will be )?(suspended|locked|closed)|final notice|act now|urgente|inmediatamente|suspendida|bloquead[ao]|último aviso)\b/i },
  { id: 'credentials', label: 'Asks for passwords, codes or card details', weight: 25, re: /\b(password|passcode|verification code|one[- ]time code|otp|pin|cvv|card number|ssn|contraseña|código de verificación|nip|tarjeta)\b/i },
  { id: 'money', label: 'Money, prize or gift-card bait', weight: 15, re: /\b(gift ?cards?|wire transfer|bitcoin|crypto|you('ve| have) won|prize|refund pending|claim your|tarjeta de regalo|ganaste|premio|reembolso)\b/i },
  { id: 'verify', label: 'Asks you to "verify" or "confirm" an account', weight: 10, re: /\b(verify|confirm|validate|update) (your )?(account|identity|payment|information|details)|verifica|confirma tu\b/i },
  { id: 'exec', label: 'Executable or macro attachment', weight: 25, re: /\.(exe|scr|js|vbs|bat|cmd|ps1|msi|iso|docm|xlsm|hta)\b|\.pdf\.exe/i },
  { id: 'encoded', label: 'Obfuscated or encoded command', weight: 30, re: /(-enc(odedcommand)?\s|frombase64string|invoke-expression|\biex\b|certutil\s+-urlcache)/i },
  { id: 'defense', label: 'Security protection being disabled', weight: 30, re: /(real-?time protection (turned |was )?(off|disabled)|disable(d)? (antivirus|defender|firewall)|tamper protection off)/i },
  { id: 'persistence', label: 'Program set to start automatically', weight: 15, re: /(\\run\b|startup (entry|folder)|scheduled task created|autorun)/i },
  { id: 'mass-change', label: 'Mass file changes (ransomware pattern)', weight: 35, re: /(\d{3,}[, ]?\d*\s+files? (renamed|encrypted|modified)|\.locked\b|\.encrypted\b|ransom)/i },
  { id: 'forwarding', label: 'Mail forwarding to an outside address', weight: 25, re: /(forward(ing)? (all|every)?\s*(mail|email|messages)|forwarding rule)/i },
  { id: 'impossible-travel', label: 'Sign-in from an unusual location', weight: 25, re: /(new (device|location)|impossible travel|unrecognized (device|sign-?in)|from an unusual)/i },
  { id: 'brute-force', label: 'Repeated failed sign-ins', weight: 20, re: /\b\d{2,}\s+failed (login|sign-?in)/i },
  { id: 'oauth-scope', label: 'Third-party app with broad account access', weight: 20, re: /(read\/write|full access|read and change all|all websites|manage your account)/i },
];

/** Registrable domain, e.g. "login.bbva.com.mx" -> "bbva.com.mx". */
export function registrable(host) {
  const parts = host.split('.');
  const last2 = parts.slice(-2).join('.');
  return SECOND_LEVEL.has(last2) && parts.length > 2 ? parts.slice(-3).join('.') : last2;
}

const unconfuse = (s) => s.replace(/0/g, 'o').replace(/1/g, 'l').replace(/3/g, 'e').replace(/5/g, 's').replace(/rn/g, 'm').replace(/vv/g, 'w');

export function scanUrl(raw) {
  const signals = [];
  let url;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`);
  } catch {
    return { signals: [{ id: 'unparseable', label: 'Not a valid web address', weight: 10 }], host: null };
  }
  const host = url.hostname.toLowerCase();
  const reg = registrable(host);
  const regName = reg.split('.')[0];
  const tld = host.split('.').pop();
  const add = (id, label, weight) => signals.push({ id, label, weight });

  if (url.protocol === 'http:' && /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) add('no-https', 'Unencrypted connection (http)', 10);
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[')) add('ip-host', 'Uses a raw IP address instead of a name', 25);
  if (host.split('.').some((l) => l.startsWith('xn--'))) add('punycode', 'Internationalized (punycode) domain, a common look-alike trick', 30);
  if (url.username || raw.includes('@')) add('at-sign', 'Contains "@", which can hide the real destination', 20);
  if (RISKY_TLDS.has(tld)) add('risky-tld', `High-abuse domain ending (.${tld})`, 15);
  if (SHORTENERS.has(host)) add('shortener', 'Link shortener hides the final destination', 10);
  if (host.split('.').length > 4) add('deep-subdomain', 'Unusually deep subdomain chain', 10);
  if ((host.match(/-/g) || []).length >= 3) add('many-hyphens', 'Many hyphens in the domain name', 10);
  if (raw.length > 120) add('long-url', 'Very long address', 5);
  if (/(login|signin|verify|secure|account|update|wallet|banking)/i.test(host) && !BRANDS.includes(regName)) add('bait-words', 'Security words in the domain name', 10);

  for (const brand of BRANDS) {
    if (regName === brand) continue;
    if (host.includes(brand)) { add('brand-mismatch', `Mentions "${brand}" but is not ${brand}'s domain`, 30); break; }
    if (unconfuse(regName).includes(brand)) { add('lookalike', `Look-alike of "${brand}" (swapped characters)`, 35); break; }
  }
  return { signals, host };
}

export function scanText(text) {
  const signals = TEXT_RULES.filter((r) => r.re.test(text)).map(({ id, label, weight }) => ({ id, label, weight }));
  const urls = (text.match(/\b(?:https?:\/\/|www\.)[^\s<>"')]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\/[^\s<>"')]*/gi) || []).slice(0, 5);
  for (const u of urls) {
    for (const s of scanUrl(u).signals) if (!signals.some((x) => x.id === s.id)) signals.push({ ...s, label: `${s.label} (${u.slice(0, 40)})` });
  }
  return { signals, urls };
}

export function scoreOf(signals) {
  return Math.min(100, signals.reduce((sum, s) => sum + s.weight, 0));
}

export function severityOf(score) {
  return score >= 70 ? 'critical' : score >= 45 ? 'high' : score >= 25 ? 'medium' : score >= 10 ? 'low' : 'none';
}

/** Runs the right scanner for the input kind and returns signals + score. */
export function preScan(kind, content) {
  const { signals } = kind === 'url' ? scanUrl(content.trim()) : scanText(content);
  const score = scoreOf(signals);
  return { signals, score, severity: severityOf(score) };
}
