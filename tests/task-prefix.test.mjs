import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {pinyin} from 'pinyin-pro';
const context={window:{pinyinPro:{pinyin}}};
vm.runInNewContext(readFileSync('prototype/009-2-task-prefix.js','utf8'),context);
const prefix=context.window.EvaTaskPrefix;
test('拼音、英文和混合名称生成四位默认值，撞名依次延长',()=>{
 assert.equal(prefix.suggest('供应链运营协同',[]),'GYLY');
 assert.equal(prefix.suggest('AB测试',[]),'ABCS');
 assert.equal(prefix.suggest('Eva Team',[]),'EVAT');
 assert.equal(prefix.suggest('供应链运营协同',[{id:'a',issue_prefix:'GYLY'}]),'GYLYY');
 assert.equal(prefix.suggest('项目',[{id:'a',issue_prefix:'XM'}]),'');
});
test('只允许一到十位字母，仅其他项目当前前缀占用',()=>{
 const rows=[{id:'a',issue_prefix:'SC',issue_prefix_history:['OLD']}];
 assert.equal(prefix.validate(' ab ',rows),'AB');
 for(const value of ['','1','A1','A-B','ABCDEFGHIJK']) assert.throws(()=>prefix.validate(value,rows),/1–10/);
 assert.equal(prefix.validate('old',rows),'OLD');
 assert.throws(()=>prefix.validate('sc',[...rows,{id:'b',issue_prefix:'NEXT'}],'b'),/已被其他项目/);
});
test('改前缀更新已有编号但保留内部 ID、序号及旧编号解析',()=>{
 let rows=[{id:'a',issue_prefix:'SC',issue_prefix_history:[]}],issues={a:[{id:'task-a',number:3,identifier:'SC-103',parent_issue_id:'task-parent'}]};
 rows=prefix.change(rows,issues,'a','NEW',next=>{rows=next});
 assert.equal(issues.a[0].identifier,'NEW-103');
 assert.equal(issues.a[0].id,'task-a');
 assert.equal(issues.a[0].number,3);
 assert.equal(prefix.resolve(rows[0],issues,'SC-103')?.id,'task-a');
 rows=prefix.change(rows,issues,'a','NEXT',next=>{rows=next});
 assert.equal(prefix.resolve(rows[0],issues,'SC-103')?.id,'task-a');
 assert.equal(prefix.resolve(rows[0],issues,'NEW-103')?.id,'task-a');
 assert.equal(prefix.resolve(rows[0],issues,'task-a')?.identifier,'NEXT-103');
 assert.equal(prefix.validate('SC',[...rows,{id:'b',issue_prefix:'OTHER'}],'b'),'SC');
});
test('其他项目可复用曾用前缀，旧编号按项目上下文解析',()=>{
 let rows=[{id:'a',name:'原项目',issue_prefix:'OLD',issue_prefix_history:[]}];
 const issues={a:[{id:'task-a',identifier:'OLD-7'}],b:[{id:'task-b',identifier:'OLD-7'}]};
 rows=prefix.change(rows,issues,'a','NEW',next=>{rows=next});
 assert.equal(prefix.suggest('Old',[...rows]),'OLD');
 assert.equal(prefix.validate('OLD',rows),'OLD');
 rows.push({id:'b',name:'Old',issue_prefix:'OLD',issue_prefix_history:[]});
 assert.equal(prefix.resolve(rows[0],issues,'OLD-7')?.id,'task-a');
 assert.equal(prefix.resolve(rows[1],issues,'OLD-7')?.id,'task-b');
 assert.throws(()=>prefix.validate('OLD',rows,'a'),/已被其他项目/);
});
test('旧本地前缀迁移为字母并保留旧编号',()=>{
 let persisted;
 const rows=prefix.migrate([{id:'a',name:'原项目',issue_prefix:'P70'}],{a:[{id:'task-a',identifier:'P70-8'}]},next=>{persisted=next});
 assert.equal(rows[0].issue_prefix,'YXM');
 assert.equal(persisted[0].issue_prefix_history[0],'P70');
 assert.equal(prefix.resolve(rows[0],{a:[{id:'task-a',identifier:'YXM-8'}]},'P70-8')?.id,'task-a');
});
