import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import {cases,fixtureScript} from '../fixtures/task-card-names.mjs';

test('姓名优先、左右对齐、固定间隔：十四组内容 × 两种卡宽',async()=>{
 const root=fileURLToPath(new URL('../../dist',import.meta.url));
 const server=createServer(root);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.route('**/009-2-data-supply.js*',async route=>{
   const response=await route.fetch();await route.fulfill({response,body:(await response.text())+fixtureScript});
  });
  await page.goto(origin+'/#/collab?evaProject=prod&evaTab=tasks');
  const cards=page.locator('.loop-board .loop-card');
  await cards.first().waitFor();
  await mkdir(root+'/label-review',{recursive:true});
  for(const width of [280,360]){
   await page.locator('.loop-board__col').evaluateAll((nodes,width)=>nodes.forEach(n=>{n.style.width=(width+48)+'px';n.style.minWidth=(width+48)+'px';n.style.flex='0 0 '+(width+48)+'px';}),width);
   await cards.evaluateAll((nodes,width)=>nodes.forEach(n=>{n.style.width=width+'px';n.style.maxWidth='none';}),width);
   await page.waitForTimeout(150);
   for(let i=0;i<cases.length;i++){
    const card=cards.filter({has:page.getByText(cases[i][0],{exact:true})});
    assert.equal(await card.count(),1);
    const result=await card.evaluate(card=>{
     const foot=card.querySelector('.loop-card__foot'),person=foot.querySelector('.eva-issue-assignee'),name=person.querySelector('.eva-issue-assignee__name');
     const f=foot.getBoundingClientRect(),p=person.getBoundingClientRect();
     const chips=[...foot.querySelectorAll('.eva-task-label-fit > .eva-task-label-chip')];
     const clipped=name&&name.scrollWidth>name.clientWidth+1;
     const intrinsic=name?name.scrollWidth+[...person.children].filter(n=>n!==name).reduce((s,n)=>s+n.getBoundingClientRect().width,0)+(person.children.length-1)*parseFloat(getComputedStyle(person).gap):p.width;
     return {centerDelta:Math.max(0,...[person,...person.children,...chips].map(n=>{const r=n.getBoundingClientRect();return Math.abs(r.y+r.height/2-(f.y+f.height/2));})),right:Math.abs(p.right-f.right),left:chips.length?Math.abs(chips[0].getBoundingClientRect().left-f.left):0,
      gap:chips.length?p.left-chips.at(-1).getBoundingClientRect().right:16,
      clipped,needed:intrinsic,available:f.width,personWidth:p.width,visible:chips.length,onlyCount:chips.length===1&&chips[0].classList.contains('eva-task-label-chip--overflow'),
      overflow:p.left<f.left-1||p.right>f.right+1};
    });
    assert.ok(result.centerDelta<0.6,`垂直中心线 ${JSON.stringify(result)}`);
    assert.ok(result.right<1&&result.left<1,`${width}/${cases[i][0]} alignment ${JSON.stringify(result)}`);
    assert.ok(result.gap>=15.5&&!result.overflow,`${width}/${cases[i][0]} gap ${JSON.stringify(result)}`);
    if(width===280&&i===7)assert.equal(result.visible,1,"仅保留数量提示");
    if(width===280&&i===8)assert.equal(result.visible,1,'姓名占满时仍保留标签数量');
    if(cases[i][2].length)assert.ok(result.visible>0,'有标签就始终保留入口');
    if(result.clipped){assert.ok(result.needed>result.personWidth,JSON.stringify(result));if(cases[i][2].length)assert.ok(result.onlyCount,'先减少标签到数量提示，再截断姓名');}
    await card.screenshot({path:`${root}/label-review/${width}-${i}.png`});
   }
  }
  const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  await writeFile(root+'/label-review/index.html',`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>任务卡片边界验收</title><style>body{font:14px system-ui;margin:28px;background:#f6f7f9;color:#222}h1{font-size:22px}main{display:grid;grid-template-columns:repeat(3,max-content);gap:24px}figure{margin:0}figcaption{margin-bottom:8px;color:#626873}img{display:block;width:280px}select{margin:0 0 24px 12px}</style><h1>任务卡片：姓名优先与对齐验收</h1><p>供应链任务的隔离显示样例；姓名仅用于长度测试，不修改成员资料。以下图片由 Edge 中的实际任务卡片生成。</p><label>卡片宽度<select onchange="document.querySelectorAll('img').forEach((img,i)=>{img.src=this.value+'-'+i+'.png';img.style.width=this.value+'px'})"><option>280</option><option>360</option></select></label><main>${cases.map((c,i)=>`<figure><figcaption>${i+1}. ${escape(c[0])}</figcaption><img src="280-${i}.png" alt="${escape(c[0])}"></figure>`).join('')}</main></html>`);
  await page.goto(origin+'/label-review/index.html');
  await page.screenshot({path:root+'/label-review/overview.png',fullPage:true});
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
