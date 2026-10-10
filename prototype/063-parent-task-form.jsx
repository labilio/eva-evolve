import React from 'react';
import {useSubmission,SubmissionError} from './063-forms.jsx';
import {EvaFormSelect} from './063-select.jsx';
import {FloatingForm} from './063-popover.jsx';

export function ParentTaskForm({issue,options,onSave,onClose}) {
 const submission=useSubmission({onSubmit:async(data,{isCurrent})=>{
  await onSave({parent_issue_id:data.parent??null});
  if(isCurrent())onClose();
 }});
 return (
  <FloatingForm onCancel={onClose} busy={submission.busy} {...submission.formProps} initValues={{parent:issue.parent_issue_id??null}}>
   <EvaFormSelect field="parent" label="父任务" autoFocus showClear filter style={{width:'100%'}}
    placeholder="搜索任务标识或标题" optionList={options}
    emptyContent="当前项目暂无其他任务可作为父任务"/>
   <SubmissionError submission={submission}/>
  </FloatingForm>
 );
}
