import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium} from 'playwright';

test('真实 Semi 异步校验：改值和重复提交不挂起、不保存旧值，重开隔离迟到结果', async () => {
  const output = await build({
    stdin: {resolveDir:new URL('../..',import.meta.url).pathname,loader:'jsx',contents:`
      import React from 'react';
      import {createRoot} from 'react-dom/client';
      import {Form,useSubmission,SubmissionError} from './prototype/063-forms.jsx';
      window.checks=[]; window.saves=[];
      function Editor(){
        const submission=useSubmission({onSubmit:values=>window.saves.push(values.name)});
        return <Form {...submission.formProps}>
          <Form.Input field="name" label="名称" rules={[{validator:(_,value)=>new Promise((resolve,reject)=>window.checks.push({value,resolve,reject}))}]}/>
          <button type="submit">保存</button><SubmissionError submission={submission}/>
        </Form>;
      }
      function App(){const [version,setVersion]=React.useState(0);return <><button onClick={()=>setVersion(v=>v+1)}>重开</button><Editor key={version}/></>}
      createRoot(document.getElementById('root')).render(<App/>);
    `},bundle:true,write:false,format:'iife',platform:'browser',loader:{'.css':'empty'},define:{'process.env.NODE_ENV':'"production"'},
  });
  const server=createServer((req,res)=>{
    res.setHeader('Content-Type',req.url==='/test.js'?'application/javascript':'text/html');
    res.end(req.url==='/test.js'?output.outputFiles[0].text:'<div id="root"></div><script src="/test.js"></script>');
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({channel:'msedge'}),page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const name=page.getByRole('textbox'),save=page.getByRole('button',{name:'保存',exact:true});
    await name.fill('旧值');await save.click();
    await page.waitForFunction(()=>window.checks.length===1);
    await name.fill('中间值');await name.fill('新值');await save.click();
    assert.equal(await page.evaluate(()=>window.checks.length),1);
    await page.evaluate(()=>window.checks[0].reject(new Error('旧值不可用')));
    await page.waitForFunction(()=>window.checks.length===2);
    assert.equal(await page.evaluate(()=>window.checks[1].value),'新值');
    await page.evaluate(()=>window.checks[1].resolve());
    await page.waitForFunction(()=>window.saves.length===1);
    assert.deepEqual(await page.evaluate(()=>window.saves),['新值']);
    await name.fill('即将关闭');await save.click();
    await page.waitForFunction(()=>window.checks.length===3);
    await page.getByRole('button',{name:'重开',exact:true}).click();
    await name.fill('新窗口');await save.click();
    await page.waitForFunction(()=>window.checks.length===4);
    await page.evaluate(()=>{window.checks[2].resolve();window.checks[3].resolve();});
    await page.waitForFunction(()=>window.saves.length===2);
    assert.deepEqual(await page.evaluate(()=>window.saves),['新值','新窗口']);
    assert.deepEqual(errors,[]);
  } finally {await browser.close();await new Promise(r=>server.close(r));}
});
