import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('every seeded project has distinct tasks in each lifecycle stage',()=>{
 const window={};
 for(const name of ['009-0-demo-time','009-1-data-drive','009-2-data-supply'])vm.runInNewContext(fs.readFileSync(`prototype/${name}.js`,'utf8'),{window});
 const projects={prod:window.__EVA_SUPPLY_CHAIN_DEMO.issues,'drive-design':window.__EVA_DRIVE_DEMO.issues,official:window.__EVA_OFFICIAL_TASKS,lab:window.__EVA_CLIENT_TASKS};
 const ids=new Set(),numbers=new Set();
 for(const [pid,tasks] of Object.entries(projects)){
  for(const status of ['todo','in_progress','in_review','done'])assert(tasks.some(t=>t.status===status),`${pid}: ${status}`);
  assert(!tasks.some(t=>t.status==='backlog'),`${pid}: retired backlog`);
  assert.equal(tasks.length,({prod:8,'drive-design':9,official:5,lab:5})[pid],`${pid}: task count preserved`);
  for(const t of tasks){assert.equal(t.workspace_id,pid);assert(!ids.has(t.id));assert(!numbers.has(t.identifier));ids.add(t.id);numbers.add(t.identifier);assert(t.description);}
 }
});
