import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function load(data=new Map()) {
 const window={localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)}};
 vm.runInNewContext(fs.readFileSync('prototype/009-3-workspace-memory.js','utf8'),{window});
 return {api:window.EvaWorkspaceMemory,data};
}
test('工作现场按账号与会话隔离，重载恢复且清空不复活',()=>{
 const {api,data}=load();api.write('me','im:a','reply',{messageId:'m1'});api.write('me','im:b','cursor',{start:3,end:5});
 const b=load(data).api;assert.equal(b.read('me','im:a','reply',null).messageId,'m1');assert.equal(b.read('other','im:a','reply',null),null);
 b.write('me','im:a','reply',null);assert.equal(load(data).api.read('me','im:a','reply','wrong'),null);
 assert.equal(b.read('me','im:b','cursor',null).end,5);
});
test('滚动现场区分阅读历史和底部跟随，恢复不误写当前坐标',()=>{
 const {api,data}=load();const listeners=new Map();
 const el={scrollTop:180,scrollLeft:0,scrollHeight:1000,clientHeight:200,addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)};
 const stop=api.bindScroll(el,'me','chat');el.scrollTop=340;listeners.get('scroll')();stop();
 const restored={...el,scrollTop:0,scrollHeight:1200};const off=load(data).api.bindScroll(restored,'me','chat');assert.equal(restored.scrollTop,340);restored.scrollTop=1000;listeners.get('scroll')();off();
 const latest={...el,scrollTop:0,scrollHeight:1600};load(data).api.bindScroll(latest,'me','chat');assert.equal(latest.scrollTop,1400);
});
test('一次性演示不覆盖已有值，清空后也不再初始化',()=>{
 const {api,data}=load();api.write('me','im:a','attachments',[]);api.seed('me','demo',{'im:a':{attachments:['sample']},'im:b':{cursor:{start:2,end:2}}});
 assert.equal(api.read('me','im:a','attachments',null).length,0);api.write('me','im:b','cursor',null);
 load(data).api.seed('me','demo',{'im:b':{cursor:{start:2,end:2}}});assert.equal(load(data).api.read('me','im:b','cursor','bad'),null);
});
test('切换到短内容时，卸载不能用已经被压缩的 DOM 覆盖旧会话位置',()=>{
 const {api}=load(),listeners=new Map();
 const el={scrollTop:0,scrollLeft:0,scrollHeight:1200,clientHeight:200,addEventListener:(n,f)=>listeners.set(n,f),removeEventListener:n=>listeners.delete(n)};
 const stop=api.bindScroll(el,'me','long-chat');el.scrollTop=180;listeners.get('scroll')();
 // React may have committed the next conversation before layout-effect cleanup.
 el.scrollHeight=100;el.scrollTop=0;stop();
 assert.equal(api.read('me','long-chat','scroll',null).top,180);
});
