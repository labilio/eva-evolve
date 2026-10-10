import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Exact import owners, not a blanket exemption for a folder or file prefix.
export const owners = Object.freeze({
 '063-forms.jsx':['form','button','_utils/semi-global'],
 '063-dialog.jsx':['modal','button'],
 '063-popover.jsx':['popover','button'],
 '063-popconfirm.jsx':['popconfirm'],
 '063-file-controls.jsx':['button','tag','breadcrumb','dropdown'],
 '063-select.jsx':['select'],
 '063-card.jsx':['card'],
 '063-info-list.jsx':['list'],
 '063-identity-list.jsx':['list'],
});
export function inspectImports(name, source) {
 const errors=[];
 for(const match of source.matchAll(/['"](@douyinfe\/semi-ui(?:\/[^'"\s]+)?)['"]/g)) {
  const component=match[1].replace('@douyinfe/semi-ui/lib/es/','');
  if(!owners[name]?.includes(component))errors.push(`${name}: ${match[1]} 必须经公共适配入口；新增组件先登记主题接入`);
 }
 if(name!=='063-popover.jsx' && /(?:<|\b)(?:\w+\.)?FloatingActions\b/.test(source))errors.push(`${name}: 公共组合必须使用 FloatingForm，不单独拼接浮层按钮区`);
 if(!['063-popover.jsx','063-forms.jsx'].includes(name) && /fieldStyle\s*(?:=\s*\{\s*\{|:\s*\{)[^}]*\b(?:padding(?:Top|Bottom|Left|Right)?|margin(?:Top|Bottom|Left|Right)?|fontSize|fontWeight)\s*:/.test(source))errors.push(`${name}: 公共组合负责字段留白和文字，业务 fieldStyle 不重复配置`);
 return errors;
}
export function checkThemeImports(root=process.cwd()) {
 const errors=[];
 function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){
  const file=path.join(dir,e.name);
  if(e.isDirectory())scan(file);
  else if(/\.(?:js|jsx|ts|tsx)$/.test(e.name))errors.push(...inspectImports(path.relative(path.join(root,'prototype'),file),fs.readFileSync(file,'utf8')));
 }}
 scan(path.join(root,'prototype'));
 if(errors.length)throw Error(errors.join('\n'));
}
if(process.argv[1]===fileURLToPath(import.meta.url)){checkThemeImports();console.log('Eva UI theme import boundary OK');}
