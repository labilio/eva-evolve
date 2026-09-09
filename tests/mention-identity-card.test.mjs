import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the callback actually passed to Octo TextContent by the build adapter.
const patch = fs.readFileSync(new URL('../prototype/009-5-patch-im.js', import.meta.url), 'utf8');
const callback = patch.match(/onMentionClick:(uid=>\{[^\n]+?\})\}\)/)?.[1];
test('sent-message mentions open the exact identity ID, excluding broadcast mentions', () => {
  assert.ok(callback);
  const opened = [];
  const onMentionClick = vm.runInNewContext('(' + callback + ')', { setEvaIdentityProfile: id => opened.push(id) });
  const ids = ['u-wangyilin', 'persona-linxiao', 'assistant-eva', 'employee-analyst', 'project-agent:prod'];
  ids.forEach(onMentionClick);
  ['all', 'channel', '', null, undefined].forEach(onMentionClick);
  assert.deepEqual(opened, ids);
});
