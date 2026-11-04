/**
 * The three scenes. Each builder returns an element with `update(seconds)`.
 *   hook     0-4 s    the two-line headline, its accent, the exit into the product
 *   product  4-12 s   a window under a moving camera: typing, a click, the result
 *   close    12-16 s  the line on ink and the Gorgias logo
 */
import {bar, caretOpacity, cursor, fill, h, ICON, img, lineIcon, statusChip, typedCount, windowFrame} from './components.js';
import {clamp, css, drift, EASE, enter, keyframes, lerp, offsetIn, pop, prog, speed} from './motion.js';
import {COLOR, COPY, FONT} from './theme.js';
import {CLOSE, HOOK, PRODUCT, SCENES, TEXT} from './timeline.js';

const W = 1920;
const H = 1080;

/** A faint hairline grid, drawn once as an SVG pattern. */
const grid = (color, step = 64) => {
  const id = `grid-${color.replace('#', '')}`;
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('width', String(W));
  el.setAttribute('height', String(H));
  el.innerHTML = `<defs><pattern id="${id}" width="${step}" height="${step}" patternUnits="userSpaceOnUse"><path d="M ${step} 0 L 0 0 0 ${step}" fill="none" stroke="${color}" stroke-width="1.5"/></pattern></defs><rect width="100%" height="100%" fill="url(#${id})"/>`;
  css(el, {position: 'absolute', left: 0, top: 0});
  return el;
};

/* ───────── Hook: 0-4 s ───────── */

export const hook = () => {
  const [lineOne, lineTwo] = COPY.hookLines;
  const cut = lineTwo.lastIndexOf(COPY.hookAccent);
  const accentWord = h('span', {position: 'relative', display: 'inline-block'}, COPY.hookAccent);
  const underline = h('div', {position: 'absolute', left: 0, right: 0, bottom: '-0.04em', height: '0.07em', borderRadius: '0.035em', background: COLOR.coral, transformOrigin: '0% 50%', scale: '0 1'});
  accentWord.append(underline);
  /* Each line is one run of text, so the headline can be fitted to the frame. */
  const runs = [
    h('span', {display: 'inline-block', whiteSpace: 'nowrap'}, lineOne),
    h('span', {display: 'inline-block', whiteSpace: 'nowrap'}, [lineTwo.slice(0, cut), accentWord, lineTwo.slice(cut + COPY.hookAccent.length)]),
  ];
  const headline = h(
    'div',
    {position: 'absolute', left: 0, top: 0, width: W, textAlign: 'center', fontFamily: FONT.display, fontWeight: 400, fontSize: 160, lineHeight: 1.06, letterSpacing: '-0.015em', color: COLOR.ink, transformOrigin: '50% 50%'},
    runs.map((r) => h('div', {}, [r])),
  );
  /** The longer line fills HEADLINE_WIDTH. Measured every frame, so it is right once fonts load. */
  const HEADLINE_WIDTH = 1500;
  const world = h('div', {position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '50% 50%'}, [headline]);
  const el = fill({background: COLOR.paper, overflow: 'hidden'}, [grid('#F1ECE6'), world]);

  el.update = (t) => {
    css(headline, {fontSize: 160});
    const widest = Math.max(...runs.map((r) => r.offsetWidth));
    css(headline, {fontSize: (160 * HEADLINE_WIDTH) / widest});
    const headH = headline.offsetHeight;
    /* Full size and centred from frame 0, a slow push, then out on the build's peak. */
    const out = prog(t, HOOK.out, 0.5, EASE.in);
    const d = drift(t, 'hook', 3);
    css(headline, {
      top: H / 2 - headH / 2,
      scale: (1 + 0.04 * EASE.out(clamp(t / HOOK.out))).toFixed(4),
      translate: `${d.x.toFixed(2)}px ${(d.y - out * 30).toFixed(2)}px`,
      opacity: 1 - out,
      filter: out > 0.01 ? `blur(${(out * 10).toFixed(2)}px)` : 'none',
    });
    css(underline, {scale: `${prog(t, HOOK.accent, 0.6, EASE.glide).toFixed(4)} 1`});
    const k = clamp((t - HOOK.accent) / 0.5);
    css(accentWord, {scale: (1 + (t >= HOOK.accent ? Math.sin(k * Math.PI) * 0.06 : 0)).toFixed(4)});
    css(world, {scale: (1 + 0.015 * clamp(t / SCENES.hook.seconds)).toFixed(4)});
  };
  return el;
};

