/**
 * The local web server that capture.js and preview.js share.
 *
 * It serves a video project's folder, and the Gorgias brand kit at /brand/. That is the
 * same address the brand kit has in every Gorgias tool, so a video page asks for
 * /brand/2026/fonts/InterVariable.woff2 exactly as a brand deck or report does. The file
 * comes from <brand kit folder>/2026/fonts/InterVariable.woff2.
 *
 * The brand kit folder is $GORGIAS_BRAND_KIT, or ~/gorgias-brand when that is not set.
 * SETUP.md step 3 describes the folder.
 */
'use strict';

const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');

const BRAND_PREFIX = '/brand/';
const DEFAULT_BRAND_FOLDER = path.join(os.homedir(), 'gorgias-brand');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain',
};

const brandKitFolder = () => path.resolve(process.env.GORGIAS_BRAND_KIT || DEFAULT_BRAND_FOLDER);

const isInside = (folder, file) => file === folder || file.startsWith(folder + path.sep);

/** Turn a request path into a file on disk. Returns null when it points outside both folders. */
const resolveRequest = (requestPath, projectFolder, brandFolder) => {
  const isBrand = requestPath.startsWith(BRAND_PREFIX);
  const base = isBrand ? brandFolder : projectFolder;
  const rest = isBrand ? requestPath.slice(BRAND_PREFIX.length) : requestPath;
  const withIndex = rest === '' || rest.endsWith('/') ? `${rest}index.html` : rest;
  const file = path.normalize(path.join(base, withIndex));
  return isInside(base, file) ? {file, isBrand} : null;
};

/**
 * Serve a project folder on 127.0.0.1. Port 0 picks a free port.
 * onMissingBrandFile(requestPath) runs for every /brand/ file the brand kit does not have.
 * Resolves to {origin, brandFolder, close}.
 */
const serveFolder = (projectFolder, {port = 0, onMissingBrandFile = () => {}} = {}) =>
  new Promise((resolve, reject) => {
    const root = path.resolve(projectFolder);
    const brandFolder = brandKitFolder();
    const server = http.createServer((req, res) => {
      let requestPath;
      try {
        requestPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      } catch (e) {
        res.writeHead(400).end('bad address');
        return;
      }
      if (requestPath.includes('\0')) {
        res.writeHead(400).end('bad address');
        return;
      }
      const target = resolveRequest(requestPath, root, brandFolder);
      if (!target) {
        res.writeHead(403).end();
        return;
      }
      fs.readFile(target.file, (err, data) => {
        if (err) {
          if (target.isBrand) onMissingBrandFile(requestPath);
          res.writeHead(404).end(`not found: ${requestPath}`);
          return;
        }
        res.writeHead(200, {'Content-Type': MIME[path.extname(target.file).toLowerCase()] || 'application/octet-stream'});
        res.end(data);
      });
    });
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolve({origin: `http://127.0.0.1:${server.address().port}`, brandFolder, close: () => server.close()});
    });
  });

/** What to print when a page asked for brand files that the brand kit folder does not have. */
const missingBrandMessage = (missingPaths, brandFolder) => {
  const where = fs.existsSync(brandFolder)
    ? `The brand kit folder ${brandFolder} does not have`
    : `There is no brand kit folder at ${brandFolder}. The page asked for`;
  return [
    `${where}:`,
    ...missingPaths.map((p) => `  ${p}`),
    'SETUP.md step 3 describes the brand kit folder. To use a folder somewhere else, set GORGIAS_BRAND_KIT to its path.',
  ].join('\n');
};

module.exports = {serveFolder, missingBrandMessage, brandKitFolder};
