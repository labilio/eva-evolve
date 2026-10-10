import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

// 资料卡版式合同：整卡统一「固定标签列 + 左对齐值列」。
// 人卡「部门」按企业微信名片的信息层级（末级大字、上层链路小字）；AI 卡「所属人／免 @ 回答」
// 与它共用同一条标签列和值列，只有 Switch / chevron 这类控件留在行最右。
// 几何一律用 offset* 读取：弹窗入场是 scale 动画，getBoundingClientRect 在动画期间会被缩放影响。
const metrics=row=>row.evaluate(el=>{
  const at=sel=>{const node=el.querySelector(sel);return node?node.offsetLeft:null;};
  return {h:el.offsetHeight,labelX:at('.eva-person-card__row-label'),valueX:at('.eva-person-card__row-value')};
});
const left=locator=>locator.evaluate(el=>el.offsetLeft);
const style=locator=>locator.evaluate(el=>{const s=getComputedStyle(el);return {size:s.fontSize,weight:s.fontWeight,color:s.color};});

test('资料卡标签列与值列左对齐，部门末级大字、上层链路小字',async()=>{
  const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  const pageErrors=[];
  try{
    const page=await browser.newPage({viewport:{width:1200,height:800}});
    page.setDefaultTimeout(15000);
    page.on('pageerror',error=>pageErrors.push(String(error)));
    const card=page.locator('.eva-person-card');
    // 弹窗入场是 scale 动画：等模态几何连续两帧不变后再测量，避免缩放把像素比较带偏。
    const settle=async()=>{
      let prev=null;
      for(let i=0;i<25;i++){
        const box=await page.locator('.eva-person-card-popover').evaluate(el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(v=>Math.round(v*100)).join(',');});
        if(box===prev)return;
        prev=box;
        await page.waitForTimeout(80);
      }
    };
    const open=async name=>{await page.locator(`button[aria-label="查看 ${name} 的资料"]`).first().click();await card.waitFor();await settle();};
    const close=async()=>{await page.keyboard.press('Escape');await card.waitFor({state:'detached'});};

    await page.goto(origin+'/#/contacts');

    // 人卡：部门 = 末级大字 + 上层链路小字，两行共用值列左边缘。
    await open('王宜林');
    assert.equal(await card.locator('.eva-person-card__type').innerText(),'联系人');
    const org=card.locator('.eva-person-card__row--org');
    await org.waitFor();
    const orgBox=await metrics(org);
    const leaf=org.locator('.eva-person-card__org-leaf');
    const path=org.locator('.eva-person-card__org-path');
    assert.equal(await org.locator('.eva-person-card__row-label').innerText(),'职务');
    assert.equal(await leaf.innerText(),'人工智能产品总监');
    assert.equal(await path.innerText(),'吉利汽车集团/数智化中心/人工智能平台部');
    const leafStyle=await style(leaf),pathStyle=await style(path);
    assert.ok(parseFloat(leafStyle.size)>parseFloat(pathStyle.size),'末级组织字号应大于上层链路');
    assert.ok(Number(leafStyle.weight)>Number(pathStyle.weight),'末级组织字重应大于上层链路');
    assert.ok(leafStyle.color!==pathStyle.color,'副值应比主值低一档色');
    // 第一行锚定：部门标签与末级落在同一条文字中心线上（对齐锚点是第一行，不是整块居中）。
    const centers=await org.evaluate(el=>{
      const at=sel=>{const r=el.querySelector(sel).getBoundingClientRect();return r.top+r.height/2;};
      return {label:at('.eva-person-card__row-label'),leaf:at('.eva-person-card__org-leaf')};
    });
    assert.ok(Math.abs(centers.label-centers.leaf)<=1,'部门标签与末级第一行同中心线');
    // 两行块不压回 52：行随内容增高，副行与胶囊底边留出呼吸空间，不再贴边。
    assert.ok(orgBox.h>=60,'部门行随两行内容增高');
    const bottomGap=await org.evaluate(el=>{const r=el.getBoundingClientRect();const p=el.querySelector('.eva-person-card__org-path').getBoundingClientRect();return +(r.bottom-p.bottom).toFixed(1);});
    assert.ok(bottomGap>=8,'副行与胶囊底边留出呼吸空间');
    // 值列左起：末级与上层链路同一条左边缘，且都从标签列之后起排。
    assert.equal(await left(leaf),orgBox.valueX,'末级在值列左边缘');
    assert.equal(await left(path),orgBox.valueX,'上层链路与末级同左边缘');
    assert.equal(await path.evaluate(el=>getComputedStyle(el).textAlign),'left','多行链路保持左对齐');
    assert.ok(orgBox.valueX>orgBox.labelX,'值与标签分列，不再是一左一右两端');
    await close();

    // AI 卡：所属人与免 @ 回答必须落在同一条标签列/值列上，控件仍在最右。
    await open('王宜林的 AI 分身');
    assert.equal(await card.locator('.eva-person-card__type').innerText(),'云端分身');
    assert.equal(await card.locator('.eva-person-card__row--org').count(),0,'AI 卡不带部门');
    const ownerRow=card.locator('.eva-person-card__row').filter({hasText:'所属人'});
    const mentionRow=card.locator('button.eva-person-card__row--button');
    const ownerBox=await metrics(ownerRow),mentionBox=await metrics(mentionRow);
    assert.equal(ownerBox.labelX,orgBox.labelX,'所属人的标签与人卡共用标签列');
    assert.equal(ownerBox.valueX,orgBox.valueX,'所属人的值与人卡共用值列');
    assert.equal(mentionBox.labelX,orgBox.labelX,'免 @ 回答的标签与人卡共用标签列');
    assert.equal(mentionBox.valueX,orgBox.valueX,'免 @ 回答的说明在人卡值列位置');
    // 主值比标签加重一档；标签不再与主值同色。
    const labelStyle=await style(ownerRow.locator('.eva-person-card__row-label'));
    const valueStyle=await style(ownerRow.locator('.eva-person-card__row-value'));
    assert.ok(Number(valueStyle.weight)>Number(labelStyle.weight),'主值字重应高于标签');
    assert.ok(valueStyle.color!==labelStyle.color,'标签应比主值低一档色');
    // chevron 是控件，仍在行最右（左对齐说的是值列）。
    // 同一帧内同时取行与 chevron：入场 scale 对两者等比，差值不受动画影响。
    const chevronGap=await mentionRow.evaluate(el=>{
      const chevron=el.querySelector('.eva-person-card__row-chevron');
      const rowInnerRight=el.getBoundingClientRect().right-parseFloat(getComputedStyle(el).paddingRight);
      return Math.round(rowInnerRight-chevron.getBoundingClientRect().right);
    });
    assert.ok(Math.abs(chevronGap)<=1,'chevron 仍贴行右内边距');
    await close();

    assert.deepEqual(pageErrors,[],'页面不应出现未捕获 JavaScript 错误');
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
