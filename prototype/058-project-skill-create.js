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
    const {React,Modal,Button,forms,FileText,Upload,Plus,parseFrontmatter,ensureSkillFrontmatter,setFrontmatterField,isValidSkillName,createSkill,Toast}=api,h=React.createElement;
    const {Form,withField,useSubmission,SubmissionError,Actions,dialogText}=forms;
    const [formApi,,values]=Form.useForm();
    const [mode,setMode]=React.useState('local'),[busy,setBusy]=React.useState(false),[drag,setDrag]=React.useState(false);
    const input=React.useRef(null),request=React.useRef(0);
    const PackageField=React.useMemo(()=>withField(({children,id,...props})=>h('div',{id,'aria-invalid':props['aria-invalid'],'aria-errormessage':props['aria-errormessage']},children)),[]);
    const submission=useSubmission({resetKey:projectId+':'+mode,onSubmit:save}),saving=submission.busy;
    React.useEffect(()=>()=>{request.current++;},[projectId]);
    const pack=values.package?.files?values.package:null,value={name:'',description:'',content:'',...values[mode]},name=value.name.trim();
    function switchMode(next){request.current++;setBusy(false);setDrag(false);if(values.package?.status==='parsing')formApi.setValue('package',undefined);setMode(next);}
    async function choose(files){
      if(!files?.length)return;
      const token=++request.current;formApi.setValue('package',{status:'parsing'});setBusy(true);setDrag(false);
      try{
        if(files.length!==1)throw new Error('请一次选择一个 ZIP 技能包');
        const parsed=await readZip(files[0]);
        const meta=parseFrontmatter(parsed.content).frontmatter||{};
        if(token===request.current){
          formApi.setValue('zip',{name:meta.name||parsed.fallbackName,description:meta.description||'',content:parsed.content});
          formApi.setValue('package',{fileName:parsed.fileName,size:parsed.size,files:parsed.files});
        }
      }catch(e){if(token===request.current){formApi.setValue('package',{status:'error',message:e.message});await submission.validate(['package']).catch(()=>{});}}finally{if(token===request.current)setBusy(false);}
    }
    async function save(data,{isCurrent}){
      if(busy)return;
      const value={name:'',description:'',content:'',...data[mode]},name=value.name.trim();
      let content=ensureSkillFrontmatter(name,value.description.trim(),value.content);
      if(mode==='zip')content=setFrontmatterField(setFrontmatterField(content,'name',name),'description',value.description.trim());
      const meta=parseFrontmatter(content).frontmatter||{};
      const skill=await createSkill({workspace_id:projectId,name:meta.name||name,description:meta.description||'',content,files:mode==='zip'?data.package.files:[],status:'draft'});
      if(isCurrent()){Toast.success(mode==='zip'?'已导入为草稿':'已创建技能');onCreated(skill,mode==='zip');}
    }
    const nameRules=[{required:true,whitespace:true,message:'请输入技能名称'},{validator:(_,value)=>{
      const name=String(value||'').trim();
      if(!name)return Promise.resolve();
      if(!isValidSkillName(name))return Promise.reject(new Error('名称仅支持英文字母、数字、连字符和下划线'));
      if(existingNames.some(n=>n.toLowerCase()===name.toLowerCase()))return Promise.reject(new Error('当前项目已有同名技能，请修改名称'));
      return Promise.resolve();
    }}];
    const field=(key,label,placeholder)=>h('div',{className:'loop-nsk__field'},h('label',{className:'loop-nsk__label',style:dialogText.section,htmlFor:'eva-skill-'+key},label),h(Form.Input,{key:mode+key,field:mode+'.'+key,keepState:true,noLabel:true,id:'eva-skill-'+key,placeholder,disabled:saving,rules:key==='name'?nameRules:undefined}));
    const picker=h('input',{ref:input,type:'file',accept:'.zip',hidden:true,'aria-label':'选择 ZIP 技能包',onChange:e=>{choose(e.target.files);e.target.value='';}});
    const previewContent=mode==='zip'&&pack?setFrontmatterField(setFrontmatterField(value.content,'name',name),'description',value.description):'';
    return h(Modal,{className:'loop-modal eva-skill-create',visible:true,onCancel:onClose,footer:h(Actions,{onCancel:onClose,form:submission.formProps.id,disabled:busy,busy:saving,submitLabel:mode==='local'?'创建':'导入为草稿'}),width:760,title:'新建技能',initialFocus:panel=>panel.querySelector('#eva-skill-name')||panel.querySelector('.eva-skill-drop')},
      h('p',{className:'loop-nsk__head-sub',style:dialogText.auxiliary},'空白起草或导入已有技能包，右侧预览内容。'),
      h(Form,{...submission.formProps,form:formApi,initValues:{local:{name:'',description:'',content:''},zip:{name:'',description:'',content:''}},className:'loop-nsk'},h('div',{className:'loop-nsk__body'},
        h('div',{className:'loop-nsk__form'},h('div',{className:'loop-nsk__tabs',role:'tablist','aria-label':'技能创建方式'},...['local','zip'].map(key=>h('button',{type:'button',role:'tab','aria-selected':mode===key,key,className:'loop-nsk__tab'+(mode===key?' is-active':''),disabled:saving,onClick:()=>switchMode(key)},h(key==='local'?FileText:Upload,{size:14}),key==='local'?'空白起草':'从 ZIP 导入'))),
          picker,mode==='zip'&&h(PackageField,{field:'package',noLabel:true,keepState:true,id:'eva-skill-package',rules:[{validator:(_,value)=>{const message=!value?'请选择 ZIP 技能包':value.status==='error'?value.message:'';return message?Promise.reject(new Error(message)):Promise.resolve();}}]},!pack?h('button',{type:'button',className:'eva-skill-drop'+(drag?' is-dragging':''),disabled:busy||saving,onClick:()=>input.current.click(),onDragOver:e=>{e.preventDefault();if(!busy)setDrag(true);},onDragLeave:()=>setDrag(false),onDrop:e=>{e.preventDefault();if(!busy&&!saving)choose(e.dataTransfer.files);}},h(Upload,{size:28}),h('strong',null,busy?'正在解析技能包…':'将 ZIP 文件拖到这里'),h('span',null,busy?'正在检查正文与随附文件':'或点击选择文件'),h('small',null,'包含 SKILL.md · 支持外层文件夹 · 最大 20 MB')):h('div',{className:'eva-skill-file'},h(FileText,{size:18}),h('div',null,h('strong',{title:pack.fileName},pack.fileName),h('small',null,(pack.size/1024).toFixed(1)+' KB · 已解析')),h(Button,{theme:'borderless',size:'small',disabled:saving,onClick:()=>input.current.click()},'更换文件'))),
          (mode==='local'||pack)&&h('div',{className:'loop-nsk__fields'},field('name','名称','例如：project-weekly'),field('description','描述','说明这个技能的用途'),mode==='local'&&h('div',{className:'loop-nsk__field'},h('label',{className:'loop-nsk__label',style:dialogText.section,htmlFor:'eva-skill-content'},'技能内容'),h(Form.TextArea,{field:'local.content',keepState:true,noLabel:true,id:'eva-skill-content',className:'eva-skill-content-input',placeholder:'编写技能说明与执行步骤',spellCheck:false,disabled:saving}))),
          h(SubmissionError,{submission})),
        h('div',{className:'loop-nsk__preview'},h('div',{className:'loop-nsk__preview-label',style:dialogText.auxiliary},'预览'),mode==='zip'&&!pack?h('div',{className:'eva-skill-preview-empty'},h(FileText,{size:24}),h('p',null,'选择技能包后预览内容')):h('div',{className:'loop-nsk__preview-card'},h('div',{className:'loop-nsk__preview-top'},h('span',{className:'loop-nsk__preview-ico'},h(FileText,{size:20})),h('span',{className:'loop-nsk__preview-badge'},mode==='local'?'空白起草':'ZIP 导入')),h('div',{className:'loop-nsk__preview-name',style:dialogText.section},name||'未命名 Skill'),value.description&&h('div',{className:'loop-nsk__preview-desc',style:dialogText.body},value.description),h('div',{className:'loop-nsk__preview-file'},h(FileText,{size:13}),'SKILL.md'),mode==='zip'&&h('pre',{className:'eva-skill-content-preview'},parseFrontmatter(previewContent).body),mode==='zip'&&pack.files.length>0&&h('details',{className:'eva-skill-files'},h('summary',null,'随附文件 · '+pack.files.length),h('ul',null,...pack.files.map(f=>h('li',{key:f.path,title:f.path},f.path))))),h('p',{className:'loop-nsk__preview-note',style:dialogText.auxiliary},mode==='zip'?'导入后继续编辑，不会自动启用。':'创建后可继续编辑技能内容与随附文件。')))));
  }
  root.EvaProjectSkillCreate={readZip,binaryPreview,render:(props,api)=>api.React.createElement(Creator,{...props,api})};
})(window);
