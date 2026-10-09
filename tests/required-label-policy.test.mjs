import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requiredLabelPolicy} from '../prototype/063-form-policy.js';
test('混合表单只标必填；单字段、全必填、全选填不标；不改变业务必填配置',()=>{
 for(const [fields,expected] of [
 [[{label:'项目名称',required:true},{label:'共同目标'},{label:'项目成员',required:true}],[true,false,true]],
 [[{label:'群名',required:true}],[false]],
 [[{label:'群名',required:true},{label:'成员',required:true}],[false,false]],
 [[{label:'说明'},{label:'备注'}],[false,false]]
 ]){const original=structuredClone(fields);const label=requiredLabelPolicy(fields);assert.deepEqual(fields.map(f=>label(f).required),expected);assert.deepEqual(fields,original);}
});
