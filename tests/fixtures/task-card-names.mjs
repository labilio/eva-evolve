// Isolated display fixtures: use existing supply tasks and identity IDs.
// Names here are length probes, never written to product/member storage.
export const cases = [
 ['短姓名 · 短标签','苏航',['采购','交付']],
 ['中等姓名 · 中等标签','欧阳明远',['供应商管理','合同复核']],
 ['长姓名 · 短标签','Alexandra Montgomery',['采购','交付']],
 ['正常姓名 · 长标签','王宜林',['跨工厂产能与物料齐套联合评审','排产','交付']],
 ['长姓名 · 长标签','Alexandra Montgomery',['关键供应商交付风险专项复核','跨工厂产能与物料齐套联合评审']],
 ['极长姓名 · 多个标签','Alexandra Catherine Montgomery-Wellington',['采购','交付','合同']],
 ['长中文姓名 · 短标签','阿卜杜热合曼·阿不都拉',['采购','合同']],
 ['仅剩数量空间','Alexandra Catherine Montgomery',['采购','交付']],
 ['姓名让位 · 保留数量','Alexandra Catherine Montgomery-X',['采购','交付']],
 ['无标签','Alexandra Montgomery',[]],
 ['未指派 · 多个标签',null,['采购','交付','合同']],
 ['AI 长名称','王宜林的 AI 分身',['排产','交付'],'agent'],
 ['正常姓名 · 单个长标签','王宜林',['跨工厂产能与物料齐套联合评审']],
 ['正常姓名 · 十二个标签','王宜林',Array(12).fill('供应链复核')],
];
export const fixtureScript = `;(()=>{
 const demo=window.__EVA_SUPPLY_CHAIN_DEMO;
 const probes=${JSON.stringify(cases)};
 demo.issues=demo.issues.slice(0,probes.length).map((task,i)=>{
  const [title,name,labels,type]=probes[i];
  return {...task,title,position:i,parent_issue_id:null,status:'todo',
   assignee_name:name,assignee_id:name?(type==='agent'?'clone-wangyilin':'u-wangyilin'):null,
   assignee_type:type||'member',
   labels:labels.map((name,j)=>({id:'fixture-'+i+'-'+j,name,project_id:'p-supply'}))};
 });
})();`;
