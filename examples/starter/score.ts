/**
 * The starter score, built from timeline.js: music, interface sounds and the master, in one file.
 *
 *   node --experimental-strip-types score.ts
 *
 * Writes into out/:
 *   music.wav    the track, before mastering
 *   ui.wav       the interface sounds
 *   mix.wav      both, mastered: −12.4 LUFS, peaks at −4.7 dB, so the finished MP4 stays
 *                under −1 dBTP
 *
 * Style: modern minimalist electronic. Warm analog plucks, a soft driving bassline, a crisp
 * lo-fi groove, a future-bass drop for the close. 120 BPM, F major, swung 16ths.
 *   bars 1-2   intro: vinyl, pad, plucks, hats in bar 2, then a build (riser, snare roll,
 *              high-pass sweep) into the drop at 4 s as the window lands
 *   bars 3-5   the product: the lo-fi groove, driving bass, plucks, soft keys. A small lift
 *              into the click at 7 s; the pad joins in bar 5
 *   bar 6      the build: chords open up, the snare roll speeds up, two risers
 *   bars 7-8   the close drop at 12 s, then one last chord at 14 s ringing to silence
 *
 * How to change things:
 *   - Move a sound: change its time in timeline.js, never here.
 *   - Chords: PROG (one per bar) and the voicings in CH.
 *   - Drum patterns: the step lists in GROOVE (16 steps per bar).
 *   - Levels: MIX. Builds: the BUILDS block. Section loudness: the SECTIONS curve.
 */
import {mkdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {BAR, BEAT, CLOSE, HOOK, PRODUCT, SCENES, TEXT, TOTAL_SECONDS} from './timeline.js';

/**
 * Where the gorgias-video skill lives. The synth files come from its scripts/synth/ folder.
 * The default is where Claude Code installs personal skills. If the skill sits somewhere else,
 * run with GORGIAS_VIDEO_SKILL=/path/to/gorgias-video, or change this line.
 */
const SKILL = process.env.GORGIAS_VIDEO_SKILL ?? join(homedir(), '.claude', 'skills', 'gorgias-video');

const SYNTH = join(SKILL, 'scripts', 'synth');
const {writeWav} = await import(join(SYNTH, 'dsp.ts'));
const S = await import(join(SYNTH, 'studio.ts'));
const V = await import(join(SYNTH, 'modern.ts'));

/** A stereo buffer, as the synth files define it. */
type Stereo = {readonly L: Float32Array; readonly R: Float32Array};

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'out');
mkdirSync(OUT, {recursive: true});

const LEN = TOTAL_SECONDS;
const STEP = BEAT / 4;
const SWING = 0.02;
/** Time of a 16th step in a bar (bars count from 1), swung: every second 16th lands late. */
const at = (bar: number, step = 0, swing = true): number => (bar - 1) * BAR + step * STEP + (swing && step % 2 === 1 ? SWING : 0);
const rnd = S.makeRng(303);
const human = (): number => (rnd() - 0.5) * 0.006;

/* ───────────────────────── Harmony ───────────────────────── */

/** Voicings. `root` is the sub note; chord voicings spread over two octaves for width. */
const CH = {
  Bb: {root: 34, chord: [50, 53, 57, 60, 62, 65], pad: [50, 57, 60, 62, 65], arp: [62, 65, 69, 72, 74, 77], keys: [57, 60, 62, 65], chop: [74, 72, 69, 65]},
  C: {root: 36, chord: [48, 55, 58, 62, 65, 67], pad: [48, 55, 58, 62, 67], arp: [62, 65, 67, 70, 72, 74], keys: [58, 62, 65, 67], chop: [72, 74, 72, 67]},
  F: {root: 29, chord: [53, 57, 60, 64, 67, 72], pad: [53, 57, 60, 64, 67], arp: [64, 65, 67, 69, 72, 76], keys: [57, 60, 64, 67], chop: [72, 69, 72, 76]},
  Am: {root: 33, chord: [52, 55, 57, 60, 64, 67], pad: [52, 57, 60, 64, 67], arp: [64, 67, 69, 71, 72, 76], keys: [55, 59, 60, 64], chop: [72, 71, 69, 67]},
} as const;
type Name = keyof typeof CH;

