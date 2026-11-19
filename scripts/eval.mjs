// Real-model regression check: node scripts/eval.mjs [baseUrl]
// Each case states the severity range a careful human analyst would accept.
const BASE = process.argv[2] || 'http://127.0.0.1:8788';
const SEV = ['none', 'low', 'medium', 'high', 'critical'];

const CASES = [
  // Coercion / threats demanding personal info: must be high or critical.
  ['threat-en-id', 'message', 'I know where you live. Send me your home address, your full name and a photo of your ID by tonight or you will regret it.', 'high', 'critical'],
  ['threat-en-family', 'message', "Give me your phone number and your mother's address right now or I will hurt your family.", 'high', 'critical'],
  ['threat-es', 'message', 'Mándame tu dirección y tu número de teléfono o te va a ir muy mal. Sé dónde estudias.', 'high', 'critical'],
  ['sextortion', 'message', 'I have your private photos. Pay 500 dollars in bitcoin or I send them to all your contacts.', 'high', 'critical'],
  ['subtle-coercion', 'message', "Hey, it's in your best interest to send me where you live and what school you go to. I wouldn't ignore this if I were you.", 'medium', 'critical'],
  ['threat-in-link-box', 'url', 'Send me your home address and phone number or you will regret it', 'high', 'critical'],
  // Classic scams: medium or above.
  ['package-sms', 'message', 'Your package could not be delivered. Pay the 25 MXN customs fee within 24 hours or it will be returned: http://bit.ly/dhl-mx-pago', 'medium', 'critical'],
  ['otp-request', 'message', 'Hello, this is the Security Team. We detected unusual activity and your account will be suspended today. Reply with the 6-digit verification code we just sent.', 'medium', 'critical'],
  ['lookalike-link', 'url', 'http://bancon0va-secure-login.top/acceso?id=88213', 'medium', 'critical'],
  // Harmless: none or low. Profanity alone is not a threat.
  ['profanity-vent', 'message', 'This damn printer is broken AGAIN. f*** this sh*t, I swear lol', 'none', 'low'],
  ['profanity-friendly', 'message', "you're a f***ing legend bro, see you tonight at the game", 'none', 'low'],
  ['benign-address', 'message', "Hi sweetie, it's Aunt Rosa! Can you text me your new address? I want to mail you the wedding invitation 💌", 'none', 'low'],
  ['benign-plans', 'message', 'Are we still on for dinner Friday at 8? I booked the table under my name.', 'none', 'low'],
  ['safe-link', 'url', 'https://www.wikipedia.org/', 'none', 'low'],
];

let failed = 0;
for (const [name, kind, content, lo, hi] of CASES) {
  const res = await fetch(`${BASE}/api/analyze`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, content }) });
  const r = await res.json();
  const ok = r.source === 'ai' && SEV.indexOf(r.severity) >= SEV.indexOf(lo) && SEV.indexOf(r.severity) <= SEV.indexOf(hi);
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(20)} ${r.source}  ${String(r.severity).padEnd(8)} ${String(r.risk_score).padStart(3)}  rules:${String(r.rule_score).padStart(3)}  ${r.verdict}  "${r.title}"   (want ${lo}..${hi})`);
}
console.log(`\n${CASES.length - failed}/${CASES.length} passed`);
process.exit(failed ? 1 : 0);
