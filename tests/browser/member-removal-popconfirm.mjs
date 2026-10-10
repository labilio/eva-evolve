import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

test('普通项目成员和数字员工使用公共就近确认，取消无副作用',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:800}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=settings`);
  await page.getByRole('tab',{name:'成员管理',exact:true}).click();
  const withClone=page.getByRole('row').filter({has:page.getByText('林晓',{exact:true})});
  await withClone.getByRole('button',{name:'移除',exact:true}).click();
  const cloneConfirm=page.locator('.semi-popconfirm');await cloneConfirm.waitFor();
  assert.match(await cloneConfirm.innerText(),/移除后，两者将退出项目和已加入的项目群聊及其子区/);
  assert.match(await cloneConfirm.innerText(),/林晓的 AI 分身/);
  const identities=cloneConfirm.locator('.eva-identity-list .semi-list-item');
  assert.equal(await identities.count(),2);
  assert.equal(await identities.first().evaluate(row=>getComputedStyle(row.parentElement).gap),'16px','真人与 AI 分身两行之间留 16px');
  const geometry=await identities.evaluateAll(rows=>rows.map(row=>{
   const avatar=row.querySelector('.semi-list-item-body-header')?.getBoundingClientRect();
   const name=row.querySelector('.eva-identity-list-name');
   return {avatar:avatar?.width,nameSize:getComputedStyle(name).fontSize,nameWeight:getComputedStyle(name).fontWeight};
  }));
  assert.equal(geometry[0].avatar,geometry[1].avatar,'真人与 AI 头像视觉宽度一致');
  assert.deepEqual(geometry.map(({nameSize,nameWeight})=>({nameSize,nameWeight})),[{nameSize:'14px',nameWeight:'500'},{nameSize:'14px',nameWeight:'500'}]);
  await cloneConfirm.getByRole('button',{name:'取消',exact:true}).click();
  await cloneConfirm.waitFor({state:'hidden'});
  const row=page.getByRole('row').filter({has:page.getByText('唐微',{exact:true})});
  await row.getByRole('button',{name:'移除',exact:true}).click();
  const confirm=page.locator('.semi-popconfirm');await confirm.waitFor();
  assert.equal(await page.locator('.semi-modal:visible').count(),0);
  assert.match(await confirm.innerText(),/移除后，该成员将退出项目和已加入的项目群聊及其子区/);
  assert.doesNotMatch(await confirm.innerText(),/一同移除的 AI 分身/);
  assert.equal(await confirm.locator('.eva-card').count(),1);
  assert.doesNotMatch(await confirm.innerText(),/历史内容保留/);
  await confirm.getByRole('button',{name:'取消',exact:true}).click();
  await confirm.waitFor({state:'hidden'});
  assert.equal(await row.count(),1);
  await row.getByRole('button',{name:'移除',exact:true}).click();
  await confirm.waitFor();
  await confirm.getByRole('button',{name:'移除',exact:true}).click();
  await row.waitFor({state:'detached'});
  const employee=page.getByRole('row').filter({hasText:'HR 入职服务专家'});
  await employee.getByRole('button',{name:'移除',exact:true}).click();
  await confirm.waitFor();assert.match(await confirm.innerText(),/数字员工/);
  await confirm.getByRole('button',{name:'取消',exact:true}).click();
  assert.equal(await employee.count(),1);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
