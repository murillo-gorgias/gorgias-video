/**
 * Modern: the palette that took the scores up a level, on top of studio.ts. Use it by
 * default for product and launch videos.
 *
 * The brief it answers: "modern minimalist electronic instrumental, warm analog
 * synth plucks, soft driving bassline, crisp lo-fi hip-hop drum groove, ambient corporate
 * future bass", with more depth, more weight and builds before key moments. For the
 * interface: soft low air swooshes, a glassy marimba for reveals, muted mechanical keys.
 * Reveals now play softPluck instead of the marimba.
 *
 *   synths:     analogPluck, superChord (future-bass, pitch scoop), warmPad, sub, midBass,
 *               vocalChop (formant "ah"/"oh")
 *   drums:      lofiKick, lofiSnare, softHat, vinyl
 *   builds:     downlifter, subDrop, sweep (a filter sweep over a bus)
 *   bus tools:  monoBass (low end mono), haas (widener for pads and chords)
 *   interface:  airSwoosh, softPluck (reveals), marimba (old scores), mechKey, mechClick
 */
import {buf, Filter, makeRng, mtof, SR, stereo, type Stereo} from './studio.ts';
import {SawOsc} from './dsp.ts';

const TAU = Math.PI * 2;

const panGains = (pan: number): [number, number] => {
  const a = ((pan + 1) / 4) * Math.PI;
  return [Math.cos(a), Math.sin(a)];
};

/* ───────────────────────── Synths ───────────────────────── */

/**
 * A warm analog pluck: two detuned saws and a square an octave down, through a resonant
 * low-pass whose cutoff snaps shut. Stereo from the detune.
 */
export const analogPluck = (midi: number, vel = 0.8, {decay = 5, bright = 1, length = 0.9} = {}): Stereo => {
  const out = stereo(length);
  const f = mtof(midi);
  const a = new SawOsc(0.1);
  const b = new SawOsc(0.6);
  let sq = 0;
  const lpL = new Filter();
  const lpR = new Filter();
  for (let i = 0; i < out.L.length; i++) {
    const t = i / SR;
    if (i % 16 === 0) {
      const c = 350 + (3200 * bright + 1800 * vel) * Math.exp(-t * 22);
      lpL.lp(c, 2.2);
      lpR.lp(c * 1.04, 2.2);
    }
    sq += f / 2 / SR;
    const square = (sq % 1 < 0.5 ? 1 : -1) * 0.35;
    const sa = a.next(f * 1.004);
    const sb = b.next(f * 0.996);
    const env = Math.min(1, t / 0.002) * Math.exp(-t * decay) * vel * 0.3;
    out.L[i] = lpL.run(sa * 0.7 + sb * 0.3 + square) * env;
    out.R[i] = lpR.run(sa * 0.3 + sb * 0.7 + square) * env;
  }
  return out;
};

/**
 * A future-bass chord: seven saws per note spread across the stereo field, a low-pass, and
 * the genre's pitch scoop: each note bends up a semitone into place over the first 60 ms.
 */
export const superChord = (notes: readonly number[], dur: number, {cutoff = 8000, scoop = true, attack = 0.006, release = 0.25, seed = 3} = {}): Stereo => {
  const out = stereo(dur + release);
  const rnd = makeRng(seed);
  const DETUNE = [-0.19, -0.12, -0.05, 0, 0.05, 0.12, 0.19];
  for (const midi of notes) {
    const oscs = DETUNE.map(() => new SawOsc(rnd()));
    const freqs = DETUNE.map((d) => mtof(midi + d));
    const pans = DETUNE.map((_, k) => panGains(-0.9 + (1.8 * k) / (DETUNE.length - 1)));
    for (let i = 0; i < out.L.length; i++) {
      const t = i / SR;
      const bend = scoop && t < 0.12 ? Math.pow(2, (-1 * Math.exp(-t * 55)) / 12) : 1;
      const env = Math.min(1, t / attack) * (t > dur ? Math.max(0, 1 - (t - dur) / release) : 1);
      let l = 0;
      let r = 0;
      for (let k = 0; k < DETUNE.length; k++) {
        const x = oscs[k].next(freqs[k] * bend);
        l += x * pans[k][0];
        r += x * pans[k][1];
      }
      out.L[i] += l * env * 0.045;
      out.R[i] += r * env * 0.045;
    }
  }
  const lpL = new Filter().lp(cutoff, 0.7);
  const lpR = new Filter().lp(cutoff, 0.7);
  const hpL = new Filter().hp(180);
  const hpR = new Filter().hp(180);
  for (let i = 0; i < out.L.length; i++) {
    out.L[i] = hpL.run(lpL.run(out.L[i]));
    out.R[i] = hpR.run(lpR.run(out.R[i]));
  }
  return out;
};

