import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

// Bot 级免 @ 回答：群级开关已下线，只在本人分身的资料卡内按群开启。
test('本人分身在资料卡内按群开启免 @ 回答，非主人不可见，刷新保留',async()=>{
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

    const trigger=name=>page.locator(`button[aria-label="查看 ${name} 的资料"]`);
    const card=page.locator('.eva-person-card');
    const openMentionFree=async name=>{
      await trigger(name).click();
      await card.waitFor();
      await card.getByRole('button',{name:/群聊回复/}).click();
      await card.getByRole('heading',{name:'群聊回复',exact:true}).waitFor();
    };
    const closeCard=async name=>{await trigger(name).click();await card.waitFor({state:'detached'});};

    await page.goto(origin+'/#/contacts');

    // 他人分身没有 Bot 级免 @ 入口，只有本人分身可以进入。
    await trigger('林晓的 AI 分身').click();
    await card.waitFor();
    assert.equal(await card.getByRole('button',{name:/群聊回复/}).count(),0,'他人分身不提供免 @ 回答');
    await closeCard('林晓的 AI 分身');

    await openMentionFree('王宜林的 AI 分身');
    const rows=card.locator('.eva-person-card__mention-row');
    assert.ok(await rows.count()>=1,'本人分身至少有一个可配置的群');
    await card.getByText('AI 默认仅在被 @ 时回复。开启后，在对应群聊及其子区中无需 @ 也可回复。',{exact:true}).waitFor();
    await card.getByText('未开启（'+await rows.count()+'）',{exact:true}).waitFor();
    // 群级开关已下线，群聊管理不再出现 Bot 回复规则。
    const firstStatus=rows.first().locator('.eva-person-card__mention-status');
    assert.equal(await firstStatus.innerText(),'AI 仅在被 @ 时回复','默认AI 仅在被 @ 时回复');
    const firstSwitch=rows.first().getByRole('switch');
    assert.equal(await firstSwitch.isChecked(),false);

    await firstSwitch.click();
    await firstStatus.waitFor();
    assert.equal(await firstStatus.innerText(),'AI 无需被 @ 即可回复');
    assert.equal(await firstSwitch.isChecked(),true);
    await card.getByText('已开启（1）',{exact:true}).waitFor();
    const remaining=await rows.count()-1;
    if(remaining)await card.getByText('未开启（'+remaining+'）',{exact:true}).waitFor();

    await closeCard('王宜林的 AI 分身');
    await page.reload();
    await openMentionFree('王宜林的 AI 分身');
    const restored=card.locator('.eva-person-card__mention-row').first();
    assert.equal(await restored.getByRole('switch').isChecked(),true,'刷新后保留免 @ 回答');
    assert.equal(await restored.locator('.eva-person-card__mention-status').innerText(),'AI 无需被 @ 即可回复');

    assert.deepEqual(pageErrors,[],'页面不应出现未捕获 JavaScript 错误');
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
