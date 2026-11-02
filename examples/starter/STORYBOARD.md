# Storyboard: starter video

A 16-second landscape video, 1920 × 1080 at 30 fps. 120 BPM, so one bar is 2 seconds. Eight bars, three scenes, every cut on a downbeat.

The copy is placeholder. Replace it with the brief's words in `theme.js` (on-screen copy) and `timeline.js` (typed text).

## Beat sheet

| Time | Bars | Scene | What the viewer sees | Words on screen | What they hear |
|---|---|---|---|---|---|
| 0–4 s | 1–2 | Hook | The two-line headline on paper, full size from frame 0. A slow push. A coral underline draws under the last word at 1 s. The headline blurs out at 3.5 s. | "Your support team, / one step ahead." | Vinyl, pad, plucks. Hats join in bar 2. A soft swell on the underline. A build: riser, snare roll, the low end thinning out. |
| 4–12 s | 3–6 | Product | The window lands on the drop, wide. The camera moves in on the command box while a request is typed. It darts into the Run button for the click at 7 s, pulls back for the status chip, then frames the three results as they reveal. The window fades out under the build. | "Tag every late-delivery ticket", "Tagging tickets", "Done", three ticket rows with a tag | The drop at 4 s. The lo-fi groove. Typing, a click, a soft swell for the status, a quieter swell for the check at 8.25 s, one soft swell per result row. Bar 6 is the build into the close. |
| 12–16 s | 7–8 | Close | The ink field. The line enters from a light blur. The Gorgias logo pops in at 12.75 s. The orbit mark turns slowly in the corner. | "Try it in minutes." | The close drop at 12 s. A soft swell on the logo. The last chord at 14 s, ringing to silence. |

Frames 120 (4 s) and 360 (12 s) read as near-blank in `frame-check.py`. Both are deliberate: the first frame of each drop, before the window or the line has come in.

## How to change things

- **Words:** `theme.js` holds the headline, the window labels, the result rows and the closing line. `timeline.js` holds the typed request, because the typing sounds follow it letter by letter.
- **When something happens:** change its time in `timeline.js`, then run `npm run score`. The picture, the camera and the sound all read that file.
- **A scene's length:** keep it a whole number of bars. Change `SCENES` and `TOTAL_SECONDS` in `timeline.js`, the frame count in `index.html`, and `PROG` (one chord list per bar) in `score.ts`.
- **The camera:** the `keys` list in `scenes.js`, `product()`. Each key is a time from `timeline.js`, a centre point in window pixels and a zoom.
- **The interface:** `productWindow()` in `scenes.js`. It is a neutral stand-in. Rebuild it as the real product screen.
- **Sound levels:** the interface sounds sit at the end of `score.ts`, one line per sound. Re-measure with `sfx-prominence.py` after any change to the music.

## Review

Not set up yet. When the video is ready for feedback, set up the review page (`review/README.md` in the skill) and write its address here: the server command and `review/notes.json` for a local page, or the claude.ai link for a shared one.