/** A warm, wide analog pad: detuned saws, a dark filter, a slow swell. */
export const warmPad = (notes: readonly number[], dur: number, {attack = 0.8, release = 1.6, cutoff = 2000, seed = 21} = {}): Stereo => {
  const out = stereo(dur + release);
  const rnd = makeRng(seed);
  for (const midi of notes) {
    const f = mtof(midi);
    const voices = [-0.09, -0.03, 0.03, 0.09].map((d) => ({osc: new SawOsc(rnd()), d}));
    const lpL = new Filter();
    const lpR = new Filter();
    for (let i = 0; i < out.L.length; i++) {
      const t = i / SR;
      if (i % 32 === 0) {
        const c = cutoff * (1 + 0.3 * Math.sin(TAU * 0.11 * t + midi * 0.7));
        lpL.lp(c, 0.5);
        lpR.lp(c * 1.06, 0.5);
      }
      const env = Math.min(1, t / attack) * (t > dur ? Math.max(0, 1 - (t - dur) / release) : 1);
      const a = voices[0].osc.next(f * Math.pow(2, voices[0].d / 12));
      const b = voices[1].osc.next(f * Math.pow(2, voices[1].d / 12));
      const c = voices[2].osc.next(f * Math.pow(2, voices[2].d / 12));
      const d = voices[3].osc.next(f * Math.pow(2, voices[3].d / 12));
      out.L[i] += lpL.run(a * 0.6 + b * 0.4 + c * 0.2) * env * 0.07;
      out.R[i] += lpR.run(b * 0.2 + c * 0.4 + d * 0.6) * env * 0.07;
    }
  }
  return out;
};

/** A pure sub sine, with an optional glide from the previous note. Mono. */
export const sub = (midi: number, dur: number, {from = midi, glide = 0.06, vel = 1} = {}): Float32Array => {
  const out = buf(dur + 0.05);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const m = t < glide ? from + (midi - from) * (t / glide) : midi;
    ph += (TAU * mtof(m)) / SR;
    const env = Math.min(1, t / 0.006) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.05) : 1);
    out[i] = Math.sin(ph) * env * vel * 0.8;
  }
  return out;
};

/** A driving mid bass: a saw an octave above the sub, through a plucked low-pass. */
export const midBass = (midi: number, dur: number, vel = 0.8, open = 1): Float32Array => {
  const out = buf(dur + 0.05);
  const f = mtof(midi);
  const saw = new SawOsc(0.2);
  const saw2 = new SawOsc(0.7);
  const lp = new Filter();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    if (i % 16 === 0) lp.lp(180 + 1300 * open * Math.exp(-t * 11), 1.4);
    const env = Math.min(1, t / 0.003) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.04) : 1) * (0.75 + 0.25 * Math.exp(-t * 6));
    out[i] = Math.tanh(lp.run(saw.next(f) * 0.6 + saw2.next(f * 1.005) * 0.4) * 1.6) * env * vel * 0.55;
  }
  return out;
};

/**
 * A vocal-like chop: a pulse through three formant band-passes ("ah"), short and pitched.
 * The ear reads it as a sampled voice, which is the future-bass signature.
 */
export const vocalChop = (midi: number, vel = 0.7, length = 0.32, vowel: 'ah' | 'oh' = 'ah'): Stereo => {
  const out = stereo(length + 0.05);
  const f = mtof(midi);
  const formants = vowel === 'ah' ? [[800, 1, 6], [1150, 0.5, 7], [2900, 0.25, 9]] : [[500, 1, 6], [900, 0.6, 7], [2600, 0.18, 9]];
  const bands = formants.map(([fr, , q]) => new Filter().bp(fr, q));
  let ph = 0;
  for (let i = 0; i < out.L.length; i++) {
    const t = i / SR;
    ph += (f * (1 + 0.004 * Math.sin(TAU * 5.5 * t))) / SR;
    const pulse = (ph % 1) < 0.3 ? 1 : -0.43;
    let y = 0;
    bands.forEach((b, k) => (y += b.run(pulse) * formants[k][1]));
    const env = Math.min(1, t / 0.008) * (t > length ? Math.max(0, 1 - (t - length) / 0.05) : 1) * Math.exp(-t * 2.5);
    out.L[i] = y * env * vel * 0.9;
    out.R[i] = y * env * vel * 0.9;
  }
  return out;
};

