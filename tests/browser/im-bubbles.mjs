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
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage(), errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/#/messages');
 await page.locator('.eva-im-bubble-row').first().waitFor();
 const directions=await page.locator('.eva-im-bubble-row').evaluateAll(rows=>rows.map(e=>{const a=e.querySelector('.wk-msg-row-avatar').getBoundingClientRect(),b=e.querySelector('.wk-msg-row-body').getBoundingClientRect();return{send:e.classList.contains('wk-msg-row--send'),a:a.x,b:b.x,right:b.right};}));
 assert.ok(directions.some(r=>r.send));assert.ok(directions.some(r=>!r.send));
 for(const r of directions) assert.ok(r.send?r.a>=r.right:r.a<r.b,'头像和气泡方向');
 await page.screenshot({path:'/tmp/eva-bubble-1200.png'});
 const editor=page.getByRole('textbox',{name:'发送给 全员群'});
 const markdown='# 气泡验证\n\n**中文粗体**与普通正文。\n\n> 引用保持左对齐\n\n- 第一项\n- 第二项\n\n```js\nconst value = "'+ 'long_value_'.repeat(35)+'";\n```\n\n|项目|描述|\n|---|---|\n|测试|'+ '宽表格内容'.repeat(40)+'|';
 // Feed a literal multiline draft: the baseline contenteditable serializes DOM line breaks via textContent.
 await editor.evaluate((el,text)=>{el.textContent=text;el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:text}));},markdown);await page.getByRole('button',{name:'发送',exact:true}).click();
 const sent=page.locator('.eva-im-bubble-row').last();
 await sent.locator('h1').waitFor();assert.match(await sent.getAttribute('class'),/wk-msg-row--send/);
 assert.equal(await sent.locator('strong').innerText(),'中文粗体');assert.equal(await sent.locator('blockquote').count(),1);assert.equal(await sent.locator('pre').count(),1);assert.equal(await sent.locator('table').count(),1);
 for(const width of [1200,1000]){
 await page.setViewportSize({width,height:800});
 const overflow=await sent.evaluate(e=>{const b=e.querySelector('.wk-msg-row-body'),s=e.closest('.ch-stream');return{body:b.scrollWidth-b.clientWidth,stream:s.scrollWidth-s.clientWidth,viewport:document.documentElement.scrollWidth-innerWidth};});
 assert.ok(overflow.body<=1,JSON.stringify(overflow));assert.ok(overflow.stream<=1,JSON.stringify(overflow));assert.ok(overflow.viewport<=1,JSON.stringify(overflow));
 }
 await page.setViewportSize({width:1200,height:800});await sent.scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/eva-bubble-markdown.png'});
 await sent.click({button:'right'});await page.locator('.wk-contextmenus-open').waitFor();assert.match(await page.locator('.wk-contextmenus-open').innerText(),/复制/);await page.keyboard.press('Escape');
 await editor.fill('未发送的草稿');await page.getByRole('button',{name:'聊天信息',exact:true}).click();assert.equal(await editor.innerText(),'未发送的草稿');await page.locator('.eva-chat-settings-head button').first().click();
 await page.getByRole('button',{name:'最近',exact:true}).click();await page.getByRole('button',{name:'关注',exact:true}).click();assert.equal(await editor.innerText(),'未发送的草稿');
 await page.locator('[data-eva-nav-id="new-chat"]').click();await page.waitForURL('**/#/guid');await page.locator('.eva-im-bubble-row').first().waitFor({state:'detached'});assert.equal(await page.locator('.eva-im-bubble-row').count(),0);await page.screenshot({path:'/tmp/eva-bubble-personal.png'});
 await page.locator('[data-eva-nav-id="my-ai"]').click();await page.waitForURL('**evaIM=my-ai');await page.getByRole('heading',{name:'我的 AI',exact:true}).waitFor();await page.getByRole('textbox',{name:'发送给 保供晨会'}).waitFor();assert.ok(await page.locator('.eva-im-bubble-row.wk-msg-row--send').count()>0);assert.ok(await page.locator('.eva-im-bubble-row:not(.wk-msg-row--send)').count()>0);await page.screenshot({path:'/tmp/eva-bubble-my-ai.png'});
 await page.getByRole('button',{name:'供应商整改',exact:true}).click();await page.getByRole('textbox',{name:'发送给 供应商整改'}).waitFor();assert.ok(await page.locator('.eva-im-bubble-row').count()>0);
 await page.locator('[data-eva-nav-id="messages"]').click();await page.locator('.eva-im-bubble-row').first().waitFor();
 await page.getByRole('button',{name:'02 Markdown 与宽内容',exact:true}).click();await page.getByRole('textbox',{name:'发送给 02 Markdown 与宽内容'}).waitFor();
 assert.equal(await page.locator('.eva-im-bubble-row pre').count(),2);assert.equal(await page.locator('.eva-im-bubble-row table').count(),4);
 await page.screenshot({path:'/tmp/eva-bubble-lab-markdown.png'});
 await page.getByRole('button',{name:'03 图片与文件卡片',exact:true}).click();await page.locator('.wk-markdown-img').waitFor();await page.waitForFunction(()=>document.querySelector('.wk-markdown-img')?.naturalWidth>0);
 assert.equal(await page.locator('.wk-message-file').count(),4);await page.screenshot({path:'/tmp/eva-bubble-lab-files.png'});
 await page.locator('.wk-markdown-img').click();await page.locator('.yarl__portal_open').waitFor();await page.keyboard.press('Escape');await page.locator('.yarl__portal_open').waitFor({state:'detached'});
 await page.locator('.wk-message-file').first().click();await page.locator('.wk-file-preview-panel').waitFor();await page.locator('.wk-file-preview-content').getByText('A-2409', {exact:false}).first().waitFor();await page.screenshot({path:'/tmp/eva-bubble-file-preview.png'});await page.keyboard.press('Escape');await page.locator('.wk-file-preview-panel').waitFor({state:'detached'});

 await page.getByRole('button',{name:'01 普通对话与连续消息',exact:true}).click();await page.getByRole('textbox',{name:'发送给 01 普通对话与连续消息'}).waitFor();await page.screenshot({path:'/tmp/eva-bubble-lab-basic.png'});
 const seeded=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('eva:project-members:v1'));return {groups:Object.values(s.groups).filter(g=>g.id==='im-bubble-lab').length,messages:s.messages['im-bubble-basic'].length};});
 await page.reload();await page.locator('.ch-layout').waitFor();
 assert.deepEqual(await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('eva:project-members:v1'));return {groups:Object.values(s.groups).filter(g=>g.id==='im-bubble-lab').length,messages:s.messages['im-bubble-basic'].length};}),seeded);
 assert.equal(seeded.groups,1);assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
