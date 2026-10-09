import React, {useEffect} from 'react';
import {Form, useSubmission, SubmissionError} from './063-forms.jsx';

export default function PersonalFolderForm({onReady, onCreate}) {
  const submission = useSubmission({onSubmit: values => onCreate(values.name)});
  useEffect(() => { onReady({submitForm: submission.submit}); }, [submission.submit]);
  return <Form {...submission.formProps} className="eva-personal-folder-form" initValues={{name: ''}}>
    <Form.Input
      field="name"
      id="eva-personal-folder-name"
      label={{text: '分组名称', required: false}}
      autoFocus
      maxLength={60}
      rules={[
        {required: true, whitespace: true, message: '请输入分组名称'},
        {validator: (_, value) => {
          const name = String(value || '').trim();
          return name !== '最近' && !window.EvaPersonal.getSnapshot().folders.some(folder => folder.name === name);
        }, message: '已有同名文件夹'},
      ]}
    />
    <SubmissionError submission={submission}/>
  </Form>;
}
