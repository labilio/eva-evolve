import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setup(){
  const window={__EVA_DEMO_TIME:{TASK_VIEW_NOW:"2026-09-29T12:00:00+08:00"}};
  vm.runInNewContext(fs.readFileSync(new URL('../prototype/063-task-time.js',import.meta.url),'utf8'),{window});
  vm.runInNewContext(fs.readFileSync(new URL('../prototype/062-loop-task-components.js',import.meta.url),'utf8'),{window});
  const React={createElement:(type,props,...children)=>({type,props:props||{},children:children.flat()})};
  const lucide={CircleDashed:'CircleDashed',Circle:'Circle',CircleCheck:'CircleCheck'};
  return {api:window.EvaLoopTaskComponents,...window.EvaLoopTaskComponents.create(React,lucide)};
}

test('状态图形和颜色由同一个组件给出，已完成使用清晰的绿色勾',()=>{
  const {api,StatusIcon}=setup();
  const done=StatusIcon({status:'done',size:14,style:{color:'pink'}});
  assert.equal(done.type,'CircleCheck');
  assert.equal(done.props.strokeWidth,2.25);
  assert.equal(done.props.style.color,'#16803d');
  assert.equal(StatusIcon({status:'backlog'}).type,'CircleDashed');
  assert.equal(StatusIcon({status:'todo'}).type,'Circle');
  assert.equal(StatusIcon({status:'in_progress'}).type,'svg');
  assert.equal(StatusIcon({status:'in_review'}).type,'svg');
});

test('优先级图形与颜色共用一套阶梯标记',()=>{
  const {api,PriorityIcon}=setup();
  for(const [priority,filled] of [['low',1],['medium',2],['high',3]]){
    const glyph=PriorityIcon({priority,size:14,style:{color:'pink'}});
    assert.equal(glyph.type,'svg');
    assert.equal(glyph.props.style.color,api.priorityColors[priority]);
    assert.deepEqual(glyph.children.map(child=>child.props.opacity),[0,1,2].map(i=>i<filled?1:0.35));
  }
  assert.equal(PriorityIcon({priority:'urgent'}).children[0].type,'rect');
  assert.equal(PriorityIcon({priority:'none'}).children[0].type,'line');
});

test('项目任务日期选择器统一使用 Semi 紧凑日期面板和日期字符串',()=>{
  const {api}=setup();
  const picker=api.datePicker({createElement:(type,props)=>({type,props})},'SemiDatePicker',{
    value:'2026-09-28',onChange:()=>{},className:'task-date',dropdownClassName:'extra-panel'
  });
  assert.equal(picker.type,'SemiDatePicker');
  assert.equal(picker.props.type,'date');
  assert.equal(picker.props.format,'yyyy-MM-dd');
  assert.equal(picker.props.density,'compact');
  assert.equal(picker.props.autoSwitchDate,false,'翻月不能直接改写任务日期');
  assert.match(picker.props.dropdownClassName,/eva-loop-task-date-panel/);
  assert.match(picker.props.dropdownClassName,/extra-panel/);
  assert.equal(picker.props.className,'task-date');
  assert.equal(picker.props.value,'2026-09-28');
});

test('项目任务标签片在各视图共用中性外观与名称',()=>{
  const {api}=setup(),React={createElement:(type,props,...children)=>({type,props:props||{},children})};
  const label={id:'purchase',name:'采购',color:'#64748b'};
  const chip=api.labelChip(React,label);
  assert.equal(chip.type,'span');
  assert.match(chip.props.className,/loop-label-chip eva-task-label-chip/);
  assert.equal(chip.props.style,undefined);
  assert.equal(chip.children[0],label.name);
  assert.equal(api.formatDate('2026-09-25'),'09-25');
});

test('看板按状态和位置排序，缺少位置的旧任务保持原顺序',()=>{
  const {api}=setup(),issues=[
    {id:'a',status:'todo',position:5},{id:'b',status:'done',position:1},
    {id:'c',status:'todo',position:2},{id:'d',status:'todo'}
  ];
  assert.deepEqual(Array.from(api.boardOrdered(issues,'todo'),item=>item.id),['c','a','d']);
});

test('看板跨列和列内移动只重排受影响的列',()=>{
  const {api}=setup(),issues=[
    {id:'a',status:'todo',position:1},{id:'b',status:'todo',position:2},
    {id:'c',status:'todo',position:3},{id:'d',status:'done',position:1}
  ];
  const within=api.boardMovePlan(issues,'c','todo','a',false);
  assert.deepEqual(Array.from(within.todo,item=>item.id),['c','a','b']);
  assert.equal(within.done,undefined);
  const across=api.boardMovePlan(issues,'b','done','d',true);
  assert.deepEqual(Array.from(across.todo,item=>item.id),['a','c']);
  assert.deepEqual(Array.from(across.done,item=>item.id),['d','b']);
  assert.equal(api.boardMovePlan(issues,'a','todo','a',false),null);
});

test('看板分页和大列虚拟窗口保留总数与滚动高度',()=>{
  const {api}=setup();
  assert.equal(api.boardPageCount(95,30),30);
  assert.equal(api.boardPageCount(95,60),60);
  assert.equal(api.boardPageCount(95,120),95);
  const heights=Array(60).fill(120);
  const window=api.boardWindow(heights,2400,600,4);
  assert.ok(window.start>0);
  assert.ok(window.end<60);
  assert.equal(window.top+window.visibleHeight+window.bottom,7200);
});
