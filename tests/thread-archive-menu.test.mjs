import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('prototype/009-5-patch-im.js','utf8');
const start=source.indexOf('function evaTopicMenus('),end=source.indexOf('\nfunction EvaThreadList',start);
let copied='';const browser={URL,location:{href:'http://127.0.0.1:4580/'},navigator:{clipboard:{writeText:async text=>{copied=text;}}},EvaMyAITeamGroup:{groups:()=>[{id:'my-ai-team:a'}]}};
const menu=vm.runInNewContext('('+source.slice(start,end).trim()+')',{window:browser,Toast:{success:()=>{},error:()=>{}},React:{createElement:()=>null},Link2:{},Archive:{},ArchiveRestore:{},evaRailIcon:()=>null,evaPinMenuItem:()=>({title:'置顶会话'}),evaMuteMenuItem:()=>({title:'设为免打扰'})});
const options={store:{canManageThread:()=>true},actorId:'a',group:{id:'g'},thread:{id:'t',status:2},onRename:()=>{throw new Error('不应重命名');}};
test('归档菜单只提供复制链接及有权限的恢复操作',()=>{let restored=false;const rows=menu({...options,onArchive:()=>{restored=true;}});assert.deepEqual(Array.from(rows.filter(row=>!row.separator),row=>row.title),['复制子区链接','恢复子区']);rows.at(-1).onClick();assert.equal(restored,true);assert.deepEqual(Array.from(menu({...options,canManage:()=>false}),row=>row.title),['复制子区链接']);});
test('恢复活跃后重新提供个人设置、重命名与归档',()=>{assert.deepEqual(Array.from(menu({...options,thread:{id:'t',status:1}}).filter(row=>!row.separator),row=>row.title),['置顶会话','设为免打扰','复制子区链接','重命名','归档子区']);});

test('归档链接保留普通群和 AI 小队的各自路由',async()=>{await menu(options).find(row=>row.title==='复制子区链接').onClick();assert.match(copied,/#\/messages\?evaDM=g&evaThread=t$/);await menu({...options,group:{id:'my-ai-team:a'}}).find(row=>row.title==='复制子区链接').onClick();assert.match(copied,/#\/messages\?evaIM=my-ai&evaIdentity=my-ai-team%3Aa&evaSession=t$/);});
