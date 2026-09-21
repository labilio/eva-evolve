// 按名字或分支打开某个 worktree 的预览：npm run demo <worktree名或分支片段>
// 空闲的 worktree 会自动构建并启动（后台进程）；--stop 只停该 worktree 自己的服务。
// 端端口径与 npm start 一致（tools/serve.mjs 按该 worktree 的 dist 路径派生）。
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { derivePort, PORT_FILE } from './serve.mjs';
import { listWorktrees, probe } from './ports.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const stopMode = args.includes('--stop');
const query = (args.find(arg => !arg.startsWith('--')) || '').trim();

function printCandidates(message) {
  console.log(message);
  console.log('\n可用的 worktree（名字 / 端口 / 分支）：');
  for (const entry of listWorktrees()) {
    const port = derivePort(path.join(entry.path, 'dist'));
    console.log(`  ${path.basename(entry.path).padEnd(20)} ${String(port).padEnd(6)} ${entry.branch || '-'}`);
  }
}

function pickWorktree(query) {
  const needle = query.toLowerCase();
  const scored = listWorktrees().map(entry => {
    const name = path.basename(entry.path).toLowerCase();
    const branch = (entry.branch || '').toLowerCase();
    let score = 0;
    if (name === needle) score = 4;
    else if (branch === needle) score = 3;
    else if (name.includes(needle)) score = 2;
    else if (branch.includes(needle)) score = 1;
    return { entry, score };
  }).filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
  const best = scored.filter(item => item.score === scored[0]?.score);
  return best.length === 1 ? best[0].entry : null;
}

function stopServer(dist) {
  try {
    const state = JSON.parse(fs.readFileSync(path.join(dist, PORT_FILE), 'utf8'));
    if (state.root !== path.resolve(dist)) return 'mismatch';
    process.kill(state.pid, 'SIGTERM');
    return 'stopped';
  } catch {
    return 'none';
  }
}

async function waitForEva(dist, startPort, timeoutMs = 120000) {
  const expected = path.resolve(dist);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (let offset = 0; offset < 8; offset += 1) {
      try {
        const response = await fetch(`http://127.0.0.1:${startPort + offset}/index.html`, {
          signal: AbortSignal.timeout(400),
        });
        if (response.headers.get('x-eva-dev-root') === expected) return startPort + offset;
      } catch {
        // 端口还没就绪，继续轮询。
      }
    }
    await new Promise(resolve => setTimeout(resolve, 700));
  }
  return null;
}

function openBrowser(url) {
  if (process.env.EVA_DEMO_NO_OPEN === '1') return;
  try {
    execFileSync('open', [url], { stdio: 'ignore' });
    console.log(`已在浏览器打开 ${url}`);
  } catch {
    console.log(`请手动打开 ${url}`);
  }
}

if (!query) {
  printCandidates('用法：npm run demo <worktree名或分支片段>（如 npm run demo avatar）；加 --stop 只停该 worktree 的服务。');
  process.exit(0);
}

const match = pickWorktree(query);
if (!match) {
  printCandidates(`没有找到匹配「${query}」的 worktree。`);
  process.exit(1);
}

const worktree = match.path;
const name = path.basename(worktree);
const dist = path.join(worktree, 'dist');
const port = derivePort(dist);

if (stopMode) {
  const result = stopServer(dist);
  if (result === 'stopped') console.log(`${name} 的预览服务已停止（端口 ${port}）。`);
  else if (result === 'mismatch') console.log(`端口 ${port} 上的服务不属于 ${name}，未做任何操作。`);
  else console.log(`${name} 当前没有在运行的预览服务。`);
  process.exit(0);
}

console.log(`目标：${name}（${match.branch || 'detached'}）→ http://127.0.0.1:${port}/`);
const status = await probe(port, worktree);
if (status === 'Eva 预览中') {
  console.log('服务已在运行，直接打开。');
  openBrowser(`http://127.0.0.1:${port}/`);
  process.exit(0);
}
if (status.startsWith('Eva 预览中（属于')) {
  console.log(`端口 ${port} 被 ${status} 占用，请在 npm run ports 里确认后再试。`);
  process.exit(1);
}
if (status === '被非 Eva 进程占用') {
  console.log(`端口 ${port} 被非 Eva 进程占用。按规范不结束它；服务会自动让位到相邻端口，稍后以 npm start 输出的 URL 为准。`);
}

console.log('启动中（npm run build + serve，首次可能需要十几秒）…');
const child = spawn('npm', ['start'], {
  cwd: worktree,
  detached: true,
  stdio: 'ignore',
  env: process.env,
});
child.unref();

const readyPort = await waitForEva(dist, port);
if (readyPort === null) {
  console.log('等待超时：服务没有就绪。请到该 worktree 手动 npm start 查看报错（常见原因是缺 node_modules，先 npm install）。');
  process.exit(1);
}
console.log(`就绪：http://127.0.0.1:${readyPort}/`);
openBrowser(`http://127.0.0.1:${readyPort}/`);
