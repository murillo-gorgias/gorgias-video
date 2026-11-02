# Motion

How things enter, move and settle. These rules are brand-wide. They come from design reviews of finished Gorgias videos, and they hold whichever tool draws the frames.

## The six principles

1. **One shared perspective.** Every element sits in the same space. No element tilted at its own random angle. If the scene is a tilted plane, every card lies on that plane.
2. **Something is always drifting.** Nothing stops dead. A settled headline still breathes, a card still floats, a light still turns. The drift is slow and small, two to six pixels over several seconds.
3. **Entrances overlap and come into focus.** Elements arrive while the previous one is still settling. They fade up from a light blur, 6 to 12 px, to sharp. They never take turns.
4. **Travel starts promptly and lands softly.** A move leaves at once and spends most of its time slowing into place. Ambient loops run at constant speed with no easing.
5. **Slow floats move as one layer.** A whole group drifts together, composited as one. Otherwise text snaps from pixel to pixel.
6. **Give people time to read the first thing before speeding up.** The first message holds. Then the pace climbs.

## Easing curves

Name the curve in every animation. These five cover almost everything. Each one is a cubic bezier, so any tool can reproduce it.

| Name | Curve | Use for |
|---|---|---|
| `out` | 0.16, 1, 0.3, 1 | Arrive and settle, with a long tail. The default entrance. |
| `glide` | 0.5, 0, 0.2, 1 | Travel that leaves promptly and lands softly. Camera moves, headline moves. |
| `back` | 0.34, 1.56, 0.64, 1 | A pop with a small overshoot. Badges, stickers, emoji. |
| `in` | 0.55, 0, 0.8, 0.4 | Leave, gathering speed. Exits only. |
| `inOut` | 0.65, 0, 0.35, 1 | A move that starts and ends at rest, such as a flip. |

A linear curve is for ambient loops only: a turning light, a constant scroll.

## Timing

- **Every animation has a start, a length and a curve.** Nothing drifts with no end. A property is 0 before its start, 1 after its end, eased between.
- **Key everything off seconds, then convert to frames.** 0.4 s reads better than 12 frames and survives a frame-rate change.
- **Entrances take 0.4 to 0.8 s.** Shorter looks nervous, longer looks slow.
- **Exits take half the time of entrances.**
- **A pop overshoots by 5 to 8%** and settles in 0.5 s.
- **Give each element a constant duration from its trigger.** When items arrive on a schedule, each one animates for the same length from its own start time. Otherwise the last ones flash by.

## Entrances and exits

- **Fade up from blur** is the house entrance: opacity 0 to 1, blur 8 px to 0, a rise of 20 to 40 px, over 0.5 to 0.7 s with `out`.
- **A headline moves and scales as one block**, never word by word. Reviewers rejected a reflow that re-wrapped the words one by one.
- **Reveal in phases** when the object has parts: the outline draws, the fill blooms with a slight overshoot, then the label rises. Each phase starts before the previous one ends.
- **A line draw has a bright head** that leads it and fades at the end.
- **When two elements hand over, swap them on one exact frame.** Fading one out while its parent fades in made it blink.
- **Exits are quicker and plainer than entrances.** Scale down slightly, blur, fade, `in`.

## Camera

- **A slow camera reads as calm.** For a travelling shot, double the time that feels right. A flyover that felt rushed at 8 s felt right at 24 s.
- **Round every corner of a camera path.** Turns are gentle, never a hard change of direction.
- **Move at constant ground speed** and aim at a point ahead so turns ease themselves.
- **Bank into turns** on 3D moves, a few degrees.
- **Render a fixed oversized plate and move it** with translate and scale. Never move the live scene, or detail shimmers.
- **Camera shake is a few slow sines with seeded phases**, never random jitter. Three sines at different speeds, each half the strength of the last.
- **A buzz** (a phone vibrating) is a damped sine at about 11 Hz over 0.5 s.

## A camera over an interface

For videos that show a product being used, with the camera moving over a recreated app window. `examples/starter/` has a working version.

