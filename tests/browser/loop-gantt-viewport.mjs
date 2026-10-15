import {settleMotion} from '../helpers/settle-motion.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

for(const width of [1440,1200])test(`Edge：${width}px 甘特图首屏排期与裁切任务预览`,async()=>{
  const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  try{
    const page=await browser.newPage({viewport:{width,height:900}});
    await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=tasks`);
    await settleMotion(page);
    await page.locator('.eva-task-view-menu').click();
    await page.locator('.eva-task-enum-menu:visible').getByText('甘特图',{exact:true}).click();
    const view=page.locator('.eva-task-gantt');await view.waitFor();await settleMotion(page);
    const visible=await view.evaluate(node=>{
      const frame=node.querySelector('.eva-task-gantt__scroll').getBoundingClientRect();
      return [...node.querySelectorAll('.eva-task-gantt__row')].map(row=>{
        const bar=row.querySelector('.eva-task-gantt__bar'),rect=bar?.getBoundingClientRect();
        return {id:row.querySelector('.eva-task-gantt__identifier').textContent,visible:!!rect&&rect.bottom>frame.top+48&&rect.top<frame.bottom&&rect.right>frame.left+360&&rect.left<frame.right};
      }).filter(row=>row.visible).map(row=>row.id);
    });
    console.log('首屏可见排期',visible);
    await page.screenshot({path:`/tmp/eva-gantt-default-${width}.png`});
    const first=view.locator('.eva-task-gantt__row').first();
    await first.getByRole('button',{name:/^定位 /}).click();await settleMotion(page);
    // Scroll within the existing task: exercise a real clipped bar, without changing dates.
    await view.locator('.eva-task-gantt__scroll').evaluate(node=>{node.scrollLeft+=600;});
    await settleMotion(page);
    const frame=await view.locator('.eva-task-gantt__scroll').boundingBox();
    const bar=await first.locator('.eva-task-gantt__bar').boundingBox();
    const x=Math.max(frame.x+360,bar.x)+20,y=bar.y+bar.height/2;
    await page.mouse.move(x,y);
    const preview=page.locator('.eva-task-preview');await preview.waitFor();await settleMotion(page);
    const pop=await preview.boundingBox();
    assert.ok(bar.x<frame.x+360,'用实际被裁切的任务条验证定位');
    await page.screenshot({path:`/tmp/eva-gantt-viewport-${width}.png`});
    assert.ok(Math.abs(pop.x-(frame.x+360))<32,'预览应贴近可见任务条起点，不因任务在视口外的部分跳到屏幕右侧');
    await page.mouse.move(x+30,y);await settleMotion(page);
    assert.ok(Math.abs((await preview.boundingBox()).x-pop.x)<2,'同一任务内移动鼠标不改变预览锚点');
    await page.keyboard.press('Escape');await preview.waitFor({state:'hidden'});
    await page.mouse.move(0,0);
    // Move the same task to the right edge; native overflow adjustment must
    // keep the card readable without introducing pointer-following behavior.
    await view.locator('.eva-task-gantt__scroll').evaluate(node=>{
      const rect=node.getBoundingClientRect(),bar=node.querySelector('.eva-task-gantt__bar').getBoundingClientRect();
      node.scrollLeft+=bar.left-(rect.right-100);
    });await settleMotion(page);
    const rightBar=await first.locator('.eva-task-gantt__bar').boundingBox();
    await page.mouse.move(rightBar.x+20,rightBar.y+16);await preview.waitFor();await settleMotion(page);
    const rightPop=await preview.boundingBox();
    assert.ok(rightPop.x>=0&&rightPop.x+rightPop.width<=width,'右边缘预览仍完整可读');
    await page.mouse.move(rightBar.x+40,rightBar.y+16);await settleMotion(page);
    assert.ok(Math.abs((await preview.boundingBox()).x-rightPop.x)<2,'避让后的预览也不跟随鼠标');
    assert.ok(visible.length>=4,'默认今天视口应有足够的现有演示排期可供评审');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
