/**
 * Studio: the mix chain and the core instruments. The default for every score, in place of
 * instruments.ts.
 *
 * Why it exists: the first synth sounded cheap, from thin drums, a raw
 * supersaw for harmony and a tanh "master" with no real dynamics. This file has:
 *   - filters with shelves and peaks (Filter), a recipe EQ (eq)
 *   - placing and mixing (place, placeStereo, sum, scale, multiply, automation, silence)
 *   - the kick pump (pump), a sidechain-capable compressor (compress)
 *   - a look-ahead true-peak limiter (limit) and a BS.1770 loudness meter (lufs)
 *   - an FDN reverb, a chorus, a ping-pong echo, width and saturation
 *   - instruments: layered kick, clap, hats, shaker, rim, FM electric piano, pad, bass,
 *     FM mallet and bell, riser, impact, crash, reversed swell, whoosh
 *   - interface sounds: keys, trackpad click, pop, tick, shimmer, and the calm check tone
 *     and dock thud that passed review (softCheck, softLock)
 * modern.ts adds the modern palette on top. Everything is Float32Arrays at 44.1 kHz and
 * deterministic: same input, same file.
 */
import {makeRng, mtof, SawOsc, SR, stereo, type Stereo} from './dsp.ts';

export {makeRng, mtof, SR, stereo};

const TAU = Math.PI * 2;
export const buf = (seconds: number): Float32Array => new Float32Array(Math.ceil(seconds * SR));
export const db = (x: number): number => Math.pow(10, x / 20);

/* ───────────────────────── Filters ───────────────────────── */

/** RBJ cookbook biquad, transposed direct form II, with shelves and a peak. */
export class Filter {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private z1 = 0;
  private z2 = 0;

  private set(b0: number, b1: number, b2: number, a0: number, a1: number, a2: number): this {
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
    return this;
  }

  private static w(freq: number): number {
    return (TAU * Math.min(freq, SR * 0.45)) / SR;
  }

  lp(freq: number, q = 0.707): this {
    const w = Filter.w(freq);
    const c = Math.cos(w);
    const a = Math.sin(w) / (2 * q);
    return this.set((1 - c) / 2, 1 - c, (1 - c) / 2, 1 + a, -2 * c, 1 - a);
  }

