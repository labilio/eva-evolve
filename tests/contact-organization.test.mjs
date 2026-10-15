import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {loadIdentityEnvironment} from './helpers/identity-environment.mjs';

function setup(){
  const window={EvaAvatar:{personUri:id=>'avatar:'+id}};
  loadIdentityEnvironment(window);
  vm.runInNewContext(readFileSync('prototype/009-2-membership.js','utf8'),{window,URLSearchParams});
  const store=window.EvaMembership.create({
    actorId:'me',
    people:[
      {id:'me',name:'周远',title:'产品经理',deptFull:'吉利汽车集团/数智化中心/人工智能平台部/产品经理'},
      {id:'lin',name:'林晓',title:'算法工程师',deptFull:'吉利汽车集团/数智化中心/数据与算法部/算法工程师'},
      {id:'wu',name:'吴鹏',title:'前端研发经理',deptFull:'吉利汽车集团/研发中心/软件研发部/应用研发组/前端研发经理'},
      {id:'loose',name:'待分配',title:'专员'},
      {id:'gone',name:'已停用',title:'离职人员',deptFull:'吉利汽车集团/研发中心/离职人员',active:false},
    ],
    clones:[{id:'clone-lin',ownerId:'lin',name:'旧分身名称'}],projects:{},
  });
  vm.runInNewContext(readFileSync('prototype/009-3-contact-identities.js','utf8'),{window});
  const team={getSnapshot:()=>({identities:[]})};
  return {store,model:window.EvaContactIdentities.create(store,{team,ownerId:'me'})};
}

test('组织架构从人员组织路径投影，职务不进入部门树',()=>{
  const {model}=setup(),org=model.organization();
  assert.equal(org.totalCount,4);
  assert.equal(org.roots.length,1);
  assert.equal(org.roots[0].name,'吉利汽车集团');
  assert.equal(org.roots[0].rows.length,3,'根部门汇总所有已分配的有效联系人');
  assert.equal(org.unassignedRows.length,1);
  assert.ok(!org.nodes.some(node=>['产品经理','算法工程师','前端研发经理'].includes(node.name)),'职务不能被当作部门');
  assert.ok(!org.nodes.some(node=>node.rows.some(row=>row.person.id==='gone')),'停用联系人不能进入组织架构');
});

test('部门父子关系、直属成员和含下级成员保持唯一且可追溯',()=>{
  const {model}=setup(),org=model.organization();
  const root=org.roots[0],digital=org.nodes.find(node=>node.name==='数智化中心'),platform=org.nodes.find(node=>node.name==='人工智能平台部');
  assert.equal(digital.parentId,root.id);
  assert.equal(platform.parentId,digital.id);
  assert.deepEqual([...platform.directRows].map(row=>row.person.id),['me']);
  assert.deepEqual(new Set(digital.rows.map(row=>row.person.id)),new Set(['me','lin']));
  assert.equal(root.rows.length,new Set(root.rows.map(row=>row.person.id)).size,'同一联系人只能在部门汇总中出现一次');
  assert.equal(digital.id,'department:'+['吉利汽车集团','数智化中心'].map(encodeURIComponent).join('/'));
});

test('AI 分身跟随真人目录行，不进入组织节点或人数统计',()=>{
  const {model}=setup(),org=model.organization(),lin=org.roots[0].rows.find(row=>row.person.id==='lin');
  assert.equal(lin.personas.length,1);
  assert.equal(lin.personas[0].kind,'clone');
  assert.equal(org.totalCount,4);
  assert.ok(org.nodes.every(node=>node.rows.every(row=>row.person.kind==='human')));
});
