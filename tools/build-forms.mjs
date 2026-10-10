import {checkThemeImports} from './check-ui-theme.mjs';
checkThemeImports();
import {popconfirmTheme,typography,floatingSurface,infoListTheme} from '../prototype/063-ui-theme.js';
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import {buildDialogTheme,buildFormLabelTheme,buildComponentTheme,buildFloatingFormTheme,buildCardTheme} from './build-dialog-theme.mjs';

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

// Semi Popconfirm exposes weight but not title font size/line height as component
// Sass tokens. Generate these two typography roles here, never in business CSS.
fs.appendFileSync(path.join(output,'../prototype/063-dialog.css'),buildDialogTheme()+buildFormLabelTheme()+buildFloatingFormTheme()+buildComponentTheme('popconfirm',popconfirmTheme,':where(.semi-portal-inner:has(.eva-popconfirm))')+`\n.eva-popconfirm {font-family:var(--eva-font-sans);font-size:${typography.body.fontSize}px;line-height:${typography.body.lineHeight};}\n.eva-popconfirm .semi-popconfirm-header-title {font-size:${typography.body.fontSize}px;line-height:${typography.body.lineHeight};}\n.eva-popconfirm-single .semi-popconfirm-header-title {margin-bottom:0;font-weight:${typography.body.fontWeight};}\n.eva-popconfirm .semi-popconfirm-header-icon {height:22px;display:flex;align-items:center;flex-shrink:0;}\n`);

// Semi Popconfirm sends style to its inner card, not its Popover shell. The
// public adapter styles the shell once, avoiding two nested shadows/surfaces.
const surfaceCSS=Object.entries(floatingSurface).map(([key,value])=>`${key.startsWith('--')?key:key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())}:${typeof value==='number'&&key==='fontSize'?value+'px':value}`).join(';');
fs.appendFileSync(path.join(output,'../prototype/063-dialog.css'),`
.semi-popover-wrapper:has(.eva-popconfirm) {${surfaceCSS}}
.eva-popover.semi-popover-with-arrow,
.semi-popover-with-arrow:has(.eva-popconfirm) {padding:0;}
.eva-popconfirm .semi-popconfirm-header-body {min-width:0;}
.eva-popconfirm .semi-popconfirm-header-title,
.eva-popconfirm .semi-popconfirm-body,
.eva-popover {overflow-wrap:anywhere;}
`);

// Scope native Card parameters without changing unadapted cards.
fs.appendFileSync(path.join(output,'../prototype/063-dialog.css'),buildCardTheme());

fs.appendFileSync(path.join(output,'../prototype/063-dialog.css'),buildComponentTheme('list',infoListTheme,'.eva-info-list'));
