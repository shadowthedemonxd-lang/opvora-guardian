import test from 'node:test';
import assert from 'node:assert/strict';
import { preScan, registrable } from '../lib/heuristics.js';
import { sanitize } from '../lib/ai.js';

test('registrable domain handles second-level TLDs', () => {
  assert.equal(registrable('login.bbva.com.mx'), 'bbva.com.mx');
  assert.equal(registrable('a.b.example.com'), 'example.com');
});

test('look-alike and brand-mismatch links score high', () => {
  assert.ok(preScan('url', 'http://paypa1-secure-verify.com/login').score >= 45);
  assert.ok(preScan('url', 'https://paypal.com.account-check.xyz/').score >= 45);
  assert.ok(preScan('url', 'http://192.168.4.20/bank/login').signals.some((s) => s.id === 'ip-host'));
  assert.ok(preScan('url', 'https://xn--pypal-4ve.com').signals.some((s) => s.id === 'punycode'));
});

test('official domains are not flagged as look-alikes', () => {
  const r = preScan('url', 'https://www.paypal.com/signin');
  assert.equal(r.signals.length, 0);
  assert.equal(r.severity, 'none');
  assert.equal(preScan('url', 'https://www.bbva.com.mx').signals.length, 0);
});

test('phishing SMS triggers text rules and embedded URL checks', () => {
  const r = preScan('message', 'URGENT: your account will be suspended. Verify your account and send the verification code at http://bit.ly/x9');
  const ids = r.signals.map((s) => s.id);
  for (const id of ['urgency', 'credentials', 'verify', 'shortener']) assert.ok(ids.includes(id), id);
  assert.ok(r.score >= 45);
});

test('sanitize clamps model output and rejects junk', () => {
  const o = sanitize('noise {"verdict":"evil","severity":"high","risk_score":150,"summary":"x","actions":["a"],"indicators":"nope"} tail');
  assert.equal(o.verdict, 'suspicious');
  assert.equal(o.risk_score, 100);
  assert.deepEqual(o.indicators, []);
  assert.throws(() => sanitize({ summary: '' }));
});
