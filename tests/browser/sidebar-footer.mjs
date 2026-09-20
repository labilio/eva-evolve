import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from '../../tools/serve.mjs';
import { fileURLToPath } from 'node:url';
let server,browser,page,origin;
before(async()=>{
  server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  const context=await browser.newContext({viewport:{width:1200,height:800},locale:'zh-CN'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  page=await context.newPage();
});
after(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));});
async function verifyFooter(){
  const footer=page.locator('.eva-sider-footer');
  await footer.waitFor();
  assert.equal(await footer.count(),1);
  // 账户身份按钮化：footer 内唯一按钮就是账户按钮；设置/退出移入其悬浮菜单（Portal，不在 footer 内）。
  assert.equal(await footer.locator('button').count(),1,'The only footer control is the account button');
  const account=footer.locator('.eva-sider-account');
  assert.equal(await account.evaluate(el=>el.tagName),'BUTTON','Account row is a real button');
  assert.equal(await footer.locator('.eva-sider-account__name').innerText(),'王宜林');
  assert.equal(await footer.locator('img').getAttribute('src'),await page.evaluate(()=>window.EvaAvatar.personUri('u-wangyilin')));
  const geometry=await footer.evaluate(el=>{
    const box=el.getBoundingClientRect(),sider=el.closest('.layout-sider').getBoundingClientRect(),button=el.querySelector('button').getBoundingClientRect();
    return {left:box.left,right:box.right,bottom:box.bottom,siderLeft:sider.left,siderRight:sider.right,siderBottom:sider.bottom,buttonLeft:button.left,buttonRight:button.right,buttonBottom:button.bottom};
  });
  assert.ok(geometry.left>=geometry.siderLeft&&geometry.right<=geometry.siderRight);
  assert.ok(geometry.buttonLeft>=geometry.left&&geometry.buttonRight<=geometry.right&&geometry.buttonBottom<=geometry.bottom);
  assert.ok(Math.abs(geometry.bottom-geometry.siderBottom)<=10,'Footer remains at the bottom of navigation');
  // 点击账户按钮打开悬浮菜单：含更换头像 + 设置 + 退出登录三项，均为 icon+文字。
  const url=page.url();
  await account.click();
  await page.locator('.eva-account-menu:visible').waitFor();
  assert.ok(await account.evaluate(el=>el.classList.contains('is-open')),'Account button reflects open state');
  const menuItems=page.locator('.eva-account-menu__item:visible');
  assert.equal(await menuItems.count(),3,'Menu offers avatar, settings and logout');
  assert.equal(await page.locator('.eva-account-menu__item:visible',{hasText:'更换头像'}).count(),1,'Avatar entry present');
  assert.equal(await page.locator('.eva-account-menu__item:visible',{hasText:'设置'}).count(),1);
  assert.equal(await page.locator('.eva-account-menu__item--danger:visible',{hasText:'退出登录'}).count(),1,'Logout is present as its own item');
  assert.equal(page.url(),url,'Opening the menu does not navigate');
  // 点击设置项打开设置弹窗，且不遮挡系统标题栏。
  await page.locator('.eva-account-menu__item:visible',{hasText:'设置'}).click();
  await page.locator('.eva-settings-dialog .semi-modal:visible').waitFor();
  assert.equal(await page.locator('.app-titlebar:visible').count(),1);
  await page.keyboard.press('Escape');
  await page.locator('.eva-settings-dialog .semi-modal:visible').waitFor({state:'hidden'});
  assert.ok(!await account.evaluate(el=>el.classList.contains('is-open')),'Menu closed after settings opened');
}
test('Account footer button opens a menu with settings and logout, expanded and collapsed',async()=>{
  await page.goto(`${origin}/#/guid`);
  for(const width of [1200,1000]){
    await page.setViewportSize({width,height:800});
    await verifyFooter();
    const siderToggle=page.locator('.app-titlebar__button');
    assert.equal(await siderToggle.count(),1,'System titlebar exposes exactly one sidebar toggle');
    assert.equal(await siderToggle.getAttribute('aria-label'),'收起');
    await siderToggle.click();
    await page.locator('.eva-sider-footer.is-collapsed').waitFor();
    await verifyFooter();
    await siderToggle.click();
    await page.locator('.eva-sider-footer:not(.is-collapsed)').waitFor();
  }
  for(const route of ['/messages','/contacts','/guid']){
    await page.goto(`${origin}/#${route}`);
    await verifyFooter();
  }
});

