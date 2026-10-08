import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../prototype/009-6-patch-general.js',import.meta.url),'utf8');
const start=source.indexOf('  function evaCreateProjectResolver('),end=source.indexOf("  root.__evaPatch('general'",start);
const context={};vm.runInNewContext(source.slice(start,end)+';this.create=evaCreateProjectResolver;',context);
test('IM repeated project identity lookups reuse parsing and immediately observe saved edits/deletions',()=>{
 let raw=JSON.stringify([{id:'prod',name:'原项目'}]),loads=0;
 const resolve=context.create(()=>{loads++;return JSON.parse(raw)},()=>raw);
 for(let i=0;i<100;i++)assert.equal(resolve('prod').name,'原项目');
 assert.equal(loads,1);
 raw=JSON.stringify([{id:'prod',name:'新项目'}]);assert.equal(resolve('prod').name,'新项目');assert.equal(loads,2);
 raw='[]';assert.equal(resolve('prod'),undefined);assert.equal(loads,3);
});
test('IM project lookup does not retain stale metadata when storage becomes unavailable',()=>{
 let blocked=false,rows=[{id:'prod',name:'原项目'}];
 const resolve=context.create(()=>rows,()=>{if(blocked)throw Error('unavailable');return 'v1'});
 assert.equal(resolve('prod').name,'原项目');blocked=true;rows=[{id:'prod',name:'回退项目'}];
 assert.equal(resolve('prod').name,'回退项目');
});