/* ───────── Product: 4-12 s ───────── */

/** The window, in its own pixels. The camera scales it; the close-up on Run is about 2x. */
const WIN = {width: 1760, height: 1180, pad: 88};

/** A neutral app window: a header, a command box with a Run button, a status chip, results. */
const productWindow = () => {
  const header = h('div', {display: 'flex', alignItems: 'center', gap: 24, height: 120, padding: `0 ${WIN.pad}px`, borderBottom: `2px solid ${COLOR.border}`}, [
    lineIcon(ICON.inbox, 44, COLOR.head, 2),
    h('span', {fontFamily: FONT.sans, fontSize: 40, fontWeight: 600, color: COLOR.head}, COPY.windowTitle),
    h('div', {flex: '1'}),
    bar(180, 22),
    bar(120, 22),
  ]);
  const typed = h('span', {}, '');
  const placeholder = h('span', {color: COLOR.mute}, COPY.placeholder);
  const caret = h('span', {display: 'inline-block', width: 3, height: 46, background: COLOR.ink, verticalAlign: 'text-bottom', marginLeft: 2});
  const field = h('div', {flex: '1', display: 'flex', alignItems: 'center', gap: 24, height: 112, padding: '0 36px', borderRadius: 28, background: COLOR.white, border: `2px solid ${COLOR.border}`, boxSizing: 'border-box'}, [
    lineIcon(ICON.search, 40, COLOR.mute, 2),
    h('div', {fontFamily: FONT.sans, fontSize: 40, color: COLOR.ink, whiteSpace: 'nowrap'}, [typed, caret, placeholder]),
  ]);
  const button = h('div', {display: 'grid', placeItems: 'center', height: 112, padding: '0 64px', borderRadius: 28, background: COLOR.ink, color: COLOR.onInk, fontFamily: FONT.sans, fontSize: 40, fontWeight: 600, flex: 'none'}, COPY.button);
  const command = h('div', {display: 'flex', gap: 28, alignItems: 'center'}, [field, button]);
  const status = statusChip(COPY.status, COPY.statusDone, 34);
  const rows = COPY.rows.map((row) => {
    const tag = h('div', {display: 'flex', alignItems: 'center', gap: 14, padding: '14px 26px', borderRadius: 999, background: COLOR.coralSoft, fontFamily: FONT.mono, fontSize: 30, fontWeight: 500, color: COLOR.ink, flex: 'none'}, [
      lineIcon(ICON.tag, 30, COLOR.ink, 2),
      row.tag,
    ]);
    const el = h('div', {display: 'flex', alignItems: 'center', gap: 32, height: 124, padding: '0 36px', borderRadius: 24, background: COLOR.white, border: `2px solid ${COLOR.border}`, boxSizing: 'border-box', opacity: 0}, [
      h('div', {width: 56, height: 56, borderRadius: '50%', background: COLOR.faded, flex: 'none'}),
      h('span', {fontFamily: FONT.sans, fontSize: 38, fontWeight: 500, color: COLOR.head, whiteSpace: 'nowrap'}, row.title),
      h('div', {flex: '1'}),
      tag,
    ]);
    el.tag = tag;
    return el;
  });
  const list = h('div', {display: 'flex', flexDirection: 'column', gap: 24}, rows);
  const body = h('div', {display: 'flex', flexDirection: 'column', gap: 56, padding: `${WIN.pad}px`}, [command, h('div', {}, [status]), list]);
  const el = windowFrame(WIN.width, WIN.height, COLOR.cream, [header, body]);
  return {el, parts: {field, typed, placeholder, caret, button, status, list, rows}};
};

