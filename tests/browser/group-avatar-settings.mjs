import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('群头像与更多按钮打开同一个聊天信息面板，私聊头像保持非交互',async()=>{
  const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  try{
    const page=await browser.newPage({viewport:{width:1200,height:800}});
    page.setDefaultTimeout(10000);
    await page.goto(origin+'/#/messages');
    await page.locator('.wk-conv-compact-item').filter({hasText:'采购与招投标'}).first().click();
    await page.getByRole('textbox',{name:'发送给 采购与招投标'}).waitFor();

    const groupAvatar=page.locator('.ch-head .wk-chat-conversation-header-channel-avatar');
    assert.equal(await groupAvatar.getAttribute('role'),'button');
    assert.equal(await groupAvatar.getAttribute('aria-label'),'打开聊天信息');
    await groupAvatar.click();
    const panel=page.locator('.eva-chat-settings');
    await panel.waitFor();
    const panelHeading=await panel.getByRole('heading').first().innerText();
    await panel.getByRole('button',{name:'关闭聊天信息'}).click();
    await panel.waitFor({state:'detached'});

    await page.getByRole('button',{name:'聊天信息',exact:true}).click();
    await panel.waitFor();
    assert.equal(await panel.getByRole('heading').first().innerText(),panelHeading);
    await panel.getByRole('button',{name:'关闭聊天信息'}).click();

    const direct=page.locator('.wk-conv-compact-item').filter({hasText:'何静'}).first();
    await direct.click();
    await page.getByRole('textbox',{name:'发送给 何静'}).waitFor();
    assert.notEqual(await page.locator('.ch-head .wk-chat-conversation-header-channel-avatar').getAttribute('role'),'button');
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
