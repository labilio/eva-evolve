(function(root){
  'use strict';
  const MAX_ZIP=20*1024*1024,MAX_EXPANDED=50*1024*1024;
  function safePath(path){
    if(!path||path.startsWith('/')||path.includes('\\')||/^[a-z]:/i.test(path)||path.split('/').some(p=>p==='..'||p==='.')||/[\x00-\x1f]/.test(path))throw new Error('技能包包含无效文件路径');
    return path;
  }
  function base64(bytes){let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);}
  async function readZip(file,unzip){
    if(!file||!/\.zip$/i.test(file.name))throw new Error('请选择 ZIP 格式的技能包');
    if(file.size>MAX_ZIP)throw new Error('ZIP 文件不能超过 20 MB');
    const bytes=new Uint8Array(await file.arrayBuffer());
    if(!unzip)unzip=(await import(new URL('vendor/fflate.module.js',document.baseURI).href)).unzipSync;
    let total=0,count=0;const seen=new Set();
    let entries;
    try{entries=unzip(bytes,{filter:entry=>{
      safePath(entry.name);
      if(++count>500||(total+=entry.originalSize)>MAX_EXPANDED)throw new Error('技能包展开后不能超过 50 MB 或 500 个文件');
      if(seen.has(entry.name))throw new Error('技能包包含重复文件路径');seen.add(entry.name);
      return !entry.name.endsWith('/')&&!entry.name.split('/').some(p=>p==='__MACOSX'||p==='.DS_Store'||p.startsWith('._'));
    }});}catch(error){throw new Error(/技能包/.test(error.message)?error.message:'无法读取 ZIP，请检查文件是否损坏或加密');}
    const paths=Object.keys(entries),mains=paths.filter(p=>p==='SKILL.md'||p.endsWith('/SKILL.md'));
    if(mains.length!==1)throw new Error(mains.length?'一个 ZIP 仅支持一个技能，请分别导入':'未找到 SKILL.md，请检查技能包内容');
    const main=mains[0],prefix=main.slice(0,-8);
    if(paths.some(p=>!p.startsWith(prefix)))throw new Error('请将技能正文和随附文件放在同一个技能文件夹内');
    const textDecoder=new TextDecoder('utf-8',{fatal:true});let content;
    try{content=textDecoder.decode(entries[main]);}catch{throw new Error('SKILL.md 需使用 UTF-8 文本编码');}
    if(!content.trim())throw new Error('SKILL.md 内容为空');
    const files=paths.filter(p=>p!==main).map(path=>{
      const data=entries[path];let text;try{text=textDecoder.decode(data);if(text.includes('\0'))text=null;}catch{text=null;}
      return {path:path.slice(prefix.length),content:text===null?base64(data):text,encoding:text===null?'base64':'utf8',size:data.length};
    });
    return {content,files,fileName:file.name,size:file.size,fallbackName:prefix.split('/').filter(Boolean).pop()||file.name.replace(/\.zip$/i,'')};
  }
  function binaryPreview(React,file){return React.createElement('div',{className:'eva-skill-binary'},React.createElement('strong',null,file.path),React.createElement('p',null,'二进制文件已保留，可下载查看。'),React.createElement('a',{href:'data:application/octet-stream;base64,'+file.content,download:file.path.split('/').pop()},'下载文件'));}
  function Creator({api,onClose,onCreated,existingNames,projectId}){
    const {React,Modal,Button,LoopButton,Input,FileText,Upload,Plus,parseFrontmatter,ensureSkillFrontmatter,setFrontmatterField,isValidSkillName,createSkill,Toast}=api,h=React.createElement;
    const [mode,setMode]=React.useState('local'),[draft,setDraft]=React.useState({name:'',description:'',content:''}),[pack,setPack]=React.useState(null),[busy,setBusy]=React.useState(false),[saving,setSaving]=React.useState(false),[error,setError]=React.useState(''),[drag,setDrag]=React.useState(false);
    const input=React.useRef(null),request=React.useRef(0),saveLock=React.useRef(false);
    React.useEffect(()=>()=>{request.current++;},[]);
    const value=mode==='local'?draft:pack||{name:'',description:'',content:''};
    const name=value.name.trim(),nameError=name&&!isValidSkillName(name)?'名称仅支持英文字母、数字、连字符和下划线':name&&existingNames.some(n=>n.toLowerCase()===name.toLowerCase())?'当前项目已有同名技能，请修改名称':'';
    function change(key,text){(mode==='local'?setDraft:setPack)(old=>({...old,[key]:text}));setError('');}
    function switchMode(next){request.current++;setBusy(false);setDrag(false);setError('');setMode(next);}
    async function choose(files){
      if(!files?.length)return;
      const token=++request.current;setPack(null);setError('');setBusy(true);setDrag(false);
      try{
        if(files.length!==1)throw new Error('请一次选择一个 ZIP 技能包');
        const parsed=await readZip(files[0]);
        const meta=parseFrontmatter(parsed.content).frontmatter||{};
        if(token===request.current)setPack({...parsed,name:meta.name||parsed.fallbackName,description:meta.description||''});
      }catch(e){if(token===request.current)setError(e.message);}finally{if(token===request.current)setBusy(false);}
    }
    async function save(){
      if(saveLock.current||busy||!name||nameError||mode==='zip'&&!pack)return;
      saveLock.current=true;setSaving(true);setError('');
      try{
        let content=ensureSkillFrontmatter(name,value.description.trim(),value.content);
        if(mode==='zip')content=setFrontmatterField(setFrontmatterField(content,'name',name),'description',value.description.trim());
        const meta=parseFrontmatter(content).frontmatter||{};
        const skill=await createSkill({workspace_id:projectId,name:meta.name||name,description:meta.description||'',content,files:mode==='zip'?pack.files:[],status:'draft'});
        Toast.success(mode==='zip'?'已导入为草稿':'已创建技能');onCreated(skill,mode==='zip');
      }catch(e){setError(e.message);}finally{saveLock.current=false;setSaving(false);}
    }
    const field=(key,label,placeholder)=>h('div',{className:'loop-nsk__field'},h('label',{className:'loop-nsk__label',htmlFor:'eva-skill-'+key},label),h(Input,{id:'eva-skill-'+key,value:value[key],onChange:text=>change(key,text),placeholder,disabled:saving,'aria-invalid':key==='name'&&!!nameError}),key==='name'&&nameError&&h('small',{className:'eva-skill-error',role:'alert'},nameError));
    const picker=h('input',{ref:input,type:'file',accept:'.zip',hidden:true,'aria-label':'选择 ZIP 技能包',onChange:e=>{choose(e.target.files);e.target.value='';}});
    const previewContent=mode==='zip'&&pack?setFrontmatterField(setFrontmatterField(pack.content,'name',name),'description',pack.description):'';
    return h(Modal,{className:'loop-modal eva-skill-create',visible:true,onCancel:()=>{if(!saving)onClose();},footer:null,width:760,bodyStyle:{padding:0},title:h('div',{className:'loop-nsk__head'},h('div',{className:'loop-nsk__head-title'},'新建技能'),h('div',{className:'loop-nsk__head-sub'},'空白起草或导入已有技能包，右侧预览内容。'))},
      h('div',{className:'loop-nsk'},h('div',{className:'loop-nsk__body'},
        h('div',{className:'loop-nsk__form'},h('div',{className:'loop-nsk__tabs',role:'tablist','aria-label':'技能创建方式'},...['local','zip'].map(key=>h('button',{type:'button',role:'tab','aria-selected':mode===key,key,className:'loop-nsk__tab'+(mode===key?' is-active':''),disabled:saving,onClick:()=>switchMode(key)},h(key==='local'?FileText:Upload,{size:14}),key==='local'?'空白起草':'从 ZIP 导入'))),
          picker,mode==='zip'&&(!pack?h('button',{type:'button',className:'eva-skill-drop'+(drag?' is-dragging':''),disabled:busy||saving,onClick:()=>input.current.click(),onDragOver:e=>{e.preventDefault();if(!busy)setDrag(true);},onDragLeave:()=>setDrag(false),onDrop:e=>{e.preventDefault();if(!busy&&!saving)choose(e.dataTransfer.files);}},h(Upload,{size:28}),h('strong',null,busy?'正在解析技能包…':'将 ZIP 文件拖到这里'),h('span',null,busy?'正在检查正文与随附文件':'或点击选择文件'),h('small',null,'包含 SKILL.md · 支持外层文件夹 · 最大 20 MB')):h('div',{className:'eva-skill-file'},h(FileText,{size:18}),h('div',null,h('strong',{title:pack.fileName},pack.fileName),h('small',null,(pack.size/1024).toFixed(1)+' KB · 已解析')),h(Button,{theme:'borderless',size:'small',disabled:saving,onClick:()=>input.current.click()},'更换文件'))),
          (mode==='local'||pack)&&h('div',{className:'loop-nsk__fields'},field('name','名称','例如：project-weekly'),field('description','描述','说明这个技能的用途'),mode==='local'&&h('div',{className:'loop-nsk__field'},h('label',{className:'loop-nsk__label',htmlFor:'eva-skill-content'},'技能内容'),h('textarea',{id:'eva-skill-content',className:'loop-field-textarea loop-field-textarea--lg',value:draft.content,onChange:e=>change('content',e.target.value),placeholder:'编写技能说明与执行步骤',spellCheck:false,disabled:saving}))),
          error&&h('p',{className:'eva-skill-error',role:'alert'},error)),
        h('div',{className:'loop-nsk__preview'},h('div',{className:'loop-nsk__preview-label'},'预览'),mode==='zip'&&!pack?h('div',{className:'eva-skill-preview-empty'},h(FileText,{size:24}),h('p',null,'选择技能包后预览内容')):h('div',{className:'loop-nsk__preview-card'},h('div',{className:'loop-nsk__preview-top'},h('span',{className:'loop-nsk__preview-ico'},h(FileText,{size:20})),h('span',{className:'loop-nsk__preview-badge'},mode==='local'?'空白起草':'ZIP 导入')),h('div',{className:'loop-nsk__preview-name'},name||'未命名 Skill'),value.description&&h('div',{className:'loop-nsk__preview-desc'},value.description),h('div',{className:'loop-nsk__preview-file'},h(FileText,{size:13}),'SKILL.md'),mode==='zip'&&h('pre',{className:'eva-skill-content-preview'},parseFrontmatter(previewContent).body),mode==='zip'&&pack.files.length>0&&h('details',{className:'eva-skill-files'},h('summary',null,'随附文件 · '+pack.files.length),h('ul',null,...pack.files.map(f=>h('li',{key:f.path,title:f.path},f.path))))),h('p',{className:'loop-nsk__preview-note'},mode==='zip'?'导入后继续编辑，不会自动启用。':'创建后可继续编辑技能内容与随附文件。'))),
      h('div',{className:'loop-nsk__footer'},h(Button,{disabled:saving,onClick:onClose},'取消'),h(LoopButton,{disabled:busy||!name||!!nameError||mode==='zip'&&!pack,loading:saving,onClick:save,icon:mode==='local'?h(Plus,{size:14}):undefined},mode==='local'?'创建':'导入为草稿'))));
  }
  root.EvaProjectSkillCreate={readZip,binaryPreview,render:(props,api)=>api.React.createElement(Creator,{...props,api})};
})(window);
