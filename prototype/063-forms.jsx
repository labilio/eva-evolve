import React, {useCallback, useEffect, useId, useRef, useState} from 'react';
import {Form, withField, useFormState, useFormApi} from '@douyinfe/semi-ui/lib/es/form';
import semiGlobal from '@douyinfe/semi-ui/lib/es/_utils/semi-global';
import {createSubmissionGate, createValidationQueue, formDefaults} from './063-form-policy.js';

// This is the only Semi instance used by migrated forms. Set defaults before
// rendering; never install a form-level validator (it suppresses field rules).
// Semi Select commits a controlled selection after its popup exit animation.
// Forms must expose that value before an immediately following save click.
semiGlobal.config.overrideDefaultProps = {Form: formDefaults, Select: {motion: false}};
export {Form, withField, useFormState, useFormApi};
export {requiredLabelPolicy} from './063-form-policy.js';

export function useSubmission({onSubmit, resetKey, active = true}) {
  const id = 'eva-form-' + useId();
  const api = useRef(null);
  const attempted = useRef(false);
  const mounted = useRef(false);
  const gate = useRef(null);
  if (!gate.current) gate.current = createSubmissionGate();
  const validation = useRef(null);
  const epoch = useRef(0);
  if (!validation.current) validation.current = createValidationQueue(fields => api.current.validate(fields));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const handler = useRef(onSubmit);
  handler.current = onSubmit;
  useEffect(() => {
    mounted.current = active;
    attempted.current = false;
    gate.current.reset();
    validation.current.reset();
    epoch.current++;
    setBusy(false);
    setError('');
    return () => { mounted.current = false; epoch.current++; gate.current.reset(); validation.current.reset(); };
  }, [resetKey, active]);
  const focusError = useCallback(() => {
    const current = epoch.current;
    requestAnimationFrame(() => {
      if (!mounted.current || current !== epoch.current) return;
      const root = document.getElementById(id);
      const invalid = root?.querySelector('[aria-invalid="true"]');
      const target = invalid?.matches('input,textarea,select,button,[tabindex]') ? invalid :
        invalid?.querySelector('input,textarea,select,button,[tabindex]');
      target?.focus();
    });
  }, [id]);
  const submit = useCallback(async () => {
    if (!mounted.current || !api.current) return;
    const token = gate.current.begin();
    if (token === null) return;
    attempted.current = true;
    setError('');
    let values;
    try {
      values = await validation.current.validate();
    } catch {
      if (mounted.current && gate.current.current(token)) {
        gate.current.finish(token);
        focusError();
      }
      return;
    }
    if (!mounted.current || !gate.current.current(token)) return;
    setBusy(true);
    try {
      await handler.current(values, {isCurrent: () => mounted.current && gate.current.current(token)});
    } catch (reason) {
      if (!mounted.current || !gate.current.current(token)) return;
      if (reason?.fieldErrors) {
        for (const [field, message] of Object.entries(reason.fieldErrors)) api.current?.setError(field, message);
        focusError();
      } else setError(reason?.message || '保存失败，请重试');
    } finally {
      if (mounted.current && gate.current.current(token)) {
        gate.current.finish(token);
        setBusy(false);
      }
    }
  }, [focusError]);
  const change = useCallback(() => {
    setError('');
    validation.current.changed();
    if (attempted.current && mounted.current) validation.current.validate().catch(() => {});
  }, []);
  const validate = useCallback(async fields => {
    attempted.current = true;
    const current = epoch.current;
    try { return await validation.current.validate(fields); }
    catch (reason) { if (current === epoch.current) focusError(); throw reason; }
  }, [focusError]);
  return {
    api, busy, error, submit, validate,
    formProps: {
      id, noValidate: true,
      getFormApi: value => { api.current = value; },
      onValueChange: change,
      // Local form submission only: one guarded path for both Enter and footer buttons.
      // Semi still performs all validation; the gate also covers async validation.
      onSubmitCapture: event => {
        // A picker may portal a separate creation form below this React tree.
        // Only handle submission from this form, not the portaled child form.
        if (event.target !== event.currentTarget) return;
        event.preventDefault(); event.stopPropagation(); submit();
      },
      onKeyDown: event => {
        if (event.key === 'Enter' && event.nativeEvent?.isComposing) event.preventDefault();
      },
    },
  };
}

export function SubmissionError({submission, error = submission?.error}) {
  return error ? <div role="alert"><Form.ErrorMessage error={error} showValidateIcon={false} /></div> : null;
}
