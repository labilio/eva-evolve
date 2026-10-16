import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('通讯录组织架构：部门浏览、组织搜索、身份入口及窄窗口布局',async()=>{
  const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  try{
    const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    await page.goto(origin+'/#/contacts');
    await page.locator('.eva-contacts__tree').waitFor();
    assert.equal(await page.locator('.app-titlebar:visible').count(),1,'系统标题栏必须保持唯一可见');
    const total=await page.locator('.eva-contacts__person').count();
    assert.ok(total>=300,'根组织应展示完整的现有联系人目录');
    const selectedRoot=page.locator('.eva-contacts__tree-row.is-selected .eva-contacts__tree-name');
    assert.equal((await selectedRoot.innerText()).trim(),'吉利汽车集团');
    const rail=await page.locator('.eva-contacts__organization').boundingBox();
    assert.ok(rail.width>=220&&rail.width<=260,'组织架构栏沿用 220–260px 三栏基准');
    const resizer=page.getByRole('separator',{name:'调整组织架构栏宽度'});
    await resizer.focus();
    await page.keyboard.press('ArrowRight');
    assert.ok((await page.locator('.eva-contacts__organization').boundingBox()).width>rail.width,'键盘可复用公共中栏宽度调整');
    await page.keyboard.press('Home');
    assert.equal(Math.round((await page.locator('.eva-contacts__organization').boundingBox()).width),260,'Home 恢复 260px 默认宽度');

    const digital=page.locator('.eva-contacts__tree-select',{hasText:'数智化中心'}).first();
    await digital.click();
    const departmentCount=await page.locator('.eva-contacts__person').count();
    assert.ok(departmentCount>0&&departmentCount<total,'选择部门后只显示该部门及下级联系人');
    assert.match(await page.locator('.eva-contacts__breadcrumb').innerText(),/吉利汽车集团\s*\/\s*数智化中心/);
    assert.equal(await page.locator('.eva-contacts__directory-count').innerText(),departmentCount+' 人 · 含下级部门');

    const search=page.locator('.eva-contacts__search input');
    await search.fill('供应链中心');
    await page.locator('.eva-contacts__department-results').waitFor();
    const searchCount=await page.locator('.eva-contacts__person').count();
    assert.ok(searchCount>100,'搜索组织名称应返回其下级联系人，而不只匹配姓名');
    assert.match(await page.locator('.eva-contacts__department-results').innerText(),/供应链中心/);
    await page.keyboard.press('Escape');
    assert.equal(await search.inputValue(),'');

    await search.fill('王宜林');
    assert.equal(await page.locator('.eva-contacts__person').count(),1);
    await page.getByRole('button',{name:'查看 王宜林 的资料',exact:true}).click();
    await page.locator('.eva-person-card-popover:visible').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('.eva-person-card-popover:visible').waitFor({state:'hidden'});

    await page.goto(origin+'/#/messages');
    await page.goto(origin+'/#/contacts');
    await page.locator('.eva-contacts__tree-row.is-selected').waitFor();
    assert.equal(await page.locator('.eva-contacts__search input').inputValue(),'','路由重新挂载后不保留旧查询');
    assert.equal((await page.locator('.eva-contacts__tree-row.is-selected .eva-contacts__tree-name').innerText()).trim(),'吉利汽车集团','路由重新挂载后恢复根组织');

    await page.setViewportSize({width:600,height:700});
    const narrow=await page.locator('.eva-contacts').evaluate(element=>{
      const body=element.querySelector('.eva-contacts__body').getBoundingClientRect();
      const organization=element.querySelector('.eva-contacts__organization').getBoundingClientRect();
      const directory=element.querySelector('.eva-contacts__directory').getBoundingClientRect();
      return {bodyWidth:body.width,organizationWidth:organization.width,organizationBottom:organization.bottom,directoryTop:directory.top,overflow:document.documentElement.scrollWidth-innerWidth};
    });
    assert.ok(Math.abs(narrow.bodyWidth-narrow.organizationWidth)<=1,'窄窗口组织架构应堆叠为整行');
    assert.ok(Math.abs(narrow.organizationBottom-narrow.directoryTop)<=1,'窄窗口目录应位于组织树下方');
    assert.ok(narrow.overflow<=1,'窄窗口不能产生页面级横向滚动');
    assert.deepEqual(errors,[]);
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
