import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('prototype/009-5-patch-im.js','utf8');
const body=source.slice(source.indexOf('function evaIMDateDividers('),source.indexOf('function evaRenderableMessage('));
const context={window:{__EVA_DEMO_TIME:{T1:'2026-09-02T10:00:00+08:00'}}};vm.createContext(context);vm.runInContext(body,context);
const divide=messages=>context.evaIMDateDividers(messages);
test('与 Octo 一致：首条及跨日期插入，同一天间隔再长也不插入',()=>{
 const rows=[{time:'2026-10-12T00:01:00',text:'a'},{time:'2026-10-12T23:59:00',text:'b'},{time:'2026-10-13T00:00:00',text:'c'}];
 const result=divide(rows);assert.equal(result.length,5);assert.equal(result[0].kind,'divider');assert.equal(result[3].kind,'divider');assert.equal(result[1],rows[0]);assert.equal(result[2],rows[1]);assert.equal(result[4],rows[2]);assert.equal(divide([]).length,0);
});
test('旧日期行转换不重复，系统消息参与日期分隔但正文不变',()=>{
 const system={kind:'system',text:'甲归档了项目',createdAt:'2026-10-12T10:00:00'};
 const result=divide([{kind:'divider',text:'9月2日'},{kind:'text',time:'09:00',text:'历史'},system]);
 assert.equal(result.length,4);assert.equal(result[2].text,'10月12日');assert.equal(result[3],system);assert.equal(divide(result).length,4);
});
test('秒时间戳按本地日期比较，系统与普通消息不分两套',()=>{
 const stamp=new Date(2026,9,12,10).getTime()/1000;
 const result=divide([{timestamp:stamp,kind:'system'},{timestamp:stamp+60,kind:'text'}]);assert.equal(result.filter(m=>m.kind==='divider').length,1);
});
