import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

test('项目角色：弹窗内的创建表单独立提交，空名称提示、创建选中及保存重开',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1200,height:800}});page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=settings`);
  await page.getByRole('tab',{name:'成员管理',exact:true}).click();
  await page.getByRole('button',{name:'角色设置',exact:true}).click();
  const modal=page.getByRole('dialog').filter({hasText:'设置项目角色'});
  await page.getByRole('button',{name:'新建角色',exact:true}).click();
  const create=page.getByRole('button',{name:'创建并选中',exact:true});await create.click();
  await page.getByText('请输入角色名称',{exact:true}).waitFor();
  assert.equal(await modal.isVisible(),true,'子表单不能触发外层保存并关闭角色设置');
  await page.getByRole('textbox',{name:'新角色名称',exact:true}).fill('表单角色验收');
  await page.getByRole('textbox',{name:'新角色名称',exact:true}).press('Enter');
  await page.getByRole('textbox',{name:'新角色名称',exact:true}).waitFor({state:'hidden'});
  assert.equal(await modal.isVisible(),true);
  await modal.getByText('设置项目角色',{exact:true}).click();
  await page.locator('.eva-project-role-modal').locator('.semi-modal-footer').getByText('保存',{exact:true}).click();await modal.waitFor({state:'hidden'});
  await page.getByRole('button',{name:'角色设置',exact:true}).click();
  assert.equal(await modal.getByRole('checkbox',{name:'表单角色验收',exact:true}).isChecked(),true);
  assert.equal(await modal.locator('form form').count(),0);
  await modal.getByText('前端',{exact:true}).click();
  await page.locator('.eva-project-role-modal .semi-modal-footer').getByText('取消',{exact:true}).click();
  await modal.waitFor({state:'hidden'});
  await page.getByRole('button',{name:'角色设置',exact:true}).click();
  assert.equal(await modal.getByRole('checkbox',{name:'前端',exact:true}).isChecked(),false,'取消不保存角色变更');
  await modal.getByRole('button',{name:'新建角色',exact:true}).click();
  await modal.getByRole('textbox',{name:'新角色名称',exact:true}).press('Escape');
  await modal.getByRole('textbox',{name:'新角色名称',exact:true}).waitFor({state:'hidden'});
  assert.equal(await modal.isVisible(),true,'取消新建不关闭父弹窗');

  await page.locator('.eva-project-role-modal').locator('.semi-modal-footer').getByText('取消',{exact:true}).click();
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
