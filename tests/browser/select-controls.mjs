import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

test('公共 Select：自动化计划、旧项目移除、成员身份与多选角色',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  await page.goto(origin+'/#/collab?evaProject=prod&evaTab=automation');
  await page.getByRole('button',{name:'创建自动化',exact:true}).click();
  const dialog=page.getByRole('dialog');
  assert.equal(await dialog.getByText('发送到',{exact:true}).count(),0);
  assert.equal(await dialog.getByText('选择项目（可选）',{exact:true}).count(),0);
  await dialog.getByRole('tab',{name:'每周',exact:true}).click();
  const select=dialog.locator('.semi-select');
  await select.click();
  const options=page.locator('.eva-select-menu:visible [role="option"]');
  await options.first().waitFor();
  assert.deepEqual((await options.allTextContents()).map(text=>text.trim()),['周一','周二','周三','周四','周五','周六','周日']);
  const surfaces=await page.locator('.eva-select-menu:visible').evaluate(el=>{
    const list=el.querySelector('.semi-select-option-list'),outer=el.closest('.semi-popover-wrapper');
    return {inner:getComputedStyle(list).backgroundColor,padding:getComputedStyle(el).padding,outer:getComputedStyle(outer).backgroundColor};
  });
  assert.equal(surfaces.inner,'rgba(0, 0, 0, 0)','选项列表不重复绘制弹层背景');
  assert.equal(surfaces.padding,'0px','列表外套不重复叠加留白');
  assert.notEqual(surfaces.outer,'rgba(0, 0, 0, 0)','外层拥有唯一可见表面');
  const inset=await options.first().evaluate(el=>{const a=el.getBoundingClientRect(),b=el.querySelector('.eva-select-option__content').getBoundingClientRect();return (b.x-a.x)/(a.width/el.offsetWidth)});
  assert.ok(inset<=12,'普通选项不预留前置勾选空槽');
  const chosen=await options.nth(2).innerText();await options.nth(2).click();
  await select.getByText(chosen.trim(),{exact:true}).waitFor();
  assert.match(await select.innerText(),new RegExp(chosen.trim()));
  await dialog.getByText('下次运行 每周三 09:00',{exact:true}).waitFor();
  await dialog.getByRole('button',{name:'cancel',exact:true}).click();
  await page.locator('.loop-automation-card').first().click();
  await page.locator('.loop-apd').waitFor();
  assert.equal(await page.locator('.loop-apd').getByText('发送到',{exact:true}).count(),0);
  await page.goto(origin+'/#/collab?evaProject=prod&evaTab=settings');
  await page.getByRole('tab',{name:'成员管理',exact:true}).click();
  await page.getByRole('button',{name:'角色设置',exact:true}).click();
  const member=page.getByRole('combobox',{name:'成员',exact:true});
  await member.click();
  await options.first().waitFor();
  assert.ok(await options.locator('img').count()>0,'成员候选保留公共头像');
  const widthGap=await options.first().evaluate(el=>el.parentElement.clientWidth-el.offsetWidth-parseFloat(getComputedStyle(el.parentElement).paddingLeft)-parseFloat(getComputedStyle(el.parentElement).paddingRight));
  assert.ok(Math.abs(widthGap)<=2,'菜单行铺满可用宽度，不继承 Dropdown 的最大宽度');
  await options.nth(1).click();
  assert.ok(await member.locator('img').count()>0,'回填仍显示公共头像');
  // 本轮已确认角色选择改为表单内 CheckboxGroup；成员单选仍验证公共 Select。
  const roles=dialog.locator('.eva-role-options').getByRole('checkbox');
  assert.ok(await roles.count()>1,'项目角色保留多选能力');
  await dialog.getByRole('heading',{name:'设置项目角色',exact:true}).click();
  for(const i of [0,1]){if(!await roles.nth(i).isChecked()){await roles.nth(i).focus();await roles.nth(i).press('Space');}}
  assert.equal(await roles.nth(0).isChecked(),true);assert.equal(await roles.nth(1).isChecked(),true);
  await dialog.getByRole('button',{name:'取消',exact:true}).click();
  await page.goto(origin+'/#/collab?evaProject=prod&evaTab=automation');
  await page.locator('.loop-automation-card').first().waitFor();
  assert.equal(await page.locator('.eva-select-menu:visible').count(),0);
  assert.deepEqual(errors,[]);
 } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
});
