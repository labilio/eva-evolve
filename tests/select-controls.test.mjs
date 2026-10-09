import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../prototype/004-select-controls.js',import.meta.url),'utf8'),{window});
const R={createElement:(type,props,...children)=>({type,props,children}),forwardRef:fn=>fn};
test('选项呈现只委托原生选择事件，禁用不写入，勾选位于内容之后',()=>{
 let n=0;const onClick=()=>n++;
 const selected=window.EvaSelectControls.option(R,'Check',{label:'王宜林',icon:'avatar',selected:true,onClick});
 assert.equal(selected.props.role,'option');assert.equal(selected.props['aria-selected'],true);
 assert.equal(selected.children.at(-1).type,'Check');selected.props.onClick();assert.equal(n,1);
 assert.equal(window.EvaSelectControls.option(R,'Check',{disabled:true,onClick}).props.onClick,undefined);
});
test('封装缓存组件身份，保留原生配置与单选、多选回填合同',()=>{
 function Select(){}Select.Option={};Select.OptGroup={};
 const C=window.EvaSelectControls.create(R,Select,'Check','Chevron');
 assert.equal(C,window.EvaSelectControls.create(R,Select,'Check','Chevron'));
 assert.equal(C.Option,Select.Option);
 const single=C({value:'a',dropdownClassName:'business'},'ref');assert.equal(single.props.ref,'ref');
 assert.equal(single.props.value,'a');assert.match(single.props.dropdownClassName,/eva-select-menu business/);
 assert.equal(single.props.renderSelectedItem({label:'A'}).type,'span');
 const multi=C({multiple:true},null);assert.equal(multi.props.renderSelectedItem({label:'A'}).isRenderInTag,true);
});