test('Left edge aligns topbar collapse, nav icons and the equal-width account button',async()=>{
  await page.setViewportSize({width:1200,height:800});
  await page.goto(`${origin}/#/guid`);
  await page.reload();
  await page.locator('.eva-nav-section').first().waitFor();
  await page.locator('[data-eva-nav-id="workboard"] svg.lucide').waitFor();
  await page.waitForTimeout(200);
  const m=await page.evaluate(()=>{
    const L=el=>el?+el.getBoundingClientRect().left.toFixed(1):null;
    const R=el=>el?+el.getBoundingClientRect().right.toFixed(1):null;
    const collapse=document.querySelector('.app-titlebar__menu button.app-titlebar__button');
    // 侧栏内容左轴：主体 lucide 菜单图标列与分组标题同在 x=20，取一个普通 lucide 项为基准。
    const navIcon=document.querySelector('[data-eva-nav-id="workboard"] svg.lucide');
    const navRow=document.querySelector('.eva-nav-entry .box-border.cursor-pointer, .eva-personal-entry');
    const account=document.querySelector('.eva-sider-account');
    return {collapseIconLeft:L(collapse.querySelector('svg')),navIconLeft:L(navIcon),
      navRowLeft:L(navRow),navRowRight:R(navRow),accountLeft:L(account),accountRight:R(account)};
  });
  assert.ok(Math.abs(m.collapseIconLeft-m.navIconLeft)<=1,`Topbar collapse icon (${m.collapseIconLeft}) aligns with nav icon column (${m.navIconLeft})`);
  assert.ok(Math.abs(m.accountLeft-m.navRowLeft)<=1,`Account button left (${m.accountLeft}) matches nav row left (${m.navRowLeft})`);
  assert.ok(Math.abs(m.accountRight-m.navRowRight)<=1,`Account button right (${m.accountRight}) matches nav row right (${m.navRowRight})`);
});

test('Account chevron points right by default and rotates up when open',async()=>{
  await page.setViewportSize({width:1200,height:800});
  await page.goto(`${origin}/#/guid`);
  const account=page.locator('.eva-sider-account');
  await account.waitFor();
  const chevron=account.locator('.eva-sider-account__chevron');
  assert.ok((await chevron.getAttribute('class')||'').includes('lucide'),'Chevron uses a Lucide icon');
  const closed=await chevron.evaluate(el=>getComputedStyle(el).transform);
  assert.ok(closed==='none'||closed==='matrix(1, 0, 0, 1, 0, 0)','Chevron is unrotated (points right) by default');
  await account.click();
  await page.locator('.eva-account-menu:visible').waitFor();
  await page.waitForTimeout(200);
  const open=await chevron.evaluate(el=>getComputedStyle(el).transform);
  assert.notEqual(open,closed,'Chevron rotates when the menu opens');
  assert.notEqual(open,'none','Chevron has a rotation transform when open (points up)');
  await page.keyboard.press('Escape');
});

