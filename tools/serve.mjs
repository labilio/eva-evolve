import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.pdf', 'application/pdf'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

export function resolvePublicPath(root, requestPath) {
  const decoded = decodeURIComponent(requestPath.split('?')[0]);
  if (decoded.split('/').includes('..')) return { status: 403 };
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const publicPath = path.resolve(root, relative);
  const rootPrefix = `${path.resolve(root)}${path.sep}`;
  if (!publicPath.startsWith(rootPrefix)) return { status: 403 };
  if (!fs.existsSync(publicPath) || !fs.statSync(publicPath).isFile()) return { status: 404 };
  return { status: 200, path: publicPath };
}

export function createServer(root = process.cwd()) {
  return http.createServer((request, response) => {
    const resolved = resolvePublicPath(root, request.url || '/');
    if (resolved.status !== 200) {
      response.writeHead(resolved.status);
      response.end(resolved.status === 403 ? 'Forbidden' : 'Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': contentTypes.get(path.extname(resolved.path)) || 'application/octet-stream',
      // Content hashes invalidate changed assets; mutable local files stay fresh.
      'Cache-Control': /\/vendor\/[^/]+\.[a-f0-9]{20}\.(js|css)$/.test(resolved.path)
        ? 'public, max-age=31536000, immutable' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    fs.createReadStream(resolved.path).pipe(response);
  });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const port = Number(process.env.EVA_PORT || 4173);
  const root = path.resolve(process.argv[2] || process.cwd());
  createServer(root).listen(port, '127.0.0.1', () => {
    console.log(`Eva demo: http://127.0.0.1:${port}`);
  });
}
