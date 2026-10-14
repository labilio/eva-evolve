import {loadIdentityEnvironment} from './helpers/identity-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setup() {
  const window = { EvaDigitalEmployeesStore: {
    get: id => ({ id, kind:'staff', name: '数字员工', ownership: 'organization' }),
    appearance: () => ({})
  }};
  loadIdentityEnvironment(window);vm.runInNewContext(fs.readFileSync(new URL('../prototype/009-2-membership.js', import.meta.url), 'utf8'), { window });
  const store = window.EvaMembership.create({ people: [{ id: 'owner', name: '负责人' }, { id: 'member', name: '成员' }] });
  store.createProject('p', '项目', 'owner', []);
  store.addMember('p', 'owner', 'member');
  store.createGroup('project-group', '项目群', 'p', 'owner', []);
  store.createGroup('org-group', '非项目群', null, 'owner', []);
  return store;
}

test('数字员工可加入项目群和非项目群，重复添加去重且访问限于已加入范围',()=>{
  const store=setup();
  for(const id of ['project-group','org-group']){
    store.addEmployee(id,'owner','employee');store.addEmployee(id,'owner','employee');
    assert.deepEqual(Array.from(store.snapshot().groups[id].employeeIds),['employee']);
    assert.equal(store.canRead(id,'employee'),true);
  }
  assert.equal(store.canRead('p','employee'),false,'加入群不自动获得项目访问权');
  assert.throws(()=>store.addEmployee('org-group','member','employee'),/请先加入/);
});

test('数字员工仍可放进项目，全员群别名归一化到项目且重复添加不重复', () => {
  const store = setup();
  store.addEmployee('p', 'owner', 'employee');
  store.addEmployee('all:p', 'owner', 'employee');
  assert.deepEqual(Array.from(store.snapshot().projects.p.employeeIds), ['employee']);
  assert.equal(store.snapshot().groups['project-group'].employeeIds, undefined);
});

test('群聊边界调整不改变现有项目成员添加权限', () => {
  const store = setup();
  assert.equal(store.manager('p', 'member'), false);
  store.addEmployee('p', 'member', 'employee');
  assert.deepEqual(Array.from(store.snapshot().projects.p.employeeIds), ['employee']);
});

test('目录使用现行可用范围，项目状态原位派生，提交复核身份和归档',()=>{
  const agents=[
    {id:'public',kind:'staff',ownership:'organization',scope:'org',name:'公共',domain:'供应链'},
    {id:'private',kind:'staff',ownership:'personal',by:'other',scope:'self',name:'他人的私有员工'},
    {id:'retired',kind:'staff',ownership:'organization',active:false,name:'停用'},
    {id:'team',kind:'team',ownership:'organization',name:'团队'}
  ];
  const window={EvaDigitalEmployeesStore:{agents:()=>agents,get:id=>agents.find(a=>a.id===id),appearance:()=>({})}};
  loadIdentityEnvironment(window);vm.runInNewContext(fs.readFileSync(new URL('../prototype/009-2-membership.js',import.meta.url),'utf8'),{window});
  const store=window.EvaMembership.create({people:[{id:'owner',name:'负责人'},{id:'other',name:'其他人'}]});
  store.createProject('p','项目','owner',[]);
  assert.deepEqual(Array.from(store.employeeCandidates('p','owner'),a=>a.id),['public']);
  assert.equal(store.employeeCandidates('p','other').length,0);
  assert.throws(()=>store.transaction(staged=>{staged.addEmployee('p','owner','public');staged.addEmployee('p','owner','private');}),/不可用/);
  assert.equal(store.employeeCandidates('p','owner')[0].joined,false,'事务失败不留下部分添加');
  store.addEmployee('p','owner','public');
  assert.equal(store.employeeCandidates('p','owner')[0].joined,true);
  agents[0].active=false;
  assert.throws(()=>store.addEmployee('p','owner','public'),/不可用/);
  agents[0].active=true;store.setProjectArchived('p','owner',true);
  assert.throws(()=>store.addEmployee('p','owner','public'),/归档/);
});
