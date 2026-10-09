import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
test('移除项目成员：必填接任者行内校验，保留真实身份和数据层转让事务',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1200,height:800}});page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=settings`);
  await page.getByRole('tab',{name:'成员管理',exact:true}).click();
  // Isolated browser fixture: an existing supply member owns one existing group.
  await page.evaluate(()=>{const key='eva:project-members:v1',data=JSON.parse(localStorage.getItem(key));data.groups['c-review'].ownerId='u-zhouyuan';localStorage.setItem(key,JSON.stringify(data));});
  await page.reload();await page.getByRole('tab',{name:'成员管理',exact:true}).click();
  const row=page.getByRole('row').filter({has:page.getByText('周远',{exact:true})});
  await row.getByRole('button',{name:'移除',exact:true}).click();
  const modal=page.getByRole('dialog').filter({hasText:'确认移除成员'});
  await modal.getByRole('button',{name:'确认',exact:true}).click();
  await modal.getByText('请选择群主接任者',{exact:true}).waitFor();
  assert.equal(await row.count(),1);
  const picker=modal.getByRole('combobox',{name:'质量与排产',exact:true});
  await picker.click();await page.getByRole('option').filter({hasText:/^王宜林$/}).click();
  await modal.getByRole('button',{name:'确认',exact:true}).click();await modal.waitFor({state:'hidden'});
  await row.waitFor({state:'detached'});
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('eva:project-members:v1')));
  assert.equal(state.groups['c-review'].ownerId,'u-wangyilin');
  assert.equal(state.projects.prod.humans.some(m=>m.id==='u-zhouyuan'),false);
  assert.equal(state.groups['c-review'].humans.some(m=>m.id==='u-zhouyuan'),false);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