  hp(freq: number, q = 0.707): this {
    const w = Filter.w(freq);
    const c = Math.cos(w);
    const a = Math.sin(w) / (2 * q);
    return this.set((1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + a, -2 * c, 1 - a);
  }

  bp(freq: number, q = 1): this {
    const w = Filter.w(freq);
    const c = Math.cos(w);
    const a = Math.sin(w) / (2 * q);
    return this.set(a, 0, -a, 1 + a, -2 * c, 1 - a);
  }

  peak(freq: number, q: number, gainDb: number): this {
    const w = Filter.w(freq);
    const c = Math.cos(w);
    const a = Math.sin(w) / (2 * q);
    const A = Math.pow(10, gainDb / 40);
    return this.set(1 + a * A, -2 * c, 1 - a * A, 1 + a / A, -2 * c, 1 - a / A);
  }

  lowShelf(freq: number, gainDb: number): this {
    const w = Filter.w(freq);
    const c = Math.cos(w);
    const A = Math.pow(10, gainDb / 40);
    const a = (Math.sin(w) / 2) * Math.SQRT2;
    const s = 2 * Math.sqrt(A) * a;
    return this.set(A * (A + 1 - (A - 1) * c + s), 2 * A * (A - 1 - (A + 1) * c), A * (A + 1 - (A - 1) * c - s), A + 1 + (A - 1) * c + s, -2 * (A - 1 + (A + 1) * c), A + 1 + (A - 1) * c - s);
  }

  highShelf(freq: number, gainDb: number): this {
    const w = Filter.w(freq);
    const c = Math.cos(w);
    const A = Math.pow(10, gainDb / 40);
    const a = (Math.sin(w) / 2) * Math.SQRT2;
    const s = 2 * Math.sqrt(A) * a;
    return this.set(A * (A + 1 + (A - 1) * c + s), -2 * A * (A - 1 + (A + 1) * c), A * (A + 1 + (A - 1) * c - s), A + 1 - (A - 1) * c + s, 2 * (A - 1 - (A + 1) * c), A + 1 - (A - 1) * c - s);
  }

  run(x: number): number {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}

/** Run one filter recipe over both channels of a bus, in place. */
export const eq = (bus: Stereo, make: () => Filter[]): void => {
  for (const ch of [bus.L, bus.R]) {
    const chain = make();
    for (let i = 0; i < ch.length; i++) {
      let x = ch[i];
      for (const f of chain) x = f.run(x);
      ch[i] = x;
    }
  }
};

/* ───────────────────────── Placing sounds ───────────────────────── */

const panGains = (pan: number): [number, number] => {
  const a = ((pan + 1) / 4) * Math.PI;
  return [Math.cos(a), Math.sin(a)];
};

export const place = (bus: Stereo, sig: Float32Array, at: number, gain = 1, pan = 0): void => {
  const [gl, gr] = panGains(pan);
  const start = Math.round(at * SR);
  for (let i = 0; i < sig.length; i++) {
    const j = start + i;
    if (j < 0 || j >= bus.L.length) continue;
    bus.L[j] += sig[i] * gain * gl;
    bus.R[j] += sig[i] * gain * gr;
  }
};

export const placeStereo = (bus: Stereo, sig: Stereo, at: number, gain = 1): void => {
  const start = Math.round(at * SR);
  for (let i = 0; i < sig.L.length; i++) {
    const j = start + i;
    if (j < 0 || j >= bus.L.length) continue;
    bus.L[j] += sig.L[i] * gain;
    bus.R[j] += sig.R[i] * gain;
  }
};

export const sum = (dst: Stereo, src: Stereo, gain = 1): void => {
  for (let i = 0; i < dst.L.length; i++) {
    dst.L[i] += src.L[i] * gain;
    dst.R[i] += src.R[i] * gain;
  }
};

export const scale = (bus: Stereo, gain: number): void => {
  for (let i = 0; i < bus.L.length; i++) {
    bus.L[i] *= gain;
    bus.R[i] *= gain;
  }
};

/** Multiply by a gain curve (sidechain pumps, gates, automation). */
export const multiply = (bus: Stereo, curve: Float32Array): void => {
  for (let i = 0; i < bus.L.length; i++) {
    bus.L[i] *= curve[i];
    bus.R[i] *= curve[i];
  }
};

/** A gain curve from breakpoints [[seconds, gain], ...], linear between them. */
export const automation = (length: number, points: Array<[number, number]>): Float32Array => {
  const out = new Float32Array(length);
  let k = 0;
  for (let i = 0; i < length; i++) {
    const t = i / SR;
    while (k < points.length - 2 && t > points[k + 1][0]) k++;
    const [t0, g0] = points[k];
    const [t1, g1] = points[Math.min(k + 1, points.length - 1)];
    const p = t <= t0 ? 0 : t >= t1 ? 1 : (t - t0) / (t1 - t0);
    out[i] = g0 + (g1 - g0) * p;
  }
  return out;
};

/** The kick's pump: duck on each kick, swell back over `release` seconds. */
export const pump = (length: number, kicks: readonly number[], depth: number, release = 0.14): Float32Array => {
  const curve = new Float32Array(length).fill(1);
  for (const k of kicks) {
    const start = Math.round(k * SR);
    const end = Math.min(length, start + Math.round(0.5 * SR));
    for (let i = Math.max(0, start); i < end; i++) {
      const t = (i - start) / SR;
      const duck = t < 0.005 ? t / 0.005 : Math.exp(-(t - 0.005) / release);
      curve[i] = Math.min(curve[i], 1 - depth * duck);
    }
  }
  return curve;
};

/** Silence from `from` to `to`, with short fades so nothing clicks. Reverb tails included. */
export const silence = (bus: Stereo, from: number, to: number, fade = 0.008): void => {
  for (let i = 0; i < bus.L.length; i++) {
    const t = i / SR;
    let g = 1;
    if (t >= from && t < to) g = 0;
    else if (t >= from - fade && t < from) g = (from - t) / fade;
    else if (t >= to && t < to + fade) g = (t - to) / fade;
    bus.L[i] *= g;
    bus.R[i] *= g;
  }
};

/* ───────────────────────── Drums ───────────────────────── */

/** A layered kick: a sub sine with a fast pitch drop, a knock in the low mids, a soft click. */
export const kick = (seed = 1, {tone = 1, decay = 6}: {tone?: number; decay?: number} = {}): Float32Array => {
  const out = buf(0.6);
  const rnd = makeRng(seed);
  const knock = new Filter().bp(170, 1.4);
  const click = new Filter().bp(3800, 0.8);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = 49 * tone + 125 * Math.exp(-t * 30) + 35 * Math.exp(-t * 9);
    ph += (TAU * f) / SR;
    const amp = t < 0.0015 ? t / 0.0015 : Math.exp(-t * decay);
    const body = Math.sin(ph) * amp;
    const k = knock.run(rnd() * 2 - 1) * Math.exp(-t * 55) * 0.6;
    const c = click.run(rnd() * 2 - 1) * Math.exp(-t * 520) * 0.55;
    out[i] = Math.tanh((body + k + c) * 1.5) * 0.95;
  }
  return out;
};

/** Clap and snare layered: four quick bursts, a tuned body, a bright tail. */
export const clap = (seed = 2): Float32Array => {
  const out = buf(0.55);
  const rnd = makeRng(seed);
  const clapBand = new Filter().bp(1250, 0.85);
  const clapHp = new Filter().hp(500);
  const tail = new Filter().hp(1900);
  const bursts = [0, 0.0095, 0.019, 0.03];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let env = 0;
    for (const b of bursts) if (t >= b) env = Math.max(env, Math.exp(-(t - b) * 240));
    if (t >= 0.03) env = Math.max(env, 0.5 * Math.exp(-(t - 0.03) * 14));
    const n = rnd() * 2 - 1;
    const c = clapHp.run(clapBand.run(n)) * env * 1.6;
    const body = Math.sin(TAU * (190 - 30 * Math.min(1, t * 20)) * t) * Math.exp(-t * 30) * 0.45;
    const s = tail.run(n) * Math.exp(-t * 20) * 0.35;
    out[i] = Math.tanh((c + body + s) * 1.25);
  }
  return out;
};

