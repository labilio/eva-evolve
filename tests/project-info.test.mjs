import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {pinyin} from 'pinyin-pro';
import {createPatchedRuntime} from '../tools/build-runtime.mjs';
const runtime=createPatchedRuntime().source;
function setup(){
 const start=runtime.indexOf('function evaProjectIssuePrefix('),end=runtime.indexOf('function GeneralTab(',start);
 assert.ok(start>=0,'project-scoped save helper exists');
 let saved=[{id:'p',name:'原项目',desc:'原目标'},{id:'q',name:'其他项目',desc:'其他目标'}];
 let projection='原项目';
 const store={snapshot:()=>({actorId:'owner'}),manager:(_,actor)=>actor==='owner',renameProject:(_,actor,name)=>{assert.equal(actor,'owner');projection=name;}};
 const ctx={ISSUES_BY_SPACE:{},loadSpaces:()=>structuredClone(saved),KEY:'spaces',localStorage:{setItem:(_,value)=>{saved=JSON.parse(value);}},evaMembers:()=>({store}),window:{pinyinPro:{pinyin}}};
 vm.runInNewContext(readFileSync('prototype/009-2-task-prefix.js','utf8'),ctx);
 vm.runInNewContext(runtime.slice(start,end),ctx);
 return {ctx,read:()=>saved,projection:()=>projection};
}
test('项目名称和共同目标按项目保存，不覆盖其他项目或创建第二份目标',()=>{
 const s=setup();s.ctx.evaSaveProjectInfo('p',{name:' 新名称 ',goal:' 共同达成交付目标 '});
 assert.equal(s.read()[0].issue_prefix,'YXM');
 assert.equal(s.read()[0].name,'新名称');
 assert.equal(s.read()[1].name,'其他项目');
 assert.equal(s.projection(),'新名称');
});
test('普通成员和写入失败不会得到已保存结果',()=>{
 const s=setup();s.ctx.evaMembers().store.snapshot=()=>({actorId:'member'});
 assert.throws(()=>s.ctx.evaSaveProjectInfo('p',{name:'越权',goal:''}),/负责人|管理员/);
 assert.equal(s.read()[0].name,'原项目');
 s.ctx.evaMembers().store.snapshot=()=>({actorId:'owner'});
 s.ctx.localStorage.setItem=()=>{throw Error('storage full');};
 assert.throws(()=>s.ctx.evaSaveProjectInfo('p',{name:'未保存',goal:''}),/storage full/);
 assert.equal(s.projection(),'原项目');
});

test('启动时保留已编辑的项目名称和共同目标',async()=>{
 const {readFileSync}=await import('node:fs');
 let records=[{id:'prod',name:'已编辑的采购项目',desc:'共同目标'},{id:'lab',name:'已编辑的交付项目',desc:'交付目标'}];
 vm.runInNewContext(readFileSync('prototype/000-shell-seed.js','utf8'),{localStorage:{getItem:key=>key==='eva-collab-spaces'?JSON.stringify(records):null,setItem:(key,value)=>{if(key==='eva-collab-spaces')records=JSON.parse(value);}}});
 assert.equal(records[0].name,'已编辑的采购项目');assert.equal(records[0].desc,'共同目标');
 assert.equal(records[1].name,'已编辑的交付项目');assert.equal(records[1].desc,'交付目标');
});

test('旧预设仅迁移一次且不按名称覆盖自建项目',async()=>{
 const {readFileSync}=await import('node:fs');const source=readFileSync('prototype/000-shell-seed.js','utf8');
 const values=new Map([['eva-collab-spaces',JSON.stringify([{id:'prod',name:'AI 产品共创',desc:'旧目标'},{id:'custom',name:'AI 产品共创',desc:'自建目标'}])]]);
 const ctx={localStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)}};
 vm.runInNewContext(source,ctx);let rows=JSON.parse(values.get('eva-collab-spaces'));assert.equal(rows[1].desc,'自建目标');assert.equal(rows[1].name,'AI 产品共创');
 rows[0].name='AI 产品共创';rows[0].desc='用户新目标';values.set('eva-collab-spaces',JSON.stringify(rows));vm.runInNewContext(source,ctx);
 assert.equal(JSON.parse(values.get('eva-collab-spaces'))[0].desc,'用户新目标');
});

test('任务前缀规范化、跨项目冲突与旧调用兼容',()=>{const s=setup();s.ctx.evaSaveProjectInfo('p',{name:'项目',goal:'',issuePrefix:' sc '});assert.equal(s.read()[0].issue_prefix,'SC');s.ctx.evaSaveProjectInfo('p',{name:'更名',goal:''});assert.equal(s.read()[0].issue_prefix,'SC');assert.throws(()=>s.ctx.evaSaveProjectInfo('q',{name:'其他',goal:'',issuePrefix:'SC'}),/已被其他项目/);assert.throws(()=>s.ctx.evaSaveProjectInfo('q',{name:'其他',goal:'',issuePrefix:'123'}),/英文字母/);});

test('概览字段按项目持久化，空编辑行不写入并且不会影响其他项目',()=>{
 const s=setup();
 s.ctx.evaSaveProjectInfo('p',{name:'原项目',goal:'原目标',overview:{status:' 协作中 ',background:' 处理交期风险 ',period:{start:'2026年9月1日',end:'2026年9月30日'},stage:' 证据复核 ',goals:[' 明确恢复计划 ',''],milestones:[['09月07日',' 复核整改证据 ','active'],['','','pending']]}});
 assert.deepEqual(s.read()[0].overview,{status:'协作中',background:'处理交期风险',period:{start:'2026年9月1日',end:'2026年9月30日'},stage:'证据复核',goals:['明确恢复计划'],milestones:[['09月07日','复核整改证据','active']]});
 assert.equal(s.read()[1].overview,undefined);
 assert.throws(()=>s.ctx.evaSaveProjectInfo('p',{name:'原项目',goal:'原目标',overview:{period:{start:'2026年9月1日',end:''}}}),/同时填写/);
});
