import {test} from 'node:test';
import assert from 'node:assert/strict';
import {connectUpdateNotification} from '../prototype/063-update-notification-controller.js';
import {createUpdateDemoSource} from '../prototype/063-update-demo.js';
const update=(status,extra={})=>({status,version:'2.0.28',...extra});
function fixture(initial=update('idle'),operations={}){
 let snapshot=initial,listener,view=null;const calls=[];
 const source={getSnapshot:()=>snapshot,subscribe:fn=>{listener=fn;return()=>listener=null;},...Object.fromEntries(['download','install'].map(action=>[action,async version=>{calls.push(action);return operations[action]?.(version);}]))};
 const dispose=connectUpdateNotification({source,present:v=>view=v,close:()=>view=null});
 return {get view(){return view;},calls,dispose,emit:v=>{snapshot=v;listener?.(v);}};
}
test('单卡呈现下载、准备、就绪；关闭后不因进度重新出现，检查可重新打开',()=>{
 const f=fixture(update('available'));f.emit(update('downloading',{percent:30}));assert.equal(f.view.percent,30);f.view.dismiss();f.emit(update('ready'));assert.equal(f.view,null);
 f.dispose.reveal();assert.equal(f.view.status,'ready');f.view.dismiss();f.emit(update('available',{version:'3.0.0'}));assert.equal(f.view.version,'3.0.0');f.dispose();
});
test('防重复下载；无取消操作；准备完成前不能重启',async()=>{
 let resolve;const f=fixture(update('available'),{download:()=>new Promise(r=>resolve=r)});
 const p=f.view.download();await f.view.download();assert.deepEqual(f.calls,['download']);f.emit(update('downloading'));assert.equal(f.view.cancel,undefined);
 resolve();await p;f.emit(update('preparing'));await f.view.restart();assert.deepEqual(f.calls,['download']);f.emit(update('ready'));await f.view.restart();assert.equal(f.view,null);f.dispose();
});
test('下载、安装错误可重试；新版本和卸载后不受旧命令影响',async()=>{
 const f=fixture(update('available'),{download:()=>{throw Error('offline');}});await f.view.download();assert.equal(f.view.status,'error');await f.view.download();assert.equal(f.calls.length,2);f.dispose();
 let reject;const g=fixture(update('ready'),{install:()=>new Promise((_,r)=>reject=r)});let p=g.view.restart();await g.view.restart();assert.equal(g.calls.length,1);reject(Error('failed'));await p;assert.equal(g.view.errorKind,'install');
 p=g.view.restart();g.emit(update('ready',{version:'3.0.0'}));reject(Error('old'));await p;assert.equal(g.view.error,'');p=g.view.restart();g.dispose();reject(Error('late'));await p;assert.equal(g.view,null);
});
test('无效快照不呈现；下载开始后失败保留重试，新阶段清理错误',async()=>{
 const f=fixture(update('available',{version:' '}));assert.equal(f.view,null);f.dispose();
 let reject;const g=fixture(update('available'),{download:()=>new Promise((_,r)=>reject=r)});const p=g.view.download();g.emit(update('downloading'));reject(Error('failed'));await p;assert.equal(g.view.status,'error');g.emit(update('preparing'));assert.equal(g.view.error,'');g.dispose();
});
test('默认提示更新，下载不中止并经过准备，就绪后仅模拟安装完成',async()=>{
 const jobs=new Map();let serial=0;const source=createUpdateDemoSource('',{onChangelog:()=>{},schedule:fn=>{jobs.set(++serial,fn);return serial;},unschedule:id=>jobs.delete(id)});
 const tick=()=>{const [id,fn]=jobs.entries().next().value;jobs.delete(id);fn();};
 assert.equal(source.getSnapshot().status,'available');assert.equal(source.cancel,undefined);await source.download();
 while(source.getSnapshot().status==='downloading')tick();assert.equal(source.getSnapshot().status,'preparing');tick();assert.equal(source.getSnapshot().status,'ready');const p=source.install();tick();await p;assert.equal(source.getSnapshot().status,'demo-complete');source.dispose();assert.equal(jobs.size,0);
});

test('失败演示可重开，下载期间不能打断，重试可完成',async()=>{
 const jobs=new Map();let id=0;
 const source=createUpdateDemoSource('',{onChangelog:()=>{},schedule:fn=>{jobs.set(++id,fn);return id;},unschedule:i=>jobs.delete(i)});
 assert.equal(source.previewFailure(),true);assert.equal(source.getSnapshot().status,'error');await source.download();assert.equal(source.previewFailure(),false);assert.equal(source.getSnapshot().status,'downloading');
 while(jobs.size){const [i,fn]=jobs.entries().next().value;jobs.delete(i);fn();}
 assert.equal(source.getSnapshot().status,'ready');assert.equal(source.previewFailure(),true);source.dispose();
});
test('具体故障在对应阶段发生，重试清除故障且不会绕过校验',async()=>{
 for(const kind of ['offline','timeout','disk','signature','archive','permission']){
  const jobs=new Map();let id=0;const source=createUpdateDemoSource('',{onChangelog:()=>{},schedule:fn=>{jobs.set(++id,fn);return id;},unschedule:i=>jobs.delete(i)});
  const phases=[];source.subscribe(s=>phases.push(s.status));const tick=()=>{const [i,fn]=jobs.entries().next().value;jobs.delete(i);fn();};
  assert.equal(source.previewFailure(kind),true);
  if(kind==='permission'){assert.equal(source.getSnapshot().failure,kind);const p=source.install();while(jobs.size)tick();await p;assert.equal(source.getSnapshot().status,'demo-complete');}
  else{
   assert.equal(source.getSnapshot().status,'downloading');while(jobs.size)tick();assert.equal(source.getSnapshot().status,'error');assert.equal(source.getSnapshot().failure,kind);assert.equal(phases.includes('ready'),false);
   if(['offline','timeout','disk'].includes(kind))assert.equal(source.getSnapshot().percent,48);else assert.ok(phases.includes('preparing'));
   await source.download();assert.equal(source.getSnapshot().percent,0);assert.equal(source.getSnapshot().failure,undefined);while(jobs.size)tick();assert.equal(source.getSnapshot().status,'ready');
  }
  source.dispose();
 }
});
