import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

test('说明列表在窄容器支持长文案、缺省描述和空列表',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'eva-info-list-'));
 for(const name of ['prototype','vendor'])fs.symlinkSync(path.resolve('dist',name),path.join(tmp,name),'dir');
 const css=fs.readFileSync('dist/index.html','utf8').match(/<link[^>]+stylesheet[^>]*>/g).join('\n');
 const result=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{InfoList}from'./prototype/063-info-list.jsx';import{ContentStack}from'./prototype/063-content-stack.jsx';
 const Icon=()=> <span>i</span>;
 createRoot(document.getElementById('app')).render(<><section style={{width:180}}><InfoList items={[{id:'short',icon:Icon,title:'只有标题'},{id:'long',icon:Icon,title:'需要换行的较长标题测试',description:'LongUnbrokenDescription'.repeat(10)},{id:'noicon',title:'没有图标',description:'完整说明'}]}/></section><aside><InfoList items={[]}/></aside><div id="stack"><ContentStack><ContentStack.Section><div>无说明内容</div></ContentStack.Section><ContentStack.Section description="说明"><div hidden>隐藏内容</div><div>可见内容</div></ContentStack.Section></ContentStack></div></>);`,loader:'jsx',resolveDir:process.cwd()},bundle:true,write:false,loader:{'.css':'empty'}});
 fs.writeFileSync(path.join(tmp,'app.js'),result.outputFiles[0].text);
 fs.writeFileSync(path.join(tmp,'index.html'),`${css}<div id="app"></div><script src="app.js"></script>`);
 const server=createServer(tmp);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'});
 try{
  const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator('.eva-info-list').waitFor();
  const metrics=await page.locator('section').evaluate(e=>{
   const rows=[...e.querySelectorAll('li')];
   return {count:rows.length,overflow:e.scrollWidth>e.clientWidth,emptyDescription:rows[0].querySelectorAll('.eva-info-list-description').length,
    topAligned:rows.every(row=>{const icon=row.querySelector('.eva-info-list-icon');return !icon || Math.abs(icon.getBoundingClientRect().top-row.querySelector('.eva-info-list-title').getBoundingClientRect().top)<1;}),
    iconGap:rows[0].querySelector('.eva-info-list-title').getBoundingClientRect().left-rows[0].querySelector('.eva-info-list-icon').getBoundingClientRect().right};
  });
  assert.deepEqual(metrics,{count:3,overflow:false,emptyDescription:0,topAligned:true,iconGap:12});
  assert.equal(await page.locator('aside').innerHTML(),'');
  const stackMetrics=await page.locator('#stack').evaluate(e=>{
   const sections=e.querySelectorAll('.eva-content-section'),visible=sections[1].lastElementChild,caption=sections[1].firstElementChild;
   return {missing:sections[0].querySelectorAll('.eva-content-section-description').length,
    noLeadingGap:sections[0].firstElementChild.getBoundingClientRect().top-sections[0].getBoundingClientRect().top,
    gap:visible.getBoundingClientRect().top-caption.getBoundingClientRect().bottom};
  });
  assert.deepEqual(stackMetrics,{missing:0,noLeadingGap:0,gap:12});
 }finally{await browser.close();await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true});}
});
