import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

test('关注与置顶图标在真实页面跟随亮暗主题和公共 Semi 主色',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 const page=await browser.newPage({viewport:{width:1200,height:800}});
 const origin=`http://127.0.0.1:${server.address().port}`;
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const colors=selector=>page.locator(selector).first().evaluate(el=>({color:getComputedStyle(el).color,fill:getComputedStyle(el.querySelector('svg')||el).fill,token:getComputedStyle(document.documentElement).getPropertyValue('--eva-action-primary').trim()}));
 try{
  await page.goto(`${origin}/#/collab`);
  await page.locator('.eva-project-follow-button.is-followed').first().waitFor();
  for(const theme of ['light','dark']){
   await page.evaluate(value=>document.documentElement.dataset.theme=value,theme);
   const active=await colors('.eva-project-follow-button.is-followed');
   assert.equal(active.color,active.fill,`已关注星标 ${theme} 的描边和实心一致`);
   const tokenColor=await page.evaluate(()=>{const probe=document.createElement('span');probe.style.color='var(--eva-action-primary)';document.body.append(probe);const color=getComputedStyle(probe).color;probe.remove();return color;});
   assert.equal(active.color,tokenColor,`已关注星标 ${theme} 使用语义主色`);
   await page.evaluate(()=>{const host=document.createElement('div');host.id='icon-state-button-probes';host.innerHTML='<button class="semi-button semi-button-primary semi-button-borderless">主操作</button><button class="semi-button semi-button-tertiary semi-button-borderless">普通操作</button>';document.body.append(host);});
   const primary=await page.locator('#icon-state-button-probes .semi-button-primary').evaluate(el=>getComputedStyle(el).color);
   const tertiary=await page.locator('#icon-state-button-probes .semi-button-tertiary').evaluate(el=>getComputedStyle(el).color);
   assert.equal(primary,tokenColor,`公共 Semi 主按钮 ${theme} 使用语义主色`);
   assert.notEqual(tertiary,tokenColor,`普通操作 ${theme} 不误用主色`);
   await page.locator('#icon-state-button-probes').evaluate(el=>el.remove());
  }
  await page.goto(`${origin}/#/drive`);
  await page.locator('.eva-drive__pin-button').first().waitFor();
  await page.locator('.eva-drive__pin-button').first().click({force:true});
  const pin=await colors('.eva-drive__pin-button.is-pinned');
  assert.equal(pin.color,pin.fill,'云盘已置顶图钉的实心跟随按钮颜色');
  const pinToken=await page.evaluate(()=>{const probe=document.createElement('span');probe.style.color='var(--eva-action-primary)';document.body.append(probe);const color=getComputedStyle(probe).color;probe.remove();return color;});
  assert.equal(pin.color,pinToken,'云盘已置顶图钉不被公共按钮规则覆盖');
  await page.goto(`${origin}/#/guid`);
  await page.locator('.eva-personal-folder__row').filter({hasText:'供应链运营协同'}).hover();
  await page.getByRole('button',{name:'设置文件夹：供应链运营协同'}).click();
  await page.getByRole('menuitem',{name:'置顶',exact:true}).click();
  await page.locator('.eva-personal-folder__row').filter({hasText:'供应链运营协同'}).hover();
  await page.getByRole('button',{name:'设置文件夹：供应链运营协同'}).click();
  const folder=await colors('.eva-personal-folder-menu .is-pinned');
  assert.equal(folder.color,folder.fill,'个人文件夹置顶图标的描边和实心一致');
  const folderToken=await page.evaluate(()=>{const probe=document.createElement('span');probe.style.color='var(--eva-action-primary)';document.body.append(probe);const color=getComputedStyle(probe).color;probe.remove();return color;});
  assert.equal(folder.color,folderToken,'个人文件夹置顶图标使用语义主色');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
