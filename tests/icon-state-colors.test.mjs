import assert from 'node:assert/strict';
import fs from 'node:fs';
import {test} from 'node:test';
import postcss from 'postcss';

const ruleFor=(file,selector)=>{
 const css=postcss.parse(fs.readFileSync(file,'utf8'),{from:file});
 let found;
 css.walkRules(rule=>{if(rule.selector.split(/,(?![^()]*\))/).some(part=>part.trim()===selector))found=rule;});
 assert.ok(found,`${file} 缺少 ${selector}`);
 return found;
};
const value=(rule,property)=>{
 let found;
 rule.walkDecls(property,decl=>{found=decl.value;});
 return found;
};

test('已关注和已置顶状态由 Eva 语义蓝色驱动，普通操作不按填充形态批量染蓝',()=>{
 for(const [file,selector] of [
  ['prototype/036-project-directory-v3.css','.eva-project-follow-button.is-followed'],
  ['prototype/039-team-message-project-recent.css','.eva-topic-pin'],
  ['prototype/043-final-layout-convergence.css','.eva-personal-folder-menu .is-pinned'],
  ['prototype/043-final-layout-convergence.css','.eva-personal-thread__actions [aria-pressed="true"]'],
  ['prototype/048-gds-components.css','.semi-button-primary:is(.semi-button-light,.semi-button-borderless)'],
 ])assert.equal(value(ruleFor(file,selector),'color'),'var(--eva-action-primary)',selector);
 assert.equal(value(ruleFor('prototype/050-file-library.css','.eva-drive__pin-button.is-pinned svg'),'fill'),'currentColor');
 assert.equal(value(ruleFor('prototype/036-project-directory-v3.css','.eva-project-follow-button'),'color'),'var(--semi-color-text-2, #8a8f99)');
});

test('Eva 强调色在亮暗主题均有语义映射',()=>{
 assert.match(fs.readFileSync('prototype/047-gds-tokens.css','utf8'),/--eva-action-primary:\s*var\(--eva-c-brand-blue\)/);
 assert.match(fs.readFileSync('prototype/057-gds-dark-tokens.css','utf8'),/--eva-action-primary:\s*var\(--eva-c-blue-400\)/);
});
