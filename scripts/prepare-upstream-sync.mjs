import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Merge only in a disposable checkout. Network and PR operations live in the workflow.
export function prepareSync({ cwd = process.cwd(), base = 'origin/main', upstream = 'upstream/main', branch }) {
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const succeeds = (...args) => { try { git(...args); return true; } catch { return false; } };
  if (!branch?.startsWith('codex/sync-upstream-')) throw new Error('同步只能写入专用功能分支');
  git('check-ref-format', '--branch', branch);
  if (git('status', '--porcelain')) throw new Error('工作区不干净，停止同步');
  const baseSha = git('rev-parse', base), upstreamSha = git('rev-parse', upstream);
  if (succeeds('merge-base', '--is-ancestor', upstreamSha, baseSha)) return { changed: false, baseSha, upstreamSha };
  git('merge-base', baseSha, upstreamSha); // Reject unrelated histories.
  git('switch', '-c', branch, baseSha);
  let mergeError;
  try { git('merge', '--no-ff', '--no-commit', upstreamSha); } catch (error) { mergeError = error; }
  const conflicts = git('diff', '--name-only', '--diff-filter=U').split('\n').filter(Boolean);
  // Each repository owns its release metadata; old releases must never replace it.
  git('restore', `--source=${baseSha}`, '--staged', '--worktree', '--', 'release.json');
  const unresolved = conflicts.filter(file => file !== 'release.json');
  if (unresolved.length || (mergeError && !conflicts.length)) {
    if (succeeds('rev-parse', '--verify', 'MERGE_HEAD')) git('merge', '--abort');
    throw new Error(unresolved.length ? `同步冲突，未推送任何修改：\n${unresolved.join('\n')}` : `合并失败：${mergeError.stderr || mergeError.message}`);
  }
  git('commit', '-m', `同步旧仓库 main ${upstreamSha.slice(0, 8)}`);
  return { changed: true, baseSha, upstreamSha, headSha: git('rev-parse', 'HEAD'), branch };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = prepareSync({ branch: process.env.SYNC_BRANCH });
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(result).map(([key, value]) => `${key}=${value}\n`).join(''));
  console.log(JSON.stringify(result));
}