export const product = () => {
  const win = productWindow();
  const p = win.parts;
  const arrow = cursor(60);
  const plate = h('div', {position: 'absolute', left: 0, top: 0, width: WIN.width, height: WIN.height, transformOrigin: '0 0'}, [win.el, arrow]);
  const el = fill({background: COLOR.paper, overflow: 'hidden'}, [grid('#F1ECE6'), plate]);

  /** Centre of a part in window coordinates. Measured every frame, so layout changes follow. */
  const centre = (node) => {
    const o = offsetIn(node, win.el);
    return {x: o.x + o.w / 2, y: o.y + o.h / 2, w: o.w, h: o.h, top: o.y, bottom: o.y + o.h};
  };
  /** Keep the view inside the window; when the view is wider than the window, centre on it. */
  const inside = (v, half, size) => (half * 2 >= size ? size / 2 : clamp(v, half, size - half));

  el.update = (t) => {
    /* ── Typing, the click, the result ── */
    const n = typedCount(t, PRODUCT.keys);
    p.typed.textContent = TEXT.ask.slice(0, n);
    p.placeholder.textContent = n > 0 ? '' : COPY.placeholder;
    const lastKey = n > 0 ? PRODUCT.keys[n - 1] : PRODUCT.keys[0] - 1;
    css(p.caret, {opacity: t >= PRODUCT.click ? 0 : caretOpacity(t, lastKey)});
    const press = t >= PRODUCT.click && t < PRODUCT.click + 0.2 ? 0.94 : 1;
    css(p.button, {scale: press, opacity: n === PRODUCT.keys.length ? 1 : 0.4});
    p.status.update(t, PRODUCT.status, PRODUCT.statusDone);
    p.rows.forEach((row, i) => {
      const r = prog(t, PRODUCT.rows[i], 0.5);
      css(row, {opacity: clamp(r * 1.5), translate: `0px ${((1 - r) * 40).toFixed(2)}px`, filter: r < 1 ? `blur(${((1 - r) * 8).toFixed(2)}px)` : 'none'});
      const tg = pop(t, PRODUCT.rows[i] + 0.15, 0.45);
      css(row.tag, {scale: (0.6 + 0.4 * tg).toFixed(3), opacity: clamp(tg * 3)});
    });

    /* ── The cursor: one click on Run ── */
    const btn = centre(p.button);
    const from = PRODUCT.click - 0.9;
    if (t >= from && t < PRODUCT.click + 0.6) {
      const mv = prog(t, from, 0.75, EASE.glide);
      const fadeIn = clamp((t - from) / 0.15);
      const fadeOut = 1 - prog(t, PRODUCT.click + 0.25, 0.3);
      arrow.update(lerp(WIN.width - 80, btn.x + 6, mv), lerp(WIN.height + 80, btn.y + 8, mv), fadeIn * fadeOut, t >= PRODUCT.click ? t - PRODUCT.click : -1);
    } else {
      arrow.update(0, 0, 0, -1);
    }

    /* ── The camera ── */
    /* Every key hangs off a time in timeline.js, so the camera follows a retime. */
    const field = centre(p.field);
    const status = centre(p.status);
    const list = centre(p.list);
    const results = (status.top + list.bottom) / 2;
    const lastKeyAt = PRODUCT.keys[PRODUCT.keys.length - 1];
    const keys = [
      {t: PRODUCT.enter, x: WIN.width / 2, y: WIN.height / 2, s: 0.82},
      {t: PRODUCT.enter + 0.7, x: WIN.width / 2, y: WIN.height / 2, s: 0.86, ease: EASE.out},
      {t: PRODUCT.keys[0] - 0.05, x: WIN.width / 2, y: field.y + 40, s: 1.15},
      {t: lastKeyAt, x: WIN.width / 2 + 20, y: field.y + 30, s: 1.2, ease: EASE.linear},
      {t: PRODUCT.click - 0.05, x: btn.x, y: btn.y, s: 2.1},
      {t: PRODUCT.click + 0.05, x: btn.x, y: btn.y, s: 2.14, ease: EASE.linear},
      {t: PRODUCT.status + 0.1, x: WIN.width / 2, y: (field.y + status.bottom) / 2, s: 1.15},
      {t: PRODUCT.statusDone, x: WIN.width / 2 + 10, y: (field.y + status.bottom) / 2 + 6, s: 1.17, ease: EASE.linear},
      {t: PRODUCT.rows[1], x: WIN.width / 2, y: results, s: 1.0},
      {t: PRODUCT.fadeOut, x: WIN.width / 2 + 10, y: results + 6, s: 1.05, ease: EASE.linear},
      {t: CLOSE.hit, x: WIN.width / 2 + 10, y: results + 6, s: 0.98, ease: EASE.in},
    ];
    const raw = keyframes(t, keys);
    const cam = {...raw, x: inside(raw.x, W / 2 / raw.s, WIN.width), y: inside(raw.y, H / 2 / raw.s, WIN.height)};
    const d = drift(t, 'product-cam', 4);
    const tx = W / 2 - cam.x * cam.s + d.x;
    const ty = H / 2 - cam.y * cam.s + d.y;
    /* A touch of blur while the camera moves fast, like a real shutter. */
    const zoomSpeed = Math.abs(speed(t, keys, 's')) / Math.max(0.5, cam.s);
    const panSpeed = Math.hypot(speed(t, keys, 'x'), speed(t, keys, 'y')) * cam.s;
    const blur = Math.min(6, zoomSpeed * 1.1 + panSpeed / 1600);
    /* The window lands on the drop: already a third visible on its first frame. */
    const landed = 0.3 + 0.7 * prog(t, PRODUCT.enter, 0.6);
    const fadeOut = prog(t, PRODUCT.fadeOut, 0.5, EASE.in);
    const soft = (blur > 0.6 ? blur : 0) + (1 - landed) * 12 + fadeOut * 14;
    css(plate, {
      translate: `${tx.toFixed(2)}px ${(ty + (1 - landed) * 60).toFixed(2)}px`,
      scale: cam.s.toFixed(4),
      filter: soft > 0.05 ? `blur(${soft.toFixed(2)}px)` : 'none',
      opacity: clamp(landed * 1.2) * (1 - fadeOut),
    });
  };
  return el;
};

