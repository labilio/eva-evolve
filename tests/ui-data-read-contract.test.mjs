import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../prototype/',import.meta.url));
test('UI 获取当前账号必须用定向接口，不复制全部业务状态',()=>{
 for(const name of readdirSync(root).filter(name=>name.endsWith('.js'))){
  assert.doesNotMatch(readFileSync(root+'/'+name,'utf8'),/\.snapshot\(\)\s*\.actorId/,name+' 应使用 actorId()');
 }
});
test('文件权限和身份目录不依赖全量成员聊天快照',()=>{
 for(const name of ['009-1-file-sharing.js','009-3-contact-identities.js','033-contacts-redesign-v2.js','047-digital-employees.js']){
  assert.doesNotMatch(readFileSync(root+'/'+name,'utf8'),/\b(?:membership|members|store)\.snapshot\(/,name+' 应使用项目/身份定向读取');
 }
});
