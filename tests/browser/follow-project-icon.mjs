import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';
test('关注项目分类对齐其他会话，项目图标作为跳转入口',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{const page=await browser.newPage({viewport:{width:1200,height:800}});await page.goto(`http://127.0.0.1:${server.address().port}/#/messages`);const project=page.locator('.eva-follow-category[aria-label="供应链运营协同"] .eva-follow-category-title'),other=page.locator('.eva-follow-category[aria-label="其他会话"] .eva-follow-category-title');await project.waitFor();assert.equal(await project.locator(':scope > .lucide-layout-grid').count(),0);assert.equal(await project.locator('button.eva-space-task-button .lucide-layout-grid').count(),1);const a=await project.locator('.wk-category-header').boundingBox(),b=await other.locator('.wk-category-header').boundingBox();assert.ok(Math.abs(a.x-b.x)<1);await project.getByRole('button',{name:'打开供应链运营协同任务页'}).click();await page.locator('.eva-inline-project-panel').waitFor();
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
