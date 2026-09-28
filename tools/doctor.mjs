// 只读体检：提前发现会让 OpenCode 服务启动崩溃重启的「幽灵 worktree」，
// 并报告本地存储体积。不做任何修改，需要清理时按输出提示手动执行。
//
// 背景：worktree 目录被 rm -rf 但没有 git worktree remove 时，.git/worktrees/<name>
// 注册仍在；OpenCode 每次启动都去 realPath 该目录 → NotFound → 服务被中断重启。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(process.cwd());
const mb = bytes => (bytes ? `${Math.round(bytes / 1048576)}MB` : '-');
const size = file => { try { return fs.statSync(file).size; } catch { return 0; } };

const porcelain = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd: root, encoding: 'utf8' });
const worktrees = porcelain.split('\n').filter(line => line.startsWith('worktree ')).map(line => line.slice('worktree '.length).trim());

console.log('== worktree ==');
const missing = [];
for (const dir of worktrees) {
  const ok = fs.existsSync(dir);
  if (!ok) missing.push(dir);
  console.log(`${ok ? 'OK  ' : 'MISS'} ${dir}`);
}

const dataDir = process.env.XDG_DATA_HOME
  ? path.join(process.env.XDG_DATA_HOME, 'opencode')
  : path.join(os.homedir(), '.local', 'share', 'opencode');
console.log('\n== 存储 ==');
console.log(`opencode.db      ${mb(size(path.join(dataDir, 'opencode.db')))}`);
console.log(`opencode.log     ${mb(size(path.join(dataDir, 'log', 'opencode.log')))}`);
try {
  for (const name of fs.readdirSync(dataDir).filter(n => n.startsWith('opencode.db.backup-'))) {
    console.log(`${name} ${mb(size(path.join(dataDir, name)))}`);
  }
} catch { /* dataDir 不存在时忽略 */ }

if (missing.length) {
  console.log(`\n⚠ 有 ${missing.length} 个已注册但目录缺失的 worktree，会让 OpenCode 服务反复崩溃重启：`);
  for (const dir of missing) console.log(`  - ${dir}`);
  console.log('\n修复：能恢复就恢复目录；确认不要了就 `git worktree prune` 注销。');
  process.exitCode = 1;
} else {
  console.log('\n✅ 所有注册 worktree 目录存在，无幽灵注册（不会因此崩溃重启）。');
}