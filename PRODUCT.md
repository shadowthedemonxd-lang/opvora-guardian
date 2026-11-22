# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, weighted equally:
- Competition judges, who see the demo first and must see the AI working, fast and credible, within seconds.
- Everyday, non-technical people (the README examples point to Mexico: MXN fees, Spanish bank look-alikes) who are worried about a scam, a threat or a strange alert and want calm, plain help on what to do first.

## Product Purpose

OPVORA is an AI security analyst for a person's browsing, PC and connected accounts. It reads a security alert, a link or a message the way an analyst would, rates how serious it is, explains why in plain words, and lists what to do first. A small assistant answers follow-up questions with the console's context. Success: a visitor understands one real verdict and tries the scanner or the console.

## Positioning

Two independent layers judge every item: a deterministic rule engine (29 checks) and an AI analyst (Llama 3.3 70B on Cloudflare Workers AI). When they disagree the stricter one wins, and strong rule hits set a floor the AI cannot argue below. Results are never faked: if the AI fails, the UI says the verdict is rule-based.

## Operating Context

Release: public beta v0.1.0. The showcase at `/` stays; "Get started" leads to the app at `/app/`.

- App (`/app/`, Operate mode): Check (link or message), History kept only in the browser (on by default, can be turned off or cleared), Assistant that sees the user's own recent checks, First aid guides for things that already happened, Settings (language, theme, data, about). Coverage list marks Browsing, PC security and Accounts as planned.
- Privacy and Terms pages: plain-language beta drafts in EN and ES. A contact address still needs to be added before a wide launch.
- Next stage (not built): accounts, and read-only connections to the browser, PC and online accounts.
- Guardian console: 12 scripted sample alerts (staged account takeover) stream into the real AI analyst; a Guardian score and three area tiles (Browsing, PC security, Accounts) update.
- Scanner: paste a link or a message, get a verdict with rule hits plus the AI explanation.
- Assistant chat panel that can see the console's analyzed events and the latest scan.
- Light and dark themes with an Auto option.

## Capabilities and Constraints

- Static HTML/CSS/JS in `public/`, no build step; Cloudflare Pages Functions `functions/api/analyze.js` and `chat.js` (streaming).
- OPVORA is NOT connected to the visitor's device or accounts. The console feed is simulated; the analysis is real. Every surface must keep this honest labeling.
- Nothing pasted is stored on OPVORA's servers. The app's History is kept only in the user's browser and every surface that mentions it says so. Never invite users to paste passwords.
- Copy must be available in English and Spanish with a language switch (EN / ES).

## Brand Commitments

- Name: OPVORA. Logo: the shield with the broken ring and center dot (`public/logo.svg`); its shape is fixed, its colors may change to fit the brand.
- Voice: plain words, calm, specific, no fear-mongering, no hype.

## Evidence on Hand

- A real verdict for the coercive-threat sample (Critical, 95/100) used as the hero sample.
- Eval script result: 14/14 real-model cases (`scripts/eval.mjs`).
- Showcase video in `video/`.
- No customers, testimonials, user counts or press exist; do not invent them.

## Product Principles

1. Show the analysis working, don't describe it.
2. Honest about what is live and what is simulated, every time.
3. Plain language first; technical detail is available but secondary.
4. Calm under alarm: severity is clear without panic.

## Accessibility & Inclusion

Non-technical and possibly stressed users; WCAG AA contrast, keyboard access, reduced-motion support, bilingual copy.
