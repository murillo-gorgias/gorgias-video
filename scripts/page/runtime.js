/**
 * The page runtime for the capture pipeline. Copy this file into the video project
 * and include it before the video's own script:
 *
 *   <script src="runtime.js"></script>
 *   <script>
 *     window.VIDEO = {width: 1080, height: 1350, fps: 30, frames: 750};
 *     video.onFrame((frame, seconds) => { ... draw everything from frame ... });
 *   </script>
 *
 * What it gives the page:
 *   video.onFrame(fn)        register a draw function. Called with (frame, seconds).
 *   video.hold(name)         take a hold while something loads. Returns the release function.
 *   video.random(seed)       repeatable noise in 0..1 for a string or number seed.
 *   video.ease.out(t) etc.   the house easing curves from reference/motion.md.
 *   video.progress(seconds, start, length, ease)   0 before start, 1 after start+length.
 *
 * What the capture script uses:
 *   video.setFrame(n)        draw frame n.
 *   video.ready()            true when no holds are open and fonts and images have loaded.
 *   video.pendingNames()     the names of the open holds, for the error message.
 *
 * In a browser, `?play` runs the video on a clock with sound, `?frame=N` shows one frame,
 * `?play&from=10` starts at 10 s. The capture script never uses the clock.
 */
(function () {
  'use strict';

  const renderers = [];
  const holds = new Map();
  let holdId = 0;
  let frame = 0;
  let lastError = null;

  const cfg = () => window.VIDEO || {width: 1080, height: 1080, fps: 30, frames: 1};

  /* ───────── Easing: cubic beziers, the same five curves as motion.md ───────── */

  const bezier = (x1, y1, x2, y2) => {
    const A = (a1, a2) => 1 - 3 * a2 + 3 * a1;
    const B = (a1, a2) => 3 * a2 - 6 * a1;
    const C = (a1) => 3 * a1;
    const calc = (t, a1, a2) => ((A(a1, a2) * t + B(a1, a2)) * t + C(a1)) * t;
    const slope = (t, a1, a2) => 3 * A(a1, a2) * t * t + 2 * B(a1, a2) * t + C(a1);
    return (x) => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const s = slope(t, x1, x2);
        if (Math.abs(s) < 1e-6) break;
        t -= (calc(t, x1, x2) - x) / s;
      }
      return calc(t, y1, y2);
    };
  };

  const ease = {
    out: bezier(0.16, 1, 0.3, 1),
    glide: bezier(0.5, 0, 0.2, 1),
    back: bezier(0.34, 1.56, 0.64, 1),
    in: bezier(0.55, 0, 0.8, 0.4),
    inOut: bezier(0.65, 0, 0.35, 1),
    linear: (t) => Math.min(1, Math.max(0, t)),
  };

  /** 0 before `start`, 1 after `start + length`, eased between. All in seconds. */
  const progress = (seconds, start, length, easing) => {
    const fn = easing || ease.out;
    if (length <= 0) return seconds >= start ? 1 : 0;
    return fn((seconds - start) / length);
  };

  /** Repeatable noise in 0..1. The same seed always gives the same number. */
  const random = (seed) => {
    const str = String(seed);
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  };

  /* ───────── Holds ───────── */

  const hold = (name) => {
    const id = ++holdId;
    holds.set(id, name || `hold ${id}`);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      holds.delete(id);
    };
  };

  const imagesReady = () =>
    Array.from(document.images).every((img) => img.complete && (img.naturalWidth > 0 || !img.src));

  const fontsReady = () => document.fonts.status === 'loaded';

  const ready = () => holds.size === 0 && fontsReady() && imagesReady() && lastError === null;

  const pendingNames = () => {
    const names = Array.from(holds.values());
    if (!fontsReady()) names.push('fonts');
    if (!imagesReady()) {
      const missing = Array.from(document.images).filter((img) => !(img.complete && img.naturalWidth > 0));
      names.push(`images: ${missing.map((i) => i.getAttribute('src')).join(', ')}`);
    }
    if (lastError) names.push(`error: ${lastError}`);
    return names;
  };

  /* ───────── Drawing ───────── */

  const setFrame = (n) => {
    frame = n;
    const seconds = n / cfg().fps;
    for (const fn of renderers) fn(n, seconds);
  };

  const onFrame = (fn) => {
    renderers.push(fn);
  };

  /** Force every declared font face to load, so the capture can wait for it. */
  const loadFonts = () => {
    const faces = [];
    document.fonts.forEach((face) => faces.push(face.load().catch(() => null)));
    const listed = (cfg().fonts || []).map((spec) => document.fonts.load(spec).catch(() => null));
    return Promise.all([...faces, ...listed]).then(() => document.fonts.ready);
  };

  window.addEventListener('error', (e) => {
    lastError = e.message || String(e.error || e);
  });

  /* ───────── Preview on a clock, for watching in a browser ───────── */

  const params = new URLSearchParams(location.search);

  const preview = () => {
    const c = cfg();
    const from = Number(params.get('from') || 0);
    let audio = null;
    if (c.audio) {
      audio = new Audio(c.audio);
      audio.currentTime = from;
    }
    const start = performance.now() - from * 1000;
    const tick = () => {
      const seconds = (performance.now() - start) / 1000;
      const n = Math.min(c.frames - 1, Math.floor(seconds * c.fps));
      setFrame(n);
      if (n < c.frames - 1) requestAnimationFrame(tick);
      else if (audio) audio.pause();
    };
    const go = () => {
      if (audio) audio.play().catch(() => null);
      requestAnimationFrame(tick);
    };
    // Browsers only play sound after a click. Show frame 0, then start on the first click.
    setFrame(Math.floor(from * c.fps));
    if (audio) {
      document.addEventListener('click', go, {once: true});
      document.title = 'Click to play';
    } else {
      go();
    }
  };

  window.video = {
    onFrame,
    hold,
    random,
    ease,
    bezier,
    progress,
    setFrame,
    ready,
    pendingNames,
    loadFonts,
    get frame() {
      return frame;
    },
    get seconds() {
      return frame / cfg().fps;
    },
  };

  window.addEventListener('DOMContentLoaded', () => {
    const c = cfg();
    document.documentElement.style.width = `${c.width}px`;
    document.documentElement.style.height = `${c.height}px`;
    document.body.style.width = `${c.width}px`;
    document.body.style.height = `${c.height}px`;
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    loadFonts().then(() => {
      if (params.has('play')) preview();
      else setFrame(Number(params.get('frame') || 0));
    });
  });
})();