/** One entry per bar: [chord, from step, length in steps]. Bars 2 and 6 turn to C halfway. */
const PROG: Array<Array<[Name, number, number]>> = [
  [['Bb', 0, 16]], [['Bb', 0, 8], ['C', 8, 8]],
  [['F', 0, 16]], [['Am', 0, 16]], [['Bb', 0, 16]],
  [['Bb', 0, 8], ['C', 8, 8]],
  [['F', 0, 16]], [['F', 0, 16]],
];
const chordsIn = (bar: number): Array<[Name, number, number]> => PROG[bar - 1];
const chordAtStep = (bar: number, step: number): Name => {
  for (const [n, from, len] of chordsIn(bar)) if (step >= from && step < from + len) return n;
  return chordsIn(bar)[0][0];
};

/* ───────────────────────── Buses ───────────────────────── */

const bus = (): Stereo => S.stereo(LEN);
const kicks = bus();
const snares = bus();
const hats = bus();
const perc = bus();
const subBus = bus();
const midBus = bus();
const chords = bus();
const pads = bus();
const arps = bus();
const keys = bus();
const chops = bus();
const texture = bus();
const fx = bus();
const ui = bus();
const kickTimes: number[] = [];
const pumpTimes: number[] = [];

/* ───────────────────────── Players ───────────────────────── */

const kick = (t: number, vel = 1, heavy = false): void => {
  S.place(kicks, V.lofiKick(5, {tail: heavy ? 3.4 : 4.2, punch: 1}), t, vel);
  kickTimes.push(t);
  pumpTimes.push(t);
};
const snare = (t: number, vel = 0.8, big = false): void => {
  S.place(snares, V.lofiSnare(Math.round(t * 1000), big), t, vel);
  if (big) pumpTimes.push(t);
};
const hat = (t: number, vel: number, open = false, pan = 0.25): void => S.place(hats, V.softHat(Math.round(t * 997), open), t, vel, pan);

const ARP_STEPS = [0, 2, 3, 6, 8, 10, 11, 14];
const ARP_ORDER = [0, 2, 4, 3, 1, 3, 5, 2];
const playArps = (bar: number, level: number, {octave = 0, bright = 1} = {}): void => {
  ARP_STEPS.forEach((step, i) => {
    const name = chordAtStep(bar, step);
    const vel = step % 8 === 0 ? 0.9 : 0.65;
    S.placeStereo(arps, V.analogPluck(CH[name].arp[ARP_ORDER[i]] + octave, vel, {bright}), at(bar, step) + human(), level);
  });
};

const playPad = (bar: number, level: number, attack = 0.6): void => {
  for (const [name, from, len] of chordsIn(bar)) S.placeStereo(pads, V.warmPad(CH[name].pad, len * STEP, {attack}), at(bar, from, false), level);
};

const playKeys = (bar: number, level: number): void => {
  for (const [step, dur, vel] of [[0, 5, 0.7], [7, 2, 0.5], [10, 5, 0.6]] as const) {
    const name = chordAtStep(bar, step);
    CH[name].keys.forEach((n, i) => S.placeStereo(keys, S.ep(n, dur * STEP, vel), at(bar, step) + i * 0.005, level));
  }
};

/** The soft driving bassline: a sub per half bar, a plucked mid bass on the 8ths. */
const drivingBass = (bar: number, level = 1): void => {
  for (const half of [0, 8]) {
    const name = chordAtStep(bar, half);
    S.place(subBus, V.sub(CH[name].root, 8 * STEP * 0.95), at(bar, half, false), level);
  }
  for (let step = 0; step < 16; step += 2) {
    const name = chordAtStep(bar, step);
    const up = step === 6 || step === 14 ? 12 : 0;
    S.place(midBus, V.midBass(CH[name].root + 12 + up, STEP * 1.6, step % 4 === 0 ? 0.85 : 0.6, 0.8), at(bar, step) + human(), level);
  }
};

/** The drop bass: one long sub per chord gliding from the last, a mid layer pulsing on beats. */
let lastRoot = 29;
const dropBass = (bar: number, level = 1): void => {
  for (const [name, from, len] of chordsIn(bar)) {
    S.place(subBus, V.sub(CH[name].root, len * STEP * 0.98, {from: lastRoot, glide: 0.08}), at(bar, from, false), level);
    lastRoot = CH[name].root;
    for (let step = from; step < from + len; step += 4) S.place(midBus, V.midBass(CH[name].root + 12, STEP * 3, 0.75, 0.6), at(bar, step, false), level * 0.9);
  }
};

