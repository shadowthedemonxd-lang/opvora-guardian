# Motion kit: render any web page to MP4, frame-accurately

Tested with Node 22, Playwright 1.64, Chrome, and ffmpeg on macOS. Every example below passes
`--check`: the same moment renders the same pixels whatever order frames are drawn in.

## Set up (once per project)

```bash
cp -R ~/.claude/skills/motion-video-director/starter ./motion   # or ~/.agents/skills/... in Codex
cd motion && npm install
```
The renderer uses Playwright's own Chromium if it's downloaded, otherwise your installed Google
Chrome. If neither works, run `npx playwright install chromium`. ffmpeg must be on PATH.

## Commands (run inside the kit folder)

```bash
node render.mjs examples/d3-chart.html                      # -> out/d3-chart.mp4
node render.mjs examples/d3-chart.html --check              # determinism test, run this first
node render.mjs examples/d3-chart.html --stills 1.5,4,5.9   # PNG checkpoints for the critique loop
node render.mjs scene.html --fps 60 --duration 15 --size 1080x1920 --out published/reel-9x16.mp4
node render.mjs scene.html --frames 83,85                   # stills by FRAME number + side-by-side _pair.png
node render.mjs scene.html --contact                        # 12-frame contact sheet (read it like a storyboard)
node render.mjs scene.html --audio sfx.wav --gif            # mux audio at -14 LUFS, also export a looping GIF
node render.mjs scene.html --sheet                          # contact sheet, 2 frames per second, 6 across
node render.mjs scene.html --strip 240                      # 12 consecutive frames from frame 240 (easing, overshoot, dead frames)
node render.mjs scene.html --stills 1,2.5 --phone           # also 360 px wide copies for the phone test
node render.mjs scene.html --loopcheck                      # the clip played twice back to back
node tools/beats.mjs song.wav > beats.json                  # bpm, beats, downbeats, hits of a supplied track
node tools/audio-check.mjs film.mp4                         # loudness, true peak, first sound, ending, dead air vs pro launch films
GPU=1 node render.mjs examples/three-studio.html          # three.js on the real GPU (about 3x faster); confirm with --check
node render.mjs examples/window-world.html --mblur 2       # 3D window world, real motion blur (2-4 subframes per frame)
node render.mjs scene.html --scale 1 --fps 30              # quick draft: no supersampling, half the frames
```
Open any scene in a browser with `?t=2.5` (seconds) or `?f=84` (frame) to freeze that exact frame.

**Quality defaults:** 60 fps, rendered at 2x device pixels and downscaled with lanczos (no jaggies on type or thin
lines), H.264 High CRF 14 `-tune animation`, BT.709 tagged. `--mblur k` renders k subframes per frame across a
180-degree shutter and averages them, so it costs k times the render time: use it on the final, not on drafts.
`--check` passes frames that match exactly, or within 8 of 255 levels (CSS 3D compositor rounding, invisible).

## Motion vocabulary: `lib/kinetic.js` (load after motion.js)

```js
Kinetic.animate(titleEl, { in: "mask-up", at: 1.2, out: "fade", outAt: 4 }); // setup(): splits the text for you
Kinetic.animate(word, { in: "highlight", at: 2 });                            // marker sweep (colour: --k-mark)
Kinetic.render(t);                                                            // render(t): draws all of them
Kinetic.sequence(t, [shotA, shotB, shotC], [{ at: 5, type: "iris", to: 1 }, { at: 9, type: "whip", to: 2, dir: "left" }]);
```
Text effects, each with a default unit, duration and stagger you can override (`by: "chars"|"words"|"whole"`,
`dur`, `stagger`, `from: "start"|"center"|"end"|"random"`): fade, rise, sink, mask-up, mask-down, blur-in, pop,
bounce, stomp, zoom-in, zoom-out, drift-left, drift-right, skate, tumble, roll, flip-up, merge, spread, typewriter,
scramble, flicker, wipe-right, wipe-up, highlight, underline. Exits replay an effect backwards with ease-in, about
half as long. Shot transitions: crossfade, dissolve, push, whip, zoom-through, slide-over, sheet, wipe, diagonal,
iris (`origin`), doors, flip, expand (`rect` = the window it grows from), glide.
A `whole` effect sets the element's own `transform`: put it on an inner element, not the one you position.

## 3D window world: `lib/world3d.js` + `examples/window-world.html`

Floating browser / app / video / terminal / phone / card windows in a CSS-3D space (themes: night, studio, dawn,
paper) with a floor grid, depth dust, depth of field and an eased camera. The example is script-driven: edit only
its `SCRIPT` (windows declared once; each shot lists camera, title, the windows to show and their poses; `flat`
shots are full-frame kinetic type; `cut` names the transition into a shot). Windows take `html` for content,
`draw(t, body)` for live content, `lines` for a typing terminal and `video` for a playing scrubber.

