import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('Edge：任务详情添加、重开与移除标签均使用当前项目标签数据',async()=>{
  const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  try{
    const context=await browser.newContext({viewport:{width:1200,height:800}});
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    const page=await context.newPage(),errors=[];
    page.setDefaultTimeout(8000);
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/#/collab');
    await page.locator('[data-eva-nav-id="contacts"]').click();
    await page.locator('[data-eva-nav-id="projects"]').click();
    await page.getByRole('button',{name:'供应链运营协同 协同推进间接采购、供应商质量与合规风控工作',exact:true}).click();
    await page.locator('.loop-board').waitFor();

    const taskName='收集下一季度供应商协同需求';
    const openTask=async()=>{
      await page.getByText(taskName,{exact:true}).click();
      await page.locator('.loop-idp__prop--labels').waitFor();
    };
    const closeTask=async()=>{
      await page.locator('.collab-route-right').getByRole('button',{name:'看板',exact:true}).click();
      await page.locator('.loop-board').waitFor();
    };

    await openTask();
    const labels=page.locator('.loop-idp__prop--labels');
    await labels.getByText('添加标签',{exact:true}).click();
    let menu=page.locator('.semi-dropdown-menu:visible');
    await menu.getByText('采购',{exact:true}).waitFor();
    assert.deepEqual(await menu.locator('.loop-label-chip').allTextContents(),['采购','质量','供应风险','合规']);
    await menu.getByText('采购',{exact:true}).click();
    await labels.locator('.loop-label-chip').filter({hasText:'采购'}).waitFor();
    assert.equal(await labels.getByText('添加标签',{exact:true}).count(),0);

    await closeTask();
    await openTask();
    await labels.locator('.loop-label-chip').filter({hasText:'采购'}).waitFor();
    await page.screenshot({path:'/tmp/eva-task-labels-fixed-chip.png'});
    await labels.locator('.loop-label-chipbutton').click();
    menu=page.locator('.semi-dropdown-menu:visible');
    await menu.getByText('采购',{exact:true}).click();
    await labels.getByText('添加标签',{exact:true}).waitFor();

    await closeTask();
    await openTask();
    await labels.getByText('添加标签',{exact:true}).waitFor();
    assert.equal(await page.locator('.app-titlebar:visible').count(),1);
    assert.equal(await page.locator('[data-nextjs-dialog],.vite-error-overlay,#webpack-dev-server-client-overlay').count(),0);
    assert.deepEqual(errors,[]);
    await page.screenshot({path:'/tmp/eva-task-labels-fixed.png'});
    console.log(`Verified ${origin}, Edge 1200x800; screenshots /tmp/eva-task-labels-fixed-chip.png and /tmp/eva-task-labels-fixed.png`);
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
