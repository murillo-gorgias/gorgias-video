# Sound

Music, interface sounds, mixing, mastering and how to check all of it without listening. The beat grid from `brief-to-beats.md` drives everything here.

**Start every new score from `examples/starter/score.ts`.** Every build there hangs off the timing file, so a retime moves the music with the picture. The starter's `STORYBOARD.md` explains each section.

## The rule that holds everything together

**A time that a sound depends on lives in one place only: the timing file.** The animation reads it. The score reads it. When a moment moves, change it there and rebuild the sound. Nothing else may hold a copy of these numbers.

## Where the music comes from

**Code-made by default.** Use a licensed or AI-made track only when the person asking for the video wants one. Score with `synth/studio.ts` and `synth/modern.ts`. `synth/instruments.ts` stays only so old scores still run. Reviewers called its plain supersaw chords and drums "cheap".

**A brief that works for product and launch videos:** "Modern minimalist electronic instrumental, warm analog synth plucks, soft driving bassline, crisp lo-fi hip-hop drum groove. Upbeat, optimistic, and unobtrusive tech startup aesthetic. Clean mix, ambient corporate future bass." Reviewers also asked for builds before each key moment on screen. They said a narrow, thin track sounds cheap.

## What makes a score sound professional

**Enough parts, each with one job.** A score with about eight parts sounded thin. Fourteen parts, one or two per job, passed review:

| Job | Parts |
|---|---|
| Groove | lo-fi kick, lo-fi snare (big on drops), soft hats, rim, shaker |
| Weight | a pure sub, mono, plus a driving mid bass an octave up so phones hear it |
| Harmony | wide future-bass chords with a pitch scoop, a warm pad, soft electric piano |
| Motion | analog plucks in an arpeggio, through a dotted-8th echo |
| Identity | vocal-like chops on the drops |
| Air | vinyl texture under everything |
| Moments | risers, reversed crashes, impacts, sub drops, downlifters |

**Sections with real contrast.** Each scene change starts a new section. A score that passed review ran a quiet intro, then a swung lo-fi groove under the first interface. A half-time future-bass drop on a new chord came next, then a long build, a closing drop and a last chord ringing out. Change at least two of rhythm, bass pattern and harmony between sections.

**Builds before key moments.** List the moments on screen that matter, then give each one a build that ends exactly on it.

- **A big build** into a scene change (8 to 16 beats): a riser, a snare roll that speeds up from 8ths to 16ths to 32nds, and a reversed crash ending on the downbeat. The whole music bus thins from the bottom up with a high-pass sweep (`modern.ts` `sweep`). The kick drops out for the last half bar.
- **A small lift** into a click, a send or a card (half a beat to a beat): a three- or four-step snare fill and a short reversed crash.
- **The drop** on the moment: a crash, an impact, a sub drop and a downlifter. Keep that stack light (impact 0.32, sub drop 0.28 of full scale), or the limiter flattens everything around it.

**Stop dead once, at most.** A quarter-beat cut before the turn works. The gap must be silent in every stem, reverb tails included. Call `silence()` on the music bus, the interface bus and the premix.

**End on a resolution.** One last chord on the home key, fading to nothing by the final frame. Keep any note on top of it low and dark. A bright high note ringing over the last chord sounds like a mallet.

**Write the arrangement in plain arrays.** Chords per bar, drum patterns as 16-step lists, levels in one `MIX` table. A designer can read a list of times and change one. Swing the 16ths for a hip-hop feel, with every second 16th 20 ms late. Keep downbeats straight.

## Interface sounds

| Event | Sound | In code |
|---|---|---|
| Moves and transitions | A soft digital swoosh, a low air sweep | `modern.ts` `airSwoosh` |
| Reveals: messages, chips, cards, badges | A soft synth swell, an octave below the chord tone | `modern.ts` `softSwell` |
| Typing | Crisp mechanical keyboard clicks, muted top end | `modern.ts` `mechKey` |
| Clicks | A muted trackpad click | `modern.ts` `mechClick` |
| Checks and "connected" moments | The same soft swell, quieter | `modern.ts` `softSwell` |
| Something settling into place | A muted thud | `studio.ts` `softLock` |

**Reveals blend into the music, never stand out from it.** Reviewers rejected a marimba as too loud and pointy, then a soft pluck as still too distinctive. `softSwell` is the music's own synth fading in over 30 ms and dying away within a second, so it sounds like part of the track. Pitch each reveal on a note of the chord underneath, from middle C up one octave (MIDI 60 to 72). `softPluck` and the marimba stay in `modern.ts` for old scores only.

**Checks are calm.** A bright two-note bell on every check read as too loud and too distinctive, and a pure tone with its octave read as a mallet. Use the soft swell, a little quieter than the reveals, sitting a little under the music.

**Typing sounds follow a typist's pace, not the animation's.** Letters typed at 28 a second with a sound each read as "a machine gun". Play the sound on a subset of keystrokes, with an uneven gap of 0.09 to 0.16 s. Always sound a space and the last key. That gives about 7 sounds a second while the letters keep their speed.

**One effect per on-screen event,** tuned to the key of the music where it has a pitch. Pan it toward where the event is on screen.

**Levels that read**, measured with `scripts/sfx-prominence.py`:

| Kind | Peak over the music around it |
|---|---|
| Checks, connections | −6 to −2 dB, barely noticeable |
| Clicks, sends | +4 to +8 dB |
| Reveals (soft swells) | −6 to −2 dB, barely noticeable |
| Typing | +2 to +4 dB median |

