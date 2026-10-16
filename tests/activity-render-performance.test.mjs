import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {parseHTML} from 'linkedom';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';

// Exercise the page's real React data/focus lifecycle. Only UI primitives are
// replaced: their browser keyboard/visual contract is verified in Edge.
test('selection and keyboard focus do not reread sources or reparse unrelated previews; source changes refresh immediately', async () => {
 const {window, document}=parseHTML('<html><body><div id="app"></div></body></html>');
 const previous={window:globalThis.window,document:globalThis.document,IS_REACT_ACT_ENVIRONMENT:globalThis.IS_REACT_ACT_ENVIRONMENT};
 globalThis.IS_REACT_ACT_ENVIRONMENT=false;
 globalThis.window=window;globalThis.document=document;
 const require=createRequire(import.meta.url);
 const ui=`import React from 'react';
 export const Button=({children,icon,theme,type,...props})=>React.createElement('button',props,icon,children);
 export const List=({dataSource,renderItem})=>React.createElement('ul',null,dataSource.map(renderItem));
 List.Item=({children,...props})=>React.createElement('li',props,children);
 export const ActionMenu=({children})=>children;
 export const Dialog=()=>null;Dialog.Text=()=>null;export const Actions=()=>null;
 export const EvaLucideIcon=()=>null;export const typography={};`;
 const output=await build({entryPoints:['prototype/064-activity-page.jsx'],bundle:true,write:false,format:'esm',plugins:[{name:'test-primitives',setup(b){
  b.onResolve({filter:/^react$/},()=>({path:pathToFileURL(require.resolve('react')).href,external:true}));
  b.onResolve({filter:/063-/},()=>({path:'ui',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:ui,loader:'js'}));
 }}]});
 const {ActivityPage}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
 let reads=0,parses=0,rowRenders=0,revision=0,selectedKey=null;
 let rows=['a','b','c'].map(key=>({key,id:key,type:'task',title:key,events:[],preview:[{id:key,text:key}],unreadCount:0}));
 const listeners=new Set();
 const store={subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},getSnapshot:()=>revision,items:()=>{reads++;return rows;},context:()=>null};
 const props={renderObjectIcon:()=>{rowRenders++;return null;},store,storage:{getItem:()=>null},previewText:text=>{parses++;return text;},renderDetail:()=>null,onSelect:key=>{selectedKey=key;render();}};
 const root=createRoot(document.getElementById('app'));
 const render=()=>flushSync(()=>root.render(React.createElement(ActivityPage,{...props,selectedKey})));
 try {
  render();assert.equal(reads,1);assert.equal(parses,3);
  document.querySelector('[data-activity-open="a"]').click();
  document.querySelector('[data-activity-open="b"]').click();
  assert.equal(reads,1);assert.equal(parses,3);
  assert.equal(document.querySelector('[aria-current="true"]').dataset.activityOpen,'b');
  assert.equal(rowRenders,6,'only the previous and next selected rows repaint');
  const event=new window.Event('keydown',{bubbles:true,cancelable:true});Object.defineProperty(event,'key',{value:'ArrowDown'});
  document.querySelector('[data-activity-open="b"]').dispatchEvent(event);
  assert.equal(reads,1);assert.equal(parses,3);
  rows=rows.filter(row=>row.key!=='b').map(row=>({...row,title:'更新'+row.title}));revision++;
  flushSync(()=>listeners.forEach(fn=>fn()));
  assert.equal(reads,2);assert.equal(document.querySelector('[data-activity-open="b"]'),null);
  assert.match(document.querySelector('[data-activity-open="a"]').textContent,/更新a/);
  rows=['session-1','session-2'].map(key=>({key,id:key,sourceId:'ai',identityKind:'employee',identityId:'bot-a',identifier:'供应链保供专家',type:'message',title:key,events:[],preview:[{id:key,text:'最新回复',actorId:'bot-a'},{id:key+'-old',text:'旧回复',actorId:'bot-a'}],unreadCount:0}));revision++;
  flushSync(()=>listeners.forEach(fn=>fn()));
  assert.equal(document.querySelectorAll('[data-activity-open]').length,0,'非任务来源不得进入任务动态');
  selectedKey='session-2';
  store.context=()=>rows[1];
  let detailCalls=0;
  props.renderDetail=()=>{detailCalls++;return null;};
  render();
  assert.equal(detailCalls,0,'旧消息直达链接不得绕过任务范围');
  assert.equal(document.querySelector('.eva-activity__types'),null,'移除整条类型导航');
  assert.equal(document.querySelector('h1').textContent,'任务动态');

 } finally {globalThis.IS_REACT_ACT_ENVIRONMENT=true;await React.act(async () => { root.unmount(); });Object.assign(globalThis,previous);}
});
