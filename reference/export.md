# Export

Ask where the video will run, then read the format off the channel table. Then make the master, the light copy, and any channel-specific copy.

## The channel table

| Channel | Size | Ratio | Frame rate | File | Length | Notes |
|---|---|---|---|---|---|---|
| Instagram and Facebook feed | 1080 × 1350 | 4:5 | 30 | MP4 H.264 | 3–60 s | The usual social size. Frame 0 is the cover. |
| Instagram Reels, Stories, TikTok | 1080 × 1920 | 9:16 | 30 | MP4 H.264 | 5–60 s | Interface bars top and bottom. Keep 250 px clear at each end. Needs its own layout pass. |
| LinkedIn feed | 1080 × 1350 or 1920 × 1080 | 4:5 or 16:9 | 30 | MP4 H.264 | 10–90 s | Plays muted by default. Captions or on-screen words carry the message. |
| X (Twitter) | 1920 × 1080 or 1080 × 1080 | 16:9 or 1:1 | 30 | MP4 H.264 | under 140 s | Plays muted. |
| YouTube | 1920 × 1080 or 3840 × 2160 | 16:9 | 24 or 30 | MP4 H.264, high bitrate | any | Upload the master. YouTube re-encodes. |
| Website hero or landing page | 1920 × 1080 or the section's size | 16:9 or custom | 30 | MP4 H.264 plus WebM VP9 | under 20 s | Muted autoplay, loops. Keep the file under 5 MB. |
| Email header | 1200 × 400 or 600 × 200 at 2× | 3:1 | 12–20 | GIF, under 1 MB | 3–6 s, loops | Most email apps show only the first frame. Make it a finished picture. Few colours, flat fields. A 4.8 s header at 1200 × 400 and 20 fps came to 0.66 MB. |
| LinkedIn GIF | built at 1080 × 1350, exported at 720 × 900 | 4:5 | 25 | GIF, plus a silent MP4 at full size | about 8 s, loops | Reviewers found 12 fps choppy. An 8.8 s GIF came to 4.3 MB. |
| Slack or Notion | 1080 × 1080 or 1920 × 1080 | 1:1 or 16:9 | 30 | MP4 H.264 or GIF | short | A light copy. |
| Presentation (Google Slides, Keynote) | 1920 × 1080 | 16:9 | 30 | MP4 H.264 | any | Slides loops a video if asked. Keep the file small. |

Add a row when a new channel comes up. If the channel is unknown, make the 4:5 master and ask.

Formats are flexible. The skill assumes no aspect ratio. A video built for one format needs a layout pass for another, not a crop. Check every text frame again after the pass.

## The master

The master is the full-quality file the light copies come from. Keep it.

```
scripts/assemble.sh frames/ 30 mix.wav master.mp4
```

This joins the captured frames at the frame rate, encodes H.264 at CRF 16 with the `slow` preset, pixel format `yuv420p` so every player opens it, and the audio as AAC at 192 kbps. Then `frame-check.py master.mp4` and `loudness.sh master.mp4`.

**The AAC encode adds 0.5 to 2.7 dB of true peak**, depending on the material. Master the WAV with a −4.7 dB sample ceiling on a true-peak limiter (`sound.md`), then measure the MP4. It lands between −3.3 and −2.6 dBTP that way.

**A flat-interface video is small.** A 40 s master at 1920 × 1080 with no grain came out at 9 MB, small enough to deliver without a light copy.

A 25 s master at 1080 × 1350 with film grain comes out at about 240 MB. The grain is most of it. The light copy of the same video is 28 MB.

## The light copy

For sharing, reviewing and most channels.

```
scripts/light-export.sh master.mp4 light.mp4            # compress by quality
scripts/light-export.sh master.mp4 light.mp4 --grain    # smooth the grain first
```

- **Compress by quality, never by a size cap.** CRF 22 with the `slow` preset and `-tune animation`. A fixed size cap smeared flat backgrounds.
- **Smooth the grain first if the video has any.** `hqdn3d=4:3:8:6`. One grainy 25 s master went from 181 MB to 27 MB with no visible loss.
- **Compare with the original** with `side-by-side.sh` before sharing.

## A GIF

For email headers, LinkedIn and chat. GIFs are big and have 256 colours, so keep them short, small and flat.

**Design the GIF as its own piece, not a cut of the video.** Reuse the video's parts on a new page:

- **A GIF has no sound,** so the words on screen carry the whole message. The LinkedIn GIF shrinks the headline into a header that stays on screen while the rest plays.
- **Shrink the interface to fit.** Full app windows became compact chat cards, so every line reads at GIF size.
- **Cut the copy, never rewrite it.** List each cut in the storyboard for sign-off.
- **The last frame matches frame 0,** so the loop has no visible jump. Check it with `frame-check.py --diff`.
- **For email, frame 0 is the whole header.** Outlook shows only the first frame.

**Capture the frames at the GIF's frame rate,** then make the GIF straight from the frames folder:

```
node scripts/capture.js email.html out/email-frames
scripts/gif-export.sh out/email-frames email-header.gif 1200 20
scripts/gif-export.sh master.mp4 chat.gif 600 12 --from 2 --to 6
```

The script scales, builds one palette from the whole clip with no dithering, loops, then runs gifsicle's light lossy pass (`-O3 --lossy=30`). Ordered dithering gave the same look at a bigger file. Check the size: email wants under 1 MB. Cut the length or the width before cutting the frame rate below 10.

## A transparent video

For a logo animation over someone else's footage, or a web element.

- Capture the frames with a transparent background (`capture.js --transparent`). The page's body must have no background colour.
- For an editor: `ffmpeg -framerate 30 -i frames/f%05d.png -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le out.mov`
- For a browser: `ffmpeg -framerate 30 -i frames/f%05d.png -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 30 out.webm`

## Naming and handing over

Name files by what they are: `spring-launch-social-4x5-master.mp4`, `spring-launch-social-4x5-light.mp4`, `spring-launch-email-header.gif`. Hand over the light copy and say where the master is. List the placeholder copy that still needs sign-off.
