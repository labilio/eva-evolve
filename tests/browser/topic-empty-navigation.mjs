import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';
const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge'});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{let api;Object.defineProperty(window,'EvaMembership',{configurable:true,get:()=>api,set:value=>{api={...value,bootstrap(...args){const store=value.bootstrap(...args);if(!store.snapshot().groups['empty-topic-check'])store.createGroup('empty-topic-check','无子区验收群','prod','u-wangyilin',[]);return store;}};}});});
 await page.goto(`http://127.0.0.1:${server.address().port}/#/messages?evaDM=empty-topic-check`);
 const manage=page.getByRole('button',{name:'子区',exact:true});await manage.waitFor();
 assert.equal(await page.locator('.eva-recent-topic-tabs').count(),0,'无子区不显示导航');
 await manage.click();await page.locator('.eva-thread-list').getByRole('button',{name:'新建子区',exact:true}).click();
 const modal=page.locator('.eva-topic-create .semi-modal-content');await modal.getByRole('textbox').fill('首个讨论');await modal.getByRole('button',{name:'创建并进入',exact:true}).click();
 const nav=page.locator('.eva-recent-topic-tabs');await nav.getByRole('tab',{name:'首个讨论',exact:true}).waitFor();assert.equal(await nav.getByRole('tab').count(),2);assert.equal(await nav.getByRole('tab',{name:'首个讨论',exact:true}).getAttribute('aria-selected'),'true');
 await page.reload();await nav.getByRole('tab',{name:'主聊天',exact:true}).waitFor();assert.equal(await nav.getByRole('tab').count(),2);assert.deepEqual(errors,[]);
 console.log('PASS empty group hides row, header creates first topic, row appears, reload');
}finally{await browser.close();await new Promise(r=>server.close(r));}