/** An 808-style hat: six detuned squares through a high band, plus a little air. */
export const hat = (open: boolean, seed = 3, tone = 1): Float32Array => {
  const length = open ? 0.5 : 0.09;
  const decay = open ? 7 : 58;
  const out = buf(length);
  const rnd = makeRng(seed);
  const freqs = [205.3, 304.4, 369.6, 522.7, 540, 800].map((f) => f * 1.72 * tone);
  const band = new Filter().bp(10500, 0.8);
  const high = new Filter().hp(7200);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let metal = 0;
    for (const f of freqs) metal += Math.sin(TAU * f * t) > 0 ? 1 : -1;
    const sig = metal / 6 + (rnd() * 2 - 1) * 0.7;
    const env = (t < 0.0008 ? t / 0.0008 : 1) * Math.exp(-t * decay);
    out[i] = high.run(band.run(sig)) * env * 1.25;
  }
  return out;
};

/** A shaker: filtered noise with a soft attack. */
export const shaker = (seed = 4): Float32Array => {
  const out = buf(0.14);
  const rnd = makeRng(seed);
  const band = new Filter().bp(7200, 0.9);
  const high = new Filter().hp(4500);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const env = t < 0.007 ? t / 0.007 : Math.exp(-(t - 0.007) * 42);
    out[i] = high.run(band.run(rnd() * 2 - 1)) * env * 1.3;
  }
  return out;
};

/** A rim click for syncopation. */
export const rim = (seed = 5): Float32Array => {
  const out = buf(0.08);
  const rnd = makeRng(seed);
  const band = new Filter().bp(2600, 2);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const tone = Math.sin(TAU * 1720 * t) * Math.exp(-t * 130) * 0.5 + Math.sin(TAU * 510 * t) * Math.exp(-t * 90) * 0.35;
    out[i] = tone + band.run(rnd() * 2 - 1) * Math.exp(-t * 320) * 0.5;
  }
  return out;
};

/* ───────────────────────── Tonal instruments ───────────────────────── */

/**
 * An FM electric piano, after the classic DX7 tine sound: a 1:1 pair for the body and a
 * 1:14 pair for the bell-like tine at the attack. `vel` sets brightness and level.
 */
export const ep = (midi: number, dur: number, vel = 0.8): Stereo => {
  const tail = 1.4;
  const out = stereo(dur + tail);
  const f = mtof(midi);
  const keyDecay = 0.55 + Math.max(0, midi - 55) * 0.035;
  let pc = 0;
  let pm = 0;
  let pc2 = 0;
  let pm2 = 0;
  let pd = 0;
  for (let i = 0; i < out.L.length; i++) {
    const t = i / SR;
    const idx = (0.6 + 1.6 * vel) * Math.exp(-t * 2.4) + 0.32;
    pm += (TAU * f) / SR;
    pc += (TAU * f) / SR;
    pd += (TAU * f * 1.0035) / SR;
    pm2 += (TAU * f * 14) / SR;
    pc2 += (TAU * f) / SR;
    const body = Math.sin(pc + idx * Math.sin(pm));
    const body2 = Math.sin(pd + idx * 0.8 * Math.sin(pm));
    const tine = Math.sin(pc2 + 1.8 * vel * Math.exp(-t * 22) * Math.sin(pm2)) * Math.exp(-t * 9) * 0.32 * vel;
    const attack = Math.min(1, t / 0.003);
    const release = t > dur ? Math.exp(-(t - dur) * 9) : 1;
    const amp = attack * release * Math.exp(-t * keyDecay) * (0.45 + 0.55 * vel);
    out.L[i] = (body * 0.62 + body2 * 0.38 + tine) * amp * 0.5;
    out.R[i] = (body * 0.38 + body2 * 0.62 + tine) * amp * 0.5;
  }
  return out;
};

