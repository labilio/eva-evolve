import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('Edge：任务标题随文字和抽屉宽度换行，新建时保留 200 字上限',async()=>{
  const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:800}});
    await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=tasks&evaTask=SC-103`);
    const title=page.locator('.loop-idp__title');
    await title.waitFor();
    assert.equal(await title.evaluate(el=>el.tagName),'TEXTAREA');
    const description=page.locator('.loop-idp__desc');
    const idleDescriptionHeight=await description.evaluate(el=>el.getBoundingClientRect().height);
    await description.click();
    const descriptionEditor=page.locator('.loop-idp .loop-field-textarea--lg.loop-field-textarea--auto');
    await descriptionEditor.waitFor();
    const editDescriptionHeight=await descriptionEditor.evaluate(el=>el.getBoundingClientRect().height);
    assert.ok(editDescriptionHeight<=idleDescriptionHeight+8,`单行描述进入编辑态时不跳成大文本框：${idleDescriptionHeight} → ${editDescriptionHeight}`);
    await page.locator('.loop-idp__topbar').click();
    const long='复核供应商来料异常的隔离措施、根因证据和长期整改验证结果，并同步采购与排产的下一步安排。'.repeat(4);
    await title.fill(long);
    const drawerHeight=await title.evaluate(el=>el.clientHeight);
    assert.ok(drawerHeight>80,'长标题在抽屉里自动换为多行');
    await title.blur();
    assert.equal(await title.inputValue(),long,'失焦后保留完整标题');
    await page.locator('.loop-idp__fsbtn').click();
    await page.waitForTimeout(350);
    const expandedHeight=await title.evaluate(el=>el.clientHeight);
    assert.ok(expandedHeight<drawerHeight-24,'抽屉变宽后标题高度重新收缩');
    await page.locator('.loop-idp__fsbtn').click();
    await page.waitForTimeout(350);
    assert.ok(await title.evaluate(el=>el.clientHeight)>expandedHeight+24,'抽屉恢复后标题重新增高');

    await page.locator('.collab-route-right .loop-idp__closebtn').click();
    await page.getByRole('button',{name:'新建任务',exact:true}).click();
    const createTitle=page.locator('.eva-loop-task-create .loop-ci__title');
    await createTitle.waitFor();
    assert.equal(await createTitle.evaluate(el=>el.tagName),'TEXTAREA');
    assert.equal(await createTitle.getAttribute('maxlength'),'200');
    await createTitle.fill('准备完整的客户培训与操作手册，包含权限、任务流转、项目文件、群聊协作和验收操作步骤。'.repeat(4));
    assert.ok(await createTitle.evaluate(el=>el.clientHeight)>72,'新建弹窗里的标题也自动增高');
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
