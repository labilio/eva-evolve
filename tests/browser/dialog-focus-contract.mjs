import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

// Isolated test fixture mounts the real shared components; it is not a product
// demo or a second implementation. Removing shared focus policy must fail here.
test('公共焦点合同：静态内容、危险操作、嵌套弹窗与入口消失',async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'eva-dialog-contract-'));
 const code=`import React from 'react';import{createRoot}from'react-dom/client';import{Dialog,Actions}from'./prototype/063-dialog.jsx';
 function App(){const[kind,set]=React.useState(''),[child,setChild]=React.useState(false),[gone,remove]=React.useState(false);return <><button id="fallback">列表入口</button>{['text','danger','parent','removed'].map(k=>(k!=='removed'||!gone)&&<button id={k} onClick={()=>{set(k);if(k==='removed')remove(true)}}>{k}</button>)}{kind&&<Dialog visible title="测试弹窗" initialFocus={kind==='text'?'title':kind==='danger'?'cancel':'field'} returnFocus={()=>document.getElementById('fallback')} onCancel={()=>set('')} footer={<Actions onCancel={()=>set('')} submitLabel="确定"/>}>{kind==='text'?<><p>第一段</p><p>第二段</p></>:<><input type="hidden"/><button disabled>不可用</button><input aria-label="名称"/><button onClick={()=>setChild(true)}>打开子弹窗</button></>}{child&&<Dialog visible title="子弹窗" onCancel={()=>setChild(false)}><input aria-label="子名称"/></Dialog>}</Dialog>}</>};createRoot(document.getElementById('app')).render(<App/>);`;
 const bundle=await build({stdin:{contents:code,loader:'jsx',resolveDir:process.cwd()},bundle:true,write:false,format:'iife',loader:{'.css':'empty'}});
 fs.writeFileSync(path.join(tmp,'app.js'),bundle.outputFiles[0].text);fs.writeFileSync(path.join(tmp,'index.html'),'<div id="app"></div><script src="app.js"></script>');
 const server=createServer(tmp);await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage();page.setDefaultTimeout(2500);
 try{
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.locator('#text').click();
 assert.equal(await page.locator('.semi-modal-title').evaluate(el=>el===document.activeElement),true);
 await page.keyboard.press('Shift+Tab');assert.equal(await page.getByRole('dialog').evaluate(el=>el.contains(document.activeElement)),true,'静态标题反向 Tab 不可跳出弹窗');
 await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await page.locator('#text').evaluate(el=>el===document.activeElement),true);
 await page.locator('#danger').click();assert.equal(await page.locator('[data-eva-dialog-cancel]').evaluate(el=>el===document.activeElement),true);await page.keyboard.press('Escape');
 await page.locator('#parent').click();await page.getByRole('button',{name:'打开子弹窗'}).click();
 assert.equal(await page.getByRole('textbox',{name:'子名称'}).evaluate(el=>el===document.activeElement),true);
 const ids=await page.locator('.semi-modal-title').evaluateAll(els=>els.map(e=>e.id));assert.equal(new Set(ids).size,2);
 await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),1);assert.equal(await page.getByRole('button',{name:'打开子弹窗'}).evaluate(el=>el===document.activeElement),true);
 await page.keyboard.press('Escape');await page.locator('#removed').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#fallback').evaluate(el=>el===document.activeElement),true,'入口消失后返回逻辑入口');
 }finally{await browser.close();await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true});}
});
