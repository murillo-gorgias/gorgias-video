/**
 * The parts of the picture, built once as DOM and styled per frame by the scenes.
 * Gorgias parts follow brand:core. The window is a neutral, made-up interface: swap it for
 * a recreation of the real product screen the video is about.
 */
import {clamp, css, EASE, pop, prog} from './motion.js';
import {COLOR, FONT} from './theme.js';

/** Make an element with styles and children. Strings become text. */
export const h = (tag, style = {}, children = []) => {
  const el = document.createElement(tag);
  css(el, style);
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child === null || child === undefined) continue;
    el.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
};

export const img = (src, style = {}) => {
  const el = document.createElement('img');
  el.src = src;
  css(el, {display: 'block', ...style});
  return el;
};

export const fill = (style = {}, children = []) => h('div', {position: 'absolute', inset: '0', ...style}, children);

const SVG = 'http://www.w3.org/2000/svg';

/** A small stroked line icon (24 grid), drawn from a list of path strings. */
export const lineIcon = (paths, size, color, width = 1.8) => {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  for (const d of paths) {
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', String(width));
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
  }
  css(svg, {display: 'block', flex: 'none'});
  return svg;
};

export const ICON = {
  search: ['M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M16 16l4 4'],
  inbox: ['M4 13l2.5-7h11l2.5 7v5H4z', 'M4 13h5l1 2h4l1-2h5'],
  tag: ['M4 4h7l9 9-7 7-9-9z', 'M8.5 8.5h.01'],
  check: ['M6 12.5l4 4 8-9'],
};

/** A grey placeholder bar, for text the viewer does not need to read. */
export const bar = (width, height = 18, color = COLOR.faded) => h('div', {width, height, borderRadius: height / 2, background: color, flex: 'none'});

/* ───────── The cursor ───────── */

/** An arrow pointer. `update(x, y, opacity, click)` places its tip and squeezes it on a click. */
export const cursor = (size = 56) => {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', 'M4.5 2.5v17.2l4.4-4.2 2.9 6.6 3-1.3-2.9-6.5h6.2z');
  path.setAttribute('fill', '#111111');
  path.setAttribute('stroke', '#FFFFFF');
  path.setAttribute('stroke-width', '1.4');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  const ring = h('div', {
    position: 'absolute',
    left: -size * 0.5,
    top: -size * 0.5,
    width: size,
    height: size,
    borderRadius: '50%',
    border: `${size * 0.05}px solid rgba(17,17,17,0.35)`,
    opacity: 0,
  });
  const arrow = h('div', {position: 'absolute', left: -size * 0.19, top: -size * 0.1, transformOrigin: '19% 10%'}, [svg]);
  const el = h('div', {position: 'absolute', left: 0, top: 0, width: 0, height: 0, zIndex: 50, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.18))'}, [
    ring,
    arrow,
  ]);
  /** `click` is seconds since the last click, or a negative number when none. */
  el.update = (x, y, opacity, click) => {
    css(el, {translate: `${x.toFixed(2)}px ${y.toFixed(2)}px`, opacity});
    const squeeze = click >= 0 && click < 0.3 ? 1 - 0.16 * Math.sin((click / 0.3) * Math.PI) : 1;
    css(arrow, {scale: squeeze.toFixed(3)});
    const r = click >= 0 && click < 0.5 ? click / 0.5 : 1;
    css(ring, {opacity: (1 - r) * 0.9, scale: (0.4 + EASE.out(r) * 1.4).toFixed(3)});
  };
  return el;
};

/* ───────── Typed text ───────── */

export const caretOpacity = (seconds, lastKey) => (seconds - lastKey < 0.5 ? 1 : Math.floor((seconds - lastKey) * 2) % 2 === 0 ? 0 : 1);

/** How many characters are typed at `seconds`, from the keystroke times. */
export const typedCount = (seconds, keys) => {
  let n = 0;
  while (n < keys.length && keys[n] <= seconds) n++;
  return n;
};

/* ───────── Status chip ───────── */

/** A spinner ring that turns at a constant speed, from the frame time. */
const spinner = (size, color) => {
  const el = h('div', {
    width: size,
    height: size,
    borderRadius: '50%',
    border: `${size * 0.13}px solid ${color}`,
    borderTopColor: 'transparent',
    boxSizing: 'border-box',
    flex: 'none',
  });
  el.update = (seconds) => css(el, {rotate: `${(seconds * 400) % 360}deg`});
  return el;
};

/** A green check in a circle. */
export const doneCheck = (size) =>
  h('div', {width: size, height: size, borderRadius: '50%', background: COLOR.success, display: 'grid', placeItems: 'center', flex: 'none'}, [
    lineIcon(ICON.check, size * 0.72, COLOR.white, 2.8),
  ]);

/** A label with a spinner that turns into a green check. The label swaps when done. */
export const statusChip = (label, doneLabel, fontSize = 28) => {
  const size = fontSize * 1.05;
  const text = h('span', {fontFamily: FONT.sans, fontSize, fontWeight: 500, color: COLOR.body, whiteSpace: 'nowrap'}, label);
  const spin = spinner(size, COLOR.mute);
  const check = doneCheck(size);
  const status = h('div', {position: 'relative', width: size, height: size, flex: 'none'}, [
    h('div', {position: 'absolute', inset: 0}, [spin]),
    h('div', {position: 'absolute', inset: 0}, [check]),
  ]);
  const el = h(
    'div',
    {
      display: 'inline-flex',
      alignItems: 'center',
      gap: fontSize * 0.55,
      padding: `${fontSize * 0.5}px ${fontSize * 0.75}px`,
      borderRadius: fontSize * 0.75,
      background: COLOR.white,
      border: `2px solid ${COLOR.border}`,
      opacity: 0,
    },
    [status, text],
  );
  /** `start` the chip appears, `done` the check lands. */
  el.update = (seconds, start, done) => {
    const p = prog(seconds, start, 0.45);
    css(el, {opacity: p, translate: `0px ${((1 - p) * 18).toFixed(2)}px`, filter: p < 1 ? `blur(${((1 - p) * 6).toFixed(2)}px)` : 'none'});
    spin.update(seconds);
    const c = pop(seconds, done, 0.45);
    css(spin, {opacity: 1 - clamp((seconds - done) / 0.12)});
    css(check, {opacity: clamp(c * 3), scale: c.toFixed(3)});
    text.textContent = seconds >= done ? doneLabel : label;
  };
  return el;
};

/* ───────── Window frame ───────── */

/** A floating app window: rounded, hairline border, soft shadow. */
export const windowFrame = (width, height, background, children) =>
  h(
    'div',
    {
      position: 'absolute',
      left: 0,
      top: 0,
      width,
      height,
      borderRadius: 36,
      overflow: 'hidden',
      background,
      border: '2px solid rgba(27,26,25,0.08)',
      boxShadow: '0 40px 120px rgba(27,26,25,0.10), 0 8px 24px rgba(27,26,25,0.06)',
      boxSizing: 'border-box',
    },
    children,
  );