/** A warm pad: three detuned saws per note, a slow filter, a long attack and release. */
export const pad = (notes: readonly number[], dur: number, {attack = 0.5, release = 1.4, cutoff = 1900, seed = 9} = {}): Stereo => {
  const out = stereo(dur + release);
  const rnd = makeRng(seed);
  const detune = [-0.11, 0, 0.11];
  for (const midi of notes) {
    const f = mtof(midi);
    const oscs = detune.map(() => new SawOsc(rnd()));
    const lpL = new Filter();
    const lpR = new Filter();
    for (let i = 0; i < out.L.length; i++) {
      const t = i / SR;
      if (i % 32 === 0) {
        const c = cutoff * (1 + 0.25 * Math.sin(TAU * 0.15 * t + midi));
        lpL.lp(c, 0.6);
        lpR.lp(c * 1.03, 0.6);
      }
      const a = oscs[0].next(f * Math.pow(2, detune[0] / 12));
      const b = oscs[1].next(f);
      const c = oscs[2].next(f * Math.pow(2, detune[2] / 12));
      const env = Math.min(1, t / attack) * (t > dur ? Math.max(0, 1 - (t - dur) / release) : 1);
      out.L[i] += lpL.run(a * 0.7 + b * 0.5 + c * 0.2) * env * 0.12;
      out.R[i] += lpR.run(a * 0.2 + b * 0.5 + c * 0.7) * env * 0.12;
    }
  }
  return out;
};

/**
 * Bass: a sine sub for weight, plus a filtered saw an octave up so it reads on a phone
 * speaker, where nothing below 100 Hz plays.
 */
export const bass = (midi: number, dur: number, vel = 1): Float32Array => {
  const out = buf(dur + 0.08);
  const f = mtof(midi);
  const saw = new SawOsc(0.3);
  const lp = new Filter();
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    if (i % 16 === 0) lp.lp(260 + 900 * Math.exp(-t * 14), 0.9);
    ph += (TAU * f * (1 + 0.03 * Math.exp(-t * 70))) / SR;
    const sub = Math.sin(ph) + 0.18 * Math.sin(2 * ph);
    const mid = lp.run(saw.next(f * 2)) * 0.32;
    const attack = Math.min(1, t / 0.004);
    const release = t > dur ? Math.max(0, 1 - (t - dur) / 0.06) : 1;
    out[i] = Math.tanh((sub * 0.8 + mid) * 1.35) * attack * release * vel * 0.9;
  }
  return out;
};

/** A soft FM mallet for the melody: a 1:4 pair whose brightness falls fast. */
export const mallet = (midi: number, vel = 0.8, length = 1.1): Float32Array => {
  const out = buf(length);
  const f = mtof(midi);
  let pc = 0;
  let pm = 0;
  let p2 = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    pm += (TAU * f * 4) / SR;
    pc += (TAU * f) / SR;
    p2 += (TAU * f * 2.001) / SR;
    const idx = (0.4 + 2.4 * vel) * Math.exp(-t * 16) + 0.15;
    const tone = Math.sin(pc + idx * Math.sin(pm)) + 0.18 * Math.sin(p2) * Math.exp(-t * 6);
    out[i] = tone * Math.min(1, t / 0.0015) * Math.exp(-t * 4.2) * vel * 0.5;
  }
  return out;
};

/** A bell for interface chimes: inharmonic FM, long and clean. */
export const bell = (midi: number, vel = 0.8, length = 1.6): Float32Array => {
  const out = buf(length);
  const f = mtof(midi);
  let pc = 0;
  let pm = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    pm += (TAU * f * 3.5) / SR;
    pc += (TAU * f) / SR;
    const idx = 2.2 * vel * Math.exp(-t * 7) + 0.1;
    out[i] = Math.sin(pc + idx * Math.sin(pm)) * Math.min(1, t / 0.002) * Math.exp(-t * 3.2) * vel * 0.45;
  }
  return out;
};

/* ───────────────────────── Transitions ───────────────────────── */

