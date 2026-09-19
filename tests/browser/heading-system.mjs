import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from '../../tools/serve.mjs';
import { fileURLToPath } from 'node:url';

let server, browser, page, origin;
before(async () => {
  server = createServer(fileURLToPath(new URL('../../dist', import.meta.url)));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch(process.platform === 'darwin' ? { channel: 'msedge' } : {});
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  // These are local UI tests: never contact the shared review service or external accounts.
  await context.route('**/*', route => new URL(route.request().url()).origin === origin
    ? route.continue() : route.abort());
  page = await context.newPage();
});
after(async () => {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
});
async function open(route, selector) {
  await page.goto(`${origin}/#${route}`);
  const field = page.locator(selector).first();
  await field.waitFor({ state: 'visible' });
  return field;
}

// Every route uses this same contract; page-specific expected values are forbidden.
const HEADER_STANDARD = Object.freeze({font:'16px',line:'24px',weight:'500',height:48,left:'16px',right:'16px',decorations:0});
async function verifyHeaderAppearance(head, title, label) {
  const actual = await head.evaluate((el, selector) => {
    const t=el.querySelector(selector), s=getComputedStyle(t), h=getComputedStyle(el);
    return {font:s.fontSize,line:s.lineHeight,weight:s.fontWeight,
      height:el.getBoundingClientRect().height,left:h.paddingLeft,right:h.paddingRight,
      decorations:[...el.querySelectorAll('svg')].filter(i=>!i.closest('button,label,.eva-contacts__search,.eva-digital-center__market-search')).length};
  }, title);
  assert.deepEqual(actual, HEADER_STANDARD, label);
}
async function verifyHeader(head, title, label) {
  await verifyHeaderAppearance(head, title, label);
  const position=await head.evaluate((el, selector)=>{
    const r=el.getBoundingClientRect(), t=el.querySelector(selector).getBoundingClientRect();
    return {top:r.top,titlebarBottom:document.querySelector('.app-titlebar').getBoundingClientRect().bottom,
      textInset:t.left-r.left,centerOffset:(t.top+t.height/2)-(r.top+r.height/2)};
  }, title);
  assert.ok(Math.abs(position.top-position.titlebarBottom)<=1,`${label}: 一级标题必须紧接系统标题栏`);
  assert.ok(Math.abs(position.textInset-16)<=1,`${label}: 标题文字必须从左侧 16px 起始`);
  assert.ok(Math.abs(position.centerOffset)<=1,`${label}: 标题文字必须垂直居中`);
}

for (const width of [1200, 1000]) {
  test(`一级功能标题在 ${width}px 下遵循统一合同`, async () => {
    await page.setViewportSize({width, height:900});
    for (const [route, header, title] of [
      ['/guid','.eva-rail-header','.eva-personal-rail-title'],
      ['/messages?evaIM=my-ai','.eva-rail-header','h1'],
      ['/messages','.eva-rail-header','h1'],
      ['/drive','.eva-drive__side-head','strong'],
      ['/drive','.eva-drive__header','strong'],
      ['/contacts','.eva-contacts__main-head','.eva-contacts__title strong'],
      ['/eva-stub/工作板','.eva-feature-head','h1'],
      ['/eva-stub/技能','.eva-connection-center__head','h1'],
      ['/collab','.eva-page-header','h1'],
      ['/eva-stub/站点','.eva-page-header','h1'],
      ['/scheduled','.eva-page-header','h1'],
      ['/eva-stub/数字员工','.eva-digital-center__head','h1'],
    ]) {
      const head = await open(route, header);
      await verifyHeader(head, title, route);
      if(header==='.eva-rail-header') {
        const button=head.locator('button').first();
        assert.equal((await button.boundingBox()).width,32);
        assert.equal(await button.locator('svg').evaluate(e=>e.getBoundingClientRect().width),16);
        await button.click();
        await page.keyboard.press('Escape');
      }
    }
    await page.locator('[data-eva-nav-id="projects"]').click();
    await page.getByRole('button',{name:'供应链运营协同 协同推进间接采购、供应商质量与合规风控工作',exact:true}).click();
    await page.getByRole('tab',{name:/群聊/}).click();
    const head=page.locator('.eva-rail-header:visible');
    await head.waitFor();
    assert.equal(await head.locator('h1').innerText(),'群聊');
    assert.equal(await head.locator('input').count(),0);
    await verifyHeaderAppearance(head, 'h1', '项目内群聊分区');
    const plus=head.locator('button').first();
    assert.equal((await plus.boundingBox()).width,32);
    await plus.click();
    await page.keyboard.press('Escape');
  });
}


test('标题门禁拒绝高度、字号和位置偏差，恢复后通过', async () => {
  const head=await open('/messages','.eva-rail-header');
  const title=head.locator('h1');
  const headStyle=await head.getAttribute('style');
  const titleStyle=await title.getAttribute('style');
  for(const [label,target,css] of [
    ['42px 高度',head,'height:42px!important;min-height:42px!important;max-height:42px!important'],
    ['20px 字号',title,'font-size:20px!important'],
    ['下移 16px',head,'margin-top:16px!important'],
  ]) {
    await target.evaluate((el,css)=>el.style.cssText+=';'+css,css);
    await assert.rejects(()=>verifyHeader(head,'h1',label),{name:'AssertionError'},`${label} 必须被门禁拒绝`);
    await head.evaluate((el,style)=>style===null?el.removeAttribute('style'):el.setAttribute('style',style),headStyle);
    await title.evaluate((el,style)=>style===null?el.removeAttribute('style'):el.setAttribute('style',style),titleStyle);
    await verifyHeader(head,'h1',`恢复 ${label}`);
  }
});

