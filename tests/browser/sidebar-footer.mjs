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
  const context=await browser.newContext({viewport:{width:1200,height:800}});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  page=await context.newPage();
});
after(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));});
async function verifyFooter(){
  const footer=page.locator('.eva-sider-footer');
  await footer.waitFor();
  assert.equal(await footer.count(),1);
  assert.equal(await footer.locator('button').count(),1,'The only footer action is settings');
  assert.equal(await footer.locator('a,[role="button"],[tabindex]').count(),0,'Identity has no interactive wrapper');
  assert.equal(await footer.locator('.eva-sider-account__name').innerText(),'王宜林');
  assert.equal(await footer.locator('img').getAttribute('src'),await page.evaluate(()=>window.EvaAvatar.personUri('u-wangyilin')));
  const geometry=await footer.evaluate(el=>{
    const box=el.getBoundingClientRect(),sider=el.closest('.layout-sider').getBoundingClientRect(),button=el.querySelector('button').getBoundingClientRect();
    return {left:box.left,right:box.right,bottom:box.bottom,siderLeft:sider.left,siderRight:sider.right,siderBottom:sider.bottom,buttonLeft:button.left,buttonRight:button.right,buttonBottom:button.bottom};
  });
  assert.ok(geometry.left>=geometry.siderLeft&&geometry.right<=geometry.siderRight);
  assert.ok(geometry.buttonLeft>=geometry.left&&geometry.buttonRight<=geometry.right&&geometry.buttonBottom<=geometry.bottom);
  assert.ok(Math.abs(geometry.bottom-geometry.siderBottom)<=10,'Footer remains at the bottom of navigation');
  const url=page.url();
  await footer.locator('img').click();
  await footer.locator('.eva-sider-account__name').click();
  assert.equal(page.url(),url);
  assert.equal(await page.locator('.semi-modal:visible').count(),0,'Identity clicks do not open anything');
  const settings=footer.getByRole('button',{name:'设置',exact:true});
  await settings.focus();await page.keyboard.press('Enter');
  await page.locator('.eva-settings-dialog .semi-modal:visible').waitFor();
  assert.equal(await page.locator('.app-titlebar:visible').count(),1);
  await page.keyboard.press('Escape');
  await page.locator('.eva-settings-dialog .semi-modal:visible').waitFor({state:'hidden'});
}
test('Shared footer is passive identity plus one functioning settings button, expanded and collapsed',async()=>{
  await page.goto(`${origin}/#/guid`);
  for(const width of [1200,1000]){
    await page.setViewportSize({width,height:800});
    await verifyFooter();
    await page.getByRole('button',{name:'收起',exact:true}).click();
    await page.locator('.eva-sider-footer.is-collapsed').waitFor();
    await verifyFooter();
    await page.locator('.app-titlebar button').first().click();
    await page.locator('.eva-sider-footer:not(.is-collapsed)').waitFor();
  }
  for(const route of ['/messages','/contacts','/guid']){
    await page.goto(`${origin}/#${route}`);
    await verifyFooter();
  }
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
    agentAsset:entry.querySelector('.eva-my-ai-collaboration-icon')?.getAttribute('src')||'',
    personalAvatar:entry.querySelector('.eva-personal-entry__logo img')?.getAttribute('src')||'',
  })));
  assert.equal(iconSnapshot.length,11);
  assert.ok(iconSnapshot.every(icon=>icon.lucide||icon.agentAsset||icon.personalAvatar),'Every navigation entry retains its current icon implementation');
  assert.equal(iconSnapshot.find(icon=>icon.id==='my-ai').agentAsset,'prototype/assets/my-ai-collaboration.svg');
  for(const section of sections){
    assert.equal(section.titleFont,'13px');
    assert.equal(section.titleLine,'20px');
    assert.equal(section.titleWeight,'400');
    if(section.index>0){assert.equal(section.marginTop,'14px');assert.equal(section.paddingTop,'0px');assert.equal(section.borderTop,'0px');}
    for(const entry of section.entries){assert.equal(entry.height,38);assert.equal(entry.font,'15px');assert.equal(entry.line,'22px');assert.equal(entry.weight,entry.selected?'500':'400');assert.equal(entry.radius,'8px');}
  }
  const navigationSurface=await page.locator('.layout-sider').evaluate(element=>getComputedStyle(element).backgroundImage);
  assert.match(navigationSurface,/linear-gradient\(212\.729deg, rgb\(245, 247, 251\) 19\.562%, rgb\(250, 250, 251\) 59\.04%, rgb\(251, 250, 250\) 94\.383%\)/);
  const selected=page.locator('[data-eva-nav-id="new-chat"] .eva-personal-entry');
  const selectedColors=await selected.evaluate(element=>{const style=getComputedStyle(element),label=getComputedStyle(element.querySelector('.eva-personal-entry__label'));return {background:style.backgroundColor,color:label.color,weight:label.fontWeight};});
  assert.equal(selectedColors.background,'rgb(220, 233, 255)');
  assert.equal(selectedColors.color,'rgb(21, 99, 235)');
  assert.equal(selectedColors.weight,'500');
  const target=page.locator('[data-eva-nav-id="workboard"] .box-border.cursor-pointer');
  const idle=await target.evaluate(element=>getComputedStyle(element).backgroundColor);
  await target.hover();
  await page.waitForTimeout(200);
  assert.equal(await target.evaluate(element=>getComputedStyle(element).backgroundColor),'rgb(237, 243, 255)','Hover feedback keeps the user-confirmed blue tint');
  await target.click();
  await page.waitForTimeout(300);
  const active=await target.evaluate(element=>{const style=getComputedStyle(element),label=getComputedStyle(element.querySelector('[class*="text-14px"]'));return {background:style.backgroundColor,color:label.color,weight:label.fontWeight};});
  assert.equal(active.background,'rgb(220, 233, 255)');
  assert.equal(active.color,'rgb(21, 99, 235)');
  assert.equal(active.weight,'500');
});
