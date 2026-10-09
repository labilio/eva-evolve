import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Tooltip 显隐归 Semi，禁止恢复全局自写控制器和虚拟锚点',()=>{
 const adapter=read('prototype/062-tooltip-adapter.js'),patch=read('prototype/009-6-patch-general.js');
 assert.doesNotMatch(adapter,/setTimeout|clearTimeout|pointerover|pointerout|overSurface|scheduleOpen|scheduleClose/);
 assert.doesNotMatch(patch,/EvaTooltipBridge|eva-tooltip-virtual-anchor|trigger:\s*["']custom["']/);
 assert.equal(fs.existsSync(new URL('../prototype/062-tooltip.js',import.meta.url)),false);
 assert.equal(fs.existsSync(new URL('../prototype/062-tooltip.css',import.meta.url)),false);
 assert.match(adapter,/h\(Tooltip,\{content,trigger:'hover',className:'eva-passive-tooltip'/);
 assert.doesNotMatch(adapter,/data-eva-tooltip-position|\{content,position/);
 assert.match(adapter,/R\.useImperativeHandle\(ref,\(\)=>target/);
});
