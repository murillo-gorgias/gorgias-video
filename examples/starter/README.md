# Starter video

A small, complete video project for the capture pipeline. Copy this folder, fill in the brand assets, and change it into the video the brief asks for.

It shows the house approach in 16 seconds:

- a two-line headline that is a real picture on frame 0
- a product window under a moving camera, driven by a cursor, with typing, a click and a result
- an end card on ink with the Gorgias logo
- a code-made score whose builds and drops land on the scene changes, and which masters itself
- one timing file (`timeline.js`) that the picture, the camera and the sound all read

`STORYBOARD.md` has the beat sheet and how to change things.

## Files

| File | What it holds |
|---|---|
| `index.html` | The page: size, frame rate, frame count, the fonts to wait for. |
| `timeline.js` | Every time a sound depends on, and the typed text. |
| `theme.js` | Colours, fonts and the on-screen copy. |
| `video.js` | Shows one scene at a time, from the frame number. |
| `scenes.js` | The three scenes and the camera. |
| `components.js` | The parts: cursor, status chip, window frame, icons. |
| `motion.js` | Easing, entrances, drift and camera keyframes. |
| `score.ts` | The music, the interface sounds and the master. |

## Set it up

1. **Copy this folder** to where the video project should live, and give it a name.
2. **Copy the page runtime** from the skill: `scripts/page/runtime.js` into the project folder, next to `index.html`.
3. **Fill `assets/` from the Gorgias brand kit.** The `brand:core` skill describes the kit, which is served at `/brand/` in Gorgias tools. Fonts and logos are never shipped with this skill. Copy these files:

   | Put it at | Take it from the brand kit |
   |---|---|
   | `assets/fonts/FeatureDeck-Regular-Web.woff2` | `/brand/2026/fonts/FeatureDeck-Regular-Web.woff2` |
   | `assets/fonts/InterVariable.woff2` | `/brand/2026/fonts/InterVariable.woff2` |
   | `assets/fonts/RedHatMono-VF.woff2` | `/brand/2026/fonts/RedHatMono-VF.woff2` |
   | `assets/primary-logo-white.svg` | `/brand/primary-logo-white.svg` |
   | `assets/orbit-dark.svg` | `/brand/2026/orbit-dark.svg` |

4. **Point the score at the skill.** `score.ts` loads the synth from `~/.claude/skills/gorgias-video/scripts/synth/`. If the skill sits elsewhere, set `GORGIAS_VIDEO_SKILL=/path/to/gorgias-video` when you run it, or change the `SKILL` line at the top of `score.ts`.

The skill's `scripts/README.md` lists what the scripts need: ffmpeg, Python with numpy, scipy and Pillow, Node 22.6 or newer, and Playwright.

## Run it

Run these from the project folder. `$SKILL` stands for the skill's folder.

```sh
npm run score                                                  # out/music.wav, out/ui.wav, out/mix.wav
node $SKILL/scripts/capture.js index.html out/keys --every 0.5 # a frame every half second
python3 $SKILL/scripts/contact-sheet.py out/sheet.png --dir out/keys --columns 6
node $SKILL/scripts/capture.js index.html out/frames            # every frame
python3 $SKILL/scripts/frame-check.py out/frames
$SKILL/scripts/assemble.sh out/frames 30 out/mix.wav out/video.mp4
$SKILL/scripts/loudness.sh out/video.mp4
```

Check single frames and the contact sheet before capturing every frame. To preview in a browser, run `npm run preview` and open `http://localhost:8787/?play`.

## What to change first

1. **The words**, in `theme.js` and `timeline.js`.
2. **The window**, in `scenes.js` (`productWindow`). Rebuild it as the real product screen the video is about, at the real layout, with invented data.
3. **The timing**, in `timeline.js`, in whole bars. Then `npm run score`.
4. **The camera**, in the `keys` list in `scenes.js`, so each close-up centres on what is there.
5. **The sound levels**, after the music is final. Measure with `sfx-prominence.py` and `audio-check.py`.

## What it measured when it was checked

Checked on 2026-10-30. The mix comes out at −12.4 LUFS and −3.8 dBTP after AAC. Both drops land louder than their builds (+3.5 dB at 4 s, +1.5 dB at 12 s). Every interface sound peaks about 5 to 10 dB over the music around it. `frame-check.py` flags only the two drop frames that `STORYBOARD.md` explains.