test('个人首页保留已确认的居中头像标题、输入器及下方快捷能力',async()=>{
  const samples=[];
  for(const [width,height] of [[900,600],[1200,800],[1920,1080]]) {
    await page.setViewportSize({width,height});
    await open('/guid','.eva-personal-workspace__welcome');
    const geometry=await page.evaluate(()=>{
      const root=document.querySelector('.eva-personal-workspace'),title=root.querySelector('.eva-personal-workspace__welcome'),avatar=root.querySelector('.eva-personal-workspace__welcome-avatar'),column=root.querySelector('.eva-personal-workspace__column');
      const r=el=>el.getBoundingClientRect().toJSON();
      return {scale:Number(getComputedStyle(column).zoom),title:r(title),avatar:r(avatar),column:r(column),composer:r(root.querySelector('.eva-personal-workspace__composer')),rail:r(root.querySelector('.eva-personal-workspace__rail')),bubble:getComputedStyle(avatar,'::before').content};
    });
    assert.ok(Math.abs(geometry.title.x+geometry.title.width/2-geometry.column.x-geometry.column.width/2)<1,'欢迎语居中');
    assert.ok(Math.abs(geometry.avatar.width/geometry.scale-36)<0.1);assert.ok(Math.abs(geometry.avatar.height/geometry.scale-36)<0.1);
    assert.ok(geometry.column.right<=width&&geometry.column.x>=0);
    samples.push(geometry);
    assert.ok(geometry.avatar.x>geometry.title.x&&geometry.avatar.right<geometry.title.right,'头像位于两段欢迎语之间');
    assert.ok(geometry.composer.y>=geometry.title.bottom);
    assert.ok(geometry.rail.y>=geometry.composer.bottom,'快捷能力在输入器之后');
    assert.equal(geometry.bubble,'none','禁止恢复 Hi 气泡');
    const input=page.locator('.eva-composer-prompt');
    await input.fill('保留中文输入与编辑');await input.press('Backspace');
    assert.equal(await input.inputValue(),'保留中文输入与编');
    await input.fill('');
  }
  assert.ok(samples[0].avatar.width<samples[1].avatar.width&&samples[1].avatar.width<samples[2].avatar.width,'整组随可用空间放大');
  assert.ok(samples[0].composer.height<samples[1].composer.height&&samples[1].composer.height<samples[2].composer.height,'输入器随整组缩放');
});

 test('相邻标题栏底边严格对齐，包含边框且拒绝1px偏差', async()=>{
  for(const width of [1200,1000]){
   await page.setViewportSize({width,height:800});
   for(const [route,left,right] of [['/messages','.eva-rail-header','.ch-head'],['/messages?evaIM=my-ai','.eva-rail-header','.ch-head'],['/drive','.eva-drive__side-head','.eva-drive__header']]){
    await open(route,right);
    const measure=async()=>page.evaluate(({left,right})=>{
     const a=document.querySelector(left).getBoundingClientRect(),b=document.querySelector(right).getBoundingClientRect();
     return {top:a.top-b.top,bottom:a.bottom-b.bottom,leftHeight:a.height,rightHeight:b.height};
    },{left,right});
    const expected={top:0,bottom:0,leftHeight:48,rightHeight:48};
    assert.deepEqual(await measure(),expected,route);
    if(right==='.ch-head'){
     await page.locator(right).evaluate(e=>e.style.boxSizing='content-box');
     assert.notDeepEqual(await measure(),expected,'1px边框偏差必须被识别');
     await page.locator(right).evaluate(e=>e.style.removeProperty('box-sizing'));
     assert.deepEqual(await measure(),expected);
    }
   }
  }
 });

 test('会话顶部操作区所有元素垂直居中，含项目跳转按钮与分割线', async()=>{
  await page.setViewportSize({width:1200,height:800});
  await page.goto(`${origin}/#/messages`);
  await page.locator('.ch-list').getByText('合规与合同',{exact:true}).click();
  const ops=page.locator('.ch-head .ops');
  await ops.waitFor();
  await page.locator('.ch-head .eva-chat-project-jump').waitFor();
  await page.locator('.ch-head .eva-chat-head-divider').waitFor();
  const geometry=await ops.evaluate(el=>{
   const center=node=>{const r=node.getBoundingClientRect();return r.top+r.height/2;};
   const head=el.closest('.ch-head').getBoundingClientRect(), row=el.getBoundingClientRect();
   return {rowCenter:row.top+row.height/2,headCenter:head.top+head.height/2,
     children:[...el.children].map(node=>({cls:String(node.className),center:center(node)}))};
  });
  assert.ok(geometry.children.length>=3,'顶部操作区应至少包含搜索、任务与更多');
  assert.ok(geometry.children.some(child=>child.cls.includes('eva-chat-project-jump')),'项目会话应渲染项目跳转按钮');
  assert.ok(geometry.children.some(child=>child.cls.includes('eva-chat-head-divider')),'项目会话应渲染分割线');
  for(const child of geometry.children){
   assert.ok(Math.abs(child.center-geometry.rowCenter)<=1,`顶部操作区元素必须整排垂直居中: ${child.cls} @ ${child.center}`);
  }
  assert.ok(Math.abs(geometry.rowCenter-geometry.headCenter)<=1,'顶部操作区必须在标题栏内垂直居中');
 });
