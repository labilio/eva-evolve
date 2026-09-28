import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function setup(){
  const window={};
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
