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
