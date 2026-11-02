# The synthesiser

A dependency-free music and sound-effect generator in TypeScript. Node runs it directly. A video's `score.ts` imports these files and the video's own timing file, and writes WAV files.

| File | What it holds | Use |
|---|---|---|
| `studio.ts` | The mix chain (filters, EQ, compressor with a sidechain key, look-ahead true-peak limiter, BS.1770 loudness meter, FDN reverb, chorus, echo, width, saturation, gain curves, silence) and the core instruments and interface sounds, including the calm check tone and dock thud. | Always. |
| `modern.ts` | The modern palette: analog plucks, future-bass chords with a pitch scoop, a warm pad, sub and mid bass, vocal-like chops, lo-fi drums, vinyl, sub drops, downlifters, filter sweeps over a bus, mono low end, a Haas widener, air swooshes, the soft swell for reveals and checks, mechanical keys and clicks. The soft pluck and the glassy marimba stay for old scores only. | The default for product and launch videos. |
| `dsp.ts` | Stereo buffers, the saw oscillator, the WAV writer. | Imported by the two above. |
| `analysis.ts` | Levels per frame for audio-reactive visuals (`levels.json`). | When the picture follows the music. |
| `instruments.ts` | The first instruments, which reviewers judged cheap. | Old scores only. |

## Write a score

Start from `examples/starter/score.ts`. Every build there hangs off the timing file. Its shape:

1. **Harmony and patterns as plain arrays:** voicings per chord, one chord list per bar, drum patterns as 16-step lists, one `MIX` table of levels.
2. **One bus per part:** kicks, snares, hats, percussion, sub, mid bass, chords, pad, plucks, keys, chops, texture, effects, interface.
3. **Players per section,** called bar by bar: a lo-fi groove under one scene, a half-time drop under the next.
4. **Builds and drops** placed at the times in the timing file.
5. **The interface stem** from the same timing file.
6. **The mix and the master:** EQ, pumps, width, one hall; glue and a soft clip on the music bus; section levels; the stop's silence; the premix with ducking; a limiter driven to the loudness target.

```ts
import * as S from '<skill>/scripts/synth/studio.ts';
import * as V from '<skill>/scripts/synth/modern.ts';
import {BAR, BEAT, SCENES, TOTAL_SECONDS} from './timeline.js';

const STEP = BEAT / 4;
const at = (bar: number, step = 0) => (bar - 1) * BAR + step * STEP + (step % 2 ? 0.02 : 0); // swung 16ths
const kicks = S.stereo(TOTAL_SECONDS);
const chords = S.stereo(TOTAL_SECONDS);
const kickTimes: number[] = [];
for (const s of [0, 7, 10]) { S.place(kicks, V.lofiKick(5), at(4, s)); kickTimes.push(at(4, s)); }
S.placeStereo(chords, V.superChord([50, 57, 60, 64, 65, 69], 2.6 * STEP), at(12, 0));
S.multiply(chords, S.pump(chords.L.length, kickTimes, 0.85, 0.22));
```

Run with `node --experimental-strip-types score.ts`. Node 22.6 or newer strips the types; imports need `.ts` extensions. A 40 s score renders in about 5 seconds.

`sound.md` has the craft: how many parts, builds before key moments, interface levels, the mastering chain and the checks.

## Pitfalls

- A class with constructor parameter properties (`constructor(private x)`) crashes Node's type stripping. These files avoid them.
- Re-export only values from a module, never `type` names; Node's type stripping drops type-only imports, so import types where they are used.
- Calling `mtof` per voice per sample is slow on seven-voice chords. Precompute each voice's frequency and multiply by the bend.
- `writeWav` writes 16-bit PCM stereo at 44.1 kHz.
