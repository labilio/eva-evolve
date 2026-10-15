import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function policy() {
 const window={};
 vm.runInNewContext(fs.readFileSync(new URL('../prototype/062-tooltip-adapter.js',import.meta.url),'utf8'),{window});
 return window.EvaTooltipAdapter;
}
test('focus return suppresses only its synchronous event, not the next deliberate focus',()=>{
 const p=policy(),events=[];
 const target={isConnected:true,focus(options){events.push(p.isRestoringFocus(this));assert.equal(options.preventScroll,true);}};
 p.restoreFocus(target);
 target.focus({preventScroll:true});
 assert.deepEqual(events,[true,false]);
});
test('nested restoration and exceptions cannot leak suppression into later interaction',()=>{
 const p=policy();let nested=false;
 const target={isConnected:true,focus(){
  assert.equal(p.isRestoringFocus(this),true);
  if(!nested){nested=true;p.restoreFocus(this);assert.equal(p.isRestoringFocus(this),true);throw new Error('focus failed');}
 }};
 assert.throws(()=>p.restoreFocus(target),/focus failed/);
 assert.equal(p.isRestoringFocus(target),false);
 const detached={isConnected:false,focus(){assert.fail('detached opener must not receive focus');}};
 p.restoreFocus(detached);p.restoreFocus(null);
 assert.equal(p.isRestoringFocus(detached),false);
});
