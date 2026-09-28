import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chromium} from 'playwright';
import {createServer} from '../../tools/serve.mjs';
import {fileURLToPath} from 'node:url';

test('Edge：项目任务链接在 IM 显示标题并打开原任务',async()=>{
  const server=createServer(fileURLToPath(new URL('../../dist',import.meta.url)));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  try{
    const context=await browser.newContext({permissions:['clipboard-read','clipboard-write']});
    const page=await context.newPage(),errors=[];
    await page.addInitScript(()=>{
      let membership;
      Object.defineProperty(window,'EvaMembership',{configurable:true,get(){return membership},set(api){
        membership={...api,bootstrap(...args){
          const store=api.bootstrap(...args);
          window.__taskLinkTestStore=store;
          return store;
        }};
      }});
    });
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/#/messages');
    const link=page.locator('[data-eva-task-link]').first();
    await link.waitFor();
    await page.getByText(/采购问 A-2409 什么时候能给供应商答复/).waitFor();
    await page.getByText(/待复核：A-2409 的隔离措施/).waitFor();
    assert.equal(await link.textContent(),'SC-103  处理关键供应商来料质量异常');
    assert.equal(await link.evaluate(el=>el.parentElement?.textContent),'SC-103  处理关键供应商来料质量异常','任务链接独立成行');
    assert.equal(await link.evaluate(el=>getComputedStyle(el).whiteSpace),'pre-wrap','浏览器保留两个空格');
    await link.click();
    await page.locator('.loop-idp__title').waitFor();
    await page.waitForTimeout(300);
    assert.equal(await page.locator('.loop-idp__title').inputValue(),'处理关键供应商来料质量异常');
    const projectIcon=page.locator('.loop-idp__crumb .loop-idp__project-icon');
    await projectIcon.waitFor();
    assert.equal(await projectIcon.getAttribute('aria-hidden'),'true','项目面包屑图标不重复朗读项目名');
    assert.equal(page.url(),origin+'/#/messages','点击后保留消息路由');
    const layout=await page.evaluate(()=>{
      const rect=selector=>document.querySelector(selector)?.getBoundingClientRect();
      const rail=rect('.eva-msg .ch-list'),project=rect('.eva-inline-project-panel'),drawer=rect('.eva-inline-project-panel .collab-route-right .panel');
      return {railVisible:!!rail&&rail.width>0,projectX:project?.x,projectWidth:project?.width,drawerX:drawer?.x,drawerWidth:drawer?.width,drawerRight:drawer?.right,projectRight:project?.right};
    });
    assert.equal(layout.railVisible,true,'左侧消息列表保持可见');
    assert.ok(layout.drawerX>layout.projectX&&layout.drawerWidth<layout.projectWidth-120,'任务以项目右侧的窄抽屉展示');
    assert.ok(Math.abs(layout.drawerRight-layout.projectRight)<1,'任务抽屉贴住项目面板右缘');
    const taskCrumbs=await page.evaluate(()=>['.loop-idp__crumb','.loop-idp__crumb-cur'].map(selector=>{
      const {y,height}=document.querySelector('.loop-idp__topbar '+selector).getBoundingClientRect();
      return {y,height};
    }));
    assert.deepEqual(taskCrumbs[0],taskCrumbs[1],'任务抽屉的项目名与任务标题共用同一高度和中心线');
    const taskText=await page.evaluate(()=>['.loop-idp__crumb-id','.loop-idp__crumb-title'].map(selector=>{
      const node=document.querySelector('.loop-idp__crumb-cur '+selector),range=document.createRange();
      range.selectNodeContents(node);
      const {y,height}=range.getBoundingClientRect();
      return {y,height};
    }));
    assert.deepEqual(taskText[0],taskText[1],'任务编号与中文标题的字形框对齐');

    await page.getByRole('button',{name:'更多操作'}).click();
    await page.getByText('复制任务链接').click();
    const copied=await page.evaluate(()=>navigator.clipboard.readText());
    assert.equal(copied,origin+'/#/collab?evaProject=prod&evaTab=tasks&evaTask=supply-3');

    await page.locator('.collab-route-right .loop-idp__closebtn').click();
    await page.locator('.collab-route-right').waitFor({state:'detached'});
    assert.equal(await page.locator('.eva-inline-project-panel').count(),1,'关闭任务后仍在右侧项目中');
    await page.locator('.ch-list').getByText('供应链运营协同',{exact:true}).last().click();
    await page.locator('.eva-inline-project-panel').waitFor({state:'detached'});
    await link.waitFor();
    await page.locator('.ch-list').getByText('关键供应商来料异常',{exact:true}).click();
    const imCrumbs=await page.evaluate(()=>['parent-group','separator','thread-name'].map(part=>{
      const {y,height}=document.querySelector('.ch-head .wk-chat-conversation-header-'+part).getBoundingClientRect();
      return {y,height};
    }));
    assert.deepEqual(imCrumbs,[imCrumbs[0],imCrumbs[0],imCrumbs[0]],'IM 父群名、箭头和子区名共用同一高度和中心线');
    await page.locator('.ch-list').getByText('供应链运营协同',{exact:true}).last().click();
    await link.waitFor();
    const composer=page.locator('[contenteditable=true][role=textbox]');
    await composer.fill(copied);
    await composer.press('Enter');
    await page.locator('[data-eva-task-link]').nth(1).waitFor();
    assert.deepEqual(await page.locator('[data-eva-task-link]').allTextContents(),[
      'SC-103  处理关键供应商来料质量异常',
      'SC-103  处理关键供应商来料质量异常',
    ]);
    await page.evaluate(()=>{
      const store=window.__taskLinkTestStore,canRead=store.canRead;
      store.canRead=(id,actor)=>id==='prod'?false:canRead(id,actor);
    });
    await page.locator('[data-eva-task-link]').first().click();
    assert.equal(page.url(),origin+'/#/messages','无项目权限时留在当前会话');
    assert.equal(await page.locator('.eva-inline-project-panel').count(),0,'无权限不打开项目面板');
    await page.getByText('你不是该任务所属项目的成员，无法查看任务').first().waitFor();
    const permission=await page.evaluate(()=>{
      const state=window.__taskLinkTestStore.snapshot();
      return {group:state.groups['community-product-co-creation'],project:state.projects['zhou-private-review'],actor:state.actorId};
    });
    assert.equal(permission.actor,'u-wangyilin');
    assert.equal(permission.group.projectId,null,'演示会话是无项目群');
    assert.ok(permission.group.humans.some(member=>member.id==='u-wangyilin'));
    assert.deepEqual(permission.project.humans.map(member=>member.id),['u-zhouyuan'],'任务只属于周远可访问的另一个项目');
    assert.equal(await page.evaluate(()=>window.__taskLinkTestStore.canRead('zhou-private-review','u-wangyilin')),false);
    assert.equal(await page.evaluate(()=>window.__taskLinkTestStore.canRead('zhou-private-review','u-zhouyuan')),true);
    await page.locator('.ch-list').getByText('近期体验反馈整理',{exact:true}).click();
    await page.getByText('我在另一个项目「周远的方案评审」').waitFor();
    const privateLink=page.locator('[data-eva-task-link="ZY-101"]');
    assert.equal(await privateLink.textContent(),'ZY-101  复核交互方案中的任务跳转边界');
    await privateLink.click();
    await page.getByText('你不是该任务所属项目的成员，无法查看任务').last().waitFor();
    assert.equal(await page.locator('.eva-inline-project-panel').count(),0,'王宜林点击周远另一个项目的任务后不打开详情');
    assert.deepEqual(errors,[]);
  }finally{
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
