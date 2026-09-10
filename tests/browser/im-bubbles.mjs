import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('共享 IM 气泡：方向、Markdown、消息操作、草稿及入口往返', async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({channel:'msedge'});
 try {
 const context=await browser.newContext({viewport:{width:1200,height:800}});
 await context.grantPermissions(['clipboard-read','clipboard-write'],{origin});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/#/messages');
 await page.locator('.eva-im-bubble-row').first().waitFor();
 const directions=await page.locator('.eva-im-bubble-row').evaluateAll(rows=>rows.map(e=>{const a=e.querySelector('.wk-msg-row-avatar').getBoundingClientRect(),b=e.querySelector('.wk-msg-row-body').getBoundingClientRect();return{send:e.classList.contains('wk-msg-row--send'),a:a.x,b:b.x,right:b.right};}));
 assert.ok(directions.some(r=>r.send));assert.ok(directions.some(r=>!r.send));
 for(const r of directions) assert.ok(r.send?r.a>=r.right:r.a<r.b,'头像和气泡方向');
 for(const selector of ['.eva-im-bubble-row.wk-msg-row--send','.eva-im-bubble-row:not(.wk-msg-row--send)']) {
 const row=page.locator(selector).first();await row.hover();
 assert.equal(await row.evaluate(e=>getComputedStyle(e,'::before').content),'none','气泡消息不保留整行 hover 灰底');
 }
 for(const selector of ['.eva-im-bubble-row.wk-msg-row--send','.eva-im-bubble-row:not(.wk-msg-row--send)']) {
   const row=page.locator(selector).first();await row.scrollIntoViewIfNeeded();const box=await row.boundingBox();
   await page.mouse.click(Math.min(box.x+box.width-4,1195),Math.min(box.y+box.height-4,710),{button:'right'});
   await page.locator('.wk-contextmenus-open').waitFor();const menu=await page.locator('.wk-contextmenus-open').boundingBox();
   assert.ok(menu.x>=0&&menu.y>=36&&menu.x+menu.width<=1200&&menu.y+menu.height<=800,'右键菜单保持在标题栏下方可见区域');
   await page.keyboard.press('Escape');await page.locator('.wk-contextmenus-open').waitFor({state:'hidden'});
 }
 await page.screenshot({path:'/tmp/eva-bubble-1200.png'});
 const editor=page.getByRole('textbox',{name:'发送给 全员群'});
 const markdown='# 气泡验证\n\n**中文粗体**与普通正文。\n\n> 引用保持左对齐\n\n- 第一项\n- 第二项\n\n```js\nconst value = "'+ 'long_value_'.repeat(35)+'";\n```\n\n|项目|描述|\n|---|---|\n|测试|'+ '宽表格内容'.repeat(40)+'|';
 await editor.fill(markdown);await page.getByRole('button',{name:'发送',exact:true}).click();
 const sent=page.locator('.eva-im-bubble-row').last();
 await sent.locator('h1').waitFor();assert.match(await sent.getAttribute('class'),/wk-msg-row--send/);
 assert.equal(await sent.locator('strong').innerText(),'中文粗体');assert.equal(await sent.locator('blockquote').count(),1);assert.equal(await sent.locator('pre').count(),1);assert.equal(await sent.locator('table').count(),1);
 for(const width of [1200,1000]){
 await page.setViewportSize({width,height:800});
 const overflow=await sent.evaluate(e=>{const b=e.querySelector('.wk-msg-row-body'),s=e.closest('.ch-stream');return{body:b.scrollWidth-b.clientWidth,stream:s.scrollWidth-s.clientWidth,viewport:document.documentElement.scrollWidth-innerWidth};});
 assert.ok(overflow.body<=1,JSON.stringify(overflow));assert.ok(overflow.stream<=1,JSON.stringify(overflow));assert.ok(overflow.viewport<=1,JSON.stringify(overflow));
 }
 await page.setViewportSize({width:1200,height:800});await sent.scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/eva-bubble-markdown.png'});
 await sent.click({button:'right'});await page.locator('.wk-contextmenus-open').waitFor();await page.locator('.wk-contextmenus-open').getByText('复制',{exact:true}).click();
 await page.getByText('已复制',{exact:true}).waitFor();
 assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),markdown,'复制保留完整 Markdown 原文及换行');
 await page.evaluate(()=>{window.__evaClipboardWrite=Object.getOwnPropertyDescriptor(navigator.clipboard,'writeText');Object.defineProperty(navigator.clipboard,'writeText',{configurable:true,value:()=>Promise.reject(new DOMException('Denied','NotAllowedError'))});});
 await sent.click({button:'right'});await page.locator('.wk-contextmenus-open').getByText('复制',{exact:true}).click();await page.getByText('复制失败，请选择消息文字后手动复制',{exact:true}).waitFor();
 await page.evaluate(()=>{delete navigator.clipboard.writeText;if(window.__evaClipboardWrite)Object.defineProperty(navigator.clipboard,'writeText',window.__evaClipboardWrite);delete window.__evaClipboardWrite;});
 await sent.click({button:'right'});await page.locator('.wk-contextmenus-open').getByText('多选',{exact:true}).click();
 await page.getByRole('region',{name:'消息多选'}).getByText('已选择 1 条消息',{exact:true}).waitFor();
 const other=page.locator('.eva-im-bubble-row:not(.wk-msg-row--send)').first();await other.click();
 await page.getByRole('region',{name:'消息多选'}).getByText('已选择 2 条消息',{exact:true}).waitFor();
 const selectedCheckbox=other.getByRole('checkbox');await selectedCheckbox.focus();await page.keyboard.press('Space');assert.equal(await selectedCheckbox.getAttribute('aria-checked'),'false');await page.keyboard.press('Space');assert.equal(await selectedCheckbox.getAttribute('aria-checked'),'true');
 const checks=await page.locator('.eva-im-bubble-row .wk-msg-row-checkbox').evaluateAll(nodes=>nodes.map(e=>e.getBoundingClientRect().left));
 assert.ok(Math.max(...checks)-Math.min(...checks)<=2,'左右气泡的复选框位于同一列');
 await page.screenshot({path:'/tmp/eva-bubble-multiselect.png'});
 await other.click();await page.getByRole('region',{name:'消息多选'}).getByText('已选择 1 条消息',{exact:true}).waitFor();
 await page.getByRole('region',{name:'消息多选'}).getByRole('button',{name:'逐条转发',exact:true}).click();await page.getByRole('radiogroup',{name:'目标会话'}).waitFor();
 await page.keyboard.press('Escape');await page.getByRole('radiogroup',{name:'目标会话'}).waitFor({state:'detached'});assert.ok(await page.locator('.wk-msg-row--selection-mode').count()>0,'Esc 先关闭转发弹窗，保留底层多选');
 await page.keyboard.press('Escape');assert.equal(await page.locator('.wk-msg-row--selection-mode').count(),0,'再次 Esc 退出多选');
 await sent.click({button:'right'});await page.locator('.wk-contextmenus-open').getByText('回复',{exact:true}).click();
 await page.getByRole('button',{name:'取消回复',exact:true}).waitFor();
 assert.equal(await editor.locator('.mention-entity').count(),0,'回复自己不自动提及');
 await page.getByRole('button',{name:'取消回复',exact:true}).click();
 await editor.fill('已有草稿');
 await other.click({button:'right'});await page.locator('.wk-contextmenus-open').getByText('回复',{exact:true}).click();
 await editor.locator('.mention-entity').waitFor();
 assert.match(await editor.innerText(),/^已有草稿 @/,'群聊回复别人时保留草稿并自动提及');
 assert.equal(await editor.locator('.mention-entity').getAttribute('contenteditable'),'false','提及使用现有实体样式');
 assert.equal(await editor.evaluate(e=>e===document.activeElement),true,'回复后聚焦输入框');
 const replyDraft=await editor.innerText();await page.getByRole('button',{name:'取消回复',exact:true}).click();assert.equal(await editor.innerText(),replyDraft,'取消引用保留自动提及和草稿');
 await sent.click({button:'right'});await page.locator('.wk-contextmenus-open').getByText('回复',{exact:true}).click();
 await editor.fill('保留回复草稿');await page.getByRole('button',{name:'取消回复',exact:true}).click();assert.equal(await editor.innerText(),'保留回复草稿');
 await sent.click({button:'right'});await page.locator('.wk-contextmenus-open').getByText('回复',{exact:true}).click();await editor.fill('引用测试正文');await page.getByRole('button',{name:'发送',exact:true}).click();
 const replied=page.locator('.eva-im-bubble-row').last();await replied.locator('.wk-reply-block').waitFor();assert.match(await replied.innerText(),/引用测试正文/);assert.equal(await page.getByRole('button',{name:'取消回复',exact:true}).count(),0);
 await replied.locator('.wk-reply-block').click();await page.locator('.eva-conversation-search-hit').waitFor();assert.match(await page.locator('.eva-conversation-search-hit').innerText(),/气泡验证/);
 await replied.scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/eva-bubble-reply.png'});
 await replied.click({button:'right'});await page.locator('.wk-contextmenus-open').getByText('转发',{exact:true}).click();
 await page.getByRole('button',{name:'取消',exact:true}).click();assert.equal(await page.getByRole('radiogroup',{name:'目标会话'}).count(),0);
 await replied.click({button:'right'});await page.locator('.wk-contextmenus-open').getByText('转发',{exact:true}).click();
 await page.getByRole('radio',{name:'IM 气泡验证 / 01 日常聊天与连续消息',exact:true}).check();
 await page.getByRole('button',{name:'确认转发',exact:true}).click();await page.getByRole('radiogroup',{name:'目标会话'}).waitFor({state:'detached'});
 assert.ok(await page.evaluate(()=>window.EvaMembership&&JSON.parse(localStorage.getItem('eva:project-members:v1')).messages['im-bubble-basic'].some(m=>m.forwarded&&m.text==='引用测试正文')));
 await editor.fill('未发送的草稿');await page.getByRole('button',{name:'聊天信息',exact:true}).click();assert.equal(await editor.innerText(),'未发送的草稿');await page.locator('.eva-chat-settings-head button').first().click();
 await page.getByRole('button',{name:'最近',exact:true}).click();await page.getByRole('button',{name:'关注',exact:true}).click();assert.equal(await editor.innerText(),'未发送的草稿');
 await page.locator('[data-eva-nav-id="new-chat"]').click();await page.waitForURL('**/#/guid');await page.locator('.eva-im-bubble-row').first().waitFor({state:'detached'});assert.equal(await page.locator('.eva-im-bubble-row').count(),0);await page.screenshot({path:'/tmp/eva-bubble-personal.png'});
 await page.locator('[data-eva-nav-id="my-ai"]').click();await page.waitForURL('**evaIM=my-ai');await page.getByRole('heading',{name:'我的 Agent',exact:true}).waitFor();await page.getByRole('textbox',{name:'发送给 保供晨会'}).waitFor();assert.ok(await page.locator('.eva-im-bubble-row.wk-msg-row--send').count()>0);assert.ok(await page.locator('.eva-im-bubble-row:not(.wk-msg-row--send)').count()>0);await page.screenshot({path:'/tmp/eva-bubble-my-ai.png'});
 const aiOriginal=page.locator('.eva-im-bubble-row').first();await aiOriginal.click({button:'right'});await page.locator('.wk-contextmenus-open').getByText('回复',{exact:true}).click();
 await page.getByRole('textbox',{name:'发送给 保供晨会'}).fill('团队引用回归');await page.getByRole('button',{name:'发送',exact:true}).click();
 await page.locator('.eva-im-bubble-row').last().getByText('团队引用回归',{exact:true}).waitFor();assert.equal(await page.locator('.eva-im-bubble-row').last().locator('.wk-reply-block').count(),1);
 await page.getByRole('button',{name:'供应商整改',exact:true}).click();await page.getByRole('textbox',{name:'发送给 供应商整改'}).waitFor();assert.ok(await page.locator('.eva-im-bubble-row').count()>0);
 await page.locator('[data-eva-nav-id="messages"]').click();await page.locator('.eva-im-bubble-row').first().waitFor();
 await page.getByRole('button',{name:'03 Markdown 与长内容',exact:true}).click();await page.getByRole('textbox',{name:'发送给 03 Markdown 与长内容'}).waitFor();
 assert.equal(await page.locator('.eva-im-bubble-row pre').count(),6);assert.equal(await page.locator('.eva-im-bubble-row table').count(),6);
 const palettes=await page.locator('.eva-im-bubble-row pre [class*="hljs-"]').evaluateAll(nodes=>nodes.map(e=>({fg:getComputedStyle(e).color,bg:getComputedStyle(e.closest('.wk-markdown-pre-wrapper')).backgroundColor})));
 const luminance=rgb=>rgb.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=rgb.startsWith("color(srgb")?1:255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 assert.ok(palettes.length>0);for(const {fg,bg} of palettes){const a=luminance(fg),b=luminance(bg);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,fg+' on '+bg);}
 const tables=await page.locator('.eva-im-bubble-row table').evaluateAll(nodes=>nodes.map(e=>({right:e.getBoundingClientRect().right,cellRight:e.querySelector('tr').lastElementChild.getBoundingClientRect().right,bg:getComputedStyle(e).backgroundColor})));
 for(const t of tables){assert.ok(Math.abs(t.right-t.cellRight)<=2,'表头铺齐表格');assert.equal(t.bg,'rgb(255, 255, 255)');}
 await page.screenshot({path:'/tmp/eva-bubble-lab-markdown.png'});
 await page.locator('.eva-im-bubble-row.wk-msg-row--send').filter({hasText:'代码与宽表格'}).last().scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/eva-bubble-code-refined.png'});
 await page.getByRole('button',{name:'04 图片与文件',exact:true}).click();await page.locator('.wk-markdown-img').first().waitFor();await page.waitForFunction(()=>document.querySelector('.wk-markdown-img')?.naturalWidth>0);
 await page.locator('.wk-message-file').first().click({button:'right'});await page.locator('.wk-contextmenus-open').getByText('多选',{exact:true}).click();
 await page.locator('.eva-im-bubble-row').filter({has:page.locator('.wk-message-file')}).nth(1).click();await page.getByRole('region',{name:'消息多选'}).getByText('已选择 2 条消息',{exact:true}).waitFor();
 assert.equal(await page.locator('.wk-file-preview-panel').count(),0,'多选文件不打开预览');
 await page.getByRole('button',{name:'退出多选',exact:true}).click();
 const fileRows=page.locator('.eva-im-bubble-row').filter({has:page.locator('.wk-message-file')});
 await fileRows.nth(2).click({button:'right'});await page.locator('.wk-contextmenus-open').getByText('多选',{exact:true}).click();await fileRows.nth(0).click();
 await page.getByRole('region',{name:'消息多选'}).getByRole('button',{name:'逐条转发',exact:true}).click();
 await page.getByRole('radio',{name:'IM 气泡验证 / 01 日常聊天与连续消息',exact:true}).check();assert.ok(await page.locator('.ch-main').evaluate(e=>e.getBoundingClientRect().width)>600,'转发弹窗不挤压聊天区');await page.screenshot({path:'/tmp/eva-bubble-forward-dialog.png'});
 await page.getByRole('button',{name:'确认转发',exact:true}).click();await page.getByRole('radiogroup',{name:'目标会话'}).waitFor({state:'detached'});
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('eva:project-members:v1')).messages['im-bubble-basic'].filter(m=>m.forwarded&&m.kind==='file').map(m=>m.file.name)),['A-2409现场复核清单.md','A-2409排产影响测算.html']);
 assert.equal(await page.locator('.wk-msg-row--selection-mode').count(),0,'转发成功后退出多选');
 await fileRows.nth(0).click({button:'right'});await page.locator('.wk-contextmenus-open').getByText('多选',{exact:true}).click();
 await page.getByRole('button',{name:'03 Markdown 与长内容',exact:true}).click();await page.getByRole('textbox',{name:'发送给 03 Markdown 与长内容'}).waitFor();
 assert.equal(await page.locator('.wk-msg-row--selection-mode').count(),0,'切换会话清理多选');
 await page.getByRole('button',{name:'04 图片与文件',exact:true}).click();await page.locator('.wk-message-file').first().waitFor();
 assert.equal(await page.locator('.wk-message-file').count(),8);await page.screenshot({path:'/tmp/eva-bubble-lab-files.png'});
 await page.locator('.wk-markdown-img').first().click();await page.locator('.yarl__portal_open').waitFor();await page.keyboard.press('Escape');await page.locator('.yarl__portal_open').waitFor({state:'detached'});
 await page.locator('.wk-message-file').first().click();await page.locator('.wk-file-preview-panel').waitFor();await page.locator('.wk-file-preview-content').getByText('A-2409', {exact:false}).first().waitFor();await page.screenshot({path:'/tmp/eva-bubble-file-preview.png'});await page.keyboard.press('Escape');await page.locator('.wk-file-preview-panel').waitFor({state:'detached'});

 await page.getByRole('button',{name:'01 日常聊天与连续消息',exact:true}).click();await page.getByRole('textbox',{name:'发送给 01 日常聊天与连续消息'}).waitFor();await page.locator('.eva-im-bubble-row').getByText('引用测试正文',{exact:true}).waitFor();await page.screenshot({path:'/tmp/eva-bubble-lab-basic.png'});
 await page.getByRole('button',{name:'03 Markdown 与长内容',exact:true}).click();await page.getByRole('textbox',{name:'发送给 03 Markdown 与长内容'}).waitFor();
 assert.equal(await page.locator('.eva-im-bubble-row').count(),22);
 const quotes=await page.locator('.eva-im-bubble-row .wk-markdown blockquote').evaluateAll(nodes=>nodes.map(e=>({bg:getComputedStyle(e).backgroundColor,border:getComputedStyle(e).borderInlineStartWidth,radius:getComputedStyle(e).borderRadius})));
 assert.ok(quotes.length>=4);for(const q of quotes){assert.equal(q.bg,'rgba(0, 0, 0, 0)');assert.equal(q.border,'3px');assert.equal(q.radius,'0px');}
 const separators=await page.locator('.eva-im-bubble-row .wk-markdown hr').evaluateAll(nodes=>nodes.map(e=>({fg:getComputedStyle(e).borderTopColor,bg:getComputedStyle(e.closest('.wk-msg-row-body')).backgroundColor,width:getComputedStyle(e).borderTopWidth,style:getComputedStyle(e).borderTopStyle})));
 assert.equal(separators.length,2);
 for(const {fg,bg,width,style} of separators){const a=luminance(fg),b=luminance(bg);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=2.5,'两侧气泡分割线清晰可见');assert.equal(width,'1px');assert.equal(style,'solid');}
 await page.locator('.eva-im-bubble-row').nth(3).scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/eva-bubble-divider.png'});
 const inlineStyles=await page.locator('.eva-im-bubble-row .wk-markdown :not(pre) > code').evaluateAll(nodes=>nodes.map(e=>({fg:getComputedStyle(e).color,bg:getComputedStyle(e).backgroundColor})));
 assert.ok(inlineStyles.length>0);
 for(const {fg,bg} of inlineStyles){const a=luminance(fg),b=luminance(bg);assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,'行内代码可读性');}
 for(const width of [1200,1000]){
 await page.setViewportSize({width,height:800});
 const geometry=await page.locator('.eva-im-bubble-row .wk-msg-row-body').evaluateAll(nodes=>nodes.map(e=>({w:e.scrollWidth-e.clientWidth,stream:e.closest('.ch-stream').scrollWidth-e.closest('.ch-stream').clientWidth})));
 for(const item of geometry){assert.ok(item.w<=1,JSON.stringify(item));assert.ok(item.stream<=1,JSON.stringify(item));}
 }
 await page.setViewportSize({width:1200,height:800});
 for(const index of [1,5,7,9,11,13,15]){await page.locator('.eva-im-bubble-row').nth(index).scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/eva-style-audit-'+index+'.png'});}
 const employee=await page.evaluate(()=>{const store=window.EvaDigitalEmployeesStore;const id=store.teamIds().find(id=>store.sessions(id).length);return{id,sessionId:store.sessions(id)[0].id,name:store.get(id).name};});
 await page.goto(origin+'/#/messages?evaIM=my-ai&evaIdentity='+encodeURIComponent(employee.id)+'&evaSession='+encodeURIComponent(employee.sessionId));
 const employeeEditor=page.getByRole('textbox',{name:'发送给 '+employee.name});await employeeEditor.waitFor();
 await page.locator('.eva-im-bubble-row').first().click({button:'right'});await page.locator('.wk-contextmenus-open').getByText('回复',{exact:true}).click();
 await employeeEditor.fill('数字员工引用回归');await page.getByRole('button',{name:'发送',exact:true}).click();
 const employeeReply=page.locator('.eva-im-bubble-row').filter({hasText:'数字员工引用回归'});await employeeReply.locator('.wk-reply-block').waitFor();
 await page.reload();await employeeReply.locator('.wk-reply-block').waitFor();assert.notEqual(await employeeReply.locator('.wk-reply-block__bar').evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)','引用竖线有可见底色');await employeeReply.scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/eva-bubble-employee-reply.png'});
 await employeeReply.click({button:'right'});await page.locator('.wk-contextmenus-open').getByText('转发',{exact:true}).click();
 await page.getByRole('radio',{name:'IM 气泡验证 / 01 日常聊天与连续消息',exact:true}).check();await page.getByRole('button',{name:'确认转发',exact:true}).click();await page.getByRole('radiogroup',{name:'目标会话'}).waitFor({state:'detached'});
 await page.goto(origin+'/#/messages');await page.locator('.ch-layout').waitFor();
 await page.getByRole('button',{name:'01 日常聊天与连续消息',exact:true}).click();await page.locator('.eva-im-bubble-row').getByText('数字员工引用回归',{exact:true}).waitFor();
 const aiTarget=await page.evaluate(()=>{const snapshot=window.EvaAITeam.getSnapshot();const session=snapshot.sessions[0],identity=snapshot.identities.find(item=>item.id===session.identityId);return {identityId:identity.id,sessionId:session.id,name:identity.name+' / '+session.title,count:session.messages.length};});
 await page.locator('.eva-im-bubble-row').filter({hasText:'数字员工引用回归'}).click({button:'right'});await page.locator('.wk-contextmenus-open').getByText('转发',{exact:true}).click();
 await page.locator('.eva-forward-target').filter({hasText:aiTarget.name}).locator('input').check();await page.getByRole('button',{name:'确认转发',exact:true}).click();await page.getByRole('radiogroup',{name:'目标会话'}).waitFor({state:'detached'});
 await page.goto(origin+'/#/messages?evaIM=my-ai&evaIdentity='+encodeURIComponent(aiTarget.identityId)+'&evaSession='+encodeURIComponent(aiTarget.sessionId));
 const aiForwarded=page.locator('.eva-im-bubble-row').filter({hasText:'数字员工引用回归'});await aiForwarded.waitFor();assert.match(await aiForwarded.getAttribute('class'),/wk-msg-row--send/);
 assert.equal(await page.evaluate(id=>window.EvaAITeam.getSnapshot().sessions.find(s=>s.id===id).messages.length,aiTarget.sessionId),aiTarget.count+1,'转发不会追加 AI 回执');
 const employeeTarget=await page.evaluate(info=>{const store=window.EvaDigitalEmployeesStore;const session=store.sessions(info.id).find(s=>s.id===info.sessionId);const source=store.conversationSource(info.id,info.sessionId);const channel=source.selectedThreadId;return{name:info.name+' / '+session.title,count:source.threadMessages[channel].length};},employee);
 await aiForwarded.click({button:'right'});await page.locator('.wk-contextmenus-open').getByText('转发',{exact:true}).click();await page.locator('.eva-forward-target').filter({hasText:employeeTarget.name}).locator('input').check();await page.getByRole('button',{name:'确认转发',exact:true}).click();await page.getByRole('radiogroup',{name:'目标会话'}).waitFor({state:'detached'});
 assert.equal(await page.evaluate(info=>{const source=window.EvaDigitalEmployeesStore.conversationSource(info.id,info.sessionId);return source.threadMessages[source.selectedThreadId].length;},employee),employeeTarget.count+1,'数字员工收到一条转发，不追加回执');
 const teamTarget=await page.evaluate(()=>{const store=window.EvaMyAITeamGroup;const group=store.groups().find(g=>g.system);const source=store.source(group.id,[]);return{id:group.id,name:group.name,count:source.messages[group.id].length};});
 await aiForwarded.click({button:'right'});await page.locator('.wk-contextmenus-open').getByText('转发',{exact:true}).click();await page.getByRole('radio',{name:teamTarget.name,exact:true}).check();await page.getByRole('button',{name:'确认转发',exact:true}).click();await page.getByRole('radiogroup',{name:'目标会话'}).waitFor({state:'detached'});
 await page.goto(origin+'/#/messages?evaIM=my-ai&evaIdentity='+encodeURIComponent(teamTarget.id));await page.getByRole('button',{name:'进入团队会话 '+teamTarget.name,exact:true}).click();await page.locator('.eva-im-bubble-row').getByText('数字员工引用回归',{exact:true}).waitFor();
 assert.equal(await page.evaluate(id=>window.EvaMyAITeamGroup.source(id,[]).messages[id].length,teamTarget.id),teamTarget.count+1);
 const seeded=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('eva:project-members:v1'));return {groups:Object.values(s.groups).filter(g=>g.id==='im-bubble-lab').length,messages:s.messages['im-bubble-basic'].length};});
 await page.reload();await page.locator('.ch-layout').waitFor();
 assert.deepEqual(await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('eva:project-members:v1'));return {groups:Object.values(s.groups).filter(g=>g.id==='im-bubble-lab').length,messages:s.messages['im-bubble-basic'].length};}),seeded);
 assert.equal(seeded.groups,1);assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
