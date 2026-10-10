import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {typography,popconfirmTheme} from '../prototype/063-ui-theme.js';
import {dialogText} from '../prototype/063-dialog-theme.js';
import {inspectImports,checkThemeImports} from '../tools/check-ui-theme.mjs';
import {buildComponentTheme,buildDialogTheme,buildCardTheme} from '../tools/build-dialog-theme.mjs';

test('旧公共文字出口与新主题为同一个对象',()=>assert.equal(dialogText,typography));
test('当前接入通过，业务直引和公共层未登记组件失败',()=>{
 checkThemeImports();
 for(const source of ["import P from '@douyinfe/semi-ui/lib/es/popconfirm'", "const P=import('@douyinfe/semi-ui')", "require('@douyinfe/semi-ui/lib/es/button')"])
  assert.ok(inspectImports('business.jsx',source).length);
 assert.ok(inspectImports('063-dialog.jsx',"import P from '@douyinfe/semi-ui/lib/es/popconfirm'").length);
});
test('官方主题映射不能悄悄接受拼错的参数',()=>assert.throws(()=>buildComponentTheme('popconfirm',{'radius-typo':'1px'},''),/Unknown Semi/));
test('Modal 仍有局部边界；Popconfirm 的原生外壳和 Portal 消费 Eva token',()=>{
 assert.match(buildDialogTheme(),/eva-dialog:not/);
 const css=buildComponentTheme('popconfirm',popconfirmTheme,'');
 assert.match(css,/\.semi-popconfirm-popover/);
 assert.match(css,/var\(--eva-radius-panel\)/);
 assert.match(css,/var\(--eva-space-4\)/);
 assert.doesNotMatch(css,/移出|danger|leftTop/);
});

test('构建拒绝业务重复设置公共字段留白或单独拼浮层按钮区',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'eva-composition-guard-'));fs.mkdirSync(path.join(root,'prototype'));
 try{for(const source of ['<FloatingForm><Form.Input fieldStyle={{paddingTop:12}}/></FloatingForm>','<FloatingActions form="custom"/>']){
 fs.writeFileSync(path.join(root,'prototype/business.jsx'),source);
 assert.throws(()=>checkThemeImports(root),/公共组合/);
 }fs.writeFileSync(path.join(root,'prototype/business.jsx'),'<FloatingForm><Form.Input fieldStyle={{display:"none"}}/></FloatingForm>');checkThemeImports(root);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

// Public files are not blanket exceptions for future, unthemed components.
test('公共文件不能预留尚未接入组件的导入豁免',()=>{
 for(const component of ['space','typography','descriptions','card'])
  assert.ok(inspectImports('063-file-controls.jsx',`import Control from '@douyinfe/semi-ui/lib/es/${component}'`).length);
 for(const component of ['button','tag','breadcrumb','dropdown'])
  assert.deepEqual(inspectImports('063-file-controls.jsx',`import Control from '@douyinfe/semi-ui/lib/es/${component}'`),[]);
});

test('Card 原生主题差异限制在公共 Card 内并引用 Eva token',()=>{
 const css=buildCardTheme();
 assert.match(css,/var\(--eva-space-4\)/);
 assert.match(css,/var\(--eva-radius-control\)/);
 for(const block of css.replace(/\/\*[\s\S]*?\*\//g,'').split('}')){
  const selector=block.split('{')[0].trim();if(!selector)continue;
  for(const part of selector.split(','))assert.match(part,/\.eva-card/);
 }
});
