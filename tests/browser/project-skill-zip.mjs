import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {zipSync,strToU8} from 'fflate';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('project skill ZIP: two tabs, real import/edit, binary preservation, reset and project isolation',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});const page=await browser.newPage({viewport:{width:1200,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const screenshot=process.env.EVA_SKILL_SCREENSHOT;
 async function settings(){await page.getByRole('tab',{name:'项目设置',exact:true}).click();await page.getByRole('tab',{name:'技能',exact:true}).click();await page.getByRole('button',{name:'新建技能',exact:true}).waitFor();}
 async function openProject(name){await page.locator('[data-eva-nav-id="projects"]').click();await page.getByRole('button',{name,exact:true}).click();await settings();}
 const supply='供应链运营协同 协同推进间接采购、供应商质量与合规风控工作';
 try{
 await page.goto(origin+'/#/collab');await page.getByRole('button',{name:supply,exact:true}).click();await settings();await page.getByRole('button',{name:'新建技能',exact:true}).click();
 const modal=page.locator('.eva-skill-create');await modal.locator('.semi-modal-content').waitFor();assert.equal(await modal.getByRole('tab').count(),2);await modal.getByLabel('名称',{exact:true}).fill('draft-check');await modal.getByLabel('描述',{exact:true}).fill('中文草稿');await modal.getByLabel('技能内容',{exact:true}).fill('# 草稿正文');
 await modal.getByRole('tab',{name:'从 ZIP 导入'}).click();await modal.locator('.eva-skill-drop').waitFor();
 assert.equal(await modal.getByRole('tab',{name:'从 ZIP 导入'}).getAttribute('aria-selected'),'true');

 if(screenshot)await page.screenshot({path:screenshot+'-empty.png',animations:'disabled'});
 const upload=modal.locator('input[type=file]');
 await upload.setInputFiles({name:'bad.zip',mimeType:'application/zip',buffer:Buffer.from('broken')});await modal.getByRole('alert').waitFor();assert.equal(await modal.getByRole('button',{name:'导入为草稿'}).isDisabled(),true);
 const buffer=Buffer.from(zipSync({'weekly/SKILL.md':strToU8('---\nname: zip-weekly\ndescription: 整理项目周报\n---\n# 真实 ZIP 正文\n\n汇总项目进展与待办。'),'weekly/references/guide.md':strToU8('参考资料 ORIGINAL'),'weekly/assets/test.bin':new Uint8Array([0,255,128,3])}));
 await upload.setInputFiles({name:'项目周报.zip',mimeType:'application/zip',buffer});await modal.locator('.eva-skill-file').waitFor();assert.equal(await modal.getByLabel('名称',{exact:true}).inputValue(),'zip-weekly');await modal.getByLabel('名称',{exact:true}).fill('zip-weekly-edited');
 await modal.getByText('随附文件 · 2').click();
 if(screenshot)await page.screenshot({path:screenshot+'-ready.png',animations:'disabled'});
 await modal.getByRole('button',{name:'导入为草稿'}).click();await page.locator('.loop-sd').waitFor();await page.getByText('真实 ZIP 正文',{exact:true}).waitFor();
 await page.getByText('guide.md',{exact:true}).click();await page.getByText('参考资料 ORIGINAL',{exact:true}).waitFor();
 await page.getByText('test.bin',{exact:true}).click();assert.equal(await page.getByRole('link',{name:'下载文件'}).getAttribute('href'),'data:application/octet-stream;base64,AP+AAw==');
 await page.getByText('SKILL.md',{exact:true}).first().click();await page.locator('.loop-fv').getByRole('button',{name:'编辑',exact:true}).click();const editor=page.locator('.loop-fv__editor');await editor.fill((await editor.inputValue())+'\n保存后的内容');await page.locator('.loop-sd__topbar').getByRole('button',{name:'保存',exact:true}).click();await page.locator('.loop-sd__topbar').getByRole('button',{name:'返回',exact:true}).click();await page.locator('.loop-skill-list__row').filter({hasText:'zip-weekly-edited'}).waitFor();
 await page.getByRole('button',{name:'新建技能',exact:true}).click();assert.equal(await modal.getByLabel('名称',{exact:true}).inputValue(),'');await modal.getByLabel('名称',{exact:true}).fill('zip-weekly-edited');await modal.getByText('当前项目已有同名技能，请修改名称').waitFor();await modal.getByLabel('名称',{exact:true}).fill('draft-created');await modal.getByLabel('技能内容',{exact:true}).fill('# 空白创建验证');await modal.getByRole('button',{name:'创建',exact:true}).click();await page.locator('.loop-skill-list__row').filter({hasText:'draft-created'}).waitFor();
 await page.locator('[data-eva-nav-id="messages"]').click();await page.waitForURL('**/#/messages**');await openProject(supply);assert.equal(await page.locator('.loop-skill-list__row').filter({hasText:'zip-weekly-edited'}).count(),1);await page.locator('.loop-skill-list__row').filter({hasText:'zip-weekly-edited'}).click();await page.getByText('保存后的内容',{exact:false}).waitFor();await page.getByText('test.bin',{exact:true}).click();assert.equal(await page.getByRole('link',{name:'下载文件'}).getAttribute('href'),'data:application/octet-stream;base64,AP+AAw==');
 await openProject('团队文件功能设计 围绕相对稳定的共同使命沉淀团队文件功能设计与文件');assert.equal(await page.locator('.loop-skill-list__row').filter({hasText:'zip-weekly-edited'}).count(),0);assert.deepEqual(errors,[]);
 }finally{await browser.close();await new Promise(r=>server.close(r));}
});
