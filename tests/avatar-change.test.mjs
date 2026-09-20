import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {loadIdentityEnvironment} from './helpers/identity-environment.mjs';

const read = file => readFileSync(new URL('../prototype/' + file, import.meta.url), 'utf8');
const DATA = ['009-0-demo-time.js', '009-1-data-drive.js', '009-2-data-supply.js', '009-3-data-im.js'];
const SUPPORT = ['014-avatar.js', '009-2-membership.js', '009-3-ai-team-store.js', '009-3-contact-identities.js', '009-3-identity-card.js'];
const CUSTOM = 'https://example.test/custom.png';

function setup() {
  const storage = new Map();
  const window = {
    __EVA_CURRENT_USER_PORTRAIT: 'current.png',
    __EVA_COLLEAGUE_PORTRAIT: 'eva.png',
    localStorage: {getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value)}
  };
  loadIdentityEnvironment(window);
  const context = vm.createContext({window, jdenticon: {toSvg: id => '<svg>' + id + '</svg>'}, console, setTimeout, clearTimeout});
  for (const file of [...DATA, ...SUPPORT]) vm.runInContext(read(file), context);
  const store = window.EvaMembership.bootstrap(window.__EVA_PEOPLE, [], {}, []);
  const model = window.EvaContactIdentities.create(store);
  return {window, store, model};
}

test('本人可以更换自己的头像，其他人与非法数据都被拒绝', () => {
  const {window, store, model} = setup();
  assert.equal(store.actorId(), 'u-wangyilin');
  store.setPersonAvatar('u-wangyilin', CUSTOM);
  assert.equal(store.personRecord('u-wangyilin').avatar, CUSTOM);
  assert.equal(model.resolve('u-wangyilin').avatar, CUSTOM);
  assert.equal(window.EvaAvatar.personUri('u-wangyilin'), CUSTOM);
  assert.throws(() => store.setPersonAvatar('u-linxiao', CUSTOM), /只能更换自己的头像/);
  assert.throws(() => store.setPersonAvatar('u-wangyilin', 'javascript:alert(1)'), /头像数据无效/);
  store.setPersonAvatar('u-wangyilin', '');
  assert.notEqual(window.EvaAvatar.personUri('u-wangyilin'), CUSTOM);
});

test('分身头像只有一个数据源：主人可改，其他人与非法数据被拒绝，恢复默认回到 Eva Logo', () => {
  const {window, store, model} = setup();
  const before = model.resolve('b-wangyilin').appearance.avatar;
  assert.equal(before, window.__EVA_COLLEAGUE_PORTRAIT);
  store.setCloneAvatar('u-wangyilin', 'u-wangyilin', CUSTOM);
  assert.equal(store.cloneAvatar('u-wangyilin'), CUSTOM);
  // Membership clone, 我的 AI persona and the contact model all read the same value.
  assert.equal(model.resolve('b-wangyilin').appearance.avatar, CUSTOM);
  assert.equal(model.resolve('persona-initial').appearance.avatar, CUSTOM);
  assert.throws(() => store.setCloneAvatar('u-linxiao', 'u-linxiao', CUSTOM), /只能更换自己的头像/);
  assert.throws(() => store.setCloneAvatar('u-wangyilin', 'u-linxiao', CUSTOM), /只有本人可以更换自己的分身头像/);
  assert.throws(() => store.setCloneAvatar('u-wangyilin', 'u-wangyilin', 'data:text/html,<b>x</b>'), /头像数据无效/);
  store.setCloneAvatar('u-wangyilin', 'u-wangyilin', '');
  assert.equal(model.resolve('b-wangyilin').appearance.avatar, window.__EVA_COLLEAGUE_PORTRAIT);
});

