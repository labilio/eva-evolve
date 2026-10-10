import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

test('公共弹窗：打开直接填写、选择焦点、嵌套 Escape 和返回入口',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1200,height:800}});
 page.setDefaultTimeout(5000);
 try{
 await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=files`);
 const open=page.getByRole('button',{name:'新建文件夹',exact:true});await open.click();
 const dialog=page.getByRole('dialog');await dialog.waitFor();
 assert.equal(await dialog.getByRole('textbox').evaluate(el=>el===document.activeElement),true,'打开后应直接填写');
 const geometry=await dialog.evaluate(el=>{const h=el.querySelector('.semi-modal-header'),f=el.querySelector('.semi-modal-footer'),t=el.querySelector('.semi-modal-title');return{header:getComputedStyle(h).borderBottomWidth,footer:getComputedStyle(f).borderTopWidth,title:parseFloat(getComputedStyle(t).fontSize),body:parseFloat(getComputedStyle(el.querySelector('.semi-modal-body')).fontSize)};});
 assert.equal(geometry.header,'1px');assert.equal(geometry.footer,'1px');assert.ok(geometry.title>geometry.body);
 await dialog.evaluate(el=>Promise.all(el.getAnimations({subtree:true}).map(animation=>animation.finished.catch(()=>{}))));
 const gap=await dialog.locator('.eva-dialog-actions').evaluate(el=>{const buttons=el.querySelectorAll('button');return buttons[1].getBoundingClientRect().left-buttons[0].getBoundingClientRect().right;});assert.equal(gap,12,'操作按钮实际间距');
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await open.evaluate(el=>el===document.activeElement),true);
 await page.getByRole('button',{name:'更多操作：会议纪要',exact:true}).click();await page.getByRole('menuitem',{name:'移动',exact:true}).click();
 await dialog.waitFor();const select=dialog.getByRole('combobox');
 assert.equal(await select.evaluate(el=>el===document.activeElement||el.contains(document.activeElement)),true,'选择型弹窗初始焦点应在选择器');
 await select.press('Enter');await page.getByRole('option').first().waitFor();
 await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),true,'第一下 Escape 仅关闭选项');
 await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
