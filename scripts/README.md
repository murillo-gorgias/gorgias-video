# Scripts

The repeatable jobs, written once and run the same way on every video. Each script takes file paths as arguments and prints what it did. They need ffmpeg, Python with numpy, scipy and Pillow, Node, and Playwright for the capture script. `SETUP.md` at the top of the skill installs all of them.

Every script here has run on finished videos.

## The pipeline, in order

| Script | What it does | Call |
|---|---|---|
| `page/runtime.js` | The page side of the capture pipeline. Copy it into the video project. Gives the page `video.onFrame`, `video.hold`, `video.random`, the easing curves and `video.progress`. Runs a preview with `?play`. | `<script src="runtime.js">` |
| `capture.js` | Photographs the page frame by frame with Playwright. Waits for every hold, font and image before each frame. Stops and names the hold if a frame is not ready in 20 s. | `node scripts/capture.js page.html out/frames [--frame N] [--from N --to N] [--every S] [--transparent] [--supersample K]` |
| `synth/` | The music and sound-effect generator. A video's `score.ts` imports `studio.ts` (mix chain, core instruments) and `modern.ts` (the modern palette), and `analysis.ts` for audio-reactive parts. The score masters its own `mix.wav`. `synth/README.md` has the shape. | `node --experimental-strip-types score.ts` |
| `mix-audio.py` | Turns an audio list (file, start, trim, duration, gain, fades, loop, ducking) into one ffmpeg command and writes the mix, normalised to −12 LUFS. | `python3 scripts/mix-audio.py audio.json out/mix.wav [--target -12] [--peak -1] [--dry-run]` |
| `assemble.sh` | Joins the frames and the mix into the H.264 master. `--blend K` averages sub-frames for motion blur. | `scripts/assemble.sh out/frames 30 out/mix.wav out/master.mp4 [--blend K]` |

## Checks

| Script | What it does | Call |
|---|---|---|
| `frame-check.py` | Finds frames that were not ready: runs of identical frames, near-blank frames, single-frame glitches. Exit code 1 when anything is flagged. `--diff` compares two frames. | `python3 scripts/frame-check.py out/frames` or `out/master.mp4`, or `--diff a.png b.png` |
| `contact-sheet.py` | Lays frames side by side, labelled, for checking cuts and pacing. Takes PNGs, a video with times, or a folder. | `python3 scripts/contact-sheet.py sheet.png a.png b.png`, `--video master.mp4 --at 0,3.97,4`, `--dir out/every --columns 8` |
| `loudness.sh` | Integrated loudness, loudness range and true peak, with a verdict against the −12 LUFS and −1 dBTP targets. | `scripts/loudness.sh out/master.mp4` |
| `audio-check.py` | Measures a mix when nobody can listen yet: tonal balance against a reference, loudness per bar, each drop against its build, a planned silence, stereo width per band. | `python3 scripts/audio-check.py balance\|bars\|drops\|gap\|width <mix.wav> ...` |
| `sfx-prominence.py` | How far each interface sound stands out over the music around it, with the levels that read. | `python3 scripts/sfx-prominence.py music.wav ui.wav --gain 1.5 --at 9,10.75 --typing 6.5-8.8` |
| `review-server.py` | Serves a review page on this computer and saves its notes to `notes.json` in the review folder. Answers partial requests so the video seeks frame by frame. `review/README.md` has the setup. | `python3 scripts/review-server.py review [--port 8790]` |
| `side-by-side.sh` | Stacks two videos next to each other for comparing a light copy with its master. | `scripts/side-by-side.sh master.mp4 light.mp4 compare.mp4` |

## Export

| Script | What it does | Call |
|---|---|---|
| `light-export.sh` | A small shareable copy. Compresses by quality (CRF 22), never by a size cap. `--grain` smooths film grain first. | `scripts/light-export.sh master.mp4 light.mp4 [--grain]` |
| `gif-export.sh` | A looping GIF from a video or a frames folder: one palette from the whole clip, no dithering, then gifsicle's lossy pass. For email headers, LinkedIn and chat. Needs `brew install gifsicle`. | `scripts/gif-export.sh master.mp4\|frames/ out.gif [width] [fps] [--from S --to S]` |

## Speech and music analysis

| Script | What it does | Call |
|---|---|---|
| `silence.sh` | Finds silent stretches. Measures loudness first and uses the gating threshold as the cut-off. Flags leading and trailing silence. | `scripts/silence.sh recording.wav [min-seconds]` |
| `transcribe.py` | Runs Whisper locally and writes captions as timed words with page breaks. Needs `pip3 install -U openai-whisper`, not installed by default. | `python3 scripts/transcribe.py voice.wav captions.json [--model small.en] [--language en]` |
| `beat-finder.py` | Tempo, first downbeat and level per bar of a music track, so cuts land on the beat. For AI-made or licensed tracks. | `python3 scripts/beat-finder.py track.wav [--bpm 120]` |

## Rules

- Scripts take paths as arguments and print what they did. No interactive prompts.
- Paths in an audio list are relative to the list file.
- A script that needs something not on the machine prints the install command and stops.
- Change a script here, in the skill. Video projects call it from here and never copy it, except `page/runtime.js`, which the page must include.