/* ───────────────────────── Lo-fi drums ───────────────────────── */

/** A dusty kick with a long sub tail: weight without click. */
export const lofiKick = (seed = 1, {tail = 4.2, punch = 1} = {}): Float32Array => {
  const out = buf(0.75);
  const rnd = makeRng(seed);
  const knock = new Filter().bp(120, 1.1);
  const top = new Filter().bp(2400, 0.8);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (TAU * (44 + 110 * Math.exp(-t * 34) + 30 * Math.exp(-t * 8))) / SR;
    const body = Math.sin(ph) * (t < 0.002 ? t / 0.002 : Math.exp(-t * tail));
    const k = knock.run(rnd() * 2 - 1) * Math.exp(-t * 40) * 0.5 * punch;
    const c = top.run(rnd() * 2 - 1) * Math.exp(-t * 400) * 0.25 * punch;
    out[i] = Math.tanh((body + k + c) * 1.7) * 0.92;
  }
  return out;
};

/** A crisp lo-fi snare: a tuned body, a clap layer, a sandy tail. */
export const lofiSnare = (seed = 2, big = false): Float32Array => {
  const out = buf(big ? 0.7 : 0.4);
  const rnd = makeRng(seed);
  const band = new Filter().bp(big ? 1500 : 1900, 0.8);
  const sand = new Filter().hp(2500);
  const clapBand = new Filter().bp(1100, 1);
  const bursts = big ? [0, 0.008, 0.017, 0.026] : [0, 0.011];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const n = rnd() * 2 - 1;
    const body = Math.sin(TAU * (big ? 175 : 205) * t) * Math.exp(-t * 26) * 0.6 + Math.sin(TAU * 330 * t) * Math.exp(-t * 45) * 0.2;
    const crack = band.run(n) * Math.exp(-t * (big ? 22 : 32)) * 0.9;
    let ce = 0;
    for (const b of bursts) if (t >= b) ce = Math.max(ce, Math.exp(-(t - b) * 260));
    if (t > bursts[bursts.length - 1]) ce = Math.max(ce, 0.4 * Math.exp(-(t - bursts[bursts.length - 1]) * (big ? 11 : 18)));
    const clap = clapBand.run(n) * ce * (big ? 1.1 : 0.6);
    const s = sand.run(n) * Math.exp(-t * (big ? 14 : 24)) * 0.35;
    out[i] = Math.tanh((body + crack + clap + s) * 1.3);
  }
  return out;
};

/** A closed hat with the top rolled off, lo-fi style. `open` rings longer. */
export const softHat = (seed = 3, open = false): Float32Array => {
  const out = buf(open ? 0.4 : 0.07);
  const rnd = makeRng(seed);
  const band = new Filter().bp(8200, 0.9);
  const hp = new Filter().hp(5500);
  const lp = new Filter().lp(11000);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const env = (t < 0.0008 ? t / 0.0008 : 1) * Math.exp(-t * (open ? 9 : 62));
    out[i] = lp.run(hp.run(band.run(rnd() * 2 - 1))) * env * 1.3;
  }
  return out;
};

/** Vinyl texture: a low hiss and sparse soft crackles. Stereo, very quiet. */
export const vinyl = (length: number, seed = 77): Stereo => {
  const out = stereo(length);
  const rnd = makeRng(seed);
  const hissL = new Filter().bp(5000, 0.5);
  const hissR = new Filter().bp(5200, 0.5);
  for (let i = 0; i < out.L.length; i++) {
    out.L[i] = hissL.run(rnd() * 2 - 1) * 0.012;
    out.R[i] = hissR.run(rnd() * 2 - 1) * 0.012;
    if (rnd() < 0.00018) {
      const amp = 0.05 + rnd() * 0.12;
      const side = rnd() < 0.5 ? out.L : out.R;
      for (let k = 0; k < 40 && i + k < side.length; k++) side[i + k] += (rnd() * 2 - 1) * amp * Math.exp(-k / 6);
    }
  }
  return out;
};

/** A downlifter: a noise sweep that falls after a drop. */
export const downlifter = (length: number, seed = 31): Stereo => {
  const out = stereo(length);
  const rnd = makeRng(seed);
  const bL = new Filter();
  const bR = new Filter();
  for (let i = 0; i < out.L.length; i++) {
    const t = i / SR;
    const p = t / length;
    if (i % 32 === 0) {
      const c = 7000 * Math.pow(250 / 7000, p);
      bL.bp(c, 1.3);
      bR.bp(c * 1.06, 1.3);
    }
    const env = Math.pow(1 - p, 2) * Math.min(1, t / 0.01);
    out.L[i] = bL.run(rnd() * 2 - 1) * env;
    out.R[i] = bR.run(rnd() * 2 - 1) * env;
  }
  return out;
};

