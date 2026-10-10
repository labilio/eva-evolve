import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('Edge：供应链边界任务在看板内截断，完整内容仍可打开',async()=>{
  const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  try{
    const page=await browser.newPage({viewport:{width:960,height:720}});
    await page.goto(origin+'/#/collab?evaProject=prod&evaTab=tasks');
    const board=page.locator('.loop-board');await board.waitFor();
    assert.equal(await page.getByRole('button',{name:/显示字段/}).count(),0,'看板没有不可用的字段入口');
    for(const [id,overflow] of [['SC-135','+2'],['SC-136','+1'],['SC-137','+3']]){
      const card=board.locator('.eva-board-row').filter({has:page.locator('.loop-card__id',{hasText:id})});
      assert.equal(await card.count(),1,id+' 在项目看板中存在');
      const layout=await card.evaluate(node=>{
        const shell=node.querySelector('.loop-card'),title=node.querySelector('.loop-card__title');
        const style=getComputedStyle(title),labels=node.querySelector('.loop-label-chips');
        return {fontSize:style.fontSize,titleHeight:title.clientHeight,lineHeight:parseFloat(style.lineHeight),clamp:style.webkitLineClamp,cardOverflow:shell.scrollWidth>shell.clientWidth,chipCount:labels.children.length,overflow:labels.lastElementChild.textContent,hasDate:!!node.querySelector('.loop-card__time,.loop-card__due')};
      });
      assert.equal(layout.fontSize,'14px','保持标题字号');
      assert.equal(layout.clamp,'2','标题限制两行');
      assert.ok(layout.titleHeight<=layout.lineHeight*2+1,'标题没有撑开卡片');
      assert.equal(layout.cardOverflow,false,'卡片没有横向溢出');
      assert.equal(layout.chipCount,3,'仅显示前两个标签和数量');
      assert.equal(layout.overflow,overflow);
      assert.equal(layout.hasDate,false,'看板不显示无语义的时间或脚注日期');
    }
    const longCard=board.locator('.eva-board-row').filter({has:page.locator('.loop-card__id',{hasText:'SC-135'})});
    const fullTitle=await longCard.locator('.loop-card__title').getAttribute('title');
    await longCard.locator('.loop-card').click();
    assert.ok(await page.getByText(fullTitle,{exact:true}).count()>0,'详情保留完整标题');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});

test('Edge：看板列新建、排序与按列加载保持当前任务数据',async()=>{
  const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  try{
    const context=await browser.newContext({viewport:{width:1200,height:800}});
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/#/collab?evaProject=prod&evaTab=tasks');
    const board=page.locator('.loop-board');await board.waitFor();
    const todo=board.locator('.loop-board__col').filter({has:page.locator('.loop-board__col-name',{hasText:'待办'})});
    const progress=board.locator('.loop-board__col').filter({has:page.locator('.loop-board__col-name',{hasText:'进行中'})});
    assert.equal(await todo.locator('.loop-board__col-head .eva-board-create').count(),1);
    assert.match(await todo.locator('.eva-board-create').getAttribute('class'),/semi-button/,'列头新建复用 Semi Button');
    assert.equal(await todo.locator('.eva-board-create').getAttribute('title'),null,'不使用浏览器原生 title');
    await todo.locator('.eva-board-create').hover();
    await page.locator('.semi-tooltip-wrapper-show',{hasText:'在待办新建任务'}).waitFor();
    assert.equal(await board.locator('.loop-board__col-head em').first().evaluate(el=>el.previousElementSibling?.className),'loop-board__col-name');
    assert.equal(await todo.locator('.loop-card__time,.loop-card__due').count(),0,'不显示无语义的时间或脚注日期');
    const late=todo.locator('.eva-board-row').filter({has:page.locator('.loop-card__id',{hasText:'SC-104'})});
    assert.match(await late.locator('.eva-board-card-due').textContent(),/^逾期 \d+ 天$/);
    assert.equal(await late.locator('.eva-board-card-due').getAttribute('title'),'截止 2026-09-21');
    const upcoming=todo.locator('.eva-board-row').filter({has:page.locator('.loop-card__id',{hasText:'SC-127'})});
    assert.equal(await upcoming.locator('.eva-board-card-due').textContent(),'截止 10-12');
    assert.equal(await todo.locator('.eva-board-row').filter({has:page.locator('.loop-card__id',{hasText:'SC-129'})}).locator('.eva-board-card-due').count(),0);
    const completed=board.locator('.eva-board-row').filter({has:page.locator('.loop-card__id',{hasText:'SC-109'})});
    assert.match(await completed.locator('.eva-board-card-due').textContent(),/^截止 /,'已完成任务显示截止日期但不催办');
    assert.equal(await completed.locator('.eva-board-card-due.is-overdue').count(),0);
    const footer=late.locator('.loop-card__foot');
    assert.equal(await footer.locator('.loop-card__labels').count(),1);
    assert.equal(await footer.locator('.eva-issue-assignee').count(),1);
    assert.ok(await footer.evaluate(node=>{const labels=node.querySelector('.loop-card__labels').getBoundingClientRect(),assignee=node.querySelector('.eva-issue-assignee').getBoundingClientRect();return Math.abs(labels.top+labels.height/2-assignee.top-assignee.height/2)<2&&labels.right<=assignee.left;}),'标签与负责人同行且互不重叠');
    assert.equal(await todo.locator('.loop-card__top .loop-card__icon').first().count(),1);
    assert.equal(await todo.locator('.loop-card__title').first().evaluate(node=>getComputedStyle(node).fontSize),'14px','保留原任务标题字号');
    assert.equal(await todo.locator('.loop-card__id').first().evaluate(node=>getComputedStyle(node).fontSize),'12px','保留原编号字号');
    await progress.locator('.eva-board-create').click();
    assert.equal(await page.locator('.loop-ci__toolbar .loop-pill[aria-label="状态"]').textContent(),'进行中');
    await page.getByRole('button',{name:'关闭',exact:true}).last().click();
    const before=await todo.locator('.loop-card__id').allTextContents();
    await page.evaluate(()=>{window.__evaDropCount=0;document.addEventListener('drop',()=>{window.__evaDropCount++;},true);});
    const source=todo.locator('.loop-card',{hasText:'SC-105'}),target=todo.locator('.eva-board-row').filter({has:page.locator('.loop-card__id',{hasText:'SC-104'})});
    await source.dragTo(target,{sourcePosition:{x:20,y:20},targetPosition:{x:20,y:5},steps:8});
    if(await page.evaluate(()=>window.__evaDropCount)===0)await source.dragTo(target,{targetPosition:{x:20,y:5},steps:8});
    await page.waitForFunction(previous=>{const column=[...document.querySelectorAll('.loop-board__col')].find(node=>node.querySelector('.loop-board__col-name')?.textContent==='待办');return column&&[...column.querySelectorAll('.loop-card__id')].map(node=>node.textContent).join('|')!==previous;},before.join('|'),{timeout:3000});
    assert.notDeepEqual(await todo.locator('.loop-card__id').allTextContents(),before);
    await todo.locator('.loop-card',{hasText:'SC-105'}).dragTo(progress.locator('.loop-card',{hasText:'SC-101'}),{targetPosition:{x:20,y:5}});
    await progress.locator('.loop-card',{hasText:'SC-105'}).waitFor();
    assert.equal(await todo.locator('.loop-card',{hasText:'SC-105'}).count(),0);
    await progress.locator('.eva-board-create').click();
    await page.getByRole('textbox',{name:'任务标题'}).fill('列内新建验收任务');
    await page.getByRole('button',{name:'创建',exact:true}).last().click();
    await progress.locator('.loop-card',{hasText:'列内新建验收任务'}).waitFor();
    await page.reload();await board.waitFor();
    assert.deepEqual(errors,[]);
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});

test('Edge：大列按需加载并只挂载可见卡片，列头仍显示总数',async()=>{
  const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  try{
    const context=await browser.newContext({viewport:{width:1200,height:800}});
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    await context.route('**/prototype/009-2-data-supply.js',async route=>{
      const response=await route.fetch(),body=await response.text();
      const fixture=';for(let i=0;i<100;i++){const base=window.__EVA_SUPPLY_CHAIN_DEMO.issues.find(row=>row.status==="todo");window.__EVA_SUPPLY_CHAIN_DEMO.issues.push({...base,id:"board-load-"+i,identifier:"SC-LOAD-"+i,title:"按列加载任务 "+i,position:1000+i,parent_issue_id:null})}';
      await route.fulfill({response,body:body+fixture});
    });
    const page=await context.newPage();
    await page.goto(origin+'/#/collab?evaProject=prod&evaTab=tasks');
    const todo=page.locator('.loop-board__col').filter({has:page.locator('.loop-board__col-name',{hasText:'待办'})});
    await todo.waitFor();
    const total=Number((await todo.locator('.loop-board__col-head em').textContent()).trim());
    assert.ok(total>=100);
    assert.equal(await todo.locator('.eva-board-row').count(),30);
    await todo.locator('.eva-board-more').evaluate(button=>button.click());
    await todo.locator('.eva-board-spacer').first().waitFor();
    assert.ok(await todo.locator('.eva-board-row').count()<60,'虚拟列表只挂载窗口附近的卡片');
    assert.equal(Number((await todo.locator('.loop-board__col-head em').textContent()).trim()),total);
    const cards=todo.locator('.loop-board__cards');
    await cards.evaluate(node=>{node.scrollTop=1000;node.dispatchEvent(new Event('scroll',{bubbles:true}));});
    const scrollBefore=await cards.evaluate(node=>node.scrollTop);
    const switcher=page.locator('.eva-task-view-switcher');
    await switcher.getByRole('tab',{name:'表格'}).click();
    await switcher.getByRole('tab',{name:'看板'}).click();
    await todo.waitFor();
    assert.ok(Math.abs((await cards.evaluate(node=>node.scrollTop))-scrollBefore)<200,'切回看板时恢复该列的滚动位置');
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
