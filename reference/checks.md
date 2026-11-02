# Checks

What to check, and how, before any full render and again on the finished file. A frame takes seconds; a full render takes minutes. Check with frames.

## While building: single frames

Capture one frame at a time with the tool's single-frame command (`capture.js --frame 42` for the pipeline). Open it at full size, not scaled down.

Check, in this order, every time a scene changes:

1. **Frame 0.** It is the cover. The headline is readable and the key element is in place.
2. **The first frame of each scene.** The scene has started; nothing is mid-load.
3. **The last frame of each scene.** The scene has finished; nothing is cut off mid-move unless the cut wants it.
4. **One frame in the middle of each entrance**, to see the blur and the easing.
5. **The hold frames.** Where the beat sheet says the viewer reads, the text is fully settled and sharp.

## Every cut

Lay the last frame of one scene next to the first frame of the next with `contact-sheet.py`. Look for:

- A jump in position of an element that should stay put (a header, a counter).
- A colour or exposure jump that the cut does not want.
- A freeze frame that does not match the frame it freezes. Diff them: `compare -metric AE` with ImageMagick, or `frame-check.py --diff a.png b.png`. They must match within one colour level.

```
python3 scripts/contact-sheet.py cuts.png f0119.png f0120.png f0299.png f0300.png
```

## The contact sheet

Capture a frame every half second (`capture.js --every 0.5`) and lay them out with `contact-sheet.py`. One image shows the whole video's pacing. Read it left to right and ask: does the story move? Is anything on screen too long or too short? Does any frame look empty?

## Text

- **Sizes meet `brand.md`.** Measure a headline on a captured frame with a ruler, not in the page's CSS, since scale transforms change the result.
- **Nothing hides behind anything.** A third line of a headline behind a card is the classic failure. Check every frame where text and a card share space.
- **The fonts loaded.** Zoom a captured frame. Feature Deck has its own shapes. A fallback serif means the font file did not load, and the pipeline did not notice because the font was never requested.

## After a render: the frame check

`frame-check.py` hashes every frame of a render or a frames folder. It flags:

- **Two identical frames in a row.** Something was not ready, or the clock stalled. Expected only where the beat sheet holds a freeze.
- **A near-blank frame**: almost all one colour. A font or an image was still loading. Expected only on a deliberate flash.
- **A frame that differs wildly from both neighbours.** A glitch.

Run it on every render before anyone watches.

## Loudness

`loudness.sh` on the finished file, after the AAC encode. Integrated loudness around −12 LUFS, true peak at or below −1 dB. Then listen once with the sound at phone volume, once at desk volume, and once folded to mono.

Then look at the waveform: `ffmpeg -i final.mp4 -filter_complex showwavespic=s=1600x300 -frames:v 1 wave.png`. The stop and the drop show at a glance. A gap that should be silent shows as a flat line.

## Sound, by measurement

Claude cannot listen, so every sound change gets measured before anyone hears it. `sound.md` has the targets.

- `audio-check.py balance` against the brief's reference track: within about 2 dB per band.
- `audio-check.py bars` and `drops`: builds rise, each drop at least 1 dB over the second before it.
- `audio-check.py gap`: the stop is silent in the final mix.
- `audio-check.py width`: the low band mono, the top wide.
- `sfx-prominence.py`: checks +1 to +4 dB over the music, reveals +5 to +10, clicks +4 to +8, typing +2 to +4.
- A mono fold loses about 3 dB and no more.

Then say plainly that nobody has listened yet.

## The light copy

Before sharing a compressed copy, stack it beside the original with `side-by-side.sh` and scrub both at the busiest moments. Flat backgrounds smear first.

## Before saying it is done

- [ ] Frame 0 is a finished picture.
- [ ] Every cut checked on a contact sheet.
- [ ] Text sizes measured on a captured frame.
- [ ] `frame-check.py` reports no unexpected duplicates or blanks.
- [ ] Loudness within target on the final file.
- [ ] Sound measured: balance, drops, gap, width, interface levels.
- [ ] The whole video watched once, with sound, at phone size.
- [ ] The light copy compared with the original.
- [ ] Placeholder copy listed for sign-off.
