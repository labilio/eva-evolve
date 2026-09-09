import fs from 'node:fs';

const failures = [];
const read = file => {
  if (!fs.existsSync(file)) {
    failures.push(`missing ${file}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
};

const agents = read('AGENTS.md');
const guide = read('CONTRIBUTING.md');
const workflow = read('.github/workflows/quality.yml');
const template = read('.github/pull_request_template.md');
const packageJson = JSON.parse(read('package.json') || '{}');
const release = JSON.parse(read('release.json') || '{}');

for (const phrase of ['允许小改动直接推送 `main`', 'Vercel Preview', '人工明确确认', '更新版本号', '禁止强推', '删除 main']) {
  if (!`${agents}\n${guide}`.includes(phrase)) failures.push(`workflow guidance is missing: ${phrase}`);
}
for (const command of ['npm test', 'npm run build', 'npm run check:manifest', 'npm run check:project', 'npm run check:collaboration']) {
  if (!workflow.includes(command)) failures.push(`quality workflow is missing: ${command}`);
}
if (/禁止直接在 `main` 开发、提交或 push/.test(agents)) failures.push('legacy blanket direct-push ban conflicts with Evolve policy');
if (!workflow.includes('branches: [main]')) failures.push('quality workflow must check pushes to main');
if (!template.includes('人工确认合并')) failures.push('PR template is missing the human merge gate');
if (packageJson.scripts?.['release:bump'] !== 'node scripts/release-metadata.mjs') failures.push('release:bump script is missing');
if (!/^\d{2}-\d{2} v\d+$/.test(release.version || '')) failures.push('release.json version is invalid');
if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(release.updatedAt || '')) failures.push('release.json updatedAt is invalid');
if ((release.version || '').slice(0, 5) !== (release.updatedAt || '').slice(5, 10)) failures.push('release version date does not match updatedAt');

if (failures.length) {
  failures.forEach(message => console.error(`Collaboration contract violation: ${message}`));
  process.exit(1);
}
console.log('Eva collaboration and release contract passed.');