/** A noise riser with a rising tone: builds into a cut over `length` seconds. */
export const riser = (length: number, seed = 11, {from = 350, to = 9000, toneFrom = 55, toneTo = 79} = {}): Stereo => {
  const out = stereo(length);
  const rnd = makeRng(seed);
  const bandL = new Filter();
  const bandR = new Filter();
  const saw = new SawOsc(0.1);
  const toneLp = new Filter();
  for (let i = 0; i < out.L.length; i++) {
    const t = i / SR;
    const p = t / length;
    if (i % 32 === 0) {
      const c = from * Math.pow(to / from, p * p);
      bandL.bp(c, 1.6);
      bandR.bp(c * 1.07, 1.6);
      toneLp.lp(400 + 5000 * p * p, 1.2);
    }
    const env = Math.pow(p, 2.2);
    const tone = toneLp.run(saw.next(mtof(toneFrom + (toneTo - toneFrom) * p * p))) * 0.18;
    out.L[i] = (bandL.run(rnd() * 2 - 1) * 1.5 + tone) * env;
    out.R[i] = (bandR.run(rnd() * 2 - 1) * 1.5 + tone) * env;
  }
  return out;
};

/** A deep impact for a drop: a falling sine, a noise thump, a short room. */
export const impact = (seed = 12, size = 1): Float32Array => {
  const out = buf(2.4);
  const rnd = makeRng(seed);
  const lp = new Filter().lp(2200);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (TAU * (34 + 46 * Math.exp(-t * 7))) / SR;
    const sub = Math.sin(ph) * Math.exp(-t * 2.1) * (t < 0.003 ? t / 0.003 : 1);
    const thump = lp.run(rnd() * 2 - 1) * Math.exp(-t * 16) * 0.7;
    out[i] = Math.tanh((sub + thump) * 1.4) * size;
  }
  return out;
};

/** A crash cymbal: bright noise and metal, a long decay. */
export const crash = (seed = 13, length = 2.6): Stereo => {
  const out = stereo(length);
  const rnd = makeRng(seed);
  const hpL = new Filter().hp(3800);
  const hpR = new Filter().hp(4100);
  const shelfL = new Filter().highShelf(9000, -4);
  const shelfR = new Filter().highShelf(9000, -4);
  const freqs = [326, 469, 587, 733, 917, 1188].map((x) => x * 3.1);
  for (let i = 0; i < out.L.length; i++) {
    const t = i / SR;
    let metal = 0;
    for (const f of freqs) metal += Math.sin(TAU * f * t + f) > 0 ? 1 : -1;
    const env = (t < 0.002 ? t / 0.002 : 1) * (0.65 * Math.exp(-t * 2.1) + 0.35 * Math.exp(-t * 7));
    out.L[i] = shelfL.run(hpL.run((rnd() * 2 - 1) + metal * 0.06)) * env * 0.55;
    out.R[i] = shelfR.run(hpR.run((rnd() * 2 - 1) + metal * 0.06)) * env * 0.55;
  }
  return out;
};

/** A reversed cymbal swell that ends exactly at `length`. */
export const swell = (length: number, seed = 14): Stereo => {
  const c = crash(seed, length);
  const fade = Math.round(0.004 * SR);
  for (const ch of [c.L, c.R]) {
    ch.reverse();
    for (let i = 0; i < fade; i++) ch[ch.length - 1 - i] *= i / fade;
  }
  return c;
};

/**
 * A whoosh: band-passed noise whose centre rises then falls, with a bell-shaped level and a
 * pan that travels from `panFrom` to `panTo`.
 */
export const whoosh = (length: number, seed = 15, {lo = 500, hi = 4500, panFrom = -0.6, panTo = 0.6, gain = 1} = {}): Stereo => {
  const out = stereo(length);
  const rnd = makeRng(seed);
  const band = new Filter();
  const air = new Filter().hp(2500);
  for (let i = 0; i < out.L.length; i++) {
    const t = i / SR;
    const p = t / length;
    const shape = Math.sin(Math.PI * Math.min(1, p)) ** 2;
    if (i % 32 === 0) band.bp(lo + (hi - lo) * Math.sin(Math.PI * p * 0.9), 1.1);
    const n = rnd() * 2 - 1;
    const x = (band.run(n) * 1.4 + air.run(n) * 0.25 * shape) * shape * gain;
    const [gl, gr] = panGains(panFrom + (panTo - panFrom) * p);
    out.L[i] = x * gl;
    out.R[i] = x * gr;
  }
  return out;
};

/* ───────────────────────── Interface sounds ───────────────────────── */

/** A laptop key: a click, a soft low thock, a little plastic. `space` is deeper. */
export const keyTap = (seed: number, vel = 0.8, space = false): Float32Array => {
  const out = buf(0.09);
  const rnd = makeRng(seed);
  const click = new Filter().bp(4200 + rnd() * 1200, 1.4);
  const plastic = new Filter().bp(1300 + rnd() * 500, 3.5);
  const thock = (space ? 140 : 210) + rnd() * 50;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const n = rnd() * 2 - 1;
    const c = click.run(n) * Math.exp(-t * 950) * 0.9;
    const p = plastic.run(n) * Math.exp(-t * 170) * 0.5;
    const b = Math.sin(TAU * thock * t) * Math.exp(-t * (space ? 70 : 95)) * 0.55;
    out[i] = (c + p + b) * vel;
  }
  return out;
};