/** Future-bass stabs: wide scooped chords on a syncopated rhythm. */
const STABS: Array<[number, number]> = [[0, 2.6], [3, 2.6], [6, 3.6], [10, 1.8], [12, 3.6]];
const playStabs = (bar: number, level: number): void => {
  for (const [step, len] of STABS) S.placeStereo(chords, V.superChord(CH[chordAtStep(bar, step)].chord, len * STEP), at(bar, step, false), level);
};

const CHOP_STEPS: Array<[number, number]> = [[0, 0.28], [3, 0.28], [6, 0.42], [10, 0.6]];
const playChops = (bar: number, level: number): void => {
  const name = chordAtStep(bar, 0);
  CHOP_STEPS.forEach(([step, len], i) => S.placeStereo(chops, V.vocalChop(CH[name].chop[i], 0.8, len, i === 3 ? 'oh' : 'ah'), at(bar, step, false), level));
};

const GROOVE = {
  lofi: {kick: [0, 7, 10], kickAlt: [0, 7, 10, 14], snare: [4, 12], rim: [3, 11], shaker: [2, 6, 10, 14]},
  drop: {kick: [0, 10], kickAlt: [0, 7, 10], snare: [8], rim: [4, 12]},
};
const HAT_VEL = [0.5, 0.18, 0.32, 0.18];

const lofiDrums = (bar: number, alt: boolean, {hatLevel = 1, kickUntil = 16} = {}): void => {
  for (const s of alt ? GROOVE.lofi.kickAlt : GROOVE.lofi.kick) if (s < kickUntil) kick(at(bar, s), s === 0 ? 1 : 0.8);
  for (const s of GROOVE.lofi.snare) snare(at(bar, s) + human(), 0.75);
  for (let s = 0; s < 16; s++) hat(at(bar, s) + human(), HAT_VEL[s % 4] * hatLevel, false, s % 2 ? 0.35 : 0.15);
  if (alt) hat(at(bar, 14), 0.22 * hatLevel, true, -0.3);
  for (const s of GROOVE.lofi.rim) S.place(perc, S.rim(bar * 31 + s), at(bar, s) + human(), 0.12, -0.45);
  for (const s of GROOVE.lofi.shaker) S.place(perc, S.shaker(bar * 17 + s), at(bar, s) + human(), 0.14, 0.5);
};

const dropDrums = (bar: number, alt: boolean): void => {
  for (const s of alt ? GROOVE.drop.kickAlt : GROOVE.drop.kick) kick(at(bar, s, false), s === 0 ? 1.05 : 0.85, true);
  for (const s of GROOVE.drop.snare) snare(at(bar, s, false), 0.85, true);
  for (let s = 0; s < 16; s += 2) hat(at(bar, s, false) + human(), s % 4 === 2 ? 0.42 : 0.26, false, s % 4 === 2 ? 0.35 : -0.2);
  if (alt) for (const s of [13, 14, 15]) hat(at(bar, s, false), 0.2 + 0.05 * (s - 13), false, 0.3);
  for (const s of GROOVE.drop.rim) S.place(perc, S.rim(bar * 41 + s), at(bar, s, false), 0.1, -0.45);
};

/** A snare roll from `from` to `to` seconds, `every` seconds apart, getting louder. */
const roll = (from: number, to: number, every: number, v0: number, v1: number): void => {
  for (let t = from; t < to - 1e-6; t += every) snare(t, v0 + ((v1 - v0) * (t - from)) / Math.max(1e-6, to - from));
};

/* ───────────────────────── Intro: bars 1-2 ───────────────────────── */

S.placeStereo(texture, V.vinyl(LEN), 0, 1);
for (const bar of [1, 2]) {
  playPad(bar, 0.55, bar === 1 ? 1.2 : 0.5);
  playArps(bar, bar === 1 ? 0.5 : 0.6, {bright: 0.8 + 0.2 * bar});
}
for (let s = 8; s < 16; s += 2) hat(at(1, s), HAT_VEL[s % 4] * 0.8);
kick(at(1, 10), 0.6);
for (let s = 0; s < 16; s++) hat(at(2, s), HAT_VEL[s % 4] * 0.9);
kick(at(2, 0), 0.85);
kick(at(2, 7), 0.6);
kick(at(2, 8), 0.85);
S.place(subBus, V.sub(CH.Bb.root, 1), at(2, 0, false), 0.7);
S.place(subBus, V.sub(CH.C.root, 0.9, {from: CH.Bb.root}), at(2, 8, false), 0.75);

