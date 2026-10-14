import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {test} from 'node:test';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';
test('任务抽屉在个人 Eva、Agent、消息和项目中使用同一宽度与全屏边界',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage();
  for(const width of [1600,1200,1000]){
   await page.setViewportSize({width,height:1000});const sizes=[];
   for(const entry of ['personal','agent','messages','project']){
    const route=entry==='personal'?'#/conversation/personal-task-quality-review':entry==='agent'?'#/messages?evaIM=my-ai':entry==='messages'?'#/messages':'#/collab?evaProject=prod&evaTab=tasks&evaTask=supply-3';
    await page.goto(origin+'/'+route);
    if(entry==='personal')await page.locator('[data-eva-personal-task-link]').first().click();
    if(entry==='agent'){
     await page.locator('[contenteditable=true][role=textbox]').first().waitFor();
     const more=page.getByText('展开查看',{exact:true}).first();if(await more.isVisible())await more.click();
     await page.getByRole('button',{name:'来料异常与排产核对',exact:true}).click();
     await page.locator('[data-eva-task-link="supply-3"]').click();
    }
    if(entry==='messages')await page.locator('[data-eva-task-link="SC-103"]').first().click();
    await page.locator('.loop-idp__title:visible').waitFor();
    const geometry=()=>page.locator('.eva-task-detail-host > .panel').evaluate(el=>{
     const r=el.getBoundingClientRect(),top=document.querySelector('.app-titlebar').getBoundingClientRect().bottom;
     return {width:r.width,right:r.right,top:r.top,titlebar:top,full:el.parentElement.classList.contains('eva-drawer-full')};
    });
    const normal=await geometry();assert.ok(normal.top>=normal.titlebar-1);
    let expanded=null;
    if(!normal.full){await page.getByRole('button',{name:'切换全屏',exact:true}).click();expanded=await geometry();await page.getByRole('button',{name:'切换全屏',exact:true}).click();assert.ok(Math.abs((await geometry()).width-normal.width)<1);}
    sizes.push({entry,normal,expanded});
    assert.equal(new URL(page.url()).hash,route);
    if(width===1200)await page.screenshot({path:`/tmp/eva-drawer-size-${entry}.png`,animations:'disabled'});
   }
   for(const size of sizes.slice(1)){
    assert.ok(Math.abs(size.normal.width-sizes[0].normal.width)<1,JSON.stringify({width,sizes}));
    assert.equal(size.normal.full,sizes[0].normal.full);
    if(size.expanded)assert.ok(Math.abs(size.expanded.width-sizes[0].expanded.width)<1);
   }
  }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
