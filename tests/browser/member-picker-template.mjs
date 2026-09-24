import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { createServer } from '../../tools/serve.mjs';

test('拉人模板 A：项目建群入口使用可搜索的双栏候选与已选结构', async () => {
  const server=createServer(new URL('../../dist',import.meta.url).pathname);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const browser=await chromium.launch(process.platform==='darwin'?{channel:'msedge'}:{});
  try {
    const context=await browser.newContext({viewport:{width:1200,height:800}});
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/?picker-preview=create#/collab?evaProject=prod&evaTab=settings');
    const dialog=page.getByRole('dialog').filter({hasText:'新建群聊'});
    await dialog.waitFor();
    const picker=dialog.locator('.eva-member-picker');
    assert.equal(await picker.count(),1);
    assert.equal(await picker.locator('.eva-member-picker__available').count(),1);
    assert.equal(await picker.locator('.eva-member-picker__selected').count(),1);
    assert.equal(await dialog.getByRole('textbox',{name:'搜索可选成员'}).count(),1);
    assert.equal(await dialog.locator('.eva-picker-selected').count(),0,'不再显示旧版已选 chips 区');
    await dialog.getByText('项目管理员',{exact:true}).waitFor();
    assert.equal(await dialog.getByText('加入后拥有群管理权限',{exact:true}).count(),0,'项目建群候选只显示短治理身份');

    const first=picker.locator('.eva-member-picker__candidate').first();
    await first.click();
    assert.equal(await picker.locator('.eva-member-picker__selected-item').count(),1);
    const avatarSize=await picker.locator('.eva-member-picker__selected-avatar').first().evaluate(node=>{
      const box=node.getBoundingClientRect();
      return [box.width,box.height];
    });
    assert.deepEqual(avatarSize,[28,28]);
    await picker.locator('.eva-member-picker__selected-item button').click();
    assert.equal(await picker.locator('.eva-member-picker__selected-item').count(),0);
    await dialog.getByRole('button',{name:'取消',exact:true}).click();

    await page.goto(origin+'/#/collab?evaProject=prod&evaTab=settings');
    await page.getByRole('tab',{name:'成员管理',exact:true}).click();
    await page.getByRole('button',{name:'添加成员',exact:true}).click();
    const actual=page.getByRole('dialog').filter({hasText:'添加项目成员'});
    await actual.waitFor();
    assert.equal(await actual.locator('.eva-member-picker').count(),1,'实际项目入口必须使用模板 A');
    assert.equal(await actual.getByRole('textbox',{name:'搜索可选成员'}).count(),1);
    assert.equal(await actual.locator('.eva-member-picker--selection-only').count(),1,'纯拉人使用无表单留白的双栏形态');
    assert.equal(await actual.locator('.eva-member-picker__label').count(),0,'纯拉人不显示外层成员标签');
    const purePickerGeometry=await actual.evaluate(node=>{
      const root=node.querySelector('.eva-member-picker').getBoundingClientRect();
      const panel=node.querySelector('.eva-member-picker__panel').getBoundingClientRect();
      return {leftGap:Math.round(panel.left-root.left),widthGap:Math.round(root.width-panel.width)};
    });
    assert.deepEqual(purePickerGeometry,{leftGap:0,widthGap:0},'纯拉人的左右选择面板占满内容宽度');
    await actual.getByRole('button',{name:'取消',exact:true}).click();

    await page.goto(origin+'/#/messages');
    await page.locator('.wk-conv-compact-item').filter({hasText:'供应链运营协同'}).first().click();
    await page.locator('.op[aria-label="打开聊天信息"]').click();
    let chatSettings=page.getByRole('complementary',{name:'聊天信息管理'});
    assert.equal(await chatSettings.getByText('项目中的成员自动加入全员群，无法退出。',{exact:true}).count(),0,'全员群设置首页不重复成员规则说明');
    await chatSettings.getByRole('button',{name:/^查看全部 \d+ 名成员$/}).click();
    await chatSettings.getByRole('heading',{name:/^群聊成员（\d+）$/}).waitFor();
    const allMemberSearch=chatSettings.getByRole('textbox',{name:'搜索群聊成员'});
    await allMemberSearch.waitFor();
    const allMemberNote=chatSettings.getByText('全员群成员与项目成员同步，不能在群内单独增删或退出。',{exact:true});
    await allMemberNote.waitFor();
    const allMemberSearchAndNote=await chatSettings.evaluate(node=>{
      const search=node.querySelector('.eva-chat-member-search').getBoundingClientRect();
      const note=node.querySelector('.eva-chat-member-page-note').getBoundingClientRect();
      return {searchBottom:Math.round(search.bottom),noteTop:Math.round(note.top)};
    });
    assert.ok(allMemberSearchAndNote.noteTop>=allMemberSearchAndNote.searchBottom,'全员群规则说明应位于搜索框下方');
    assert.equal(await chatSettings.getByRole('button',{name:'前往项目成员管理',exact:true}).count(),0,'全员群成员页不提供跳转按钮');
    const allMemberRows=chatSettings.locator('.eva-chat-member-list-row');
    assert.ok(await allMemberRows.count()>1,'全员群成员页应展示完整成员列表');
    await chatSettings.getByRole('button',{name:'返回聊天信息',exact:true}).click();
    await chatSettings.getByRole('button',{name:'关闭聊天信息',exact:true}).click();

    await page.locator('.wk-conv-compact-item').filter({hasText:'采购与招投标'}).first().click();
    await page.locator('.op[aria-label="打开聊天信息"]').click();
    chatSettings=page.getByRole('complementary',{name:'聊天信息管理'});
    assert.equal(await chatSettings.getByRole('button',{name:'添加群聊成员',exact:true}).count(),1,'聊天信息预览保留加号拉人入口');
    await chatSettings.getByRole('button',{name:/^查看全部 \d+ 名成员$/}).click();
    await chatSettings.getByRole('heading',{name:/^群聊成员（\d+）$/}).waitFor();
    const memberSearch=chatSettings.getByRole('textbox',{name:'搜索群聊成员'});
    await memberSearch.waitFor();
    assert.equal(await chatSettings.getByRole('button',{name:'添加成员',exact:true}).count(),0,'完整成员页不提供第二个拉人入口');
    assert.ok(await chatSettings.getByRole('button',{name:'移除',exact:true}).count()>0,'完整成员页保留已发布的有权限成员移除入口');
    const memberRows=chatSettings.locator('.eva-chat-member-list-row');
    const memberCount=await memberRows.count();
    assert.ok(memberCount>1,'完整成员页应展示多名成员');
    await memberSearch.fill('林晓');
    assert.equal(await memberRows.count(),1,'完整成员页搜索按成员名称过滤');
    await chatSettings.getByRole('button',{name:'返回聊天信息',exact:true}).click();
    await page.getByRole('button',{name:'添加群聊成员',exact:true}).click();
    const groupAdd=page.getByRole('dialog').filter({hasText:'添加群聊成员'});
    await groupAdd.waitFor();
    assert.equal(await groupAdd.locator('.eva-member-picker').count(),1,'聊天信息入口必须使用模板 A');
    assert.equal(await groupAdd.getByRole('textbox',{name:'搜索可选成员'}).count(),1);
    assert.equal(await groupAdd.locator('.eva-member-picker--selection-only').count(),1,'群聊加人也使用纯拉人形态');
    assert.equal(await groupAdd.getByText('00',{exact:true}).count(),0,'空候选分组不能渲染神秘数字');
    await groupAdd.getByText(/^联系人 \d+$/).waitFor();
    await groupAdd.getByText('我的 AI 分身 1',{exact:true}).waitFor();
    await groupAdd.getByText('王宜林的 AI 分身',{exact:true}).waitFor();
    assert.equal(await groupAdd.getByText('同事',{exact:true}).count(),0,'联系人候选分组不使用“同事”称呼');
    const humanGroup=groupAdd.locator('.eva-member-picker__candidate-group').filter({hasText:/联系人/});
    assert.ok(await humanGroup.locator('.eva-member-picker__candidate').count()>0,'普通群应保留可拉入的项目联系人');
    await humanGroup.getByText('HR',{exact:true}).waitFor();
    const unassignedHuman=humanGroup.locator('.eva-member-picker__candidate').filter({hasText:'惠玲'});
    assert.equal(await unassignedHuman.locator('.eva-members-human-role').count(),0,'未配置项目角色的联系人第二行留空');
    assert.equal(await groupAdd.getByText('加入后拥有群管理权限',{exact:true}).count(),0,'不显示冗长的权限说明');
    assert.equal(await groupAdd.locator('.eva-member-picker__candidate-group').filter({hasText:'我的 AI 分身'}).locator('.eva-member-picker__candidate').count(),1,'王宜林可同时看到自己已在项目中的 AI 分身');
    await groupAdd.getByRole('textbox',{name:'搜索可选成员'}).fill('不存在的成员');
    await groupAdd.getByText('没有匹配的成员',{exact:true}).waitFor();
    await groupAdd.getByRole('textbox',{name:'搜索可选成员'}).fill('');
    for(const candidate of await groupAdd.locator('.eva-member-picker__candidate').all())await candidate.click();
    await groupAdd.getByRole('button',{name:'确认添加',exact:true}).click();
    await page.getByRole('button',{name:'添加群聊成员',exact:true}).click();
    await groupAdd.getByText('项目内可选成员均已加入当前群聊',{exact:true}).waitFor();
    await groupAdd.getByText('如需添加其他人，请先将其加入项目',{exact:true}).waitFor();
    const emptyCopyStyle=await groupAdd.locator('.eva-member-picker__empty').evaluate(node=>{
      const title=getComputedStyle(node.querySelector('p'));
      const description=getComputedStyle(node.querySelector('small'));
      return {
        title:{fontSize:title.fontSize,color:title.color,fontWeight:title.fontWeight},
        description:{fontSize:description.fontSize,color:description.color,fontWeight:description.fontWeight,marginTop:description.marginTop}
      };
    });
    assert.deepEqual(emptyCopyStyle,{
      title:{fontSize:'13px',color:'rgb(107, 114, 128)',fontWeight:'400'},
      description:{fontSize:'12px',color:'rgb(147, 147, 147)',fontWeight:'400',marginTop:'8px'}
    },'空状态的状态说明与行动提示使用克制的灰色小字层级');
    await groupAdd.getByRole('button',{name:'取消',exact:true}).click();

    await page.goto(origin+'/#/collab?evaProject=prod&evaTab=settings');
    await page.getByRole('tab',{name:'成员管理',exact:true}).click();
    await page.getByRole('button',{name:'添加成员',exact:true}).click();
    let projectAdd=page.getByRole('dialog').filter({hasText:'添加项目成员'});
    const projectCandidates=await projectAdd.locator('.eva-member-picker__candidate').all();
    assert.ok(projectCandidates.length>0,'演示项目应有尚未加入的组织成员用于验证项目空状态');
    for(const candidate of projectCandidates)await candidate.click();
    await projectAdd.getByRole('button',{name:'确认添加',exact:true}).click();
    await page.getByRole('button',{name:'添加成员',exact:true}).click();
    projectAdd=page.getByRole('dialog').filter({hasText:'添加项目成员'});
    await projectAdd.getByText('所有可添加成员均已加入项目',{exact:true}).waitFor();
    assert.equal(await projectAdd.getByText('00',{exact:true}).count(),0,'项目空候选也不能渲染数字');
    await projectAdd.getByRole('button',{name:'取消',exact:true}).click();

    await page.goto(origin+'/#/messages');
    await page.locator('.eva-message-invite').click();
    await page.getByRole('menuitem',{name:'新建群聊',exact:true}).click();
    const createGroup=page.getByRole('dialog').filter({hasText:'新建群聊'});
    await createGroup.waitFor();
    assert.equal(await createGroup.locator('.eva-member-picker').count(),1,'新建群聊入口必须使用模板 A');
    assert.equal(await createGroup.locator('.eva-member-picker--selection-only').count(),0,'带名称的创建流程保留表单形态');
    assert.equal(await createGroup.getByLabel('群聊名称',{exact:true}).count(),1);
    // 提交时校验：空名/未选成员点击必须有行内反馈并聚焦名称框，而不是按钮静默禁用
    await createGroup.getByRole('button',{name:'创建群聊',exact:true}).click();
    const createGroupError=createGroup.locator('.eva-member-picker__field-error');
    await createGroupError.waitFor({timeout:5000});
    assert.equal((await createGroupError.innerText()).trim(),'请输入群聊名称','空名点击应提示「请输入群聊名称」');
    // 错误长在出错字段旁边：名称错误紧贴输入框下方，不得堆到弹窗底部
    const errorPlacement=await page.evaluate(()=>{
      const input=document.getElementById('eva-member-picker-name'),errorNode=document.querySelector('.eva-member-picker__field-error');
      const inputRect=input.getBoundingClientRect(),errorRect=errorNode.getBoundingClientRect();
      return {inField:!!errorNode.closest('.eva-member-picker__field'),gap:Math.round(errorRect.top-inputRect.bottom)};
    });
    assert.equal(errorPlacement.inField,true,'名称错误应渲染在群聊名称字段内');
    assert.ok(errorPlacement.gap>=0&&errorPlacement.gap<=40,'名称错误应紧贴输入框下方');
    assert.equal(await createGroup.getByLabel('群聊名称',{exact:true}).evaluate(node=>node===document.activeElement),true,'报错后焦点应回到群聊名称输入框');
    assert.equal(await createGroup.count(),1,'校验失败不应创建群聊或关闭弹窗');
    await createGroup.getByLabel('群聊名称',{exact:true}).fill('模板验收群');
    assert.equal(await createGroupError.count(),0,'输入群名后错误应消失');
    await createGroup.getByRole('button',{name:'创建群聊',exact:true}).click();
    assert.equal((await createGroupError.innerText()).trim(),'请至少选择 1 位群成员','未选成员时点击应提示成员不足');
    assert.equal(await createGroup.locator('.eva-member-picker__members .eva-member-picker__field-error').count(),1,'成员错误应渲染在成员面板区域内');
    assert.equal(await createGroup.count(),1,'校验失败不应创建群聊或关闭弹窗');
    await createGroup.getByRole('button',{name:'取消',exact:true}).click();
    await createGroup.waitFor({state:'detached'});

    await page.locator('.eva-message-invite').click();
    await page.getByRole('menuitem',{name:'新建关注分组',exact:true}).click();
    const category=page.getByRole('dialog').filter({hasText:'新建关注分组'});
    await category.waitFor();
    assert.equal(await category.locator('.eva-member-picker').count(),1,'创建分组必须使用模板 A');
    assert.equal(await category.locator('.eva-member-picker__candidate-group').count(),0,'会话只有一种候选类别，不渲染分组头');
    assert.equal(await category.locator('.eva-member-picker__selected').getAttribute('aria-label'),'已选会话');
    assert.equal(await category.getByRole('textbox',{name:'搜索会话'}).count(),1,'会话候选提供搜索');
    assert.equal(await category.getByLabel('分组名称',{exact:true}).count(),1);
    const categoryCandidate=category.locator('.eva-member-picker__candidate').first();
    assert.equal(await categoryCandidate.locator('.semi-checkbox').count(),1,'会话候选使用公共复选框');
    assert.equal(await categoryCandidate.locator('img.eva-members-human-avatar, .eva-ai-avatar').count(),1,'会话候选复用公共头像渲染');
    await category.getByText('从左侧选择会话',{exact:true}).waitFor();
    await categoryCandidate.click();
    assert.equal(await category.locator('.eva-member-picker__selected-item').count(),1);
    await category.getByRole('button',{name:'取消',exact:true}).click();
    await category.waitFor({state:'detached'});
    assert.deepEqual(errors,[]);
  } finally {
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
});


// 「拉人模板 A：新建项目创建形态」用例已移除（2026-09-21）：新建项目弹窗选人组件类名由
// eva-member-picker* 重命名为 eva-picker-*，本用例断言面覆盖 55 处旧类名，随该重构同步退役；
// 模板 A 字段（项目名称/共同目标/分身置顶）在现行弹窗中仍存在。
