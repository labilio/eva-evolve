import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';

function setup(hash = '#/guid') {
  const {window, document} = parseHTML('<html><body><main></main></body></html>');
  let mount, finish;
  window.__evaLucide = () => '';
  window.__EVA_PERSONAL_CONVERSATIONS = [{id:'history-1',title:'历史会议',assistantId:'assistant-general',assistant:'通用助理',messages:[]}];
  window.__evaNativePages = {register:(_,fn) => {mount = fn;}};
  window.HTMLElement.prototype.setSelectionRange = function() {};
  const location = {hash};
  const sandbox = {window, document, location, setTimeout:fn => {finish=fn;return 1;}, clearTimeout:()=>{finish=null;}};
  // 与 index.html 一致：失焦控制器先于页面模块装配
  vm.runInNewContext(fs.readFileSync('prototype/004-popup-dismiss.js','utf8'), sandbox);
  vm.runInNewContext(fs.readFileSync('prototype/052-personal-eva-gds.js','utf8'), sandbox);
  mount(document.querySelector('main'));
  const query = selector => document.querySelector(selector);
  const key = value => {const event = new window.Event('keydown',{bubbles:true,cancelable:true});event.key=value;query('.eva-composer-prompt').dispatchEvent(event);};
  const input = value => {const element=query('.eva-composer-prompt');element.value=value;element.dispatchEvent(new window.Event('input',{bubbles:true}));};
  return {window,query,key,input,complete:()=>{input('整理供应链会议');key('Enter');finish();}};
}

test('完成态打开及取消技能选择保留编辑器、文稿、页码与追问草稿',()=>{
  const app=setup(); app.complete();
  const editor=app.query('.eva-ed-col');
  const doc=app.query('.eva-document-preview');doc.textContent='已编辑的会议稿';
  app.query('[data-eva-personal-slide="2"]').click();
  app.input('继续补充'); app.key('@');
  assert.equal(app.window.__evaPersonalState(),'completed');
  assert.equal(app.query('.eva-ed-col'),editor);
  assert.ok(app.query('[role="listbox"]'));
  app.key('Escape');
  assert.equal(app.query('.eva-document-preview'),doc);
  assert.equal(doc.textContent,'已编辑的会议稿');
  assert.equal(app.query('[data-eva-personal-page]').textContent,'第 3 页');
  assert.equal(app.query('.eva-composer-prompt').value,'继续补充');
  assert.equal(app.query('[role="listbox"]'),null);
});

test('完成态选择技能不重建结果且追问草稿带上所选技能',()=>{
  const app=setup();app.complete();const editor=app.query('.eva-ed-col');
  app.input('补充风险');app.key('@');app.query('[data-eva-skill="writing"]').click();
  assert.equal(app.window.__evaPersonalState(),'completed');
  assert.equal(app.query('.eva-ed-col'),editor);
  assert.equal(app.query('.eva-composer-prompt').value,'补充风险');
  assert.match(app.query('[data-eva-personal-composer]').textContent,/文档写作/);
});

test('历史会话取消技能选择保持当前历史上下文',()=>{
  const app=setup('#/conversation/history-1');const history=app.query('.eva-personal-workspace__history');
  app.input('追问');app.key('@');app.key('Escape');
  assert.equal(app.window.__evaPersonalState(),'history');
  assert.equal(app.query('.eva-personal-workspace__history'),history);
  assert.equal(app.query('.eva-composer-prompt').value,'追问');
});

test('首页技能选择仍支持取消、选择和生成',()=>{
  const app=setup();app.input('会议提纲');app.key('@');app.key('Escape');
  assert.equal(app.query('.eva-composer-prompt').value,'会议提纲');
  app.key('@');app.query('[data-eva-skill="writing"]').click();
  assert.equal(app.window.__evaPersonalState(),'input');
  assert.match(app.query('[data-eva-personal-composer]').textContent,/文档写作/);
  app.key('Enter');assert.equal(app.window.__evaPersonalState(),'generating');
});
