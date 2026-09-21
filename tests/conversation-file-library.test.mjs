import {loadIdentityEnvironment} from './helpers/identity-environment.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setup() {
  const window = {};
  loadIdentityEnvironment(window);
  for (const file of ['009-2-membership.js', '009-1-file-sharing.js']) {
    vm.runInNewContext(fs.readFileSync(new URL('../prototype/' + file, import.meta.url), 'utf8'), {window});
  }
  const members = window.EvaMembership.create({people: [
    {id: 'a', name: '王宜林'},
    {id: 'b', name: '何静'},
    {id: 'c', name: '林晓'}
  ]});
  members.createProject('p', '项目空间', 'a', []);
  members.addMember('p', 'a', 'b');
  members.addMember('p', 'a', 'c');
  const files = window.EvaFileSharing.create(members);
  return {window, members, files};
}

test('AI 产出只在人工确认后存入目标空间，保存人是创建者', () => {
  const {files} = setup();
  const artifact = {id: 'artifact-1', name: '晨会提纲.docx', size: 2048, extension: 'docx'};
  const source = {type: 'ai-conversation', ownerId: 'a', identityId: 'ai-general', identityName: '通用助理', conversationId: 'session-1', conversationTitle: '整理今日事项', messageId: 'message-1'};
  assert.equal(files.list('personal:a', 'a').length, 0);
  const id = files.saveConversationFile('a', 'personal:a', 0, artifact, source);
  const saved = files.list('personal:a', 'a').find(item => item.id === id);
  assert.equal(saved.creator, '王宜林');
  assert.equal(saved.spaceId, 'personal:a');
  assert.equal(saved.source.type, 'ai-conversation-copy');
  assert.equal(files.relationsFor(saved, 'a')[0].type, 'ai-conversation');
  assert.equal(files.relationsFor(saved, 'a')[0].label, '整理今日事项');
});

test('私聊文件按附件与目标文件夹去重，同名不同附件不串状态', () => {
  const {members, files} = setup();
  const directId = members.openDirect('a', 'b');
  const source = {type: 'chat', conversationId: directId, conversationTitle: '与何静的私聊', messageId: 'message-1', senderId: 'b', senderName: '何静'};
  const first = files.saveConversationFile('a', 'p', 0, {id: 'attachment-1', name: '方案.pdf', size: 10}, source);
  assert.equal(files.saveConversationFile('a', 'p', 0, {id: 'attachment-1', name: '方案.pdf', size: 10}, source), first);
  const second = files.saveConversationFile('a', 'p', 0, {id: 'attachment-2', name: '方案.pdf', size: 12}, {...source, messageId: 'message-2'});
  assert.notEqual(second, first);
  assert.equal(JSON.stringify(files.list('p', 'a').map(item => item.name).sort()), JSON.stringify(['方案 (2).pdf', '方案.pdf']));
});

test('目标空间成员可读已保存文件，但 AI 会话和私聊关联按来源权限脱敏', () => {
  const {members, files} = setup();
  const aiId = files.saveConversationFile('a', 'p', 0, {id: 'ai-file', name: 'AI结果.md'}, {type: 'ai-conversation', ownerId: 'a', identityId: 'ai-general', identityName: '通用助理', conversationId: 'session-1', conversationTitle: '保密对话', messageId: 'ai-message'});
  const aiRelation = files.relationsFor(aiId, 'b')[0];
  assert.equal(aiRelation.restricted, true);
  assert.equal(aiRelation.label, '来源 AI 会话');
  assert.doesNotMatch(JSON.stringify(aiRelation), /保密对话|通用助理/);
  assert.doesNotMatch(JSON.stringify(files.list('p', 'b').find(item => item.id === aiId)), /保密对话|通用助理|session-1|ai-message/);

  const directId = members.openDirect('a', 'b');
  const chatId = files.saveConversationFile('a', 'p', 0, {id: 'chat-file', name: '私聊附件.pdf'}, {type: 'chat', conversationId: directId, conversationTitle: '与何静的私聊', messageId: 'chat-message', senderId: 'b', senderName: '何静'});
  assert.equal(files.relationsFor(chatId, 'b')[0].restricted, undefined);
  const restricted = files.relationsFor(chatId, 'c')[0];
  assert.equal(restricted.restricted, true);
  assert.doesNotMatch(JSON.stringify(restricted), /何静/);
  assert.doesNotMatch(JSON.stringify(files.list('p', 'c').find(item => item.id === chatId)), /何静|chat-message/);
});

test('不能读来源会话或不能写入目标空间时拒绝保存', () => {
  const {files} = setup();
  const artifact = {id: 'artifact-1', name: '交付物.docx'};
  const source = {type: 'ai-conversation', ownerId: 'a', identityId: 'ai-general', conversationId: 'session-1', conversationTitle: '会话', messageId: 'message-1'};
  assert.throws(() => files.saveConversationFile('b', 'p', 0, artifact, source), /来源会话/);
  assert.throws(() => files.saveConversationFile('a', 'personal:b', 0, artifact, source), /操作权限/);
});

