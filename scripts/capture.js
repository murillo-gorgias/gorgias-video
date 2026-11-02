#!/usr/bin/env node
/**
 * Photograph a video page frame by frame.
 *
 *   node scripts/capture.js <page.html> <out-dir>                 every frame
 *   node scripts/capture.js <page.html> <out-dir> --frame 120     one frame
 *   node scripts/capture.js <page.html> <out-dir> --from 300 --to 419
 *   node scripts/capture.js <page.html> <out-dir> --every 0.5    a frame every half second
 *   node scripts/capture.js <page.html> <out-dir> --transparent  no background colour
 *   node scripts/capture.js <page.html> <out-dir> --supersample 8   8 sub-frames per frame, for motion blur
 *
 * The page must follow reference/tools/capture-pipeline.md: it includes page/runtime.js,
 * declares window.VIDEO, and draws from the frame number. For each frame the script sets
 * the frame, waits until the page reports ready (no holds, fonts and images loaded), waits
 * two paint cycles, then writes a PNG. A frame that is not ready within 20 s stops the run
 * and prints what was still loading.
 *
 * Needs the `playwright` package: run `npm i` in scripts/ once. The browser itself is a
 * separate download: `npx playwright install chromium`.
 */
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');

const READY_TIMEOUT_MS = 20000;
const SHUTTER_ANGLE = 180;

const usage = () => {
  console.error('usage: node capture.js <page.html> <out-dir> [--frame N] [--from N] [--to N] [--every S] [--transparent] [--supersample K] [--scale S]');
  process.exit(2);
};

const parseArgs = (argv) => {
  const args = {positional: [], frame: null, from: null, to: null, every: null, transparent: false, supersample: 1, scale: 1};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      i++;
      if (i >= argv.length) usage();
      return argv[i];
    };
    if (a === '--frame') args.frame = Number(next());
    else if (a === '--from') args.from = Number(next());
    else if (a === '--to') args.to = Number(next());
    else if (a === '--every') args.every = Number(next());
    else if (a === '--transparent') args.transparent = true;
    else if (a === '--supersample') args.supersample = Number(next());
    else if (a === '--scale') args.scale = Number(next());
    else if (a.startsWith('--')) usage();
    else args.positional.push(a);
  }
  if (args.positional.length !== 2) usage();
  return args;
};

const loadPlaywright = () => {
  try {
    return require('playwright');
  } catch (e) {
    console.error('Playwright is not installed. Run `npm i` inside the skill\'s scripts/ folder, then `npx playwright install chromium`.');
    process.exit(1);
  }
};

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain',
};

/**
 * Serve the page's folder over HTTP on a free port. A file:// page cannot load JavaScript
 * modules or fetch data, so the page gets a real origin. Resolves to {url, close}.
 */
