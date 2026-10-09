import fs from 'node:fs';
import vm from 'node:vm';
import * as dialogTheme from '../../prototype/063-dialog-theme.js';
import {transformSync} from 'esbuild';

// Execute the production component and save callback; only React's rendering
// and native Form's store are stubbed. Real field validation is covered in Edge.
export function fileFormHarness(props) {
  const states=[], values={}, formState={errors:{}}; let cursor=0, submission, tree;
  const element=(type,props,...children)=>({type,props:props||{},children:children.flat(Infinity).filter(x=>x!==false&&x!=null)});
  const React={createElement:element,memo:fn=>fn,useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useEffect(){},useId:()=> 'test',useRef:value=>({current:value})};
  const api={setValue:(key,value)=>values[key]=value,setError:(key,value)=>formState.errors[key]=value};
  const FormComponent=()=>{};
  Object.assign(FormComponent,{Input:'Input',Select:'Select',ErrorMessage:'ErrorMessage',useForm:()=>[api,formState,values]});
  const module={exports:{}};
  const compiled=transformSync(fs.readFileSync(new URL('../../prototype/063-file-form.jsx',import.meta.url),'utf8'),{loader:'jsx',format:'cjs'}).code;
  vm.runInNewContext(compiled,{module,require:id=>id==='react'?React:id.endsWith('063-dialog-theme.js')?dialogTheme:id.includes('button')?{default:'Button',__esModule:true}:{Form:FormComponent,withField:fn=>fn,useSubmission:options=>(submission=options,{formProps:{id:'form'},busy:false}),SubmissionError:'SubmissionError'}});
  const render=()=>{cursor=0;tree=module.exports.default(props);return tree;};
  const nodes=(node=tree)=>node&&typeof node==='object'?[node,...(node.children||[]).flatMap(nodes)]:[];
  render();Object.assign(values,nodes().find(n=>n.type===FormComponent).props.initValues);render();
  return {render,nodes,values,change(field,value){values[field]=value;nodes().find(n=>n.props.field===field)?.props.onChange?.(value);render();},submit(data=values){return submission.onSubmit(data);}};
}
