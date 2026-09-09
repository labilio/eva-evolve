import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fingerprintVendorAssets } from './fingerprint-assets.mjs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const patchFiles = [
  'prototype/009-4-registry.js',
  'prototype/009-5-patch-im.js',
  'prototype/009-6-patch-general.js',
  'prototype/009-7-patch-sider.js',
  'prototype/009-8-patch-automation.js',
];

export function createPatchedRuntime(root = process.cwd()) {
  const release = JSON.parse(fs.readFileSync(path.join(root, 'release.json'), 'utf8'));
  const window = { __EVA_RELEASE: release };
  const context = vm.createContext({ window, console });
  for (const file of patchFiles) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  let source = fs.readFileSync(path.join(root, 'vendor/eva-legacy-runtime.js'), 'utf8');
  for (const patch of window.__EVA_PATCHES || []) source = patch.apply(source);
  return { source, release, patchOrder: Array.from(window.__EVA_PATCHES || [], patch => String(patch.name)) };
}

export function buildSite(root = process.cwd()) {
  const projectRoot = path.resolve(root);
  const outputRoot = path.resolve(projectRoot, 'dist');
  if (outputRoot !== path.join(projectRoot, 'dist') || !outputRoot.startsWith(`${projectRoot}${path.sep}`)) {
    throw new Error('拒绝清理非项目 dist 目录');
  }

  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });
  for (const directory of ['prototype', 'review', 'supabase']) {
    fs.cpSync(path.join(projectRoot, directory), path.join(outputRoot, directory), { recursive: true });
  }
  fs.mkdirSync(path.join(outputRoot, 'vendor'), { recursive: true });
  fs.copyFileSync(path.join(projectRoot, 'vendor/eva-legacy.css'), path.join(outputRoot, 'vendor/eva-legacy.css'));
  fs.copyFileSync(path.join(projectRoot, 'index.html'), path.join(outputRoot, 'index.html'));

  const result = createPatchedRuntime(projectRoot);
  const git = (...args) => { try { return execFileSync('git', args, { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
  fs.writeFileSync(path.join(outputRoot, 'review/build-context.json'), JSON.stringify({
    commit: process.env.VERCEL_GIT_COMMIT_SHA || git('rev-parse', 'HEAD'),
    branch: process.env.VERCEL_GIT_COMMIT_REF || git('branch', '--show-current') || 'detached',
    version: result.release.version,
    dirty: !process.env.VERCEL && !!git('status', '--porcelain', '--untracked-files=no'),
  }, null, 2));
  fs.writeFileSync(
    path.join(outputRoot, 'vendor/eva-runtime.module.js'),
    `${result.source}\n//# sourceURL=eva-demo-${result.release.version.replace(/[^0-9a-z]+/gi, '-').toLowerCase()}.module.js\n`,
  );
  // Reject an invalid browser bundle before reporting a successful build.
  execFileSync(process.execPath, ['--check', path.join(outputRoot, 'vendor/eva-runtime.module.js')], { stdio: 'pipe' });
  fingerprintVendorAssets(outputRoot);
  return { outputRoot, ...result };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const result = buildSite();
  console.log(`Eva build complete: ${result.outputRoot} (${Buffer.byteLength(result.source)} runtime bytes)`);
}
