(function(root){
  'use strict';

  let Component;

  function create(deps){
    const R=deps.React;
    const {useEffect,useMemo,useRef,useState,useSyncExternalStore}=R;
    const h=R.createElement;

    const icon=name=>{
      const aliases={link:'link-2',file:'file-text',sheet:'file-spreadsheet',drive:'hard-drive',workspace:'layout-grid',task:'list-checks',automation:'cpu',arrow:'chevron-down',chevron:'chevron-right',external:'external-link',more:'ellipsis'};
      return h('span',{className:'eva-lucide-host',dangerouslySetInnerHTML:{__html:window.__evaLucide(aliases[name]||name,{className:'eva-drive-icon'})}});
    };
    const roleLabel=role=>role==='owner'?'Owner':role==='manager'?'Manager':'Editor';
    const isExternalFolder=item=>item.type==='external_link'&&item.external?.kind==='folder';
    const fileIcon=item=>item.type==='folder'||isExternalFolder(item)?'folder':item.type==='external_link'?'link':['xlsx','xls','csv'].includes(item.extension)?'sheet':'file';
    const markClass=item=>item.type==='folder'?'is-folder':isExternalFolder(item)?'is-external-folder':item.type==='external_link'?'is-external-link':item.type==='shortcut'?'is-shortcut':item.extension==='pdf'?'is-pdf':['xlsx','xls','csv'].includes(item.extension)?'is-sheet':'';
    const fileMarkIcon=item=>h(R.Fragment,null,icon(fileIcon(item)),isExternalFolder(item)?h('span',{className:'eva-drive__file-external-badge'},icon('external')):null,item.type==='shortcut'?h('span',{className:'eva-drive__shortcut-badge'},icon('external')):null);
    const relationTypeLabel={task:'任务',group:'群聊',chat:'私聊','ai-conversation':'AI 团队会话',file:'来源文件'};
    const relationIcon={task:'task',group:'users',chat:'users','ai-conversation':'automation',file:'file'};
    const bytes=value=>{
      if(!value)return'—';
      const units=['B','KB','MB','GB'];let size=Number(value),index=0;
      while(size>=1024&&index<units.length-1){size/=1024;index++;}
      return(size>=10||index===0?Math.round(size):Math.round(size*10)/10)+' '+units[index];
    };
    const time=value=>{
      if(!value)return'—';const date=new Date(value);if(Number.isNaN(date.getTime()))return value;
      return new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date).replace(/\//g,'-');
    };

    function Dialog({title,children,confirmLabel,onConfirm,onClose,danger,wide,detail}){
      const titleId=detail?'eva-project-file-detail-title':'eva-project-files-dialog-title';
      return h('div',{className:'eva-drive-dialog eva-project-files-dialog'+(detail?' eva-file-detail-dialog':''),role:'dialog','aria-modal':'true','aria-labelledby':titleId},
        h('button',{className:'eva-drive-dialog__mask',type:'button',onClick:onClose,'aria-label':'关闭'}),
        h('section',{className:'eva-drive-dialog__panel'+(wide?' eva-project-files-dialog__panel--wide':'')+(detail?' eva-file-detail-dialog__panel':'')},
          h('header',null,h('h2',{id:titleId},title),h('button',{type:'button',onClick:onClose,'aria-label':'关闭'},icon('x'))),
          h('div',{className:'eva-drive-dialog__body'},children),
          confirmLabel?h('footer',null,
            h('button',{type:'button',onClick:onClose},'取消'),
            h('button',{className:danger?'is-danger':'is-primary',type:'button',onClick:onConfirm},confirmLabel)
          ):null
        )
      );
    }

    return function ProjectFiles({context,projectId}){
      useSyncExternalStore(context.store.subscribe,context.store.getSnapshot);
      const actor=context.store.snapshot().actorId;
      const revision=useSyncExternalStore(context.files.subscribe,context.files.getSnapshot);
      const role=context.files.role(projectId,actor)||'editor';
      const canTrash=context.files.can('trash',projectId,actor);
      const canViewTrash=context.files.can('view-trash',projectId,actor);
      const fileType=item=>context.files.fileTypeFor(item,actor);
      const relationsFor=item=>context.files.relationsFor(item,actor);
      const sourceLabel=item=>context.files.sourceLabelFor(item,actor);
      const uploadInput=useRef(null);
      const [parentId,setParentId]=useState(0);
      const [crumbs,setCrumbs]=useState([]);
      const [query,setQuery]=useState('');
      const [selectedId,setSelectedId]=useState(null);
      const [trashMode,setTrashMode]=useState(false);
      const [dialog,setDialog]=useState(null);
      const [preview,setPreview]=useState(null);
      const [menuId,setMenuId]=useState(null);
      const [menuAnchor,setMenuAnchor]=useState(null);
      const [notice,setNotice]=useState('');
      const noticeTimer=useRef(null);

      useEffect(()=>{setParentId(0);setCrumbs([]);setQuery('');setSelectedId(null);setTrashMode(false);setDialog(null);setPreview(null);setMenuId(null);setMenuAnchor(null);setNotice('');},[projectId]);
      useEffect(()=>()=>clearTimeout(noticeTimer.current),[]);
      useEffect(()=>{
        if(!menuId)return undefined;
        const close=()=>{setMenuId(null);setMenuAnchor(null);};
        const closeOutside=event=>{if(!event.target.closest('.eva-drive__row-actions'))close();};
        const closeOnKey=event=>{if(event.key==='Escape')close();};
        const closeOnScroll=event=>{if(!(event.target.closest&&event.target.closest('.eva-drive__row-menu')))close();};
        document.addEventListener('pointerdown',closeOutside);
        document.addEventListener('keydown',closeOnKey);
        window.addEventListener('scroll',closeOnScroll,true);
        window.addEventListener('resize',close);
        return()=>{document.removeEventListener('pointerdown',closeOutside);document.removeEventListener('keydown',closeOnKey);window.removeEventListener('scroll',closeOnScroll,true);window.removeEventListener('resize',close);};
      },[menuId]);
      useEffect(()=>{
        if(!preview)return undefined;
        const closePreviewOutside=event=>{if(!event.target.closest('.eva-file-preview-sidebar'))setPreview(null);};
        const closePreviewOnKey=event=>{if(event.key==='Escape')setPreview(null);};
        document.addEventListener('pointerdown',closePreviewOutside);
        document.addEventListener('keydown',closePreviewOnKey);
        return()=>{document.removeEventListener('pointerdown',closePreviewOutside);document.removeEventListener('keydown',closePreviewOnKey);};
      },[preview]);

      const all=useMemo(()=>context.files.list(projectId,actor),[revision,projectId,actor]);
      const trash=useMemo(()=>canViewTrash?context.files.trashList(projectId,actor):[],[revision,projectId,actor,canViewTrash]);
      const snapshot=useMemo(()=>context.files.snapshot(actor),[revision,actor]);
      const shown=useMemo(()=>{
        let list=trashMode?trash:all;
        const normalized=query.trim().toLowerCase();
        if(normalized)list=list.filter(item=>[
          item.name,item.creator,fileType(item),item.external?.host,item.external?.url,...(item.tags||[]),...relationsFor(item).map(relation=>relation.label)
        ].some(value=>String(value||'').toLowerCase().includes(normalized)));
        else if(!trashMode)list=list.filter(item=>item.parent_id===parentId);
        return context.files.sortEntries(list);
      },[all,trash,trashMode,parentId,query,revision]);
      const selected=useMemo(()=>(trashMode?trash:snapshot).find(item=>item.id===selectedId)||null,[snapshot,trash,trashMode,selectedId]);
      const availableTags=useMemo(()=>Array.from(new Set(all.flatMap(item=>item.tags||[]))),[all]);

      useEffect(()=>{if(selectedId&&!shown.some(item=>item.id===selectedId))setSelectedId(null);},[shown,selectedId]);

      const enterFolder=item=>{setParentId(item.id);setCrumbs(path=>[...path,{id:item.id,name:item.name}]);setQuery('');setSelectedId(null);};
      const navigateCrumb=index=>{setParentId(index===0?0:crumbs[index-1].id);setCrumbs(path=>path.slice(0,index));setSelectedId(null);};
      const navigateUp=()=>{const next=crumbs.slice(0,-1);setCrumbs(next);setParentId(next.length?next[next.length-1].id:0);setQuery('');setSelectedId(null);};
      const externalInfo=item=>{try{return context.files.externalLinkInfo(item,actor);}catch{return null;}};
      const openExternal=item=>{
        try{
          const info=context.files.externalLinkInfo(item,actor);if(!info)throw new Error('当前资源不是外部链接');
          const popup=window.open(info.url,'_blank','noopener,noreferrer');if(popup)popup.opener=null;
        }catch{setSelectedId(item.id);}
      };
      const copyExternalLink=item=>{
        const info=externalInfo(item);if(info&&navigator.clipboard?.writeText)navigator.clipboard.writeText(info.url).catch(()=>{});
      };
      const openPreview=async item=>{
        try{
          const target=context.files.resolveFile(item,actor);if(target.type==='external_link'){openExternal(item);return;}
          const url=target.previewUrl||target.url||await deps.demoFileUrl(target.sourceFileName||target.name);
          setSelectedId(null);
          setPreview({...target,url,extension:target.extension||target.name.split('.').pop(),shortcut:item.type==='shortcut'});
        }catch{setPreview(null);}
      };
      const openDetails=item=>{setPreview(null);setSelectedId(item.id);};
      const download=async item=>{
        const liveItem=context.files.list(item.spaceId,actor).find(candidate=>candidate.id===item.id);
        if(!liveItem||liveItem.type==='folder'||liveItem.deletedAt||!context.files.can('download',liveItem.spaceId,actor))throw new Error('当前文件无法下载');
        const target=context.files.resolveFile(liveItem,actor);
        if(target.type==='folder'||target.deletedAt||!context.files.can('download',target.spaceId,actor))throw new Error('当前文件无法下载');
        const url=target.url||window.__EVA_FILE_SAMPLE_URLS?.[target.sourceFileName||target.name]||window.__EVA_FILE_DOWNLOAD_FALLBACK_URL||'prototype/assets/file-samples/file-placeholder.txt';
        return deps.downloadFile(url,target.name);
      };
      const copyLink=item=>{
        const url=location.origin+location.pathname+'#/drive?file='+encodeURIComponent(item.id);
        if(navigator.clipboard?.writeText)navigator.clipboard.writeText(url).catch(()=>{});
      };
      const openRelationSource=relation=>{
        if(!relation?.navigable||relation.restricted)return;
        const target=relation.target||{};
        if(relation.type==='ai-conversation'&&target.identityId){
          const params=new URLSearchParams({evaIM:'my-ai',evaIdentity:target.identityId});
          if(target.sessionId)params.set('evaSession',target.sessionId);
          if(target.messageId)params.set('evaMessage',target.messageId);
          location.hash='#/messages?'+params.toString();
        }else if(relation.type==='chat'&&relation.id){
          const params=new URLSearchParams({evaDM:relation.id});
          if(target.messageId)params.set('evaMessage',target.messageId);
          location.hash='#/messages?'+params.toString();
        }else if(relation.type==='group'&&relation.id){
          location.hash='#/messages';
          setTimeout(()=>window.dispatchEvent(new CustomEvent('eva-im:open',{detail:{conversationId:target.groupId||relation.id,threadId:target.threadId||null,messageId:target.messageId||null}})),80);
        }
      };
      const locationLabel=item=>{
        const parts=['团队文件'];let current=item;
        while(current?.parent_id){current=snapshot.find(candidate=>candidate.id===current.parent_id);if(current)parts.splice(1,0,current.name);}
        return parts.join(' / ');
      };
      const originalLocation=item=>{
        const parent=snapshot.find(candidate=>candidate.id===item.originalParentId);
        return parent?'团队文件 / '+parent.name:'团队文件根目录';
      };
      const showNotice=message=>{
        setNotice(message);
        clearTimeout(noticeTimer.current);
        noticeTimer.current=setTimeout(()=>setNotice(''),1800);
      };
      const restoreItem=item=>{
        const result=context.files.restore(actor,item.id);
        setSelectedId(null);
        showNotice(result?.restoredToRoot?'原位置不存在，已恢复到空间根目录':'已恢复到原位置');
      };
      const completeDialog=()=>{
        if(!dialog)return;
        const item=dialog.id?snapshot.find(entry=>entry.id===dialog.id):null;
        try{
          if(dialog.type==='new-folder')context.files.createFolder(actor,projectId,dialog.value||'',parentId);
          if(dialog.type==='external-link'){const id=context.files.createExternalLink(actor,projectId,{name:dialog.name||'',url:dialog.url||''},parentId);setSelectedId(id);}
          if(dialog.type==='external-folder'){const id=context.files.createExternalLink(actor,projectId,{name:dialog.name||'',url:dialog.url||'',kind:'folder'},parentId);setSelectedId(id);showNotice('外部文件夹已添加');}
          if(dialog.type==='edit-external-link'){context.files.updateExternalLink(actor,item.id,{name:dialog.name||'',url:dialog.url||'',kind:item.external?.kind==='folder'?'folder':undefined,confirmHostChange:Boolean(dialog.confirmHostChange)});setSelectedId(item.id);}
          if(dialog.type==='rename')context.files.rename(actor,item.id,dialog.value||'');
          if(dialog.type==='move')context.files.move(actor,item.id,dialog.parentId||0);
          if(dialog.type==='tags'){
            const tags=Array.isArray(dialog.tags)?[...dialog.tags]:[];
            const input=String(dialog.tagInput||'').trim().slice(0,20);
            const pending=availableTags.find(existing=>existing.toLowerCase()===input.toLowerCase())||input;
            if(pending&&!tags.some(tag=>tag.toLowerCase()===pending.toLowerCase())&&tags.length<8)tags.push(pending);
            context.files.updateTags(actor,item.id,tags);
          }
          if(dialog.type==='create-shortcut'){const targetSpaceId=dialog.targetSpaceId||context.files.writableSpaces(actor,item.spaceId)[0]?.id;context.files.createShortcut(actor,item.id,targetSpaceId,dialog.targetParentId||0);}
          if(dialog.type==='trash'){context.files.trash(actor,item.id);setSelectedId(null);}
          if(dialog.type==='delete'){context.files.removeForever(actor,item.id);setSelectedId(null);}
          setDialog(null);
        }catch(error){const message=error.message||'操作失败';setDialog({...dialog,error:message,confirmHostChange:dialog.confirmHostChange||message.includes('域名已变更')});}
      };

      const renderDialog=()=>{
        if(!dialog)return null;
        const item=dialog.id?snapshot.find(entry=>entry.id===dialog.id):null;
        const externalFolderDialog=dialog.type==='external-folder'||(dialog.type==='edit-external-link'&&item?.external?.kind==='folder');
        const title=dialog.type==='new-folder'?'新建文件夹':dialog.type==='external-folder'?'添加外部文件夹':dialog.type==='external-link'?'添加外部链接':dialog.type==='edit-external-link'?(externalFolderDialog?'编辑外部文件夹':'编辑外部链接'):dialog.type==='rename'?'重命名':dialog.type==='move'?'移动到':dialog.type==='tags'?'编辑标签':dialog.type==='create-shortcut'?'创建快捷方式':dialog.type==='trash'?'移至回收站':'永久删除';
        const confirm=dialog.type==='new-folder'?'创建':dialog.type==='external-folder'?'添加文件夹':dialog.type==='external-link'?'添加链接':dialog.type==='edit-external-link'?(dialog.confirmHostChange?'确认更换并保存':'保存'):dialog.type==='move'?'移动':dialog.type==='tags'?'保存':dialog.type==='create-shortcut'?'创建快捷方式':dialog.type==='trash'?'移至回收站':dialog.type==='delete'?'永久删除':'保存';
        let body=null;
        if(dialog.type==='new-folder'||dialog.type==='rename')body=h('label',{className:'eva-drive-dialog__field'},h('span',null,dialog.type==='new-folder'?'文件夹名称':'新名称'),h('input',{id:'eva-project-files-dialog-value',name:'projectFileName',autoFocus:true,value:dialog.value||'',placeholder:'请输入名称',onChange:event=>setDialog({...dialog,value:event.target.value})}),dialog.error?h('small',{className:'eva-project-files__error'},dialog.error):null);
        if(dialog.type==='external-folder'||dialog.type==='external-link'||dialog.type==='edit-external-link'){
          let draftInfo=null,draftError='';
          if(externalFolderDialog&&String(dialog.url||'').trim())try{draftInfo=context.files.inspectExternalLink(dialog.url,{kind:'folder'});}catch(error){draftError=error.message||'无法识别该链接';}
          const nameField=h('label',{className:'eva-drive-dialog__field'},h('span',null,externalFolderDialog?'文件夹名称':'链接名称'),h('input',{id:'eva-project-files-external-name',name:'externalLinkName',autoFocus:!externalFolderDialog,maxLength:100,value:dialog.name||'',placeholder:externalFolderDialog?'例如：供应商交付资料':'例如：供应商协作飞书文档',onChange:event=>setDialog({...dialog,name:event.target.value,error:null})}));
          const urlField=h('label',{className:'eva-drive-dialog__field'},h('span',null,externalFolderDialog?'文件夹链接':'外部链接'),h('input',{id:'eva-project-files-external-url',name:'externalLinkUrl',autoFocus:externalFolderDialog,type:'url',value:dialog.url||'',placeholder:'https://',onChange:event=>setDialog({...dialog,url:event.target.value,error:null,confirmHostChange:false})}));
          body=h(R.Fragment,null,
          externalFolderDialog?urlField:nameField,
          externalFolderDialog?h('div',{className:'eva-external-link-detection'+(draftError?' is-error':draftInfo?' is-ready':''),role:'status','aria-live':'polite'},icon(draftError?'external':draftInfo?.provider==='feishu'?'link':draftInfo?.provider==='wecom'?'users':'folder'),h('span',null,h('strong',null,draftError?'无法按文件夹保存':draftInfo?(draftInfo.provider==='web'?'其他平台':draftInfo.providerLabel)+' · 文件夹':'等待识别'),h('small',null,draftError||(!draftInfo?'粘贴链接后识别来源平台':draftInfo.detection==='pattern'?'已识别为文件夹链接':'链接类型由你确认，将按外部文件夹保存')))) : null,
          externalFolderDialog?nameField:urlField,
          dialog.confirmHostChange?h('div',{className:'eva-external-link-warning'},icon('external'),h('span',null,'链接域名发生变化。请确认新地址可信后再保存。')):null,
          dialog.error?h('small',{className:'eva-project-files__error'},dialog.error):null,
          h('p',{className:'eva-drive-dialog__hint'},externalFolderDialog?'仅保存访问入口，不复制或同步文件夹内容；访问权限仍由原平台控制。':'仅保存访问入口，不复制外部内容、版本和评论；访问权限仍由原平台控制。')
          );
        }
        if(dialog.type==='move')body=h(R.Fragment,null,
          h('label',{className:'eva-drive-dialog__field'},h('span',null,'目标文件夹'),h('select',{value:dialog.parentId||0,onChange:event=>setDialog({...dialog,parentId:event.target.value==='0'?0:event.target.value})},
            h('option',{value:0},'项目根目录'),
            all.filter(folder=>folder.type==='folder'&&folder.id!==dialog.id).map(folder=>h('option',{key:folder.id,value:folder.id},folder.name))
          )),
          h('p',{className:'eva-drive-dialog__hint'},'仅允许在当前项目空间内移动。'),
          dialog.error?h('small',{className:'eva-project-files__error'},dialog.error):null
        );
        if(dialog.type==='tags'){
          const tags=Array.isArray(dialog.tags)?dialog.tags:[];
          const query=String(dialog.tagInput||'').trim().toLowerCase();
          const suggestions=availableTags.filter(tag=>!tags.some(selected=>selected.toLowerCase()===tag.toLowerCase())&&(!query||tag.toLowerCase().includes(query)));
          const addTag=value=>{
            const input=String(value??dialog.tagInput??'').trim().slice(0,20);
            const tag=availableTags.find(existing=>existing.toLowerCase()===input.toLowerCase())||input;
            if(!tag){setDialog({...dialog,error:'请输入标签名称'});return;}
            if(tags.some(selected=>selected.toLowerCase()===tag.toLowerCase())){setDialog({...dialog,tagInput:'',error:'该标签已选择'});return;}
            if(tags.length>=8){setDialog({...dialog,error:'每个文件最多添加 8 个标签'});return;}
            setDialog({...dialog,tags:[...tags,tag],tagInput:'',tagDropdownOpen:true,error:null});
          };
          body=h(R.Fragment,null,
            h('div',{className:'eva-tag-editor'},
              h('span',{className:'eva-tag-editor__label'},'自定义标签'),
              h('div',{className:'eva-tag-editor__selected'},tags.length?tags.map(tag=>h('span',{className:'eva-tag-editor__chip',key:tag},h('span',null,tag),h('button',{type:'button','aria-label':'移除标签 '+tag,onClick:()=>setDialog({...dialog,tags:tags.filter(value=>value!==tag),error:null})},icon('x')))):h('span',{className:'eva-tag-editor__empty'},'暂未选择标签')),
              h('div',{className:'eva-tag-editor__control'},
                h('input',{autoFocus:true,value:dialog.tagInput||'',maxLength:20,placeholder:'输入或选择标签',role:'combobox','aria-label':'输入或选择标签','aria-expanded':dialog.tagDropdownOpen!==false,'aria-controls':'eva-project-tag-options',autoComplete:'off',onFocus:()=>{if(dialog.tagDropdownOpen===false)setDialog({...dialog,tagDropdownOpen:true});},onChange:event=>setDialog({...dialog,tagInput:event.target.value,tagDropdownOpen:true,error:null}),onKeyDown:event=>{if(event.key==='Enter'){event.preventDefault();addTag();}}}),
                h('button',{className:'eva-tag-editor__toggle',type:'button','aria-label':dialog.tagDropdownOpen===false?'展开已有标签':'收起已有标签',onClick:()=>setDialog({...dialog,tagDropdownOpen:dialog.tagDropdownOpen===false})},icon('arrow'))
              ),
              dialog.tagDropdownOpen===false?null:h('div',{id:'eva-project-tag-options',className:'eva-tag-editor__dropdown',role:'listbox','aria-label':'当前空间已有标签'},suggestions.length?suggestions.map(tag=>h('button',{className:'eva-tag-editor__option',type:'button',role:'option',key:tag,onClick:()=>addTag(tag)},tag)):h('span',{className:'eva-tag-editor__empty'},'没有匹配标签，按回车新建')),
              dialog.error?h('small',{className:'eva-project-files__error'},dialog.error):null
            ),
            h('p',{className:'eva-drive-dialog__hint'},'从下拉框选择已有标签，或直接输入后按回车新建。最多 8 个标签。')
          );
        }
        if(dialog.type==='create-shortcut'){
          const spaces=context.files.writableSpaces(actor,item.spaceId),targetSpaceId=dialog.targetSpaceId||spaces[0]?.id,folders=targetSpaceId?context.files.list(targetSpaceId,actor).filter(entry=>entry.type==='folder'):[];
          body=spaces.length?h(R.Fragment,null,
            h('div',{className:'eva-shortcut-source'},h('span',null,'源文件'),h('strong',null,item.name),h('small',null,'当前项目 · 团队文件')),
            h('label',{className:'eva-drive-dialog__field'},h('span',null,'目标空间'),h('select',{value:targetSpaceId,onChange:event=>setDialog({...dialog,targetSpaceId:event.target.value,targetParentId:0})},spaces.map(space=>h('option',{key:space.id,value:space.id},(space.kind==='personal'?'个人空间':'项目空间')+' · '+space.name)))),
            h('label',{className:'eva-drive-dialog__field'},h('span',null,'目标文件夹'),h('select',{value:dialog.targetParentId||0,onChange:event=>setDialog({...dialog,targetParentId:event.target.value==='0'?0:event.target.value})},h('option',{value:0},'根目录'),folders.map(folder=>h('option',{key:folder.id,value:folder.id},folder.name)))),
            h('p',{className:'eva-drive-dialog__hint'},'快捷方式不复制文件，也不会向目标空间成员授予源文件权限。'),dialog.error?h('small',{className:'eva-project-files__error'},dialog.error):null
          ):h('p',null,'没有其他可写入的空间，暂时无法创建跨空间快捷方式。');
        }
        if(dialog.type==='trash')body=h('p',null,'将“'+item.name+'”'+(item.type==='folder'?'及其中内容':'')+'移至回收站？Owner 或 Manager 可恢复。');
        if(dialog.type==='delete')body=h('p',null,'永久删除“'+item.name+'”'+(item.type==='folder'?'及其中内容':'')+'后不可恢复。');
        const noTarget=dialog.type==='create-shortcut'&&!context.files.writableSpaces(actor,item.spaceId).length;
        return h(Dialog,{title,confirmLabel:noTarget?null:confirm,onConfirm:completeDialog,onClose:()=>setDialog(null),danger:['trash','delete'].includes(dialog.type)},body);
      };

      const renderTags=item=>{
        const tags=item.tags||[];
        if(!tags.length)return item.type==='folder'?h('span',{className:'eva-file-muted'},'文件夹'):null;
        return h('span',{className:'eva-drive__name-tags'},tags.slice(0,2).map(tag=>h('span',{className:'eva-file-tag',key:tag},tag)),tags.length>2?h('span',{className:'eva-file-tag is-more'},'+'+(tags.length-2)):null);
      };
      const renderRelationCell=item=>{
        const linkInfo=externalInfo(item);
        if(linkInfo)return h('span',{className:'eva-relation-cell'},h('span',{className:'eva-relation-chip is-external',title:linkInfo.url},icon(linkInfo.kind==='folder'?'folder':'link'),linkInfo.providerLabel+' · '+linkInfo.host));
        const relations=relationsFor(item);
        if(!relations.length)return h('span',{className:'eva-file-muted'},'—');
        return h('span',{className:'eva-relation-cell'},relations.slice(0,2).map(relation=>h('span',{className:'eva-relation-chip'+(relation.restricted?' is-restricted':''),key:relation.type+relation.id,title:relation.meta||relation.label},icon(relationIcon[relation.type]||'link'),relation.label)),relations.length>2?h('span',{className:'eva-relation-more'},'+'+(relations.length-2)):null);
      };
      const renderRelationsDetail=item=>{
        const relations=relationsFor(item);
        if(!relations.length)return h('p',{className:'eva-file-detail__empty'},'当前文件没有系统关联');
        return h('div',{className:'eva-file-relations'},relations.map(relation=>h('div',{className:'eva-file-relation',key:relation.type+relation.id},
          h('span',{className:'eva-file-relation__icon'},icon(relationIcon[relation.type]||'link')),
          h('span',null,h('small',null,relationTypeLabel[relation.type]||'关联内容'),h('strong',null,relation.label),relation.meta?h('em',null,relation.meta):null),
          relation.navigable&&!relation.restricted&&['ai-conversation','chat','group'].includes(relation.type)?h('button',{className:'eva-file-relation__action',type:'button',onClick:()=>openRelationSource(relation)},'查看来源'):null
        )));
      };

      const renderRowActions=item=>{
        const closeMenu=()=>{setMenuId(null);setMenuAnchor(null);};
        const menuButton=(label,onClick,danger)=>h('button',{key:label,type:'button',role:'menuitem',className:danger?'is-danger':undefined,onClick:event=>{event.stopPropagation();closeMenu();onClick();}},label);
        const shortcutInfo=context.files.shortcutInfo(item,actor),canOpen=!shortcutInfo||shortcutInfo.status==='available',linkInfo=canOpen?externalInfo(item):null,isExternal=Boolean(linkInfo),canDownload=item.type!=='folder'&&!isExternal&&canOpen&&context.files.can('download',item.spaceId,actor),items=[];
        if(trashMode){
          items.push(menuButton('查看文件信息',()=>openDetails(item)));
          if(context.files.can('restore',item.spaceId,actor))items.push(menuButton('恢复',()=>restoreItem(item)));
          if(context.files.can('delete-forever',item.spaceId,actor))items.push(menuButton('永久删除',()=>setDialog({type:'delete',id:item.id}),true));
        }else{
          if(item.type==='folder')items.push(menuButton('打开文件夹',()=>enterFolder(item)));
          else if(isExternal)items.push(menuButton(linkInfo.kind==='folder'?'打开原文件夹':'打开原链接',()=>openExternal(item)));
          else if(canOpen)items.push(menuButton('预览',()=>openPreview(item)));
          if(canDownload)items.push(menuButton('下载',()=>download(item)));
          items.push(menuButton('查看文件信息',()=>openDetails(item)));
          if(isExternal)items.push(menuButton(linkInfo.kind==='folder'?'复制文件夹链接':'复制外部链接',()=>copyExternalLink(item)));
          items.push(menuButton('复制内部链接',()=>copyLink(item)));
          if(context.files.can('rename',item.spaceId,actor))items.push(menuButton('重命名',()=>setDialog({type:'rename',id:item.id,value:item.name})));
          if(item.type==='external_link'&&context.files.can('edit-external-link',item.spaceId,actor))items.push(menuButton(linkInfo?.kind==='folder'?'编辑外部文件夹':'编辑链接',()=>setDialog({type:'edit-external-link',id:item.id,name:item.name,url:linkInfo?.url||''})));
          if(context.files.can('move',item.spaceId,actor))items.push(menuButton('移动',()=>setDialog({type:'move',id:item.id,parentId:item.parent_id||0})));
          if(item.type!=='shortcut'&&!isExternal&&context.files.can('copy',item.spaceId,actor))items.push(menuButton('创建副本',()=>context.files.copy(actor,item.id)));
          if(item.type!=='shortcut'&&item.type!=='folder'&&context.files.can('create-shortcut',item.spaceId,actor))items.push(menuButton('创建快捷方式',()=>setDialog({type:'create-shortcut',id:item.id,targetSpaceId:context.files.writableSpaces(actor,item.spaceId)[0]?.id,targetParentId:0})));
          if(item.type!=='folder'&&context.files.can('edit-tags',item.spaceId,actor))items.push(menuButton('编辑标签',()=>setDialog({type:'tags',id:item.id,tags:[...(item.tags||[])],tagInput:'',tagDropdownOpen:true})));
          if(context.files.can('trash',item.spaceId,actor))items.push(menuButton('移至回收站',()=>setDialog({type:'trash',id:item.id}),true));
        }
        const open=menuId===item.id;
        return h('span',{className:'eva-drive__row-actions'},
          h('button',{className:'eva-drive__row-more',type:'button','aria-label':'更多操作：'+item.name,'aria-haspopup':'menu','aria-expanded':open,onClick:event=>{
            event.stopPropagation();
            if(open){closeMenu();return;}
            const rect=event.currentTarget.getBoundingClientRect(),viewportHeight=window.visualViewport?.height||window.innerHeight,menuHeight=Math.min(items.length*34+10,Math.max(160,viewportHeight-24)),roomBelow=viewportHeight-rect.bottom-12,opensUp=roomBelow<menuHeight&&rect.top>roomBelow;
            setMenuAnchor({left:Math.max(12,Math.round(rect.right-168)),top:opensUp?undefined:Math.round(rect.bottom+4),bottom:opensUp?Math.max(12,Math.round(viewportHeight-rect.top+4)):undefined});
            setMenuId(item.id);
          }},icon('more')),
          open&&menuAnchor?h('span',{className:'eva-drive__row-menu',role:'menu','aria-label':item.name+'的操作',style:menuAnchor},items):null
        );
      };

      const renderDetails=()=>{
        if(!selected)return null;
        const deleted=Boolean(selected.deletedAt),canEditTags=context.files.can('edit-tags',selected.spaceId,actor)&&selected.type!=='folder',canRestore=context.files.can('restore',selected.spaceId,actor),canDeleteForever=context.files.can('delete-forever',selected.spaceId,actor),shortcutInfo=context.files.shortcutInfo(selected,actor),canOpen=!shortcutInfo||shortcutInfo.status==='available',linkInfo=canOpen?externalInfo(selected):null,isExternal=Boolean(linkInfo),canDownload=selected.type!=='folder'&&!isExternal&&!deleted&&canOpen&&context.files.can('download',selected.spaceId,actor);
        return h(Dialog,{title:isExternal?(linkInfo.kind==='folder'?'外部文件夹详情':'外部链接详情'):'文件详情',onClose:()=>setSelectedId(null),detail:true},
          h('div',{className:'eva-file-detail-dialog__content'},
          h('div',{className:'eva-file-detail__identity'+(!deleted?' eva-file-detail__identity--with-action':'')},h('span',{className:'eva-drive__file-mark '+markClass(selected)},fileMarkIcon(selected)),h('span',{className:'eva-file-detail__identity-content'},h('strong',null,selected.name),h('small',null,fileType(selected)+(selected.type==='folder'?(deleted&&selected.trashedItemCount?' · 包含 '+selected.trashedItemCount+' 项':''):isExternal?' · '+linkInfo.host:' · '+bytes(selected.size)))),!deleted?h('button',{className:'eva-file-detail__copy-link',type:'button',onClick:()=>copyLink(selected),'aria-label':'复制内部链接',title:'复制内部链接'},icon('link')):null),
          !deleted&&(canDownload||isExternal)?h('div',{className:'eva-drive__inspector-actions'},
            isExternal?h('button',{className:'eva-drive__ghost-button',type:'button',onClick:()=>openExternal(selected)},linkInfo.kind==='folder'?'打开原文件夹':'打开原链接'):selected.type!=='folder'&&canOpen?h('button',{className:'eva-drive__ghost-button',type:'button',onClick:()=>openPreview(selected)},'预览'):null,
            isExternal?h('button',{className:'eva-drive__ghost-button',type:'button',onClick:()=>copyExternalLink(selected)},linkInfo.kind==='folder'?'复制文件夹链接':'复制外部链接'):h('button',{className:'eva-drive__ghost-button',type:'button',onClick:()=>download(selected)},'下载')
          ):null,
          deleted&&(canRestore||canDeleteForever)?h('div',{className:'eva-drive__management-actions'},
            canRestore?h('button',{type:'button',onClick:()=>restoreItem(selected)},'恢复'):null,
            canDeleteForever?h('button',{className:'is-danger',type:'button',onClick:()=>setDialog({type:'delete',id:selected.id})},'永久删除'):null
          ):!deleted?h('div',{className:'eva-drive__management-actions'},
            h('button',{type:'button',onClick:()=>setDialog({type:'rename',id:selected.id,value:selected.name})},'重命名'),
            selected.type==='external_link'?h('button',{type:'button',onClick:()=>setDialog({type:'edit-external-link',id:selected.id,name:selected.name,url:linkInfo?.url||''})},linkInfo?.kind==='folder'?'编辑外部文件夹':'编辑链接'):null,
            h('button',{type:'button',onClick:()=>setDialog({type:'move',id:selected.id,parentId:selected.parent_id||0})},'移动'),
            selected.type!=='shortcut'&&!isExternal?h('button',{type:'button',onClick:()=>context.files.copy(actor,selected.id)},'创建副本'):null,
            selected.type!=='shortcut'&&selected.type!=='folder'?h('button',{type:'button',onClick:()=>setDialog({type:'create-shortcut',id:selected.id,targetSpaceId:context.files.writableSpaces(actor,selected.spaceId)[0]?.id,targetParentId:0})},'创建快捷方式'):null,
            canTrash?h('button',{className:'is-danger',type:'button',onClick:()=>setDialog({type:'trash',id:selected.id})},'移至回收站'):null
          ):null,
          selected.type!=='folder'?h('section',{className:'eva-file-detail__section'},
            h('div',{className:'eva-file-detail__section-head'},h('h3',null,'标签'),canEditTags?h('button',{type:'button',onClick:()=>setDialog({type:'tags',id:selected.id,tags:[...(selected.tags||[])],tagInput:'',tagDropdownOpen:true})},'编辑'):null),
            h('div',{className:'eva-file-detail__classification'},renderTags(selected)||h('span',{className:'eva-file-muted'},'暂无标签'))
          ):null,
          selected.type!=='folder'?h('section',{className:'eva-file-detail__section'},
            h('div',{className:'eva-file-detail__section-head'},h('h3',null,'系统关联'),h('span',{className:'eva-file-readonly'},'只读')),
            renderRelationsDetail(selected)
          ):null,
          shortcutInfo?h('section',{className:'eva-file-detail__section'},h('div',{className:'eva-file-detail__section-head'},h('h3',null,'快捷方式信息')),h('dl',{className:'eva-drive__meta'},
            h('div',null,h('dt',null,'访问状态'),h('dd',null,shortcutInfo.statusLabel)),
            shortcutInfo.status==='available'?h(R.Fragment,null,h('div',null,h('dt',null,'源文件'),h('dd',null,shortcutInfo.sourceName)),h('div',null,h('dt',null,'来源空间'),h('dd',null,shortcutInfo.sourceSpaceName))):h('div',null,h('dt',null,'权限说明'),h('dd',null,'快捷方式不会授予源文件权限'))
          )):null,
          isExternal?h('section',{className:'eva-file-detail__section'},h('div',{className:'eva-file-detail__section-head'},h('h3',null,linkInfo.kind==='folder'?'外部文件夹':'外部链接')),h('dl',{className:'eva-drive__meta'},
            h('div',null,h('dt',null,'来源平台'),h('dd',null,linkInfo.providerLabel)),
            h('div',null,h('dt',null,'资源类型'),h('dd',null,linkInfo.kindLabel)),
            h('div',null,h('dt',null,'链接域名'),h('dd',null,linkInfo.host)),
            h('div',null,h('dt',null,'内容与版本'),h('dd',null,'由原平台维护'))
          )):null,
          h('section',{className:'eva-file-detail__section'},h('div',{className:'eva-file-detail__section-head'},h('h3',null,'文件信息')),
            h('dl',{className:'eva-drive__meta'},
              h('div',null,h('dt',null,'文件类型'),h('dd',null,fileType(selected))),
              h('div',null,h('dt',null,'所在位置'),h('dd',null,deleted?originalLocation(selected):locationLabel(selected))),
              h('div',null,h('dt',null,'产生方式'),h('dd',null,sourceLabel(selected))),
              h('div',null,h('dt',null,'创建者'),h('dd',null,selected.creator||'—')),
              h('div',null,h('dt',null,'创建时间'),h('dd',null,time(selected.createdAt))),
              h('div',null,h('dt',null,'大小'),h('dd',null,selected.type==='folder'||isExternal?'—':bytes(selected.size)))
            )
          )
          )
        );
      };

      const renderRows=()=>{
        if(!shown.length)return h('div',{className:'eva-project-files__empty'},query.trim()?'没有匹配的文件':trashMode?'回收站为空':'当前目录暂无文件');
        return h('div',{className:'eva-drive__table eva-drive__table--with-source eva-project-files__table'+(trashMode?' eva-drive__table--trash':''),role:'table','aria-label':trashMode?'项目回收站':'团队文件列表'},
          h('div',{className:'eva-drive__table-head',role:'row'},
            h('span',null,'名称'),h('span',null,'文件类型'),h('span',null,trashMode?'原位置':'关联内容'),h('span',null,'大小'),h('span',null,trashMode?'删除信息':'创建信息'),h('span',null,'操作')),
          shown.map(item=>h('div',{className:'eva-drive__row',role:'row',tabIndex:0,key:item.id,'data-project-resource-id':item.id,'aria-selected':item.id===selectedId?'true':'false',onClick:event=>{
            if(event.target.closest('button'))return;
            if(item.type==='folder'){if(!trashMode)enterFolder(item);return;}
            openPreview(item);
          },onKeyDown:event=>{
            if(event.target!==event.currentTarget||!['Enter',' '].includes(event.key))return;
            event.preventDefault();
            if(item.type==='folder'){if(!trashMode)enterFolder(item);return;}
            openPreview(item);
          }},
            h('button',{className:'eva-drive__name-cell',type:'button',onClick:()=>item.type==='folder'?(trashMode?undefined:enterFolder(item)):openPreview(item)},
              h('span',{className:'eva-drive__file-mark '+markClass(item)},fileMarkIcon(item)),
              h('span',{className:'eva-drive__name-copy'},h('strong',null,item.name),renderTags(item))
            ),
            h('span',null,h('span',{className:'eva-file-type'},fileType(item))),
            trashMode?h('span',{className:'eva-file-location-cell'},originalLocation(item)):renderRelationCell(item),
            h('span',null,item.type==='folder'?'—':bytes(item.size)),
            h('span',{className:'eva-created-cell'},h('strong',null,trashMode?(item.deletedBy||'—'):(item.creator||'—')),h('small',null,time(trashMode?item.deletedAt:item.createdAt))),
            renderRowActions(item)
          ))
        );
      };

      return h('section',{className:'eva-project-files'},
        h('header',{className:'eva-project-files__header'},
          h('div',null,h('h1',null,trashMode?'回收站':'团队文件'),h('p',null,trashMode?'仅 Owner、Manager 可以恢复或永久删除当前项目文件':'任务产出、群文件与外部协作入口在这里统一沉淀')),
          h('span',{className:'eva-file-role-badge',title:'当前项目文件角色'},roleLabel(role)),
          trashMode?h('button',{className:'eva-drive__text-button',type:'button',onClick:()=>{setTrashMode(false);setSelectedId(null);}},'返回团队文件'):canViewTrash?h('button',{className:'eva-drive__text-button',type:'button',onClick:()=>{setTrashMode(true);setParentId(0);setCrumbs([]);setSelectedId(null);}},'回收站'):null
        ),
        h('div',{className:'eva-project-files__toolbar'},
          !trashMode?h(R.Fragment,null,
            h('button',{className:'eva-drive__action',type:'button',onClick:()=>setDialog({type:'new-folder',value:''})},icon('plus'),'新建文件夹'),
            h('details',{className:'eva-drive__external-add',onBlur:event=>{if(!event.currentTarget.contains(event.relatedTarget))event.currentTarget.open=false;},onKeyDown:event=>{if(event.key==='Escape'){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}},
              h('summary',{className:'eva-drive__action','aria-label':'添加外部资源'},icon('link'),h('span',null,'添加外部资源'),icon('arrow')),
              h('span',{className:'eva-drive__external-add-menu',role:'menu','aria-label':'添加外部资源'},
                h('button',{type:'button',role:'menuitem',onClick:event=>{event.currentTarget.closest('details').open=false;setDialog({type:'external-folder',name:'',url:''});}},h('span',{className:'eva-drive__external-add-icon'},icon('folder')),h('span',null,h('strong',null,'外部文件夹'),h('small',null,'飞书、企业微信等文件夹入口'))),
                h('button',{type:'button',role:'menuitem',onClick:event=>{event.currentTarget.closest('details').open=false;setDialog({type:'external-link',name:'',url:''});}},h('span',{className:'eva-drive__external-add-icon'},icon('link')),h('span',null,h('strong',null,'普通外部链接'),h('small',null,'文档、表格或网页入口')))
              )
            ),
            h('button',{className:'eva-drive__action eva-drive__action--primary',type:'button',onClick:()=>uploadInput.current?.click()},icon('upload'),'上传本地文件'),
            h('input',{ref:uploadInput,id:'eva-project-files-upload',name:'projectFiles',type:'file',multiple:true,hidden:true,onChange:event=>{Array.from(event.target.files||[]).forEach(file=>context.files.upload(actor,projectId,file,parentId));event.target.value='';}})
          ):null,
          h('label',{className:'eva-drive__side-search'},icon('search'),h('input',{id:'eva-project-files-search',name:'projectFileSearch',type:'search',value:query,onChange:event=>setQuery(event.target.value),placeholder:'搜索当前项目'}))
        ),
        !trashMode&&crumbs.length?h('div',{className:'eva-drive__pathbar'},
          h('button',{className:'eva-drive__back-button',type:'button',onClick:navigateUp},icon('chevron'),h('span',null,'返回上一级')),
          h('nav',{className:'eva-drive__breadcrumbs','aria-label':'文件路径'},[{id:0,name:'团队文件'},...crumbs].map((crumb,index)=>h(R.Fragment,{key:crumb.id},index?h('span',null,'/'):null,h('button',{type:'button','aria-current':index===crumbs.length?'page':undefined,onClick:()=>index<crumbs.length&&navigateCrumb(index)},crumb.name))))
        ):null,
        h('div',{className:'eva-project-files__content'},renderRows()),
        renderDetails(),
        renderDialog(),
        preview?h('aside',{className:'eva-file-preview-sidebar eva-project-file-preview-sidebar','aria-label':'文件预览'},h('div',{className:'eva-project-file-preview'},preview.sharedVersion?h('p',{className:'eva-members-notice'},'项目副本 · 来源：',sourceLabel(preview),'。访问此文件不会获得来源群的聊天权限。'):null,h(deps.FilePreviewHost,{file:preview,onClose:()=>setPreview(null)}))):null,
        notice?h('div',{className:'eva-project-files__notice',role:'status','aria-live':'polite'},notice):null
      );
    };
  }

  root.EvaProjectFilesUI=Object.freeze({
    render(props,deps){Component||=create(deps);return deps.React.createElement(Component,props);}
  });
})(window);
