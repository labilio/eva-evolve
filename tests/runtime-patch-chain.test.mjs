import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

import { createPatchedRuntime } from '../tools/build-runtime.mjs';

const splitRuntimeScripts = [
  'prototype/009-0-demo-time.js',
  'prototype/009-1-data-drive.js',
  'prototype/009-2-data-supply.js',
  'prototype/009-3-data-im.js',
  'prototype/009-3-ai-team-store.js',
  'prototype/009-4-registry.js',
  'prototype/009-5-patch-im.js',
  'prototype/009-6-patch-general.js',
  'prototype/009-7-patch-sider.js',
  'prototype/009-8-patch-automation.js',
];

test('浏览器只加载数据、页面注册器和构建完成的运行时', () => {
  const entry = fs.readFileSync('index.html', 'utf8');
  const loadedScripts = [...entry.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);
  const browserInputs = splitRuntimeScripts.slice(0, 5);
  const browserIndexes = browserInputs.map(file => loadedScripts.indexOf(file));

  assert.equal(entry.includes('prototype/009-drive-demo-seed.js'), false, '旧的 009 单体入口仍被加载');
  assert.equal(browserIndexes.every(index => index >= 0), true, '009 数据文件没有全部进入浏览器入口');
  assert.deepEqual(browserIndexes, [...browserIndexes].sort((a, b) => a - b));
  assert.equal(splitRuntimeScripts.slice(5).some(file => loadedScripts.includes(file)), false, '浏览器仍加载构建期补丁');
  assert.ok(loadedScripts.includes('prototype/010-native-page-registry.js'));
  assert.ok(loadedScripts.includes('vendor/eva-runtime.module.js'));
});

test('manifest 声明数据入口和构建期运行时补丁', () => {
  const manifest = JSON.parse(fs.readFileSync('prototype-manifest.json', 'utf8'));
  const blocks = manifest.blocks.filter(block => block.file && /^prototype\/009-/.test(block.file));

  const membershipFiles = ['prototype/009-2-membership.js', 'prototype/009-1-file-sharing.js', 'prototype/009-2-picker-preview.js',
    'prototype/009-2-picker-preview.css',
    'prototype/009-3-contact-identities.js',
    'prototype/009-3-identity-card.js',
    'prototype/009-3-identity-card.css',
    'prototype/009-2-chat-settings.js',
    'prototype/009-2-chat-settings.css',
    'prototype/009-2-members-ui.js', 'prototype/009-2-mention-candidates.js', 'prototype/009-2-members.css'];
  const uiFiles = ['prototype/009-1-project-files-ui.js'];
  assert.deepEqual(blocks.map(block => block.file), [...splitRuntimeScripts.slice(0,5), 'prototype/009-3-digital-employees-data.js', 'prototype/009-3-digital-employees-store.js', ...membershipFiles, ...splitRuntimeScripts.slice(5), ...uiFiles]);
  for (const block of blocks.filter(block => splitRuntimeScripts.slice(5).includes(block.file))) assert.equal(block.role, 'build-input');
  for (const file of membershipFiles) assert.equal(blocks.find(block => block.file === file).role, 'prototype');
  for (const file of uiFiles) assert.equal(blocks.find(block => block.file === file).role, 'prototype');
  assert.equal(fs.existsSync('prototype/009-9-loader.js'), false, '旧的浏览器运行时加载器仍然存在');
});

test('构建期补丁链生成确定且可直接发布的运行时代码', () => {
  const first = createPatchedRuntime();
  const second = createPatchedRuntime();
  const digest = value => crypto.createHash('sha256').update(value).digest('hex');

  assert.deepEqual(first.patchOrder, ['im', 'general', 'sidebar', 'automation']);
  assert.equal(first.source, second.source);
  assert.equal(digest(first.source), digest(second.source));
  assert.ok(first.source.length > 18_000_000);
  assert.ok(first.source.includes('function isPwaRegistrationSupported(){return!1;'));
});