**The reference for interface sounds is the starter video** (`examples/starter/score.ts`): its swells, their levels and how they sit under the music passed review. Match new videos to it. Reveals and checks should be felt more than heard. Reviewers asked twice for them quieter: first at +2 to +5 dB, then again until they were barely noticeable. Measure a swell about 60 ms after it starts, at its fullest point; measured at its start it reads far too quiet.

**Duck the music under the interface stem.** A sidechain compressor on the music, keyed by the interface stem, dips it a couple of dB on each event. Settings: threshold −24, ratio 2.5, 2 ms attack, 120 ms release. Re-balance the interface stem whenever the music changes. Levels tuned against a loud score stood out 5 to 20 dB too much over a quieter one.

**Re-level the interface sounds after a retime.** A retime moves each sound into louder or quieter music. The same sound then stands out by a different amount. Run `sfx-prominence.py` at the old and the new times, and bring back any sound that moved more than about half a dB. One 40 s to 30 s cut moved five sounds by 2 to 5.5 dB each. Mark each change in the score with a comment that says why.

**Recheck the drops after a retime too.** A shorter build can come out louder than the long one it replaced, which weakens the drop after it. Make short builds end lower, until every drop again lands at least 1 dB over its build.

## Mixing

- **Low end mono, width above it.** `monoBass(music, 140)` keeps everything below 140 Hz in the middle. Width comes from the chords (`width` 1.7), pads (Haas 11 ms, `width` 1.6), plucks (`width` 1.6) and the reverbs. Judge width per band with `audio-check.py width`. An overall correlation looks mono whenever the sub is heavy.
- **Pump the tonal parts with the kick.** Depths: sub 0.7, mid bass 0.5, future-bass chords 0.85 (keyed by kicks and the big snares), pad 0.45, reverb 0.35.
- **One hall for the tonal parts,** pumped and widened, plus a short room for the snare and another for the interface stem.
- **Match a reference's tonal balance.** Ask for a reference track, then run `audio-check.py balance` against it. A common first-pass fault is a dark mix short of body around 200 Hz. A shelf on the top and a peak at 210 Hz fix it.

## Mastering and loudness

**Master inside the score, not in `mix-audio.py`.** Its one-pass loudnorm falls back to a dynamic mode on a mix with high peaks, and pumps. The score writes `mix.wav` already mastered, and `assemble.sh` takes it as is.

**The chain, in order:**

1. **Glue the music bus.** A compressor first (threshold −20, ratio 2.5, 15 ms attack, 180 ms release, +3 dB makeup). Then a soft clipper (`scale` ×2, `saturate` 1.25, `scale` ×0.5). Pop masters keep peaks 8 to 9 dB over their average. A score with peaks 15 dB over average lost all contrast at the limiter until the glue went in.
2. **Then the section levels,** as an `automation` curve. Each drop plays at full level or slightly over. Each section settles 2 to 3 dB below it, and each build sits under the drop it leads to. This step comes after the glue, so the contrast survives.
3. **Premix** the music and interface stems with the ducking above, a gentle compressor, and the stop's silence.
4. **Limit** with `studio.ts` `limit`, which catches peaks between samples. Search the drive with the BS.1770 meter (`lufs`) until the mix lands on target.

**Targets:**

- **−12.4 LUFS integrated** for a mix with a strong kick and sub. Pushing to −12 forced 8 to 11 dB of limiting; −12.4 needed 6 to 7. Lighter music can go to −12.
- **A −4.7 dB sample ceiling.** The AAC encode adds between 0.5 and 2.7 dB of peak, depending on the material. At −4.7 the finished MP4 comes out between −3.3 and −2.6 dBTP.
- **Always measure the MP4** with `loudness.sh`, never only the WAV.
- **Mono fold:** folded to mono, the loudness should drop about 3 dB (the channel sum) and no more.

## Checking without listening

Claude cannot hear. Measure every change before calling the sound done, then ask a person to listen.

- `audio-check.py balance <mix> <reference>`: tonal balance per band against a reference.
- `audio-check.py bars <mix>`: loudness per bar. Builds should rise; drops should jump.
- `audio-check.py drops <mix> --at 6,22,34`: each drop against the second before it. At least +1 dB.
- `audio-check.py gap <mix> --from 21.75 --to 22`: the stop is silent.
- `audio-check.py width <mix>`: mono low end, wide top.
- `sfx-prominence.py <music> <ui> --gain <MIX.ui> --at ... --typing ...`: interface sounds against the music.
- `loudness.sh` on the MP4, and a mono fold.
- `ffmpeg -i master.mp4 -filter_complex showwavespic=s=1600x240 -frames:v 1 wave.png` to see the sections at a glance.

## Audio-reactive visuals

Some visuals follow the music: a badge that glows on the kick, an equalizer. The picture reads levels from the music stem per frame. `synth/analysis.ts` writes them to `levels.json`.

- **Measure bands logarithmically.** Bass dominates a linear spectrum.
- **Compute the levels once per frame and pass them down** to every element that uses them.
- **Smooth over three to five frames** so bars do not flicker.

## AI or licensed tracks

Only when the person asking for the video wants one. An AI track lands on the asked tempo but picks its own bar start. Run `beat-finder.py` and cut on a found downbeat. The builds, stop and drops then need cutting by hand, while the interface stem stays code-made.

## Joining picture and sound

`assemble.sh out/frames 30 out/mix.wav out/master.mp4`. Keep the captured frames. A sound-only change then needs only the score and `assemble.sh`, with no new capture.