/** A sub drop: a sine falling an octave, for weight under a drop. */
export const subDrop = (length = 1.4, from = 55, to = 36): Float32Array => {
  const out = buf(length);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const p = t / length;
    ph += (TAU * mtof(from + (to - from) * Math.min(1, p * 1.4))) / SR;
    out[i] = Math.sin(ph) * Math.min(1, t / 0.004) * Math.pow(1 - p, 1.5) * 0.9;
  }
  return out;
};

/* ───────────────────────── Bus tools ───────────────────────── */

/** A filter sweep over a bus: `points` are [seconds, cutoff Hz], interpolated on a log scale. */
export const sweep = (bus: Stereo, kind: 'hp' | 'lp', points: Array<[number, number]>, q = 0.8): void => {
  const at = (t: number): number => {
    if (t <= points[0][0]) return points[0][1];
    for (let k = 1; k < points.length; k++) {
      const [t0, c0] = points[k - 1];
      const [t1, c1] = points[k];
      if (t <= t1) return c0 * Math.pow(c1 / c0, (t - t0) / (t1 - t0));
    }
    return points[points.length - 1][1];
  };
  for (const ch of [bus.L, bus.R]) {
    const f = new Filter();
    for (let i = 0; i < ch.length; i++) {
      if (i % 32 === 0) {
        const c = at(i / SR);
        if (kind === 'hp') f.hp(c, q);
        else f.lp(c, q);
      }
      ch[i] = f.run(ch[i]);
    }
  }
};

/** Keep the low end mono: the side signal loses everything below `freq`. */
export const monoBass = (bus: Stereo, freq = 140): void => {
  const hp = new Filter().hp(freq);
  for (let i = 0; i < bus.L.length; i++) {
    const m = (bus.L[i] + bus.R[i]) * 0.5;
    const s = hp.run((bus.L[i] - bus.R[i]) * 0.5);
    bus.L[i] = m + s;
    bus.R[i] = m - s;
  }
};

/** A Haas widener: the right channel a few milliseconds late. For pads and chords only. */
export const haas = (bus: Stereo, ms = 12): void => {
  const d = Math.round((ms / 1000) * SR);
  for (let i = bus.R.length - 1; i >= d; i--) bus.R[i] = bus.R[i - d];
  for (let i = 0; i < d; i++) bus.R[i] = 0;
};

/* ───────────────────────── Interface sounds ───────────────────────── */

/**
 * "Soft aerodynamic digital swoosh, low-frequency air sweep." Band-passed air that rises and
 * falls in the low mids, a faint sine glide underneath, travelling across the stereo field.
 */
export const airSwoosh = (length: number, seed = 5, {lo = 160, hi = 1300, panFrom = -0.6, panTo = 0.6, tone = 0.25} = {}): Stereo => {
  const out = stereo(length);
  const rnd = makeRng(seed);
  const band = new Filter();
  const lp = new Filter().lp(3200);
  let ph = 0;
  for (let i = 0; i < out.L.length; i++) {
    const t = i / SR;
    const p = t / length;
    const shape = Math.pow(Math.sin(Math.PI * Math.min(1, p)), 1.6);
    if (i % 32 === 0) band.bp(lo + (hi - lo) * Math.sin(Math.PI * p * 0.85), 0.9);
    ph += (TAU * (220 + 260 * p)) / SR;
    const air = lp.run(band.run(rnd() * 2 - 1)) * 1.6;
    const x = (air + Math.sin(ph) * tone * 0.2) * shape;
    const [gl, gr] = panGains(panFrom + (panTo - panFrom) * p);
    out.L[i] = x * gl;
    out.R[i] = x * gr;
  }
  return out;
};

/**
 * "Pleasant digital notification chime, soft marimba strike, glassy." A marimba from FM
 * (a 1:4 pair whose brightness falls fast) plus a faint glassy partial.
 */
export const marimba = (midi: number, vel = 0.7): Float32Array => {
  const out = buf(0.9);
  const f = mtof(midi);
  let pc = 0;
  let pm = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    pm += (TAU * f * 4) / SR;
    pc += (TAU * f) / SR;
    const idx = (0.5 + 1.6 * vel) * Math.exp(-t * 30) + 0.08;
    const wood = Math.sin(pc + idx * Math.sin(pm)) * Math.exp(-t * 7.5);
    const glass = Math.sin(TAU * f * 3.01 * t) * Math.exp(-t * 14) * 0.18 + Math.sin(TAU * f * 5.4 * t) * Math.exp(-t * 26) * 0.06;
    out[i] = (wood + glass) * Math.min(1, t / 0.0015) * vel * 0.42;
  }
  return out;
};