/* ───────────────────────── Product: bars 3-5 ───────────────────────── */

for (let bar = 3; bar <= 5; bar++) {
  lofiDrums(bar, bar % 2 === 0);
  drivingBass(bar);
  playKeys(bar, bar >= 5 ? 0.38 : 0.48);
  playArps(bar, bar >= 5 ? 0.62 : 0.5, {bright: bar >= 5 ? 1 : 0.8});
  if (bar >= 5) playPad(bar, 0.5);
}

/* ───────────────────────── Build: bar 6 ───────────────────────── */

// Sustained chords opening up (Bb, then C halfway), the bass held, drums thinning into a roll.
for (const [name, from, len] of chordsIn(6)) {
  S.placeStereo(chords, V.superChord(CH[name].chord, len * STEP * 0.98, {scoop: false, attack: 0.05, release: 0.2}), at(6, from, false), 0.5);
  S.place(subBus, V.sub(CH[name].root, from === 0 ? len * STEP * 0.98 : len * STEP * 0.5, {from: lastRoot}), at(6, from, false), 0.9);
  lastRoot = CH[name].root;
}
playPad(6, 0.6, 0.3);
playArps(6, 0.5, {octave: 12, bright: 0.85});
for (const s of [0, 4, 8]) kick(at(6, s, false), 0.85);
for (let s = 0; s < 8; s += 2) hat(at(6, s, false), 0.24);
for (let s = 8; s < 16; s++) hat(at(6, s, false), 0.16 + 0.024 * (s - 8));

/* ───────────────────────── Close: bars 7-8 ───────────────────────── */

dropDrums(7, true);
dropBass(7);
playStabs(7, 0.55);
playPad(7, 0.6, 0.3);
playArps(7, 0.5, {octave: 12});
playChops(7, 0.38);
// The last chord, everything on F, ringing out.
kick(CLOSE.finale, 1, true);
S.placeStereo(chords, V.superChord(CH.F.chord, 1.5, {release: 0.5}), CLOSE.finale, 0.6);
S.placeStereo(pads, V.warmPad(CH.F.pad, 1.2, {attack: 0.05, release: 0.8}), CLOSE.finale, 0.6);
S.place(subBus, V.sub(CH.F.root, 1.6, {from: lastRoot}), CLOSE.finale, 1);
S.placeStereo(arps, V.analogPluck(72, 0.6, {decay: 3.5, bright: 0.4, length: 1.6}), CLOSE.finale, 0.35);
S.placeStereo(chops, V.vocalChop(72, 0.7, 0.9, 'oh'), CLOSE.finale + STEP, 0.3);

/* ───────────────────────── Builds and drops ───────────────────────── */

/** Each build ends exactly on the moment it leads to. Drops add weight on the downbeat. */
const drop = (t: number, size: number): void => {
  S.placeStereo(fx, S.crash(Math.round(t * 10), 2.6), t, 0.4 * size);
  S.place(fx, S.impact(Math.round(t * 10) + 1, 0.8), t, 0.32 * size);
  S.place(fx, V.subDrop(1.4), t, 0.28 * size);
  S.placeStereo(fx, V.downlifter(1.6, Math.round(t * 10) + 2), t, 0.22 * size);
};
const lift = (end: number, length: number, level: number): void => S.placeStereo(fx, S.swell(length, Math.round(end * 10)), end - length, level);

