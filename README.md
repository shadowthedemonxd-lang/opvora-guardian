# OPVORA · Your AI Digital Guardian

An AI security analyst for your **browsing**, your **PC** and your **connected accounts**. It reads security events like an analyst would, explains the risk in plain language and tells you what to do next. There's also a small assistant you can talk to.

**Live:** https://opvora-guardian.pages.dev

## What's real and what's simulated

| Real (working today) | Simulated (demo only) |
|---|---|
| AI analysis of every event and every scan (Llama 3.3 70B on Cloudflare Workers AI) | The PC and account event stream (12 scripted sample events in `public/events.js`) |
| Rule engine for links, messages and event logs (`lib/heuristics.js`) | The Guardian score, which is computed from those sample events |
| Link and message scanner: paste anything and get a verdict | |
| AI assistant that can see the console's analyzed events | |

OPVORA is **not** connected to the visitor's device or accounts. Real protection would need a browser extension, a Windows agent that reads security logs, and read-only OAuth connections the user approves.

## How it works

1. **Collect**: an event (simulated) or a pasted link or message arrives.
2. **Rule engine**: fast checks for look-alike domains, punycode, raw IPs, link shorteners, encoded PowerShell, ransomware-style mass renames, forwarding rules and more.
3. **AI analyst**: the model gets the item plus the rule signals and returns strict JSON (verdict, severity, risk score, red flags, actions). The server validates and clamps that JSON before the browser sees it.
4. **Fallback**: if the AI fails or runs out of quota, the response is marked `source: "rules"` and the UI says so. AI results are never faked.

## Stack

- Static HTML, CSS and JS in `public/`. No framework and no build step.
- Cloudflare Pages Functions: `functions/api/analyze.js` and `functions/api/chat.js` (streaming).
- Workers AI through the `AI` binding in `wrangler.toml`. No API keys are stored anywhere.

**Cost:** $0. The Workers AI free daily allowance covers the demo, and on the free plan usage stops at the limit instead of billing.

## Security notes

- Input is validated and length-capped. Requests from other sites are rejected (Origin check), and each IP is rate-limited.
- Pasted content is wrapped as untrusted data in the prompt, and the model is told never to follow instructions inside it.
- Model output is only rendered as text nodes. The chat runs its own mini-markdown escaper first, so injected HTML can't run.
- Nothing is stored server-side.

## Run locally

```bash
npm install
npx wrangler login   # Workers AI runs remotely, even in local dev
npm run dev          # http://127.0.0.1:8788 with live reload
npm test             # rule engine + output sanitizer tests
npm run deploy
```
