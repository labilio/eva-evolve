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

test('批量与具体成员提及在输入和发送后共用带底色外观',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  for(const [route,title,labels] of [['/messages','供应链运营协同',['所有人','所有 AI 成员','林晓']],['/messages?evaIM=my-ai','我的 AI 小队',['所有 AI 成员','王宜林的 AI 分身']]]){
   await page.goto(origin+'/#'+route);await page.getByText(title,{exact:true}).first().click();
   const editor=page.locator('[contenteditable="true"]').first();await editor.waitFor();
   for(const label of labels){await editor.click();await page.keyboard.type('@');const picker=page.locator('.eva-im-mention-picker');await picker.waitFor();await picker.locator('.eva-im-mention-options > button').filter({hasText:label}).first().click();}
   const read=locator=>locator.evaluateAll(nodes=>nodes.map(n=>{const s=getComputedStyle(n);return {text:n.textContent,color:s.color,background:s.backgroundColor,radius:s.borderRadius,padding:s.padding,font:s.fontWeight};}));
   for(const theme of ['light','dark']){await page.evaluate(t=>window.EvaTheme.apply(t),theme);const styles=await read(editor.locator('.mention-entity'));assert.equal(styles.length,labels.length);assert.notEqual(styles[0].background,'rgba(0, 0, 0, 0)');for(const style of styles)assert.deepEqual({...style,text:''},{...styles.at(-1),text:''});}
   await page.keyboard.press('End');await page.keyboard.type(' 提及样式验收');await page.keyboard.press('Enter');
   const message=page.locator('.wk-msg-text-content').filter({hasText:'提及样式验收'}).last();await message.waitFor();
   for(const theme of ['light','dark']){await page.evaluate(t=>window.EvaTheme.apply(t),theme);const styles=await read(message.locator('.mention-entity'));assert.equal(styles.length,labels.length,'发送后全部对象仍是提及实体');assert.notEqual(styles[0].background,'rgba(0, 0, 0, 0)');for(const style of styles)assert.deepEqual({...style,text:''},{...styles.at(-1),text:''});}
   if(title==='供应链运营协同'){await page.evaluate(()=>window.EvaTheme.apply('light'));await page.screenshot({path:'/tmp/eva-mention-style-light.png'});}
  }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});

test('手打和纯文本粘贴不是提及；已选对象跨草稿刷新保留且按出现位置发送',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(10000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(origin+'/#/messages');await page.getByText('供应链运营协同',{exact:true}).first().click();
  let editor=page.locator('[contenteditable="true"]').first();await editor.click();await page.keyboard.insertText('@林晓 @所有人 @所有 AI 成员 普通文字');await page.keyboard.press('Escape');await page.getByRole('button',{name:'发送',exact:true}).click();
  let message=page.locator('.wk-msg-text-content').filter({hasText:'普通文字'}).last();await message.waitFor();assert.equal(await message.locator('.mention-entity').count(),0);
  // Same label appears as plain text first, and a confirmed identity second.
  await editor.click();await page.keyboard.insertText('@林晓 ');await page.keyboard.press('Escape');await page.keyboard.type('@');await page.locator('.eva-im-mention-picker').getByRole('button',{name:'林晓',exact:true}).click();
  assert.equal(await editor.locator('.mention-entity').count(),1);
  await page.goto(origin+'/#/contacts');await page.goto(origin+'/#/messages');await page.getByText('供应链运营协同',{exact:true}).first().click();
  editor=page.locator('[contenteditable="true"]').first();await editor.waitFor();assert.equal(await editor.locator('.mention-entity').count(),1,'往返保留提及对象');
  await page.reload();editor=page.locator('[contenteditable="true"]').first();await editor.waitFor();assert.equal(await editor.locator('.mention-entity').count(),1,'刷新保留提及对象');
  // HTML with a forged mention class is pasted only as plain text.
  await editor.click();await page.keyboard.press('ControlOrMeta+End');
  await editor.evaluate(node=>{const data=new DataTransfer();data.setData('text/plain',' @林晓 粘贴文本');data.setData('text/html','<span class="mention-entity" data-mention-uid="u-linxiao">@林晓</span>');node.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:data}));});
  assert.equal(await editor.locator('.mention-entity').count(),1);
  await page.getByRole('button',{name:'发送',exact:true}).click();message=page.locator('.wk-msg-text-content').filter({hasText:'粘贴文本'}).last();await message.waitFor();assert.equal(await message.locator('.mention-entity').count(),1,'只有选中的一次高亮');assert.equal(await message.locator('.mention-entity').textContent(),'@林晓');
  const order=await message.locator('p').evaluate(node=>Array.from(node.childNodes).map(n=>({text:n.textContent,mention:n.nodeType===1&&n.classList.contains('mention-entity')})));assert.ok(order[0].text.includes('@林晓'));assert.equal(order[0].mention,false);assert.equal(order[1].mention,true);
  await page.screenshot({path:'/tmp/eva-explicit-mentions.png'});assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});

