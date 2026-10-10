import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=file=>fs.readFileSync(file,'utf8');

test('公共未读呈现对 React 与原生栏统一计数、截断、零值和转义',()=>{
 const window={};vm.runInNewContext(read('prototype/009-3-unread-ui.js'),{window});
 const ui=window.EvaUnreadUI;
 for(const count of [0,-1,NaN,Infinity,undefined])assert.equal(ui.badgeHTML({count}),'');
 assert.equal(ui.normalize(101).display,'99+');
 const html=ui.badgeHTML({count:101,label:'未读任务',unit:'个任务',attributes:{'data-test-id':'<x>'}});
 assert.match(html,/data-eva-unread="true"/);
 assert.match(html,/aria-label="101 个任务"/);
 assert.match(html,/>未读任务 99\+<\/span>/);
 assert.match(html,/data-test-id="&lt;x&gt;"/);
 const im=read('prototype/009-5-patch-im.js');
 assert.match(im,/window\.EvaUnreadUI\.normalize\(count\)/);
 assert.match(im,/const unreadGroupBadge=count=>h\(EvaUnreadBadge,\{count,unit:'个会话有未读消息'\}\)/);
 assert.match(read('prototype/052-personal-eva-gds.js'),/window\.EvaUnreadUI\.badgeHTML/);
});

test('公共 CSS 拥有数字外观，业务 CSS 只负责布局和状态',()=>{
 const common=read('prototype/017-im-shell.css');
 assert.match(common,/body \[data-eva-unread\] \{[^}]*background:\s*var\(--eva-unread-tonal-surface\)[^}]*color:\s*var\(--eva-unread-tonal-text\)/s);
 assert.doesNotMatch(common,/\[data-eva-unread-dot\]/);
 const ai=read('prototype/046-ai-team.css'),nav=read('prototype/012-mode-layer.css');
 for(const selector of ['eva-ai-team__session-unread']){
  const block=ai.match(new RegExp('\\.'+selector+'\\s*\\{([^}]*)\\}'))?.[1]||'';
  assert.doesNotMatch(block,/(?:background|color|font|border-radius|min-width|height|width)\s*:/);
 }
 assert.doesNotMatch(ai,/\.eva-ai-team__team-thread-row \.wk-conv-compact-badge\s*\{/);
 assert.doesNotMatch(nav,/\.eva-nav-icon__unread/);
 assert.match(read('prototype/009-6-patch-general.js'),/React\.createElement\(EvaUnreadBadge,\{count:reminders\.count\(projectId\),label/);
});
