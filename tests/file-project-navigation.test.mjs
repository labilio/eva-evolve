import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createPatchedRuntime} from '../tools/build-runtime.mjs';
test('文件库回跳使用完整项目路由，不依赖目标页加载前的定时事件',()=>{
 const source=fs.readFileSync('prototype/020-mode-layer.js','utf8');
 const start=source.indexOf('  function bridgeSelectedResource()'),end=source.indexOf('  function handleDriveClick',start);
 const location={hash:''};let closed=false;
 vm.runInNewContext(source.slice(start,end)+';bridgeSelectedResource();',{selectedResource:()=>({projectId:'prod'}),state:{workspaceId:'other'},closeDrive:()=>{closed=true;},location,setTimeout:()=>{},window:{}});
 assert.equal(location.hash,'#/collab?evaProject=prod&evaTab=files');assert.equal(closed,true);
 const runtime=createPatchedRuntime().source;
 assert.match(runtime,/evaInitialProjectTab=new URLSearchParams\(useLocation\(\)\.search\)\.get\("evaTab"\)/);
 assert.match(runtime,/useState\(evaInitialProjectTab==="files"\?"files":"tasks"\)/);
});

test('点击外链行空白处打开原链接，文件夹行进入目录，回收站行不预览',()=>{
 const source=fs.readFileSync('prototype/020-mode-layer.js','utf8');
 const start=source.indexOf('  function handleDriveClick(event)'),end=source.indexOf('\n  function ',start+5);
 function click(resource,scope){
  const state={driveScope:scope};let opened=null;
  const row={dataset:{resourceId:resource.id}};
  vm.runInNewContext(source.slice(start,end)+';handleDriveClick(event);',{state,event:{target:{closest:selector=>selector==='[data-resource-id]'?row:null}},fileActor:()=> 'a',fileContext:()=>({files:{snapshot:()=>[resource],resolveFile:()=>resource}}),selectedResource:()=>null,closeRowMenu:()=>{},renderDrive:()=>{},openExternalResource:()=>{opened='external';},showToast:()=>{}});
  return {opened,preview:state.previewId,parentId:state.parentId};
 }
 assert.deepEqual(click({id:'l',type:'external_link'},'workspace'),{opened:'external',preview:undefined,parentId:undefined});
 assert.deepEqual(click({id:'f',type:'folder'},'workspace'),{opened:null,preview:undefined,parentId:'f'});
 assert.deepEqual(click({id:'l',type:'external_link'},'trash'),{opened:null,preview:undefined,parentId:undefined});
});
