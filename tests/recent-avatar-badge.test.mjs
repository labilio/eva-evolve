import assert from 'node:assert/strict';
import test from 'node:test';

import { createPatchedRuntime } from '../tools/build-runtime.mjs';

test('最近列表的群头像不叠加子区角标', () => {
  const { source } = createPatchedRuntime();

  assert.doesNotMatch(source, /wk-conv-group-hash-badge/);
});