// Into the drop as the window lands: a riser, a 16th snare roll turning to 32nds, a swell.
const OPEN = SCENES.product.start;
S.placeStereo(fx, S.riser(2, 11), OPEN - 2, 0.45);
roll(at(2, 8, false), at(2, 14, false), STEP, 0.12, 0.35);
roll(at(2, 14, false), OPEN, STEP / 2, 0.35, 0.48);
lift(OPEN, 1, 0.5);
drop(OPEN, 0.7);
// A small lift into the click.
roll(PRODUCT.click - 3 * STEP, PRODUCT.click, STEP, 0.25, 0.45);
lift(PRODUCT.click, 0.5, 0.35);
S.placeStereo(fx, S.crash(90, 1.4), PRODUCT.click, 0.15);
// The build into the close, one bar: the roll speeds up, two risers, a swell.
const BUILD = CLOSE.hit - BAR;
roll(BUILD, BUILD + 1, STEP * 2, 0.22, 0.32);
roll(BUILD + 1, BUILD + 1.5, STEP, 0.32, 0.42);
roll(BUILD + 1.5, CLOSE.hit, STEP / 2, 0.42, 0.52);
S.placeStereo(fx, S.riser(2, 33, {from: 250, to: 7000}), BUILD, 0.3);
S.placeStereo(fx, S.riser(1, 34, {toneFrom: 60, toneTo: 91}), BUILD + 1, 0.32);
lift(CLOSE.hit, 1, 0.38);
drop(CLOSE.hit, 1.15);
// Into the last chord.
roll(CLOSE.finale - 4 * STEP, CLOSE.finale, STEP, 0.25, 0.45);
lift(CLOSE.finale, 0.5, 0.35);
S.placeStereo(fx, S.crash(380, 2), CLOSE.finale, 0.25);

/* ───────────────────────── Interface sounds ───────────────────────── */

/** Typing: a typist's pace, 6 to 11 sounds a second, on a subset of the keystrokes. */
const typing = (times: readonly number[], text: string, seed: number, level = 1): void => {
  const r = S.makeRng(seed);
  const chars = [...text];
  let last = -Infinity;
  let gap = 0;
  chars.forEach((ch, i) => {
    const t = times[i];
    const space = ch === ' ';
    const isLast = i === chars.length - 1;
    if (t - last < (space || isLast ? 0.065 : gap)) return;
    S.place(ui, V.mechKey(seed * 100 + i, 0.5 + r() * 0.35, space), t, 0.75 * level, 0.15 + (r() - 0.5) * 0.2);
    last = t;
    gap = 0.09 + r() * 0.07;
  });
};
/** A check and a reveal: the soft swell, an octave below the chord note. SWELL_GAIN sets them all at once. */
const SWELL_GAIN = S.db(-5);
const check = (t: number, midi = 72, level = 1): void => S.place(ui, V.softSwell(midi - 12, 0.5), t, level * SWELL_GAIN, -0.05);
const reveal = (t: number, midi: number, level = 0.6, pan = 0.2): void => S.place(ui, V.softSwell(midi - 12, 0.6), t, level * SWELL_GAIN, pan);
const click = (t: number, pan = 0.3, level = 0.6): void => S.place(ui, V.mechClick(Math.round(t * 100)), t, level, pan);
const swoosh = (t: number, length: number, seed: number, level: number, opts = {}): void => S.placeStereo(ui, V.airSwoosh(length, seed, opts), t, level);

// Hook
reveal(HOOK.accent, 81, 0.12, 0);
swoosh(HOOK.out, 0.6, 41, 0.45, {panFrom: 0, panTo: 0});

// Product
typing(PRODUCT.keys, TEXT.ask, 1);
click(PRODUCT.click);
swoosh(PRODUCT.click + 0.02, 0.35, 70, 0.35, {lo: 260, hi: 1700, panFrom: 0.1, panTo: 0.5});
reveal(PRODUCT.status, 84, 0.18, -0.2);
S.placeStereo(ui, S.shimmer(PRODUCT.statusDone - PRODUCT.status, [89, 91, 93, 96, 98], 51), PRODUCT.status, 0.04);
check(PRODUCT.statusDone, 72, 0.9);
PRODUCT.rows.forEach((t, i) => reveal(t, [77, 81, 84][i], [0.7, 0.6, 0.9][i], [-0.3, 0, 0.3][i]));

// Close
reveal(CLOSE.logo, 77, 0.9, 0);

/* ───────────────────────── Mix ───────────────────────── */

const MIX = {kick: 0.9, snare: 0.6, hats: 0.6, perc: 0.6, sub: 0.95, mid: 0.7, chords: 0.8, pad: 0.55, arps: 0.6, keys: 0.42, chops: 0.6, texture: 0.6, fx: 0.7, ui: 1.5};

