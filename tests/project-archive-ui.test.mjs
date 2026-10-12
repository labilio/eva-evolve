import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createPatchedRuntime} from '../tools/build-runtime.mjs';
const runtime=createPatchedRuntime().source;
function banner(owner){
 const start=runtime.indexOf('function EvaProjectArchiveNotice('),end=runtime.indexOf('\nfunction ',start+1);
 assert.ok(start>=0,'shared archive notice must be compiled into the application');
 const store={subscribe:()=>()=>{},getSnapshot:()=>1,actorId:()=>owner?'a':'b',owningProject:()=> 'p',projectRecord:()=>({ownerId:'a',archivedAt:'2026-10-12'})};
 const context={React:{createElement:(type,props,...children)=>({type,props,children})},reactExports:{useState:()=>[false,()=>{}],useSyncExternalStore:()=>{}},evaMembers:()=>({store}),Archive:'Archive',Button:'Button',EvaProjectArchiveDialog:'Dialog'};
 vm.runInNewContext(runtime.slice(start,end),context);return context.EvaProjectArchiveNotice({scopeId:'g'});
}
function nodes(node){return node&&typeof node==='object'?[node,...(node.children||[]).flatMap(nodes)]:[];}
test('archived composer notice exposes project-level recovery only to owner',()=>{
 assert.equal(nodes(banner(true)).some(n=>n.type==='Button'&&n.children.includes('恢复项目')),true);
 assert.equal(nodes(banner(false)).some(n=>n.type==='Button'),false);
 assert.equal(nodes(banner(true)).some(n=>n.props?.contentEditable),false);
});
