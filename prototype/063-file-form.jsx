import React, {useState,useId} from 'react';
import {Form, withField, useSubmission, SubmissionError} from './063-forms.jsx';
import {EvaFormSelect,EvaSelect} from './063-select.jsx';
import {dialogText} from './063-dialog-theme.js';
import {FloatingForm} from './063-popover.jsx';
import {Dialog, Actions} from './063-dialog.jsx';

export const fileFormTypes = ['new-folder','rename','external-link','external-folder','edit-external-link','move','create-shortcut','tags'];
import {EvaLucideIcon as FileIcon} from './063-lucide-icon.jsx';
const icon = name => <FileIcon name={name}/>;

// Semi owns selection, tags, keyboard navigation and popup lifecycle. The file
// domain retains its canonical spelling, 20-character limit and duplicate rule.
const FileTags = withField(function FileTags({value=[],onChange,api,draft='',availableTags,error}) {
  const canonical=raw=>{const text=String(raw).trim().slice(0,20);return availableTags.find(tag=>tag.toLowerCase()===text.toLowerCase())||text;};
  const options=Array.from(new Set([...availableTags,...value])).map(tag=>({value:tag,label:tag}));
  const labelId=useId();
  return <div onKeyDownCapture={event=>{
    if(event.key!=='Enter'||event.nativeEvent.isComposing)return;
    const tag=canonical(draft);
    if(tag&&value.some(item=>item.toLowerCase()===tag.toLowerCase())){event.preventDefault();event.stopPropagation();api.setError('tagInput','该标签已选择');}
  }}>
    <span id={labelId} hidden>输入或选择标签</span>
    <EvaSelect multiple filter allowCreate max={8} value={value} optionList={options} style={{width:'100%'}}
      aria-labelledby={labelId} placeholder="输入或选择标签" motion={false}
      renderCreateItem={input=>'创建标签 '+input}
      onSearch={(text,event)=>{if(!text&&event?.type!=='change'&&event?.type!=='input')return;api.setValue('tagInput',text);api.setError('tagInput',undefined);}}
      onChange={next=>{onChange(Array.from(new Set(next.map(canonical))).filter(Boolean));api.setValue('tagInput','');api.setError('tagInput',undefined);}}
      />
    <Form.ErrorMessage error={error} errorMessageId="tagInput-errormessage"/>
  </div>;
});