// Drums: dusty and glued. Lo-fi means the top is rolled off a little, not gone.
S.eq(kicks, () => [new S.Filter().hp(28), new S.Filter().peak(52, 1, 2.5), new S.Filter().peak(220, 1, -1.5)]);
S.eq(snares, () => [new S.Filter().hp(140), new S.Filter().peak(200, 1, 1.5), new S.Filter().peak(4000, 1, 1.5)]);
S.eq(hats, () => [new S.Filter().hp(5000), new S.Filter().highShelf(10000, 1.5)]);
S.eq(perc, () => [new S.Filter().hp(700)]);
const drums = S.stereo(LEN);
S.sum(drums, kicks, MIX.kick);
S.sum(drums, snares, MIX.snare);
S.sum(drums, hats, MIX.hats);
S.sum(drums, perc, MIX.perc);
S.sum(drums, S.fdnReverb(snares, {decay: 1.4, size: 0.9, damp: 0.35, predelay: 0.015, lowCut: 350}), 0.4 * MIX.snare);
S.compress(drums, {threshold: -18, ratio: 3, attack: 0.008, release: 0.12, makeup: 2});
S.scale(drums, 1.6);
S.saturate(drums, 1.5);
S.scale(drums, 1 / 1.6);
S.eq(drums, () => [new S.Filter().lp(17000)]);

// Low end: the sub stays mono and ducks hard under kicks; the mid bass less.
S.multiply(subBus, S.pump(subBus.L.length, kickTimes, 0.7, 0.13));
S.eq(midBus, () => [new S.Filter().hp(70), new S.Filter().lp(3500)]);
S.multiply(midBus, S.pump(midBus.L.length, kickTimes, 0.5, 0.12));

// Chords: the future-bass pump, wide, ducked by kicks and the big snares.
S.multiply(chords, S.pump(chords.L.length, pumpTimes, 0.85, 0.22));
S.width(chords, 1.7);
// The build: the chords open from dark to bright over bar 6.
V.sweep(chords, 'lp', [[0, 18000], [BUILD - 0.1, 18000], [BUILD, 700], [CLOSE.hit - 0.05, 6000], [CLOSE.hit, 18000], [LEN, 18000]], 0.9);

S.eq(pads, () => [new S.Filter().hp(200), new S.Filter().peak(800, 0.8, -2)]);
S.multiply(pads, S.pump(pads.L.length, kickTimes, 0.45, 0.2));
V.haas(pads, 11);
S.width(pads, 1.6);

const arpEcho = S.echo(arps, BEAT * 0.75, 0.4, 3600);
S.eq(arps, () => [new S.Filter().hp(250)]);
S.width(arps, 1.6);

const keysWide = S.chorus(keys, {rate: 0.5, depth: 0.003, mix: 0.45});
S.eq(keysWide, () => [new S.Filter().hp(180), new S.Filter().peak(450, 0.9, -3)]);
S.width(keysWide, 1.6);

const chopEcho = S.echo(chops, BEAT, 0.3, 3000);
S.eq(chops, () => [new S.Filter().hp(300)]);
V.haas(chops, 9);

const tonal = S.stereo(LEN);
S.sum(tonal, chords, MIX.chords);
S.sum(tonal, pads, MIX.pad);
S.sum(tonal, arps, MIX.arps);
S.sum(tonal, arpEcho, MIX.arps * 0.45);
S.sum(tonal, keysWide, MIX.keys);
S.sum(tonal, chops, MIX.chops);
S.sum(tonal, chopEcho, MIX.chops * 0.4);
const hallSend = S.stereo(LEN);
S.sum(hallSend, pads, 0.4);
S.sum(hallSend, arps, 0.5);
S.sum(hallSend, chords, 0.25);
S.sum(hallSend, chops, 0.5);
S.sum(hallSend, keysWide, 0.35);
const hall = S.fdnReverb(hallSend, {decay: 2.8, size: 1.3, damp: 0.45, predelay: 0.03, lowCut: 320});
S.multiply(hall, S.pump(hall.L.length, kickTimes, 0.35, 0.25));
S.width(hall, 1.8);
S.sum(tonal, hall, 0.6);
S.width(tonal, 1.35);

