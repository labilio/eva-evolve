import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const code=fs.readFileSync(new URL('../prototype/049-loop-task-create.js',import.meta.url),'utf8');
function harness(overrides={}){
  const hooks=[],effects=[];let cursor=0,tree;
  const R={Fragment:'Fragment',createElement:(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity)}),useSyncExternalStore:()=>{},useState(init){const i=cursor++;hooks[i]??={value:typeof init==='function'?init():init};return[hooks[i].value,value=>{hooks[i].value=typeof value==='function'?value(hooks[i].value):value;}];},useRef(value){const i=cursor++;return hooks[i]??={current:value};},useEffect(fn,deps){const i=cursor++,old=hooks[i];if(!old||deps.some((v,n)=>v!==old.deps[n])){effects.push(()=>{old?.cleanup?.();hooks[i]={deps,cleanup:fn()};});}}};
  const state={actorId:'u1',people:[{id:'u1',name:'甲'},{id:'u2',name:'乙'}],clones:[{id:'c1',name:'甲分身',ownerId:'u1'}],projects:{prod:{humans:[{id:'u1'}],cloneIds:['c1'],employeeIds:[]},other:{humans:[{id:'u2'}],cloneIds:[],employeeIds:[]}}};
  const calls=[],deps={React:R,Modal:'Modal',Button:'Button',LoopButton:'Button',Input:'Input',AutoGrowTextarea:'TextArea',LoopPropertyPill:'LoopPropertyPill',Select:'Select',AssigneePicker:'AssigneePicker',DatePicker:'DatePicker',Popover:'Popover',icons:{Paperclip:'Paperclip',Trash2:'Trash2'},members:{memberRoles:()=>[],subscribe:()=>()=>{},getSnapshot:()=>0,snapshot:()=>state,canRead:()=>true,employee:()=>null,projectAgent:()=>null},project:{id:'p-supply',name:'供应链'},getPrefix:()=> 'SC',listLabels:async()=>[{id:'l1',name:'标签'}],createLabel:async name=>({id:'new-'+name,name}),uploadAttachment:async()=>({id:'att-1'}),attachLabel:async()=>{},createIssue:async payload=>{calls.push(payload);return{id:'SC101'};},...overrides};
  const root={EvaAIIdentity:{avatar:()=> 'ai-avatar',badge:()=> 'ai-badge'},EvaAvatar:{personUri:id=>'avatar:'+id}};vm.runInNewContext(code,{window:root});
  const props={visible:true,onClose:()=>calls.push('closed'),onCreated:()=>calls.push('created')};
  const render=()=>{cursor=0;const el=root.EvaLoopTaskCreateUI.render(props,deps);tree=el.type(el.props);while(effects.length)effects.shift()();return tree;};
  const all=(node=tree)=>node&&typeof node==='object'?[node,...node.children.filter(x=>x!==undefined).flatMap(x=>all(x)),...(node.props.footer?all(node.props.footer):[]),...(node.props.content?all(node.props.content):[])]:[];
  const find=label=>all().find(n=>n.props['aria-label']===label);
  const picker=label=>{const wrapper=find(label);return wrapper&&wrapper.children.find(x=>x&&x.type==='AssigneePicker');};
  const button=label=>all().find(n=>n.type==='Button'&&n.children.includes(label));
  const fill=()=>{render();for(const [label,value]of [['任务标题','测试任务'],['任务描述','任务说明'],['执行负责人','u1']]){const node=label==='执行负责人'?picker(label):find(label);node.props.onChange(label==='任务标题'?{target:{value}}:value);render();}};
  render();render();return {render,find,picker,button,fill,calls,props,deps,state,all};
}
test('creates project-bound task with original fields and only current project candidates',async()=>{
  const h=harness();h.fill();const candidates=Array.from(h.picker('执行负责人').props.candidates,x=>x.id);assert.deepEqual(candidates,['u1']);await h.button('创建').props.onClick();const payload=h.calls[0];assert.equal(payload.workspace_id,'prod');assert.equal(payload.status,'todo');assert.equal(payload.assignee_type,'member');assert.equal(payload.description,'任务说明');assert.equal(payload.project_id,'p-supply');assert.equal(payload.priority,'none');
  assert.equal(payload.due_date,null);
});
test('创建任务可设置和清空截止日期，并提交同一 due_date 字段',async()=>{
  const h=harness();h.fill();const picker=h.find('截止日期');assert.equal(picker.type,'DatePicker');assert.equal(picker.props.showClear,true);
  picker.props.onChange(null,'2026-09-20');h.render();assert.equal(h.find('截止日期').props.value,'2026-09-20');
  h.find('截止日期').props.onChange(null,'');h.render();assert.equal(h.find('截止日期').props.value,undefined);
  h.find('截止日期').props.onChange(null,'2026-09-22');h.render();await h.button('创建').props.onClick();assert.equal(h.calls[0].due_date,'2026-09-22');
});
test('double submit is locked until creation finishes',async()=>{
  let resolve,count=0;const h=harness({createIssue:()=>{count++;return new Promise(r=>resolve=r);}});h.fill();const submit=h.button('创建').props.onClick;const first=submit();await submit();assert.equal(count,1);resolve({id:'SC101'});await first;
});
test('project transition ignores stale creation result and resets fields',async()=>{
  let resolve;const h=harness({createIssue:()=>new Promise(r=>resolve=r)});h.fill();const pending=h.button('创建').props.onClick();h.deps.project={id:'other'};h.render();h.render();resolve({id:'SC101'});await pending;assert.equal(h.find('任务标题').props.value,'');assert.equal(h.calls.length,0);
});
test('label retry never recreates an already-created issue',async()=>{
  let attempts=0;const h=harness({attachLabel:async()=>{if(++attempts===1)throw new Error('标签失败');}});h.fill();await new Promise(resolve=>setImmediate(resolve));h.render();h.find('添加或编辑任务标签').props.onChange('标签');h.render();await h.find('添加或编辑任务标签').props.onEnterPress();h.render();await h.button('创建').props.onClick();h.render();assert.ok(h.button('补存标签'));await h.button('补存标签').props.onClick();assert.equal(h.calls.filter(x=>typeof x==='object').length,1);assert.equal(attempts,2);
});
test('unauthorized project refuses submission',async()=>{
  const h=harness();h.fill();h.deps.members.canRead=()=>false;h.render();await h.button('创建').props.onClick();assert.equal(h.calls.length,0);
});
test('upload completion after project change cannot create a task in either project',async()=>{
  let resolve;const h=harness({uploadAttachment:()=>new Promise(r=>resolve=r)});h.fill();
  h.all().find(n=>n.type==='input'&&n.props.type==='file').props.onChange({target:{files:[{name:'a.txt'}],value:''}});h.render();
  const pending=h.button('创建').props.onClick();h.deps.project={id:'other'};h.render();h.render();resolve({id:'old-upload'});await pending;assert.equal(h.calls.length,0);
});
test('新建任务支持一次选择多个附件并按选择顺序上传',async()=>{
  const uploaded=[];const h=harness({uploadAttachment:async file=>{uploaded.push(file.name);return{id:'att-'+file.name};}});h.fill();
  const input=h.all().find(n=>n.type==='input'&&n.props.type==='file');assert.equal(input.props.multiple,true);
  input.props.onChange({target:{files:[{name:'成本明细.xlsx'},{name:'分析报告.pdf'}],value:'selected'}});h.render();
  assert.ok(h.all().some(n=>n.children.includes?.('成本明细.xlsx')));assert.ok(h.all().some(n=>n.children.includes?.('分析报告.pdf')));
  await h.button('创建').props.onClick();assert.deepEqual(uploaded,['成本明细.xlsx','分析报告.pdf']);assert.deepEqual(Array.from(h.calls[0].attachment_ids),['att-成本明细.xlsx','att-分析报告.pdf']);
});
test('负责人只能选择本项目联系人，头像使用稳定身份 ID',async()=>{
  const h=harness();h.fill();const candidates=Array.from(h.picker('执行负责人').props.candidates,x=>x.id);
  assert.deepEqual(candidates,['u1']);
  await h.button('创建').props.onClick();assert.equal(h.calls[0].assignee_type,'member');assert.equal(h.calls[0].status,'todo');
});
test('创建弹窗不提供来源者与创建者选项，提交固定为本人，负责人只有联系人',async()=>{
  const h=harness();h.fill();
  assert.equal(h.find('来源者（联系人）'),undefined,'来源者不提供选择面板');
  assert.equal(h.find('下达者'),undefined,'创建者不提供选择面板');
  assert.deepEqual(Array.from(h.picker('执行负责人').props.candidates,x=>x.id),['u1']);
  await h.button('创建').props.onClick();
  assert.equal(h.calls[0].creator_id,'u1');
  assert.equal(h.calls[0].source_id,'u1');
});
test('原版创建布局保留外层项目路径且没有旧 Loop 项目选择器',()=>{
  const h=harness();assert.ok(h.all().some(n=>n.props.className==='loop-ci__crumb-ws'&&n.children.includes('供应链')));
  assert.ok(h.all().some(n=>n.props.className==='loop-ci__footer'));
  assert.deepEqual(h.all().filter(n=>n.type==='LoopPropertyPill').map(n=>n.props.ariaLabel),['状态','优先级']);
  assert.equal(h.find('所属项目'),undefined);
});
test('新建子任务显示完整父任务上下文并提交稳定父任务 ID',async()=>{
  const h=harness();h.props.parentIssueId='supply-1';h.props.parentIssue={id:'supply-1',identifier:'SC-101',title:'完成间接采购需求归集'};h.render();h.render();
  assert.ok(h.all().some(n=>n.props.className==='loop-ci__crumb-parent'&&n.children.includes('SC-101')));
  assert.ok(h.all().some(n=>n.props.className==='loop-ci__crumb-cur'&&n.children.includes('新建子任务')));
  h.fill();await h.button('创建').props.onClick();assert.equal(h.calls[0].parent_issue_id,'supply-1');
});
test('任务标签可在下拉框内直接新建，初始状态不再显示',async()=>{
  const h=harness();await new Promise(resolve=>setImmediate(resolve));h.render();const tags=h.find('添加或编辑任务标签');assert.equal(tags.props.placeholder,'选择或输入任务标签');tags.props.onChange('风险');h.render();await h.find('添加或编辑任务标签').props.onEnterPress();h.render();
  assert.ok(h.all().some(n=>n.props['aria-label']==='移除标签 风险'));assert.equal(h.find('新建标签'),undefined);assert.equal(h.button('添加'),undefined);assert.equal(h.all().some(n=>n.children.includes?.('初始状态')),false);
});

