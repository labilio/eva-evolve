import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import {buildDialogTheme} from './build-dialog-theme.mjs';

// Compile the official Semi Form; React/ReactDOM are supplied by Eva's existing
// runtime. Never bundle a second renderer or run a compiler in the browser.
const output = process.argv[2];
if (!output) throw new Error('Missing output directory');
const result = await build({
  entryPoints: ['prototype/063-forms-entry.jsx'],
  bundle: true, write: false, format: 'iife', globalName: 'evaFormsModule',
  minify: true, platform: 'browser', target: 'es2020', metafile: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  // eva-legacy.css already supplies Semi Form/Input styles; do not load a second theme.
  loader: { '.css': 'empty' },
  plugins: [{name:'eva-existing-react',setup(builder){
    builder.onResolve({filter:/^react(-dom)?$/},args=>({path:args.path,namespace:'eva-react'}));
    builder.onLoad({filter:/.*/,namespace:'eva-react'},args=>({contents:`module.exports = ${args.path==='react'?'React':'ReactDOM'};`,loader:'js'}));
  }}],
});
if (Object.keys(result.metafile.inputs).some(file => /node_modules\/react(?:-dom)?\//.test(file))) {
  throw new Error('Forms must reuse Eva React/ReactDOM, not bundle another instance');
}
fs.writeFileSync(path.join(output,'eva-forms.module.js'),
  `// Official Semi Form, sharing Eva's React instance. Built from the locked npm dependency.\nlet instance;\nexport function createForms(React, ReactDOM) {\nif (instance) return instance;\n${result.outputFiles[0].text}\nreturn instance = evaFormsModule;\n}\n`);

fs.appendFileSync(path.join(output,'../prototype/063-dialog.css'),buildDialogTheme());
