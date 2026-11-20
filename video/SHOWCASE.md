# OPVORA showcase video

- `opvora-showcase.mp4`: the new 44 s motion-graphics film (1080p60, with narration, music and sound effects).
- `opvora-showcase-v1-screenrec.mp4`: the original 96 s screen recording, kept as a backup.
- `motion/opvora-film.html`: the film as a self-playing web page, with one `render(t)` timeline.

## Preview it in a browser
Open `video/motion/opvora-film.html` in Chrome and click **Play with sound**. You can also press Space. The audio clock drives the animation, so picture and sound stay in sync. Fonts load from Google Fonts. If you're offline, the page falls back to system fonts.

To freeze any moment, add `?t=` with the time in seconds, for example `opvora-film.html?t=20.5`.

## Re-render the MP4
Run these from `video/motion`. You need Node, ffmpeg and Chrome installed. Run `npm install` once first.
```
node mix.mjs                                              # score + SFX + Kokoro VO -> audio/mix.wav
ffmpeg -y -i audio/mix.wav -af "loudnorm=I=-14:TP=-2:LRA=11,alimiter=limit=0.8:level=disabled" audio/master.wav
ffmpeg -y -i audio/master.wav -c:a aac -b:a 192k audio/master.m4a
node render.mjs opvora-film.html --scale 1 --fps 60 --out out/visual.mp4   # frame-accurate capture (~1x realtime)
ffmpeg -y -i out/visual.mp4 -i audio/master.m4a -map 0:v -map 1:a -c:v copy -c:a copy -shortest -movflags +faststart ../opvora-showcase.mp4
```
- For a sharper final with supersampling, drop `--scale 1`. It renders about 4x slower.
- `node render.mjs opvora-film.html --scale 1 --stills 5,20,40` exports single frames you can review.

## Change the voice
The narration is Kokoro `af_heart` at 0.95x, in `audio/vo1.wav` to `vo9.wav`. Auditions of `am_michael` and `bm_george` are in `audio/audition_*.wav`. To swap the voice, regenerate the nine lines with the same filenames and re-run the steps above. The VO start times are in the `VO` table in `mix.mjs`.

## Facts shown on screen
- Real: the phishing-link verdict (HIGH, 80/100, Llama 3.3 70B on Cloudflare Workers AI, 7.3 s) and the assistant's answer are captures from the live site.
- Simulated: the console's events are scripted samples, labelled on screen as "Simulated events · real AI analysis".
- Roadmap: browser, device and account protection are shown as "Coming next".
