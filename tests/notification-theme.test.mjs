import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildNotificationTheme} from '../tools/build-dialog-theme.mjs';
import {inspectImports} from '../tools/check-ui-theme.mjs';

test('Notification 主题只作用于 Eva 通知并保留语义状态颜色',()=>{
 const css=buildNotificationTheme();
 for(const rule of css.replace(/\/\*[\s\S]*?\*\//g,'').split('}')){
  const selector=rule.split('{')[0].trim();if(!selector)continue;
  for(const part of selector.split(','))assert.match(part,/\.eva-notification/);
 }
 for(const token of ['--eva-surface-primary','--eva-radius-panel','--eva-text-primary','--eva-text-secondary'])assert.ok(css.includes(token));
 assert.deepEqual(inspectImports('063-notification.jsx',"import N from '@douyinfe/semi-ui/lib/es/notification'"),[]);
 assert.ok(inspectImports('business.jsx',"import N from '@douyinfe/semi-ui/lib/es/notification'").length);
});

test('通知复用 Eva 文字与间距，保留 Semi 动效和定位',()=>{const css=buildNotificationTheme();for(const value of ['--eva-space-2','--eva-fw-medium','--eva-font-sans','--eva-popover-shadow','25.144px','22px'])assert.ok(css.includes(value));assert.doesNotMatch(css,/animation|position:|z-index/);});
