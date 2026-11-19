// World3D: a CSS-3D stage with a camera, a floor, depth dust and floating 2D windows. Load after lib/motion.js.
// Windows are real DOM in real perspective, so text stays crisp (and can use Kinetic). Pure function of t.
//
//   const w = World3D.create(rootEl, { width, height, theme: "night", accent: "#8B7CFF" });
//   const ed = w.add({ kind: "app", title: "scene.html", w: 760, h: 480, html: "...",
//                      track: [[0, { pos: [-420, 0, 0], rot: [0, 18, 0] }], [4, { pos: [-300, 0, 80] }]],
//                      enter: { type: "flip", at: 0.3 }, exit: { type: "fly", at: 6 } });
//   w.camera([[0, { pos: [0, -80, 1700], look: [0, 0, 0] }], [4, { pos: [500, -150, 1400], look: [150, 0, 0] }, 1.6]]);
//   w.render(t);
//
// Units are CSS px, y points DOWN. A window at distance ~= w.focal from the camera shows at 1:1 size.
// Kinds: browser, app, video, terminal, phone, card. Enter/exit types: rise drop fly flip unfold scale fade.
(function () {
  const { clamp, lerp, EASE, spring, rng } = Motion;
  const THEMES = {
    night: { sky: "radial-gradient(120% 90% at 50% 115%, #2B2160 0%, #0F1126 52%, #07080F 100%)", grid: "rgba(160,150,255,.20)", dust: "rgba(200,205,255,.55)", glow: "rgba(124,92,255,.40)", tone: "dark" },
    studio: { sky: "linear-gradient(180deg, #EEECF5 0%, #DCD8EA 100%)", grid: "rgba(70,60,130,.10)", dust: "rgba(90,80,150,.22)", glow: "rgba(255,255,255,.7)", tone: "light" },
    dawn: { sky: "linear-gradient(180deg, #17122B 0%, #4E2A4C 55%, #E9977A 100%)", grid: "rgba(255,205,175,.16)", dust: "rgba(255,225,205,.5)", glow: "rgba(255,170,120,.40)", tone: "dark" },
    paper: { sky: "linear-gradient(180deg, #F6F1E7 0%, #EAE3D4 100%)", grid: "rgba(60,40,20,.08)", dust: "rgba(60,40,20,.15)", glow: "rgba(255,255,255,.6)", tone: "light" },
  };
  const TONES = {
    dark: { bg: "#121320", bar: "#1A1C2B", text: "#ECECF4", muted: "#8D90A8", line: "rgba(255,255,255,.08)", field: "#0D0E18", shadow: "0 50px 140px rgba(0,0,0,.55), 0 10px 30px rgba(0,0,0,.35)" },
    light: { bg: "#FFFFFF", bar: "#F3F2F7", text: "#16161E", muted: "#6E6E80", line: "rgba(0,0,0,.08)", field: "#ECEBF2", shadow: "0 50px 120px rgba(40,30,90,.22), 0 10px 30px rgba(40,30,90,.12)" },
  };
  const FONT = `'Inter','Segoe UI',system-ui,sans-serif`, MONO = `'JetBrains Mono','Cascadia Code',Consolas,monospace`; // single quotes: these go inside style="..."
  const lights = `<span style="display:flex;gap:8px">${["#FF5F57", "#FEBC2E", "#28C840"].map((c) => `<i style="width:13px;height:13px;border-radius:50%;background:${c}"></i>`).join("")}</span>`;

  function chrome(o, T, accent) {
    const bar = (inner, h = 52) => `<div style="height:${h}px;display:flex;align-items:center;gap:14px;padding:0 18px;background:${T.bar};border-bottom:1px solid ${T.line};flex:none">${inner}</div>`;
    const body = `<div data-body style="position:relative;flex:1;overflow:hidden">${o.html || ""}</div>`;
    switch (o.kind) {
      case "browser":
        return bar(`${lights}<span style="margin-left:10px;padding:8px 16px;border-radius:10px 10px 0 0;background:${T.bg};font:500 17px ${FONT};color:${T.text};max-width:46%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${o.title || "New tab"}</span>`) +
          bar(`<span style="flex:1;height:34px;border-radius:17px;background:${T.field};display:flex;align-items:center;gap:10px;padding:0 16px;font:16px ${MONO};color:${T.muted};white-space:nowrap;overflow:hidden">🔒&nbsp;${o.url || ""}</span>`, 50) + body;
      case "video":
        return body + `<div style="position:absolute;left:0;right:0;bottom:0;height:64px;display:flex;align-items:center;gap:16px;padding:0 22px;background:linear-gradient(transparent,rgba(0,0,0,.55));color:#fff;font:600 16px ${MONO}">
          <span style="width:0;height:0;border-left:16px solid #fff;border-top:10px solid transparent;border-bottom:10px solid transparent"></span>
          <span style="flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.25);overflow:hidden"><i data-progress style="display:block;height:100%;width:0;background:${accent}"></i></span>
          <span data-time>0:00</span></div>`;
      case "terminal":
        return bar(`${lights}<span style="flex:1;text-align:center;font:500 16px ${MONO};color:${T.muted};margin-right:60px">${o.title || "zsh"}</span>`, 46) +
          `<div data-body style="flex:1;padding:22px 26px;font:${o.font || 20}px/1.6 ${MONO};color:${T.text};white-space:pre;overflow:hidden"><div data-lines></div>${o.html || ""}</div>`;
      case "phone":
        return `<div data-body style="position:absolute;inset:14px;border-radius:44px;overflow:hidden;background:${T.bg}">${o.html || ""}</div>
          <i style="position:absolute;left:50%;top:26px;width:110px;height:32px;margin-left:-55px;border-radius:16px;background:#000"></i>`;
      case "card":
        return body;
      default: // app window
        return bar(`${lights}<span style="flex:1;text-align:center;font:600 17px ${FONT};color:${T.text};margin-right:60px">${o.title || ""}</span>`) + body;
    }
  }

  // Enter/exit offsets: q = 0 settled .. 1 fully away; s = spring 0..1 for the ones with mass.
  const MOVES = {
    rise: (q) => ({ dy: 320 * q, o: 1 - q }),
    drop: (q, s) => ({ dy: -420 * (1 - s), o: 1 - clamp(q * 3) }),
    fly: (q) => ({ dz: -2600 * q, o: 1 - q }),
    flip: (q) => ({ dry: 80 * q, o: 1 - clamp(q * 1.4) }),
    unfold: (q) => ({ drx: -85 * q, dy: 120 * q, o: 1 - clamp(q * 1.4) }),
    scale: (q, s) => ({ ds: lerp(0.55, 1, s), o: 1 - clamp(q * 2) }),
    fade: (q) => ({ o: 1 - q }),
  };
  const SPRUNG = { drop: { zeta: 0.55, omega: 11 }, scale: { zeta: 0.6, omega: 13 } };

  // Eased tracks: keys [[t, state, dur?]]; each key moves from the previous state over dur with ease-in-out-quart.
  // Linear superposition of segments, so it is a pure function of t (same idea as Motion.springTrack).
  function track(t, keys, field, def) {
    let v = (keys[0][1][field] ?? def).slice ? [...(keys[0][1][field] ?? def)] : keys[0][1][field] ?? def;
    let prev = v;
    for (let i = 1; i < keys.length; i++) {
      const [ti, st, dur = 1.2] = keys[i];
      if (st[field] == null) continue;
      const e = EASE.move(clamp((t - ti) / dur));
      if (Array.isArray(v)) v = v.map((x, j) => x + (st[field][j] - prev[j]) * e); else v += (st[field] - prev) * e;
      prev = st[field];
    }
    return v;
  }

  function create(root, { width = 1920, height = 1080, fov = 40, theme = "night", accent = "#8B7CFF", floorY = 460, dust = 70, seed = 3, dof = 3, handheld = 1 } = {}) {
    const TH = THEMES[theme] || THEMES.night, focal = height / 2 / Math.tan((fov * Math.PI) / 360);
    Object.assign(root.style, { position: "absolute", left: 0, top: 0, width: width + "px", height: height + "px", overflow: "hidden",
      background: TH.sky, perspective: focal + "px", perspectiveOrigin: "50% 50%" });
    const scene = document.createElement("div");
    scene.style.cssText = "position:absolute;left:50%;top:50%;width:0;height:0;transform-style:preserve-3d";
    root.append(scene);
    const place = (el, css, tf) => { el.style.cssText = `position:absolute;left:0;top:0;${css}`; el.style.transform = tf; scene.append(el); return el; };
    // Horizon glow far behind, then the grid floor fading into the distance.
    place(document.createElement("div"), `width:6000px;height:2600px;background:radial-gradient(50% 50% at 50% 60%, ${TH.glow}, transparent 70%)`,
      `translate3d(-3000px,-1500px,-5200px)`);
    place(document.createElement("div"), `width:4400px;height:4400px;background-image:linear-gradient(${TH.grid} 2px,transparent 2px),linear-gradient(90deg,${TH.grid} 2px,transparent 2px);background-size:140px 140px;-webkit-mask-image:radial-gradient(closest-side,#000 25%,transparent 100%);mask-image:radial-gradient(closest-side,#000 25%,transparent 100%)`,
      `translate3d(-2200px,${floorY - 2200}px,-1600px) rotateX(90deg)`);
    const r = rng(seed);
    for (let i = 0; i < dust; i++) {
      const s = 2 + r() * 5;
      place(document.createElement("div"), `width:${s}px;height:${s}px;border-radius:50%;background:${TH.dust};opacity:${0.3 + r() * 0.7}`,
        `translate3d(${(r() - 0.5) * 4400}px,${-900 + r() * (floorY + 900)}px,${-3600 + r() * 4600}px)`);
    }

    const wins = [];
    let cam = [[0, { pos: [0, -60, focal + 200], look: [0, 0, 0] }]];

    function add(o) {
      const T = TONES[o.tone || TH.tone], el = document.createElement("div");
      const w = o.w || 720, h = o.h || 450, radius = o.kind === "phone" ? 58 : o.radius ?? 18;
      el.innerHTML = chrome(o, T, accent);
      place(el, `width:${w}px;height:${h}px;display:flex;flex-direction:column;border-radius:${radius}px;overflow:hidden;background:${o.kind === "phone" ? "#0B0B0F" : T.bg};
        border:1px solid ${T.line};box-shadow:${T.shadow};color:${T.text};font-family:${FONT};backface-visibility:hidden`, "");
      const q = (sel) => el.querySelector(sel);
      const win = { el, body: q("[data-body]"), o, w, h, progress: q("[data-progress]"), time: q("[data-time]"), lines: q("[data-lines]"),
        phase: r() * Math.PI * 2, keys: o.track || [[0, { pos: o.pos || [0, 0, 0], rot: o.rot || [0, 0, 0], scale: o.scale ?? 1 }]] };
      wins.push(win);
      return win;
    }

    // View-space depth of a world point, for depth of field.
    const depth = (P, C, yaw, pitch) => {
      const x = P[0] - C[0], y = P[1] - C[1], z = P[2] - C[2];
      const z1 = x * Math.sin(yaw) + z * Math.cos(yaw);
      return -(-y * Math.sin(pitch) + z1 * Math.cos(pitch));
    };

    function render(t) {
      // Camera: eased key moves plus a tiny deterministic handheld drift (under 5% of any hero move).
      const C = track(t, cam, "pos"), L = track(t, cam, "look");
      C[0] += Math.sin(t * 0.7) * 4 * handheld; C[1] += Math.sin(t * 0.53 + 1) * 3 * handheld;
      const dx = L[0] - C[0], dy = L[1] - C[1], dz = L[2] - C[2];
      const yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(dy, Math.hypot(dx, dz)), focus = Math.hypot(dx, dy, dz);
      scene.style.transform = `translateZ(${focal}px) rotateX(${-pitch}rad) rotateY(${-yaw}rad) translate3d(${-C[0]}px,${-C[1]}px,${-C[2]}px)`;

      for (const W of wins) {
        const { o } = W, pos = track(t, W.keys, "pos", [0, 0, 0]), rot = track(t, W.keys, "rot", [0, 0, 0]), sc = track(t, W.keys, "scale", 1);
        let m = { dx: 0, dy: 0, dz: 0, drx: 0, dry: 0, ds: 1, o: 1 };
        const en = o.enter, ex = o.exit;
        if (ex && t >= ex.at) {
          const p = clamp((t - ex.at) / (ex.dur ?? 0.5)), q = EASE.exit(p);
          m = { ...m, ...MOVES[ex.type || "fade"](q, 1 - q) };
        } else if (en) {
          const u = t - en.at, p = clamp(u / (en.dur ?? 0.9)), q = 1 - EASE.premium(p);
          const s = SPRUNG[en.type] ? (u <= 0 ? 0 : spring(u, SPRUNG[en.type])) : 1 - q;
          m = { ...m, ...MOVES[en.type || "rise"](q, s) };
        }
        const fl = (o.float ?? 8) * Math.sin(t * 1.4 + W.phase);
        const x = pos[0] + m.dx, y = pos[1] + m.dy + fl, z = pos[2] + m.dz;
        W.el.style.transform = `translate3d(${x}px,${y}px,${z}px) rotateX(${rot[0] + m.drx}deg) rotateY(${rot[1] + m.dry}deg) rotateZ(${rot[2]}deg) scale(${sc * m.ds}) translate(-50%,-50%)`;
        W.el.style.opacity = clamp(m.o);
        W.el.style.visibility = m.o <= 0.001 ? "hidden" : "visible";
        const b = dof * clamp(Math.abs(depth([x, y, z], C, yaw, pitch) - focus) / 1600);
        W.el.style.filter = b > 0.15 ? `blur(${b.toFixed(2)}px)` : "";
        if (W.progress && o.video) { // video: {start, length} drives the scrubber and timecode
          const vt = clamp(t - o.video.start, 0, o.video.length);
          W.progress.style.width = (vt / o.video.length) * 100 + "%";
          W.time.textContent = `${Math.floor(vt / 60)}:${String(Math.floor(vt % 60)).padStart(2, "0")}`;
        }
        if (W.lines && o.lines) { // terminal: [[t, "text", cps?]] typed at cps characters per second
          W.lines.innerHTML = o.lines.filter(([lt]) => t >= lt).map(([lt, s, cps = 45]) => {
            const n = Math.floor((t - lt) * cps), done = n >= s.length;
            return `<div>${s.slice(0, n).replace(/</g, "&lt;")}${done ? "" : `<span style="background:${accent}">&nbsp;</span>`}</div>`;
          }).join("");
        }
        if (o.draw) o.draw(t, W.body, W);
      }
    }
    return { add, render, camera: (keys) => (cam = keys), focal, scene, root, windows: wins };
  }
  window.World3D = { create, THEMES: Object.keys(THEMES) };
})();