/* ───────── Close: 12-16 s ───────── */

export const close = () => {
  const headline = h('div', {position: 'absolute', left: 0, width: W, top: 330, textAlign: 'center', fontFamily: FONT.display, fontWeight: 400, fontSize: 150, lineHeight: 1.04, letterSpacing: '-0.015em', color: COLOR.onInk}, COPY.close);
  const logo = img('/brand/primary-logo-white.svg', {position: 'absolute', left: W / 2 - 200, top: 650, width: 400});
  const orbit = img('/brand/2026/orbit-dark.svg', {position: 'absolute', width: 900, right: -300, bottom: -420, opacity: 0.9});
  const el = fill({background: COLOR.ink, overflow: 'hidden'}, [grid('#232221'), orbit, headline, logo]);
  el.update = (t) => {
    const d = drift(t, 'close', 3);
    enter(headline, prog(t, CLOSE.hit, 0.8), {rise: 40, blur: 12, x: d.x, y: d.y});
    css(headline, {scale: (1.04 - 0.04 * EASE.out(clamp((t - CLOSE.hit) / 2.5))).toFixed(4)});
    const b = pop(t, CLOSE.logo, 0.55);
    css(logo, {scale: (0.7 + 0.3 * b).toFixed(4), opacity: clamp(b * 2.5), translate: `0px ${(d.y * 0.6 + (1 - b) * 24).toFixed(2)}px`});
    css(orbit, {rotate: `${((t - CLOSE.hit) * 4).toFixed(3)}deg`});
  };
  return el;
};
