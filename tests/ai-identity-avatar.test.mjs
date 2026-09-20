import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import { createPatchedRuntime } from '../tools/build-runtime.mjs';

const runtime = createPatchedRuntime().source;
const helper = runtime.slice(runtime.indexOf('function evaIdentityAppearance('), runtime.indexOf('function EvaAITeamPage('));
function identityContext() {
  return {
    window: { __EVA_MY_ASSISTANT_IDENTITY: { logo: 'eva-logo', ownerName: '王宜林' }, __EVA_CURRENT_USER_PORTRAIT: 'owner-photo', __EVA_COLLEAGUE_PORTRAIT: 'eva-logo', EvaAvatar: { personUri: id => 'portrait:' + id, personBaseUri: id => 'portrait:' + id } },
    React: { createElement: (type, props, ...children) => ({type, props, children}) }
  };
}
function render(name, size, avatar, role) {
  const context = identityContext();
  context.input = {name, role, sourceAssistantId:'assistant-rd', configuration:{avatar}};
  context.size = size;
  vm.runInNewContext(readFileSync(new URL('../prototype/003-my-assistant-identity.js',import.meta.url),'utf8').split('/* One identity contract')[1].replace(/^/, '/* One identity contract'),context);
  return vm.runInNewContext(helper + '\nEvaAIIdentityAvatar({appearance:evaIdentityAppearance(input),size})', context);
}
function loadIdentity() {
  const ctx = identityContext();
  vm.runInNewContext(readFileSync(new URL('../prototype/003-my-assistant-identity.js',import.meta.url),'utf8'), ctx);
  return ctx.window.EvaAIIdentity;
}

test('云端分身以主人为主图、Eva logo 为右下角小图', () => {
  for (const size of [28,32,36]) {
    const avatar = render('王宜林的 AI 分身', size, 'https://example.test/legacy.png', 'persona');
    assert.equal(avatar.props.role, 'img');
    assert.equal(avatar.props['aria-label'], '王宜林的 AI 分身，来自Eva');
    assert.equal(avatar.children.length, 2);
    assert.equal(avatar.children[0].props.className, 'eva-identity-avatar__logo');
    assert.equal(avatar.children[0].props.src, 'portrait:王宜林');
    assert.equal(avatar.children[1].props.className, 'eva-identity-avatar__owner');
    assert.equal(avatar.children[1].props.src, 'eva-logo');
    assert.equal(avatar.props.style['--eva-identity-avatar-size'], size+'px');
  }
});

test('分身主图不因配置头像而改变', () => {
  const avatar=render('新的分身',32,'🍌','persona');
  assert.equal(avatar.children[0].props.src, 'portrait:王宜林');
  assert.equal(avatar.children[1].props.src, 'eva-logo');
});

test('个人助理以自选图标为主图，星标为 Eva 角图', () => {
  for (const size of [24,32,48]) {
    const avatar = render('采购助理', size, '🍌', 'assistant');
    assert.equal(avatar.children.length, 2);
    assert.equal(avatar.children[0].props.className, 'eva-identity-avatar__icon');
    assert.equal(avatar.children[0].children[0], '🍌');
    assert.equal(avatar.children[1].props.className, 'eva-identity-avatar__owner');
    assert.equal(avatar.children[1].props.src, 'eva-logo');
  }
});

test('个人助理未选择图标时默认使用主人头像，并保留 Eva 角图', () => {
  const avatar = render('新助理', 32, '', 'assistant');
  assert.equal(avatar.children[0].props.className, 'eva-identity-avatar__logo');
  assert.equal(avatar.children[0].props.src, 'portrait:王宜林');
  assert.equal(avatar.children[1].props.src, 'eva-logo');
});

test('个人助理历史图片头像仍按图片渲染并保留 Eva 角图', () => {
  const avatar = render('旧助理', 32, 'data:image/png;base64,AAAA', 'assistant');
  assert.equal(avatar.children[0].props.className, 'eva-identity-avatar__logo');
  assert.equal(avatar.children[0].props.src, 'data:image/png;base64,AAAA');
  assert.equal(avatar.children[1].props.src, 'eva-logo');
});

