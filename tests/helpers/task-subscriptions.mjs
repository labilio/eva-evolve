import fs from 'node:fs';
import vm from 'node:vm';
// Install the real side-effect store in isolated runtime-function tests.
export function attachTaskSubscriptions(ctx){
 const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
 ctx.window??={};ctx.window.localStorage=storage;
 vm.runInNewContext(fs.readFileSync('prototype/062-task-subscriptions.js','utf8'),{window:ctx.window});
 const original=ctx.evaMembers().store;
 const membership={...original,cloneRecords:original.cloneRecords||(()=>original.identityRecords?.().clones||[]),subscribe:original.subscribe||(()=>()=>{}),canRead:original.canRead||(()=>true)};
 const store=ctx.window.EvaTaskSubscriptions.createStore({storage,membership});
 ctx.evaTaskSubscriptions=()=>store;ctx.evaLoopCommentsByTask??=new Map();
 return store;
}
