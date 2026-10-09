import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=name=>fs.readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('只有共享模块配置 Semi Form，业务不得导入另一份 Form 或主题',()=>{
 const paths=fs.readdirSync(new URL('../prototype/',import.meta.url)).filter(name=>/\.(?:js|jsx)$/.test(name));
 for(const name of paths){
  const code=read('prototype/'+name);
  if(name!=='063-forms.jsx')assert.doesNotMatch(code,/overrideDefaultProps|from\s+['"]@douyinfe\/semi-ui\/.*form['"]/,name+' 必须通过公共 forms 接入');
 }
 const code=read('prototype/063-forms.jsx');
 assert.match(code,/overrideDefaultProps/);assert.match(code,/createValidationQueue/);
 assert.match(read('tools/build-forms.mjs'),/must reuse Eva React\/ReactDOM/);
});

test('普通弹窗保持原生遮罩和 Escape 关闭，统一操作按钮主题',()=>{
 const code=read('prototype/063-dialog.jsx');
 assert.match(code,/maskClosable closeOnEsc/);
 assert.doesNotMatch(code,/maskClosable=\{(?:!busy|!saving)\}/);
 assert.match(code,/type="tertiary" theme="light"/);
 assert.match(code,/type=\{danger\?'danger':'primary'\} theme="solid"/);
 assert.doesNotMatch(code,/<Button[^>]*onClick=\{onCancel\}[^>]*disabled/);
 const css=read('prototype/009-2-members.css');
 assert.doesNotMatch(css,/body:has\(\.eva-members-modal\)\s+\.semi-modal-mask/,'不得全局二次偏移公共 Portal 的遮罩');
});

test('迁移过的提交入口保留公共 Form 接入，文件双入口只有一个提交实现',()=>{
 for(const file of ['009-2-members-ui.js','009-2-chat-settings.js','009-5-patch-im.js','009-6-patch-general.js','049-loop-task-create.js','058-project-skill-create.js'])assert.match(read('prototype/'+file),/useSubmission/,file);
 for(const file of ['009-1-project-files-ui.js','020-mode-layer.js'])assert.match(read('prototype/'+file),/FileForm|sharedFileForm/,file);
 const fileForm=read('prototype/063-file-form.jsx');
 assert.match(fileForm,/useSubmission/);assert.match(fileForm,/<Dialog/);assert.match(fileForm,/<Actions/);
 for(const file of ['063-file-form.jsx','063-personal-folder-form.jsx','063-personal-rail-form.jsx'])assert.doesNotMatch(read('prototype/'+file),/<(?:input|textarea|select)\b(?![^>]*type="file")/,'普通字段使用原生 Form 控件：'+file);
 assert.match(read('AGENTS.md'),/表单统一规范/);
});

test('业务不得覆盖 Semi 字段错误排版和颜色',()=>{
 for(const name of fs.readdirSync(new URL('../prototype/',import.meta.url)).filter(n=>n.endsWith('.css'))){
  const css=read('prototype/'+name);
  for(const rule of css.matchAll(/([^{}]*semi-form-field-error-message[^{}]*)\{([^{}]*)\}/g)){
   assert.doesNotMatch(rule[2],/(?:font(?:-[\w-]+)?|line-height|color|margin(?:-[\w-]+)?|padding(?:-[\w-]+)?)\s*:/,name+' 应使用原生错误样式');
  }
 }
 assert.match(read('prototype/063-forms.jsx'),/<Form.ErrorMessage error=\{error\}/);
});
