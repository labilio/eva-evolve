import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {zipSync, unzipSync, strToU8} from 'fflate';

// Explicit inventory prevents historical docs, credentials and unrelated files entering exports.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entries = [
  ['docs/开发规范总览.md', 'references/index.md'],
  ['docs/通用规范/图标使用规范.md', 'references/common/icons.md'],
  ['docs/通用规范/联系人与AI身份展示规范.md', 'references/common/identity.md'],
  ['docs/通用规范/布局规范.md', 'references/common/layout.md'],
  ['docs/通用规范/配色规范.md', 'references/common/colors.md'],
  ['docs/专项规范/Eva同学.md', 'references/menus/personal-eva.md'],
  ['docs/专项规范/我的AI.md', 'references/menus/my-ai.md'],
  ['docs/专项规范/我的消息.md', 'references/menus/messages.md'],
  ['docs/专项规范/我的项目.md', 'references/menus/projects.md'],
  ['docs/专项规范/通讯录.md', 'references/menus/contacts.md'],
  ['docs/专项规范/数字员工市场.md', 'references/menus/digital-employees.md'],
];
const mapped = new Map(entries.map(([source, target]) => [path.resolve(repo, source), target]));
const read = p => fs.readFileSync(path.join(repo, p), 'utf8');
const hash = s => createHash('sha256').update(s).digest('hex');
const files = new Map([
  ['SKILL.md', read('tools/product-rules-skill/SKILL.md')],
  ['agents/openai.yaml', read('tools/product-rules-skill/openai.yaml')],
]);
const provenance = [];
for (const [source, target] of entries) {
  const raw = read(source);
  // Sources remain in the repository; portable references contain only approved rule bodies.
  let approved = raw.split(/^## 来源(?:与限制)?\s*$/m)[0].trimEnd() + '\n';
  if (source === 'docs/专项规范/Eva同学.md') approved = approved.split(/^## 边界\s*$/m)[0].trimEnd() + '\n';
  if (source === 'docs/专项规范/数字员工市场.md') approved = approved.split(/^## 待确认\s*$/m)[0].trimEnd() + '\n';
  if (source === 'docs/专项规范/我的项目.md') {
    approved = approved.replace(/^- 数字员工“加入项目”与成员资格的关系尚待确认[^\n]*\n/m, '');
  }
  if (source === 'docs/开发规范总览.md') {
    approved = `# Eva 产品规范目录

本包收录四份通用规范与六份一级菜单专项，全部为已确定规则的提炼。

## 通用

- [图标规范](./通用规范/图标使用规范.md)
- [联系人与 AI 身份展示规范](./通用规范/联系人与AI身份展示规范.md)
- [布局规范](./通用规范/布局规范.md)
- [配色规范](./通用规范/配色规范.md)

## 专项：一级菜单

### 个人

- [Eva 同学](./专项规范/Eva同学.md)
- [我的 AI](./专项规范/我的AI.md)

### 团队协作

- [我的消息](./专项规范/我的消息.md)
- [我的项目](./专项规范/我的项目.md)，任务看板引用其中任务定义
- [通讯录](./专项规范/通讯录.md)

### 其他

- [数字员工市场](./专项规范/数字员工市场.md)

## 跨菜单规则归属

拉人弹窗形态读布局，候选与已选身份读身份展示，候选权限和批量提交读我的项目；群聊拉人及退出解散读我的消息，AI 小队成员与解散读我的 AI。每条规则通过引用复用，不在各入口重新定义。
`;
  }
  const rendered = approved.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    if (/^(?:https?:|#)/.test(href)) return `[${label}](${href})`;
    const absolute = path.resolve(repo, path.dirname(source), href);
    const packaged = mapped.get(absolute);
    if (packaged) return `[${label}](${path.posix.relative(path.posix.dirname(target), packaged)})`;
    if (!fs.existsSync(absolute)) throw new Error(`Broken source link: ${source}: ${href}`);
    throw new Error(`Approved body depends on excluded material: ${source}: ${href}`);
  });
  if (/\/Users\/|D:\\\\|file:\/\/|localhost|127\.0\.0\.1/.test(rendered)) {
    throw new Error(`Non-portable content: ${source}`);
  }
  if (/待确认|待决|待审|尚待|尚未确认/.test(rendered)) throw new Error(`Unconfirmed material in export: ${source}`);
  files.set(target, rendered);
  provenance.push({source, target, sourceSha256: hash(raw), packagedSha256: hash(rendered)});
}
files.set('sources.json', JSON.stringify({
  name: 'eva-product-rules', version: '0.2.0-draft',
  status: '已确定产品规则的提炼；不是实现或验收完成声明',
  canonical: 'docs/通用规范、docs/专项规范、docs/开发规范总览.md',
  update: '修改源文档后重新执行 tools/package-product-rules.mjs；不手改生成的 references',
  files: provenance,
}, null, 2) + '\n');

// Every Markdown link must resolve within this package, not just on the author's machine.
for (const [name, body] of files) {
  if (!name.endsWith('.md')) continue;
  for (const match of body.matchAll(/\]\(([^)]+)\)/g)) {
    const href = match[1];
    if (/^(?:https?:|#)/.test(href)) continue;
    const target = path.posix.normalize(path.posix.join(path.posix.dirname(name), href));
    if (!files.has(target)) throw new Error(`Unresolved package link ${name}: ${href}`);
  }
}
const output = path.join(repo, 'artifacts/product-rules');
fs.mkdirSync(output, {recursive: true});
const payload = {};
for (const [name, body] of files) payload[`eva-product-rules/${name}`] = [strToU8(body), {mtime: new Date('2026-09-15T00:00:00Z')}];
const zip = zipSync(payload, {level: 9});
const zipPath = path.join(output, 'eva-product-rules-0.2.0-draft.zip');
fs.writeFileSync(zipPath, zip);
// Check actual archived bytes, not only the pre-export directory.
const restored = unzipSync(fs.readFileSync(zipPath));
if (Object.keys(restored).length !== files.size) throw new Error('ZIP inventory differs');
for (const [name, body] of files) {
  if (Buffer.from(restored[`eva-product-rules/${name}`]).toString('utf8') !== body) throw new Error(`ZIP mismatch: ${name}`);
}
const extracted = fs.mkdtempSync(path.join(os.tmpdir(), 'eva-rules-'));
for (const [name, body] of files) {
  const dest = path.join(extracted, 'eva-product-rules', name);
  fs.mkdirSync(path.dirname(dest), {recursive: true}); fs.writeFileSync(dest, body);
}
console.log(JSON.stringify({zip: zipPath, validationDirectory: path.join(extracted, 'eva-product-rules'), files: files.size, sha256: hash(zip)}, null, 2));