- **Build the interface large and move a camera over it.** The camera is a centre point and a zoom, keyframed with `glide`. Close-ups for reading sit at a zoom where body text lands at about 46 to 48 px on a 1920 frame; wide shots show the whole window for context.
- **Centre every framing on what is there.** Compute the camera targets from the measured positions of the bubbles, chips and answers, never from guesses. A guessed framing left the top half of the frame empty.
- **Keep the frame inside the window.** Clamp the camera so its edges never pass the window's edges, except for a deliberate wide shot.
- **Dart to the button before a click.** A quick zoom into the send button about 0.3 s before the click, then a pull back as the message lands. The cursor lives in the same space as the interface, so it grows with the zoom.
- **Scroll like the app.** New messages push the conversation up; the reply box docks at the bottom after the first send. Keep the box and the content close together, or the camera has to choose between them.
- **A badge can grow into the app.** The clicked badge's rounded rectangle animates to fill the frame in the app's background colour, with the app's mark spinning in the centre, then the app fades in. Keep the plain moment between them under 0.2 s.
- **Swap windows with a slide and a pull back.** The camera pulls back to a wide shot, the new window slides in over the old one, then the camera pushes into the new window. Blur the slide horizontally only (an SVG `feGaussianBlur` with a horizontal deviation), never the whole frame.
- **Blur camera moves lightly.** A blur that follows the zoom and pan speed, capped at 6 px. At 10 px the swap was a smear.

## Headlines

- **In landscape, a long headline runs on two wide lines.** Reviewers rejected a ten-word headline stacked on four lines. Fit the longer line to about 1640 px of a 1920 frame once the font has loaded, and size inline marks with the type.
- **Clear the space before the next element lands.** When a headline lifts to make room, start the lift early enough that it has cleared the area before the next element pops in. A pill once landed on the headline until the lift started half a second earlier.

## Loops and reactions

- **Ambient loops run at constant speed.** An edge light, a turning ring, a slow scroll. No easing, no pauses.
- **Audio-reactive motion follows the band, not the whole track.** Bass sits in the low bands. Scale bands logarithmically or bass swamps everything. Pass one frame's levels down to every child, or bars jump.
- **A bounce on the kick** is a pop that starts on each kick time and decays over the beat.

## Rings of logos around a message

Rings of connector logos can turn behind the end card, to show that Gorgias works alongside other tools. The rings stay secondary to the message.

- **Several concentric rings grow outward,** inner ring first, then keep turning at a constant speed. The outer rings run off the edges of the frame.
- **Keep the logos quiet.** One colour (white on ink), dimmer on each ring further out. Shrink the headline to make room, for example from 140 to 108 px.
- **Turn every ring the same way, each slower than the one inside it.** A middle ring turning the other way made wide wordmarks collide with the inner ring's in every layout tried.
- **Each ring holds each logo once,** square marks and wordmarks alternating, so the same logo rarely shows twice at once.
- **Search for a layout with no collisions, checking every frame.** Wide wordmarks on neighbouring rings touch at some point of the turn even when the first frame looks clean. A search script swaps the logo order on each ring and nudges each ring's start angle. For every frame it measures touching logos, logos over the text and logos shown twice, and keeps the layout with the least. Fourteen logos on three rings 140 px apart can turn with none touching.

## Transitions between scenes

- **Hard cuts on the downbeat are the default.** The beat sheet places them.
- **A transition overlaps two scenes** and shortens the total. An overlay such as a white flash sits on the cut and does not. Prefer overlays: they keep the beat sheet's arithmetic.
- **A flash reveals during its first half and retracts during the second.** Ten frames at 30 fps, brightest on the cut itself.
- **A freeze before a turn:** hold the last frame of the previous scene, drain its colour, then cut. The freeze frame must match the previous scene's last frame within one colour level. Check it with a pixel diff.

## Pitfalls

- A CSS animation or a timer runs on the clock, not on the frame. The capture pipeline photographs it mid-move or not at all. Every tool file says how to drive from the frame number.
- Random values without a seed differ between frames and between runs. Seed everything.
- A blur on a large layer is slow. Blur the element, not its container.
- Moving the live 3D scene makes edges shimmer. Move a plate.
- Sub-frame motion blur: capture at 8 times the frame rate and average 8 frames into one. Shutter angle 180°. Use it on fast travel only; it multiplies render time by eight.
