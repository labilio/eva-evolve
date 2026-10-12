import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

async function setup(run) {
 const server=createServer(new URL('../../dist',import.meta.url).pathname);
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'});
 const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];
 page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.motionEvents=[];
  document.addEventListener('animationend',e=>window.motionEvents.push({name:e.animationName,classes:e.target.className+' '+(e.target.querySelector('.semi-dropdown')?'semi-dropdown':'')+' '+(e.target.querySelector('.eva-popconfirm')?'eva-popconfirm':'')}),true);
 });
 try{await run(page,`http://127.0.0.1:${server.address().port}`);assert.deepEqual(errors,[]);}
 finally{await browser.close();await new Promise(r=>server.close(r));}
}
async function motion(page,phase,selector) {
 await page.waitForFunction(({phase,selector})=>window.motionEvents.some(e=>e.classes.includes(selector)&&e.classes.includes(`animation-${phase}`)),{phase,selector},{timeout:3000}).catch(()=>{});
 const events=await page.evaluate(()=>window.motionEvents);
 assert.ok(events.some(e=>e.classes.includes(selector)&&e.classes.includes(`animation-${phase}`)),`${selector} should use Semi ${phase} motion: ${JSON.stringify(events)}`);
 await page.evaluate(()=>{window.motionEvents=[];});
}
async function settled(locator) {
 await locator.evaluate(async el=>{await Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));});
}

test('文件菜单、编辑标签和删除确认沿用 Semi 进退场，取消后可重新打开',()=>setup(async(page,origin)=>{
 await page.goto(origin+'/#/drive');
 await page.locator('[data-drive-scope="workspace"][data-workspace-id="prod"]').click();
 const toolbar=page.getByRole('button',{name:'添加外部资源',exact:true});
 await toolbar.click();await page.getByRole('menuitem',{name:'外部链接',exact:true}).waitFor();
 await settled(page.locator('.semi-dropdown').last());await motion(page,'show','semi-dropdown');
 await page.mouse.click(1100,120);await page.getByRole('menuitem',{name:'外部链接',exact:true}).waitFor({state:'hidden'});await motion(page,'hide','semi-dropdown');
 const item=await page.evaluate(()=>{const c=window.__evaGetFileContext();return c.files.list('prod',c.store.actorId()).find(i=>i.parent_id===0&&i.type==='blob');});
 const more=page.getByRole('button',{name:'更多操作：'+item.name,exact:true});
 await more.click();await page.getByRole('menuitem',{name:'编辑标签',exact:true}).click();
 const form=page.getByRole('dialog',{name:'编辑标签',exact:true});await form.waitFor();await settled(form);await motion(page,'show','eva-popover');
 await form.getByRole('button',{name:'取消',exact:true}).click();await form.waitFor({state:'hidden'});await motion(page,'hide','eva-popover');
 await more.click();await page.getByRole('menuitem',{name:'编辑标签',exact:true}).click();await form.waitFor();
 await form.getByRole('button',{name:'取消',exact:true}).click();await form.waitFor({state:'hidden'});
 await page.evaluate(id=>{const c=window.__evaGetFileContext();c.files.trash(c.store.actorId(),id);},item.id);
 await page.getByRole('button',{name:'回收站',exact:true}).click();
 await more.click();await page.getByRole('menuitem',{name:'永久删除',exact:true}).click();
 const confirm=page.getByRole('dialog',{name:'永久删除“'+item.name+'”？',exact:true});await confirm.waitFor();await settled(confirm);await motion(page,'show','eva-popconfirm');
 await confirm.getByRole('button',{name:'取消',exact:true}).click();await confirm.waitFor({state:'hidden'});await motion(page,'hide','eva-popconfirm');
 assert.equal(await more.evaluate(e=>e===document.activeElement),true);
 await more.click();await page.getByRole('menuitem',{name:'永久删除',exact:true}).click();
 await confirm.getByRole('button',{name:'永久删除',exact:true}).click();await confirm.waitFor({state:'hidden'});await more.waitFor({state:'hidden'});
 await page.goto(origin+'/#/contacts');await page.goto(origin+'/#/drive');
 assert.equal(await page.locator('.eva-popover,.eva-popconfirm').count(),0);
}));

test('身份卡不播放过渡动画，Escape 后返回入口',()=>setup(async(page,origin)=>{
 await page.goto(origin+'/#/contacts');
 const trigger=page.getByRole('button',{name:'查看 王宜林的 AI 分身 的资料'}).first();
 await trigger.click();const card=page.locator('.eva-person-card-popover');await card.waitFor();
 assert.equal(await card.evaluate(el=>getComputedStyle(el).animationName),'none');
 assert.equal(await card.evaluate(el=>el.getAnimations().length),0);
 await page.keyboard.press('Escape');await card.waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>window.motionEvents.some(e=>e.classes.includes('eva-person-card-popover'))),false);
 assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);
}));
