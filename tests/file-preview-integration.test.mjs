import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=name=>fs.readFileSync(new URL('../prototype/'+name,import.meta.url),'utf8');
function renderers() {
  const context={window:{__evaPatch(){}},React:{createElement:(tag,props,...children)=>({tag,props,children})},reactExports:{useState:value=>[value,()=>{}],useEffect(){}},state:{},escapeHTML:String,formatDriveBytes:String};
  vm.createContext(context);
  const patch=read('009-5-patch-im.js');
  vm.runInContext(patch.slice(patch.indexOf('function evaPreviewFixture('),patch.indexOf('function EvaInlineProjectPanel(')),context);
  const native=read('020-mode-layer.js');
  vm.runInContext(native.slice(native.indexOf('  function filePreviewFixture('),native.indexOf('  function previewHTML(')),context);
  return context;
}
test('未配置演示内容的文件不会展示虚构文档、表格或压缩包目录',()=>{
  const c=renderers(),file={name:'用户上传的真实文件.docx',size:12};
  for(const render of ['wordPreviewHTML','sheetPreviewHTML','presentationPreviewHTML','markdownPreviewHTML','archivePreviewHTML']){
    const result=c[render](file);
    assert.match(result,/暂无.*预览|暂不支持|未提供.*预览/);
    assert.doesNotMatch(result,/成功加载|已完成|说明文件.txt|需求汇总/);
  }
  for(const render of ['EvaPresentationPreviewRenderer','EvaArchivePreviewRenderer']){
    const result=JSON.stringify(c[render]({file}));
    assert.match(result,/暂无.*预览|暂不支持|未提供.*预览/);
    assert.doesNotMatch(result,/演示文件已加载|说明文件.txt/);
  }
});
test('Word 显式预览地址优先于同名演示夹具',()=>{
  const c=renderers();
  c.window.__EVA_FILE_PREVIEW_FIXTURES={'纪要.docx':{pages:[{title:'错误夹具'}]}};
  const result=JSON.stringify(c.EvaWordPreviewRenderer({file:{name:'纪要.docx',previewUrl:'/actual.html'}}));
  assert.match(result,/actual.html/);
  assert.doesNotMatch(result,/错误夹具/);
});

test('v7 文件库刷新不会重新添加已永久删除的演示文件',()=>{
  const value=JSON.stringify({schema:7,records:[]});
  const window={localStorage:{getItem:key=>key==='eva:file-store:v7'?value:null,setItem(){},removeItem(){}}};
  vm.runInNewContext(read('009-2-membership.js'),{window});
  vm.runInNewContext(read('009-1-file-sharing.js'),{window});
  const members=window.EvaMembership.create({people:[{id:'u-wangyilin',name:'王宜林'}]});
  const files=window.EvaFileSharing.bootstrap(members);
  assert.equal(files.snapshot().length,0);
});
