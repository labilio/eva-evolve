import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from '../../tools/serve.mjs';
import { fileURLToPath } from 'node:url';

let server,browser,context,page,origin;
const TABS=[['general','通用'],['appearance','外观'],['engine','助理引擎'],['im','IM 机器人'],['browser','浏览器'],['mail','邮箱'],['memory','记忆'],['shortcuts','快捷键'],['usage','用量看板'],['about','关于']];

before(async()=>{
  server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  origin=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  context=await browser.newContext({viewport:{width:1280,height:860},locale:'zh-CN'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  page=await context.newPage();
});
after(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));});

async function openSettings(theme){
  // 关闭后 Semi 仍保留 .semi-modal-wrap 挂在 portal 上并吃掉点击，
  // 每个场景强制 reload 复位，避免跨用例互相拦截。
  await page.goto(`${origin}/#/guid`);
  await page.reload();
  await page.locator('.eva-sider-account').waitFor();
  await page.evaluate(t=>window.EvaTheme.apply(t),theme);
  await page.locator('.eva-sider-account').click();
  await page.locator('.eva-account-menu__item:visible',{hasText:'设置'}).click();
  await page.locator('.eva-settings-dialog .semi-modal:visible').waitFor();
  await page.waitForTimeout(150);
}

// 解析后的实际渲染色必须来自主题令牌，不能是 legacy 硬编码的纯白。
const WHITE=new Set(['rgb(255, 255, 255)','rgba(255, 255, 255, 1)','#fff','#ffffff']);

// GDS typography.style.header：面板级标题的唯一档位（16 之上只有 heroTitle 32/40/600）。
const HEADER_TYPE=Object.freeze({fontSize:'16px',lineHeight:'24px',fontWeight:'500'});
// GDS typography.style.label：导航/列表用 14/22/400（labelMedium 500 是给 CTA/强调标签的）。
const LABEL_TYPE=Object.freeze({fontSize:'14px',lineHeight:'22px',fontWeight:'400'});