/** A trackpad click: a press and a softer release 70 ms later. */
export const mouseClick = (seed = 21): Float32Array => {
  const out = buf(0.16);
  const rnd = makeRng(seed);
  const band = new Filter().bp(2900, 1.8);
  const body = new Filter().bp(900, 2.5);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const n = rnd() * 2 - 1;
    let env = Math.exp(-t * 1100);
    if (t > 0.072) env += 0.55 * Math.exp(-(t - 0.072) * 1300);
    out[i] = (band.run(n) * 1.1 + body.run(n) * 0.5) * env;
  }
  return out;
};

/** A soft pop for a message landing: a sine with a quick upward blip. */
export const pop = (midi: number, vel = 0.8): Float32Array => {
  const out = buf(0.28);
  const f = mtof(midi);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (TAU * f * (1 + 0.5 * Math.exp(-t * 55))) / SR;
    out[i] = Math.sin(ph) * Math.min(1, t / 0.0025) * Math.exp(-t * 16) * vel * 0.6;
  }
  return out;
};

/** A tiny tick for counters, tuned. */
export const tick = (midi: number, vel = 0.5): Float32Array => {
  const out = buf(0.05);
  const f = mtof(midi);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = Math.sin(TAU * f * t) * Math.min(1, t / 0.001) * Math.exp(-t * 110) * vel;
  }
  return out;
};

/**
 * A quiet shimmer while a tool runs: sparse high sine grains on a pentatonic set,
 * from `notes`, one every `step` seconds.
 */
export const shimmer = (length: number, notes: readonly number[], seed = 31, step = 0.0625): Stereo => {
  const out = stereo(length + 0.3);
  const rnd = makeRng(seed);
  for (let at = 0; at < length; at += step) {
    const midi = notes[Math.floor(rnd() * notes.length)];
    const f = mtof(midi);
    const pan = rnd() * 1.4 - 0.7;
    const [gl, gr] = panGains(pan);
    const start = Math.round(at * SR);
    const len = Math.round(0.18 * SR);
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const x = Math.sin(TAU * f * t) * Math.min(1, t / 0.004) * Math.exp(-t * 24) * 0.18;
      out.L[start + i] += x * gl;
      out.R[start + i] += x * gr;
    }
  }
  return out;
};

/* ───────────────────────── Effects ───────────────────────── */

/**
 * A feedback delay network reverb: eight delay lines mixed by a Householder matrix, each
 * damped by a one-pole low-pass. Smoother and less metallic than the skill's Freeverb.
 * Returns the wet signal only.
 */
export const fdnReverb = (input: Stereo, {decay = 1.8, size = 1, damp = 0.35, predelay = 0.018, lowCut = 220} = {}): Stereo => {
  const out = stereo(input.L.length / SR);
  const base = [1433, 1601, 1867, 2053, 2251, 2399, 2617, 2797].map((d) => Math.round(d * size));
  const lines = base.map((d) => new Float32Array(d));
  const idx = new Array(8).fill(0);
  const lpState = new Array(8).fill(0);
  const gains = base.map((d) => Math.pow(10, (-3 * d) / (SR * decay)));
  const pre = Math.round(predelay * SR);
  const hpIn = new Filter().hp(lowCut);
  const outs = new Array(8).fill(0);
  for (let i = 0; i < input.L.length; i++) {
    const j = i - pre;
    const x = j >= 0 ? hpIn.run((input.L[j] + input.R[j]) * 0.5) : 0;
    let total = 0;
    for (let k = 0; k < 8; k++) {
      const y = lines[k][idx[k]];
      lpState[k] = y * (1 - damp) + lpState[k] * damp;
      outs[k] = lpState[k];
      total += outs[k];
    }
    const h = (2 / 8) * total;
    let l = 0;
    let r = 0;
    for (let k = 0; k < 8; k++) {
      const fb = (outs[k] - h) * gains[k];
      lines[k][idx[k]] = x * 0.35 + fb;
      idx[k] = (idx[k] + 1) % lines[k].length;
      if (k % 2 === 0) l += outs[k];
      else r += outs[k];
    }
    out.L[i] = l * 0.3;
    out.R[i] = r * 0.3;
  }
  return out;
};

