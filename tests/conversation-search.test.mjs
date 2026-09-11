import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

async function searchFunction() {
  const source = await read('prototype/009-5-patch-im.js');
  const start = source.indexOf('function evaConversationSearchTimestamp');
  const end = source.indexOf('\nfunction evaRevealConversationMessage', start);
  assert.ok(start >= 0 && end > start, '应能提取纯查找函数');
  const context = {};
  vm.runInNewContext(source.slice(start, end) + '\nthis.search = evaSearchConversationMessages; this.fileSize = evaConversationSearchFileSize; this.fileDate = evaConversationSearchFileDate;', context);
  return context;
}

const NOW = Date.parse('2026-09-09T12:00:00+08:00');
const records = [
  {kind: 'divider', text: '9月9日'},
  {id: 'text-1', kind: 'text', sender: {uid: 'human-1', name: '王宜林'}, time: '09:10', text: '请复核评审结论'},
  {id: 'file-1', kind: 'file', sender: {uid: 'human-2', name: '何静'}, time: '09:20', file: {name: '评审纪要.pdf', extension: 'pdf'}},
  {id: 'image-1', kind: 'image', sender: {uid: 'human-1', name: '王宜林'}, time: '09:30', caption: '现场图片'},
  {id: 'video-1', kind: 'file', sender: {uid: 'ai-1', name: '质量助手', ai: true}, time: '09:40', file: {name: '复测过程.mp4', extension: 'mp4'}},
  {id: 'old-1', kind: 'text', sender: {uid: 'human-2', name: '何静'}, time: '2026-08-20T09:00:00+08:00', text: '历史记录'}
];

test('对话查找按关键字、类型、发送人与时间过滤', async () => {
  const {search} = await searchFunction();
  assert.equal(search(records, {keyword: '评审', now: NOW}).length, 2);
  assert.equal(search(records, {tab: 'message', keyword: '评审', now: NOW}).length, 1);
  assert.equal(search(records, {tab: 'file', now: NOW})[0].message.id, 'file-1');
  assert.equal(search(records, {tab: 'media', now: NOW}).length, 2);
  assert.equal(search(records, {senders: ['human-1'], now: NOW}).length, 2);
  assert.equal(search(records, {timeRange: 'today', now: NOW}).length, 4);
  assert.equal(search(records, {timeRange: '7d', now: NOW}).length, 4);
  assert.equal(search([{kind: 'text', sender: {uid: 'human-1', name: '王宜林'}, time: '18:00', text: '今天稍后的消息'}], {timeRange: 'today', now: NOW}).length, 1);
});

test('对话查找默认最新优先并支持最早优先', async () => {
  const {search} = await searchFunction();
  const newest = search(records, {tab: 'message', now: NOW});
  const oldest = search(records, {tab: 'message', sort: 'oldest', now: NOW});
  assert.equal(newest[0].message.id, 'text-1');
  assert.equal(oldest[0].message.id, 'old-1');
});

test('文件结果提供名称、大小与月日元数据', async () => {
  const {search,fileSize,fileDate} = await searchFunction();
  const [record] = search([{id:'file-meta',kind:'file',sender:{uid:'human-1',name:'王宜林'},time:'09:20',file:{name:'评审纪要.pdf',extension:'pdf',size:3146}}], {tab:'file',now:NOW});
  assert.equal(record.displayText, '评审纪要.pdf');
  assert.equal(record.fileExtension, 'pdf');
  assert.equal(fileSize(record.message.file.size), '3.1 KB');
  assert.equal(fileDate(record.timestamp), '09/09');
});

