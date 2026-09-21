import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createServer, derivePort, findOpenPort, findReusableServer, PORT_BASE, resolvePublicPath } from '../tools/serve.mjs';

test('serves files only from the project root', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eva-serve-'));
  try {
    fs.writeFileSync(path.join(root, 'index.html'), 'ok');
    assert.equal(resolvePublicPath(root, '/').path, path.join(root, 'index.html'));
    assert.equal(resolvePublicPath(root, '/missing.js').status, 404);
    assert.equal(resolvePublicPath(root, '/../secret.txt').status, 403);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('serves ES modules with a JavaScript MIME type', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eva-serve-module-'));
  const server = createServer(root);
  try {
    fs.writeFileSync(path.join(root, 'module.mjs'), 'export const ok = true;');
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/module.mjs`);
    assert.match(response.headers.get('content-type'), /^text\/javascript/);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('derives a stable port per worktree path within the reserved span', () => {
  const first = derivePort('/repo/worktrees/fix-login');
  const second = derivePort('/repo/worktrees/fix-login');
  const other = derivePort('/repo/worktrees/fix-header');
  assert.equal(first, second);
  assert.notEqual(first, other);
  assert.ok(first >= PORT_BASE && first < PORT_BASE + 800);
});

test('findOpenPort skips occupied ports instead of failing', async () => {
  const occupied = createServer(process.cwd());
  await new Promise(resolve => occupied.listen(0, '127.0.0.1', resolve));
  const taken = occupied.address().port;
  try {
    const port = await findOpenPort(taken);
    assert.equal(port, taken + 1);
  } finally {
    await new Promise(resolve => occupied.close(resolve));
  }
});

test('exposes the serving root so stale reuse is rejected', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eva-serve-reuse-'));
  const server = createServer(root);
  try {
    fs.writeFileSync(path.join(root, 'index.html'), 'ok');
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    const rootKey = path.resolve(root);
    const statePath = path.join(root, '.eva-dev-server.json');
    fs.writeFileSync(statePath, JSON.stringify({ root: rootKey, port }));
    assert.equal(await findReusableServer(statePath, rootKey), port);
    // 同端口但属于别的 worktree 的服务不能被当成自己的复用。
    assert.equal(await findReusableServer(statePath, '/some/other/worktree'), null);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  }
});
