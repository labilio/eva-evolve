import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

/* 项目任务「表格」视图（Multica Table 对齐）验收：
   第四种视图入口、列模型与表头、分组折叠、列显示/隐藏、
   排序、搜索、内联状态编辑、行选择与导出、层级开关、详情往返。 */
test('Edge：项目任务表格视图渲染与核心交互',async()=>{
  const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  try{
    const context=await browser.newContext({viewport:{width:1200,height:800}});
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    const page=await context.newPage(),errors=[];
    page.setDefaultTimeout(8000);
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/#/collab');
    await page.locator('[data-eva-nav-id="contacts"]').click();
    await page.locator('[data-eva-nav-id="projects"]').click();
    await page.getByRole('button',{name:'供应链运营协同 协同推进间接采购、供应商质量与合规风控工作',exact:true}).click();
    await page.locator('.loop-board').waitFor();

    // 第四种视图：切换器含「表格」，位于层级之后
    const switcher=page.locator('.eva-task-view-switcher');
    await switcher.locator('button',{hasText:'表格'}).waitFor();
    assert.equal(await switcher.locator('button').count(),4);
    await switcher.locator('button',{hasText:'表格'}).click();
    const table=page.locator('.eva-task-table');
    await table.locator('.eva-task-table__grid').waitFor();

    // 默认列（Multica DEFAULT_TABLE_COLUMNS）与工具栏控件
    const headerTexts=await table.locator('.eva-task-table__th-btn .eva-task-table__th-label').allTextContents();
    assert.deepEqual(headerTexts,['任务','状态','优先级','负责人','截止日期','标签']);
    for(const label of ['分组','层级','列','导出'])await table.locator('.eva-task-table__toolbtn',{hasText:label}).waitFor();
    const rowCount=await table.locator('.eva-task-table__row').count();
    assert.ok(rowCount>0,'表格应渲染出任务行');

    // 表格定义合同（对齐 Multica 原版 data-table）：末列外竖线 + 单元格纯内容，无 pill 选择框
    const dataCell=table.locator('.eva-task-table__td:not(.eva-task-table__td--select):not(.eva-task-table__td--add)').first();
    assert.equal(await dataCell.evaluate(el=>getComputedStyle(el).borderRightWidth),'1px','数据单元格应有右侧竖线');
    assert.equal(await table.locator('.eva-task-table__th').nth(1).evaluate(el=>getComputedStyle(el).borderRightWidth),'1px','表头单元格应有右侧竖线');
    assert.equal(await table.locator('.loop-pill').count(),0,'表格内不应渲染带边框的 pill 选择框');
    const firstStatusCell=table.locator('.eva-task-table__row').first().locator('.eva-task-table__cell-trigger[aria-label="状态"]');
    assert.equal(await firstStatusCell.locator('svg').count(),1,'状态单元格应只有状态矢量图标，无下拉箭头');
    assert.equal(await table.locator('.eva-task-table__row').first().locator('.loop-assignee-trigger>svg:last-child').evaluate(el=>getComputedStyle(el).display),'none','负责人单元格不应显示下拉箭头');

    // 负责人：人类姓名必须完整（历史缺陷：双层 inline-flex 尺寸链把姓名压成一字+省略号）；
    // 长 AI 名只允许在列宽边界（≥60px）省略
    const badNames=await table.locator('.loop-assignee-trigger .eva-loop-identity-name-text').evaluateAll(
      els=>els.filter(el=>el.scrollWidth>el.clientWidth+1&&el.clientWidth<60).map(el=>el.textContent));
    assert.deepEqual(badNames,[],'姓名只能在列宽边界省略，不得退化为单字截断: '+badNames.join(','));
    const humanNames=await table.locator('.loop-assignee-trigger').evaluateAll(els=>els
      .filter(el=>el.querySelector('.eva-loop-identity-name-text'))
      .map(el=>el.querySelector('.eva-loop-identity-name-text'))
      .filter(el=>el.scrollWidth<=60)
      .filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.textContent));
    assert.deepEqual(humanNames,[],'短姓名应完整显示: '+humanNames.join(','));

    // 截止日期（Multica DateOnlyPicker 合同）：本地化短格式 M月D日、空态占位、面板含「无截止日期」行
    const dateLabels=(await table.locator('.eva-task-table__row .eva-task-table__cell-trigger[aria-label="截止日期"] .eva-task-table__cell-label').allTextContents()).map(t=>t.trim());
    for(const t of dateLabels.filter(t=>t&&t!=='截止日期'))assert.match(t,/^\d{1,2}月\d{1,2}日$/,'截止日期应为本地化短格式: '+t);
    const clippedDates=await table.locator('.eva-task-table__row .eva-task-table__cell-trigger[aria-label="截止日期"] .eva-task-table__cell-label').evaluateAll(
      els=>els.filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.textContent));
    assert.deepEqual(clippedDates,[],'日期单元格不应截断: '+clippedDates.join(','));

    // 搜索：命中与清空（Semi Input + 公共搜索外观）
    const search=table.locator('.eva-task-table__search input');
    await search.fill('收集下一季度供应商协同需求');
    await table.locator('.eva-task-table__row',{hasText:'收集下一季度供应商协同需求'}).first().waitFor();
    await search.fill('zzz-不存在-zzz');
    await table.locator('.eva-task-table__empty',{hasText:'当前视图没有匹配的任务。'}).waitFor();
    await table.locator('.eva-task-table__search-clear').click();
    await table.locator('.eva-task-table__row').first().waitFor();

    // 分组：按状态分组出现分组行与计数（PopMenu 列表项）
    await table.locator('.eva-task-table__toolbtn',{hasText:'分组'}).click();
    await page.locator('.eva-task-table__menu:visible').getByRole('option',{name:'状态'}).click();
    await table.locator('.eva-task-table__group-row').first().waitFor();
    assert.ok(await table.locator('.eva-task-table__group-row').count()>=1);
    // 折叠/展开分组
    const firstGroup=table.locator('.eva-task-table__group-row').first();
    await firstGroup.click();
    await firstGroup.click();
    // 分组改回不分组（触发器再点可关闭，再次打开选择）
    await table.locator('.eva-task-table__toolbtn',{hasText:'分组'}).click();
    await page.locator('.eva-task-table__menu:visible').getByRole('option',{name:'不分组'}).click();
    await page.locator('.eva-task-table__menu:visible').waitFor({state:'detached'}).catch(()=>{});
    assert.equal(await page.locator('.eva-task-table__menu:visible').count(),0,'选择分组项后菜单应关闭');

    // 列显示/隐藏：隐藏「标签」列后表头不再包含，再恢复
    await table.locator('.eva-task-table__toolbtn',{hasText:'列'}).click();
    const colMenu=page.locator('.eva-task-table__menu:visible');
    await colMenu.getByText('任务属性',{exact:true}).waitFor();
    await colMenu.getByRole('option',{name:'标签'}).click();
    await page.keyboard.press('Escape');
    await page.locator('.eva-task-table__menu:visible').waitFor({state:'detached'}).catch(()=>{});
    await table.locator('.eva-task-table__grid').waitFor();
    const headerAfterHide=await table.locator('.eva-task-table__th-btn .eva-task-table__th-label').allTextContents();
    assert.ok(!headerAfterHide.includes('标签'),'隐藏标签列后表头不应包含标签');
    await table.locator('.eva-task-table__toolbtn',{hasText:'列'}).click();
    await page.locator('.eva-task-table__menu:visible').getByRole('option',{name:'标签'}).click();
    await page.keyboard.press('Escape');
    assert.deepEqual(await table.locator('.eva-task-table__th-btn .eva-task-table__th-label').allTextContents(),['任务','状态','优先级','负责人','截止日期','标签']);

    // 排序：任务列菜单升序（title 可经菜单排序）
    await table.locator('.eva-task-table__th-btn',{hasText:'任务'}).first().click();
    await page.locator('.eva-task-table__menu:visible').getByRole('menuitem',{name:'升序'}).click();
    await table.locator('.eva-task-table__row').first().waitFor();

    // 内联编辑：第一行状态单元格（幽灵触发器）更换状态
    const statusTrigger=table.locator('.eva-task-table__row').first().locator('.eva-task-table__cell-trigger[aria-label="状态"]');
    const statusLabel=statusTrigger.locator('.eva-task-table__status-label');
    const beforeText=((await statusLabel.textContent())||'').trim();
    assert.ok(beforeText,'状态单元格应有文案');
    await statusTrigger.click();
    const statusMenu=page.locator('.eva-task-table__menu:visible');
    await statusMenu.getByRole('option').first().waitFor();
    const optionTexts=await statusMenu.getByRole('option').allTextContents();
    const target=optionTexts.map(text=>text.trim()).find(text=>text&&text!==beforeText);
    await statusMenu.getByRole('option',{name:target,exact:true}).click();
    await page.waitForTimeout(120);
    assert.notEqual(((await statusLabel.textContent())||'').trim(),beforeText,'状态内联编辑应更新单元格文案');

    // 截止日期内联编辑（照搬 Multica DateOnlyPicker）：翻上月选 1 日必逾期标红，再用「无截止日期」行清空
    const dateCell=table.locator('.eva-task-table__row').first().locator('.eva-task-table__cell-trigger[aria-label="截止日期"]');
    await dateCell.click();
    const dateMenu=page.locator('.eva-task-table__menu:visible');
    await dateMenu.locator('.eva-task-table__cal').waitFor();
    const clearRow=dateMenu.locator('.eva-task-table__date-clear');
    await clearRow.waitFor();
    assert.match((await clearRow.textContent())||'',/无截止日期/,'面板首行应为「无截止日期」空值行');
    await dateMenu.locator('.eva-task-table__cal-navbtn[aria-label="上个月"]').click();
    await dateMenu.locator('.eva-task-table__cal-day',{hasText:/^1$/}).first().click();
    await page.waitForTimeout(150);
    await page.locator('.eva-task-table__menu:visible').waitFor({state:'detached'}).catch(()=>{});
    assert.equal(await page.locator('.eva-task-table__menu:visible').count(),0,'选日后面板应关闭');
    const overdueColor=await dateCell.locator('.eva-task-table__cell-label').evaluate(el=>getComputedStyle(el).color);
    assert.match(overdueColor,/249, 57, 32|245, 34, 45/,'逾期日期应标红: '+overdueColor);
    await dateCell.click();
    const dateMenu2=page.locator('.eva-task-table__menu:visible');
    await dateMenu2.locator('.eva-task-table__cal').waitFor();
    await dateMenu2.locator('.eva-task-table__date-clear').click();
    assert.equal(((await dateCell.locator('.eva-task-table__cell-label').textContent())||'').trim(),'截止日期','清空后应回占位文案');

    // 批量操作：勾选行后工具栏换态为批量模式（对齐 Multica BatchActionToolbar 放到了顶部）
    const rowCheck=row=>row.locator('.eva-task-table__check .semi-checkbox');
    const firstRow=table.locator('.eva-task-table__row').first();
    const secondRow=table.locator('.eva-task-table__row').nth(1);
    await rowCheck(firstRow).click();
    const batchBar=table.locator('.eva-task-table__toolbar--batch');
    await batchBar.waitFor();
    await batchBar.getByText('已选择 1 个').waitFor();
    assert.equal(await table.locator('.eva-task-table__search').count(),0,'批量模式下搜索框应退场');
    // 批量动作紧跟「已选择」左侧容器（Multica 紧凑排布，不用 spacer 推到右侧）
    assert.equal(await batchBar.locator('.eva-task-table__toolbar-spacer').count(),0,'批量模式不应使用 spacer 右推');
    assert.ok(await batchBar.locator(':scope > *').first().evaluate(el=>el.classList.contains('eva-task-table__selected')),'首子节点应为已选择 chip');
    for(const label of ['状态','优先级','导出','删除'])await batchBar.locator('.eva-task-table__toolbtn',{hasText:label}).waitFor();
    // 清除选择回到常态工具栏
    await batchBar.locator('.eva-task-table__selected-clear').click();
    await table.locator('.eva-task-table__search').waitFor();
    assert.equal(await table.locator('.eva-task-table__toolbar--batch').count(),0,'清除选择后应回到常态工具栏');

    // 批量改状态：勾两行 → 状态菜单 → 进行中 → 两行写回并清空选择
    const readPills=async()=>Promise.all([
      firstRow.locator('.eva-task-table__status-label').textContent(),
      secondRow.locator('.eva-task-table__status-label').textContent()]);
    const pillsBefore=(await readPills()).map(text=>(text||'').trim());
    await rowCheck(firstRow).click();
    await rowCheck(secondRow).click();
    await batchBar.getByText('已选择 2 个').waitFor();
    await batchBar.getByRole('button',{name:'批量修改状态'}).click();
    await page.locator('.eva-task-table__menu:visible').getByRole('option',{name:'进行中'}).click();
    const updateToast=page.locator('.semi-toast',{hasText:'已更新 2 个任务'});
    await updateToast.waitFor();
    await table.locator('.eva-task-table__search').waitFor();
    assert.equal(await table.locator('.eva-task-table__toolbar--batch').count(),0,'批量更新后应清空选择');
    assert.match((await firstRow.locator('.eva-task-table__status-label').textContent())||'',/进行中/,'第一行状态应写回为进行中');
    assert.match((await secondRow.locator('.eva-task-table__status-label').textContent())||'',/进行中/,'第二行状态应写回为进行中');
    // 完成 toast 右侧提供「撤回」：点击后两行状态回到原值
    await updateToast.locator('.eva-task-table__toast-undo').click();
    await page.locator('.semi-toast',{hasText:'已撤回'}).waitFor();
    assert.deepEqual(await readPills(),pillsBefore,'撤回后两行状态应恢复原值');

    // 批量导出选中：badge 内直接出 CSV
    const leafRow=table.locator('tr.eva-task-table__row:not(:has(.eva-task-table__toggle))').first();
    const leafIdentifier=((await leafRow.locator('.eva-task-table__title-id').textContent())||'').trim();
    await rowCheck(leafRow).click();
    await batchBar.getByText('已选择 1 个').waitFor();
    await batchBar.getByRole('button',{name:'导出已选择的任务'}).click();
    await page.locator('text=已导出 1 个任务').waitFor();

    // 批量删除：确认弹窗 → 行消失
    await batchBar.locator('.eva-task-table__toolbtn--danger').click();
    await page.locator('.semi-modal').getByText('删除 1 个任务？').waitFor();
    await page.locator('.semi-modal').locator('button[aria-label="confirm"]').click();
    const deleteToast=page.locator('.semi-toast',{hasText:'已删除 1 个任务'});
    await deleteToast.waitFor();
    await table.locator('.eva-task-table__search').waitFor();
    assert.equal(await table.locator('.eva-task-table__row',{hasText:leafIdentifier}).count(),0,'被删任务行应消失');
    // 删除 toast「撤回」：行按原序号回到列表
    await deleteToast.locator('.eva-task-table__toast-undo').click();
    await page.locator('.semi-toast',{hasText:'已撤回'}).waitFor();
    assert.ok(await table.locator('.eva-task-table__row',{hasText:leafIdentifier}).count()>0,'撤回后被删任务行应恢复');

    // 层级开关
    await table.locator('.eva-task-table__hierarchy').click();
    await page.waitForTimeout(120);
    await table.locator('.eva-task-table__grid').waitFor();

    // 行点击打开详情抽屉，再关闭回到表格
    await table.locator('.eva-task-table__row').first().locator('.eva-task-table__title-btn').click();
    await page.locator('.collab-route-right').waitFor();
    await page.locator('.collab-route-right .loop-idp__closebtn').click();
    await page.locator('.collab-route-right').waitFor({state:'detached'});
    await table.locator('.eva-task-table__grid').waitFor();

    // 视图往返：回到看板再回表格，状态保留
    await switcher.locator('button',{hasText:'看板'}).click();
    await page.locator('.loop-board').waitFor();
    await switcher.locator('button',{hasText:'表格'}).click();
    await table.locator('.eva-task-table__grid').waitFor();

    await page.screenshot({path:'/tmp/eva-loop-table-view.png'});
    assert.deepEqual(errors,[],'不应有页面错误：'+errors.join(' | '));
    assert.equal(await page.locator('.app-titlebar:visible').count(),1,'系统标题栏保持唯一可见');
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
