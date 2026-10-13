import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

// Real task filter (Portal) and table controls, using the complete shipped CSS.
// Checking hover over both label and box catches invalid computed variables,
// which source-only assertions and click-only tests cannot detect.
test('共享 Checkbox：筛选与表格在亮暗主题下保留悬停边框和勾选填充',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{}),page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
 const state=box=>box.locator('.semi-checkbox-inner-display').evaluate(el=>{
  const s=getComputedStyle(el),probe=document.createElement('span');el.append(probe);
  const color=token=>{probe.style.color=`var(${token})`;return getComputedStyle(probe).color;};
  const result={shadow:s.boxShadow,bg:s.backgroundColor,icon:s.color,focus:color('--semi-color-focus-border'),hover:color('--semi-color-primary-hover')};probe.remove();return result;
 });
 const checkHover=async(box,selected,label)=>{
  for(const target of [box,box.locator('.semi-checkbox-inner')]){
   await target.hover();const s=await state(box);
   if(selected){assert.equal(s.bg,s.hover,`${label}：选中悬停保留主题填充`);assert.notEqual(s.icon,s.bg);}
   else{assert.match(s.shadow,/1px inset/,`${label}：未选中悬停保留边框`);assert.ok(s.shadow.includes(s.focus),`${label}：恢复 Semi 焦点边框色`);}
  }
 };
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=tasks`);
  for(const theme of ['light','dark']){
   await page.evaluate(t=>window.EvaTheme.apply(t),theme);
   await page.locator('.loop-toolbtn').filter({hasText:'筛选'}).click();
   const box=page.locator('.loop-filter-panel .semi-checkbox').filter({hasText:'我订阅的'});
   await checkHover(box,false,theme+'筛选');await box.click();await checkHover(box,true,theme+'筛选');
   await box.locator('input').focus();await page.keyboard.press('Space');assert.equal(await box.locator('input').isChecked(),false);
   await checkHover(box,false,theme+'键盘取消');
   await page.locator('.loop-filter-panel').screenshot({path:`/tmp/eva-checkbox-${theme}-after.png`});
   await page.keyboard.press('Escape');
   await page.getByRole('button',{name:/^任务视图：/}).click();await page.getByRole('menuitem',{name:'表格',exact:true}).click();
   const row=page.locator('.eva-task-table__td--select .semi-checkbox').first();
   await checkHover(row,false,theme+'表格');await row.click();await checkHover(row,true,theme+'表格');
   const all=page.locator('.eva-task-table__th--select .semi-checkbox');
   assert.match(await all.getAttribute('class'),/indeterminate/);await checkHover(all,true,theme+'半选');
   await row.click();await checkHover(all,false,theme+'全选框');
   await page.getByRole('button',{name:/^任务视图：/}).click();await page.getByRole('menuitem',{name:'看板',exact:true}).click();
  }
  // A second business surface uses the same Semi control inside a Modal.
  await page.goto(`http://127.0.0.1:${server.address().port}/?picker-preview=create#/collab?evaProject=prod&evaTab=settings`);
  const dialog=page.getByRole('dialog').filter({hasText:'新建群聊'});
  const member=dialog.locator('.eva-member-picker__candidate').first();
  const memberBox=member.locator('.semi-checkbox');
  // 本人分身现在默认选中；显式切到未选中，再验证两种完整状态。
  if(await memberBox.locator('input').isChecked())await member.click();
  for(const theme of ['light','dark']){
   await page.evaluate(t=>window.EvaTheme.apply(t),theme);
   await checkHover(memberBox,false,theme+'成员选择');await member.click();await checkHover(memberBox,true,theme+'成员选择');await member.click();
  }
  await dialog.getByRole('button',{name:'取消',exact:true}).click();
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});

test('共享 Checkbox：禁用与卡片形态遵循原生 Semi 状态',async()=>{
 const fs=await import('node:fs'),os=await import('node:os'),path=await import('node:path'),{build}=await import('esbuild');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'eva-checkbox-'));
 for(const dir of ['prototype','vendor'])fs.symlinkSync(path.resolve('dist',dir),path.join(tmp,dir),'dir');
 const css=fs.readFileSync('dist/index.html','utf8').match(/<link[^>]+stylesheet[^>]*>/g).join('\n');
 const code=`import React from 'react';import{createRoot}from'react-dom/client';import Checkbox from '@douyinfe/semi-ui/lib/es/checkbox';createRoot(document.getElementById('app')).render(<div>{[false,true].map(checked=><Checkbox key={String(checked)} disabled checked={checked}>{checked?'禁用已选':'禁用未选'}</Checkbox>)}<Checkbox type="card">卡片选项</Checkbox></div>);`;
 const result=await build({stdin:{contents:code,loader:'jsx',resolveDir:process.cwd()},bundle:true,write:false,loader:{'.css':'empty'}});
 fs.writeFileSync(path.join(tmp,'app.js'),result.outputFiles[0].text);
 fs.writeFileSync(path.join(tmp,'index.html'),`${css}<div id="app" style="padding:100px"></div><script src="app.js"></script>`);
 const server=createServer(tmp);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{}),page=await browser.newPage();
 const appearance=box=>box.locator('.semi-checkbox-inner-display').evaluate(el=>{const s=getComputedStyle(el);return {bg:s.backgroundColor,shadow:s.boxShadow,color:s.color};});
 try{
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  for(const theme of ['light','dark']){
   await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
   for(const name of ['禁用未选','禁用已选']){
    const box=page.locator('.semi-checkbox').filter({hasText:name});await box.waitFor();await page.mouse.move(0,0);
    const before=await appearance(box);await box.hover();const after=await appearance(box);
    assert.equal(after.bg,before.bg,theme+name+'悬停不激活');assert.equal(after.color,before.color);
    assert.equal(await box.locator('input').isDisabled(),true);
    if(name==='禁用未选')assert.notEqual(after.shadow,'none');
   }
   const card=page.locator('.semi-checkbox').filter({hasText:'卡片选项'});await card.hover();assert.notEqual((await appearance(card)).shadow,'none');
   await card.click();assert.equal(await card.locator('input').isChecked(),true);assert.notEqual((await appearance(card)).bg,'rgba(0, 0, 0, 0)');await card.click();
  }
 }finally{await browser.close();await new Promise(r=>server.close(r));fs.rmSync(tmp,{recursive:true,force:true});}
});
