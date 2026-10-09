import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from '../../tools/serve.mjs';

test('新建分组统一校验空值、重名和键盘提交，取消重置且保留草稿', async () => {
  const server=createServer(new URL('../../dist',import.meta.url).pathname);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch({channel:'msedge'});
  const page=await browser.newPage({viewport:{width:1200,height:800}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.goto(`${origin}/#/guid`);
    const trigger=page.getByRole('button',{name:'新建分组',exact:true});
    const composer=page.locator('.eva-composer-prompt');
    await composer.fill('保留这段未发送的草稿');await trigger.click();
    const modal=page.locator('.eva-personal-folder-modal .semi-modal');
    const field=modal.getByRole('textbox',{name:'分组名称',exact:true});
    const submit=modal.getByRole('button',{name:'新建',exact:true});
    await field.waitFor();
    await page.waitForTimeout(350); // Semi entrance animation scales the content before it settles
    const spacing=await modal.evaluate(el=>{
      const body=el.querySelector('.semi-modal-body'),label=el.querySelector('.semi-form-field-label'),input=el.querySelector('.semi-input-wrapper');
      return {top:label.getBoundingClientRect().top-body.getBoundingClientRect().top,bottom:body.getBoundingClientRect().bottom-input.getBoundingClientRect().bottom};
    });
    assert.equal(spacing.top,24,'正文顶部不叠加字段的12px留白');
    assert.equal(spacing.bottom,24,'正文底部不叠加字段的12px留白');
    assert.equal(await submit.isEnabled(),true,'空名称仍可尝试提交');
    await submit.click();
    await modal.getByText('请输入分组名称',{exact:true}).waitFor();
    assert.equal(await field.getAttribute('aria-invalid'),'true');
    await page.waitForFunction(()=>document.activeElement?.id==='eva-personal-folder-name');
    assert.equal(await field.evaluate(el=>el===document.activeElement),true);
    assert.equal(await composer.inputValue(),'保留这段未发送的草稿');
    await field.fill('   ');await field.press('Enter');
    await modal.getByText('请输入分组名称',{exact:true}).waitFor();
    await field.fill('最近');await submit.click();
    await modal.getByText('已有同名文件夹',{exact:true}).waitFor();
    await modal.getByRole('button',{name:'取消',exact:true}).click();
    await modal.waitFor({state:'detached'});await trigger.click();
    assert.equal(await field.inputValue(),'');
    assert.equal(await modal.getByText('已有同名文件夹',{exact:true}).count(),0);
    await field.fill('  Form 学习示例  ');await field.press('Enter');
    await modal.waitFor({state:'detached'});
    assert.equal(await page.locator('.eva-personal-folder__main span').first().innerText(),'Form 学习示例');
    assert.equal(await composer.inputValue(),'保留这段未发送的草稿');
    await trigger.click();await field.press('Escape');await modal.waitFor({state:'detached'});
    await page.reload();await trigger.waitFor();
    assert.equal(await page.locator('.eva-personal-folder__main span').first().innerText(),'Form 学习示例');
    await page.locator('[data-eva-nav-id="messages"]').click();await page.locator('.ch-list').waitFor();
    await page.locator('[data-eva-nav-id="new-chat"]').click();await trigger.waitFor();await trigger.click();
    assert.equal(await field.inputValue(),'');
    assert.equal(await page.locator('.app-titlebar').count(),1);
    assert.deepEqual(errors,[]);
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
});
