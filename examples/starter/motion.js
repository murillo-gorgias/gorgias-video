/**
 * Motion helpers. Everything takes seconds, never frames, and reads nothing from a clock.
 * The curves are the house curves from the skill's reference/motion.md, via runtime.js.
 */

export const EASE = window.video.ease;

/** 0 before `start`, 1 after `start + length`, eased between. Seconds in. */
export const prog = (seconds, start, length, ease = EASE.out) => window.video.progress(seconds, start, length, ease);

/** Map `x` from [a, b] to [c, d], clamped at both ends, with an optional curve. */
export const interp = (x, [a, b], [c, d], ease = null) => {
  if (b === a) return x >= a ? d : c;
  let t = (x - a) / (b - a);
  t = Math.min(1, Math.max(0, t));
  if (ease) t = ease(t);
  return c + (d - c) * t;
};

export const lerp = (a, b, t) => a + (b - a) * t;

export const clamp = (x, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

/** Set several style properties at once. Numbers for lengths get px. */
export const css = (el, props) => {
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;
    el.style[key] = typeof value === 'number' && !UNITLESS.has(key) ? `${value}px` : String(value);
  }
  return el;
};

const UNITLESS = new Set(['opacity', 'zIndex', 'fontWeight', 'lineHeight', 'flex', 'scale', 'order']);

/** The house entrance: fade up from a light blur with a rise. `p` is 0..1. */
export const enter = (el, p, {rise = 32, blur = 10, x = 0, y = 0} = {}) =>
  css(el, {
    opacity: clamp(p * 1.4),
    translate: `${x.toFixed(2)}px ${(y + (1 - p) * rise).toFixed(2)}px`,
    filter: p < 1 ? `blur(${((1 - p) * blur).toFixed(2)}px)` : 'none',
  });

/** The house exit: quicker and plainer. `p` is 0..1, 1 means gone. */
export const leave = (el, p, {drop = 24, blur = 8, x = 0, y = 0} = {}) =>
  css(el, {
    opacity: 1 - p,
    translate: `${x.toFixed(2)}px ${(y + p * drop).toFixed(2)}px`,
    filter: p > 0 ? `blur(${(p * blur).toFixed(2)}px)` : 'none',
  });

/**
 * A slow, seeded drift of a few pixels over several seconds, so nothing ever stops dead.
 * Two sines per axis at different speeds. Returns px.
 */
export const drift = (seconds, seed, amount = 3) => {
  const phase = (k) => window.video.random(`${seed}-${k}`) * Math.PI * 2;
  const x = Math.sin(seconds * 0.42 + phase(1)) * amount + Math.sin(seconds * 0.19 + phase(2)) * amount * 0.5;
  const y = Math.cos(seconds * 0.33 + phase(3)) * amount + Math.sin(seconds * 0.23 + phase(4)) * amount * 0.5;
  return {x, y};
};

/**
 * Keyframed values for camera moves. `keys` is a list of {t, ...values, ease}, in time order.
 * Between two keys the values travel on the later key's curve (glide by default).
 * Before the first key and after the last, the values hold.
 */
export const keyframes = (seconds, keys) => {
  if (seconds <= keys[0].t) return {...keys[0]};
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (seconds <= b.t) {
      const curve = b.ease || EASE.glide;
      const p = curve(clamp((seconds - a.t) / (b.t - a.t)));
      const out = {};
      for (const key of Object.keys(b)) {
        if (key === 't' || key === 'ease') continue;
        out[key] = lerp(a[key] ?? b[key], b[key], p);
      }
      return out;
    }
  }
  return {...keys[keys.length - 1]};
};

/** How fast a keyframed value moves at `seconds`, in units per second. For motion blur. */
export const speed = (seconds, keys, key, fps = 30) => {
  const a = keyframes(seconds - 0.5 / fps, keys)[key];
  const b = keyframes(seconds + 0.5 / fps, keys)[key];
  return (b - a) * fps;
};

/** A pop with a small overshoot: 0 → 1, overshooting about 6%. */
export const pop = (seconds, start, length = 0.5) => window.video.progress(seconds, start, length, EASE.back);

/** Layout position of `el` inside `root`, ignoring transforms. */
export const offsetIn = (el, root) => {
  let x = 0;
  let y = 0;
  let node = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent;
  }
  return {x, y, w: el.offsetWidth, h: el.offsetHeight};
};
