import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('新旧设计包及项目整合合同可以联合验证',()=>{
  const result=spawnSync(process.execPath,['docs/design-system/validate-all.mjs'],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
  assert.match(result.stdout,/GDS for AI 2\.0：通过/);
  assert.match(result.stdout,/EvaMate Design System 0\.3\.0：通过/);
  assert.match(result.stdout,/整合合同：通过/);
});
