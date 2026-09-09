import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {zipSync,strToU8,unzipSync} from 'fflate';
const window={};vm.runInNewContext(fs.readFileSync('prototype/058-project-skill-create.js','utf8'),{window,TextDecoder,Uint8Array,btoa});
const read=entries=>{const bytes=zipSync(entries);return window.EvaProjectSkillCreate.readZip({name:'weekly.zip',size:bytes.length,arrayBuffer:async()=>bytes},unzipSync);};
test('ZIP preserves actual Markdown, nested references and binary attachments',async()=>{
 const binary=new Uint8Array([0,255,128,32]);
 const pack=await read({'weekly/SKILL.md':strToU8('---\nname: weekly\ndescription: 周报\n---\n# 本周进展'),'weekly/references/guide.md':strToU8('真实参考资料'),'weekly/assets/icon.png':binary,'__MACOSX/._SKILL.md':strToU8('ignored')});
 assert.match(pack.content,/# 本周进展/);assert.equal(pack.files[0].path,'references/guide.md');assert.equal(pack.files[0].content,'真实参考资料');assert.equal(pack.files[1].encoding,'base64');assert.deepEqual(Buffer.from(pack.files[1].content,'base64'),Buffer.from(binary));
});
test('ZIP accepts root SKILL.md and rejects missing, multiple, empty and unsafe packages',async()=>{
 assert.equal((await read({'SKILL.md':strToU8('# 根目录')})).files.length,0);
 for(const [files,pattern] of [[{'README.md':strToU8('text')},/未找到/],[{'a/SKILL.md':strToU8('a'),'b/SKILL.md':strToU8('b')},/一个 ZIP/],[{'SKILL.md':strToU8('')},/内容为空/],[{'SKILL.md':strToU8('ok'),'../outside.txt':strToU8('bad')},/路径/]])await assert.rejects(read(files),pattern);
});
test('ZIP rejects corrupt input and enforces expanded size before allocating file contents',async()=>{
 await assert.rejects(window.EvaProjectSkillCreate.readZip({name:'bad.zip',size:3,arrayBuffer:async()=>new Uint8Array([1,2,3])},unzipSync),/损坏/);
 await assert.rejects(window.EvaProjectSkillCreate.readZip({name:'huge.zip',size:1,arrayBuffer:async()=>new Uint8Array()},(bytes,{filter})=>filter({name:'SKILL.md',originalSize:51*1024*1024})),/50 MB/);
});
