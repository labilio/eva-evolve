import React from 'react';
import {Actions} from './063-dialog.jsx';
import {Form, useSubmission, SubmissionError} from './063-forms.jsx';

// Rendered by a portal from the existing personal route, inside its native rail.
export default function PersonalRailForm({request}) {
  const {moving, detail, folders, onSave, onClose} = request;
  const submission = useSubmission({onSubmit: onSave});
  return <Form {...submission.formProps} className="eva-personal-rail-form"
    initValues={{name: moving ? detail.title : detail.name, folder: detail.folderId || ''}}>
    <label className="eva-t-caption" htmlFor="eva-rail-name">{moving ? '对话名称' : '重命名文件夹'}</label>
    <Form.Input field="name" id="eva-rail-name" noLabel autoFocus autoComplete="off"
      maxLength={moving ? 120 : 60}
      rules={[{required: true, whitespace: true, message: moving ? '请输入对话名称' : '请输入文件夹名称'},
        ...(!moving ? [{validator: (_, value) => {
          const name = String(value || '').trim();
          return name !== '最近' && !window.EvaPersonal.getSnapshot().folders.some(folder => folder.id !== detail.id && folder.name === name);
        }, message: '已有同名文件夹'}] : [])]}/>
    {moving && <>
      <label className="eva-t-caption" id="eva-rail-folder-label">移至文件夹</label>
      <Form.Select field="folder" id="eva-rail-folder" noLabel style={{width: '100%'}}
        optionList={[{value: '', label: '最近'}, ...folders.map(folder => ({value: folder.id, label: folder.name}))]}/>
    </>}
    <SubmissionError submission={submission}/>
    <div className="eva-personal-rail-form__actions"><Actions onCancel={onClose} form={submission.formProps.id} busy={submission.busy}/></div>
  </Form>;
}
