# Brand

**The `brand:core` skill is the brand.** Load it before building anything. This file adds only what video needs on top: readable sizes, safe areas, the cover frame, motion assets, and the look every video shares.

Never copy colours, fonts or logo rules into a video project from memory. Read them from `brand:core` each time, so brand updates reach the videos without editing this skill.

## What to take from `brand:core`

- **Canvas:** warm paper, never white. Ink text, never black.
- **Type:** Feature Deck for titles, always regular weight, sentence case, at most one italic span. Inter for everything else. Red Hat Mono caps for tags and labels, with the coral asterisk or dot.
- **Colour:** paper is the resting state. Coral is the one accent. The pastel pairs appear as fields and cards. Stats are ink, not coral.
- **No gradients**, unless `brand:core` lists the exception.
- **Logo:** the real wordmark asset, never typed. Paper and tint fields take the black logo. The ink field takes the white one. Never a wordmark on the opening moment. The logo belongs on the close.

## Video-only rules

**Readable sizes.** On a 1080 px wide frame:

| Element | Minimum |
|---|---|
| Headline | 84 px |
| Supporting text | 44 px |
| Chat message in a phone mock-up | 26 px, and the phone at least 820 px wide |
| Mono tag | 22 px |

Scale with the frame width. A 1920 px landscape frame scales by 1.78. Small text inside a phone is the usual failure: at a 560 px phone the messages were 22 px and unreadable on a real phone.

**Safe areas.** Keep key text at least 80 px from the sides and 100 px from the top and bottom on a 1080 px frame. Portrait formats for Stories and Reels have an interface bar at the top and the bottom. Keep 250 px clear at each end there.

**Frame 0 is the cover.** Social platforms show the first frame as the cover image. It must be a finished picture: the headline readable, the key element in place. Never a blank paper frame, never half an entrance.

**The last frame is a poster too.** Hold the close with the logo, the tag and the call to action fully settled.

**Fewer colour moments than a deck.** A 25 s video needs one or two: the drop, the close. The rest is paper.

**Film grain, if used, is specks.** Dark and light specks drawn on top, about 5% strength. A blend-mode noise is invisible on near-white paper. Grain changes every frame and costs most of the file size. `export.md` says how to smooth it for a light copy.

**Landscape headlines run wide.** In 16:9, set a long headline on two wide lines. Reviewers rejected a narrow stack of four lines.

**Other companies' apps.** When the video recreates another product, such as an AI assistant Gorgias connects to:

- Build it close to the real app: its layout, type, colours and real marks. Viewers recognise it at a glance.
- Take the marks from Simple Icons (CC0), pinned to a version, and inline their paths so they can be recoloured.
- Check every mark exists in the pinned version before designing around it. Simple Icons drops brands over time. Slack is gone from recent versions, and 13.21.0 is the last that has it, so pin 13.21.0. Customer.io is in no version; take its logo from the header of its own website.
- Keep the app's colours inside its window. Gorgias paper, ink and Feature Deck frame the video around it.
- Invent nothing that reads as real customer data. List every placeholder (model names, sidebar names, chat titles, designed cards) in the storyboard, so a reviewer can sign them off.

## The look every video shares

Motion and animation rules in `motion.md` are brand-wide. Use them on every Gorgias video. So are these:

- Warm paper and pastels, never big coral fields.
- Feature Deck titles in one dark colour, or paper on ink. Never italic throughout, never two-coloured mid-sentence.
- Tags in Red Hat Mono caps with a coral dot.
- Channel colours appear only for the channels themselves: their icons and their card tints.
- Frosted cards: paper at 90 to 94% with a faint line, 22 px corners.

## Assets

Fonts, logos and brand marks come from the brand kit that `brand:core` describes. A video page asks for them at the kit's own address, `/brand/`, exactly as `brand:core` writes it: `/brand/2026/fonts/InterVariable.woff2`, `/brand/primary-logo-white.svg`. Never copy brand kit files into a video project. The capture and the preview serve `/brand/` from the brand kit folder on the computer (`SETUP.md` step 3), so the render never fetches anything from the web. `examples/starter/README.md` lists the five files the starter uses.

A video's own pictures, such as screenshots and channel icons, go in the project's `assets/` folder. Only brand kit files come from `/brand/`.

The capture stops and names the file when the page asks for a brand file the kit does not have. A font that is in the kit but never declared in `@font-face` still falls back to a system font, so check frame 0 at full size before trusting the fonts.

The fonts are Feature Deck (`FeatureDeck-Regular-Web.woff2`), Inter Variable and Red Hat Mono Variable. Load only the weights used.
