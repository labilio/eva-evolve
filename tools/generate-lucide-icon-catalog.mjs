import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const icon = (name, area, usage) => ({ name, area, usage });
const custom = (area, usage, image) => ({ name: '无 Lucide 名称', area, usage, image });
const sections = [
  ['导航栏自身', [
    ['个人', [custom('Eva 同学', '使用 Eva Logo', '../prototype/assets/eva-favicon.png'), custom('我的 Agent', '使用项目专属图片', '../prototype/assets/my-ai-collaboration.svg'), icon('presentation', '任务看板', '一级菜单'), icon('alarm-clock', '自动化任务', '一级菜单'), icon('cable', '连接中心', '一级菜单')]],
    ['团队协作', [icon('message-square', '我的消息', '一级菜单'), icon('layout-grid', '我的项目', '一级菜单'), icon('book-user', '通讯录', '一级菜单'), icon('hard-drive', '文件库', '一级菜单'), icon('globe', '站点', '一级菜单')]],
    ['其他', [icon('bot', '数字员工市场', '一级菜单')]],
  ]],
  ['个人', [
    ['Eva 同学', [icon('pencil', '中栏顶部', '新对话'), icon('folder', '文件夹与输入区', '文件夹行及当前文件夹'), icon('ellipsis', '文件夹行', '文件夹设置'), icon('plus', '对话与输入区', '新建对话、添加附件'), icon('chevron-down', '输入区', '展开文件夹选择'), icon('arrow-up', '输入区', '发送消息'), icon('sparkles', '快捷能力', '星睿智能体'), icon('mail', '快捷能力', '邮件操作'), icon('layout-grid', '快捷能力', '数据分析'), icon('cpu', '快捷能力', '技能开发'), icon('book-open', '快捷能力', '知识助手'), icon('link-2', '快捷能力', '飞书协作'), icon('chevron-right', '快捷能力', '更多快捷能力')]],
    ['我的 Agent', [icon('plus', '会话列表', '新建会话'), icon('chevron-right', '会话列表', '展开团队及 Agent 分组'), icon('corner-down-right', '会话列表', '子区入口'), icon('ellipsis', '会话列表与头部', '更多操作、子区信息'), icon('search', '会话头部', '查找聊天内容'), icon('save', '文件消息', '存到文件库'), icon('download', '文件消息', '下载文件'), icon('smile', '消息输入区', '表情'), icon('at-sign', '消息输入区', '提及成员'), icon('paperclip', '消息输入区', '添加文件'), icon('mic', '消息输入区', '语音输入'), icon('arrow-up', '消息输入区', '发送消息')]],
    ['任务看板', [icon('rotate-ccw', '页面操作区', '刷新'), icon('zap', '页面操作区', '提醒调度器'), icon('plus', '页面操作区', '新建卡片'), icon('layout-grid', '统计区', '任务总数'), icon('circle-check', '统计区', '活跃任务'), icon('play', '统计区', '运行中'), icon('shield', '统计区', '诊断'), icon('clock', '统计区', '最早就绪'), icon('search', '筛选区', '搜索卡片、标签、助理或运行信息')]],
    ['自动化任务', [icon('clock-3', '视图切换', '按时间查看'), icon('list-checks', '视图切换', '按任务列表查看'), icon('plus', '页面操作区', '添加自动化')]],
    ['连接中心', [icon('search', '页面工具栏', '搜索连接器'), icon('plus', '页面工具栏', '添加连接器'), icon('link-2', '连接器列表', '链接类连接器'), icon('mail', '连接器列表', '邮件类连接器'), icon('folder', '连接器列表', '文件类连接器')]],
  ]],
  ['团队协作', [
    ['我的消息', [icon('plus', '会话列表', '新建会话'), icon('grip-vertical', '会话列表', '拖动分组与会话排序'), icon('chevron-right', '会话列表', '展开项目或分组'), icon('chevron-down', '会话列表', '收起子区'), icon('layout-grid', '会话列表与头部', '打开所属项目任务页'), icon('corner-down-right', '会话列表与头部', '子区入口'), icon('ellipsis', '会话列表与头部', '分组操作、聊天信息'), icon('search', '会话头部', '查找聊天内容'), icon('clipboard-list', '会话头部', '聊天任务'), icon('save', '文件消息', '存到文件库'), icon('download', '文件消息', '下载文件'), icon('smile', '消息输入区', '表情'), icon('at-sign', '消息输入区', '提及成员'), icon('paperclip', '消息输入区', '添加文件'), icon('mic', '消息输入区', '语音输入'), icon('arrow-up', '消息输入区', '发送消息')]],
    ['我的项目', [icon('plus', '页面操作区', '新建项目'), icon('search', '项目列表', '搜索项目'), icon('pin', '项目卡片', '置顶或取消置顶')]],
    ['通讯录', [icon('search', '通讯录', '搜索联系人')]],
    ['文件库', [icon('pin', '文件导航与文件行', '置顶区域及置顶操作'), icon('file-text', '文件导航与文件行', '个人文件库及文档'), icon('layout-grid', '文件导航', '项目文件库'), icon('folder', '文件导航', '回收站及外部文件夹'), icon('chevron-down', '添加外部资源', '展开菜单'), icon('link-2', '添加外部资源', '外部链接'), icon('search', '页面工具栏', '搜索文件'), icon('file-spreadsheet', '文件列表', '表格文件'), icon('ellipsis', '文件列表', '更多操作')]],
    ['站点', []],
  ]],
  ['其他', [['数字员工市场', [icon('search', '市场列表', '搜索数字员工')]]]],
].map(([group, pages]) => ({ group, pages: pages.map(([title, items]) => ({ title, items })) }));

