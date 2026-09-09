import fs from 'node:fs';

const failures = [];
const read = file => {
  if (!fs.existsSync(file)) {
    failures.push(`missing ${file}`);
    return '';
  }
  return fs.readFileSync(file, 'utf8');
};

for (const file of ['AGENTS.md', 'CONTRIBUTING.md', '.github/pull_request_template.md']) read(file);
const workflow = read('.github/workflows/quality.yml');
const packageJson = JSON.parse(read('package.json') || '{}');
const release = JSON.parse(read('release.json') || '{}');

for (const command of ['npm test', 'npm run build', 'npm run check:manifest', 'npm run check:project', 'npm run check:collaboration']) {
  if (!workflow.includes(command)) failures.push(`quality workflow is missing: ${command}`);
}
if (!workflow.includes('branches: [main]')) failures.push('quality workflow must check pushes to main');
if (packageJson.scripts?.['release:bump'] !== 'node scripts/release-metadata.mjs') failures.push('release:bump script is missing');
if (!/^\d{2}-\d{2} v\d+$/.test(release.version || '')) failures.push('release.json version is invalid');
if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(release.updatedAt || '')) failures.push('release.json updatedAt is invalid');
if ((release.version || '').slice(0, 5) !== (release.updatedAt || '').slice(5, 10)) failures.push('release version date does not match updatedAt');

if (failures.length) {
  failures.forEach(message => console.error(`Collaboration contract violation: ${message}`));
  process.exit(1);
}
console.log('Eva collaboration and release contract passed.');
