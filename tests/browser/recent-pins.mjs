import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('recent pins precede newer conversations; threads use their own preference',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:800}});
  await page.goto(`http://127.0.0.1:${server.address().port}/#/messages`);
  await page.locator('.eva-follow-category').first().waitFor();
  await page.getByRole('button',{name:'最近',exact:true}).click();
  const names=()=>page.locator('.wk-conversationlist-item h3').allTextContents();
  assert.deepEqual((await names()).slice(0,3),['近期体验反馈整理','采购与招投标','本季度间接采购需求']);
  assert.equal(await page.locator('.eva-recent-conversation-pinned').count(),3,'all pinned conversations get a background');
  await page.locator('.wk-conversationlist-item').filter({has:page.getByRole('heading',{name:'EVA + OCTO 融合推进群',exact:true})}).click();
  await page.mouse.move(1190,790);
  await page.waitForFunction(()=>{const rows=[...document.querySelectorAll('.eva-recent-conversation-pinned')];return rows.length===3&&/^(rgb|color)\(/.test(getComputedStyle(rows[0],'::before').backgroundColor);});
  const shade=await page.evaluate(()=>{const row=document.querySelector('.eva-recent-conversation-pinned');
   // color-mix 的计算值在部分引擎输出为 color(srgb 0..1)，需归一到 0..255 再比较。
   const chan=s=>{const n=s.match(/[\d.]+/g).slice(0,3).map(Number);return s.startsWith('color(')?n.map(v=>v*255):n;};
   const hex=h=>{h=h.trim().replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16));};
   return {band:chan(getComputedStyle(row,'::before').backgroundColor),hover:hex(getComputedStyle(document.body).getPropertyValue('--eva-conversation-row-hover'))};});
  // 通栏底 = 未置顶 hover 的半强度：每个通道都严格介于白底与 hover 之间。
  assert.ok(shade.band.every((v,i)=>v>shade.hover[i]&&v<255),`band shade sits between white and the row hover: ${JSON.stringify(shade)}`);
  const zone=await page.evaluate(()=>[...document.querySelectorAll('.eva-recent-conversation-pinned')].map(n=>{const s=getComputedStyle(n),b=getComputedStyle(n,'::before');return {radius:s.borderRadius,rowBg:s.backgroundColor,left:b.left,right:b.right};}));
  assert.ok(zone.every(z=>z.radius==='8px'),`pinned rows keep their rounded-rect container: ${JSON.stringify(zone)}`);
  const alpha=bg=>{const m=/^rgba?\(([^)]+)\)/.exec(bg);if(!m)return 1;const p=m[1].split(',').map(Number);return p.length>3?p[3]:1;};
  assert.ok(zone.every(z=>alpha(z.rowBg)<1),`pinned rows never paint an opaque background, so the band shows through: ${JSON.stringify(zone)}`);
  assert.ok(zone.every(z=>z.left==='-10px'&&z.right==='-10px'),`band bleeds past the 10px rail padding to both edges: ${JSON.stringify(zone)}`);
  await page.evaluate(()=>{const s=window.__evaGetFileContext().store;s.setChatPreferences('th-msg-architecture',s.snapshot().actorId,{top:false});});
  await page.waitForFunction(()=>document.querySelectorAll('.wk-conversationlist-item h3')[2]?.textContent==='EVA + OCTO 融合推进群');
  assert.deepEqual((await names()).slice(0,3),['近期体验反馈整理','采购与招投标','EVA + OCTO 融合推进群']);
  await page.reload();await page.locator('.eva-follow-category').first().waitFor();
  assert.equal(await page.locator('.eva-recent-conversation-pinned').count(),0,'follow does not gain recent styling');
  await page.getByRole('button',{name:'最近',exact:true}).click();
  assert.deepEqual((await names()).slice(0,3),['近期体验反馈整理','采购与招投标','EVA + OCTO 融合推进群']);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
