// Kinetic: premium text animations and shot transitions, all pure functions of t. Load after lib/motion.js.
// House rule: nothing pops on or off screen. Give every element an `in` and an `out`, every shot change a transition.
//
//   Kinetic.animate(el, { in: "mask-up", at: 1.2, out: "blur-in", outAt: 4 })  // in setup(); text is split for you
//   Kinetic.sequence(t, [layerA, layerB], [{ at: 5, type: "iris", to: 1 }])    // full-frame shot changes
//   Kinetic.render(t)                                                          // in render(t): draws every animate()
//
// Text effects (Kinetic.TEXT): fade rise sink mask-up mask-down blur-in pop bounce stomp zoom-in zoom-out
//   drift-left drift-right skate tumble roll flip-up merge spread typewriter scramble flicker wipe-right wipe-up
//   highlight underline. Each has a default unit (chars / words / whole), duration and stagger; override any of them.
// Shot transitions (Kinetic.SHOT): crossfade dissolve push whip zoom-through slide-over sheet wipe diagonal iris
//   doors flip expand glide.
(function () {
  const { clamp, lerp, spring, EASE, rng, bezier } = Motion;
  const E = EASE.premium, IN = EASE.enter;
  const PROPS = ["transform", "opacity", "filter", "clipPath", "letterSpacing", "backgroundSize", "transformOrigin"];
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/[]{}";
  const blur = (q, em = 0.15) => `blur(${(q * em).toFixed(4)}em)`;

  // fx(p, s, k): p = linear progress 0..1 (1 = settled), s = spring value (in) or eased p (out),
  // k = { r, r2 (seeded 0..1 per unit), u (seconds into the unit), t }. Returns inline styles.
  const FX = {
    fade: (p) => ({ opacity: IN(p) }),
    rise: (p) => ({ opacity: IN(p), transform: `translateY(${(1 - E(p)) * 70}%)` }),
    sink: (p) => ({ opacity: IN(p), transform: `translateY(${(E(p) - 1) * 70}%)` }),
    // Classic editorial reveal: each unit slides out from behind its own baseline mask.
    "mask-up": (p) => { const y = (1 - IN(p)) * 115; return { transform: `translateY(${y}%)`, clipPath: `inset(-30% -15% calc(${y}% - 8%) -15%)` }; },
    "mask-down": (p) => { const y = (1 - IN(p)) * 115; return { transform: `translateY(${-y}%)`, clipPath: `inset(calc(${y}% - 8%) -15% -30% -15%)` }; },
    "blur-in": (p) => ({ opacity: IN(p), filter: blur(1 - E(p), 0.3), transform: `scale(${lerp(1.12, 1, E(p))})` }),
    pop: (p, s) => ({ opacity: IN(clamp(p * 4)), transform: `scale(${lerp(0.2, 1, s)})` }),
    bounce: (p, s) => ({ opacity: IN(clamp(p * 4)), transform: `translateY(${(1 - s) * -130}%)` }),
    stomp: (p, s) => ({ opacity: IN(clamp(p * 5)), transform: `scale(${lerp(2.4, 1, s)})`, filter: blur(1 - clamp(s), 0.12) }),
    "zoom-in": (p) => ({ opacity: IN(p), transform: `scale(${lerp(0.6, 1, E(p))})`, filter: blur(1 - E(p)) }),
    "zoom-out": (p) => ({ opacity: IN(p), transform: `scale(${lerp(1.7, 1, E(p))})`, filter: blur(1 - E(p)) }),
    "drift-left": (p) => ({ opacity: IN(p), transform: `translateX(${(1 - E(p)) * 30}%)` }),
    "drift-right": (p) => ({ opacity: IN(p), transform: `translateX(${(E(p) - 1) * 30}%)` }),
    skate: (p) => ({ opacity: IN(p), transform: `translateX(${(1 - E(p)) * 90}%) skewX(${(1 - E(p)) * -28}deg)` }),
    tumble: (p) => ({ opacity: IN(clamp(p * 2)), transformOrigin: "50% 100%", transform: `perspective(600px) rotateX(${(1 - E(p)) * -100}deg)` }),
    roll: (p) => ({ opacity: IN(clamp(p * 2)), transform: `perspective(600px) rotateY(${(1 - E(p)) * 95}deg)` }),
    "flip-up": (p) => ({ opacity: IN(clamp(p * 2)), transformOrigin: "50% 0%", transform: `perspective(900px) translateY(${(1 - E(p)) * 40}%) rotateX(${(1 - E(p)) * 80}deg)` }),
    merge: (p, s, k) => { const q = 1 - E(p), a = k.r * 2 - 1, b = k.r2 * 2 - 1;
      return { opacity: IN(p), transform: `translate(${a * 320 * q}%, ${b * 220 * q}%) rotate(${a * 120 * q}deg)`, filter: blur(q, 0.1) }; },
    spread: (p) => ({ opacity: IN(p), letterSpacing: `${(1 - E(p)) * 0.6}em`, filter: blur(1 - E(p), 0.1) }),
    typewriter: (p) => ({ opacity: p > 0 ? 1 : 0 }),
    scramble: (p) => ({ opacity: p > 0 ? 1 : 0, scramble: p < 1 }),
    flicker: (p) => ({ opacity: p <= 0 ? 0 : [0.15, 0.9, 0.2, 1, 0.45, 1][Math.min(5, Math.floor(p * 6))] }),
    "wipe-right": (p) => ({ clipPath: `inset(-25% ${(1 - IN(p)) * 105}% -25% -5%)` }),
    "wipe-up": (p) => ({ clipPath: `inset(${(1 - IN(p)) * 105}% -5% -25% -5%)` }),
    // Marker sweeps behind the words (colour: --k-mark on the element or a parent).
    highlight: (p) => ({ backgroundSize: `${IN(p) * 100}% 0.42em` }),
    underline: (p) => ({ backgroundSize: `${IN(p) * 100}% 0.07em` }),
  };
  // [unit, duration s, stagger s] defaults per effect.
  const DEF = { fade: ["whole", 0.6, 0], rise: ["words", 0.75, 0.06], sink: ["words", 0.75, 0.06], "mask-up": ["words", 0.8, 0.07],
    "mask-down": ["words", 0.8, 0.07], "blur-in": ["words", 0.9, 0.07], pop: ["chars", 0.7, 0.03], bounce: ["chars", 0.9, 0.035],
    stomp: ["words", 0.6, 0.14], "zoom-in": ["whole", 0.8, 0], "zoom-out": ["whole", 0.8, 0], "drift-left": ["whole", 1, 0],
    "drift-right": ["whole", 1, 0], skate: ["words", 0.7, 0.06], tumble: ["chars", 0.75, 0.03], roll: ["chars", 0.7, 0.03],
    "flip-up": ["words", 0.8, 0.08], merge: ["chars", 1.0, 0.012], spread: ["whole", 1.1, 0], typewriter: ["chars", 0.001, 0.045],
    scramble: ["chars", 0.55, 0.025], flicker: ["whole", 0.8, 0], "wipe-right": ["whole", 0.8, 0], "wipe-up": ["whole", 0.7, 0],
    highlight: ["whole", 0.6, 0], underline: ["whole", 0.6, 0] };
  // Effects that land with mass use a closed-form spring instead of a curve.
  const SPR = { pop: { zeta: 0.5, omega: 15 }, bounce: { zeta: 0.45, omega: 14 }, stomp: { zeta: 0.7, omega: 20 } };

  // Wrap each word in .kw and each character in .kc, keeping inline wrappers such as colour spans.
  function split(el) {
    for (const n of [...el.childNodes]) {
      if (n.nodeType === 1 && !n.classList.contains("kw")) { split(n); continue; }
      if (n.nodeType !== 3) continue;
      const frag = document.createDocumentFragment();
      for (const part of n.textContent.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { frag.append(part); continue; }
        const w = document.createElement("span");
        w.className = "kw"; w.style.cssText = "display:inline-block;white-space:pre";
        for (const ch of part) {
          const c = document.createElement("span");
          c.className = "kc"; c.style.display = "inline-block"; c.textContent = ch; c.dataset.ch = ch;
          w.append(c);
        }
        frag.append(w);
      }
      n.replaceWith(frag);
    }
  }

  const all = [];
  function animate(el, o = {}) {
    const fin = o.in || "rise", fout = o.out || null;
    if (!FX[fin] || (fout && !FX[fout])) throw new Error(`Kinetic: unknown effect ${FX[fin] ? fout : fin}`);
    const [by0, dur0, st0] = DEF[fin], by = o.by || by0;
    if (by !== "whole" && !el.querySelector(".kw")) split(el);
    if ([fin, fout].some((f) => f === "highlight" || f === "underline"))
      Object.assign(el.style, { backgroundImage: "linear-gradient(var(--k-mark,#FFE066),var(--k-mark,#FFE066))", backgroundRepeat: "no-repeat",
        backgroundPosition: fin === "underline" || fout === "underline" ? "0 96%" : "0 82%", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" });
    const units = by === "whole" ? [el] : [...el.querySelectorAll(by === "chars" ? ".kc" : ".kw")];
    const n = units.length, r = rng(o.seed ?? 1), rs = units.map(() => [r(), r()]);
    let order = units.map((_, i) => i);
    if (o.from === "end") order = order.map((i) => n - 1 - i);
    else if (o.from === "center") order = order.map((i) => Math.abs(i - (n - 1) / 2));
    else if (o.from === "random") { const ranks = rs.map((x, i) => [x[0], i]).sort((a, b) => a[0] - b[0]); ranks.forEach(([, i], k) => (order[i] = k)); }
    const dur = o.dur ?? dur0, st = o.stagger ?? st0;
    const outDur = o.outDur ?? Math.max(0.3, (fout ? DEF[fout][1] : dur) * 0.55), outSt = o.outStagger ?? (fout ? DEF[fout][2] : st) * 0.5;
    const outAt = o.outAt ?? Infinity;
    const f = (t) => units.forEach((u, i) => {
      for (const p of PROPS) u.style[p] = "";
      if (u.dataset.ch) u.textContent = u.dataset.ch;
      const uIn = t - (o.at + order[i] * st);
      let fx = FX[fin], p, s;
      if (fout && t >= outAt) {
        fx = FX[fout]; p = 1 - clamp((t - outAt - order[i] * outSt) / outDur); s = E(p); // time-reversed ease-out = ease-in exit
      } else {
        p = clamp(uIn / dur); s = SPR[fin] ? (uIn <= 0 ? 0 : spring(uIn, SPR[fin])) : E(p);
      }
      const css = fx(p, s, { r: rs[i][0], r2: rs[i][1], u: uIn, t });
      if (css.scramble && u.dataset.ch) u.textContent = GLYPHS[Math.floor(rs[i][0] * GLYPHS.length + Math.floor(t * 24) * 7) % GLYPHS.length];
      for (const k in css) if (k !== "scramble") u.style[k] = css[k];
    });
    all.push(f);
    return f;
  }

  // ---------- shot transitions: [styles for the outgoing layer a, styles for the incoming layer b] ----------
  const WHIP = bezier(0.85, 0, 0.15, 1);
  const SHOT = {
    crossfade: (e) => [{ opacity: 1 - e }, { opacity: e }],
    dissolve: (e) => [{ opacity: 1 - e, filter: `blur(${e * 24}px)` }, { opacity: e, filter: `blur(${(1 - e) * 24}px)`, transform: `scale(${lerp(1.06, 1, e)})` }],
    push: (e, d) => [{ transform: `translate(${-d[0] * e * 100}%,${-d[1] * e * 100}%)` }, { transform: `translate(${d[0] * (1 - e) * 100}%,${d[1] * (1 - e) * 100}%)` }],
    whip: (e, d, p) => { const b = `blur(${Math.sin(Math.PI * p) ** 2 * 36}px)`, w = WHIP(p);
      return [{ transform: `translate(${-d[0] * w * 100}%,${-d[1] * w * 100}%)`, filter: b }, { transform: `translate(${d[0] * (1 - w) * 100}%,${d[1] * (1 - w) * 100}%)`, filter: b }]; },
    "zoom-through": (e) => [{ transform: `scale(${1 + e * 2.2})`, opacity: 1 - IN(clamp(e * 1.7)), filter: `blur(${e * 18}px)`, zIndex: 3 },
      { transform: `scale(${lerp(0.7, 1, e)})`, opacity: IN(clamp(e * 1.6 - 0.2)), filter: `blur(${(1 - e) * 14}px)` }],
    "slide-over": (e, d) => [{ transform: `translate(${-d[0] * e * 25}%,${-d[1] * e * 25}%) scale(${1 - 0.06 * e})`, filter: `brightness(${1 - 0.55 * e})` },
      { transform: `translate(${d[0] * (1 - e) * 100}%,${d[1] * (1 - e) * 100}%)`, boxShadow: "0 0 120px rgba(0,0,0,.45)" }],
    sheet: (e) => [{ transform: `scale(${1 - 0.08 * e})`, filter: `brightness(${1 - 0.5 * e})`, borderRadius: `${e * 32}px` },
      { transform: `translateY(${(1 - e) * 100}%)`, borderRadius: `${(1 - e) * 32}px`, boxShadow: "0 -30px 120px rgba(0,0,0,.35)" }],
    // The reveal edge travels in the transition's direction (dir "left" = edge sweeps right-to-left).
    wipe: (e, d) => { const q = (1 - e) * 100;
      return [{}, { clipPath: d[0] > 0 ? `inset(0 0 0 ${q}%)` : d[0] < 0 ? `inset(0 ${q}% 0 0)` : d[1] > 0 ? `inset(${q}% 0 0 0)` : `inset(0 0 ${q}% 0)` }]; },
    diagonal: (e) => [{ filter: `brightness(${1 - 0.3 * e})` }, { clipPath: `polygon(0 0,${e * 230}% 0,${e * 230 - 130}% 100%,0 100%)` }],
    iris: (e, d, p, o) => [{ transform: `scale(${1 + 0.08 * e})` }, { clipPath: `circle(${e * 150}% at ${o[0] * 100}% ${o[1] * 100}%)` }],
    doors: (e) => [{ transform: `scale(${1 - 0.05 * e})`, filter: `brightness(${1 - 0.4 * e})` }, { clipPath: `inset(0 ${(1 - e) * 50}% 0 ${(1 - e) * 50}%)` }],
    flip: (e) => e < 0.5 ? [{ transform: `perspective(2400px) rotateY(${e * 180}deg) scale(${1 - 0.15 * Math.sin(Math.PI * e)})` }, { opacity: 0 }]
      : [{ opacity: 0 }, { transform: `perspective(2400px) rotateY(${(e - 1) * 180}deg) scale(${1 - 0.15 * Math.sin(Math.PI * e)})` }],
    // Grow the incoming shot out of a rectangle (x, y, w, h as 0..1), e.g. the window it lives in.
    expand: (e, d, p, o, rc) => [{ filter: `brightness(${1 - 0.4 * e})` }, { clipPath: `inset(${lerp(rc[1], 0, e) * 100}% ${lerp(1 - rc[0] - rc[2], 0, e) * 100}% ${lerp(1 - rc[1] - rc[3], 0, e) * 100}% ${lerp(rc[0], 0, e) * 100}% round ${lerp(28, 0, e)}px)` }],
    glide: (e) => [{ transform: `translateY(${-e * 18}%)`, opacity: 1 - IN(clamp(e * 1.5)), filter: `blur(${e * 10}px)` },
      { transform: `translateY(${(1 - e) * 22}%)`, opacity: IN(clamp(e * 1.4 - 0.3)), filter: `blur(${(1 - e) * 10}px)` }],
  };
  const DIRS = { left: [1, 0], right: [-1, 0], up: [0, 1], down: [0, -1] };
  const LAYER_PROPS = ["transform", "opacity", "filter", "clipPath", "borderRadius", "boxShadow", "zIndex", "visibility", "transformOrigin"];

  // Full-frame layers, one visible at a time; cuts = [{ at, type, to, dur?, dir?, origin?, rect?, from? }] sorted by at.
  function sequence(t, layers, cuts) {
    let cur = 0, active = null;
    for (const c of cuts) {
      if (t >= c.at + (c.dur ?? 0.9)) cur = c.to;
      else { if (t >= c.at) active = c; break; }
    }
    for (const l of layers) { for (const p of LAYER_PROPS) l.style[p] = ""; l.style.visibility = "hidden"; }
    if (!active) { layers[cur].style.visibility = "visible"; return; }
    const a = layers[active.from ?? cur], b = layers[active.to], fn = SHOT[active.type];
    if (!fn) throw new Error(`Kinetic: unknown transition ${active.type}`);
    const p = clamp((t - active.at) / (active.dur ?? 0.9));
    const [sa, sb] = fn(EASE.move(p), DIRS[active.dir || "left"], p, active.origin || [0.5, 0.5], active.rect || [0.3, 0.3, 0.4, 0.4]);
    Object.assign(a.style, { visibility: "visible", zIndex: 1 }, sa);
    Object.assign(b.style, { visibility: "visible", zIndex: 2 }, sb);
  }

  window.Kinetic = { animate, split, sequence, render: (t) => all.forEach((f) => f(t)), TEXT: Object.keys(FX), SHOT: Object.keys(SHOT) };
})();
