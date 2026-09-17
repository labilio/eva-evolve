import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('项目归属在聊天信息和管家资料中一致，导航往返保留草稿',async()=>{
  const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  try{
    const page=await browser.newPage({viewport:{width:1200,height:800}});
    await page.goto(origin+'/#/messages');
    await page.locator('.wk-conv-compact-item').filter({hasText:'采购与招投标'}).first().click();
    const input=page.getByRole('textbox',{name:'发送给 采购与招投标'});
    await input.fill('保留项目归属验收草稿');
    await page.getByRole('button',{name:'聊天信息',exact:true}).click();
    const panel=page.locator('.eva-chat-settings');
    const project=panel.locator('.eva-project-identity');
    await project.waitFor();
    assert.equal(await project.innerText(),'供应链运营协同');
    assert.equal(await project.locator('svg').count(),1);
    const projectColor=await project.locator('svg').evaluate(e=>getComputedStyle(e).color);
    assert.equal(await panel.locator('.eva-chat-member-grid img').evaluateAll(images=>images.every(e=>!e.draggable)),true);
    await panel.locator('.eva-chat-member-tile').filter({hasText:'项目管家'}).click();
    const card=page.locator('.eva-person-card');
    await card.waitFor();
    const affiliation=card.locator('.eva-project-identity');
    assert.equal(await affiliation.innerText(),'供应链运营协同');
    assert.equal(await affiliation.locator('svg').evaluate(e=>getComputedStyle(e).color),projectColor);
    await page.evaluate(()=>Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
    await page.screenshot({path:'/tmp/eva-ready-project-affiliation.png'});
    await page.keyboard.press('Escape');
    await project.click();
    await page.waitForURL(/evaProject=prod/);
    await page.goto(origin+'/#/messages');
    await page.locator('.wk-conv-compact-item').filter({hasText:'采购与招投标'}).first().click();
    await input.waitFor();
    assert.match(await input.innerText(),/保留项目归属验收草稿/);
    assert.equal(await page.locator('.eva-chat-settings').count(),0);
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
