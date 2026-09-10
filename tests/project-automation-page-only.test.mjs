import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const patch = fs.readFileSync('prototype/009-8-patch-automation.js', 'utf8');
const styles = fs.readFileSync('prototype/031-shared-automation-v2.css', 'utf8');

test('project automation uses Loop cards and native detail actions', () => {
  assert.match(patch, /className:\"loop-page eva-project-automation\"/);
  assert.match(patch, /className:\"loop-automation-cards\"/);
  assert.match(patch, /React\.createElement\(AutopilotDetailPage/);
  assert.match(patch, /triggerAutopilot\(Dt\.id\)/);
});

test('personal automation stays on the existing shared page', () => {
  assert.match(patch, /EvaSharedAutomationPage,\{scope:\"personal\"/);
  assert.match(patch, /ScheduledTasksPage=\(\)=>\{[\s\S]*EvaSharedAutomationPage,\{scope:\"personal\"/);
  assert.doesNotMatch(styles, /\.eva-shared-auto\[data-scope=['\"]personal['\"]/);
});

test('layout tightening is scoped to the project automation root', () => {
  assert.match(styles, /\.eva-project-automation > \.loop-page__head/);
  assert.match(styles, /padding:16px 24px 12px/);
  assert.match(styles, /\.eva-project-automation \.loop-automation-cards\{grid-template-columns:repeat\(3/);
});