/** A stereo chorus: two modulated delays in quadrature. Returns dry plus wet. */
export const chorus = (input: Stereo, {rate = 0.6, depth = 0.0035, base = 0.012, mix = 0.45} = {}): Stereo => {
  const out = stereo(input.L.length / SR);
  const max = Math.ceil((base + depth) * SR) + 4;
  const read = (ch: Float32Array, i: number, delay: number): number => {
    const pos = i - delay * SR;
    const a = Math.floor(pos);
    const frac = pos - a;
    const x0 = a >= 0 ? ch[a] : 0;
    const x1 = a + 1 >= 0 ? ch[a + 1] : 0;
    return x0 + (x1 - x0) * frac;
  };
  for (let i = 0; i < input.L.length; i++) {
    const t = i / SR;
    const dl = base + depth * Math.sin(TAU * rate * t);
    const dr = base + depth * Math.cos(TAU * rate * t);
    out.L[i] = input.L[i] * (1 - mix * 0.5) + (i > max ? read(input.R, i, dl) : 0) * mix;
    out.R[i] = input.R[i] * (1 - mix * 0.5) + (i > max ? read(input.L, i, dr) : 0) * mix;
  }
  return out;
};

/** A ping-pong echo, wet only, darkened each repeat. */
export const echo = (input: Stereo, time: number, feedback = 0.38, lowpass = 3800): Stereo => {
  const out = stereo(input.L.length / SR);
  const d = Math.round(time * SR);
  const lpL = new Filter().lp(lowpass);
  const lpR = new Filter().lp(lowpass);
  for (let i = d; i < input.L.length; i++) {
    const dry = (input.L[i - d] + input.R[i - d]) * 0.5;
    out.L[i] = lpL.run(dry + out.R[i - d] * feedback);
    out.R[i] = lpR.run(out.L[i - d] * feedback);
  }
  return out;
};

/** Widen or narrow with mid/side. 1 is unchanged. */
export const width = (bus: Stereo, amount: number): void => {
  for (let i = 0; i < bus.L.length; i++) {
    const m = (bus.L[i] + bus.R[i]) * 0.5;
    const s = (bus.L[i] - bus.R[i]) * 0.5 * amount;
    bus.L[i] = m + s;
    bus.R[i] = m - s;
  }
};

/** Gentle tape-style saturation, `drive` above 1 adds harmonics. Level-matched. */
export const saturate = (bus: Stereo, drive: number): void => {
  const norm = 1 / Math.tanh(drive);
  for (let i = 0; i < bus.L.length; i++) {
    bus.L[i] = Math.tanh(bus.L[i] * drive) * norm;
    bus.R[i] = Math.tanh(bus.R[i] * drive) * norm;
  }
};

/**
 * A stereo-linked compressor with a soft knee. Threshold and makeup in dB, attack and release
 * in seconds. `key` lets another bus drive it (sidechain).
 */
export const compress = (bus: Stereo, {threshold = -18, ratio = 2, attack = 0.01, release = 0.12, knee = 6, makeup = 0, key}: {threshold?: number; ratio?: number; attack?: number; release?: number; knee?: number; makeup?: number; key?: Stereo} = {}): void => {
  const src = key ?? bus;
  const aA = Math.exp(-1 / (attack * SR));
  const aR = Math.exp(-1 / (release * SR));
  let env = -120;
  const mk = db(makeup);
  for (let i = 0; i < bus.L.length; i++) {
    const level = Math.max(Math.abs(src.L[i]), Math.abs(src.R[i]));
    const x = 20 * Math.log10(level + 1e-9);
    env = x > env ? aA * env + (1 - aA) * x : aR * env + (1 - aR) * x;
    const over = env - threshold;
    let gr = 0;
    if (over > knee / 2) gr = over * (1 - 1 / ratio);
    else if (over > -knee / 2) gr = ((over + knee / 2) ** 2 / (2 * knee)) * (1 - 1 / ratio);
    const g = db(-gr) * mk;
    bus.L[i] *= g;
    bus.R[i] *= g;
  }
};

/**
 * A look-ahead brick-wall limiter on true peaks (between samples too). The gain needed at each
 * peak is spread backwards over the look-ahead window, so it is already down when the peak
 * arrives: no clipping, no clicks.
 */