test('所有字符串替换统一经过注册器的锚点校验', () => {
  const patchFiles = splitRuntimeScripts.slice(6, 10);
  for (const file of patchFiles) {
    const source = fs.readFileSync(file, 'utf8');
    assert.equal(/source\s*=\s*source\.replace\(/.test(source), false, `${file} 绕过了 __evaCut 锚点校验`);
  }
});

test('群聊文件卡和历史消息缺少可选字段时不会导致消息页白屏', () => {
  const runtime = createPatchedRuntime().source;

  assert.equal(runtime.includes('location.hash.split("?")'), false, '文件卡仍直接读取可能被遮蔽的 location.hash');
  assert.ok(runtime.includes('String(window.location?.hash||"").split("?")'), '文件卡没有安全读取当前路由');
  assert.ok(runtime.includes('function evaRenderableMessage(message)'), '消息渲染缺少历史数据归一化');
  assert.ok(runtime.includes('ci=evaRenderableMessage(ci);if(ci.kind==="divider")'), '归一化没有接入消息渲染入口');
  assert.ok(runtime.includes('SENDERS[zs]?.color??"#8a8f99"'), '未知子区参与者仍会导致头像渲染异常');
});

test('子区信息成员区置顶且在父群之上，只读且头像按当前层级打开设置', () => {
  const settings = fs.readFileSync('prototype/009-2-chat-settings.js', 'utf8');
  const runtime = createPatchedRuntime().source;

  assert.match(settings, /function ThreadMembers\(\{groupId,actorId\}\)/, '子区成员区组件缺失');
  assert.match(settings, /ChatSettings\.ThreadMembers=ThreadMembers;/, '子区成员区未挂到公共设置组件');
  assert.match(settings, /'子区继承所属群聊的成员与角色，不能单独增删。'/, '子区成员区缺少只读说明');
  assert.doesNotMatch(settings.slice(settings.indexOf('function ThreadMembers'), settings.indexOf('ChatSettings.ThreadMembers=ThreadMembers;')), /setPicker\('add'\)|MemberPicker|先将其加入项目/, '子区成员区不应提供增删入口');
  assert.match(settings, /className:'eva-chat-settings eva-thread-members-page'/, '子区成员页未复用聊天信息页面外壳');
  assert.match(settings, /'群聊成员（'\+members\.length\+'）'/, '子区成员页标题未沿用原样式');
  assert.match(settings, /eva-chat-member-search-block/, '子区成员页缺少搜索区');
  assert.doesNotMatch(settings.slice(settings.indexOf('function ThreadMembers'), settings.indexOf('ChatSettings.ThreadMembers=ThreadMembers;')), /'移除'|removeButton|eva-chat-member-add|eva-members-modal/, '子区成员页不应提供增删改或弹窗');

  assert.match(runtime, /ChatSettings\.ThreadMembers,\{groupId:Sa\.id,actorId:evaActorId\}\),React\.createElement\("div",\{className:"eva-chat-setting-section"\},React\.createElement\(evaMembers\(\)\.ui\.ChatSettings\.ProjectRow,\{context:evaMemberStore\.conversationContext\(fa\.id,evaActorId\),scoped:!!evaMembershipProjectId&&evaMembershipProjectId===evaMemberStore\.conversationContext\(fa\.id,evaActorId\)\?\.projectId\}\),React\.createElement\(evaMembers\(\)\.ui\.ChatSettings\.Row,\{title:"所属群聊"/, '子区成员区未置于所属项目与所属群聊之上');
  assert.match(settings, /ChatSettings\.ProjectRow=ProjectRow;/, '所属项目行未挂到公共设置组件');
  assert.match(settings, /function ProjectRow\(\{context,scoped=false\}\)\{const navigate=useNavigate\(\);if\(!context\|\|scoped\)return null;return h\(Row,\{title:'所属项目'/, '子区所属项目行未复用公共设置行且未支持项目内隐藏');
  assert.match(runtime, /wk-chat-conversation-header-channel-avatar"\+\(!fa&&Sa\.chatType!=="direct"&&!Sa\.id\.startsWith\("dm-"\)\|\|fa&&ct\?\.presentation!=="ai-direct"/, '子区头像未打开子区信息');
  assert.doesNotMatch(runtime, /title:"参与人数"/, '子区信息不应再显示参与人数');
  assert.doesNotMatch(runtime, /' 条回复 · '/, '子区列表不应再显示参与人数');
});