/**
 * The default reveal and check sound: a soft swell from the music's own synths. Two detuned
 * saws through a dark filter fade in over 60 ms and die away within a second, so the sound
 * reads as part of the music rather than a struck note. Reviewers found the plucks too
 * distinctive; this replaces them in new scores.
 */
export const softSwell = (midi: number, vel = 0.6, {length = 0.9, rise = 0.06} = {}): Float32Array => {
  const out = buf(length);
  const f = mtof(midi);
  const a = new SawOsc(0.2);
  const b = new SawOsc(0.7);
  const lp = new Filter();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    if (i % 16 === 0) lp.lp(300 + 280 * vel * Math.exp(-t * 5), 0.6);
    const attack = t < rise ? 0.5 - 0.5 * Math.cos((Math.PI * t) / rise) : 1;
    const env = attack * Math.exp(-Math.max(0, t - rise) * 5.5);
    const sine = Math.sin(TAU * f * t) * 0.35;
    out[i] = lp.run(a.next(f * 1.003) * 0.5 + b.next(f * 0.997) * 0.5 + sine) * env * vel * 0.35;
  }
  return out;
};

/**
 * The reveal sound, in place of the marimba, which reviewers found too pointy against the
 * synths. The score's analog pluck made darker: the filter stays low and
 * the note fades in over 8 ms, so it starts without a click. Play it an octave below the note
 * the marimba would have played.
 */
export const softPluck = (midi: number, vel = 0.7): Float32Array => {
  const out = buf(0.8);
  const f = mtof(midi);
  const a = new SawOsc(0.1);
  const b = new SawOsc(0.6);
  const lp = new Filter();
  let sq = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    if (i % 16 === 0) lp.lp(280 + (700 + 900 * vel) * Math.exp(-t * 12), 0.9);
    sq += f / 2 / SR;
    const square = (sq % 1 < 0.5 ? 1 : -1) * 0.3;
    const fadeIn = t >= 0.008 ? 1 : 0.5 - 0.5 * Math.cos((Math.PI * t) / 0.008);
    out[i] = lp.run(a.next(f * 1.004) * 0.5 + b.next(f * 0.996) * 0.5 + square) * fadeIn * Math.exp(-t * 6) * vel * 0.3;
  }
  return out;
};

/**
 * "Crisp tactile mechanical keyboard clicks, muted high-end." A switch click, a bottom-out
 * thock, a case resonance and a quieter return click, all under a low-pass.
 */
export const mechKey = (seed: number, vel = 0.7, space = false): Float32Array => {
  const out = buf(0.12);
  const rnd = makeRng(seed);
  const click = new Filter().bp(2600 + rnd() * 900, 2.2);
  const caseRes = new Filter().bp(1050 + rnd() * 250, 5);
  const lp = new Filter().lp(6500);
  const thock = (space ? 240 : 400) + rnd() * 90;
  const up = 0.038 + rnd() * 0.02;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const n = rnd() * 2 - 1;
    let x = click.run(n) * Math.exp(-t * 900) * 0.9;
    x += Math.sin(TAU * thock * t) * Math.exp(-t * (space ? 55 : 85)) * 0.6;
    x += caseRes.run(n) * Math.exp(-t * 140) * 0.45;
    if (t > up) x += click.run(n) * Math.exp(-(t - up) * 1200) * 0.35;
    if (space) x += Math.sin(TAU * 130 * t) * Math.exp(-t * 40) * 0.3;
    out[i] = lp.run(x) * vel;
  }
  return out;
};

/** A tactile trackpad click with the top rolled off. */
export const mechClick = (seed = 9): Float32Array => {
  const out = buf(0.13);
  const rnd = makeRng(seed);
  const band = new Filter().bp(2200, 1.8);
  const lp = new Filter().lp(7000);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const n = rnd() * 2 - 1;
    let x = band.run(n) * Math.exp(-t * 1000) + Math.sin(TAU * 520 * t) * Math.exp(-t * 120) * 0.35;
    if (t > 0.068) x += band.run(n) * Math.exp(-(t - 0.068) * 1300) * 0.45;
    out[i] = lp.run(x);
  }
  return out;
};
