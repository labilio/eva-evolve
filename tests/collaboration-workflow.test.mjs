import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { nextReleaseMetadata } from '../scripts/release-metadata.mjs';

const read = file => fs.readFileSync(file, 'utf8');

test('仓库允许小改动直推并保留必要保护与复杂改动评审', () => {
  const agents = read('AGENTS.md');
  const guide = read('CONTRIBUTING.md');
  const template = read('.github/pull_request_template.md');

  for (const phrase of ['允许小改动直接推送 `main`', 'Vercel Preview', '人工明确确认', '更新版本号', '禁止强推', '删除 `main`']) {
    assert.match(`${agents}\n${guide}`, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(`${agents}\n${guide}`, /禁止直接在 `main` 开发/);
  assert.match(guide, /同步旧仓库仍先生成同步 PR/);
  assert.match(guide, /推送前再次 fetch/);
  assert.match(template, /Preview/);
  assert.match(template, /未更新正式版本号/);
  assert.match(template, /人工确认合并/);
});

test('CI 对 PR 和 main 运行完整质量门禁，但不自动合并', () => {
  const workflow = read('.github/workflows/quality.yml');
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /branches:\s*\[main\]/);
  for (const command of ['npm test', 'npm run build', 'npm run check:manifest', 'npm run check:project', 'npm run check:collaboration', 'node docs/design-system/gds-for-ai2.0/validate.mjs']) {
    assert.ok(workflow.includes(command), `CI 缺少命令：${command}`);
  }
  assert.doesNotMatch(workflow, /gh pr merge|vercel --prod|git push origin main/);
});

test('发布信息只有一个结构化数据源', () => {
  const release = JSON.parse(read('release.json'));
  assert.match(release.version, /^\d{2}-\d{2} v\d+$/);
  assert.match(release.updatedAt, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  assert.equal(release.version.slice(0, 5), release.updatedAt.slice(5, 10));

  const builder = read('tools/build-runtime.mjs');
  const generalPatch = read('prototype/009-6-patch-general.js');
  assert.match(builder, /release\.json/);
  assert.match(generalPatch, /__EVA_RELEASE/);
  assert.doesNotMatch(generalPatch, /最近更新：2026-09-06 13:55/);
  assert.doesNotMatch(generalPatch, /Eva · 2026-09-06 · v1/);
});

test('发布版本同日递增、跨日回到 v1', () => {
  const current = { version: '09-06 v1', updatedAt: '2026-09-06 13:55' };
  assert.deepEqual(nextReleaseMetadata(current, new Date('2026-09-06T08:30:00Z')), {
    version: '09-06 v2',
    updatedAt: '2026-09-06 16:30',
  });
  assert.deepEqual(nextReleaseMetadata(current, new Date('2026-09-07T01:05:00Z')), {
    version: '09-07 v1',
    updatedAt: '2026-09-07 09:05',
  });
});
