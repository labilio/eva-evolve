import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareSync } from '../scripts/prepare-upstream-sync.mjs';

function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), 'eva-sync-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-b', 'main'); git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.test');
  const commit = (file, content) => { writeFileSync(join(cwd, file), content); git('add', '.'); git('commit', '-m', file); };
  commit('release.json', '{"version":"initial"}'); commit('feature.txt', 'baseline\n');
  git('branch', 'upstream');
  return { cwd, git, commit, sync: () => prepareSync({ cwd, base: 'main', upstream: 'upstream', branch: 'codex/sync-upstream-test' }) };
}

test('no upstream updates leave main and working tree untouched', t => {
  const f = fixture(t), before = f.git('rev-parse', 'main');
  assert.equal(f.sync().changed, false);
  assert.equal(f.git('rev-parse', 'HEAD'), before);
  assert.equal(f.git('status', '--porcelain'), '');
});

test('sync retains new features and release while merging old fixes without changing main', t => {
  const f = fixture(t);
  f.commit('new.txt', 'new repository feature'); f.commit('release.json', '{"version":"new"}');
  const before = f.git('rev-parse', 'main');
  f.git('switch', 'upstream'); f.commit('fix.txt', 'upstream fix'); f.commit('release.json', '{"version":"old"}');
  f.git('switch', 'main');
  const result = f.sync();
  assert.equal(result.changed, true);
  assert.equal(f.git('rev-parse', 'main'), before);
  assert.equal(readFileSync(join(f.cwd, 'release.json'), 'utf8'), '{"version":"new"}');
  assert.equal(readFileSync(join(f.cwd, 'new.txt'), 'utf8'), 'new repository feature');
  assert.equal(readFileSync(join(f.cwd, 'fix.txt'), 'utf8'), 'upstream fix');
  f.git('merge-base', '--is-ancestor', 'upstream', 'HEAD');
  assert.equal(f.git('status', '--porcelain'), '');
});

test('business conflicts abort the merge without overwriting either main or local content', t => {
  const f = fixture(t); f.commit('feature.txt', 'new behavior\n'); const before = f.git('rev-parse', 'main');
  f.git('switch', 'upstream'); f.commit('feature.txt', 'old behavior\n'); f.git('switch', 'main');
  assert.throws(f.sync, /同步冲突[\s\S]*feature.txt/);
  assert.equal(f.git('rev-parse', 'HEAD'), before);
  assert.equal(f.git('rev-parse', 'main'), before);
  assert.equal(readFileSync(join(f.cwd, 'feature.txt'), 'utf8'), 'new behavior\n');
  assert.equal(f.git('status', '--porcelain'), '');
});

test('dirty checkout is rejected before switching branches', t => {
  const f = fixture(t); writeFileSync(join(f.cwd, 'feature.txt'), 'unsaved');
  assert.throws(f.sync, /工作区不干净/);
  assert.equal(f.git('branch', '--show-current'), 'main');
});
