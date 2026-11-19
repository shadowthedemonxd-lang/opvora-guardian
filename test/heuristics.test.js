import test from 'node:test';
import assert from 'node:assert/strict';
import { preScan, registrable } from '../lib/heuristics.js';
import { sanitize, ruleFallback } from '../lib/ai.js';

const ids = (kind, text) => preScan(kind, text).signals.map((s) => s.id);

test('registrable domain handles second-level TLDs', () => {
  assert.equal(registrable('login.bbva.com.mx'), 'bbva.com.mx');
  assert.equal(registrable('a.b.example.com'), 'example.com');
});

test('look-alike and brand-mismatch links score high', () => {
  assert.ok(preScan('url', 'http://paypa1-secure-verify.com/login').score >= 45);
  assert.ok(preScan('url', 'https://paypal.com.account-check.xyz/').score >= 45);
  assert.ok(ids('url', 'http://192.168.4.20/bank/login').includes('ip-host'));
  assert.ok(ids('url', 'https://xn--pypal-4ve.com').includes('punycode'));
});

test('official domains are not flagged as look-alikes', () => {
  const r = preScan('url', 'https://www.paypal.com/signin');
  assert.equal(r.signals.length, 0);
  assert.equal(r.severity, 'none');
  assert.equal(preScan('url', 'https://www.bbva.com.mx').signals.length, 0);
});

test('phishing SMS triggers text rules and embedded URL checks', () => {
  const found = ids('message', 'URGENT: your account will be suspended. Verify your account and send the verification code at http://bit.ly/x9');
  for (const id of ['urgency', 'credentials', 'verify', 'shortener']) assert.ok(found.includes(id), id);
});

test('coercive threats demanding personal info score at least high (EN + ES)', () => {
  const cases = [
    'I know where you live. Send me your home address, your full name and a photo of your ID by tonight or you will regret it.',
    'Give me your phone number and your mother\'s address right now or I will hurt your family.',
    'Mándame tu dirección y tu número de teléfono o te va a ir muy mal. Sé dónde estudias.',
    'I have your private photos. Pay 500 dollars in bitcoin or I send them to all your contacts.',
  ];
  for (const c of cases) assert.ok(preScan('message', c).score >= 60, c);
});

test('threat text pasted into the link box is scanned as a message', () => {
  assert.ok(preScan('url', 'Send me your home address or you will regret it').signals.some((s) => s.id === 'threat'));
});

test('profanity and ordinary messages are not flagged', () => {
  for (const c of [
    'This damn printer is broken again, f*** this sh*t lol',
    'you are a f***ing legend, see you tonight!',
    'Kill it at the presentation tomorrow!',
    'Hi mom, landing at 8, can you pick me up?',
    'Ugh I could kill for a taco right now',
  ]) assert.equal(preScan('message', c).score, 0, c);
});

test('sanitize reconciles contradictory model output', () => {
  // Real failure: model said verdict "safe" with severity high / score 90.
  const a = sanitize({ severity: 'high', risk_score: 90, summary: 'x', actions: ['a'] });
  assert.equal(a.verdict, 'malicious');
  // Severity "none" but high score -> raised.
  const b = sanitize({ severity: 'none', risk_score: 92, summary: 'x', actions: ['a'] });
  assert.equal(b.severity, 'high');
  // Model downplays, strong rules set a floor.
  const c = sanitize({ severity: 'none', risk_score: 0, summary: 'x', actions: ['a'] }, 70);
  assert.equal(c.severity, 'high');
  assert.ok(c.risk_score >= 65);
  // Benign stays benign.
  const d = sanitize({ severity: 'none', risk_score: 3, summary: 'x', actions: ['a'] }, 0);
  assert.equal(d.verdict, 'safe');
  assert.throws(() => sanitize({ summary: '' }));
});

test('rule fallback never calls an unchecked item safe', () => {
  const r = ruleFallback(preScan('message', 'hello there'), 'test');
  assert.equal(r.verdict, 'unverified');
});
