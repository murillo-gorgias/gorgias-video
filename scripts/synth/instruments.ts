/**
 * The instruments. Each one renders a single hit or note into a fresh buffer,
 * which the arrangement (make.ts) drops onto the timeline.
 */
import {Biquad, makeRng, mtof, SawOsc, SR, stereo, type Stereo} from './dsp.ts';

const TAU = Math.PI * 2;
const samples = (seconds: number): Float32Array => new Float32Array(Math.ceil(seconds * SR));

/** Punchy four-on-the-floor kick: a falling sine, a click, a little drive. */
export const kick = (seed = 1): Float32Array => {
  const out = samples(0.5);
  const rnd = makeRng(seed);
  const click = new Biquad().highpass(2500);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const freq = 46 + 150 * Math.exp(-t * 40) + 24 * Math.exp(-t * 8);
    phase += (TAU * freq) / SR;
    const amp = t < 0.004 ? t / 0.004 : Math.exp(-(t - 0.004) * 7);
    const body = Math.sin(phase) * amp;
    const tick = click.process(rnd() * 2 - 1) * Math.exp(-t * 700) * 0.5;
    out[i] = Math.tanh((body + tick) * 1.7);
  }
  return out;
};

/** A layered hand clap: four quick bursts, then a short room tail. */
export const clap = (seed = 2): Float32Array => {
  const out = samples(0.35);
  const rnd = makeRng(seed);
  const bp = new Biquad().bandpass(1400, 0.8);
  const hp = new Biquad().highpass(700);
  const bursts = [0, 0.008, 0.017, 0.026];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let env = 0;
    for (const b of bursts) {
      if (t >= b) env = Math.max(env, Math.exp(-(t - b) * 320));
    }
    if (t >= 0.026) env = Math.max(env, 0.55 * Math.exp(-(t - 0.026) * 15));
    out[i] = hp.process(bp.process(rnd() * 2 - 1)) * env * 2.2;
  }
  return out;
};

/** 808-style hat: six detuned square waves through a high band. */
export const hat = (open: boolean, seed = 3): Float32Array => {
  const length = open ? 0.45 : 0.07;
  const decay = open ? 7.5 : 70;
  const out = samples(length);
  const rnd = makeRng(seed);
  const freqs = [205.3, 304.4, 369.6, 522.7, 540, 800].map((f) => f * 1.72);
  const bp = new Biquad().bandpass(10000, 0.9);
  const hp = new Biquad().highpass(7000);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let metal = 0;
    for (const f of freqs) metal += Math.sin(TAU * f * t) > 0 ? 1 : -1;
    const sig = metal / 6 + (rnd() * 2 - 1) * 0.6;
    out[i] = hp.process(bp.process(sig)) * Math.exp(-t * decay) * 1.4;
  }
  return out;
};

/** Tight snare for rolls: a tuned body plus bright noise. */
export const snare = (pitch = 1, seed = 4): Float32Array => {
  const out = samples(0.25);
  const rnd = makeRng(seed);
  const bp = new Biquad().bandpass(3800 * pitch, 0.7);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const body =
      Math.sin(TAU * 190 * pitch * t) * Math.exp(-t * 24) * 0.55 +
      Math.sin(TAU * 330 * pitch * t) * Math.exp(-t * 32) * 0.25;
    const noise = bp.process(rnd() * 2 - 1) * Math.exp(-t * 18) * 1.1;
    out[i] = Math.tanh((body + noise) * 1.3);
  }
  return out;
};

/** Finger snap for the "Spotted" bar. */
export const snap = (seed = 5): Float32Array => {
  const out = samples(0.12);
  const rnd = makeRng(seed);
  const bp = new Biquad().bandpass(2300, 2.2);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = bp.process(rnd() * 2 - 1) * Math.exp(-t * 60) * 3;
  }
  return out;
};

/** Bass note: sine sub plus a filtered saw with a quick pluck in the filter. */
export const bass = (midi: number, length: number): Float32Array => {
  const out = samples(length + 0.05);
  const f = mtof(midi);
  const saw = new SawOsc();
  const lp = new Biquad();
  let sub = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    if (i % 16 === 0) lp.lowpass(160 + 1500 * Math.exp(-t * 16), 1.1);
    sub += (TAU * f) / SR;
    const tone = Math.sin(sub) * 0.85 + lp.process(saw.next(f)) * 0.55;
    const attack = Math.min(1, t / 0.003);
    const release = t > length ? Math.max(0, 1 - (t - length) / 0.05) : 1;
    // Short notes hold their level; long ones (the last note) die away like a struck string
    const decay = (0.72 + 0.28 * Math.exp(-t * 12)) * (length > 0.5 ? Math.exp(-t * 1.8) : 1);
    out[i] = Math.tanh(tone * attack * release * decay * 1.4);
  }
  return out;
};

const DETUNE = [-0.24, -0.15, -0.07, 0, 0.07, 0.15, 0.24];

/**
 * The supersaw: seven detuned saws per note, spread across the stereo field.
 * `cutoff` can change over the note (a function of seconds) for sweeps.
 */
