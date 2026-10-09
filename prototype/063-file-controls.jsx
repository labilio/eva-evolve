import React from 'react';
import Button from '@douyinfe/semi-ui/lib/es/button';
import Dropdown from '@douyinfe/semi-ui/lib/es/dropdown';
import Breadcrumb from '@douyinfe/semi-ui/lib/es/breadcrumb';
import {SubmissionError} from './063-forms.jsx';
import Tag from '@douyinfe/semi-ui/lib/es/tag';
import {Dialog,Actions} from './063-dialog.jsx';
import {dialogText} from './063-dialog-theme.js';

export {EvaLucideIcon as FileIcon} from './063-lucide-icon.jsx';
import {EvaLucideIcon as FileIcon} from './063-lucide-icon.jsx';
export function FileButton({iconName,label,...props}) {
 return <Button type="tertiary" theme="borderless" {...props} icon={iconName?<FileIcon name={iconName}/>:undefined}>{label}</Button>;
}
export function FilePath({crumbs,onBack,onCrumb}) {
 return <div className="eva-drive__pathbar"><Button type="tertiary" theme="light" icon={<FileIcon name="chevron-left"/>} onClick={onBack}>返回上一级</Button><Breadcrumb aria-label="文件路径" autoCollapse={false}>{crumbs.map((crumb,index)=><Breadcrumb.Item key={crumb.id} onClick={()=>index<crumbs.length-1&&onCrumb(index)}>{crumb.name}</Breadcrumb.Item>)}</Breadcrumb></div>;
}
export function FilePreviewActions({fullscreen,onAction}) {
 return <span className="eva-file-preview-sidebar__actions"><FileButton iconName={fullscreen?'minimize-2':'maximize-2'} aria-label={fullscreen?'退出全屏预览':'全屏预览'} aria-pressed={fullscreen} data-drive-action="preview-fullscreen" onClick={event=>{event.stopPropagation();onAction('preview-fullscreen');}}/><FileButton iconName="x" aria-label="关闭预览" onClick={()=>onAction('preview-close')}/></span>;
}
export function FileToolbar({onAction}) {
 return <div className="eva-file-controls-toolbar">
  <Button type="tertiary" theme="light" onClick={()=>onAction('new-folder')}>新建文件夹</Button>
  <Dropdown motion={false} trigger="click" position="bottomLeft" render={<Dropdown.Menu>
   <Dropdown.Item icon={<FileIcon name="link-2"/>} onClick={()=>onAction('external-link')}>外部链接</Dropdown.Item>
   <Dropdown.Item icon={<FileIcon name="folder"/>} onClick={()=>onAction('external-folder')}>外部文件夹</Dropdown.Item>
  </Dropdown.Menu>}><Button type="tertiary" theme="light" icon={<FileIcon name="chevron-down"/>} iconPosition="right">添加外部资源</Button></Dropdown>
  <Button type="primary" theme="solid" onClick={()=>onAction('upload')}>上传本地文件</Button>
 </div>;
}
export function FileRowActions({name,pinned,showPin=true,onPin,items}) {
 return <span className="eva-file-controls-row">
  {showPin&&<Button className={'eva-drive__pin-button'+(pinned?' is-pinned':'')} type={pinned?'primary':'tertiary'} theme="borderless" icon={<FileIcon name="pin"/>} aria-label={(pinned?'取消置顶：':'置顶：')+name} aria-pressed={!!pinned} onClick={event=>{event.stopPropagation();onPin();}}/>}
  <Dropdown motion={false} trigger="click" position="bottomRight" render={<Dropdown.Menu>{items.map(item=><Dropdown.Item key={item.label} type={item.danger?'danger':undefined} onClick={event=>{event.stopPropagation();item.onClick();}}>{item.label}</Dropdown.Item>)}</Dropdown.Menu>}>
   <Button type="tertiary" theme="borderless" icon={<FileIcon name="ellipsis"/>} aria-label={'更多操作：'+name} onClick={event=>event.stopPropagation()}/>
  </Dropdown>
 </span>;
}
export function FileConfirmation({resource,type,onClose,onConfirm,error}) {
 const title=type==='trash'?'移至回收站':'永久删除';
 return <Dialog visible title={title} size="compact" initialFocus="cancel" onCancel={onClose} footer={<Actions onCancel={onClose} onSubmit={onConfirm} submitLabel={title} danger/>}>
  <p>{type==='trash'?'将“':'永久删除“'}{resource.name}”{resource.type==='folder'?'及其中内容':''}{type==='trash'?'移至回收站？项目负责人或管理员可从回收站恢复。':'后不可恢复。'}</p>
  <SubmissionError error={error}/>
 </Dialog>;
}
const Meta=({items})=><dl className="eva-drive__meta">{items.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'—'}</dd></div>)}</dl>;
const Section=({title,action,children})=><section className="eva-file-detail__section"><div className="eva-file-detail__section-head"><h3 style={dialogText.section}>{title}</h3>{action}</div>{children}</section>;
export function FileDetail({resource,files,actor,fileType,location,source,createdAt,size,markClass,markIcon,onAction,onClose,onRelation,locationAction,allowPreview=false}) {
 const deleted=!!resource.deletedAt,can=action=>files.can(action,resource.spaceId,actor);
 const shortcut=files.shortcutInfo(resource,actor),canOpen=!shortcut||shortcut.status==='available';
 const external=canOpen?files.externalLinkInfo(resource,actor):null;
 const relations=files.relationsFor(resource,actor);
 const action=(label,name,danger=false)=><Button key={name} type={danger?'danger':'tertiary'} theme="light" onClick={()=>onAction(name)}>{label}</Button>;
 return <Dialog visible title={external?(external.kind==='folder'?'外部文件夹详情':'外部链接详情'):'文件详情'} size="fileDetail" initialFocus="title" onCancel={onClose} footer={null} className="eva-file-detail">
  <div className="eva-file-detail-dialog__content">
   <div className="eva-file-detail__identity eva-file-detail__identity--with-action"><span className={'eva-drive__file-mark '+markClass}><FileIcon name={markIcon} size="large"/>{(resource.type==='shortcut'||external?.kind==='folder')&&<span className={resource.type==='shortcut'?'eva-drive__shortcut-badge':'eva-drive__file-external-badge'}><FileIcon name="external-link" size="small"/></span>}</span><span className="eva-file-detail__identity-content"><strong style={dialogText.section}>{resource.name}</strong><small>{fileType}{resource.type==='folder'?(deleted&&resource.trashedItemCount?' · 包含 '+resource.trashedItemCount+' 项':''):external?' · '+external.host:' · '+size}</small></span>{!deleted&&<Button type="tertiary" theme="borderless" icon={<FileIcon name="link-2"/>} aria-label="复制内部链接" onClick={()=>onAction('copy-link')}/>}</div>
   {!deleted&&<div className="eva-file-controls-actions">
    {locationAction&&action(locationAction.label,locationAction.name)}
    {external?action(external.kind==='folder'?'打开原文件夹':'打开原链接','open-external'):allowPreview&&resource.type!=='folder'&&canOpen&&action('预览','preview')}
    {external?action(external.kind==='folder'?'复制文件夹链接':'复制外部链接','copy-external-link'):resource.type!=='folder'&&canOpen&&can('download')&&action('下载','download')}
    </div>}
   {!deleted&&<div className="eva-file-controls-management">
    {action(resource.pinned?'取消置顶':'置顶','toggle-pin')}
    {can('rename')&&action('重命名','rename')}
    {resource.type==='external_link'&&can('edit-external-link')&&action(external?.kind==='folder'?'编辑外部文件夹':'编辑链接','edit-external-link')}
    {can('move')&&action('移动','move')}
    {resource.type!=='shortcut'&&!external&&can('copy')&&action('创建副本','copy')}
    {resource.type!=='shortcut'&&resource.type!=='folder'&&can('create-shortcut')&&action('创建快捷方式','create-shortcut')}
    {can('trash')&&action('移至回收站','trash',true)}
   </div>}
   {deleted&&<div className="eva-file-controls-management">{can('restore')&&action('恢复','restore')}{can('delete-forever')&&action('永久删除','delete-forever',true)}</div>}
   {resource.type!=='folder'&&<>
    <Section title="标签" action={!deleted&&can('edit-tags')&&<Button theme="borderless" onClick={()=>onAction('tags')}>编辑</Button>}><div className="eva-file-controls-tags">{resource.tags?.length?resource.tags.map(tag=><Tag key={tag}>{tag}</Tag>):<span className="eva-file-muted">暂无标签</span>}</div></Section>
    <Section title="系统关联" action={<Tag>只读</Tag>}>{relations.length?<div className="eva-file-relations">{relations.map((relation,index)=><div className="eva-file-relation" key={index}><span className="eva-file-relation__icon"><FileIcon name={relation.type==='task'?'list-checks':relation.type==='file'?'file-text':'users'}/></span><span><small>{{task:'任务',group:'群聊',chat:'私聊','ai-conversation':'AI 小队会话',file:'来源文件'}[relation.type]||'关联内容'}</small><strong>{relation.label}</strong>{relation.meta&&<em>{relation.meta}</em>}</span>{relation.navigable&&!relation.restricted&&['ai-conversation','chat','group'].includes(relation.type)&&<Button theme="borderless" onClick={()=>onRelation(relation)}>查看来源</Button>}</div>)}</div>:<p className="eva-file-detail__empty">当前文件没有系统关联</p>}</Section>
   </>}
   {shortcut&&<Section title="快捷方式信息"><Meta items={[["访问状态",shortcut.statusLabel],...(shortcut.status==='available'?[["源文件",shortcut.sourceName],["来源文件库",shortcut.sourceSpaceName]]:[["权限说明","快捷方式不会授予源文件权限"]])]}/></Section>}
   {external&&<Section title={external.kind==='folder'?'外部文件夹':'外部链接'}><Meta items={[["来源平台",external.providerLabel],["资源类型",external.kindLabel],["链接域名",external.host],["内容与版本","由原平台维护"]]}/></Section>}
   <Section title="文件信息"><Meta items={[["文件类型",fileType],["所在位置",location],["产生方式",source],["创建者",resource.creator],["创建时间",createdAt],["大小",resource.type==='folder'||external?'—':size]]}/></Section>
  </div>
 </Dialog>;
}
