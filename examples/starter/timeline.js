/**
 * The beat grid. The page (video.js) and the score (score.ts) both read this file, so the
 * picture and the sound stay locked together.
 *
 * 120 BPM: one beat is 0.5 s and one bar is 2 s. Every scene is a whole number of bars and
 * every cut lands on a downbeat. All times are seconds from the start of the video.
 * Only times that a sound depends on live here. Purely visual timings sit in the scenes.
 *
 * Changed a time here? Run `npm run score` to rebuild the sound.
 * Changed a scene length? Also update TOTAL_SECONDS and the frame count in index.html.
 */

export const FPS = 30;
export const BPM = 120;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;

/** Three scenes, 8 bars, 16 seconds. */
export const SCENES = {
  hook: {start: 0, seconds: 4}, // bars 1-2
  product: {start: 4, seconds: 8}, // bars 3-6
  close: {start: 12, seconds: 4}, // bars 7-8
};

export const TOTAL_SECONDS = 16;

/** Repeatable jitter, so typing sounds and typed letters always agree. */
const jitter = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

/**
 * One time per typed character. Letters come at `cps` per second with a little human
 * unevenness; spaces and punctuation take a touch longer. Returns times in seconds.
 */
export const keystrokes = (text, start, cps, seed) => {
  const rnd = jitter(seed);
  const times = [];
  let t = start;
  for (const ch of text) {
    times.push(Math.round(t * 1000) / 1000);
    const pause = ch === ' ' ? 1.25 : /[,.?'!]/.test(ch) ? 1.6 : 1;
    t += (pause * (0.75 + rnd() * 0.5)) / cps;
  }
  return times;
};

/** Every word on screen that is typed. The scenes render these exact strings. */
export const TEXT = {
  ask: 'Tag every late-delivery ticket',
};

/** Bars 1-2: the headline, its accent, the build into the product. */
export const HOOK = {
  accent: 1, // the coral underline draws under the accent word
  out: 3.5, // the headline leaves as the build peaks
};

/** Bars 3-6: the interface. Typing, the click, the result. */
export const PRODUCT = {
  enter: 4, // the drop: the window lands
  keys: keystrokes(TEXT.ask, 4.8, 24, 11),
  click: 7, // the cursor clicks Run, on beat 3 of bar 4
  status: 7.25, // "Tagging tickets" with a spinner
  statusDone: 8.25, // green check
  rows: [8.5, 8.75, 9], // the three result rows reveal, one per beat
  fadeOut: 11.5, // the window fades out under the build
};

/** Bars 7-8: the close on ink. */
export const CLOSE = {
  hit: 12, // the drop: ink field, headline
  logo: 12.75, // the Gorgias logo reveals
  finale: 14, // the last chord, ringing to the end
};