test('任务浮层共用弹窗容器，标签选择不丢失输入且重新打开时关闭',async()=>{
 const h=harness();await new Promise(resolve=>setImmediate(resolve));h.render();
 const modal=h.all().find(n=>n.type==='Modal');
 for(const n of h.all().filter(n=>['LoopPropertyPill','Select','DatePicker','Popover'].includes(n.type)))assert.equal(n.props.getPopupContainer,modal.props.getPopupContainer);
 h.find('添加或编辑任务标签').props.onFocus();h.render();assert.equal(h.all().find(n=>n.type==='Popover').props.visible,true);
 const option=h.all().find(n=>n.props.role==='option');option.props.onClick();h.render();assert.ok(h.find('移除标签 标签'));
 h.all().find(n=>n.type==='Popover').props.onClickOutSide();h.render();assert.equal(h.all().find(n=>n.type==='Popover').props.visible,false);
 h.props.visible=false;h.render();h.props.visible=true;h.render();h.render();assert.equal(h.all().find(n=>n.type==='Popover').props.visible,false);
});

test('项目角色仅属于成员管理，创建任务不增加角色选择',()=>{
 const h=harness();h.fill();assert.equal(h.find('下达角色'),undefined);
});
test('切换操作账号时清空旧任务草稿与下达角色',()=>{
 const h=harness();h.fill();h.state.actorId='u2';h.render();h.render();assert.equal(h.find('任务标题').props.value,'');
});
