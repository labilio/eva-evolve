import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const readJson=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const fail=message=>{throw new Error(message);};
const runPackage=(label,directory)=>{
  const result=spawnSync(process.execPath,['validate.mjs'],{cwd:path.join(root,directory),encoding:'utf8'});
  if(result.status!==0)fail(`${label} 校验失败\n${result.stderr||result.stdout}`);
  console.log(`${label}：通过`);
};
const value=(token,expected,label)=>{
  const actual=token?.$value?.value??token?.$value;
  if(actual!==expected)fail(`${label} 应为 ${expected}，实际为 ${JSON.stringify(actual)}`);
};
const hex=(token,expected,label)=>{
  const actual=token?.$value?.hex;
  if(actual?.toUpperCase()!==expected.toUpperCase())fail(`${label} 应为 ${expected}，实际为 ${actual}`);
};

runPackage('GDS for AI 2.0','gds-for-ai2.0');
runPackage('EvaMate Design System 0.3.0','evamate-0.3.0');

const manifest=readJson('integration-manifest.json');
for(const entry of Object.values(manifest.packages)){
  const directory=path.join(root,entry.path);
  if(!fs.statSync(directory,{throwIfNoEntry:false})?.isDirectory())fail(`设计包目录不存在：${entry.path}`);
}

const oldTokens=readJson('gds-for-ai2.0/tokens.dtcg.json');
const nextTokens=readJson('evamate-0.3.0/tokens.dtcg.json');
const baseline=manifest.sharedBaseline;
value(oldTokens.size.viewportWidth,baseline.viewport.width,'旧包视口宽度');
value(oldTokens.size.viewportHeight,baseline.viewport.height,'旧包视口高度');
value(oldTokens.size.sidebarWidth,baseline.standardShell.sidebarWidth,'旧包侧栏宽度');
value(oldTokens.size.workspaceWidth,baseline.standardShell.workspaceWidth,'旧包工作区宽度');
value(oldTokens.size.mainColumnWidth,baseline.standardShell.contentWidth,'旧包内容宽度');
value(oldTokens.size.completedConversationWidth,baseline.completedShell.conversationWidth,'旧包完成态对话宽度');
value(oldTokens.size.completedEditorWidth,baseline.completedShell.editorWidth,'旧包完成态编辑宽度');
value(nextTokens.layout['window-width'],baseline.viewport.width,'新包视口宽度');
value(nextTokens.layout['window-height'],baseline.viewport.height,'新包视口高度');
value(nextTokens.layout['sidebar-width'],baseline.standardShell.sidebarWidth,'新包侧栏宽度');
value(nextTokens.layout['workspace-width'],baseline.standardShell.workspaceWidth,'新包工作区宽度');
value(nextTokens.layout['content-width'],baseline.standardShell.contentWidth,'新包内容宽度');
value(nextTokens.layout['dialog-pane-width'],baseline.completedShell.conversationWidth,'新包完成态对话宽度');
value(nextTokens.layout['editor-pane-width'],baseline.completedShell.editorWidth,'新包完成态编辑宽度');
hex(oldTokens.color.primitive.brandBlue,baseline.primaryBlue,'旧包品牌主蓝');
hex(nextTokens.color.primitive.blue['600'],baseline.primaryBlue,'新包品牌主蓝');

if(manifest.packages.foundations.doesNotOwn.includes('product-components')!==true)fail('新包必须明确不拥有产品组件');
if(manifest.packages.pageEvidence.owns.includes('component-contracts')!==true)fail('旧包必须继续拥有组件合同证据');
console.log('整合合同：通过');