test('个人助理头像写入助理配置并即时反映到身份外观，纯 AI 表单不套用', () => {
  const {window} = setup();
  const team = window.EvaAITeam;
  const assistant = team.getSnapshot().identities.find(identity => identity.id === 'ai-general');
  assert.equal(assistant.role, 'assistant');
  team.setAssistantAvatar('ai-general', CUSTOM);
  assert.equal(team.getSnapshot().identities.find(identity => identity.id === 'ai-general').configuration.avatar, CUSTOM);
  assert.equal(window.EvaAIIdentity.assistantAppearance(team.getSnapshot().identities.find(identity => identity.id === 'ai-general')).avatar, CUSTOM);
  assert.throws(() => team.setAssistantAvatar('persona-initial', CUSTOM), /只能编辑个人助理头像/);
  assert.throws(() => team.setAssistantAvatar('ai-general', 'javascript:alert(1)'), /头像数据无效|头像/);
  team.setAssistantAvatar('ai-general', '');
  assert.equal(window.EvaAIIdentity.assistantAppearance(team.getSnapshot().identities.find(identity => identity.id === 'ai-general')).avatar, window.__EVA_COLLEAGUE_PORTRAIT);
});

test('资料卡只为本人、分身主人和个人助理提供更换头像入口', () => {
  const {window, store} = setup();
  const digital = {
    subscribe: () => () => {}, getSnapshot: () => ({}), get: id => id === 'emp-1' ? {id, kind: 'staff', name: '数字员工', ownership: 'public', scope: 'all'} : null,
    hasInTeam: () => true, appearance: () => ({name: '数字员工', sourceName: 'Eva', logo: 'emp.png'})
  };
  window.EvaDigitalEmployeesStore = digital;
  const React = {
    Fragment: Symbol('Fragment'),
    createElement: (type, props, ...children) => ({type, props: props || {}, children: children.flat(Infinity).filter(child => child !== false && child !== null && child !== undefined)}),
    useRef: value => ({current: value}),
    useCallback: value => value,
    useSyncExternalStore: () => {},
    useState: value => [typeof value === 'function' ? value() : value, () => {}],
    useEffect: () => {},
    useLayoutEffect: () => {}
  };
  const cards = window.EvaIdentityCard.create({React, Modal: 'modal', Button: 'button', BackIcon: 'back-icon', ProjectIcon: 'project-icon', CameraIcon: 'camera-icon', useNavigate: () => () => {}}, store);
  const hasEdit = identity => {
    const tree = cards.IdentityCard({identity, onClose: () => {}});
    let found = false;
    const walk = node => {
      if (!node || typeof node !== 'object' || found) return;
      if (node.props?.['aria-label'] === '更换头像') { found = true; return; }
      if (typeof node.type === 'function') { walk(node.type({...node.props, children: node.children})); return; }
      (node.children || []).forEach(walk);
    };
    walk(tree);
    return found;
  };
  assert.equal(hasEdit('u-wangyilin'), true, '本人可以更换头像');
  assert.equal(hasEdit('u-linxiao'), false, '不能更换别人的头像');
  assert.equal(hasEdit('b-wangyilin'), true, '分身主人可以更换分身头像');
  assert.equal(hasEdit('clone-linxiao'), false, '不能更换别人的分身头像');
  assert.equal(hasEdit('persona-initial'), true, '分身主人可以通过我的 AI 身份更换头像');
  assert.equal(hasEdit('ai-general'), true, '个人助理可以更换头像');
  assert.equal(hasEdit('project-agent:prod'), false, '项目管家头像固定');
  assert.equal(hasEdit('emp-1'), false, '数字员工头像固定');
  // 左下角账号菜单以 startAvatarEditing 直接进入同一个编辑器，不新写第二套。
  const tree = cards.IdentityCard({identity: 'u-wangyilin', startAvatarEditing: true, onClose: () => {}});
  let editor = false;
  const walkEditor = node => {
    if (!node || typeof node !== 'object' || editor) return;
    if (node.props?.className === 'eva-avatar-editor') { editor = true; return; }
    if (typeof node.type === 'function') { walkEditor(node.type({...node.props, children: node.children})); return; }
    (node.children || []).forEach(walkEditor);
  };
  walkEditor(tree);
  assert.equal(editor, true, '账号菜单入口可直接打开共用编辑器');
});