export const supersaw = (
  notes: readonly number[],
  length: number,
  cutoff: number | ((t: number) => number),
  opts: {attack?: number; release?: number; seed?: number} = {},
): Stereo => {
  const attack = opts.attack ?? 0.006;
  const release = opts.release ?? 0.12;
  const out = stereo(length + release);
  const rnd = makeRng(opts.seed ?? 11);
  const voices = notes.flatMap((m) =>
    DETUNE.map((d, k) => ({
      freq: mtof(m + d),
      osc: new SawOsc(rnd()),
      left: k % 2 === 0 ? 0.85 : 0.35,
    })),
  );
  const lpL = new Biquad();
  const lpR = new Biquad();
  const cut = typeof cutoff === 'number' ? () => cutoff : cutoff;
  const scale = 1 / Math.sqrt(voices.length);
  for (let i = 0; i < out.L.length; i++) {
    const t = i / SR;
    if (i % 32 === 0) {
      const c = cut(t);
      lpL.lowpass(c, 0.8);
      lpR.lowpass(c, 0.8);
    }
    let l = 0;
    let r = 0;
    for (const v of voices) {
      const s = v.osc.next(v.freq);
      l += s * v.left;
      r += s * (1.2 - v.left);
    }
    const env = Math.min(1, t / attack) * (t > length ? Math.max(0, 1 - (t - length) / release) : 1);
    out.L[i] = lpL.process(l * scale) * env;
    out.R[i] = lpR.process(r * scale) * env;
  }
  return out;
};

/** Bright pluck for arpeggios and answers. */
export const pluck = (midi: number, length = 0.45, brightness = 1): Float32Array => {
  const out = samples(length);
  const f = mtof(midi);
  const a = new SawOsc(0.1);
  const b = new SawOsc(0.6);
  const lp = new Biquad();
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    if (i % 16 === 0) lp.lowpass(350 + 5200 * brightness * Math.exp(-t * 20), 1.4);
    const s = a.next(f) * 0.6 + b.next(f * 1.003) * 0.4;
    const env = Math.min(1, t / 0.002) * Math.exp(-t * 8);
    out[i] = lp.process(s) * env;
  }
  return out;
};

/** The notification "ding": a soft FM bell. */
export const ping = (midi: number, length = 0.6): Float32Array => {
  const out = samples(length);
  const f = mtof(midi);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const index = 1.6 * Math.exp(-t * 14);
    const bell = Math.sin(TAU * f * t + index * Math.sin(TAU * f * 2 * t));
    const shimmer = Math.sin(TAU * f * 2.76 * t) * 0.16 * Math.exp(-t * 18);
    const env = Math.min(1, t / 0.0015) * Math.exp(-t * 9);
    out[i] = (bell + shimmer) * env;
  }
  return out;
};

/** A round "bloop" for chat bubbles popping up. */
export const bloop = (from = 900, to = 520): Float32Array => {
  const out = samples(0.12);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const k = Math.min(1, t / 0.05);
    const f = from + (to - from) * k;
    phase += (TAU * f) / SR;
    out[i] = Math.sin(phase) * Math.min(1, t / 0.002) * Math.exp(-t * 32);
  }
  return out;
};

/** Upward "send" swish for AI Agent's replies. */
export const send = (): Float32Array => {
  const out = samples(0.16);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = 500 + 1600 * (t / 0.16) ** 1.5;
    phase += (TAU * f) / SR;
    out[i] = Math.sin(phase) * Math.sin((Math.PI * t) / 0.16) * 0.8;
  }
  return out;
};

/** Noise sweep plus a rising saw: builds tension into a hit. */
export const riser = (length: number, fromMidi: number, seed = 7): Stereo => {
  const out = stereo(length);
  const rnd = makeRng(seed);
  const bpL = new Biquad();
  const bpR = new Biquad();
  const saw = new SawOsc();
  const lp = new Biquad();
  for (let i = 0; i < out.L.length; i++) {
    const t = i / SR;
    const k = t / length;
    if (i % 32 === 0) {
      const f = 300 * Math.pow(30, k);
      bpL.bandpass(f, 1.2);
      bpR.bandpass(f * 1.05, 1.2);
      lp.lowpass(400 + 6000 * k * k, 0.9);
    }
    const gain = k * k;
    const tone = lp.process(saw.next(mtof(fromMidi + 12 * k))) * 0.35;
    out.L[i] = (bpL.process(rnd() * 2 - 1) * 1.6 + tone) * gain;
    out.R[i] = (bpR.process(rnd() * 2 - 1) * 1.6 + tone) * gain;
  }
  return out;
};

/** Sub drop and thud for big moments. */
export const boom = (seed = 8): Float32Array => {
  const out = samples(1.6);
  const rnd = makeRng(seed);
  const lp = new Biquad().lowpass(220);
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = 30 + 55 * Math.exp(-t * 3.5);
    phase += (TAU * f) / SR;
    const sub = Math.sin(phase) * Math.exp(-t * 2.4);
    const thud = lp.process(rnd() * 2 - 1) * Math.exp(-t * 9) * 1.5;
    out[i] = Math.tanh((sub + thud) * 1.5);
  }
  return out;
};

/** Washy crash cymbal. Reverse it for a swell into a drop. */
export const crash = (seed = 9): Float32Array => {
  const out = samples(2.2);
  const rnd = makeRng(seed);
  const hp = new Biquad().highpass(4200);
  const freqs = [263, 400, 421, 474, 587, 845].map((f) => f * 3.1);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let metal = 0;
    for (const f of freqs) metal += Math.sin(TAU * f * t) > 0 ? 1 : -1;
    const s = (rnd() * 2 - 1) * 0.8 + (metal / 6) * 0.35;
    out[i] = hp.process(s) * Math.exp(-t * 1.9) * Math.min(1, t / 0.002);
  }
  return out;
};

export const reversed = (sig: Float32Array): Float32Array => Float32Array.from(sig).reverse();
