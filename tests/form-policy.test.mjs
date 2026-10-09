import test from 'node:test';
import assert from 'node:assert/strict';
import {createSubmissionGate} from '../prototype/063-form-policy.js';

test('提交中拦截第二次保存，失败结束后允许重试',()=>{
  const gate=createSubmissionGate(),first=gate.begin();
  assert.notEqual(first,null);
  assert.equal(gate.begin(),null);
  gate.finish(first);
  assert.notEqual(gate.begin(),null);
});

test('取消重开后的迟到结果不能结束或污染新的提交',()=>{
  const gate=createSubmissionGate(),old=gate.begin();
  gate.reset();
  const next=gate.begin();
  assert.equal(gate.current(old),false);
  gate.finish(old);
  assert.equal(gate.current(next),true);
  assert.equal(gate.begin(),null);
});