test('Expanded navigation shares the reviewed typography and group rhythm',async()=>{
  await page.setViewportSize({width:1200,height:800});
  await page.goto(`${origin}/#/guid`);
  await page.locator('.eva-nav-section').first().waitFor();
  const sections=await page.evaluate(()=>[...document.querySelectorAll('.eva-nav-section')].map((section,index)=>{
    const title=section.querySelector('.eva-nav-section__title'),titleStyle=getComputedStyle(title),sectionStyle=getComputedStyle(section);
    return {index,titleFont:titleStyle.fontSize,titleLine:titleStyle.lineHeight,titleWeight:titleStyle.fontWeight,
      marginTop:sectionStyle.marginTop,paddingTop:sectionStyle.paddingTop,borderTop:sectionStyle.borderTopWidth,
      entries:[...section.querySelectorAll('.eva-nav-entry')].map(entry=>{
        const row=entry.querySelector('.box-border.cursor-pointer, .eva-personal-entry__main');
        const label=entry.querySelector('[class*="text-14px"], .eva-personal-entry__label'),style=getComputedStyle(label);
        const rowStyle=getComputedStyle(row);
        return {height:row.getBoundingClientRect().height,font:style.fontSize,line:style.lineHeight,weight:style.fontWeight,radius:rowStyle.borderRadius,
          selected:Boolean(entry.querySelector('[aria-current="page"]'))};
      })};
  }));
  const iconSnapshot=await page.evaluate(()=>[...document.querySelectorAll('.eva-nav-entry')].map(entry=>({
    id:entry.dataset.evaNavId,
    lucide:entry.querySelector('svg.lucide')?.getAttribute('class')||'',
    agentAsset:entry.querySelector('.eva-nav-icon img')?.getAttribute('src')||'',
    personalAvatar:entry.querySelector('.eva-personal-entry__logo img')?.getAttribute('src')||'',
  })));
  assert.equal(iconSnapshot.length,11);
  assert.ok(iconSnapshot.every(icon=>icon.lucide||icon.agentAsset||icon.personalAvatar),'Every navigation entry retains its current icon implementation');
  const myAiIcon=iconSnapshot.find(icon=>icon.id==='my-ai');
  assert.match(myAiIcon.lucide,/lucide-boxes/, '我的 Agent 使用 Lucide Boxes 图标');
  assert.equal(myAiIcon.agentAsset,'');
  for(const section of sections){
    // 分组标题字号取 12/16（GDS caption / EvaMate Caption），2026-09-15 用户裁决从 13/20 下调。
    assert.equal(section.titleFont,'12px');
    assert.equal(section.titleLine,'16px');
    assert.equal(section.titleWeight,'400');
    if(section.index>0){assert.equal(section.marginTop,'14px');assert.equal(section.paddingTop,'0px');assert.equal(section.borderTop,'0px');}
    for(const entry of section.entries){assert.equal(entry.height,38);assert.equal(entry.font,'15px');assert.equal(entry.line,'22px');assert.equal(entry.weight,entry.selected?'500':'400');assert.equal(entry.radius,'8px');}
  }
  const navigationSurface=await page.locator('.layout-sider').evaluate(element=>getComputedStyle(element).backgroundColor);
  assert.equal(navigationSurface,'rgb(245, 246, 248)');
  const selected=page.locator('[data-eva-nav-id="new-chat"] .eva-personal-entry');
  const selectedColors=await selected.evaluate(element=>{const style=getComputedStyle(element),label=getComputedStyle(element.querySelector('.eva-personal-entry__label'));return {background:style.backgroundColor,color:label.color,weight:label.fontWeight};});
  assert.equal(selectedColors.background,'rgb(235, 243, 255)','选中表面取 EvaMate 0.3.0 surface/selected = blue/50 (#EBF3FF)，2026-09-15 用户裁决');
  assert.equal(selectedColors.color,'rgb(21, 99, 235)');
  assert.equal(selectedColors.weight,'500');
  const target=page.locator('[data-eva-nav-id="workboard"] .box-border.cursor-pointer');
  await target.evaluate(element=>getComputedStyle(element).backgroundColor);
  await target.hover();
  await page.waitForTimeout(200);
  assert.equal(await target.evaluate(element=>getComputedStyle(element).backgroundColor),'rgba(0, 0, 0, 0.06)','Hover 是覆盖层而非永久表面：GDS 2.0 §13 与 EvaMate 0.3.0 DESIGN.md §71 一致，2026-09-15 用户授权改回公共 --eva-overlay-hover');
  await target.click();
  await page.waitForTimeout(300);
  const active=await target.evaluate(element=>{const style=getComputedStyle(element),label=getComputedStyle(element.querySelector('[class*="text-14px"]'));return {background:style.backgroundColor,color:label.color,weight:label.fontWeight};});
  assert.equal(active.background,'rgb(235, 243, 255)','选中表面取 EvaMate 0.3.0 surface/selected = blue/50 (#EBF3FF)');
  assert.equal(active.color,'rgb(21, 99, 235)');
  assert.equal(active.weight,'500');
});

test('Every three-column middle rail uses the confirmed shared surface',async()=>{
  await page.setViewportSize({width:1200,height:800});
  for(const [route,selector] of [['/guid','.eva-personal-sider-panel'],['/messages','.ch-list'],['/messages?evaIM=my-ai','.eva-ai-team__sidebar'],['/drive','.eva-drive__side']]){
    await page.goto(`${origin}/#${route}`);
    await page.locator(selector).first().waitFor({state:'visible'});
    assert.equal(await page.locator(selector).first().evaluate(element=>getComputedStyle(element).backgroundColor),'rgb(253, 253, 253)',`${route} middle rail`);
  }
});