## Make a new scene

Copy `examples/_template.html`. A scene is a page that calls
`Motion.stage({ fps, duration, width, height, render, setup })` from `lib/motion.js`.
- `setup()`: async, runs once (load data, compute layouts).
- `render(t)`: draws the exact frame for `t` seconds. Must not depend on earlier calls.

`lib/motion.js` gives you `spring`, `springAt(t, at, "card"|"snappy"|"heavy"|"pop")`,
`progress`, easings, a seeded `rng(seed)`, and `beats(bpm).at(n)` / `.frame(n, fps)` for the beat
grid (rounded per beat, so it never drifts). Also: `EASE.enter|premium|move|exit|pop` (named
cubic-beziers), `bezier(x1,y1,x2,y2)`, `dampingRatio(k, d, m)`, `loopPhase(t, duration)` for
seamless loops (set `duration` to exactly one period; frames 0 to N-1 are rendered), and
`stagger(i, base, gap)`, and `springTrack(t, [[t0, v0], [t1, v1]], preset)` for values that retarget several times. `stage()` also exposes `window.renderAt` and `window.__ready`.
`lib/base.css` holds the colour and type tokens; replace them with the brand's.

The same page also works inside **HyperFrames**: `stage()` listens for its `hf-seek` event.

## Library recipes (each is a working example)

| Library | Example | The trick that makes it video-safe |
|---|---|---|
| **d3** | `d3-chart.html` | Scales/shapes as pure functions of `t`. Line draw-on via `stroke-dashoffset`. Never `d3.transition()`. |
| **Chart.js** | `chartjs-chart.html` | `animation: false`, `events: []`, set data from `t`, `chart.update("none")`. |
| **ECharts** | `echarts-dashboard.html` | `animation: false`, `setOption` from `t`, then `chart.getZr().refreshImmediately()`. |
| **Cytoscape** | `cytoscape-network.html` | Use it **headless** for graph maths (BFS order, shortest path), lay out with d3-force (fixed ticks), and draw with SVG. Its own canvas renderer failed `--check`. |
| **3d-force-graph** | `force-graph-3d.html` | Fixed node positions from a seed, `pauseAnimation()`, `linkWidth(0)` (plain lines you can move), set the camera from `t`, then `renderer().render(scene, camera)`. |
| **GSAP** | `gsap-morph.html` | One paused timeline, `render = (t) => tl.seek(t, false)`. A spring can be used as a GSAP ease. |

Not built as examples (same principles apply): **anime.js** (timeline with `autoplay: false`,
then `.seek(ms)`); **nivo / React Flow** (React: use them in Remotion with `animate={false}` and
drive props from `useCurrentFrame()`); **Plotly** (`Plotly.react` per frame, slow);
**G6** (disable animation, precompute layout).

## Gotchas found while testing

- Decode every `<img>` in `setup()` (`await Promise.all([...document.images].map(i => i.decode()))`), or the first
  frame that shows an image renders blank and `--check` reports DIFFERENT.
- `render(t)` must not return anything to the capture script. GSAP's `seek()` returns the timeline,
  which hung Playwright. The renderer now ignores return values.
- Never compute the camera from a library's live bounding box. It changes with element sizes and
  may be cached. Use the fixed layout positions.
- WebGL renders through SwiftShader in headless Chrome. It's slower but deterministic. Set
  `preserveDrawingBuffer: true`.
- `--check` proves the frames are stable, not that they look right. Always look at `--stills` too.
  The first 3D render passed `--check` with broken links.
- At 1920×1080, 30fps, expect about 12 frames per second of rendering (6s clip ≈ 15s).

## three.js studio kit

`lib/studio3d.js` is an ES module of recognizable props at real proportions (1 unit = 10 cm): pencil, pencil cup,
headphones, mug, paperclip, scissors, clapperboard, film reel, camera, mic, marker, sticky pad, ruler, plant,
director's chair, megaphone, top hat, pan, gear, coil, magnifier, bulb, swatch fan, doc icon, phone, plus a studio
cyclorama, light beams, confetti and ring pulses. Import it from a page that maps `three` in an importmap (see
`examples/three-studio.html`), set `ENV.map = scene.environment`, and call `DRAW.forEach(d => d.draw())` after fonts
load. The template also shows the per-set grade presets, supersampling (`?ss=2`), subframe motion blur (`?mb=3`),
a flat 2D insert, arc accents and `legible()` type. Rules: `references/3d-fidelity.md`.
