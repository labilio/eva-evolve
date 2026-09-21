// 多 worktree 并行开发时的端口一览：列出每个 worktree 派生的预览端口及占用状态。
// 端口口径与 npm start 一致（tools/serve.mjs dist → 按该 worktree 的 dist 路径派生）。
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { derivePort } from './serve.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function listWorktrees() {
  const raw = execFileSync('git', ['worktree', 'list', '--porcelain'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const entries = [];
  let current = null;
  for (const line of raw.split('\n')) {
    if (line.startsWith('worktree ')) {
      current = { path: line.slice('worktree '.length), branch: '' };
    } else if (line.startsWith('branch ')) {
      if (current) current.branch = line.slice('branch '.length).replace('refs/heads/', '');
    } else if (line === 'detached') {
      if (current) current.branch = '(detached)';
    } else if (line === '' && current) {
      entries.push(current);
      current = null;
    }
  }
  if (current) entries.push(current);
  return entries.filter(entry => entry.branch !== '' || true).filter(entry => entry.path);
}

export async function probe(port, worktreePath) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/index.html`, {
      signal: AbortSignal.timeout(400),
    });
    const root = response.headers.get('x-eva-dev-root');
    if (root) {
      // root 形如 <worktree>/dist，去掉 dist 尾巴还原 worktree 名。
      const owner = root.endsWith(`${path.sep}dist`)
        ? path.basename(path.dirname(root)) : path.basename(root);
      return owner === path.basename(worktreePath)
        ? 'Eva 预览中' : `Eva 预览中（属于 ${owner}）`;
    }
    return '被非 Eva 进程占用';
  } catch {
    return '空闲';
  }
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || '')) {
  const worktrees = listWorktrees();
  const current = path.resolve(process.cwd());
  const rows = await Promise.all(worktrees.map(async entry => {
    const dist = path.join(entry.path, 'dist');
    const port = derivePort(dist);
    const status = await probe(port, entry.path);
    return { name: path.basename(entry.path), branch: entry.branch || '-', port, status, here: current === path.resolve(entry.path) || current.startsWith(path.resolve(entry.path) + path.sep) };
  }));

  const width = Math.max('worktree'.length, ...rows.map(row => row.name.length));
  console.log(`${'worktree'.padEnd(width)}  端口   状态    分支`);
  for (const row of rows) {
    console.log(`${row.name.padEnd(width)} ${row.here ? '*' : ' '} ${String(row.port).padEnd(6)} ${row.status}  ${row.branch}`);
  }
  console.log('\n端口由 worktree 路径哈希派生，跨重启稳定；启动 npm start 后以输出 URL 为准。');
}
