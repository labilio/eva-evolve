import {loadIdentityEnvironment} from './helpers/identity-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function setup(){const window={};loadIdentityEnvironment(window);for(const file of ['009-2-membership.js','009-1-file-sharing.js'])vm.runInNewContext(fs.readFileSync(new URL('../prototype/'+file,import.meta.url),'utf8'),{window});const members=window.EvaMembership.create({people:[{id:'a'},{id:'b'},{id:'c'}]});members.createProject('p','项目','a',[]);members.addMember('p','a','b');members.createGroup('g','工作群','p','a',[]);return {members,files:window.EvaFileSharing.create(members),sharing:window.EvaFileSharing};}
test('转存形成项目共享版本，项目成员能读文件但不能读来源群',()=>{const {members,files}=setup();const file={name:'分析报告.pdf',size:1024,extension:'pdf',version:2};const source={groupId:'g',groupName:'工作群',threadId:null,taskId:'SC-103'};const id=files.transfer('a','p',file,source);assert.equal(files.list('p','b').length,1);assert.equal(files.list('p','b')[0].sourceVersion,2);assert.equal(members.canRead('g','b'),false);assert.equal(files.list('p','c').length,0);assert.equal(files.transfer('a','p',file,source),id);assert.equal(files.list('p','a').length,1);});
test('不在来源群或目标项目不能转存，移出项目后失去共享文件访问',()=>{const {members,files}=setup();const file={name:'报告.pdf'};assert.throws(()=>files.transfer('b','p',file,{groupId:'g'}));members.createProject('other','另一个项目','c',[]);assert.throws(()=>files.transfer('a','other',file,{groupId:'g'}));files.transfer('a','p',file,{groupId:'g'});members.remove('p','a','b');assert.equal(files.list('p','b').length,0);});
test('项目文件列表适配保留结构化来源与共享版本',async()=>{const {createPatchedRuntime}=await import('../tools/build-runtime.mjs');const {source}=createPatchedRuntime();const start=source.indexOf('toEntry=rt=>('),end=source.indexOf(',FilesView=',start);assert.ok(start>=0&&end>start);const adapt=vm.runInNewContext('('+source.slice(start+'toEntry='.length,end)+')');const entry=adapt({id:'shared-1',name:'报告.pdf',source:{groupId:'g',groupName:'质量群'},sourceVersion:2,sharedVersion:true});assert.equal(entry.source.groupName,'质量群');assert.equal(entry.sourceVersion,2);assert.equal(entry.sharedVersion,true);});
test('项目团队文件复用文件库组件并移除旧筛选和旧上传文案',async()=>{const {createPatchedRuntime}=await import('../tools/build-runtime.mjs');const {source}=createPatchedRuntime();assert.match(source,/FilesView=\(\)=>window\.EvaProjectFilesUI\.render/);const ui=fs.readFileSync(new URL('../prototype/009-1-project-files-ui.js',import.meta.url),'utf8');assert.match(ui,/搜索当前项目/);assert.match(ui,/上传本地文件/);assert.match(ui,/eva-file-detail-dialog/);assert.match(ui,/'aria-labelledby':titleId/);assert.doesNotMatch(ui,/eva-project-files__inspector|TYPE_PILLS|搜索云盘文件|Owner · 项目负责人/);const entry=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(entry.indexOf('prototype\/009-1-project-files-ui.js')<entry.indexOf('vendor\/eva-runtime.module.js'));});
test('文件库在当前空间新建文件夹时不再选择所属空间',()=>{
  const source=fs.readFileSync(new URL('../prototype/020-mode-layer.js',import.meta.url),'utf8');
  const dialogStart=source.indexOf('  function dialogHTML()'),dialogEnd=source.indexOf('  function filePreviewFixture(',dialogStart);
  const state={dialog:{type:'new-folder',spaceId:'p'},parentId:'folder-a',selectedId:null};
  const sandbox={state,fileActor:()=> 'a',fileContext:()=>({files:{snapshot:()=>[]}})};
  const html=vm.runInNewContext(source.slice(dialogStart,dialogEnd)+';dialogHTML();',sandbox);
  assert.match(html,/文件夹名称/);
  assert.doesNotMatch(html,/所属空间|eva-drive-dialog-space/);

  const confirmStart=source.indexOf('  function confirmDialog()'),confirmEnd=source.indexOf('  function bridgeSelectedResource()',confirmStart);
  let created;
  vm.runInNewContext(source.slice(confirmStart,confirmEnd)+';confirmDialog();',{
    state,
    fileActor:()=> 'a',
    scopeSpaceId:()=> 'p',
    fileContext:()=>({files:{snapshot:()=>[],createFolder:(...args)=>{created=args;return 'folder-new';}}}),
    document:{getElementById:id=>id==='eva-drive-dialog-name'?{value:'项目资料'}:id==='eva-drive-dialog-space'?{value:'other'}:null},
    renderDrive:()=>{},
    showToast:()=>{}
  });
  assert.deepEqual(created,['a','p','项目资料','folder-a']);
  assert.equal(state.selectedId,'folder-new');
});
test('文件库移除左侧搜索并在两个入口展示完整创建时间',()=>{
  const drive=fs.readFileSync(new URL('../prototype/020-mode-layer.js',import.meta.url),'utf8');
  const project=fs.readFileSync(new URL('../prototype/009-1-project-files-ui.js',import.meta.url),'utf8');
  const driveHTMLStart=drive.indexOf('  function driveHTML('),driveHTMLEnd=drive.indexOf('  function renderDrive()',driveHTMLStart);
  const driveHTML=drive.slice(driveHTMLStart,driveHTMLEnd);
  assert.doesNotMatch(driveHTML,/data-drive-search="side"|搜索当前范围/);
  assert.match(driveHTML,/data-drive-search="main"[^>]*placeholder="搜索当前位置"/);

  const driveTimeStart=drive.indexOf('  function formatDriveTime('),driveTimeEnd=drive.indexOf('  function scopeSpaceId()',driveTimeStart);
  const projectTimeStart=project.indexOf('    const time=value=>'),projectTimeEnd=project.indexOf('\n\n    function Dialog',projectTimeStart);
  const value='2026-09-07T17:35:00';
  assert.equal(vm.runInNewContext(drive.slice(driveTimeStart,driveTimeEnd)+';formatDriveTime("'+value+'")'),'2026-09-07 17:35');
  assert.equal(vm.runInNewContext(project.slice(projectTimeStart,projectTimeEnd)+';time("'+value+'")'),'2026-09-07 17:35');
});
test('Editor 可整理和上传项目文件，但不能删除、查看或恢复回收站',()=>{const {members,files}=setup();files.createFolder('b','p','成员资料');files.upload('b','p',{name:'本地清单.xlsx',size:2048});const uploaded=files.list('p','b').find(item=>item.name==='本地清单.xlsx');files.rename('b',uploaded.id,'本地清单-更新.xlsx');files.copy('b',uploaded.id);assert.equal(files.role('p','b'),'editor');assert.equal(files.can('move','p','b'),true);assert.equal(files.can('trash','p','b'),false);assert.equal(files.can('view-trash','p','b'),false);assert.throws(()=>files.trash('b',uploaded.id));assert.throws(()=>files.trashList('p','b'));});
test('Owner 与 Manager 可管理回收站，只有 Owner 可转移空间所有权',()=>{const {members,files}=setup();members.addMember('p','a','c');members.setAdmin('p','a','c',true);files.upload('c','p',{name:'管理员上传.pdf',size:1024});const item=files.list('p','c').find(entry=>entry.name==='管理员上传.pdf');files.trash('c',item.id);assert.equal(files.trashList('p','c').length,1);files.restore('c',item.id);assert.equal(files.list('p','c').some(entry=>entry.id===item.id),true);assert.equal(files.can('manage-members','p','c'),true);assert.equal(files.can('transfer-ownership','p','c'),false);assert.equal(files.can('transfer-ownership','p','a'),true);});
test('Editor 即使知道回收站记录 ID 也不能直接恢复或永久删除',()=>{
  const {files}=setup();
  const fileId=files.upload('a','p',{name:'管理员删除.pdf',size:1});
  files.trash('a',fileId);
  assert.throws(()=>files.restore('b',fileId),/当前角色无此操作权限/);
  assert.throws(()=>files.removeForever('b',fileId),/当前角色无此操作权限/);
  assert.ok(files.snapshot().find(item=>item.id===fileId));
});
test('删除文件夹形成单一回收站条目，禁止单独恢复随文件夹删除的子项',()=>{
  const {files}=setup();
  const folderId=files.createFolder('a','p','交付资料');
  const nestedFolderId=files.createFolder('a','p','合同',folderId);
  const fileId=files.upload('a','p',{name:'合同.pdf',size:10},nestedFolderId);
  files.trash('a',folderId);
  const trash=files.trashList('p','a');
  assert.equal(trash.length,1);
  assert.equal(trash[0].id,folderId);
  assert.equal(trash[0].trashedItemCount,2);
  assert.throws(()=>files.restore('a',fileId),/请恢复整个文件夹/);
  const result=files.restore('a',folderId);
  assert.equal(JSON.stringify(result),JSON.stringify({restoredToRoot:false,parentId:0,restoredCount:3}));
  assert.equal(files.list('p','a').filter(item=>[folderId,nestedFolderId,fileId].includes(item.id)).length,3);
});
test('独立删除项的原父目录不可用时恢复到空间根目录',()=>{
  const {files}=setup();
  const parentId=files.createFolder('a','p','旧目录');
  const fileId=files.upload('a','p',{name:'需保留.pdf',size:10},parentId);
  files.trash('a',fileId);
  const firstDeletion=files.snapshot().find(item=>item.id===fileId);
  files.trash('a',parentId);
  const afterParentDeletion=files.snapshot().find(item=>item.id===fileId);
  assert.equal(afterParentDeletion.deletionBatchId,firstDeletion.deletionBatchId);
  assert.equal(afterParentDeletion.trashRootId,fileId);
  assert.equal(afterParentDeletion.directTrash,true);
  files.removeForever('a',parentId);
  assert.equal(files.trashList('p','a').some(item=>item.id===fileId),true);
  const result=files.restore('a',fileId);
  assert.equal(JSON.stringify(result),JSON.stringify({restoredToRoot:true,parentId:0,restoredCount:1}));
  assert.equal(files.list('p','a').find(item=>item.id===fileId).parent_id,0);
});
test('永久删除旧回收站目录不会删除已恢复的活跃子项',()=>{
  const {members,sharing}=setup();
  const files=sharing.create(members,[
    {id:'legacy-folder',spaceId:'p',projectId:'p',area:'project',parent_id:0,name:'已删除目录',type:'folder',size:0,deletedAt:'2026-09-01T10:00:00+08:00',originalParentId:0},
    {id:'restored-file',spaceId:'p',projectId:'p',area:'project',parent_id:'legacy-folder',name:'已恢复.pdf',type:'blob',size:1}
  ]);
  files.removeForever('a','legacy-folder');
  const restored=files.snapshot().find(item=>item.id==='restored-file');
  assert.ok(restored);
  assert.equal(restored.parent_id,0);
});
test('Manager 永久删除文件夹整批回收站项且保留已恢复的活跃子项',()=>{
  const {members,sharing}=setup();
  members.addMember('p','a','c');
  members.setAdmin('p','a','c',true);
  const deletedAt='2026-09-01T10:00:00+08:00',batchId='trash:manager-folder:batch';
  const files=sharing.create(members,[
    {id:'manager-folder',spaceId:'p',projectId:'p',area:'project',parent_id:0,name:'整批删除',type:'folder',size:0,deletedAt,deletionBatchId:batchId,trashRootId:'manager-folder',directTrash:true,originalParentId:0},
    {id:'manager-deleted-child',spaceId:'p',projectId:'p',area:'project',parent_id:'manager-folder',name:'待永久删除.pdf',type:'blob',size:1,deletedAt,deletionBatchId:batchId,trashRootId:'manager-folder',directTrash:false,originalParentId:'manager-folder'},
    {id:'manager-restored-child',spaceId:'p',projectId:'p',area:'project',parent_id:'manager-folder',name:'已恢复.pdf',type:'blob',size:1}
  ]);
  assert.equal(files.removeForever('c','manager-folder').removedCount,2);
  assert.equal(files.snapshot().some(item=>item.id==='manager-folder'||item.id==='manager-deleted-child'),false);
  const active=files.snapshot().find(item=>item.id==='manager-restored-child');
  assert.ok(active);
  assert.equal(active.parent_id,0);
});
test('旧数据中的文件夹删除树也仅展示根项并整体恢复',()=>{
  const {members,sharing}=setup();
  const deletedAt='2026-09-01T10:00:00+08:00';
  const files=sharing.create(members,[
    {id:'legacy-root',spaceId:'p',projectId:'p',area:'project',parent_id:0,name:'旧资料',type:'folder',size:0,deletedAt,originalParentId:0},
    {id:'legacy-child',spaceId:'p',projectId:'p',area:'project',parent_id:'legacy-root',name:'旧文件.pdf',type:'blob',size:1,deletedAt,originalParentId:'legacy-root'}
  ]);
  assert.equal(JSON.stringify(files.trashList('p','a').map(item=>item.id)),JSON.stringify(['legacy-root']));
  assert.throws(()=>files.restore('a','legacy-child'),/请恢复整个文件夹/);
  assert.equal(files.restore('a','legacy-root').restoredCount,2);
  assert.equal(files.list('p','a').length,2);
});
test('恢复位置已有同名文件时自动增加可递增的已恢复后缀',()=>{
  const {files}=setup();
  const firstId=files.upload('a','p',{name:'报告.pdf',size:1});
  files.trash('a',firstId);
  files.upload('a','p',{name:'报告.pdf',size:2});
  files.restore('a',firstId);
  assert.equal(files.snapshot().find(item=>item.id===firstId).name,'报告（已恢复）.pdf');

  const secondId=files.upload('a','p',{name:'清单.xlsx',size:1});
  files.trash('a',secondId);
  files.upload('a','p',{name:'清单.xlsx',size:2});
  files.upload('a','p',{name:'清单（已恢复）.xlsx',size:3});
  files.restore('a',secondId);
  assert.equal(files.snapshot().find(item=>item.id===secondId).name,'清单（已恢复 2）.xlsx');
});
test('个人和项目空间都按单一删除单元处理文件夹',()=>{
  const {files}=setup();
  for(const [spaceId,actor] of [['personal:a','a'],['p','a']]){
    const folderId=files.createFolder(actor,spaceId,'空间资料');
    const fileId=files.upload(actor,spaceId,{name:'子文件.pdf',size:1},folderId);
    files.trash(actor,folderId);
    const trash=files.trashList(spaceId,actor);
    assert.equal(trash.length,1);
    assert.equal(trash[0].id,folderId);
    assert.equal(trash[0].trashedItemCount,1);
    assert.equal(files.restore(actor,folderId).restoredCount,2);
    assert.equal(files.list(spaceId,actor).some(item=>item.id===fileId),true);
  }
});
test('异常跨空间 parent_id 不会扩大复制、删除、迁移或永久删除范围',()=>{
  const {members,sharing}=setup();
  const deletedAt='2026-09-01T10:00:00+08:00',batchId='shared-batch-id';
  const files=sharing.create(members,[
    {id:'project-root',spaceId:'p',projectId:'p',area:'project',parent_id:0,name:'项目目录',type:'folder',size:0},
    {id:'foreign-active',spaceId:'personal:a',projectId:null,area:'personal',parent_id:'project-root',name:'个人文件.pdf',type:'blob',size:1},
    {id:'deleted-root',spaceId:'p',projectId:'p',area:'project',parent_id:0,name:'待永久删除',type:'folder',size:0,deletedAt,deletionBatchId:batchId,trashRootId:'deleted-root',directTrash:true,originalParentId:0},
    {id:'foreign-deleted',spaceId:'personal:a',projectId:null,area:'personal',parent_id:'deleted-root',name:'不得删除.pdf',type:'blob',size:1,deletedAt,deletionBatchId:batchId,trashRootId:'deleted-root',directTrash:false,originalParentId:'deleted-root'},
    {id:'foreign-restored',spaceId:'personal:a',projectId:null,area:'personal',parent_id:'deleted-root',name:'不得重挂.pdf',type:'blob',size:1}
  ]);
  const personalCount=files.list('personal:a','a').length;
  files.copy('a','project-root');
  assert.equal(files.list('personal:a','a').length,personalCount);
  files.trash('a','project-root');
  assert.equal(files.snapshot().find(item=>item.id==='foreign-active').deletedAt,undefined);
  assert.equal(files.trashList('p','a').find(item=>item.id==='project-root').trashedItemCount,0);
  assert.equal(files.trashList('p','a').find(item=>item.id==='deleted-root').trashedItemCount,0);
  files.removeForever('a','deleted-root');
  const snapshot=files.snapshot();
  assert.ok(snapshot.find(item=>item.id==='foreign-deleted'));
  assert.equal(snapshot.find(item=>item.id==='foreign-restored').parent_id,'deleted-root');
});
test('旧回收站数据迁移不会将跨空间同 parent_id 记录并入同一删除批次',()=>{
  const {members,sharing}=setup();
  const deletedAt='2026-09-01T10:00:00+08:00';
  const files=sharing.create(members,[
    {id:'legacy-project-root',spaceId:'p',projectId:'p',area:'project',parent_id:0,name:'项目旧目录',type:'folder',size:0,deletedAt,originalParentId:0},
    {id:'legacy-foreign',spaceId:'personal:a',projectId:null,area:'personal',parent_id:'legacy-project-root',name:'个人旧文件.pdf',type:'blob',size:1,deletedAt,originalParentId:'legacy-project-root'}
  ]);
  const projectRoot=files.trashList('p','a')[0],personalRoot=files.trashList('personal:a','a')[0];
  assert.equal(projectRoot.trashedItemCount,0);
  assert.equal(personalRoot.id,'legacy-foreign');
  assert.notEqual(projectRoot.deletionBatchId,personalRoot.deletionBatchId);
});
test('Owner、Manager 与 Editor 都有下载权限',()=>{const {members,files}=setup();members.addMember('p','a','c');members.setAdmin('p','a','c',true);assert.equal(files.can('download','p','a'),true);assert.equal(files.can('download','p','c'),true);assert.equal(files.can('download','p','b'),true);});
test('移动和复制只能发生在同一空间',()=>{const {members,files}=setup();members.createProject('other','其他项目','a',[]);const folderId=files.createFolder('a','p','项目内文件夹');files.upload('a','p',{name:'报告.pdf',size:10});const item=files.list('p','a').find(entry=>entry.name==='报告.pdf');files.move('a',item.id,folderId);const otherFolder=files.createFolder('a','other','其他空间文件夹');assert.throws(()=>files.move('a',item.id,otherFolder));assert.throws(()=>files.copy('a',item.id,otherFolder));});
test('项目专家和项目专员按 Editor 写入任务产出，文件仍归属项目空间',()=>{const {files}=setup();const actor='project-agent:p';assert.equal(files.role('p',actor),'editor');files.upload(actor,'p',{name:'任务总结.md',size:120});const output=files.list('p','a').find(entry=>entry.name==='任务总结.md');assert.equal(output.projectId,'p');assert.equal(output.creator,'项目 · 项目管家');assert.equal(files.can('trash','p',actor),false);});
test('文件条目只按文件夹优先和创建时间排序，不再暴露文件置顶状态或 API',()=>{const {members,sharing}=setup();const files=sharing.create(members,[{id:'older',spaceId:'p',projectId:'p',area:'project',parent_id:0,name:'较早报告.pdf',type:'blob',size:1,createdAt:'2026-09-08T09:00:00.000Z'},{id:'folder',spaceId:'p',projectId:'p',area:'project',parent_id:0,name:'资料夹',type:'folder',size:0,createdAt:'2026-09-08T08:00:00.000Z'},{id:'newer',spaceId:'p',projectId:'p',area:'project',parent_id:0,name:'较新报告.pdf',type:'blob',size:1,createdAt:'2026-09-08T10:00:00.000Z'}]);const order=files.sortEntries(files.list('p','a')).map(item=>item.id);assert.equal(JSON.stringify(order),JSON.stringify(['folder','newer','older']));assert.equal('pinned' in files.list('p','a')[0],false);for(const name of ['isPinned','setPinned','togglePinned','pinnedFiles'])assert.equal(typeof files[name],'undefined');});
test('共享空间记录、默认数据与管理 API 已从文件数据层移除',()=>{const {members,sharing}=setup();const files=sharing.create(members,[{id:'shared-file',spaceId:'shared:test',area:'shared',name:'旧共享文件.pdf',type:'blob',size:1},{id:'project-file',spaceId:'p',projectId:'p',area:'project',name:'项目文件.pdf',type:'blob',size:1}]);assert.equal(files.snapshot().some(item=>item.id==='shared-file'),false);assert.equal(files.snapshot().some(item=>item.id==='project-file'),true);assert.equal(files.role('shared:test','a'),null);assert.equal(files.list('shared:test','a').length,0);assert.equal(JSON.stringify(files.writableSpaces('a').map(item=>item.kind)),JSON.stringify(['personal','project']));assert.equal('DEFAULT_SHARED_SPACES' in sharing,false);for(const name of ['sharedSpaces','sharedSpace','sharedMembers','sharedMemberCandidates','addSharedMember','removeSharedMember','createSharedSpace','updateSharedSpace','setSharedMemberRole','transferSharedOwnership'])assert.equal(typeof files[name],'undefined');});
test('v6 文件数据升级到 v7 时丢弃共享空间记录并清除旧文件置顶偏好',()=>{const values=new Map([['eva:file-store:v6',JSON.stringify({schema:6,records:[{id:'shared-file',spaceId:'shared:test',area:'shared',name:'旧共享文件.pdf',type:'blob',size:1},{id:'project-file',spaceId:'p',projectId:'p',area:'project',name:'项目文件.pdf',type:'blob',size:1}],sharedSpaces:[{id:'shared:test'}],externalLinksDemoV1:true})],['eva:file-pins:v1',JSON.stringify({schema:1,pins:[{actorId:'a',fileId:'project-file',pinnedAt:'2026-09-08T10:00:00.000Z'}]})]]);const localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};const window={localStorage};loadIdentityEnvironment(window);for(const file of ['009-2-membership.js','009-1-file-sharing.js'])vm.runInNewContext(fs.readFileSync(new URL('../prototype/'+file,import.meta.url),'utf8'),{window});const members=window.EvaMembership.create({people:[{id:'a'}]});members.createProject('p','项目','a',[]);const files=window.EvaFileSharing.bootstrap(members);const saved=JSON.parse(values.get('eva:file-store:v7'));assert.equal(saved.schema,7);assert.equal(saved.records.some(item=>item.id==='shared-file'),false);assert.equal(saved.records.some(item=>item.id==='project-file'),true);assert.equal(files.snapshot().some(item=>item.area==='shared'),false);assert.equal(values.has('eva:file-pins:v1'),false);});
test('文件类型由扩展名自动识别，三种角色均可编辑标签但不能改系统关联',()=>{const {files}=setup();const id=files.transfer('a','p',{name:'交付报告.pdf',category:'deliverable',tags:['交付']},{groupId:'g',groupName:'工作群',taskId:'SC-103'});const before=files.snapshot().find(item=>item.id===id);assert.equal(before.category,undefined);assert.equal(files.fileTypeFor(before,'b'),'PDF');assert.equal(before.systemRelations.length,2);files.updateTags('b',id,'合规，归档，合规');const after=files.snapshot().find(item=>item.id===id);assert.equal(JSON.stringify(after.tags),JSON.stringify(['合规','归档']));assert.equal(JSON.stringify(after.systemRelations),JSON.stringify(before.systemRelations));assert.equal(files.can('edit-tags','p','b'),true);});
test('文件类型覆盖常见本地格式且文件夹单独标记',()=>{const {files}=setup();for(const [name,label] of [['说明.docx','Word'],['清单.xlsx','Excel'],['汇报.pptx','PPT'],['海报.png','图片'],['录音.mp3','音频'],['演示.mp4','视频'],['归档.zip','压缩包'],['说明.md','文本'],['数据.bin','BIN']]){const id=files.upload('a','p',{name,size:1});assert.equal(files.fileTypeFor(id,'a'),label);}const folderId=files.createFolder('a','p','资料');assert.equal(files.fileTypeFor(folderId,'a'),'文件夹');});
test('可跨空间创建文件快捷方式，快捷方式不复制标签且不能嵌套或重复创建',()=>{const {members,files}=setup();members.createProject('other','其他项目','a',[]);const sourceId=files.upload('b','p',{name:'交付报告.pdf',size:128});files.updateTags('b',sourceId,['交付','正式']);const targets=files.writableSpaces('b','p');assert.equal(JSON.stringify(targets.map(item=>item.id)),JSON.stringify(['personal:b']));const shortcutId=files.createShortcut('b',sourceId,'personal:b');const shortcut=files.list('personal:b','b').find(item=>item.id===shortcutId);assert.equal(shortcut.type,'shortcut');assert.equal(shortcut.size,128);assert.equal(files.fileTypeFor(shortcut,'b'),'PDF · 快捷方式');assert.equal(JSON.stringify(shortcut.tags),JSON.stringify([]));assert.equal(files.relationsFor(shortcut,'b')[0].id,sourceId);files.updateTags('b',shortcutId,['个人引用']);assert.equal(JSON.stringify(files.snapshot().find(item=>item.id===sourceId).tags),JSON.stringify(['交付','正式']));assert.equal(JSON.stringify(files.snapshot().find(item=>item.id===shortcutId).tags),JSON.stringify(['个人引用']));assert.throws(()=>files.createShortcut('b',sourceId,'personal:b'));assert.throws(()=>files.createShortcut('b',shortcutId,'p'));assert.throws(()=>files.copy('b',shortcutId));const folderId=files.createFolder('b','p','资料');assert.throws(()=>files.createShortcut('b',folderId,'personal:b'));});
test('快捷方式每次打开都校验源权限，失去权限后不泄露源文件信息',()=>{const {members,files}=setup();members.createProject('target','目标项目','a',[]);members.addMember('target','a','b');const sourceId=files.upload('a','p',{name:'保密方案.docx',size:2048});const shortcutId=files.createShortcut('a',sourceId,'target');assert.equal(files.resolveFile(shortcutId,'b').id,sourceId);members.remove('p','a','b');const shortcut=files.list('target','b').find(item=>item.id===shortcutId);assert.equal(shortcut.name,'无权访问的快捷方式');assert.equal(shortcut.size,0);assert.equal(shortcut.sourceAvailable,false);assert.doesNotMatch(JSON.stringify(shortcut),/保密方案/);assert.equal(files.shortcutInfo(shortcutId,'b').status,'forbidden');assert.throws(()=>files.resolveFile(shortcutId,'b'));
});
test('源文件重命名同步默认快捷方式，自定义快捷方式名称保持不变',()=>{const {files}=setup();const sourceId=files.upload('a','p',{name:'方案-v1.docx',size:1});const shortcutId=files.createShortcut('a',sourceId,'personal:a');files.rename('a',sourceId,'方案-v2.docx');assert.equal(files.list('personal:a','a').find(item=>item.id===shortcutId).name,'方案-v2.docx');files.rename('a',shortcutId,'我的常用方案');files.rename('a',sourceId,'方案-v3.docx');assert.equal(files.list('personal:a','a').find(item=>item.id===shortcutId).name,'我的常用方案');});
test('源文件进入回收站后快捷方式显示失效且不可打开',()=>{const {files}=setup();const sourceId=files.upload('a','p',{name:'即将删除.pdf',size:1});const shortcutId=files.createShortcut('a',sourceId,'personal:a');files.trash('a',sourceId);const shortcut=files.list('personal:a','a').find(item=>item.id===shortcutId);assert.equal(shortcut.name,'源文件已失效');assert.equal(files.shortcutInfo(shortcutId,'a').status,'missing');assert.throws(()=>files.resolveFile(shortcutId,'a'));});
test('没有来源群权限时仍可读项目副本，但系统关联和产生方式不泄露群信息',()=>{const {files}=setup();const id=files.transfer('a','p',{name:'群文件.pdf'},{groupId:'g',groupName:'工作群'});const item=files.list('p','b').find(entry=>entry.id===id);assert.equal(files.sourceLabelFor(item,'b'),'从群聊保存');assert.equal(files.relationsFor(item,'b')[0].label,'来源群聊');assert.equal(files.relationsFor(item,'b')[0].restricted,true);assert.doesNotMatch(JSON.stringify(item),/工作群|\"g\"/);assert.equal(files.relationsFor(id,'a')[0].label,'工作群');});
test('创建副本继承业务关联并自动增加来源文件关联',()=>{const {files}=setup();const id=files.transfer('a','p',{name:'任务交付物.docx',tags:['交付']},{groupId:'g',groupName:'工作群',taskId:'T-1'});const copyId=files.copy('a',id);const copied=files.snapshot().find(item=>item.id===copyId);assert.ok(copied.systemRelations.some(item=>item.type==='task'&&item.inherited));assert.ok(copied.systemRelations.some(item=>item.type==='file'&&item.id===id));assert.equal(JSON.stringify(copied.tags),JSON.stringify(['交付']));assert.ok(copied.createdAt);});
test('旧数据中的业务类别和执行过程关联在加载时被移除',()=>{const {members,sharing}=setup();const files=sharing.create(members,[{id:'legacy',spaceId:'p',projectId:'p',area:'project',parent_id:0,name:'旧文件.pdf',type:'blob',size:1,category:'deliverable',systemRelations:[{type:'task',id:'T-1',label:'任务 T-1'},{type:'run',id:'run-1',label:'第 1 次执行'}]}]);const item=files.snapshot()[0];assert.equal(item.category,undefined);assert.equal(item.systemRelations.length,1);assert.equal(item.systemRelations[0].type,'task');});
test('两个文件入口统一展示文件类型、标签和只读系统关联，并提供快捷方式入口',()=>{const drive=fs.readFileSync(new URL('../prototype/020-mode-layer.js',import.meta.url),'utf8');const project=fs.readFileSync(new URL('../prototype/009-1-project-files-ui.js',import.meta.url),'utf8');for(const source of [drive,project]){assert.match(source,/名称/);assert.match(source,/文件类型/);assert.match(source,/关联内容/);assert.match(source,/大小/);assert.match(source,/创建信息/);assert.match(source,/标签/);assert.match(source,/创建快捷方式/);assert.match(source,/系统关联/);assert.match(source,/只读/);assert.doesNotMatch(source,/执行过程|添加关联|管理关联内容|<span>类别<\/span>|<span>最后编辑者<\/span>|<span>修改时间<\/span>/);}});
test('两个文件入口点击文件名直接预览，操作列通过三点菜单打开详情及其他操作',()=>{const drive=fs.readFileSync(new URL('../prototype/020-mode-layer.js',import.meta.url),'utf8');const project=fs.readFileSync(new URL('../prototype/009-1-project-files-ui.js',import.meta.url),'utf8');assert.match(drive,/data-drive-action="[^\n]*preview/);assert.match(project,/openPreview\(item\)/);assert.match(drive,/data-drive-action="row-menu"/);assert.match(project,/aria-haspopup':'menu'/);for(const source of [drive,project]){assert.match(source,/更多操作/);assert.match(source,/查看文件信息/);assert.match(source,/eva-drive__row-menu/);assert.doesNotMatch(source,/查看文档详情|查看文件操作/);}});
test('两个文件入口为有权限的正常文件和有效快捷方式提供下载，文件夹与回收站不提供',()=>{const drive=fs.readFileSync(new URL('../prototype/020-mode-layer.js',import.meta.url),'utf8');const project=fs.readFileSync(new URL('../prototype/009-1-project-files-ui.js',import.meta.url),'utf8');const samples=fs.readFileSync(new URL('../prototype/009-1-data-drive.js',import.meta.url),'utf8');for(const source of [drive,project]){assert.match(source,/files\.can\('download'/);assert.match(source,/canDownload\s*=\s*[^;\n]*type\s*!==\s*'folder'[^;\n]*canOpen[^;\n]*files\.can\('download'/);assert.match(source,/type\s*===\s*'folder'[^\n]*deletedAt[^\n]*files\.can\('download'/);}assert.match(samples,/__EVA_FILE_DOWNLOAD_FALLBACK_URL/);assert.match(drive,/rowMenuItemHTML\('download',\s*'下载'/);assert.match(drive,/data-drive-action="download"/);assert.match(drive,/function downloadDriveFile\(/);assert.match(drive,/files\.list\(resource\.spaceId, actor\)/);assert.match(drive,/anchor\.download\s*=\s*target\.name/);assert.match(drive,/name === 'download'[^\n]*downloadDriveFile\(resource\)/);assert.match(project,/files\.list\(item\.spaceId,actor\)/);assert.match(project,/menuButton\('下载'/);assert.match(project,/onClick:\(\)=>download\(selected\)/);});
test('两个文件入口用右侧栏预览、用弹窗展示文件详情',()=>{const drive=fs.readFileSync(new URL('../prototype/020-mode-layer.js',import.meta.url),'utf8');const project=fs.readFileSync(new URL('../prototype/009-1-project-files-ui.js',import.meta.url),'utf8');const styles=fs.readFileSync(new URL('../prototype/050-file-library.css',import.meta.url),'utf8');for(const source of [drive,project]){assert.match(source,/eva-file-preview-sidebar/);assert.match(source,/eva-file-detail-dialog/);assert.doesNotMatch(source,/eva-drive-preview-dialog|eva-project-files__inspector/);}assert.match(drive,/!event\.target\.closest\('\.eva-file-preview-sidebar'\)/);assert.match(project,/document\.addEventListener\('pointerdown',closePreviewOutside/);assert.match(project,/document\.addEventListener\('keydown',closePreviewOnKey/);assert.match(styles,/\.eva-file-preview-sidebar\s*\{[\s\S]*?right:\s*0;[\s\S]*?width:\s*min\(560px,/);assert.match(styles,/\.eva-file-detail-dialog__panel\s*\{[\s\S]*?width:\s*min\(720px,/);});
test('Word、Excel、PPT、Markdown 和压缩包均有格式专属的右栏内容',async()=>{const {createPatchedRuntime}=await import('../tools/build-runtime.mjs');const {source}=createPatchedRuntime();const drive=fs.readFileSync(new URL('../prototype/020-mode-layer.js',import.meta.url),'utf8');const styles=fs.readFileSync(new URL('../prototype/050-file-library.css',import.meta.url),'utf8');assert.match(source,/extensions:\["doc","docx"\],renderer:EvaWordPreviewRenderer/);assert.match(source,/extensions:\["xlsx","xls","xlsb","xlsm","csv"\],renderer:ExcelRenderer/);assert.match(source,/extensions:\["ppt","pptx"\],renderer:EvaPresentationPreviewRenderer/);assert.match(source,/extensions:\["md","markdown"\],renderer:MarkdownRenderer/);assert.match(source,/extensions:\["zip","rar","7z","tar","gz"\],renderer:EvaArchivePreviewRenderer/);for(const name of ['eva-word-preview','eva-sheet-preview','eva-presentation-preview','eva-markdown-preview','eva-archive-preview']){assert.match(drive,new RegExp(name));assert.match(styles,new RegExp('\\.'+name));}});
test('个人文件根目录提供五种可直接演示的文档类型',()=>{const window={};vm.runInNewContext(fs.readFileSync(new URL('../prototype/009-1-file-sharing.js',import.meta.url),'utf8'),{window});const extensions=window.EvaFileSharing.DEFAULT_RECORDS.filter(item=>item.area==='personal').map(item=>item.extension);for(const extension of ['docx','xlsx','pptx','md','zip'])assert.ok(extensions.includes(extension),extension+' 演示文件缺失');});
test('文件信息只能从三点菜单的查看文件信息入口打开',()=>{const drive=fs.readFileSync(new URL('../prototype/020-mode-layer.js',import.meta.url),'utf8');const project=fs.readFileSync(new URL('../prototype/009-1-project-files-ui.js',import.meta.url),'utf8');assert.doesNotMatch(project,/item\.type==='folder'&&!trashMode\?enterFolder\(item\):openDetails\(item\)/);assert.doesNotMatch(project,/catch\{setPreview\(null\);setSelectedId\(item\.id\);\}/);assert.doesNotMatch(drive,/if \(!action && row\) \{[\s\S]{0,180}state\.selectedId/);assert.doesNotMatch(drive,/catch \(error\) \{[\s\S]{0,160}state\.selectedId = resource\.id/);assert.match(drive,/function closeDrive\(\) \{[\s\S]{0,260}state\.selectedId = null;[\s\S]{0,180}state\.dialog = null;/);for(const source of [drive,project]){assert.match(source,/更多操作/);assert.match(source,/查看文件信息/);}});
test('详情弹窗将复制内部链接收纳为文件标题旁的紧凑图标按钮',()=>{const drive=fs.readFileSync(new URL('../prototype/020-mode-layer.js',import.meta.url),'utf8');const project=fs.readFileSync(new URL('../prototype/009-1-project-files-ui.js',import.meta.url),'utf8');const styles=fs.readFileSync(new URL('../prototype/050-file-library.css',import.meta.url),'utf8');assert.match(drive,/class="eva-file-detail__copy-link"[^>]*data-drive-action="copy-link"/);assert.match(project,/className:'eva-file-detail__copy-link'[^}]*aria-label':'复制内部链接'/);assert.doesNotMatch(drive,/class="eva-drive__ghost-button"[^>]*data-drive-action="copy-link"/);assert.doesNotMatch(project,/className:'eva-drive__ghost-button'[^}]*onClick:\(\)=>copyLink/);assert.match(styles,/\.eva-file-detail__copy-link\s*\{[\s\S]*?width:\s*32px;[\s\S]*?height:\s*32px;/);assert.match(styles,/\.eva-file-detail__identity--with-action\s*\{[\s\S]*?grid-template-columns:\s*42px minmax\(0, 1fr\) 32px;/);});
test('三点操作菜单脱离列表滚动层并根据可用空间上下展开',()=>{const drive=fs.readFileSync(new URL('../prototype/020-mode-layer.js',import.meta.url),'utf8');const project=fs.readFileSync(new URL('../prototype/009-1-project-files-ui.js',import.meta.url),'utf8');const styles=fs.readFileSync(new URL('../prototype/050-file-library.css',import.meta.url),'utf8');assert.match(drive,/rowMenuAnchor\(action/);assert.match(drive,/visualViewport/);assert.match(project,/setMenuAnchor/);assert.match(project,/roomBelow<menuHeight/);assert.match(styles,/\.eva-drive__row-menu\s*\{[\s\S]*position:\s*fixed/);assert.match(styles,/max-height:\s*calc\(100vh - 24px\)/);});
test('两个文件入口使用可输入下拉框选择已有标签或新建标签',()=>{const drive=fs.readFileSync(new URL('../prototype/020-mode-layer.js',import.meta.url),'utf8');const project=fs.readFileSync(new URL('../prototype/009-1-project-files-ui.js',import.meta.url),'utf8');const styles=fs.readFileSync(new URL('../prototype/050-file-library.css',import.meta.url),'utf8');for(const source of [drive,project]){assert.match(source,/从下拉框选择已有标签/);assert.match(source,/没有匹配标签，按回车新建/);assert.match(source,/toLowerCase\(\)\s*===\s*input\.toLowerCase\(\)/);assert.match(source,/tagDropdownOpen/);assert.doesNotMatch(source,/多个标签用逗号分隔/);}assert.match(drive,/data-drive-action="tag-option"/);assert.match(drive,/role="combobox"/);assert.match(project,/role:'listbox'/);assert.match(styles,/\.eva-tag-editor__dropdown/);assert.match(styles,/\.eva-tag-editor__chip/);});
test('两个文件入口按文件夹删除单元提示，并反馈恢复到根目录',()=>{const drive=fs.readFileSync(new URL('../prototype/020-mode-layer.js',import.meta.url),'utf8');const project=fs.readFileSync(new URL('../prototype/009-1-project-files-ui.js',import.meta.url),'utf8');for(const source of [drive,project]){assert.match(source,/及其中内容/);assert.match(source,/trashedItemCount/);assert.match(source,/restoredToRoot/);assert.match(source,/原位置不存在，已恢复到空间根目录/);}});
test('两个文件详情入口按实时角色隐藏恢复和永久删除动作',()=>{const drive=fs.readFileSync(new URL('../prototype/020-mode-layer.js',import.meta.url),'utf8');const project=fs.readFileSync(new URL('../prototype/009-1-project-files-ui.js',import.meta.url),'utf8');for(const source of [drive,project]){assert.match(source,/canRestore/);assert.match(source,/canDeleteForever/);assert.match(source,/can\('restore'/);assert.match(source,/can\('delete-forever'/);}});
test('文件库和项目团队文件不再提供共享空间或文件置顶入口',()=>{const store=fs.readFileSync(new URL('../prototype/009-1-file-sharing.js',import.meta.url),'utf8');const drive=fs.readFileSync(new URL('../prototype/020-mode-layer.js',import.meta.url),'utf8');const project=fs.readFileSync(new URL('../prototype/009-1-project-files-ui.js',import.meta.url),'utf8');const hierarchy=fs.readFileSync(new URL('../prototype/021-message-hierarchy.js',import.meta.url),'utf8');const styles=fs.readFileSync(new URL('../prototype/050-file-library.css',import.meta.url),'utf8');const hierarchyStyles=fs.readFileSync(new URL('../prototype/016-message-hierarchy.css',import.meta.url),'utf8');for(const source of [drive,project]){assert.doesNotMatch(source,/置顶文件|取消置顶|togglePin|togglePinned|eva-drive__pin-button|data-file-pinned/);}assert.doesNotMatch(drive,/共享空间|shared-space|new-shared-space|shared-manage|data-shared-space-id/);assert.doesNotMatch(hierarchy,/buildDriveScopebar|shared-all|私聊分享|来自共享的文件来源/);assert.doesNotMatch(styles,/eva-drive__table--pinned|eva-drive__pin-button|eva-drive-project-card--shared|eva-drive-member-list|eva-drive-governance/);assert.doesNotMatch(hierarchyStyles,/eva-drive-scopebar|eva-drive-sourcebar/);assert.doesNotMatch(store,/DEFAULT_SHARED_SPACES|createSharedSpace|pinnedFiles\(|setPinned\(|togglePinned\(/);assert.match(drive,/treeButton\('personal', '个人空间'/);assert.match(drive,/treeButton\('projects', '项目空间'/);});