test('统一 IM 内核在当前 Ta 消息集合挂载唯一查找面板', async () => {
  const source = await read('prototype/009-5-patch-im.js');
  assert.match(source, /function EvaConversationSearch\(/);
  assert.match(source, /messages:Ta,onClose:/);
  assert.match(source, /conversationId:va/);
  assert.match(source, /onLocate:index=>evaRevealConversationMessage\(da\.current,index\)/);
  assert.match(source, /onPreview:file=>void \$a\(file\)/);
  assert.match(source, /onDownload:file=>void Na\(file\)/);
  assert.match(source, /预览文件 /);
  assert.match(source, /定位到聊天位置/);
  assert.match(source, /下载文件/);
  assert.match(source, /requestAnimationFrame\(\(\)=>onLocate\(record\.index\)\)/);
  assert.match(source, /fileMenuRefs=reactExports\.useRef\(new Map\(\)\)/);
  assert.match(source, /restoreFileMenuFocus\(record\)/);
  assert.match(source, /aria-controls":"eva-conversation-search-panel/);
  assert.match(source, /React\.createElement\(ChannelsView/);
  assert.doesNotMatch(source, /EvaConversationSearch[\s\S]{0,1200}innerHTML/);
});

test('查找右栏使用 Eva 组件色并以 380px 右侧浮层覆盖消息区', async () => {
  const [css, entry, manifest] = await Promise.all([
    read('prototype/055-conversation-search.css'),
    read('index.html'),
    read('prototype-manifest.json')
  ]);
  assert.match(css, /\.ch-right-panel--search[\s\S]*position:\s*absolute[\s\S]*inset:\s*0 0 0 auto[\s\S]*width:\s*380px/);
  assert.match(css, /--wk-color-accent:\s*var\(--eva-search-accent\)/);
  assert.match(css, /--wk-bg-hover:\s*var\(--gds-color-overlay-hover\)/);
  assert.match(css, /\.eva-conversation-search__tabs button\.is-active[\s\S]*color:\s*var\(--eva-search-accent\)[\s\S]*background:\s*var\(--eva-search-accent-soft\)/);
  assert.match(css, /\.eva-conversation-search__input[\s\S]*height:\s*32px[\s\S]*padding:\s*0 12px/);
  assert.match(css, /\.eva-conversation-search__input[\s\S]*background:\s*var\(--gds-color-surface-primary\)[\s\S]*border:\s*var\(--gds-border-standard\) solid var\(--gds-color-border-subtle\)/);
  assert.match(css, /\.eva-conversation-search__input:focus-within[\s\S]*border-color:\s*var\(--gds-color-border-focus\)[\s\S]*box-shadow:\s*none/);
  assert.match(css, /\.eva-conversation-search__file-title[\s\S]*font-size:\s*var\(--gds-type-label-font-size\)/);
  assert.match(css, /\.eva-conversation-search__file-meta[\s\S]*font-size:\s*var\(--gds-type-caption-font-size\)/);
  assert.match(css, /\.eva-conversation-search__filters[\s\S]*top:\s*168px[\s\S]*right:\s*var\(--gds-space-5\)[\s\S]*left:\s*var\(--gds-space-5\)/);
  assert.match(css, /\.eva-conversation-search__file-menu[\s\S]*opacity:\s*0/);
  assert.match(css, /\.eva-conversation-search__result\.is-file:focus-within[\s\S]*opacity:\s*1/);
  assert.match(css, /\.semi-dropdown-menu\.eva-conversation-search__file-dropdown[\s\S]*min-width:\s*200px/);
  assert.doesNotMatch(css, /button\.eva-chat-search-entry:not\(\.is-on\):not\(:hover\)/);
  assert.match(css, /@media \(max-width: 1099px\)[\s\S]*width:\s*min\(380px, 100%\)/);
  assert.doesNotMatch(css, /position:\s*fixed|backdrop-filter/);
  assert.match(entry, /prototype\/055-conversation-search\.css/);
  const styles = JSON.parse(manifest).blocks.filter(block => block.tag === 'style').map(block => block.file);
  assert.equal(styles.filter(file => file === 'prototype/055-conversation-search.css').length, 1);
  assert.deepEqual(styles.slice(-2), ['prototype/055-conversation-search.css', 'prototype/056-heading-system.css']);
});
