import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createPatchedRuntime} from '../tools/build-runtime.mjs';
const read = path => fs.readFileSync(path, 'utf8');
const runtime = createPatchedRuntime().source;

test('个人页使用当前main的独立宿主，不加载旧历史栏隐藏脚本', () => {
  const entry=read('index.html');
  assert.match(entry,/052-personal-eva-gds\.js/);
  assert.doesNotMatch(entry,/042-personal-conversation-columns\.js/);
  assert.doesNotMatch(read('prototype/044-final-layout-convergence.js'),/eva-history-source|historyDivider/);
});

test('AI团队包含个人助理且保留分身员工', () => {
  const source=read('prototype/009-5-patch-im.js');
  const match=source.match(/const teamIdentities\s*=\s*([^;]+);/);
  assert.ok(match,'缺少团队身份过滤');
  const snapshot={identities:[{id:'old',role:'assistant'},{id:'p',role:'persona'},{id:'e',role:'employee'}]};
  const ids=vm.runInNewContext(`(${match[1]}).map(i=>i.id).join(',')`,{snapshot});
  assert.equal(ids,'old,p,e');
  const body=source.slice(source.indexOf('function EvaAITeamPage()'),source.indexOf('\n    const cut',source.indexOf('function EvaAITeamPage()')));
  assert.doesNotMatch(body,/open\('connect'\)|store\.connectAssistant\(/);
  assert.match(body,/roleGroup\('assistant','个人助理'/);
  assert.match(body,/requestedIdentityId/);
  assert.match(body,/const identity = teamIdentities\.find/);
});

test('项目设置与概览使用独立根类，设置字段样式可以命中', () => {
  assert.match(runtime,/className:'eva-project-settings-info'/);
  assert.match(runtime,/className:"eva-project-info"/);
  const css=read('prototype/009-2-members.css');
  assert.match(css,/\.eva-project-settings-info\s*\{/);
  assert.match(css,/\.eva-project-settings-info \.eva-project-info-field\s*\{[^}]*flex-direction:column/);
  assert.match(css,/\.eva-project-settings-info \.eva-project-info-field textarea\s*\{[^}]*width:100%/);
});

test('AI名称与标记共用身份行，标题不扩大公共圆形头像', () => {
  const css=read('prototype/046-ai-team.css');
  assert.match(css,/\.eva-ai-team__identity-name\s*\{[^}]*flex:\s*0 1 auto/);
  assert.match(read('prototype/009-5-patch-im.js'),/className:'eva-identity-name-row'/);
  const hierarchy=read('prototype/016-message-hierarchy.css');
  assert.doesNotMatch(hierarchy,/\.wk-chat-conversation-header-channel-avatar img\s*\{[^}]*width:\s*28px\s*!important/);
  assert.match(runtime,/EvaContactsUI\.render/);
  const contacts=read('prototype/033-contacts-redesign-v2.js');
  // Single-clone rows no longer carry obsolete multi-clone UI state.
  assert.doesNotMatch(contacts,/personaPreview|hiddenCount|setExpanded|owner-total/);
  assert.match(contacts,/EvaAIIdentity\.badge/);
  assert.doesNotMatch(contacts,/MutationObserver|innerHTML/);
});
