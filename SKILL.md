---
name: gorgias-video
description: Make a Gorgias video from brief to finished file. Covers the script and beat sheet, brand and motion rules, recreated app interfaces with a moving camera, a code-made score with builds and drops, interface sounds, captions and voiceover, quality checks (including sound checks by measurement) and export, with scripts for the repeatable jobs and a starter project to copy. Use when someone asks to plan, build, check, fix or export a Gorgias video, GIF or animated asset.
---

# Gorgias video

This skill takes a video from brief to finished file. Claude builds the video as a web page, photographs it frame by frame, makes the music in code, then checks and exports the result. Every tool it uses is free and open source.

**First time on this computer?** Follow "Set it up" in `README.md` before step 1. Its "When something goes wrong" table explains the scripts' error messages.

## The workflow

Follow the steps in order. Open each reference file when its step starts, not before.

1. **Brief to beat sheet.** Ask for the channel and the format first. The skill supports square, landscape, portrait and anything else a channel needs. Then turn the brief into a script, then a beat sheet: what each scene says and the second it lands. One beat grid drives sound and picture. Read `reference/brief-to-beats.md`.
2. **Brand.** Load `brand:core`. Then read `reference/brand.md` for the video-only rules: safe areas, minimum text sizes, frame 0 as the cover image.
3. **Start from the starter.** Copy `examples/starter/` into the video's own folder and follow its `README.md`. Read `reference/tools/capture-pipeline.md` for how the page, the capture and the assembly work.
4. **Motion.** Read `reference/motion.md` before animating anything. It holds how things enter, move and settle.
5. **Sound and speech.** Read `reference/sound.md` for music, interface sounds, mixing and mastering. Score with `scripts/synth/studio.ts` and `modern.ts`, give each key moment on screen a build, and master inside the score. Read `reference/speech.md` when the video has captions or a voice.
6. **Looks.** Read `reference/looks.md` when choosing an effect, a transition or an annotation. It is a menu with the open-source equivalent for each.
7. **Check.** Read `reference/checks.md`. Check single frames, every cut, a contact sheet and loudness before any full render. Claude cannot listen. Measure the sound with `audio-check.py` and `sfx-prominence.py`, then say plainly that nobody has heard it yet. To collect feedback, set up the review player from `review/README.md`. Ask whether the person wants it local (the default, notes saved in the project folder) or shared on claude.ai, and write its address in the video's `STORYBOARD.md`.
8. **Export.** Ask where the video will be used, then read `reference/export.md`. Its channel table picks the format, size and frame rate. An email header is a light GIF; a YouTube video is HD at 24 or 30 fps.

Before building, read `reference/examples.md`. Rules prevent mistakes; the examples set the bar.

## Scripts

`scripts/README.md` lists every script, what it does and how to call it. Each takes file paths as arguments and prints what it did.

## Rules that never change

- **Everything animates from the frame number.** No CSS animations, no timers, no randomness without a seed.
- **A time that a sound depends on lives in one place only.** The timing file is that place.
- **Check with single frames, never full renders.** A frame takes seconds. A full render takes minutes.
- **Frame 0 is a real picture.** Social platforms use it as the cover image.
- **Verify on a rendered file, never the preview.**
- **Write for a designer, not an engineer.** Plain words, the point first.
