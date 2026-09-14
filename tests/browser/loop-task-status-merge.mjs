import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('Edge：合并状态后看板、详情、创建、旧筛选与跨项目往返',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{
  const context=await browser.newContext({viewport:{width:1200,height:800}});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(8000);page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/#/collab');
  async function project(name){
   await page.locator('[data-eva-nav-id="contacts"]').click();
   await page.locator('[data-eva-nav-id="projects"]').click();
   await page.getByRole('button',{name,exact:true}).click();
   await page.locator('.loop-board').waitFor();
  }
  const supply='供应链运营协同 协同推进间接采购、供应商质量与合规风控工作';
  await project(supply);
  assert.deepEqual(await page.locator('.loop-board__col-name').allTextContents(),['待办','进行中','审核中','已完成','受阻','已取消']);
  assert.equal(await page.locator('.loop-board__cards > *').count(),8);
  const todo=page.locator('.loop-board__col').first();assert.match(await todo.innerText(),/SC-108/);
  await page.screenshot({path:'/tmp/eva-task-status-merged.png'});
  const card=todo.locator('[draggable="true"]').filter({hasText:'SC-104'});
  await card.dragTo(page.locator('.loop-board__col').nth(1));
  await page.locator('.loop-board__col').nth(1).getByText('分析核心品类采购成本偏差',{exact:true}).waitFor();
  assert.equal(await page.locator('[role="dialog"]:visible').count(),0);
  await page.locator('.loop-board__col').nth(1).locator('[draggable="true"]').filter({hasText:'SC-104'}).dragTo(todo);
  await todo.getByText('分析核心品类采购成本偏差',{exact:true}).waitFor();
  await page.getByText('收集下一季度供应商协同需求',{exact:true}).click();
  await page.getByText('暂无执行记录',{exact:true}).waitFor();
  await page.getByRole('button',{name:'待办',exact:true}).click();
  assert.equal(await page.getByText('待规划',{exact:true}).count(),0);
  await page.getByText('进行中',{exact:true}).last().click();
  await page.getByRole('button',{name:'进行中',exact:true}).waitFor();
  assert.equal(await page.locator('[role="dialog"]:visible').count(),0,'状态修改不弹出执行确认');
  await page.locator('.collab-route-right').getByRole('button',{name:'看板',exact:true}).click();
  await project(supply);
  await page.getByRole('button',{name:'新建任务',exact:true}).click();
  const modal=page.locator('.eva-loop-task-create');
  await page.getByRole('textbox',{name:'任务标题',exact:true}).fill('合并状态验收任务');
  await page.getByRole('button',{name:'状态',exact:true}).click();
  assert.equal(await page.getByText('待规划',{exact:true}).count(),0);
  await page.getByText('待办',{exact:true}).last().click();
  await modal.getByRole('button',{name:'创建',exact:true}).click();
  await todo.getByText('合并状态验收任务',{exact:true}).waitFor();
  assert.equal(await page.locator('.loop-board__cards > *').count(),9);
  await project('客户联合交付 内部交付团队与客户成员在独立权限下共同推进工作');
  assert.equal(await page.locator('.loop-board__cards > *').count(),5);
  assert.equal(await page.getByText('合并状态验收任务',{exact:true}).count(),0);
  await project(supply);await todo.getByText('合并状态验收任务',{exact:true}).waitFor();
  await page.evaluate(()=>localStorage.setItem('loop.issue.filters:collab-tasks:workspace:prod',JSON.stringify({filters:{statuses:['backlog','todo']},scope:'all'})));
  await page.reload();await todo.getByText('收集下一季度供应商协同需求',{exact:true}).waitFor();
  assert.equal(await page.locator('.loop-board__cards > *').count(),4,'旧筛选只显示待办，不退化成全部任务');
  assert.equal(await page.getByText('待规划',{exact:true}).count(),0);
  await page.getByText('列表',{exact:true}).click();
  await page.getByText('收集下一季度供应商协同需求',{exact:true}).waitFor();
  assert.equal(await page.getByText('待规划',{exact:true}).count(),0);
  assert.equal(await page.locator('.app-titlebar:visible').count(),1);
  assert.deepEqual(errors,[]);
  console.log(`Verified ${origin}, Edge 1200x800; screenshot /tmp/eva-task-status-merged.png`);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
