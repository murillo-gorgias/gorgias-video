#!/usr/bin/env node
/**
 * Serve a video project for watching in a browser.
 *
 *   node scripts/preview.js [project-folder] [--port 8787]
 *
 * Serves the folder (default: the current folder) on 127.0.0.1, with the Gorgias brand kit
 * at /brand/, the same way capture.js does. Open the printed address with ?play to watch.
 * Prints a warning for every brand file the kit does not have. Stop it with Ctrl+C.
 */
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const {serveFolder, missingBrandMessage} = require('./serve.js');

const DEFAULT_PORT = 8787;

const usage = () => {
  console.error('usage: node preview.js [project-folder] [--port 8787]');
  process.exit(2);
};

const parseArgs = (argv) => {
  const args = {folder: '.', port: DEFAULT_PORT};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port') {
      if (i + 1 >= argv.length) usage();
      args.port = Number(argv[++i]);
    } else if (a.startsWith('--')) usage();
    else args.folder = a;
  }
  if (!Number.isInteger(args.port) || args.port < 1 || args.port > 65535) usage();
  return args;
};

const main = async () => {
  const {folder, port} = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(path.join(folder, 'index.html'))) {
    console.error(`There is no index.html in ${path.resolve(folder)}. Pass the video project's folder.`);
    process.exit(1);
  }
  const warned = new Set();
  const site = await serveFolder(folder, {
    port,
    onMissingBrandFile: (p) => {
      if (warned.has(p)) return;
      warned.add(p);
      console.error(missingBrandMessage([p], site.brandFolder));
    },
  }).catch((e) => {
    console.error(e.code === 'EADDRINUSE' ? `Port ${port} is busy. Pick another with --port.` : e.message);
    process.exit(1);
  });
  console.log(`Serving ${path.resolve(folder)}, with the brand kit from ${site.brandFolder} at /brand/.`);
  console.log(`Watch: ${site.origin}/?play   One frame: ${site.origin}/?frame=120   Stop: Ctrl+C`);
};

main();
