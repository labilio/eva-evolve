import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('无关 DOM 更新不重新读取项目颜色，项目图标或主题变化仍更新',()=>{
 let scan,reads=0,writes=0,style='color:blue',theme='light';
 const icon={className:'eva-project-switcher__icon',getAttribute:()=>style};
 const frame={querySelector:()=>icon,style:{setProperty:()=>writes++}};
 const document={readyState:'complete',body:{},documentElement:{getAttribute:()=>theme},querySelector:s=>s==='.collab-frame'?frame:null};
 vm.runInNewContext(readFileSync('prototype/060-task-drawer.js','utf8'),{document,getComputedStyle:()=>{reads++;return{color:style};},MutationObserver:class{constructor(fn){scan=fn}observe(){}}});
 for(let i=0;i<50;i++)scan();assert.equal(reads,1);assert.equal(writes,1);
 style='color:red';scan();assert.equal(reads,2);
 theme='dark';scan();assert.equal(reads,3);
});
