import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the callback actually passed to Octo TextContent by the build adapter.
const patch = fs.readFileSync(new URL('../prototype/009-5-patch-im.js', import.meta.url), 'utf8');
const callback = patch.match(/onMentionClick:((?:\(uid,event\)|uid)=>\{[^\n]+?\})\}\)/)?.[1];
test('sent-message mentions open the exact identity ID, excluding broadcast mentions', () => {
  assert.ok(callback);
  const opened = [];
  let current=null;
  const onMentionClick = vm.runInNewContext('(' + callback + ')', { setEvaIdentityProfile: update => {current=typeof update==='function'?update(current):update;opened.push(current);} });
  const ids = ['u-wangyilin', 'persona-linxiao', 'assistant-eva', 'employee-analyst', 'project-agent:prod'];
  const anchors=ids.map(id=>({id:'mention-'+id}));
  ids.forEach((id,index)=>onMentionClick(id,{currentTarget:anchors[index]}));
  ['all', 'channel', '', null, undefined].forEach(id=>onMentionClick(id,{currentTarget:anchors[0]}));
  assert.deepEqual(opened.map(item=>item.identity),ids);
  assert.ok(opened.every((item,index)=>item.anchor===anchors[index]));
  onMentionClick(ids.at(-1),{currentTarget:anchors.at(-1)});
  assert.equal(current,null,'再次点击同一提及入口应收起资料卡');
});
