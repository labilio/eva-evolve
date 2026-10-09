import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

for(const entry of ['project','drive'])test(entry+' 公共文件控件：图标居中、菜单避让、嵌套表单与预览返回',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(10000);
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}/#/${entry==='project'?'collab?evaProject=prod&evaTab=files':'drive'}`);
  if(entry==='drive')await page.locator('[data-drive-scope="workspace"][data-workspace-id="prod"]').click();
  const host=page.locator(entry==='project'?'.eva-project-files':'#eva-drive-root');
  const item=await page.evaluate(()=>{const c=window.__evaGetFileContext();return c.files.list('prod',c.store.actorId()).find(i=>i.parent_id===0&&i.type==='blob');});
  const more=host.getByRole('button',{name:'更多操作：'+item.name,exact:true});
  const assertCentered=async button=>{
   assert.ok((await button.getAttribute('class')).includes('semi-button'));
   const offset=await button.evaluate(element=>{const b=element.getBoundingClientRect(),i=element.querySelector('svg').getBoundingClientRect();return {x:Math.abs(i.x+i.width/2-b.x-b.width/2),y:Math.abs(i.y+i.height/2-b.y-b.height/2)};});
   assert.ok(offset.x<0.6&&offset.y<0.6,JSON.stringify(offset));
  };
  await assertCentered(more);await more.click();
  const menu=page.getByRole('menu');await menu.waitFor();
  const rect=await menu.boundingBox();assert.ok(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=1201&&rect.y+rect.height<=801,'菜单应在视口内');
  await page.getByRole('menuitem',{name:'查看文件信息',exact:true}).click();
  const detail=page.getByRole('dialog',{name:'文件详情',exact:true});await detail.waitFor();
  await assertCentered(detail.getByRole('button',{name:'复制内部链接',exact:true}));
  assert.ok(await detail.getByRole('heading',{name:'文件详情',exact:true}).evaluate(e=>document.activeElement===e));
  await detail.getByRole('button',{name:'重命名',exact:true}).click();
  const rename=page.getByRole('dialog',{name:'重命名',exact:true});await rename.waitFor();
  assert.equal(await rename.getByRole('textbox').inputValue(),item.name);
  await rename.getByRole('button',{name:'取消',exact:true}).click();await rename.waitFor({state:'hidden'});
  assert.equal(await detail.isVisible(),true);await detail.getByRole('button',{name:'close',exact:true}).click();await detail.waitFor({state:'hidden'});
  await more.click();await page.getByRole('menuitem',{name:'预览',exact:true}).click();
  await host.locator('.eva-file-preview-sidebar').waitFor();
  if(entry==='drive'){
   await assertCentered(page.getByRole('button',{name:'全屏预览',exact:true}));
   await page.getByRole('button',{name:'全屏预览',exact:true}).click();await page.getByRole('button',{name:'退出全屏预览',exact:true}).waitFor();
   await page.getByRole('button',{name:'退出全屏预览',exact:true}).press('Escape');await page.getByRole('button',{name:'全屏预览',exact:true}).waitFor();
   await page.getByRole('button',{name:'关闭预览',exact:true}).click();await host.locator('.eva-file-preview-sidebar').waitFor({state:'hidden'});
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