test('文件消息未确认保存时不会自动变成已存入', () => {
  const window = {};
  vm.runInNewContext(fs.readFileSync(new URL('../prototype/015-file-message.js', import.meta.url), 'utf8'), {window});
  const first = {id: 'attachment-1', name: '同名.pdf'};
  const second = {id: 'attachment-2', name: '同名.pdf'};
  const source = {conversationId: 'session-1', messageId: 'message-1'};
  let requested = null;
  window.EvaFileMessage.setSaveRequestHandler((file, context) => { requested = {file, context}; });
  assert.equal(window.EvaFileMessage.activate(first, source), 'requested');
  assert.equal(window.EvaFileMessage.isSaved(first, source), false);
  assert.equal(requested.file.id, 'attachment-1');
  window.EvaFileMessage.markSaved(first, source, {id: 'saved-1', spaceId: 'personal:a', parent_id: 0});
  assert.equal(window.EvaFileMessage.isSaved(first, source), true);
  assert.equal(window.EvaFileMessage.isSaved(second, source), false);
  assert.equal(window.EvaFileMessage.action(first, source).title, '前往文件库查看');
});

test('非项目会话文件传递稳定上下文，并可在保存弹窗选择文件库和文件夹', async () => {
  const {createPatchedRuntime} = await import('../tools/build-runtime.mjs');
  const {source} = createPatchedRuntime();
  const membersUI = fs.readFileSync(new URL('../prototype/009-2-members-ui.js', import.meta.url), 'utf8');
  assert.match(source, /saveContext/);
  assert.match(source, /messageId/);
  assert.match(source, /conversationId/);
  assert.match(source, /ai-conversation/);
  assert.match(source, /存到文件库/);
  assert.match(membersUI, /目标文件库/);
  assert.match(membersUI, /目标文件夹/);
  assert.match(membersUI, /保存后，目标文件库成员可访问该文件/);
});

test('项目群文件一键保存到所属项目根目录，并保留文件库查看入口', async () => {
  const {members, files} = setup();
  members.createGroup('project-group', '项目群', 'p', 'a', []);
  const artifact = {id: 'project-file', name: '项目交付物.pdf', size: 512, extension: 'pdf'};
  const sourceContext = {type: 'group', projectId: 'p', groupId: 'project-group', groupName: '项目群', conversationId: 'project-group', messageId: 'project-message'};
  files.saveConversationFile('a', 'personal:a', 0, artifact, sourceContext);
  assert.equal(files.findConversationFile('a', artifact, sourceContext), null, '个人空间副本不应让项目群文件显示为已存入项目');
  const savedId = files.saveConversationFile('a', sourceContext.projectId, 0, artifact, sourceContext);
  const saved = files.list('p', 'a').find(item => item.id === savedId);

  assert.equal(saved.spaceId, 'p');
  assert.equal(saved.parent_id, 0);
  assert.equal(files.findConversationFile('a', artifact, sourceContext).id, savedId);
  const {createPatchedRuntime} = await import('../tools/build-runtime.mjs');
  const {source} = createPatchedRuntime();
  assert.match(source, /source\?\.type==="group"&&source\.projectId/);
  assert.match(source, /saveConversationFile\(evaActorId,source\.projectId,0,file,source\)/);
  assert.match(source, /onSave:\(file,source\)=>evaSaveConversationFile\(file,source\)/);
  assert.match(source, /onClick:\(\)=>evaSaveConversationFile\(ci\.file,evaSaveContextFor\(ci\)\)/);
  assert.doesNotMatch(source, /wk-message-file-actions"\},!gt\.saved&&React\.createElement/);
  assert.match(source, /gt\.saved\?window\.EvaFileMessage\.activate/);
});

test('文件详情支持定位文件和回到可访问的来源会话', () => {
  const modeLayer = fs.readFileSync(new URL('../prototype/020-mode-layer.js', import.meta.url), 'utf8');
  const projectFiles = fs.readFileSync(new URL('../prototype/009-1-project-files-ui.js', import.meta.url), 'utf8');
  const messageHierarchy = fs.readFileSync(new URL('../prototype/021-message-hierarchy.js', import.meta.url), 'utf8');
  assert.match(modeLayer, /__evaOpenDriveFile/);
  assert.match(modeLayer, /AI 小队会话/);
  assert.match(modeLayer, /查看来源/);
  assert.match(projectFiles, /evaMessage/);
  assert.match(messageHierarchy, /__evaOpenDriveFile/);
});

test('会话副本保留原附件预览地址和原名，重名保存后仍可读取同一内容', () => {
  const {files} = setup();
  const artifact = {id:'document',name:'纪要.docx',previewUrl:'prototype/assets/file-samples/纪要.docx.html',version:1};
  const source = {type:'ai-conversation',ownerId:'a',conversationId:'s',messageId:'m'};
  files.upload('a','personal:a',{name:'纪要.docx'});
  const id = files.saveConversationFile('a','personal:a',0,artifact,source);
  const saved = files.list('personal:a','a').find(item=>item.id===id);
  assert.equal(saved.name,'纪要 (2).docx');
  assert.equal(saved.previewUrl,artifact.previewUrl);
  assert.equal(saved.sourceFileName,'纪要.docx');
});

test('保存状态以当前版本和文件库实时记录为准，删除副本后可以重新保存', () => {
  const {files,window} = setup();
  vm.runInNewContext(fs.readFileSync(new URL('../prototype/015-file-message.js',import.meta.url),'utf8'),{window});
  const file={id:'doc',name:'报告.pdf',version:1},source={type:'ai-conversation',ownerId:'a',conversationId:'s',messageId:'m'};
  const id=files.saveConversationFile('a','personal:a',0,file,source);
  window.EvaFileMessage.markSaved(file,source,files.findConversationFile('a',file,source));
  assert.equal(files.findConversationFile('a',{...file,version:2},source),null);
  files.trash('a',id);
  assert.equal(window.EvaFileMessage.action(file,source,files.findConversationFile('a',file,source)).saved,false);
});