const allItems = sections.flatMap(section => section.pages.flatMap(page => page.items));
const names = new Set(allItems.filter(item => !item.image).map(item => item.name));
const data = JSON.stringify(sections).replaceAll('<', '\\u003c');
const date = new Date().toISOString().slice(0, 10);
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Eva · 当前可见图标清单</title><style>
:root{--blue:#1563eb;--ink:#172033;--muted:#667085;--line:#dfe3e8;--soft:#f6f8fb}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--ink);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1240px;margin:auto;padding:42px 32px 72px}h1{margin:0;font-size:30px}header p{margin:8px 0 0;color:var(--muted)}.toolbar{position:sticky;top:0;z-index:5;display:flex;gap:12px;align-items:center;margin:26px 0;padding:12px 0;background:#fffffff2;backdrop-filter:blur(10px)}input{width:min(460px,100%);height:40px;border:1px solid var(--line);border-radius:10px;padding:0 13px;font:inherit;outline:none}input:focus{border-color:var(--blue);box-shadow:0 0 0 3px #1563eb1f}.count{color:var(--muted)}.group{margin:34px 0}.group>h2{margin:0 0 16px;font-size:22px}.page{margin-bottom:26px}.page h3{margin:0 0 10px;font-size:15px}.page h3 span{color:var(--muted);font-size:12px;font-weight:500}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}.card{display:grid;grid-template-columns:48px minmax(0,1fr);gap:12px;align-items:center;min-height:94px;padding:13px;border:1px solid var(--line);border-radius:12px;color:inherit;text-decoration:none}.card.link:hover{border-color:#aac7f8;background:#f8fbff}.preview{display:grid;place-items:center;width:48px;height:48px;border-radius:10px;background:var(--soft)}.preview img{width:26px;height:26px;object-fit:contain}.name{font-weight:650}.place,.usage{display:block;margin-top:2px;color:var(--muted);font-size:12px}.place{color:#315887}.kind{display:inline-block;margin-top:5px;padding:1px 6px;border-radius:99px;background:#edf3ff;color:#1555ba;font-size:10px}.kind.custom{background:#f2f3f5;color:#626b7a}.empty{color:var(--muted);font-size:12px}@media(max-width:600px){main{padding:28px 18px}.toolbar{align-items:stretch;flex-direction:column}.grid{grid-template-columns:1fr}}
</style></head><body><main><header><h1>Eva · 当前可见图标清单</h1><p>按现行导航分类，仅保留本地原型实际可见的图标。共 <strong>${names.size}</strong> 个 Lucide 名称，生成于 ${date}。</p></header><div class="toolbar"><input id="search" type="search" placeholder="搜索图标、页面或用途"><span class="count" id="count"></span></div><div id="catalog"></div></main><script>
const sections=${data},catalog=document.querySelector('#catalog'),search=document.querySelector('#search'),count=document.querySelector('#count');const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function render(){const q=search.value.trim().toLowerCase();let shown=0;catalog.innerHTML=sections.map(s=>{const pages=s.pages.map(p=>{const items=p.items.filter(i=>[i.name,i.area,i.usage,p.title,s.group].join(' ').toLowerCase().includes(q));shown+=items.length;if(!items.length&&q)return'';const cards=items.map(i=>{const isLucide=!i.image,src=isLucide?'https://unpkg.com/lucide-static@0.577.0/icons/'+i.name+'.svg':i.image,inside='<span class="preview"><img src="'+esc(src)+'" alt=""></span><span><span class="name">'+esc(i.name)+'</span><span class="place">'+esc(i.area)+'</span><span class="usage">'+esc(i.usage)+'</span><span class="kind '+(isLucide?'':'custom')+'">'+(isLucide?'Lucide':'项目自定义')+'</span></span>';return isLucide?'<a class="card link" href="https://lucide.dev/icons/'+i.name+'" target="_blank" rel="noopener">'+inside+'</a>':'<div class="card">'+inside+'</div>'}).join('');return'<section class="page"><h3>'+esc(p.title)+' <span>'+items.length+' 项</span></h3>'+(cards?'<div class="grid">'+cards+'</div>':'<div class="empty">当前页面没有额外可见的 Lucide 图标</div>')+'</section>'}).join('');return pages?'<section class="group"><h2>'+esc(s.group)+'</h2>'+pages+'</section>':''}).join('');count.textContent='显示 '+shown+' 个使用位置'}search.addEventListener('input',render);render();
</script></body></html>`;
const output = path.join(root, 'docs/lucide-icon-catalog.html');
fs.writeFileSync(output, html);
console.log(`Wrote ${path.relative(root, output)} with ${names.size} visible Lucide icons across ${allItems.length} usage entries.`);
