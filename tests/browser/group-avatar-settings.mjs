import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

// 1×1 PNG, enough to drive the crop/export path without external assets.
const ONE_PIXEL_PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('群头像上传本地图片先进入圆形裁剪，保存后再写回群设置',async()=>{
  const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  const pageErrors=[];
  try{
    const context=await browser.newContext({viewport:{width:1200,height:800}});
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    const page=await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror',error=>pageErrors.push(String(error)));
    await page.goto(origin+'/#/messages');
    await page.locator('.wk-conv-compact-item').filter({hasText:'采购与招投标'}).first().click();
    await page.getByRole('textbox',{name:'发送给 采购与招投标'}).waitFor();
    await page.getByRole('button',{name:'聊天信息',exact:true}).click();
    const panel=page.locator('.eva-chat-settings');
    await panel.waitFor();
    await panel.locator('.eva-chat-setting-row').filter({hasText:'群头像'}).click();
    const modal=page.locator('.semi-modal-content').filter({hasText:'群头像'}).last();
    await modal.waitFor();
    const before=await panel.locator('.eva-chat-group-avatar').getAttribute('src');

    // 选择本地图片后不直接写回，先出现圆形裁剪画布与 取消 / 保存。
    await page.locator('input[type=file][aria-label="上传群头像"]').setInputFiles({name:'group.png',mimeType:'image/png',buffer:Buffer.from(ONE_PIXEL_PNG,'base64')});
    const editor=page.locator('.eva-avatar-editor');
    await editor.locator('canvas.eva-avatar-editor__canvas').waitFor();
    assert.equal(await editor.locator('header').count(),0,'群头像弹窗复用面板标题，不重复渲染编辑器头部');
    assert.equal(await editor.getByRole('button',{name:'取消'}).count(),1);
    assert.equal(await editor.getByRole('button',{name:'保存'}).count(),1);
    assert.equal(await panel.locator('.eva-chat-group-avatar').getAttribute('src'),before,'裁剪确认前不改群头像');

    await editor.getByRole('button',{name:'保存'}).click();
    await editor.waitFor({state:'detached'});
    await page.waitForFunction(()=>{
      const img=document.querySelector('.eva-chat-group-avatar');
      return Boolean(img)&&/^data:image\/png;base64,/.test(img.getAttribute('src')||'');
    });
    const after=await panel.locator('.eva-chat-group-avatar').getAttribute('src');
    assert.notEqual(after,before,'保存后群头像写回');
    assert.deepEqual(pageErrors,[],'页面不应出现未捕获 JavaScript 错误');
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});

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
