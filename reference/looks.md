# Looks: effects, transitions and annotations

A menu. Each entry names a look and how to get it with open-source tools: a CSS filter inside the page, an ffmpeg filter on the rendered frames, or a small library. Pick from here; do not invent a new look mid-build.

Most Gorgias videos need almost none of this. The brand's depth comes from paper against white, hairlines and warm borders. Reach for an effect when the beat sheet calls for a moment: a freeze, a flash, a drop.

## On brand

| Look | What it is | How |
|---|---|---|
| Film grain | Dark and light specks, about 5%, changing every frame. | In the page: a canvas of seeded noise drawn per frame. In ffmpeg: `noise=alls=12:allf=t`. Must be specks on top, not a blend mode; blend-mode noise vanishes on paper. |
| Frosted card | Paper at 90 to 94% with a faint line and a backdrop blur. | CSS `backdrop-filter: blur(18px)` on a translucent paper fill. The blur only works when something sits behind the card. |
| Glass phone | White at 50%, a 2 px white border, 32 px corners. | CSS fill and border. No gradient. |
| Edge light | A bright line that turns around a shape at constant speed. | A conic gradient mask rotated by the frame, linear, no easing. The glass flower's light is the model. Allowed because it is a mask, not a fill. |
| Vignette | Darkened corners for a dark close. | CSS `radial-gradient` at low opacity over the ink field, or ffmpeg `vignette`. |
| Desaturate for a freeze | The frame drains of colour. | CSS `filter: saturate(0.2) contrast(1.05)` eased over 0.3 s. |
| White flash | An overlay on a cut, brightest on the cut. | A white layer, opacity 0 to 1 to 0 over 10 frames. |
| Camera flash | A quick white hit with a short afterglow. | White overlay, opacity 1 on the frame, decaying over 6 frames with `out`. |
| Light blur entrance | The house entrance. | CSS `filter: blur(8px)` to 0 with opacity 0 to 1. |

## Transitions

Hard cuts on the beat are the default. Use these when the beat sheet asks for one.

| Transition | Picture tool | ffmpeg between two rendered clips |
|---|---|---|
| Fade | Opacity on the incoming scene. | `xfade=transition=fade:duration=0.5:offset=<cut>` |
| Slide | Translate the incoming scene from an edge with `glide`. | `xfade=transition=slideleft` and the other three directions |
| Wipe | A clip-path that grows across. | `xfade=transition=wipeleft` and the rest |
| Flip | Rotate on Y with perspective, swap content at 90°. | None. Build it in the page. |
| Clock wipe | A conic clip-path. | `xfade=transition=radial` |
| Iris | A circle clip-path that opens. | `xfade=transition=circleopen` |

`xfade` has about fifty transitions. Run `ffmpeg -h filter=xfade` for the list. A transition overlaps two scenes and shortens the total by its length. An overlay such as the white flash sits on the cut and does not. Prefer overlays: they keep the beat sheet's arithmetic.

## Annotations

Hand-drawn marks on text: highlight, circle, underline, strike-through, box, bracket. The open-source library rough-notation draws them in any web page. It animates on its own clock, so for the capture pipeline, set its duration to 0 and reveal it with a clip-path driven by the frame, or redraw it per frame with a progress value.

Use annotations sparingly. One per video, on the one word that matters.

## Colour and tone

| Look | ffmpeg | CSS |
|---|---|---|
| Duotone | `colorchannelmixer` after `hue=s=0`, or a `lut3d` | `filter: grayscale(1)` under a tinted multiply layer |
| Levels and curves | `curves=preset=...` or `eq=brightness:contrast:saturation` | `filter: contrast() brightness() saturate()` |
| Tint | `colorbalance` or `colorize` | A translucent colour layer in `mix-blend-mode: multiply` |
| Chromatic aberration | `chromashift=cbh=4:crh=-4` | Three copies, red and blue offset by 2 px, `mix-blend-mode: screen` on an ink base only |
| Pixelate | `scale=iw/16:-1:flags=neighbor,scale=iw*16:-1:flags=neighbor` | `image-rendering: pixelated` on a downscaled canvas |
| Halftone | None built in. | A radial-gradient dot pattern with a size map. Not on brand; skip. |

Avoid duotone, halftone, scanlines and chromatic aberration on paper. They belong to other brands.

## Motion blur

Capture at eight times the frame rate and average eight frames into one. In the capture pipeline, render with `--supersample 8`, then `tmix=frames=8` in ffmpeg. Shutter angle 180° means the eight samples span half a frame. Render time multiplies by eight, so use it only on a short travelling shot.

## Animated images and emoji

- **A looping GIF or image sequence** inside a video restarts on a given frame and loops, pauses on its last frame, or clears after it finishes. Decide which per asset.
- **Flat emoji** come as SVGs. Inline them so the page needs no fetch.

## Transparent exports

For an editor: ProRes 4444, `-c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le`. For a browser: VP9 WebM, `-c:v libvpx-vp9 -pix_fmt yuva420p`. Both need the frames captured with a transparent background. `export.md` has the commands.
