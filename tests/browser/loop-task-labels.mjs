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
      await page.locator('.collab-route-right .loop-idp__closebtn').click();
      // 任务详情已改为右滑抽屉，关闭带滑出动画（RouteRightHost 保留末屏约 240ms）。
      // 等抽屉真正卸载后再继续，避免残留的面包屑标题与列表卡片文本冲突。
      await page.locator('.collab-route-right').waitFor({state:'detached'});
      await page.locator('.loop-board').waitFor();
    };

    await openTask();
    const labels=page.locator('.loop-idp__prop--labels');
    const initialLabels=await labels.locator('.loop-label-chip').allTextContents();
    assert.equal(initialLabels.includes('质量'),false,'测试目标标签初始不应已关联');
    await labels.locator('button').first().click();
    let menu=page.locator('.semi-dropdown-menu:visible');
    await menu.getByText('采购',{exact:true}).waitFor();
    assert.deepEqual(await menu.locator('.loop-label-chip').allTextContents(),['采购','招投标','质量','供应商','合规','合同','成本','排产','交付','供应风险']);
    await menu.getByText('质量',{exact:true}).click();
    await labels.locator('.loop-label-chip').filter({hasText:'质量'}).waitFor();
    assert.equal(await menu.isVisible(),true,'多选标签后菜单保持打开');
    await menu.getByText('合规',{exact:true}).click();
    await labels.locator('.loop-label-chip').filter({hasText:'合规'}).waitFor();
    assert.equal(await menu.isVisible(),true,'连续选择第二个标签时菜单仍保持打开');
    await menu.getByText('合规',{exact:true}).click();
    assert.equal(await labels.locator('.loop-label-chip').filter({hasText:'合规'}).count(),0,'再次点击可取消该标签');

    await closeTask();
    await openTask();
    await labels.locator('.loop-label-chip').filter({hasText:'质量'}).waitFor();
    await page.screenshot({path:'/tmp/eva-task-labels-fixed-chip.png'});
    await labels.locator('.loop-label-chipbutton').click();
    menu=page.locator('.semi-dropdown-menu:visible');
    await menu.getByText('质量',{exact:true}).click();
    assert.equal(await labels.locator('.loop-label-chip').filter({hasText:'质量'}).count(),0);

    await labels.locator('button').first().click();
    menu=page.locator('.semi-dropdown-menu:visible');
    const search=menu.getByRole('textbox',{name:'搜索或新建标签'});
    await search.fill('供应风');
    assert.deepEqual(await menu.locator('.loop-label-option .loop-label-chip').allTextContents(),['供应风险'],'任务详情标签菜单按名称筛选');
    const createOption=menu.getByRole('menuitem',{name:/新建.*供应风/});
    assert.equal(await createOption.count(),1,'非精确名称可新建，已有的相近标签仍保留供选择');
    assert.equal(await createOption.locator('.eva-task-label-chip').textContent(),'供应风','详情新建结果呈现为 Tag');
    assert.equal(await createOption.locator('.eva-task-label-create-option > span:not(.eva-task-label-chip)').textContent(),'新建','详情新建行显示新建文案');
    assert.equal(await createOption.locator('svg.lucide').count(),1,'详情新建行使用 Lucide Plus');
    assert.equal(await menu.evaluate(el=>el.querySelector('.eva-task-label-picker__search').compareDocumentPosition(el.querySelector('.loop-label-option'))&Node.DOCUMENT_POSITION_FOLLOWING?true:false),true,'搜索框位于标签列表上方');
    await page.screenshot({path:'/tmp/eva-task-label-picker-search.png'});
    await search.fill('详情验收标签');
    await menu.getByRole('menuitem',{name:/新建.*详情验收标签/}).click();
    await labels.locator('.loop-label-chip').filter({hasText:'详情验收标签'}).waitFor();
    assert.equal(await menu.isVisible(),true,'详情新建标签后多选菜单保持打开');
    assert.equal(await menu.getByText('管理标签',{exact:true}).count(),0,'详情选标签菜单不显示管理入口');
    assert.equal(await page.locator('.eva-task-entry-manager').count(),0,'不再挂载标签管理弹窗');
    await page.keyboard.press('Escape');

    await closeTask();
    await openTask();
    assert.equal(await labels.locator('.loop-label-chip').filter({hasText:'质量'}).count(),0);
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