const music = S.stereo(LEN);
S.sum(music, drums, 1);
S.sum(music, subBus, MIX.sub);
S.sum(music, midBus, MIX.mid);
S.sum(music, tonal, 1);
S.sum(music, texture, MIX.texture);
// Builds: the whole music bus thins from the bottom up, then snaps back on the drop.
V.sweep(music, 'hp', [
  [0, 18], [OPEN - 2, 18], [OPEN - 0.03, 520], [OPEN, 18],
  [CLOSE.hit - 1, 18], [CLOSE.hit - 0.03, 650], [CLOSE.hit, 18], [LEN, 18],
], 0.8);
S.sum(music, fx, MIX.fx);
V.monoBass(music, 140);
S.multiply(music, S.automation(music.L.length, [[0, 1], [LEN - 0.9, 1], [LEN - 0.02, 0], [LEN, 0]]));
S.eq(music, () => [new S.Filter().hp(24), new S.Filter().peak(210, 0.7, 2), new S.Filter().highShelf(8500, 2.5)]);
// Glue: a bus compressor and a soft clipper bring the peaks closer to the body, so the
// master limiter does little and the sections keep their contrast.
S.scale(music, S.db(-4.4 - S.peakDb(music)));
S.compress(music, {threshold: -20, ratio: 2.5, attack: 0.015, release: 0.18, knee: 8, makeup: 3});
S.scale(music, 2);
S.saturate(music, 1.25);
S.scale(music, 0.5);
// SECTIONS: the intro and the groove sit lower, so each drop lands as the loudest moment.
// Each drop hits at full level, then the section settles; the build sits under its drop.
S.multiply(music, S.automation(music.L.length, [
  [0, 0.78], [OPEN - 0.05, 0.76], [OPEN, 1.05], [OPEN + 1, 0.74], [BUILD - 0.05, 0.78],
  [BUILD, 0.66], [CLOSE.hit - 0.05, 0.66], [CLOSE.hit, 1.1], [CLOSE.finale, 1], [LEN, 1],
]));

const uiRoom = S.fdnReverb(ui, {decay: 1, size: 0.7, damp: 0.3, predelay: 0.012, lowCut: 500});
S.sum(ui, uiRoom, 0.3);
S.eq(ui, () => [new S.Filter().hp(110)]);

const scaled = (b: Stereo, peak: number): Stereo => {
  S.scale(b, S.db(peak - S.peakDb(b)));
  return b;
};
writeWav(join(OUT, 'music.wav'), scaled(S.copy(music), -4.4));
writeWav(join(OUT, 'ui.wav'), scaled(S.copy(ui), -4.4));

/* ───────────────────────── Master ───────────────────────── */

const TARGET = Number(process.env.TARGET ?? -12.4);
const CEILING = Number(process.env.CEILING ?? -4.7);
const premix = S.stereo(LEN);
const musicIn = scaled(S.copy(music), -6);
const uiIn = scaled(S.copy(ui), -6);
S.scale(uiIn, MIX.ui);
// The music dips a couple of dB under each interface sound, so clicks and reveals read.
S.compress(musicIn, {key: uiIn, threshold: -24, ratio: 2.5, attack: 0.002, release: 0.12, knee: 6});
S.sum(premix, musicIn, 1);
S.sum(premix, uiIn, 1);
S.compress(premix, {threshold: -12, ratio: 1.5, attack: 0.02, release: 0.2, knee: 6});

/** Drive the premix into the limiter; search for the drive that hits the loudness target. */
const masterAt = (driveDb: number): Stereo => {
  const m = S.copy(premix);
  S.scale(m, S.db(driveDb));
  S.limit(m, CEILING, {lookahead: 0.005, release: 0.06});
  return m;
};
let lo = -6;
let hi = 18;
let best = masterAt(0);
for (let i = 0; i < 12; i++) {
  const mid = (lo + hi) / 2;
  const m = masterAt(mid);
  if (S.lufs(m) < TARGET) lo = mid;
  else hi = mid;
  best = m;
}
writeWav(join(OUT, 'mix.wav'), best);
process.stdout.write(`Wrote out/music.wav, out/ui.wav, out/mix.wav. Mix: ${S.lufs(best).toFixed(2)} LUFS, peak ${S.peakDb(best).toFixed(2)} dBFS, drive ${((lo + hi) / 2).toFixed(2)} dB.\n`);
