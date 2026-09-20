import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('项目、通讯录与员工市场：实际列表布局、筛选及窄窗口操作', async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try {
  const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(origin+'/#/collab');
  await page.locator('.eva-project-directory-list').waitFor();
  assert.equal(await page.locator('.eva-project-pinned-card').count(),4,'默认全部演示项目置顶');
  const unpinned=page.getByRole('button',{name:/^关注 /});
  while(await unpinned.count())await unpinned.first().click();
  const cards=page.locator('.eva-project-pinned-card');
  assert.equal(await cards.count(),4);
  const boxes=await cards.evaluateAll(es=>es.map(e=>{
   const box=e.getBoundingClientRect(),name=e.querySelector('.eva-project-card-title .name').getBoundingClientRect(),desc=e.querySelector('.eva-project-card-description').getBoundingClientRect();
   return {y:box.y,nameX:name?.x,descriptionX:desc.x};
  }));
  assert.ok(boxes.every(b=>Math.abs(b.y-boxes[0].y)<=1),'宽窗口四个关注项目同排');
  assert.ok(boxes.every(b=>Math.abs(b.nameX-b.descriptionX)<=1),'描述与项目名称对齐');
  const rows=page.locator('.eva-project-list-item');
  for(const row of await rows.all()){
   const measure=await row.evaluate(e=>{
    const box=e.getBoundingClientRect(),parent=e.parentElement,p=parent.getBoundingClientRect(),button=e.querySelector('.eva-project-follow-button').getBoundingClientRect();
    return {left:box.left-p.left-parent.clientLeft,right:p.left+parent.clientLeft+parent.clientWidth-box.right,dy:button.y+button.height/2-box.y-box.height/2};
   });
   assert.ok(Math.abs(measure.left-measure.right)<=1,'项目行左右外留白一致');
   assert.ok(Math.abs(measure.dy)<=1,'关注操作位于项目行垂直中心');
  }
  await page.goto(origin+'/#/collab?evaProject=prod');
  await page.locator('.collab-frame').waitFor();
  await page.getByRole('tab',{name:'任务',exact:true}).click();
  await page.getByText('完成本季度间接采购需求归集',{exact:true}).click();
  const detail=page.locator('.loop-idp').last();
  const tree=detail.locator('.eva-loop-subtask-tree');
  await tree.waitFor();
  assert.match(await tree.innerText(),/SC-113/,'前3层子任务保持可见');
  assert.doesNotMatch(await tree.innerText(),/SC-114/,'第4层初始收起');
  await detail.getByRole('button',{name:'展开全部层级',exact:true}).click();
  assert.match(await tree.innerText(),/SC-114/,'展开全部显示深层子任务');
  await detail.getByRole('button',{name:'收起 SC-113 的子任务',exact:true}).click();
  assert.doesNotMatch(await tree.innerText(),/SC-114/,'逐节点收起仍有效');
  await detail.getByRole('button',{name:'展开 SC-113 的子任务',exact:true}).click();
  assert.match(await tree.innerText(),/SC-114/);
  await page.goto(origin+'/#/contacts');
  await page.locator('.eva-contacts__columns').waitFor();
  const headerSpacing=await page.locator('.eva-contacts').evaluate(e=>{
   const title=e.querySelector('.eva-contacts__main-head').getBoundingClientRect(),header=e.querySelector('.eva-contacts__columns').getBoundingClientRect(),row=e.querySelector('.eva-contacts__person').getBoundingClientRect();
   return {above:header.top-title.bottom,below:row.top-header.bottom};
  });
  assert.ok(Math.abs(headerSpacing.above-16)<=1,'独立表头与页面标题之间保留16px留白');
  assert.ok(Math.abs(headerSpacing.below-8)<=1,'独立表头与连续列表之间保留8px留白');
  for(const width of [1200,900]){
   await page.setViewportSize({width,height:800});
   const header=page.locator('.eva-contacts__columns'),groups=page.locator('.eva-contacts__groups');
   const before=await header.boundingBox();
   await groups.evaluate(e=>{e.scrollTop=350;});
   const geometry=await groups.evaluate(e=>{
    const r=e.getBoundingClientRect(),header=e.previousElementSibling.getBoundingClientRect();
    return {scroll:e.scrollTop,top:r.top,headerBottom:header.bottom,parentOverflow:getComputedStyle(e.parentElement).overflow,headerPosition:getComputedStyle(e.previousElementSibling).position};
   });
   assert.ok(geometry.scroll>0,'只有联系人行实际滚动');
   assert.deepEqual(await header.boundingBox(),before,'滚动时独立表头位置完全不变');
   assert.equal(geometry.headerPosition,'static','表头固定占位，不使用悬浮或吸顶');
   assert.equal(geometry.parentOverflow,'hidden');
   assert.ok(Math.abs(geometry.top-geometry.headerBottom-8)<=1,'滚动裁切边界始终位于表头下方8px');
   await page.screenshot({path:`/tmp/eva-contacts-fixed-header-${width}.png`});
   await groups.evaluate(e=>{e.scrollTop=e.scrollHeight;});
   const last=await page.locator('.eva-contacts__person').last().boundingBox(),viewport=await groups.boundingBox();
   assert.ok(last.y+last.height<=viewport.y+viewport.height+1,'最后一行可以完整滚动显示');
   await groups.evaluate(e=>{e.scrollTop=0;});
  }
  await page.setViewportSize({width:1200,height:800});
  await page.getByRole('button',{name:'查看 王宜林 的资料',exact:true}).click();
  await page.getByRole('dialog').waitFor();
  await page.locator('.semi-modal-close').click();
  await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.goto(origin+'/#/eva-stub/数字员工');
  assert.equal(await page.locator('.eva-digital-center__market-search').count(),0,'市场不再保留右上角员工搜索框');
  assert.equal(await page.locator('.eva-digital-center__name-cell small').count(),0,'工号只在独立列展示');
  const pagination=await page.locator('.semi-table-pagination-outer').evaluate(e=>{
   const r=e.getBoundingClientRect(),info=e.querySelector('.semi-table-pagination-info').getBoundingClientRect(),controls=e.querySelector('.semi-table-pagination-wrapper').getBoundingClientRect();
   return {left:info.left-r.left,right:r.right-controls.right};
  });
  assert.ok(Math.abs(pagination.left-12)<=1&&Math.abs(pagination.right-12)<=1,'分页统计和控件沿用表格的左右12px留白');
  await page.getByRole('button',{name:/^供应链 /}).click();
  const domains=await page.locator('.semi-table-tbody tr td:nth-child(3)').allTextContents();
  assert.ok(domains.length>0&&domains.every(d=>d==='供应链'),'业务域筛选仍生效');
  await page.getByRole('button',{name:/^全部业务域 /}).click();
  await page.getByRole('button',{name:'搜索业务域'}).click();
  const domainSearch=page.getByPlaceholder('搜索业务域');
  await domainSearch.waitFor();
  await domainSearch.fill('供应链');
  assert.equal(await page.locator('.eva-digital-center__domain-filters .semi-button').count(),2,'业务域搜索只收敛业务域 chips');
  assert.equal(await page.locator('.semi-table-tbody tr').count(),20,'业务域搜索不得过滤员工列表');
  await domainSearch.press('Escape');
  await page.locator('.eva-digital-center__domain-search').waitFor({state:'detached'});
  assert.ok(await page.locator('.eva-digital-center__domain-filters .semi-button').count()>2,'收起业务域搜索后恢复全部 chips');
  for(const route of ['collab','contacts','eva-stub/数字员工']){
   await page.setViewportSize({width:900,height:700});
   await page.goto(origin+'/#/'+route);
   assert.equal(await page.locator('.app-titlebar:visible').count(),1);
   const shell=await page.locator('.layout-content').evaluate(e=>{
    const s=getComputedStyle(e),r=e.getBoundingClientRect(),bar=document.querySelector('.app-titlebar').getBoundingClientRect();
    return {radius:s.borderRadius,border:s.borderTopWidth,overflow:s.overflow,offset:r.top-bar.bottom};
   });
   assert.equal(shell.radius,'16px','有无中栏均复用同一工作区外框');
   assert.equal(shell.border,'1px');
   assert.equal(shell.overflow,'hidden');
   assert.ok(Math.abs(shell.offset)<=1,'工作区保持在唯一系统标题栏下方');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=1,'页面不横向溢出');
   if(route==='collab'){
    const columns=await page.locator('.eva-project-pinned-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);
    assert.equal(columns,2,'900px 窗口保留紧凑两列，不被旧样式强制为单列');
   }
   if(route==='eva-stub/数字员工'){
    const body=page.locator('.semi-table-body');
    await body.evaluate(e=>{e.scrollLeft=e.scrollWidth;});
    const action=page.getByRole('button',{name:'加入项目',exact:true}).first();
    await action.click();
    await page.getByRole('dialog').waitFor();
   }
  }
  assert.deepEqual(errors,[]);
 } finally {await browser.close();await new Promise(r=>server.close(r));}
});
