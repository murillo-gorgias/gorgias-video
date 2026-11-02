/**
 * Small, dependency-free audio toolkit for the soundtrack generator.
 * Everything is plain Float32Arrays at 44.1 kHz.
 */
import {writeFileSync} from 'node:fs';

export const SR = 44100;
const TAU = Math.PI * 2;

export type Stereo = {readonly L: Float32Array; readonly R: Float32Array};

export const stereo = (seconds: number): Stereo => {
  const n = Math.ceil(seconds * SR);
  return {L: new Float32Array(n), R: new Float32Array(n)};
};

export const mtof = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

/** Repeatable noise, so every run of the generator gives the same file. */
export const makeRng = (seed: number): (() => number) => {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

/** Band-limited sawtooth correction (PolyBLEP), keeps high notes from fizzing. */
const polyblep = (t: number, dt: number): number => {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
};

export class SawOsc {
  private phase: number;
  constructor(phase = 0) {
    this.phase = phase;
  }
  next(freq: number): number {
    const dt = freq / SR;
    const out = 2 * this.phase - 1 - polyblep(this.phase, dt);
    this.phase += dt;
    if (this.phase >= 1) this.phase -= 1;
    return out;
  }
}

/** RBJ cookbook biquad, transposed direct form II. */
export class Biquad {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private z1 = 0;
  private z2 = 0;

  private set(b0: number, b1: number, b2: number, a0: number, a1: number, a2: number): void {
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }

  lowpass(freq: number, q = 0.707): this {
    const w = (TAU * Math.min(freq, SR * 0.45)) / SR;
    const c = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    this.set((1 - c) / 2, 1 - c, (1 - c) / 2, 1 + alpha, -2 * c, 1 - alpha);
    return this;
  }

  highpass(freq: number, q = 0.707): this {
    const w = (TAU * Math.min(freq, SR * 0.45)) / SR;
    const c = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    this.set((1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + alpha, -2 * c, 1 - alpha);
    return this;
  }

  bandpass(freq: number, q = 1): this {
    const w = (TAU * Math.min(freq, SR * 0.45)) / SR;
    const c = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    this.set(alpha, 0, -alpha, 1 + alpha, -2 * c, 1 - alpha);
    return this;
  }

  process(x: number): number {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}

/** Constant-power pan, -1 is hard left, 1 is hard right. */
const panGains = (pan: number): [number, number] => {
  const a = ((pan + 1) / 4) * Math.PI;
  return [Math.cos(a), Math.sin(a)];
};

export const addMono = (bus: Stereo, sig: Float32Array, at: number, gain = 1, pan = 0): void => {
  const [gl, gr] = panGains(pan);
  const start = Math.round(at * SR);
  for (let i = 0; i < sig.length; i++) {
    const j = start + i;
    if (j < 0 || j >= bus.L.length) continue;
    bus.L[j] += sig[i] * gain * gl;
    bus.R[j] += sig[i] * gain * gr;
  }
};

export const addStereo = (bus: Stereo, sig: Stereo, at: number, gain = 1): void => {
  const start = Math.round(at * SR);
  for (let i = 0; i < sig.L.length; i++) {
    const j = start + i;
    if (j < 0 || j >= bus.L.length) continue;
    bus.L[j] += sig.L[i] * gain;
    bus.R[j] += sig.R[i] * gain;
  }
};

/** Sum `src` into `dst` (same length), scaled. */
export const mixInto = (dst: Stereo, src: Stereo, gain = 1): void => {
  for (let i = 0; i < dst.L.length; i++) {
    dst.L[i] += src.L[i] * gain;
    dst.R[i] += src.R[i] * gain;
  }
};

/** Multiply a bus by a per-sample gain curve (used for the kick's pump). */
export const applyGain = (bus: Stereo, curve: Float32Array): void => {
  for (let i = 0; i < bus.L.length; i++) {
    bus.L[i] *= curve[i];
    bus.R[i] *= curve[i];
  }
};

/**
 * The pump: every kick pulls the bus down, then lets it swell back.
 * `depth` is how far it ducks (0 to 1), `release` how fast it recovers.
 */
export const sidechainCurve = (
  length: number,
  kicks: readonly number[],
  depth: number,
  release = 0.11,
): Float32Array => {
  const curve = new Float32Array(length).fill(1);
  const attack = 0.004;
  for (const k of kicks) {
    const start = Math.round(k * SR);
    const end = Math.min(length, start + Math.round(0.6 * SR));
    for (let i = Math.max(0, start); i < end; i++) {
      const t = (i - start) / SR;
      const duck = t < attack ? t / attack : Math.exp(-(t - attack) / release);
      curve[i] = Math.min(curve[i], 1 - depth * duck);
    }
  }
  return curve;
};

/** Freeverb (Jezar's design): eight combs, four allpasses, per channel. */
class Comb {
  private buf: Float32Array;
  private i = 0;
  private store = 0;
  private feedback: number;
  private damp: number;
  constructor(size: number, feedback: number, damp: number) {
    this.buf = new Float32Array(size);
    this.feedback = feedback;
    this.damp = damp;
  }
  process(x: number): number {
    const y = this.buf[this.i];
    this.store = y * (1 - this.damp) + this.store * this.damp;
    this.buf[this.i] = x + this.store * this.feedback;
    this.i = (this.i + 1) % this.buf.length;
    return y;
  }
}

class Allpass {
  private buf: Float32Array;
  private i = 0;
  constructor(size: number) {
    this.buf = new Float32Array(size);
  }
  process(x: number): number {
    const b = this.buf[this.i];
    const y = -x + b;
    this.buf[this.i] = x + b * 0.5;
    this.i = (this.i + 1) % this.buf.length;
    return y;
  }
}

const COMBS = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
const ALLPASSES = [556, 441, 341, 225];
const SPREAD = 23;

/** Returns only the wet signal. Mix it back in with `mixInto`. */
export const reverb = (input: Stereo, room = 0.84, damp = 0.3, highpass = 250): Stereo => {
  const out = stereo(input.L.length / SR);
  const channels: Array<[Float32Array, Float32Array, number]> = [
    [input.L, out.L, 0],
    [input.R, out.R, SPREAD],
  ];
  for (const [src, dst, offset] of channels) {
    const combs = COMBS.map((n) => new Comb(n + offset, room, damp));
    const passes = ALLPASSES.map((n) => new Allpass(n + offset));
    const hp = new Biquad().highpass(highpass);
    for (let i = 0; i < src.length; i++) {
      const x = hp.process(src[i]) * 0.015;
      let y = 0;
      for (const c of combs) y += c.process(x);
      for (const p of passes) y = p.process(y);
      dst[i] = y;
    }
  }
  return out;
};

/**
 * Ping-pong echo, wet only. The first echo lands left after `time`,
 * the next one right, and so on, each `feedback` times quieter.
 */
export const pingPong = (input: Stereo, time: number, feedback: number, lowpass = 3500): Stereo => {
  const out = stereo(input.L.length / SR);
  const d = Math.round(time * SR);
  const lpL = new Biquad().lowpass(lowpass);
  const lpR = new Biquad().lowpass(lowpass);
  for (let i = d; i < input.L.length; i++) {
    const dry = (input.L[i - d] + input.R[i - d]) * 0.5;
    out.L[i] = lpL.process(dry + out.R[i - d] * feedback);
    out.R[i] = lpR.process(out.L[i - d] * feedback);
  }
  return out;
};

export const highpassBus = (bus: Stereo, freq: number): void => {
  const l = new Biquad().highpass(freq);
  const r = new Biquad().highpass(freq);
  for (let i = 0; i < bus.L.length; i++) {
    bus.L[i] = l.process(bus.L[i]);
    bus.R[i] = r.process(bus.R[i]);
  }
};

/** Glue and loudness: a gentle tanh saturator, then normalise to a peak. */
export const master = (bus: Stereo, drive: number, peak: number): void => {
  const norm = Math.tanh(drive);
  let max = 0;
  for (let i = 0; i < bus.L.length; i++) {
    bus.L[i] = Math.tanh(bus.L[i] * drive) / norm;
    bus.R[i] = Math.tanh(bus.R[i] * drive) / norm;
    max = Math.max(max, Math.abs(bus.L[i]), Math.abs(bus.R[i]));
  }
  const g = max > 0 ? peak / max : 1;
  for (let i = 0; i < bus.L.length; i++) {
    bus.L[i] *= g;
    bus.R[i] *= g;
  }
};

export const peakOf = (bus: Stereo): number => {
  let max = 0;
  for (let i = 0; i < bus.L.length; i++) {
    max = Math.max(max, Math.abs(bus.L[i]), Math.abs(bus.R[i]));
  }
  return max;
};

/** Scale a bus so its loudest sample sits at `peak`. */
export const normalize = (bus: Stereo, peak: number): void => {
  const max = peakOf(bus);
  if (max === 0) return;
  const g = peak / max;
  for (let i = 0; i < bus.L.length; i++) {
    bus.L[i] *= g;
    bus.R[i] *= g;
  }
};

/** 16-bit PCM stereo WAV. `useWindowedAudioData()` reads this format. */
export const writeWav = (path: string, bus: Stereo): void => {
  const n = bus.L.length;
  const data = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const l = Math.max(-1, Math.min(1, bus.L[i]));
    const r = Math.max(-1, Math.min(1, bus.R[i]));
    data.writeInt16LE(Math.round(l * 32767), i * 4);
    data.writeInt16LE(Math.round(r * 32767), i * 4 + 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([header, data]));
};
