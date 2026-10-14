import {test} from 'node:test';
import assert from 'node:assert/strict';
import {connectUpdateNotification} from '../prototype/063-update-notification-controller.js';

function fixture(initial={status:'idle'}, install=async()=>{}) {
 let snapshot=initial, listener, view=null, installs=0;
 const source={getSnapshot:()=>snapshot,subscribe:fn=>{listener=fn;return()=>{listener=null;};},
  install:async version=>{installs++;return install(version);}};
 const dispose=connectUpdateNotification({source,present:value=>{view=value;},close:()=>{view=null;}});
 return {emit:value=>{snapshot=value;listener?.(value);},get view(){return view;},get installs(){return installs;},dispose};
}

test('只有下载完成才提示，同版本状态重复上报不会重新打开已关闭通知',()=>{
 const f=fixture();assert.equal(f.view,null);
 f.emit({status:'available',version:'1.2.0'});assert.equal(f.view,null);
 f.emit({status:'downloading',version:'1.2.0'});assert.equal(f.view,null);
 f.emit({status:'ready',version:'1.2.0'});assert.equal(f.view.version,'1.2.0');
 f.view.dismiss();f.emit({status:'ready',version:'1.2.0'});assert.equal(f.view,null);
 f.emit({status:'ready',version:'1.3.0'});assert.equal(f.view.version,'1.3.0');f.dispose();
});

test('启动时读取已下载快照，退出宿主清理通知和订阅',()=>{
 const f=fixture({status:'ready',version:'1.2.0'});assert.equal(f.view.version,'1.2.0');
 f.dispose();assert.equal(f.view,null);f.emit({status:'ready',version:'1.3.0'});assert.equal(f.view,null);
});

test('重启防重复提交，失败保留通知并允许重试',async()=>{
 let reject;const f=fixture({status:'ready',version:'1.2.0'},()=>new Promise((_,r)=>{reject=r;}));
 const action=f.view.restart;const pending=action();action();assert.equal(f.installs,1);assert.equal(f.view.busy,true);
 reject(new Error('offline'));await pending;assert.equal(f.view.busy,false);assert.match(f.view.error,/重试/);
 const retry=f.view.restart();assert.equal(f.installs,2);reject(new Error('offline'));await retry;f.dispose();
});

test('旧版本异步结果不得关闭新版本通知，卸载后不得重新弹出错误',async()=>{
 let resolve;const f=fixture({status:'ready',version:'1.2.0'},()=>new Promise(r=>{resolve=r;}));
 const pending=f.view.restart();f.emit({status:'ready',version:'1.3.0'});
 void f.view.restart();assert.equal(f.installs,1,'安装中的跨版本通知也不得发起第二次安装');
 resolve();await pending;
 assert.equal(f.view.version,'1.3.0');assert.equal(f.view.busy,false);f.dispose();
 let reject;const g=fixture({status:'ready',version:'1.2.0'},()=>new Promise((_,r)=>{reject=r;}));
 const failed=g.view.restart();g.dispose();reject(new Error('offline'));await failed;assert.equal(g.view,null);
});

test('缺失或无效版本不显示通知',()=>{
 const f=fixture({status:'ready',version:''});assert.equal(f.view,null);
 f.emit({status:'ready',version:{}});assert.equal(f.view,null);f.dispose();
});
