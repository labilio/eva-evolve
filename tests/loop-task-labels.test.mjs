import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createPatchedRuntime} from '../tools/build-runtime.mjs';

const runtime=createPatchedRuntime().source;
const helpersStart=runtime.indexOf('const evaLoopTaskAttachments=new Map(),evaLoopTaskLabelsByProject=new Map();');
const helpersEnd=runtime.indexOf('function CreateIssueModal(props){',helpersStart);
const apiStart=runtime.indexOf('listLabels=',runtime.indexOf('invalidateDirectory=()=>{}'));
const apiEnd=runtime.indexOf(';function useAssigneeCandidateState',apiStart);
assert.ok(helpersStart>=0&&helpersEnd>helpersStart,'task-label helper extraction');
assert.ok(apiStart>=0&&apiEnd>apiStart,'task-label API extraction');

function setup(){
  let current='prod';
  const projects=[{id:'prod',name:'供应链'},{id:'other',name:'其他项目'}];
  const issues={
    prod:[{id:'issue-prod',labels:[]}],
    other:[{id:'issue-other',labels:[]}]
  };
  const window={__EVA_SUPPLY_CHAIN_DEMO:{taskLabels:[
    {id:'label-procurement',project_id:'p-supply',name:'采购',color:'#1563eb'}
  ]}};
  const ctx={
    window,
    ISSUES_BY_SPACE:issues,
    loadSpaces:()=>projects,
    currentSpaceId:()=>current,
    Promise,
    Date,
    Math
  };
  const source=`${runtime.slice(helpersStart,helpersEnd)}
    let listLabels,createLabel,updateLabel,deleteLabel,attachLabel,detachLabel;
    ${runtime.slice(apiStart,apiEnd)};
    this.api={listLabels,createLabel,updateLabel,deleteLabel,attachLabel,detachLabel};`;
  vm.runInNewContext(source,ctx);
  return {api:ctx.api,issues,setCurrent:id=>{current=id;}};
}

test('任务详情标签 API 读取当前项目目录，并将绑定与解绑写回当前任务',async()=>{
  const s=setup();
  assert.deepEqual(Array.from(await s.api.listLabels(),label=>label.name),['采购']);
  const beforeAttach=s.issues.prod[0];
  await s.api.attachLabel('issue-prod','label-procurement');
  assert.notEqual(s.issues.prod[0],beforeAttach,'绑定标签后提供新的任务快照供详情重渲染');
  assert.deepEqual({...s.issues.prod[0].labels[0]},{id:'label-procurement',project_id:'p-supply',name:'采购',color:'#1563eb'});
  const beforeDetach=s.issues.prod[0];
  await s.api.detachLabel('issue-prod','label-procurement');
  assert.notEqual(s.issues.prod[0],beforeDetach,'解绑标签后提供新的任务快照供详情重渲染');
  assert.deepEqual(Array.from(s.issues.prod[0].labels),[]);
});

test('任务标签改名和删除同步已绑定任务，且不同项目目录互不串联',async()=>{
  const s=setup();
  await s.api.attachLabel('issue-prod','label-procurement');
  await s.api.updateLabel('label-procurement',{name:'重点采购',color:'#ef4444'});
  assert.deepEqual({...s.issues.prod[0].labels[0]},{id:'label-procurement',project_id:'p-supply',name:'重点采购',color:'#ef4444'});

  s.setCurrent('other');
  assert.deepEqual(Array.from(await s.api.listLabels()),[]);
  const otherLabel=await s.api.createLabel('其他项目标签','#22c55e');
  await s.api.attachLabel('issue-other',otherLabel.id);
  assert.equal(s.issues.other[0].labels[0].name,'其他项目标签');
  assert.equal(s.issues.prod[0].labels[0].name,'重点采购');

  s.setCurrent('prod');
  await s.api.deleteLabel('label-procurement');
  assert.deepEqual(Array.from(s.issues.prod[0].labels),[]);
  assert.equal(s.issues.other[0].labels[0].name,'其他项目标签');
});
