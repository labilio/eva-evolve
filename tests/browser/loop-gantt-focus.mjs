import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';
import {settleMotion} from '../helpers/settle-motion.mjs';

test('Edge：关闭甘特任务详情保留焦点但不重开预览，鼠标不残留键盘框',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=tasks`);
  await page.locator('.eva-task-view-menu').click();
  await page.locator('.eva-task-enum-menu:visible').getByText('甘特图',{exact:true}).click();
  const view=page.locator('.eva-task-gantt'),row=view.locator('[data-task-id="supply-1"]');
  await view.getByRole('button',{name:'定位 SC-101',exact:true}).click();
  const bar=row.locator('.eva-task-gantt__bar-title'),preview=page.locator('.eva-task-preview'),detail=page.getByRole('dialog',{name:'任务详情',exact:true});
  await bar.hover();await preview.waitFor();
  await bar.click();await detail.waitFor();await settleMotion(page);
  await detail.getByRole('button',{name:'关闭任务详情',exact:true}).click();await detail.waitFor({state:'hidden'});
  // Observe beyond Semi's 100ms opening delay, so a delayed reopen cannot pass.
  await page.waitForTimeout(350);await settleMotion(page);
  assert.equal(await bar.evaluate(node=>node===document.activeElement),true,'保留原任务焦点而非丢回body');
  assert.equal(await preview.isVisible(),false,'鼠标关闭详情不重新打开预览');
  assert.equal(await row.locator('.eva-task-gantt__bar').evaluate(node=>getComputedStyle(node).outlineStyle),'none','纯鼠标返回不残留键盘焦点框');
  await page.mouse.move(0,0);await bar.hover();await preview.waitFor();
  await page.keyboard.press('Escape');await preview.waitFor({state:'hidden'});
  await page.mouse.move(0,0);
  await bar.press('Tab');await page.keyboard.press('Shift+Tab');await preview.waitFor();
  assert.equal(await bar.evaluate(node=>node.matches(':focus-visible')),true,'主动键盘聚焦仍显示焦点');
  assert.notEqual(await row.locator('.eva-task-gantt__bar').evaluate(node=>getComputedStyle(node).outlineStyle),'none');
  await bar.press('Enter');await detail.waitFor();await settleMotion(page);
  await page.mouse.move(0,0);await page.keyboard.press('Escape');await detail.waitFor({state:'hidden'});
  await page.waitForTimeout(350);await settleMotion(page);
  assert.equal(await bar.evaluate(node=>node===document.activeElement),true,'键盘关闭详情返回原入口');
  assert.equal(await preview.isVisible(),false,'键盘恢复焦点不重开已消费的预览');
  assert.equal(await bar.evaluate(node=>node.matches(':focus-visible')),true,'键盘返回保留可见焦点');
  await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await preview.waitFor();
  await page.keyboard.press('Escape');await preview.waitFor({state:'hidden'});
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
