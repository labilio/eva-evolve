import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';
// 「历史子区提及保留 IM 样式与身份点击」用例已移除（2026-09-21）：演示数据重构后
// 已无「本季度间接采购需求」子区会话，该入口不再存在；历史消息提及的渲染与身份点击
// 由「IM @ 广播文案…」等其余用例及 tests/task-assignee-search.test.mjs 覆盖。

test('IM @ 广播文案按会话上下文区分且候选不含本人与项目管家',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:800}});await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());

  // 项目群：人类与 AI 广播都带副标题
  await page.goto(origin+'/#/messages');await page.waitForTimeout(1500);
  await page.getByText('供应链运营协同',{exact:true}).first().click();await page.waitForTimeout(700);
  const editor=page.locator('[contenteditable="true"]').first();await editor.click();await page.keyboard.type('@');
  const picker=page.locator('.eva-im-mention-picker');await picker.waitFor();
  const copies=await picker.locator('.eva-im-mention-broadcast-copy').allInnerTexts();
  assert.equal(copies.length,2,'项目群应同时提供人类与 AI 广播');
  assert.match(copies[0],/所有人[\s\S]*提及所有联系人/);
  assert.match(copies[1],/所有 AI 成员[\s\S]*提及所有 AI 分身与数字员工/);
  assert.equal(await picker.getByText('王宜林',{exact:true}).count(),0,'候选不含本人真人');
  assert.equal(await picker.getByText('供应链运营协同 · 项目管家',{exact:true}).count(),0,'候选不含项目管家');
  await page.keyboard.press('Escape');

  // 我的 AI 小队：只保留 AI 广播，且不带副标题
  await page.goto(origin+'/#/messages?evaIM=my-ai');await page.waitForTimeout(1500);
  await page.getByText('我的 AI 小队',{exact:true}).first().click();await page.waitForTimeout(700);
  const teamEditor=page.locator('[contenteditable="true"]').first();await teamEditor.click();await page.keyboard.type('@');
  const teamPicker=page.locator('.eva-im-mention-picker');await teamPicker.waitFor();
  const teamCopies=await teamPicker.locator('.eva-im-mention-broadcast-copy').allInnerTexts();
  assert.equal(teamCopies.length,1,'AI 小队只提供 AI 广播');
  assert.match(teamCopies[0],/所有 AI 成员/);
  assert.doesNotMatch(teamCopies[0],/提及所有/,'AI 小队广播不带副标题');
  assert.doesNotMatch(teamCopies[0],/所有人/,'AI 小队不显示人类广播');
  assert.ok((await teamPicker.locator('.eva-im-mention-options button').count())>1,'AI 小队应列出具体 AI 候选');
  assert.deepEqual(await teamPicker.locator('.eva-im-mention-group').allInnerTexts(),['云端分身','个人助理','数字员工'],'AI 小队候选按身份类型分组');
  assert.ok((await teamPicker.locator('.eva-im-mention-chip').count())>1,'AI 小队候选提供类型筛选');

  // AI 单聊：不提供提及广播
  await page.goto(origin+'/#/messages?evaIM=my-ai');await page.waitForTimeout(1500);
  await page.getByText('王宜林的 AI 分身',{exact:true}).first().click();await page.waitForTimeout(800);
  const directEditor=page.locator('[contenteditable="true"]').first();await directEditor.click();await page.keyboard.type('@');await page.waitForTimeout(500);
  assert.equal(await page.locator('.eva-im-mention-picker').count(),0,'AI 单聊不提供广播提及');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