test('无主人的 AI 身份保持单张圆形主图、不叠加 Eva 角图', () => {
  const identity = loadIdentity();
  const renderNode = (type, props, ...children) => ({type, props, children});
  const avatar = identity.avatar({name:'采购分身',sourceName:'Eva',logo:'eva-logo',avatar:'https://example.test/none.png'},32,renderNode);
  assert.equal(avatar.children.length, 1);
  assert.equal(avatar.children[0].props.className, 'eva-identity-avatar__logo');
  assert.equal(avatar.children[0].props.src, 'https://example.test/none.png');
});

test('分身主图来自主人身份的基础头像，不随主人更换头像同步', () => {
  const identity = loadIdentity();
  const a = identity.cloneAppearance({id:'u-wangyilin',name:'王宜林'});
  assert.equal(a.avatar, 'portrait:u-wangyilin');
  assert.equal(a.ownerAvatar, undefined);
  assert.equal(a.evaCorner, true);
  const markup = identity.avatar(a,32);
  assert.match(markup, /portrait:u-wangyilin/);
  assert.match(markup, /eva-identity-avatar__owner/);
  assert.match(markup, /eva-logo/);
});

test('助理头像只接受 emoji/图标，图片仍按图片处理', () => {
  const identity = loadIdentity();
  assert.equal(identity.isAssistantIcon('🍌'), true);
  assert.equal(identity.isAssistantIcon('data:image/png;base64,AAAA'), false);
  assert.equal(identity.isAssistantIcon(''), false);
  assert.equal(identity.isAvatarImage('data:image/png;base64,AAAA'), true);
  assert.equal(identity.isAvatarImage('🍌'), false);
  assert.ok(identity.assistantIcons().includes('🍌'));
});

test('共享样式定义主人角图与图标主图的几何', () => {
  const css=readFileSync(new URL('../prototype/003-ai-identity.css',import.meta.url),'utf8');
  assert.match(css,/border-radius: 50%/);
  assert.match(css,/\.eva-identity-avatar__owner\s*\{/);
  assert.match(css,/\.eva-identity-avatar__icon\s*\{/);
  assert.match(css,/--eva-identity-avatar-size, 32px\) \* 0\.4375/);
  for(const file of ['032-contacts-redesign-v2.css','046-ai-team.css']) {
    const feature=readFileSync(new URL('../prototype/'+file,import.meta.url),'utf8');
    assert.doesNotMatch(feature,/--eva-identity-owner-(size|offset|border)/);
    assert.doesNotMatch(feature,/\.eva-identity-avatar__owner\s*\{/);
  }
});

test('React 与 HTML 的 AI 标共用同一固定合同', () => {
  const ctx={window:{}};
  const src=readFileSync(new URL('../prototype/003-my-assistant-identity.js',import.meta.url),'utf8');
  vm.runInNewContext(src.slice(src.indexOf('/* One identity contract')),ctx);
  const identity=ctx.window.EvaAIIdentity;
  assert.equal(identity.badge(),'<span class="ai-badge ai-badge-small">AI</span>');
  const badge=identity.badge((tag,props,...children)=>({tag,props,children}));
  assert.equal(badge.props.className,'ai-badge ai-badge-small');
  assert.equal(badge.children[0],'AI');
});

test('项目管家使用稳定机器人头像且不叠加 Eva 角图',()=>{
 const ctx={window:{__EVA_COLLEAGUE_PORTRAIT:'eva-logo',__EVA_CURRENT_USER_PORTRAIT:'human'}};
 vm.runInNewContext(readFileSync(new URL('../prototype/003-my-assistant-identity.js',import.meta.url),'utf8'),ctx);
 const appearance=ctx.window.EvaAIIdentity.projectAgentAppearance();const markup=ctx.window.EvaAIIdentity.avatar(appearance,32);
 assert.match(markup,/Eva 云端项目 AI/);assert.match(markup,/project-agent-bot.svg/);assert.doesNotMatch(markup,/eva-identity-avatar__owner/);
});