test('批量搜索与键盘确认、中文组字、删除、子区及 AI 触发边界',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(origin+'/#/messages');await page.getByRole('button',{name:'最近',exact:true}).click();await page.getByRole('heading',{name:'采购与招投标',exact:true}).click();
  await page.getByRole('navigation',{name:'群聊子区'}).getByRole('tab').nth(1).click();
  const editor=page.locator('[contenteditable="true"]').last();await editor.click();await page.keyboard.insertText('@所有人');await page.locator('.eva-im-mention-picker').waitFor();
  assert.equal(await page.locator('.eva-im-mention-options > button').count(),1,'搜索完整批量名称仍可选中');
  await editor.evaluate(node=>node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true})));assert.equal(await editor.locator('.mention-entity').count(),0,'组字回车不能选中候选');
  await page.keyboard.press('Enter');assert.equal(await editor.locator('.mention-entity').count(),1,'键盘确认才成为提及');
  await page.getByRole('button',{name:'发送',exact:true}).last().click();const sent=page.locator('.wk-msg-text-content').filter({hasText:'@所有人'}).last();await sent.waitFor();assert.equal(await sent.locator('.mention-entity').count(),1);
  await editor.click();await page.keyboard.insertText('@林晓');await page.keyboard.press('Enter');assert.equal(await editor.locator('.mention-entity').count(),1);await page.keyboard.press('ControlOrMeta+A');await page.keyboard.press('Backspace');await page.reload();await page.locator('[contenteditable="true"]').last().waitFor();assert.equal(await page.locator('[contenteditable="true"] .mention-entity').count(),0,'删除后刷新不能复活提及');
  await page.goto(origin+'/#/messages?evaIM=my-ai');await page.getByText('我的 AI 小队',{exact:true}).first().click();const aiEditor=page.locator('[contenteditable="true"]').first();
  const receipts=()=>page.getByText('【原型】已收到你的请求，当前未调用真实服务。',{exact:true});const before=await receipts().count();
  await aiEditor.click();await page.keyboard.insertText('@王宜林的 AI 分身 手打不触发');await page.keyboard.press('Escape');await page.getByRole('button',{name:'发送',exact:true}).click();assert.equal(await receipts().count(),before);
  await aiEditor.click();await page.keyboard.insertText('@王宜林的 AI 分身');await page.keyboard.press('Enter');assert.equal(await aiEditor.locator('.mention-entity').count(),1);await page.getByRole('button',{name:'发送',exact:true}).click();await receipts().last().waitFor();assert.equal(await receipts().count(),before+1);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});

test('广播与分组候选的高亮顺序和回车对象一致',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch({channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  for(const [route,title] of [['/messages','供应链运营协同'],['/messages?evaIM=my-ai','我的 AI 小队']]){
   await page.goto(origin+'/#'+route);await page.getByText(title,{exact:true}).first().click();
   const editor=page.locator('[contenteditable="true"]').first();await editor.waitFor();
   const open=async()=>{await editor.fill('');await editor.pressSequentially('@');await page.locator('.eva-im-mention-picker').waitFor();};
   const options=page.locator('.eva-im-mention-options > button:not([data-eva-mention-more])');
   await open();
   // Hovering the visible broadcast must select that same object with Enter.
   await options.filter({hasText:'所有 AI 成员'}).hover();
   await page.keyboard.press('Enter');
   assert.equal(await editor.locator('.mention-entity').getAttribute('data-mention-uid'),'ai');
   await open();
   const count=await options.count();
   for(let index=0;index<count;index++){
    assert.equal(await options.nth(index).getAttribute('class'),'is-active','高亮顺序应与视觉顺序一致：'+index);
    await page.keyboard.press('ArrowDown');
   }
   assert.equal(await options.first().getAttribute('class'),'is-active','末项应循环回首项');
   await page.keyboard.press('ArrowUp');
   assert.equal(await options.last().getAttribute('class'),'is-active');
   const lastText=await options.last().innerText();
   await page.keyboard.press('Enter');
   assert.ok(lastText.includes((await editor.locator('.mention-entity').innerText()).replace(/^@/,'')));
  }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
