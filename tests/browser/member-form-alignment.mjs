import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';

test('公共左标签布局：项目和群聊正常/错误态的标签与输入控件垂直居中',async()=>{
 const server=createServer(new URL('../../dist',import.meta.url).pathname);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const origin=`http://127.0.0.1:${server.address().port}`;
 async function aligned(){
  const rows=await page.locator('.eva-member-picker__field').evaluateAll(rows=>rows.map(row=>{
   const text=row.querySelector('.semi-form-field-label-text'),control=row.querySelector('.semi-input-wrapper'),a=text.getBoundingClientRect(),b=control.getBoundingClientRect(),style=getComputedStyle(text);
   return {label:text.textContent,delta:a.top+a.height/2-b.top-b.height/2,font:style.fontSize,line:style.lineHeight};
  }));
  assert.ok(rows.length);for(const row of rows){assert.ok(Math.abs(row.delta)<0.5,`${row.label} 中心偏差 ${row.delta}px`);assert.equal(row.font,'14px');assert.equal(row.line,'22px');}
 }
 try{
  for(const kind of ['project','group']){
   await page.goto(origin+(kind==='project'?'/#/collab':'/?picker-preview=create#/collab?evaProject=prod&evaTab=settings'));
   if(kind==='project')await page.getByRole('button',{name:'新建项目',exact:true}).click();
   const dialog=page.getByRole('dialog',{name:kind==='project'?'新建项目':'新建群聊',exact:true});
   await dialog.locator('input').first().waitFor();await aligned();
   await dialog.getByRole('button',{name:kind==='project'?'创建并进入项目':'创建群聊',exact:true}).click();
   await dialog.locator('.semi-form-field-error-message').first().waitFor();await aligned();
   await dialog.locator(kind==='project'?'#eva-project-name':'#eva-member-picker-name').fill('对齐验收');await aligned();
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