// The two file-library entrances share fields, validation and the same data API.
export default function FileForm({type,files,actor,spaceId,parentId=0,resource,entry='project',onClose,onSaved,sourceLabel,inline=false}) {
  const [api,formState,values] = Form.useForm();
  const [confirmedURL,setConfirmedURL] = useState(null);
  const project = entry === 'project';
  const folder = type === 'external-folder' || (type === 'edit-external-link' && resource?.external?.kind === 'folder');
  const external = ['external-link','external-folder','edit-external-link'].includes(type);
  const spaces = files.writableSpaces(actor,type === 'create-shortcut' ? resource.spaceId : undefined);
  const initial = {name:resource?.name || '',url:resource?.external?.url || '',parentId:project ? resource?.parent_id || 0 : 0,
    targetSpaceId:spaces[0]?.id || '',targetParentId:0,spaceId:spaceId || spaces[0]?.id,tags:resource?.tags||[],tagInput:''};
  const availableTags=type==='tags'?Array.from(new Set(files.list(resource.spaceId,actor).flatMap(item=>item.tags||[]))):[];
  const targetSpaceId = values.targetSpaceId || initial.targetSpaceId;
  const targetFolders = targetSpaceId ? files.list(targetSpaceId,actor).filter(item=>item.type==='folder') : [];
  const title = type==='new-folder'?'新建文件夹':type==='rename'?'重命名':type==='external-folder'?'添加外部文件夹':type==='external-link'?'添加外部链接':type==='edit-external-link'?(folder?'编辑外部文件夹':'编辑外部链接'):type==='move'?'移动到':type==='tags'?'编辑标签':'创建快捷方式';
  const confirmation = type==='new-folder'?'创建':type==='rename'?'保存':type==='external-folder'?'添加文件夹':type==='external-link'?'添加链接':type==='edit-external-link'?(confirmedURL===values.url?'确认更换并保存':'保存'):type==='move'?'移动':type==='tags'?'保存':'创建快捷方式';
  const submission = useSubmission({onSubmit: data => {
    let id = resource?.id;
    if(type==='new-folder')id=files.createFolder(actor,spaceId,data.name.trim(),parentId);
    if(type==='rename')files.rename(actor,resource.id,data.name.trim());
    if(type==='external-link'||type==='external-folder')id=files.createExternalLink(actor,spaceId,{name:data.name,url:data.url,kind:folder?'folder':undefined},parentId);
    if(type==='edit-external-link') {
      try { files.updateExternalLink(actor,resource.id,{name:data.name,url:data.url,kind:folder?'folder':undefined,confirmHostChange:confirmedURL===data.url}); }
      catch(error) { if(error.message?.includes('域名已变更'))setConfirmedURL(data.url); throw error; }
    }
    if(type==='tags'){
      const tags=[...(data.tags||[])],input=String(data.tagInput||'').trim().slice(0,20),pending=availableTags.find(tag=>tag.toLowerCase()===input.toLowerCase())||input;
      if(pending&&!tags.some(tag=>tag.toLowerCase()===pending.toLowerCase())&&tags.length<8)tags.push(pending);
      files.updateTags(actor,resource.id,tags);
    }
    if(type==='move')files.move(actor,resource.id,data.parentId||0);
    if(type==='create-shortcut')files.createShortcut(actor,resource.id,data.targetSpaceId,data.targetParentId||0);
    onClose();onSaved?.({id,type});
  }});
  const prefix = project?'eva-project-files':'eva-drive-dialog';
  const nameId = external ? prefix+'-external-name' : project ? prefix+'-dialog-value' : prefix+'-name';
  const urlId = prefix+'-external-url';
  const field = (label,id,control) => <div className="eva-drive-dialog__field"><span id={id+'-label'} style={dialogText.section}><label htmlFor={id}>{label}</label></span>{control}</div>;
  const select = (label,id,fieldName,options,onChange) => field(label,id,<EvaFormSelect field={fieldName} id={id} noLabel optionList={options} style={{width:'100%'}} onChange={onChange}/>);
  const noTarget = type==='create-shortcut'&&!spaces.length;
  const FormComponent=inline?FloatingForm:Form;
  const body = (
        <FormComponent {...(inline?{onCancel:onClose,busy:submission.busy}:{})} {...submission.formProps} form={api} initValues={initial} className="eva-file-name-form eva-file-form">
          {(type==='new-folder'||type==='rename'||external)&&field(external?(folder?'文件夹名称':'文件名称'):type==='new-folder'?'文件夹名称':'新名称',nameId,
            <Form.Input field="name" id={nameId} noLabel autoFocus maxLength={external?100:undefined}
              placeholder={external?(folder?'例如：供应商交付资料':'例如：供应商协作飞书文档'):undefined}
              rules={[{required:true,whitespace:true,message:external?(folder?'请输入文件夹名称':'请输入文件名称'):'请输入名称'}]}/>)}
          {external&&field(folder?'文件夹链接':'文件链接',urlId,<Form.Input field="url" id={urlId} type="url" noLabel placeholder="https://"
            validator={value=>{try{files.inspectExternalLink(value,{kind:folder?'folder':undefined});return '';}catch(error){return error.message;}}}
            onChange={()=>setConfirmedURL(null)}/>)}
          {external&&confirmedURL===values.url&&<div className="eva-external-link-warning">{icon('external-link')}<span>链接域名发生变化。请确认新地址可信后再保存。</span></div>}
          {type==='move'&&<>
            {select('目标文件夹',prefix+'-parent','parentId',[{value:0,label:project?'项目根目录':'根目录'},...files.list(resource.spaceId,actor).filter(item=>item.type==='folder'&&item.id!==resource.id).map(item=>({value:item.id,label:item.name}))])}
            <p className="eva-drive-dialog__hint" style={dialogText.auxiliary}>{project?'仅允许在当前项目文件库内移动':'仅允许在当前文件库内移动。'}</p>
          </>}
          {type==='create-shortcut'&&(noTarget?<p>没有其他可写入的文件库，暂时无法创建跨文件库快捷方式。</p>:<>
            <div className="eva-shortcut-source"><span style={dialogText.auxiliary}>源文件</span><strong style={dialogText.section}>{resource.name}</strong><small style={dialogText.auxiliary}>{sourceLabel || '当前项目 · 团队文件'}</small></div>
            {select('目标文件库',prefix+'-shortcut-space','targetSpaceId',spaces.map(space=>({value:space.id,label:(space.kind==='personal'?'个人文件库':'项目文件库')+' · '+space.name})),()=>api.setValue('targetParentId',0))}
            {select('目标文件夹',prefix+'-shortcut-parent','targetParentId',[{value:0,label:'根目录'},...targetFolders.map(item=>({value:item.id,label:item.name}))])}
            <p className="eva-drive-dialog__hint" style={dialogText.auxiliary}>快捷方式不复制文件，也不会向目标文件库成员授予源文件权限{project?'':'。'}</p>
          </>)}
          {type==='tags'&&<>
            <Form.Input field="tagInput" type="hidden" noLabel noErrorMessage fieldStyle={{display:'none'}}/>
            <FileTags field="tags" noLabel extraText={inline?"从下拉框选择已有标签，或直接输入后按回车新建。最多 8 个标签。":undefined} api={api} draft={values.tagInput||''} availableTags={availableTags} error={formState.errors?.tagInput}
              rules={[{type:'array',max:8,message:'每个文件最多添加 8 个标签'}]}/>
            {!inline&&<p className="eva-drive-dialog__hint" style={dialogText.auxiliary}>从下拉框选择已有标签，或直接输入后按回车新建。最多 8 个标签。</p>}
          </>}
          <SubmissionError submission={submission}/>
        </FormComponent>);
  if(inline)return body;
  return <Dialog visible selectInitialText={type==='rename'} size="compact" title={title} className="eva-file-dialog" onCancel={onClose}
    footer={<Actions onCancel={onClose} cancelLabel={noTarget?'关闭':'取消'} submitLabel={noTarget?null:confirmation} form={submission.formProps.id} busy={submission.busy}/> }>
{body}</Dialog>;
}
