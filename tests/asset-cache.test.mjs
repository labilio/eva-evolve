import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fingerprintVendorAssets } from '../tools/fingerprint-assets.mjs';

test('asset URLs reuse identical bytes and change only with content; HTML preserves load order', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eva-cache-'));
  const entry = '<script type="module" src="vendor/eva-runtime.module.js"></script><link rel="stylesheet" href="vendor/eva-legacy.css">';
  try {
    fs.mkdirSync(path.join(root, 'vendor'));
    fs.writeFileSync(path.join(root, 'vendor/eva-runtime.module.js'), 'export const version = 1;');
    fs.writeFileSync(path.join(root, 'vendor/eva-legacy.css'), 'body{color:red}');
    const build = () => { fs.writeFileSync(path.join(root, 'index.html'), entry); return fingerprintVendorAssets(root); };
    const first = build();
    assert.deepEqual(build(), first);
    fs.writeFileSync(path.join(root, 'vendor/eva-runtime.module.js'), 'export const version = 2;');
    const next = build();
    assert.notEqual(next['vendor/eva-runtime.module.js'], first['vendor/eva-runtime.module.js']);
    assert.equal(next['vendor/eva-legacy.css'], first['vendor/eva-legacy.css']);
    for (const [source, target] of Object.entries(next)) assert.deepEqual(fs.readFileSync(path.join(root, source)), fs.readFileSync(path.join(root, target)));
    assert.equal(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), entry.replace('vendor/eva-runtime.module.js', next['vendor/eva-runtime.module.js']).replace('vendor/eva-legacy.css', next['vendor/eva-legacy.css']));
    fs.writeFileSync(path.join(root, 'index.html'), 'missing entry');
    assert.throws(() => fingerprintVendorAssets(root), /Expected one/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('HTTP caches fingerprinted assets but never freezes entry or canonical paths', async () => {
  const { createServer } = await import('../tools/serve.mjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eva-cache-http-'));
  fs.mkdirSync(path.join(root, 'vendor'));
  const files = ['index.html', 'vendor/eva-runtime.module.js', 'vendor/eva-runtime.module.0123456789abcdef0123.js'];
  for (const file of files) fs.writeFileSync(path.join(root, file), 'test');
  const server = createServer(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    for (const file of files) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/${file}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), file.includes('0123456789') ? 'public, max-age=31536000, immutable' : 'no-store');
      await response.text();
    }
  } finally { await new Promise(resolve => server.close(resolve)); fs.rmSync(root, { recursive: true, force: true }); }
});
