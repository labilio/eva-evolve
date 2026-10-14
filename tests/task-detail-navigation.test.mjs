import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createPatchedRuntime} from '../tools/build-runtime.mjs';
const source=createPatchedRuntime().source;
function setup(){
 const projects=[{id:'prod'},{id:'lab'},{id:'private'}],issues={prod:[{id:'supply-3',workspace_id:'prod',identifier:'SC-103'}],lab:[{id:'client-3',workspace_id:'lab',identifier:'CLIENT-103'}],private:[{id:'private-3',workspace_id:'private'}]};
 let current='prod',focusCount=0;const messages=[];
 const node={clientWidth:1200,getClientRects:()=>[{}]},trigger={isConnected:true,focus:()=>focusCount++};
 const location={hash:'#/messages',pathname:'/'};
 const ctx={URLSearchParams,window:{location,history:{replaceState:(_,__,url)=>{location.hash=url.slice(url.indexOf('#'));}}},document:{querySelector:selector=>{assert.equal(selector,'.eva-task-outlet');return node;},activeElement:trigger},React:{cloneElement:(el,props)=>({...el,props:{...el.props,...props}})},Toast:{error:message=>messages.push(message)},loadSpaces:()=>projects,ISSUES_BY_SPACE:issues,currentSpaceId:()=>current,evaTaskProjectId:p=>p.id,issuesOf:pid=>issues[pid],evaMembers:()=>({store:{actorId:()=> 'actor',canRead:id=>id!=='private'}})};
 for(const [start,end] of [['function evaTaskRecord(','function evaTaskDetailContext('],['function evaTaskNavigation(','function EvaTaskDetailHost(']]){
  const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);vm.runInNewContext(source.slice(a,b),ctx);
 }
 const nav=ctx.evaTaskNavigation(),open=id=>nav.open({props:{issueId:id}});
 return{ctx,nav,open,messages,location,setCurrent:id=>{current=id;},focused:()=>focusCount};
}
test('所有任务入口共享一个导航栈，跨项目不切换来源项目，重复引用复用原详情',()=>{
 const s=setup();s.open('supply-3');s.nav.toggle();s.open('client-3');
 assert.equal(s.ctx.currentSpaceId(),'prod');assert.equal(s.location.hash,'#/messages');
 assert.equal(s.nav.getSnapshot().layers.length,2);assert.equal(s.nav.getSnapshot().expanded,true);
 s.open('supply-3');assert.equal(s.nav.getSnapshot().layers.length,1,'返回已在链路中的任务不创建重复层');
 s.nav.close();assert.equal(s.nav.getSnapshot().layers.length,0);assert.equal(s.focused(),1);
});
test('不可访问或失效任务不覆盖当前详情，任务数据由自身项目确定',()=>{
 const s=setup();s.open('supply-3');assert.equal(s.open('private-3'),false);assert.equal(s.open('missing'),false);
 assert.equal(s.nav.getSnapshot().layers[0].props.issueId,'supply-3');assert.equal(s.messages.length,2);
 assert.deepEqual(Array.from(s.ctx.evaTaskRowsFor('client-3'),x=>x.id),['client-3']);
 assert.equal(s.ctx.evaTaskProjectFor('client-3').id,'lab');
 s.setCurrent('lab');assert.equal(s.ctx.evaTaskRecord('supply-3').workspace_id,'prod','稳定 ID 查询不依赖背景项目');
 assert.equal(s.ctx.evaTaskRecord('SC-103'),null,'旧编号查询仍限定当前项目');
});
test('父子任务替换保留全屏与来源；关闭旧来源不吞掉新页面的直接链接',()=>{
 const s=setup();s.open('supply-3');s.nav.toggle();s.nav.open({props:{issueId:'client-3'}},true);
 assert.equal(s.nav.getSnapshot().layers.length,1);assert.equal(s.nav.getSnapshot().expanded,true);
 s.location.hash='#/collab?evaProject=lab&evaTab=tasks&evaTask=client-3';s.nav.close();
 assert.ok(s.location.hash.includes('evaTask=client-3'));
 s.open('client-3');s.nav.close();assert.equal(s.location.hash,'#/collab?evaProject=lab&evaTab=tasks');
});
