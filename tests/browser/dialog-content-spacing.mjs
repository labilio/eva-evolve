import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

// Check rendered content edges, not just declared body padding: paragraph
// margins and nested field padding used to pass the old spacing matrix.
test('弹窗组合：正文实际边界、说明位置与短内容自然高度',async t=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'});
 const origin=`http://127.0.0.1:${server.address().port}`;
 try {
  for(const kind of ['owner','clear','dissolve','transfer','archive','trash','move'])await t.test(kind,async()=>{
   const page=await browser.newPage({viewport:{width:1200,height:800}});
   try {
    if(kind==='archive'){
     await page.goto(origin+'/#/collab?evaProject=prod&evaTab=settings');
     await page.getByRole('button',{name:'归档项目',exact:true}).click();
    }else if(kind==='trash'||kind==='move'){
     await page.goto(origin+'/#/collab?evaProject=prod&evaTab=files');
     await page.getByRole('button',{name:'更多操作：会议纪要',exact:true}).click();
     await page.getByRole('menuitem',{name:kind==='trash'?'移至回收站':'移动',exact:true}).click();
    }else{
     await page.goto(origin+'/#/messages');
     await page.locator('.ch-list').getByText('采购与招投标',{exact:true}).click();
     await page.getByRole('button',{name:'打开聊天信息'}).first().click();
     await page.locator('.eva-chat-settings').getByRole('button',{name:kind==='clear'?'清空聊天记录':kind==='dissolve'?'解散群聊':'退出群聊',exact:true}).click();
     if(kind==='transfer')await page.getByRole('button',{name:'选择新群主',exact:true}).click();
    }
    const dialog=page.getByRole('dialog').last();await dialog.waitFor();
    await dialog.evaluate(el=>Promise.all(el.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{}))));
    const geometry=await dialog.evaluate(el=>{
     const body=el.querySelector('.semi-modal-body'),b=body.getBoundingClientRect();
     const text=body.querySelector('p'),search=body.querySelector('.eva-picker-toolbar');
     const list=body.querySelector('.eva-picker-list');
     return {top:(search||body.querySelector('.eva-drive-dialog__field')||text).getBoundingClientRect().top-b.top,
      bottom:b.bottom-(text?.getBoundingClientRect().bottom||b.bottom),
      hintAfterList:!list||text.getBoundingClientRect().top>=list.getBoundingClientRect().bottom,
      height:body.getBoundingClientRect().height};
    });
    assert.equal(Math.round(geometry.top),24,kind+' 首内容不能叠加默认段落外距或字段内距');
    if(kind!=='archive')assert.equal(Math.round(geometry.bottom),24,kind+' 尾内容不能叠加额外留白');
    if(kind==='transfer'){
     assert.equal(geometry.hintAfterList,true,'退出后果靠近提交区，而不是挡在搜索前');
     assert.ok(geometry.height<=300,'三个候选人的选择器不预留固定高度');
     await page.screenshot({path:'/tmp/eva-dialog-spacing-transfer.png'});
     await dialog.getByRole('button',{name:'转让并退出群聊',exact:true}).click();
     await dialog.getByText('请选择一位新群主',{exact:true}).waitFor();
     await dialog.getByRole('textbox',{name:'搜索群成员'}).fill('不存在的成员');
     await dialog.getByText('没有匹配的成员',{exact:true}).waitFor();
     await page.screenshot({path:'/tmp/eva-dialog-spacing-transfer-empty.png'});
     await dialog.getByRole('textbox',{name:'搜索群成员'}).fill('');
     await page.setViewportSize({width:800,height:600});
     await page.evaluate(()=>window.EvaTheme.apply('dark'));
     const bounds=await dialog.evaluate(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,overflow:el.scrollWidth>el.clientWidth};});
     assert.ok(bounds.top>=36&&bounds.bottom<=600,'小窗口中不遮挡系统标题栏且操作区可达');
     assert.equal(bounds.overflow,false);
     await page.screenshot({path:'/tmp/eva-dialog-spacing-transfer-dark.png'});
     await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
     return;
    }
    await page.screenshot({path:`/tmp/eva-dialog-spacing-${kind}.png`});
   }finally{await page.close();}
  });
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
