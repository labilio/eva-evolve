import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 多 worktree 并行开发时，每个 worktree 由自身路径派生一个稳定端口，
// 跨重启不变、彼此不撞；端口被别人占用时向上让位，绝不抢占或结束他人进程。
export const PORT_BASE = 4173;
export const PORT_SPAN = 800;
export const PORT_FILE = '.eva-dev-server.json';
const IDENTITY_HEADER = 'x-eva-dev-root';

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

export function derivePort(root, base = PORT_BASE, span = PORT_SPAN) {
  // FNV-1a：稳定、无依赖，同一路径永远得到同一端口。
  let hash = 0x811c9dc5;
  const key = path.resolve(root);
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return base + (hash % span);
}

function isFree(port, host) {
  return new Promise(resolve => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(port, host);
  });
}

export async function findOpenPort(start, host = '127.0.0.1', attempts = 64) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const port = start + offset;
    if (port <= 65535 && await isFree(port, host)) return port;
  }
  // 全部让位失败时交给系统分配，仍然不去打断已有服务。
  return 0;
}

export function createServer(root = process.cwd()) {
  const rootKey = path.resolve(root);
  return http.createServer((request, response) => {
    const resolved = resolvePublicPath(root, request.url || '/');
    if (resolved.status !== 200) {
      response.writeHead(resolved.status, { [IDENTITY_HEADER]: rootKey });
      response.end(resolved.status === 403 ? 'Forbidden' : 'Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': contentTypes.get(path.extname(resolved.path)) || 'application/octet-stream',
      // Content hashes invalidate changed assets; mutable local files stay fresh.
      'Cache-Control': /\/vendor\/[^/]+\.[a-f0-9]{20}\.(js|css)$/.test(resolved.path)
        ? 'public, max-age=31536000, immutable' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
      [IDENTITY_HEADER]: rootKey,
    });
    fs.createReadStream(resolved.path).pipe(response);
  });
}

// 已有服务且服务的是同一个 worktree 时复用它，避免重复构建与重复监听。
export async function findReusableServer(statePath, rootKey) {
  let state;
  try {
    state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }
  if (!state || typeof state.port !== 'number' || state.root !== rootKey) return null;
  try {
    const response = await fetch(`http://127.0.0.1:${state.port}/index.html`);
    if (response.headers.get(IDENTITY_HEADER) !== rootKey) return null;
    return state.port;
  } catch {
    return null;
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const root = path.resolve(process.argv[2] || process.cwd());
  const statePath = path.join(root, PORT_FILE);
  const rootKey = path.resolve(root);

  // 同一 worktree 已有本服务在跑时直接复用，不重复构建、不重复监听。
  const reused = await findReusableServer(statePath, rootKey);
  if (reused) {
    console.log(`Eva demo already running: http://127.0.0.1:${reused}`);
    process.exit(0);
  }

  // 显式 EVA_PORT 仍完全生效；否则按 worktree 路径派生稳定端口，被占则向上让位。
  const requested = Number(process.env.EVA_PORT) || derivePort(root);
  const port = await findOpenPort(requested);

  const server = createServer(root);
  server.listen(port, '127.0.0.1', () => {
    const actual = server.address().port;
    try {
      fs.writeFileSync(statePath, `${JSON.stringify({ root: rootKey, port: actual, pid: process.pid })}\n`);
    } catch {
      // 状态文件写不进去只影响下次复用，不影响本次服务。
    }
    console.log(`Eva demo: http://127.0.0.1:${actual}`);
    if (actual !== requested) {
      console.log(`(preferred port ${requested} busy; moved to ${actual})`);
    }
  });

  const clearState = () => {
    try {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      if (state.pid === process.pid) fs.rmSync(statePath, { force: true });
    } catch {
      // 没有状态文件可清理时直接忽略。
    }
  };
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      clearState();
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 500).unref();
    });
  }
}
