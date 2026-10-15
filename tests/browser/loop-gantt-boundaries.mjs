import {settleMotion} from '../helpers/settle-motion.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('Edge：大量任务虚拟滚动保留焦点与日期弹层，只读和空状态完整',async()=>{
 const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
 try{
  for(const mode of ['large','readonly','empty']){
   const page=await browser.newPage({viewport:{width:1000,height:760}}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/#/collab?evaProject=prod&evaTab=tasks`);
   await page.evaluate(mode=>{
    const original=window.EvaLoopGanttView.render;
    window.EvaLoopGanttView.render=(props,deps)=>{
     const rows=mode==='empty'?[]:mode==='large'?Array.from({length:2000},(_,index)=>({...props.issues[0],id:'fixture-'+index,identifier:'QA-'+index,title:'大数据量验收任务 '+index})):props.issues;
     return original({...props,issues:rows,allIssues:rows},{...deps,canEdit:mode==='readonly'?()=>false:deps.canEdit});
    };
   },mode);
   await page.locator('.eva-task-view-menu').click();
   await page.locator('.eva-task-enum-menu:visible').getByText('甘特图',{exact:true}).click();
   const view=page.locator('.eva-task-gantt'),scroll=view.locator('.eva-task-gantt__scroll');await view.waitFor();
   if(mode==='large'){
    assert.ok(await view.locator('.eva-task-gantt__row').count()<60,'2000任务只挂载可视行与缓冲区');
    const first=view.locator('[data-task-id="fixture-0"]');
    await first.locator('.eva-task-gantt__duration').click();
    const editor=page.getByRole('dialog',{name:'任务日期'});await editor.waitFor();
    await scroll.evaluate(node=>{node.scrollTop=10000;});
    await settleMotion(page);
    assert.equal(await first.count(),1,'弹层打开时保持锚点任务行');
    assert.equal(await editor.isVisible(),true,'滚动不卸载日期弹层');
    await page.keyboard.press('Escape');await editor.waitFor({state:'hidden'});
    assert.equal(await first.locator('.eva-task-gantt__duration').evaluate(node=>document.activeElement===node),true,'关闭弹层返回原任务控件');
    await scroll.evaluate(node=>{node.scrollTop=node.scrollHeight;});await settleMotion(page);
    await view.locator('[data-task-id="fixture-1999"]').waitFor();
    assert.ok(await view.locator('.eva-task-gantt__row').count()<60,'滚动到底部仍保持虚拟化');
   }else if(mode==='readonly'){
    assert.equal(await view.locator('.eva-task-gantt__reorder,.eva-task-gantt__resize,.eva-task-gantt__create').count(),0);
    await view.getByRole('button',{name:'编辑 SC-101 的日期',exact:true}).click();
    const editor=page.getByRole('dialog',{name:'任务日期'});await editor.waitFor();
    assert.equal(await editor.getByRole('button',{name:'开始日期',exact:true}).isDisabled(),true);
    assert.equal(await editor.getByRole('button',{name:'截止日期',exact:true}).isDisabled(),true);
   }else{
    await view.getByText('暂无任务',{exact:true}).waitFor();
    assert.equal(await view.locator('.eva-task-gantt__row').count(),0);
    assert.equal(await view.getByRole('button',{name:'新建任务',exact:true}).isEnabled(),true);
   }
   assert.deepEqual(errors,[]);await page.close();
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
});