const serve = (pagePath) =>
  new Promise((resolve, reject) => {
    const root = path.dirname(path.resolve(pagePath));
    const page = path.basename(pagePath);
    const server = http.createServer((req, res) => {
      const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const file = path.normalize(path.join(root, rel));
      if (!file.startsWith(root)) {
        res.writeHead(403).end();
        return;
      }
      fs.readFile(file, (err, data) => {
        if (err) {
          res.writeHead(404).end(`not found: ${rel}`);
          return;
        }
        res.writeHead(200, {'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'});
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const {port} = server.address();
      resolve({url: `http://127.0.0.1:${port}/${page}`, close: () => server.close()});
    });
  });

/** Which frame times to capture, as a list of {index, frame} where frame may be fractional. */
const plan = (args, total, fps) => {
  if (args.frame !== null) return [{index: args.frame, frame: args.frame}];
  if (args.every !== null) {
    const step = Math.max(1, Math.round(args.every * fps));
    const out = [];
    for (let f = 0; f < total; f += step) out.push({index: f, frame: f});
    return out;
  }
  const from = args.from ?? 0;
  const to = args.to ?? total - 1;
  const out = [];
  const k = Math.max(1, Math.round(args.supersample));
  for (let f = from; f <= to; f++) {
    if (k === 1) {
      out.push({index: f, frame: f});
      continue;
    }
    // Sub-frames spread across half a frame (shutter 180°), numbered consecutively.
    for (let s = 0; s < k; s++) out.push({index: f * k + s, frame: f + (s / k) * (SHUTTER_ANGLE / 360)});
  }
  return out;
};

const waitReady = async (page, frame) => {
  const started = Date.now();
  while (true) {
    const ready = await page.evaluate(() => window.video && window.video.ready());
    if (ready) return;
    if (Date.now() - started > READY_TIMEOUT_MS) {
      const names = await page.evaluate(() => (window.video ? window.video.pendingNames() : ['runtime.js not loaded']));
      throw new Error(`frame ${frame} was not ready after ${READY_TIMEOUT_MS / 1000} s. Still loading: ${names.join('; ')}`);
    }
    await page.waitForTimeout(25);
  }
};

const twoPaints = (page) =>
  page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const [pagePath, outDir] = args.positional;
  const {chromium} = loadPlaywright();

  fs.mkdirSync(outDir, {recursive: true});

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-lcd-text', '--font-render-hinting=none', '--hide-scrollbars'],
  }).catch((e) => {
    console.error(`Could not start Chromium: ${e.message.split('\n')[0]}`);
    console.error('If it is missing, run: npx playwright install chromium');
    process.exit(1);
  });

  const site = /^https?:\/\//.test(pagePath) ? {url: pagePath, close: () => null} : await serve(pagePath);
  const page = await browser.newPage({deviceScaleFactor: args.scale, viewport: {width: 100, height: 100}});
  page.on('pageerror', (e) => console.error(`page error: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.error(`page ${m.type()}: ${m.text()}`);
  });

  await page.goto(site.url, {waitUntil: 'load'});
  const video = await page.evaluate(() => window.VIDEO || null);
  if (!video) {
    console.error('The page does not declare window.VIDEO. See reference/tools/capture-pipeline.md.');
    await browser.close();
    site.close();
    process.exit(1);
  }
  const {width, height, fps, frames: total} = video;
  await page.setViewportSize({width, height});
  await page.evaluate(() => window.video.loadFonts());

  const frames = plan(args, total, fps);
  const pad = 5;
  const started = Date.now();
  let lastReport = started;
  let slowest = {frame: null, ms: 0};
  const screenshotOpts = {type: 'png', omitBackground: args.transparent};

  console.log(`${path.basename(pagePath)}: ${width}×${height} at ${fps} fps, ${total} frames. Capturing ${frames.length} frame${frames.length === 1 ? '' : 's'} to ${outDir}/`);

  try {
    for (let i = 0; i < frames.length; i++) {
      const {index, frame} = frames[i];
      const t0 = Date.now();
      await page.evaluate((f) => window.video.setFrame(f), frame);
      await waitReady(page, frame);
      await twoPaints(page);
      const file = path.join(outDir, `f${String(index).padStart(pad, '0')}.png`);
      await page.screenshot({...screenshotOpts, path: file});
      const ms = Date.now() - t0;
      if (ms > slowest.ms) slowest = {frame, ms};
      if (Date.now() - lastReport > 1000 || i === frames.length - 1) {
        const pct = Math.round(((i + 1) / frames.length) * 100);
        process.stdout.write(`\r  ${i + 1}/${frames.length} (${pct}%)`);
        lastReport = Date.now();
      }
    }
    process.stdout.write('\n');
  } catch (e) {
    process.stdout.write('\n');
    console.error(`Stopped: ${e.message}`);
    await browser.close();
    site.close();
    process.exit(1);
  }

  await browser.close();
  site.close();
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`Wrote ${frames.length} frames in ${seconds} s. Slowest frame: ${slowest.frame} (${slowest.ms} ms).`);
  if (args.supersample > 1) console.log(`Assemble with --blend ${args.supersample} to average the sub-frames.`);
};

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