test('Settings shell: side column spans full height, titlebar sits only above the right column',async()=>{
  await openSettings('light');
  await page.locator('.eva-settings-dialog__content .eva-set-card').first().waitFor();
  const geo=await page.evaluate(()=>{
    const box=el=>{const r=el.getBoundingClientRect();return {t:+r.top.toFixed(1),b:+r.bottom.toFixed(1),l:+r.left.toFixed(1),r:+r.right.toFixed(1)};};
    const type=el=>{const s=getComputedStyle(el);return {fontSize:s.fontSize,lineHeight:s.lineHeight,fontWeight:s.fontWeight};};
    const content=document.querySelector('.eva-settings-dialog .semi-modal-content');
    const side=document.querySelector('.eva-settings-dialog__side');
    const nav=document.querySelector('.eva-settings-dialog__side>nav');
    const brand=document.querySelector('.eva-settings-dialog__brand');
    const bar=document.querySelector('.eva-settings-dialog__titlebar');
    const title=document.querySelector('.eva-settings-dialog__title');
    const main=document.querySelector('.eva-settings-dialog__main');
    const navIcon=nav.querySelector('.semi-button svg');
    const navLabel=nav.querySelector('.semi-button .semi-button-content');
    // 标题的 padding 会让元素盒左缘 ≠ 文字左缘，用 Range 量真实的字形起点。
    const textBox=el=>{const r=document.createRange();r.selectNodeContents(el);return box(r);};
    return {content:box(content),side:box(side),nav:box(nav),brand:box(brand),bar:box(bar),main:box(main),
      navIcon:box(navIcon),brandText:textBox(brand),title:box(title),card:box(document.querySelector('.eva-set-card')),
      brandType:type(brand),titleType:type(title),navLabelType:type(navLabel),brandText_:brand.textContent.trim(),
      sideWidth:side.getBoundingClientRect().width,
      barBorderBottom:getComputedStyle(bar).borderBottomWidth,
      brandBorderBottom:getComputedStyle(brand).borderBottomWidth,
      sideBorderRight:getComputedStyle(side).borderRightWidth,
      header:document.querySelectorAll('.eva-settings-dialog .semi-modal-header').length};
  });
  assert.equal(geo.header,0,'Semi 自带头部已被 header:null 抑制');
  // 弹窗用 translate(-50%,-50%) 定位，量出来会带亚像素，故给 0.5px 容差。
  assert.ok(Math.abs(geo.sideWidth-220)<=0.5,`左栏宽度 220px (实测 ${geo.sideWidth})`);
  assert.ok(Math.abs(geo.side.t-geo.content.t)<=1,`左栏顶边贴模态顶边 (${geo.side.t} vs ${geo.content.t})`);
  assert.ok(Math.abs(geo.side.b-geo.content.b)<=1,`左栏底边贴模态底边 (${geo.side.b} vs ${geo.content.b})`);
  assert.ok(geo.bar.l>=geo.side.r-1,`标题栏只盖右栏，不跨左栏 (bar.left ${geo.bar.l} vs side.right ${geo.side.r})`);
  assert.ok(Math.abs(geo.bar.t-geo.main.t)<=1,'标题栏位于右栏顶部');
  assert.equal(geo.barBorderBottom,'0px','标题栏无下分割线');
  assert.equal(geo.sideBorderRight,'1px','两栏之间保留 1px 分割线');
  // 「设置」大标题：与右栏页标题同档、同高、同基线；自身不再引入第二条横线。
  assert.equal(geo.brandText_,'设置','左栏顶部是「设置」大标题');
  assert.deepEqual(geo.brandType,HEADER_TYPE,'「设置」走 GDS header 档 16/24/500');
  assert.deepEqual(geo.titleType,HEADER_TYPE,'右栏页标题同档，两者成对');
  assert.deepEqual(geo.navLabelType,LABEL_TYPE,'左栏菜单项走 GDS label 档 14/22/400（导航不用 labelMedium）');
  assert.equal(geo.brandBorderBottom,'0px','左栏标题下无分割线');
  assert.ok(Math.abs(geo.brand.b-geo.bar.b)<=1,`两个标题行等高收边 (${geo.brand.b} vs ${geo.bar.b})`);
  // 菜单在标题之下独立滚动，不会把标题一起滚走。
  assert.ok(geo.nav.t>=geo.brand.b-1,'菜单位于标题之下');
  assert.ok(Math.abs(geo.nav.b-geo.side.b)<=13,'菜单滚动区延伸到左栏底部');
  // 左轴：「设置」文字与菜单图标列同轴；右栏标题与卡片左缘同轴。
  assert.ok(Math.abs(geo.brandText.l-geo.navIcon.l)<=1,`「设置」与菜单图标列同轴 (${geo.brandText.l} vs ${geo.navIcon.l})`);
  assert.ok(Math.abs(geo.title.l-geo.card.l)<=1,`右栏标题与卡片左缘同轴 (${geo.title.l} vs ${geo.card.l})`);
});

test('Settings shell: mask covers the whole window and blocks click-through to the titlebar',async()=>{
  await openSettings('light');
  await page.locator('.eva-settings-dialog .semi-modal:visible').waitFor();
  const before=await page.evaluate(()=>{
    const mask=document.querySelector('.eva-settings-portal .semi-modal-mask');
    const r=mask.getBoundingClientRect();
    const btn=document.querySelector('.app-titlebar__button');
    const br=btn.getBoundingClientRect();
    return {mask:{t:r.top,l:r.left,b:r.bottom,r:r.right},win:{w:innerWidth,h:innerHeight},
      btnPoint:{x:br.x+br.width/2,y:br.y+br.height/2},siderW:document.querySelector('.layout-sider').getBoundingClientRect().width};
  });
  // 蒙层必须顶到窗口最上缘（把顶栏一起盖住），不能再从 --topbar-height 往下起。
  assert.equal(before.mask.t,0,'蒙层顶边贴窗口顶边，盖住顶栏');
  assert.equal(before.mask.l,0);
  assert.ok(Math.abs(before.mask.b-before.win.h)<=1,'蒙层底边贴窗口底边');
  assert.ok(Math.abs(before.mask.r-before.win.w)<=1,'蒙层右边贴窗口右边');
  // 命中测试：顶栏收起按钮原坐标现在应落在蒙层/弹窗上，不再是顶栏按钮本身。
  const hit=await page.evaluate(({x,y})=>{const el=document.elementFromPoint(x,y);return {tag:el.tagName,inTitlebar:!!el.closest('.app-titlebar')};},before.btnPoint);
  assert.equal(hit.inTitlebar,false,'顶栏按钮被蒙层挡住，命中测试不再落在顶栏上');
  // 真点一下同一坐标：侧栏不该被收起（说明点击没有穿透到顶栏），按浮层失焦规则设置弹窗应被收起。
  await page.mouse.click(before.btnPoint.x,before.btnPoint.y);
  await page.waitForTimeout(300);
  const siderWAfter=await page.evaluate(()=>document.querySelector('.layout-sider').getBoundingClientRect().width);
  assert.equal(siderWAfter,before.siderW,'点击未穿透蒙层改变顶栏/侧栏状态');
  assert.equal(await page.locator('.eva-settings-dialog .semi-modal:visible').count(),0,'点击蒙层空白处收起设置弹窗，且点击未穿透顶栏');
});

