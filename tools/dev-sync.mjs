// 开发期快速同步：只有「会改变运行时」的输入变化时才重新装配 18.8MB runtime，
// 其余 prototype/review/supabase 改动只做目录拷贝，供 dist 服务即时读取。
//
// 为什么可以跳过构建：buildSite 里 prototype 只是 fs.cpSync，index.html 只有
// vendor/eva-runtime.module.js 与 vendor/eva-legacy.css 两个入口会被加内容哈希
// （见 tools/fingerprint-assets.mjs），prototype 内引用保持原文件名。因此原型
// 页面的 JS/CSS 改动不需要重新装配运行时。
import fs from 'node:fs';
import path from 'node:path';
import { buildSite } from './build-runtime.mjs';

const root = path.resolve(process.cwd());
const dist = path.join(root, 'dist');
const runtime = path.join(dist, 'vendor/eva-runtime.module.js');

// 任一变化都必须走完整构建：补丁链、兼容运行时、入口清单、页面入口。
const RUNTIME_TRIGGERS = [
  'prototype/009-4-registry.js',
  'prototype/009-5-patch-im.js',
  'prototype/009-6-patch-general.js',
  'prototype/009-7-patch-sider.js',
  'prototype/009-8-patch-automation.js',
  'vendor/eva-legacy-runtime.js',
  // 以下三项由 buildSite 拷贝并按内容哈希写进 dist/index.html；源文件变化但没有
  // 整构建时，dist 仍会加载旧的哈希文件，必须强制重跑完整构建。
  'vendor/eva-legacy.css',
  'release.json',
  'node_modules/fflate/esm/browser.js',
  // 入口与清单变化可能增删脚本/样式，同样必须整构建。
  'index.html',
  'prototype-manifest.json',
];

const mtime = file => {
  try { return fs.statSync(path.join(root, file)).mtimeMs; } catch { return 0; }
};

function sync() {
  const runtimeMtime = fs.existsSync(runtime) ? fs.statSync(runtime).mtimeMs : 0;
  const runtimeStale = !runtimeMtime || RUNTIME_TRIGGERS.some(file => mtime(file) > runtimeMtime);
  if (runtimeStale) {
    const result = buildSite(root);
    return `完整构建（补丁/运行时/入口有变更，${Buffer.byteLength(result.source)} bytes）`;
  }
  for (const directory of ['prototype', 'review', 'supabase']) {
    fs.cpSync(path.join(root, directory), path.join(dist, directory), { recursive: true });
  }
  return '静态同步（未触碰 runtime）';
}

if (process.argv.includes('--watch')) {
  let timer = null;
  let running = false;
  const schedule = reason => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (running) return;
      running = true;
      try { console.log(`[dev-sync] ${sync()}  ← ${reason}`); }
      catch (error) { console.error('[dev-sync] 同步失败:', error.message); }
      finally { running = false; }
    }, 120);
  };
  for (const directory of ['prototype', 'review', 'supabase']) {
    fs.watch(path.join(root, directory), { recursive: true }, (_event, filename) => schedule(`${directory}/${filename}`));
  }
  for (const file of RUNTIME_TRIGGERS) {
    fs.watch(path.join(root, file), () => schedule(file));
  }
  console.log('[dev-sync] 监听中… 保存 prototype 文件后刷新 http://127.0.0.1:4493 即可（Ctrl+C 退出）');
} else {
  console.log(`[dev-sync] ${sync()}`);
}