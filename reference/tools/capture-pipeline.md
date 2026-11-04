# Tool: the capture pipeline

The animation tool for Gorgias work. It needs no paid licence. Claude builds the video as a web page. A script opens the page in a browser, sets the frame number, waits until everything on the page is ready, and photographs it. ffmpeg joins the photographs with the mixed sound. Every part is open source and already on the machine.

Commands below were checked on 2026-10-21 with Playwright 1.62, Chromium 155, ffmpeg 8.1 and Node 22.

## What a video project looks like

```
my-video/
  index.html        the page: one file, all scenes, fixed size
  video.js          the scenes, drawn from the frame number
  timeline.js       the beat grid and every time a sound depends on
  score.ts          the music arrangement, reads timeline.js and scripts/synth/
  audio.json        the audio list for mix-audio.py
  assets/           this video's own icons, screenshots and images
                    (brand fonts and logos come from /brand/, never copied in)
  STORYBOARD.md     the beat sheet and how to change things
  out/              frames/, mix.wav, master.mp4, light.mp4 (not in git)
```

The page includes the skill's runtime: `<script src="<skill>/scripts/page/runtime.js">`. Copy the file into the project so the project stands alone.

## The page contract

The page must follow four rules, or frames come out blank, half-drawn or mid-move.

**1. Time is a number the script sets, never the clock.** The page declares its size and length, and draws itself from a frame number:

```js
window.VIDEO = {width: 1080, height: 1350, fps: 30, frames: 750};
video.onFrame((frame, seconds) => {
  // set every style from `frame` or `seconds`. Nothing else may move anything.
});
```

No CSS animations or transitions. No `setTimeout`, `setInterval` or `requestAnimationFrame` loops. No `Date.now()` or `performance.now()`. No `Math.random()`: use `video.random(seed)` for repeatable noise. A CSS animation runs on the wall clock, so the photograph catches it wherever it happens to be.

**2. Everything that loads holds the frame.** The runtime watches fonts and images on its own. For anything else that loads, such as fetched data, a video element seeked to a time, or a canvas drawn from a decoded image, take a hold and release it when done:

```js
const release = video.hold('feed data');
fetch('data.json').then(r => r.json()).then(d => { feed = d; release(); });
```

The capture loop waits until every hold is released before photographing. A hold that never releases stops the render after 20 s and prints its name. Name every hold.

**3. Fixed size, scale 1.** The body is exactly `VIDEO.width` by `VIDEO.height`, overflow hidden, margin 0. The browser opens at that size with a device scale factor of 1. For a sharper master, build the page at 2× and set the sizes accordingly, rather than capturing at a higher scale factor.

**4. Fail loudly.** If a frame is not ready in time, the capture stops and names the hold. It never writes a blank frame and carries on. After capture, `frame-check.py` finds any frame that slipped through.

## Preview in a browser

Serve the folder with `node <skill>/scripts/preview.js <project>` (checked 2026-11-04) and open http://127.0.0.1:8787/?play to watch the video with sound. Click once: browsers only play sound after a click. The runtime runs a clock from the real time and calls `onFrame` with the matching frame, so the preview and the capture draw from the same code. `?frame=120` shows one frame still. `?play&from=10` starts at 10 s. The preview drops frames on heavy scenes; the capture never does. Verify on a rendered file, never the preview.

