/**
 * Music levels per frame, for visuals that react to the track.
 *
 * `levelsPerFrame(bus, fps, frames)` returns one entry per frame: bass, mid and high
 * (each 0..1) and twelve log-spaced bands from low to high. The arrangement writes it to
 * `levels.json`, and the page reads it with a hold. Every element then sees the same
 * moment of the track, and nothing on the page has to decode audio.
 *
 * The window is 512 samples around the frame's time, so each bin is about 86 Hz at
 * 44.1 kHz. Levels are in decibels mapped to 0..1 and smoothed over three frames.
 */
import {SR, type Stereo} from './dsp.ts';

const WINDOW = 512;
const BINS = WINDOW / 2;
const BAND_COUNT = 12;
const MIN_DB = -58;
const MAX_DB = -14;

export type Levels = {
  readonly bass: number;
  readonly mid: number;
  readonly high: number;
  readonly bands: readonly number[];
};

/** In-place radix-2 FFT on interleaved real and imaginary arrays. */
const fft = (re: Float64Array, im: Float64Array): void => {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
};

const HANN = Float64Array.from({length: WINDOW}, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (WINDOW - 1)));

const spectrumAt = (bus: Stereo, seconds: number): Float64Array => {
  const centre = Math.round(seconds * SR);
  const re = new Float64Array(WINDOW);
  const im = new Float64Array(WINDOW);
  for (let i = 0; i < WINDOW; i++) {
    const j = centre - WINDOW / 2 + i;
    const s = j >= 0 && j < bus.L.length ? (bus.L[j] + bus.R[j]) * 0.5 : 0;
    re[i] = s * HANN[i];
  }
  fft(re, im);
  const out = new Float64Array(BINS);
  for (let k = 0; k < BINS; k++) {
    const mag = (2 * Math.hypot(re[k], im[k])) / WINDOW;
    const db = 20 * Math.log10(Math.max(mag, 1e-9));
    out[k] = Math.min(1, Math.max(0, (db - MIN_DB) / (MAX_DB - MIN_DB)));
  }
  return out;
};

const average = (values: ArrayLike<number>, from: number, to: number): number => {
  let sum = 0;
  const end = Math.min(values.length, to);
  for (let i = from; i < end; i++) sum += values[i];
  return end > from ? sum / (end - from) : 0;
};

const BAND_EDGES = Array.from({length: BAND_COUNT + 1}, (_, k) => Math.min(BINS, Math.round(Math.pow(BINS, k / BAND_COUNT))));

const levelsOf = (spectrum: Float64Array): Levels => ({
  bass: average(spectrum, 0, 3),
  mid: average(spectrum, 6, 40),
  high: average(spectrum, 60, 200),
  bands: BAND_EDGES.slice(0, -1).map((from, k) => average(spectrum, from, Math.max(from + 1, BAND_EDGES[k + 1]))),
});

const blend = (a: Levels, b: Levels, c: Levels): Levels => ({
  bass: (a.bass + b.bass + c.bass) / 3,
  mid: (a.mid + b.mid + c.mid) / 3,
  high: (a.high + b.high + c.high) / 3,
  bands: a.bands.map((v, k) => (v + b.bands[k] + c.bands[k]) / 3),
});

const round = (l: Levels): Levels => ({
  bass: Number(l.bass.toFixed(3)),
  mid: Number(l.mid.toFixed(3)),
  high: Number(l.high.toFixed(3)),
  bands: l.bands.map((v) => Number(v.toFixed(3))),
});

/** One Levels entry per frame, smoothed over the neighbouring frames. */
export const levelsPerFrame = (bus: Stereo, fps: number, frames: number): Levels[] => {
  const raw = Array.from({length: frames}, (_, f) => levelsOf(spectrumAt(bus, f / fps)));
  return raw.map((l, f) => round(blend(raw[Math.max(0, f - 1)], l, raw[Math.min(frames - 1, f + 1)])));
};
