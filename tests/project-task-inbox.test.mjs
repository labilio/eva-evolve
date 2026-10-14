import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {createPatchedRuntime} from '../tools/build-runtime.mjs';

test('项目任务工具栏 Inbox 复用当前项目未读数，并打开仅含关闭入口的占位 Popover', () => {
  const runtime = createPatchedRuntime().source;
  const css = fs.readFileSync('prototype/034-project-task-toolbar-v3.css', 'utf8');
  const inboxStart = runtime.indexOf('className:"eva-task-inbox"');
  const popoverStart = runtime.indexOf('EvaTaskInboxPopover=()=>');
  const popoverContent = runtime.slice(popoverStart, runtime.indexOf('));return React.createElement(evaForms.Popover', popoverStart) + 2);

  assert.ok(inboxStart >= 0);
  assert.match(runtime, /"aria-label":"未读任务"/);
  assert.match(runtime, /EvaTaskInboxPopover=\(\)=>/);
  assert.ok(runtime.indexOf('EvaProjectHomeIcon=createLucideIcon') > popoverStart);
  assert.match(runtime, /React\.createElement\(EvaInboxIcon,\{size:18\}\)/);
  assert.match(runtime, /React\.createElement\(EvaProjectUnreadTasks,\{projectId:currentSpaceId\(\)\}\)/);
  assert.match(runtime, /React\.createElement\(evaForms\.Popover,\{trigger:"click",visible:open,onVisibleChange:setOpen/);
  assert.match(runtime, /showArrow:false,bare:true/);
  assert.doesNotMatch(runtime.slice(popoverStart, runtime.indexOf('EvaProjectHomeIcon', popoverStart)), /getPopupContainer|document\.addEventListener/);
  assert.match(runtime, /className:"eva-task-inbox-popover__title"},"任务收件箱"/);
  assert.match(runtime, /className:"eva-task-inbox-popover__body"},"这里是任务的未读和提醒，具体怎么做还没想好"/);
  assert.match(runtime, /React\.createElement\(IconClose,null\)/);
  assert.doesNotMatch(popoverContent, /React\.createElement\((?:EvaInboxIcon|X|X\$\w+)/);
  assert.match(runtime, /className:"eva-task-inbox-divider","aria-hidden":true/);
  assert.match(
    runtime,
    /React\.createElement\(EvaTaskInboxPopover,null\)[\s\S]*className:"eva-task-inbox-divider"[\s\S]*ariaLabel:"任务视图：/,
  );

  assert.match(css, /\.eva-task-inbox\s*\{[^}]*position:\s*relative/s);
  assert.match(css, /\.eva-task-inbox-divider\s*\{[^}]*width:\s*1px/s);
  assert.match(css, /\.eva-task-inbox\s+\[data-eva-unread\]\s*\{[^}]*position:\s*absolute/s);
  assert.match(css, /\.eva-task-inbox-popover__head\s*\{[^}]*display:\s*flex/s);
});
