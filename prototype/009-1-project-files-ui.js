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
    const isExternalFolder=item=>item.type==='external_link'&&item.external?.kind==='folder';
    const fileIcon=item=>item.type==='folder'||isExternalFolder(item)?'folder':item.type==='external_link'?'link':['xlsx','xls','csv'].includes(item.extension)?'sheet':'file';
    const markClass=item=>item.type==='folder'?'is-folder':isExternalFolder(item)?'is-external-folder':item.type==='external_link'?'is-external-link':item.type==='shortcut'?'is-shortcut':item.extension==='pdf'?'is-pdf':['doc','docx'].includes(item.extension)?'is-word':['xlsx','xls','csv'].includes(item.extension)?'is-sheet':['ppt','pptx'].includes(item.extension)?'is-presentation':['zip','rar','7z','tar','gz'].includes(item.extension)?'is-archive':['md','markdown'].includes(item.extension)?'is-markdown':'';
    const fileMarkIcon=item=>h(R.Fragment,null,icon(fileIcon(item)),isExternalFolder(item)?h('span',{className:'eva-drive__file-external-badge'},icon('external')):null,item.type==='shortcut'?h('span',{className:'eva-drive__shortcut-badge'},icon('external')):null);
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

    return function ProjectFiles({context,projectId}){
      const memberRevision=useSyncExternalStore(context.store.subscribe,context.store.getSnapshot);
      const actor=context.store.actorId();
      const revision=useSyncExternalStore(context.files.subscribe,context.files.getSnapshot);
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
      const [notice,setNotice]=useState('');
      const noticeTimer=useRef(null);

      useEffect(()=>{setParentId(0);setCrumbs([]);setQuery('');setSelectedId(null);setTrashMode(false);setDialog(null);setPreview(null);setNotice('');},[projectId]);
      useEffect(()=>()=>clearTimeout(noticeTimer.current),[]);
      useEffect(()=>{
        if(!preview)return undefined;
        const closePreviewOutside=event=>{if(!event.target.closest('.eva-file-preview-sidebar'))setPreview(null);};
        const closePreviewOnKey=event=>{if(event.key==='Escape')setPreview(null);};
        document.addEventListener('pointerdown',closePreviewOutside);
        document.addEventListener('keydown',closePreviewOnKey);
        return()=>{document.removeEventListener('pointerdown',closePreviewOutside);document.removeEventListener('keydown',closePreviewOnKey);};
      },[preview]);

      const all=useMemo(()=>context.files.list(projectId,actor),[revision,memberRevision,projectId,actor]);
      const trash=useMemo(()=>canViewTrash?context.files.trashList(projectId,actor):[],[revision,memberRevision,projectId,actor,canViewTrash]);
      const snapshot=useMemo(()=>context.files.snapshot(actor),[revision,memberRevision,actor]);
      const shown=useMemo(()=>{
        let list=trashMode?trash:all;
        const normalized=query.trim().toLowerCase();
        if(normalized)list=list.filter(item=>[
          item.name,item.creator,fileType(item),item.external?.host,item.external?.url,...(item.tags||[]),...relationsFor(item).map(relation=>relation.label)
        ].some(value=>String(value||'').toLowerCase().includes(normalized)));
        else if(!trashMode)list=list.filter(item=>item.parent_id===parentId);
        return context.files.sortEntries(actor,list,{pinnedFirst:!trashMode});
      },[all,trash,trashMode,parentId,query,revision]);
      const selected=useMemo(()=>(trashMode?trash:snapshot).find(item=>item.id===selectedId)||null,[snapshot,trash,trashMode,selectedId]);

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
      const togglePin=item=>{
        const pinned=context.files.togglePinned(actor,item.id);
        showNotice(pinned?'已置顶，可在文件库的“置顶文件”中查看':'已取消置顶');
      };
      const restoreItem=item=>{
        const result=context.files.restore(actor,item.id);
        setSelectedId(null);
        showNotice(result?.restoredToRoot?'原位置不存在，已恢复到文件库根目录':'已恢复到原位置');
      };
      const completeDialog=()=>{
        if(!dialog)return;
        const item=dialog.id?snapshot.find(entry=>entry.id===dialog.id):null;
        try{
          if(dialog.type==='trash'){context.files.trash(actor,item.id);setSelectedId(null);}
          if(dialog.type==='delete'){context.files.removeForever(actor,item.id);setSelectedId(null);}
          setDialog(null);
        }catch(error){const message=error.message||(dialog.type==='trash'?'文件未能移至回收站，请重试':'文件未能永久删除，请重试');setDialog({...dialog,error:message});}
      };

      const renderDialog=()=>{
        if(!dialog)return null;
        if(deps.forms.fileFormTypes.includes(dialog.type))return h(deps.forms.FileForm,{key:dialog.type+':'+(dialog.id||''),type:dialog.type,files:context.files,actor,spaceId:projectId,parentId,resource:dialog.id?snapshot.find(item=>item.id===dialog.id):null,onClose:()=>setDialog(null),onSaved:result=>{if(['external-link','external-folder','edit-external-link'].includes(result.type))setSelectedId(result.id);if(result.type==='external-folder')showNotice('外部文件夹已添加');}});
        const item=dialog.id?snapshot.find(entry=>entry.id===dialog.id):null;
        return h(deps.forms.FileConfirmation,{resource:item,type:dialog.type,onConfirm:completeDialog,onClose:()=>setDialog(null),error:dialog.error});
      };

      const renderTags=item=>{
        const tags=item.tags||[];
        if(!tags.length)return item.type==='folder'?h('span',{className:'eva-file-muted'},'文件夹'):null;
        return h('span',{className:'eva-drive__name-tags'},tags.slice(0,2).map(tag=>h('span',{className:'eva-file-tag',key:tag},tag)),tags.length>2?h('span',{className:'eva-file-tag is-more'},'+'+(tags.length-2)):null);
      };
      const renderRelationCell=item=>{
        const linkInfo=externalInfo(item);
        if(linkInfo)return h('span',{className:'eva-relation-cell'},h('span',{className:'eva-relation-chip is-external','data-eva-tooltip':linkInfo.url},icon(linkInfo.kind==='folder'?'folder':'link'),linkInfo.providerLabel+' · '+linkInfo.host));
        const relations=relationsFor(item);
        if(!relations.length)return h('span',{className:'eva-file-muted'},'—');
        return h('span',{className:'eva-relation-cell'},relations.slice(0,2).map(relation=>h('span',{className:'eva-relation-chip'+(relation.restricted?' is-restricted':''),key:relation.type+relation.id,'data-eva-tooltip':relation.restricted?undefined:relation.meta||relation.label,'data-eva-tooltip-clamp':!relation.meta?'':undefined},icon(relationIcon[relation.type]||'link'),relation.restricted?relation.meta||'无权访问来源':relation.label)),relations.length>2?h('span',{className:'eva-relation-more'},'+'+(relations.length-2)):null);
      };
      const renderRowActions=item=>{
        const menuButton=(label,onClick,danger)=>({label,onClick,danger});
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
          items.push(menuButton(item.pinned?'取消置顶':'置顶',()=>togglePin(item)));
          if(isExternal)items.push(menuButton(linkInfo.kind==='folder'?'复制文件夹链接':'复制外部链接',()=>copyExternalLink(item)));
          items.push(menuButton('复制内部链接',()=>copyLink(item)));
          if(context.files.can('rename',item.spaceId,actor))items.push(menuButton('重命名',()=>setDialog({type:'rename',id:item.id,value:item.name})));
          if(item.type==='external_link'&&context.files.can('edit-external-link',item.spaceId,actor))items.push(menuButton(linkInfo?.kind==='folder'?'编辑外部文件夹':'编辑链接',()=>setDialog({type:'edit-external-link',id:item.id,name:item.name,url:linkInfo?.url||''})));
          if(context.files.can('move',item.spaceId,actor))items.push(menuButton('移动',()=>setDialog({type:'move',id:item.id,parentId:item.parent_id||0})));
          if(item.type!=='shortcut'&&!isExternal&&context.files.can('copy',item.spaceId,actor))items.push(menuButton('创建副本',()=>context.files.copy(actor,item.id)));
          if(item.type!=='shortcut'&&item.type!=='folder'&&context.files.can('create-shortcut',item.spaceId,actor))items.push(menuButton('创建快捷方式',()=>setDialog({type:'create-shortcut',id:item.id,targetSpaceId:context.files.writableSpaces(actor,item.spaceId)[0]?.id,targetParentId:0})));
          if(item.type!=='folder'&&context.files.can('edit-tags',item.spaceId,actor))items.push(menuButton('编辑标签',()=>setDialog({type:'tags',id:item.id})));
          if(context.files.can('trash',item.spaceId,actor))items.push(menuButton('移至回收站',()=>setDialog({type:'trash',id:item.id}),true));
        }
        return h(deps.forms.FileRowActions,{name:item.name,pinned:item.pinned,showPin:!trashMode,onPin:()=>togglePin(item),items});
      };

      const renderDetails=()=>selected?h(deps.forms.FileDetail,{
        resource:selected,files:context.files,actor,fileType:fileType(selected),location:selected.deletedAt?originalLocation(selected):locationLabel(selected),
        source:sourceLabel(selected),createdAt:time(selected.createdAt),size:bytes(selected.size),markClass:markClass(selected),
        markIcon:({file:'file-text',sheet:'file-spreadsheet',link:'link-2'})[fileIcon(selected)]||fileIcon(selected),allowPreview:true,
        onClose:()=>setSelectedId(null),onRelation:openRelationSource,onAction:name=>{
          if(name==='copy-link')return copyLink(selected);
          if(name==='copy-external-link')return copyExternalLink(selected);
          if(name==='open-external')return openExternal(selected);
          if(name==='preview')return openPreview(selected);
          if(name==='download')return download(selected);
          if(name==='toggle-pin')return togglePin(selected);
          if(name==='restore')return restoreItem(selected);
          if(name==='copy')return context.files.copy(actor,selected.id);
          setDialog({type:name==='delete-forever'?'delete':name,id:selected.id,value:selected.name,parentId:selected.parent_id||0});
        }
      }):null;

      const renderRows=()=>{
        if(!shown.length)return h('div',{className:'eva-project-files__empty'},query.trim()?'没有匹配的文件':trashMode?'回收站为空':'当前目录暂无文件');
        return h('div',{className:'eva-drive__table eva-drive__table--with-source eva-project-files__table'+(trashMode?' eva-drive__table--trash':''),role:'table','aria-label':trashMode?'项目回收站':'团队文件列表'},
          h('div',{className:'eva-drive__table-head',role:'row'},
            h('span',null,'名称'),h('span',null,'文件类型'),h('span',null,trashMode?'原位置':'关联内容'),h('span',null,'大小'),h('span',null,trashMode?'删除信息':'创建信息'),h('span',null,'操作')),
          shown.map(item=>h('div',{className:'eva-drive__row'+(item.pinned?' is-pinned':''),role:'row',tabIndex:0,key:item.id,'data-project-resource-id':item.id,'data-file-pinned':item.pinned?'true':'false','aria-selected':item.id===selectedId?'true':'false',onClick:event=>{
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
        h('div',{className:'eva-project-files__toolbar'},
          !trashMode?h(R.Fragment,null,
            h(deps.forms.FileToolbar,{onAction:name=>name==='upload'?uploadInput.current?.click():setDialog({type:name,value:'',name:'',url:''})}),
            h('input',{ref:uploadInput,id:'eva-project-files-upload',name:'projectFiles',type:'file',multiple:true,hidden:true,onChange:event=>{Array.from(event.target.files||[]).forEach(file=>context.files.upload(actor,projectId,file,parentId));event.target.value='';}})
          ):null,
          trashMode?h(deps.forms.FileButton,{label:'返回团队文件',className:'eva-project-files__trash-toggle',onClick:()=>{setTrashMode(false);setSelectedId(null);}}):canViewTrash?h(deps.forms.FileButton,{iconName:'trash-2',className:'eva-project-files__trash-toggle','aria-label':'回收站',title:'回收站',onClick:()=>{setTrashMode(true);setParentId(0);setCrumbs([]);setSelectedId(null);}}):null,
          h('label',{className:'eva-drive__side-search'},icon('search'),h('input',{id:'eva-project-files-search',name:'projectFileSearch',type:'search',value:query,onChange:event=>setQuery(event.target.value),placeholder:'搜索当前项目'}))
        ),
        !trashMode&&crumbs.length?h(deps.forms.FilePath,{crumbs:[{id:0,name:'团队文件'},...crumbs],onBack:navigateUp,onCrumb:navigateCrumb}):null,
        h('div',{className:'eva-project-files__content'},renderRows()),
        renderDetails(),
        renderDialog(),
        preview?h('aside',{className:'eva-file-preview-sidebar eva-project-file-preview-sidebar','aria-label':'文件预览'},h('div',{className:'eva-file-preview-resizer',role:'separator',tabIndex:0,'aria-label':'调整文件预览宽度','aria-orientation':'vertical','aria-valuemin':280,'aria-valuemax':664,'aria-valuenow':480,'data-eva-file-preview-resizer':true}),h('div',{className:'eva-project-file-preview'},preview.sharedVersion?h('p',{className:'eva-members-notice'},'项目副本 · 来源：',sourceLabel(preview),'。访问此文件不会获得来源群的聊天权限。'):null,h(deps.FilePreviewHost,{file:preview,onClose:()=>setPreview(null)}))):null,
        notice?h('div',{className:'eva-project-files__notice',role:'status','aria-live':'polite'},notice):null
      );
    };
  }

  root.EvaProjectFilesUI=Object.freeze({
    render(props,deps){Component||=create(deps);return deps.React.createElement(Component,props);}
  });
})(window);
