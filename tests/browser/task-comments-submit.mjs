import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('Edge：任务评论与回复发送后显示，并在重新打开任务时保留',async()=>{
  const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:800}});
    await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=tasks&evaTask=SC-103`);
    await page.locator('.loop-idp__title').waitFor();
    const commentText='请复核新增的质检结论。';
    const replyText='已收到，今天补齐证据。';
    const editor=page.locator('.loop-idp__newcomment .ProseMirror');
    await editor.fill(commentText);
    await page.locator('.loop-idp__newcomment button[aria-label="发送"]').click();
    const comment=page.locator('.loop-cmt').filter({hasText:commentText});
    await comment.waitFor();
    assert.match(await comment.innerText(),/王宜林/);
    await comment.locator('.loop-cmt__reply-stub').click();
    await comment.locator('.loop-cmt__reply .ProseMirror').fill(replyText);
    await comment.locator('.loop-cmt__reply button[aria-label="发送"]').click();
    await comment.getByText(replyText,{exact:true}).waitFor();
    await page.locator('.loop-idp__closebtn').click();
    await page.getByText('处理关键供应商来料质量异常',{exact:true}).first().click();
    const reopened=page.locator('.loop-cmt').filter({hasText:commentText});
    await reopened.getByText(replyText,{exact:true}).waitFor();
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});

test('Edge：任务评论可单独发送附件',async()=>{
  const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:800}});
    await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=tasks&evaTask=SC-103`);
    await page.locator('.loop-idp__title').waitFor();
    await page.locator('.loop-idp__newcomment input[type="file"]').setInputFiles({name:'复核补充记录.md',mimeType:'text/markdown',buffer:Buffer.from('复核记录')});
    await page.locator('.loop-idp__newcomment button[aria-label="发送"]').click();
    await page.locator('.loop-cmt').filter({hasText:'复核补充记录.md'}).waitFor();
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