test('Settings shell: titlebar shows the current page name and closes the dialog',async()=>{
  await openSettings('light');
  for(const [id,label] of TABS){
    await page.locator(`.eva-settings-dialog__side>nav .semi-button:has-text("${label}")`).first().click();
    await page.waitForTimeout(120);
    assert.equal((await page.locator('.eva-settings-dialog__title').innerText()).trim(),label,`${id} 的标题栏显示页名`);
    assert.equal(await page.locator('.eva-settings-dialog__content .eva-set h1:visible').count(),0,`${id} 页内标题不重复`);
  }
  // 用量看板的 heading 里 h2 与描述、筛选按钮同处一行，只收走 h2。
  await page.locator('.eva-settings-dialog__side>nav .semi-button:has-text("用量看板")').first().click();
  await page.locator('.eva-usage:visible').waitFor();
  assert.equal(await page.locator('.eva-usage__heading h2:visible').count(),0,'用量看板 h2 已收进标题栏');
  assert.ok(await page.locator('.eva-usage__heading p:visible').count()>0,'用量看板保留描述文案');
  assert.ok(await page.locator('.eva-usage__filters:visible').count()>0,'用量看板保留筛选按钮');
  assert.equal(await page.locator('#semi-modal-title').count(),1,'对话框可访问名仍可解析');
  await page.locator('.eva-settings-dialog__close').click();
  await page.locator('.eva-settings-dialog .semi-modal:visible').waitFor({state:'hidden'});
});

test('Settings shell: no hardcoded light surfaces leak through in dark mode',async()=>{
  for(const theme of ['light','dark']){
    await openSettings(theme);
    for(const [id,label] of TABS){
      await page.locator(`.eva-settings-dialog__side>nav .semi-button:has-text("${label}")`).first().click();
      await page.waitForTimeout(150);
      const probe=await page.evaluate(()=>{
        const bg=sel=>{const el=document.querySelector(sel);return el?getComputedStyle(el).backgroundColor:null;};
        const set=document.querySelector('.eva-settings-dialog__content .eva-set');
        return {
          setBg:set?getComputedStyle(set).backgroundColor:null,
          mainBg:bg('.eva-settings-dialog__main'),
          navBg:bg('.eva-settings-dialog__side'),
          kbd:(()=>{const el=document.querySelector('.eva-set-kbd');return el?getComputedStyle(el).backgroundColor:null;})(),
          primary:(()=>{const el=document.querySelector('.eva-set-primary');return el?getComputedStyle(el).backgroundColor:null;})()
        };
      });
      if(probe.setBg) assert.equal(probe.setBg,'rgba(0, 0, 0, 0)',`[${theme}/${id}] .eva-set 不再自带白底`);
      if(theme==='dark'){
        assert.ok(!WHITE.has(probe.mainBg),`[dark/${id}] 右栏面色不是纯白 (${probe.mainBg})`);
        assert.ok(!WHITE.has(probe.navBg),`[dark/${id}] 左栏面色不是纯白 (${probe.navBg})`);
        if(probe.kbd) assert.ok(!WHITE.has(probe.kbd),`[dark/${id}] kbd 不是白块 (${probe.kbd})`);
      }
      // 保存按钮统一走品牌蓝，不再是 legacy 的 #6a5cff 紫。
      if(probe.primary) assert.ok(!/106, 92, 255/.test(probe.primary),`[${theme}/${id}] 主按钮已换掉遗留紫 (${probe.primary})`);
    }
    await page.keyboard.press('Escape');
  }
});
