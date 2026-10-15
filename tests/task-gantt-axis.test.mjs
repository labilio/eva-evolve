import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const context=vm.createContext({window:{}});
for(const file of ['063-task-time.js','062-loop-gantt-view.js'])vm.runInContext(readFileSync(new URL('../prototype/'+file,import.meta.url),'utf8'),context);
const axis=(scale,from='2026-09-26',to='2026-10-08',today='2026-09-28')=>context.window.EvaLoopGanttView.axis(scale,from,to,today);
test('week scale shows calendar days and Monday-based periods across month boundaries',()=>{
 const result=axis('week');
 assert.equal(result.columns[0].start,'2026-09-26');
 assert.equal(result.columns[0].weekend,true);
 assert.equal(result.periods[0].start,'2026-09-21');
 assert.equal(result.periods[1].start,'2026-09-28');
 assert.equal(result.columns.filter(c=>c.current).length,1);
});
test('month scale uses complete Monday-to-Sunday weeks, with one current week',()=>{
 const result=axis('month');
 assert.equal(result.columns[0].start,'2026-09-21');
 assert.equal(result.columns[1].end,'2026-10-05');
 assert.equal(result.columns[1].label,'28–4');
 assert.equal(result.columns[1].current,true);
 assert.equal(result.periods[0].label,'2026年9月');
 assert.equal(result.columns.every(c=>c.days===7),true);
});
test('quarter scale uses calendar months including leap February, not day grid lines',()=>{
 const result=axis('quarter','2028-02-12','2028-04-02','2028-02-15');
 assert.equal(result.columns[0].start,'2028-02-01');
 assert.equal(result.columns[0].days,29);
 assert.equal(result.columns[0].label,'2月');
 assert.equal(result.columns[0].current,true);
 assert.equal(result.periods[0].label,'2028年1–3月');
 assert.equal(result.periods[0].secondary,'Q1');
 assert.equal(result.periods[1].start,'2028-04-01');
 assert.equal(result.columns.length,3);
});