A page opened straight from a file cannot load JavaScript modules or fetch data. That is why both the preview and `capture.js` serve the folder over HTTP. Both also serve the brand kit folder at `/brand/` (step 5 of "Set it up" in the skill's `README.md`), so the page uses the same brand addresses as every other Gorgias tool. A plain `python3 -m http.server` cannot serve `/brand/`, so its fonts and logos come out missing.

## Capture

```
node scripts/capture.js my-video/index.html out/frames            # all frames
node scripts/capture.js my-video/index.html out/one --frame 120   # one frame, for checks
node scripts/capture.js my-video/index.html out/sheet --every 0.5 # a frame every half second
node scripts/capture.js my-video/index.html out/frames --from 300 --to 419  # one scene
node scripts/capture.js my-video/index.html out/frames --transparent        # no background
node scripts/capture.js my-video/index.html out/frames --supersample 8      # for motion blur
```

The script reads `VIDEO` from the page for the size, frame rate and length. For each frame it sets the frame, waits for zero holds, waits two paint cycles so layout settles, then writes `f00000.png` and so on. It prints progress every second and a summary at the end: frames written, time taken, slowest frame.

A full 25 s video at 1080 × 1350 takes about two minutes.

## Assemble

```
scripts/assemble.sh out/frames 30 out/mix.wav out/master.mp4
scripts/assemble.sh out/frames 30 none out/silent.mp4
scripts/assemble.sh out/frames 30 out/mix.wav out/master.mp4 --blend 8   # after --supersample 8
```

Frames in, H.264 master out, audio cut to the shorter of the two. `--blend 8` averages every eight frames into one for motion blur.

## Sound

`sound.md` covers the score and the audio list. In short: `node --experimental-strip-types my-video/score.ts` writes the stems, `python3 scripts/mix-audio.py my-video/audio.json out/mix.wav` mixes them, and `assemble.sh` joins the result with the frames.

## Checks

`checks.md` has the full list. The three the pipeline depends on:

- `capture.js --frame N` for single frames, before any full capture.
- `frame-check.py out/frames` after a capture, before assembling.
- `loudness.sh out/master.mp4` after assembling.

## How to structure the code

`examples/starter/` is the worked example. Its shape:

- `theme.js`, `motion.js`, `components.js`: tokens, easing and interpolation helpers, and the reusable parts as DOM builders. A builder that moves returns an element with an `update()`.
- `scenes.js`: one builder per scene returning `{el, update(sceneSeconds, levels, frame)}`.
- `video.js`: builds every scene once, shows the active one per frame, adds the flash and the grain.
- The music levels per frame come from `score.ts` as `out/levels.json`, loaded with a hold.

Build the DOM once and only set styles per frame. Rebuilding elements per frame is slow and makes every frame differ, which hides real duplicates from `frame-check.py`.

## Interfaces and a camera, in the page

How to build a recreated app window with a camera over it. `motion.md` has the taste; this is the mechanics.

- **One plate, one transform.** The windows and the cursor sit in a plate element. The camera sets `translate` and `scale` on the plate with `transform-origin: 0 0`: `translate(W/2 − x·s, H/2 − y·s) scale(s)`.
- **Build the windows at twice the real size** (2400 × 1150, body text 34 px). Close-ups then scale up only about 1.4×, and text stays sharp. No `will-change`, or Chromium rasterises at the first scale and blurs.
- **Measure layout on the first frame, not at build time.** Fonts are loaded by then. Sum `offsetLeft` and `offsetTop` up to the window (`offsetIn` in the starter's `motion.js`); they ignore CSS `translate`, so scrolling and camera moves do not disturb them. Keep every element laid out from the start and show or hide it with opacity, so positions never shift.
- **Typed text is a text node set per frame** from the keystroke times; streamed answers are word spans built once whose opacity follows the word times.
- **Fit a headline once.** Measure each line as an inline-block span after the fonts load, then set the font size so the widest line meets the target width.
- **Recapture only what changed.** `capture.js index.html out/frames --from 0 --to 179` rewrites just those frames into the full set. A sound-only change needs no capture at all: rebuild the score, then `assemble.sh`. Copy a version folder with its `out/frames/` (about 128 MB for 40 s at 1080p) to start the next version.

## Pitfalls found so far

- **A font that is never used does not load**, and the runtime cannot wait for it. Declare the faces in `@font-face` and use each one on the page from frame 0, or list them in `VIDEO.fonts` so the runtime loads them at start.
- **`backdrop-filter` needs something behind it.** A frosted card over plain paper shows no blur. That is fine; it still reads as frosted from the fill and the line.
- **3D transforms need `transform-style: preserve-3d` on every ancestor** between the perspective and the element, or the plane flattens.
- **Blur on a large layer is slow.** Blur the element, not the container, and keep blurred layers few.
- **Hiding and showing an element must restore its original `display`.** Setting `display: ''` on a grid-centred badge turned it into a block and broke the centring. Keep the built value and put it back.
- **Playwright's Chromium is separate from the Mac's Chrome.** `npx playwright install chromium` downloads it once into `~/Library/Caches/ms-playwright/`. The script prints that command if the browser is missing.