export const limit = (bus: Stereo, ceilingDb: number, {lookahead = 0.005, release = 0.08} = {}): void => {
  const n = bus.L.length;
  const ceiling = db(ceilingDb);
  const la = Math.max(1, Math.round(lookahead * SR));
  /* True peak: the sample, plus three points between it and the next, by cubic interpolation. */
  const truePeak = (x: Float32Array, i: number): number => {
    const a = x[Math.max(0, i - 1)];
    const b = x[i];
    const c = x[Math.min(n - 1, i + 1)];
    const d = x[Math.min(n - 1, i + 2)];
    let m = Math.abs(b);
    for (const t of [0.25, 0.5, 0.75]) {
      const v = b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
      m = Math.max(m, Math.abs(v));
    }
    return m;
  };
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = Math.max(truePeak(bus.L, i), truePeak(bus.R, i));
    need[i] = p > ceiling ? ceiling / p : 1;
  }
  /* Forward minimum over the look-ahead window. */
  const minf = new Float32Array(n);
  const dq: number[] = [];
  let head = 0;
  for (let i = n - 1; i >= 0; i--) {
    while (dq.length > head && need[dq[dq.length - 1]] >= need[i]) dq.pop();
    dq.push(i);
    while (dq[head] > i + la) head++;
    minf[i] = need[dq[head]];
  }
  /* Slow release, instant attack (the look-ahead already gave it time). */
  const rel = 1 - Math.exp(-1 / (release * SR));
  let g = 1;
  for (let i = 0; i < n; i++) {
    g = minf[i] < g ? minf[i] : g + (minf[i] - g) * rel;
    minf[i] = g;
  }
  /* Box-smooth over the look-ahead so the gain ramps instead of stepping. */
  let acc = 0;
  const smooth = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    acc += minf[i];
    if (i >= la) acc -= minf[i - la];
    smooth[i] = Math.min(minf[i], acc / Math.min(i + 1, la));
  }
  for (let i = 0; i < n; i++) {
    bus.L[i] = Math.max(-ceiling, Math.min(ceiling, bus.L[i] * smooth[i]));
    bus.R[i] = Math.max(-ceiling, Math.min(ceiling, bus.R[i] * smooth[i]));
  }
};

/** Integrated loudness in LUFS (ITU-R BS.1770-4, K-weighting, gated). */
export const lufs = (bus: Stereo): number => {
  const shelf = () => new Filter().highShelf(1681, 4);
  const rlb = () => new Filter().hp(38, 0.5);
  const weigh = (ch: Float32Array): Float32Array => {
    const a = shelf();
    const b = rlb();
    const out = new Float32Array(ch.length);
    for (let i = 0; i < ch.length; i++) out[i] = b.run(a.run(ch[i]));
    return out;
  };
  const L = weigh(bus.L);
  const R = weigh(bus.R);
  const block = Math.round(0.4 * SR);
  const hop = Math.round(0.1 * SR);
  const powers: number[] = [];
  for (let s = 0; s + block <= L.length; s += hop) {
    let acc = 0;
    for (let i = s; i < s + block; i++) acc += L[i] * L[i] + R[i] * R[i];
    powers.push(acc / block);
  }
  const loud = (p: number): number => -0.691 + 10 * Math.log10(p + 1e-12);
  const abs = powers.filter((p) => loud(p) > -70);
  const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const rel = loud(mean(abs)) - 10;
  return loud(mean(abs.filter((p) => loud(p) > rel)));
};

export const peakDb = (bus: Stereo): number => {
  let m = 0;
  for (let i = 0; i < bus.L.length; i++) m = Math.max(m, Math.abs(bus.L[i]), Math.abs(bus.R[i]));
  return 20 * Math.log10(m + 1e-12);
};

export const copy = (bus: Stereo): Stereo => ({L: Float32Array.from(bus.L), R: Float32Array.from(bus.R)});

/* ───────────────────────── Calm interface sounds ───────────────────────── */

/**
 * A soft, rounded confirmation tone for checks: a sine with a gentle attack, a hint of the
 * octave and a short felt body. Calm and low, in place of a bright FM chime that read as too loud.
 */
export const softCheck = (midi: number, vel = 0.6): Float32Array => {
  const out = buf(0.7);
  const f = mtof(midi);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const tone = Math.sin(TAU * f * t) + 0.12 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 10);
    const body = Math.sin(TAU * 210 * t) * Math.exp(-t * 40) * 0.25;
    const env = Math.min(1, t / 0.009) * Math.exp(-t * 8.5);
    out[i] = (tone * env + body * Math.min(1, t / 0.003)) * vel * 0.4;
  }
  return out;
};

/** A muted thud for a badge settling into place: low, short, no click. */
export const softLock = (vel = 0.6): Float32Array => {
  const out = buf(0.12);
  const lp = new Filter().lp(900);
  const rnd = makeRng(91);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const thud = Math.sin(TAU * (150 - 40 * Math.min(1, t * 15)) * t) * Math.exp(-t * 45);
    const felt = lp.run(rnd() * 2 - 1) * Math.exp(-t * 120) * 0.25;
    out[i] = (thud + felt) * Math.min(1, t / 0.002) * vel * 0.5;
  }
  return out;
};
