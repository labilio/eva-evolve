import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createPatchedRuntime} from '../tools/build-runtime.mjs';
const runtime=createPatchedRuntime().source;
const commands=[['createSkill','updateSkill',[{name:'new-skill'}]],['updateSkill','deleteSkill',['skill',{name:'changed'}]],['deleteSkill','importSkill',['skill']],['createAgent','updateAgent',[{name:'new'}]],['updateAgent','archiveAgent',['agent',{name:'changed'}]],['archiveAgent','restoreAgent',['agent']],['restoreAgent','listRuntimesForAgent',['agent']],['createSquad','updateSquad',[{name:'new'}]],['updateSquad','deleteSquad',['squad',{name:'changed'}]],['deleteSquad','addSquadMember',['squad']],['addSquadMember','removeSquadMember',['squad',{member_id:'member'}]],['removeSquadMember','updateSquadMemberRole',['squad','member']]];
for(const [name,next,args] of commands)test('归档项目禁止 '+name+' 修改项目配置',async()=>{
 const rows=[{id:'skill',name:'existing'},{id:'agent',name:'existing'},{id:'squad',name:'existing',members:[{member_id:'member'}],member_count:1}];
 const before=JSON.stringify(rows),ctx={currentSpaceId:()=> 'prod',evaMembers:()=>({store:{isProjectArchived:id=>id==='prod'}}),skillsOf:()=>rows,agentsOf:()=>rows,squadsOf:()=>rows,AGENTS:rows,SQUADS:rows,isValidSkillName:()=>true,crypto:{randomUUID:()=> 'new'}};
 const a=runtime.indexOf(name+'='),b=runtime.indexOf(','+next+'=',a);assert.ok(a>=0&&b>a);
 vm.runInNewContext('var '+runtime.slice(a,b),ctx);
 await assert.rejects(Promise.resolve().then(()=>ctx[name](...args)),/已归档/);
 assert.equal(JSON.stringify(rows),before);
});
