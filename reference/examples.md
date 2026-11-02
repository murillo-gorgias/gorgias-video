# Examples: what good looks like

Rules prevent mistakes; examples set the bar. This file describes the bundled starter and the qualities that made finished videos pass review.

## The starter: `examples/starter/`

A short landscape video that runs end to end with the skill's scripts. Copy the folder to start a new video. Its `README.md` says how to render it and what to change first.

It shows the parts every product video needs:

- **A headline hook** on paper, in two wide lines.
- **A recreated interface** with a camera over it, a cursor click and a soft reveal sound.
- **An end card** on ink with the logo.
- **One timing file** that both the picture and the score read, so a retime moves both.
- **A score that masters itself** to the loudness target, with a build before each key moment.

## What made the picture pass review

- **It followed a strong reference.** Ask for a reference video before building. Agree on what to borrow from it: the camera distance, the pace, how clicks land.
- **The camera stays close on the interface.** A cursor drives every click. The camera darts into a button just before the click. A badge can grow into the app window. `motion.md` has the rules.
- **The interfaces look real.** Recreated apps are built close to the real ones, at twice their size so close-ups stay sharp. Their colours appear only inside their windows.
- **Every close-up centres on what is there.** The camera path comes from the measured layout, never from guesses.
- **The brand frames the video.** Feature Deck on paper at the start, the ink field at the end, no gradients.

## What made the sound pass review

- **Fourteen parts, each with one job,** and a different groove per section.
- **A build that ends exactly on each scene change** and a small lift into each click.
- **Calm interface sounds:** soft swells for reveals and checks that blend into the music, typing at a typist's pace.
- **Measured before anyone listened,** with `audio-check.py` and `sfx-prominence.py`.

`sound.md` has the full method.

## What did not pass

- **Thin synth music.** Plain supersaw chords and simple drums read as "cheap". Use `studio.ts` and `modern.ts`.
- **A headline stacked on four narrow lines** in a landscape frame.
- **A marimba for reveals.** Too pointy against soft electronic music.
- **Text too small inside a phone mock-up.** `brand.md` has the minimum sizes.
