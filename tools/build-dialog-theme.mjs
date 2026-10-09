import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import * as sass from 'sass';
import postcss from 'postcss';
import {modalTheme,dialogText} from '../prototype/063-dialog-theme.js';

// Compile the locked Semi source twice and retain only configured differences.
// This avoids hand-copying Semi's anatomy, and leaves Eva's existing colors,
// radii, shadows, animation and all other components untouched.
export function buildDialogTheme(root=process.cwd()) {
 const foundation=path.join(root,'node_modules/@douyinfe/semi-foundation/modal');
 const source=fs.readFileSync(path.join(foundation,'modal.scss'),'utf8');
 const variables=fs.readFileSync(path.join(foundation,'variables.scss'),'utf8');
 for(const key of Object.keys(modalTheme))if(!variables.includes('$'+key+':'))throw Error('Unknown Semi Modal token: '+key);
 const base='@import "'+path.join(root,'node_modules/@douyinfe/semi-theme-default/scss/index.scss')+'";\n';
 const compile=values=>postcss.parse(sass.compileString(base+source.replace('@import "./variables.scss";','@import "./variables.scss";\n'+values),{
  url:pathToFileURL(path.join(foundation,'eva-theme.scss')),style:'expanded',logger:{warn(){}},
 }).css);
 const defaults=[];compile('').walkRules(rule=>defaults.push(rule));
 let index=0;
 const output=postcss.root();
 compile(Object.entries(modalTheme).map(([k,v])=>'$'+k+': '+v+';').join('\n')).walkRules(rule=>{
  const previous=defaults[index++];
  if(previous.selector!==rule.selector)throw Error('Semi theme changed rule order');
  if(rule.parent.type!=='root')return;
  const old=new Map(previous.nodes.filter(n=>n.type==='decl').map(n=>[n.prop,n.value]));
  const changed=rule.nodes.filter(n=>n.type==='decl'&&old.get(n.prop)!==n.value);if(!changed.length)return;
  const copy=postcss.rule({selector:rule.selectors.map(s=>'.eva-dialog:not(.eva-dialog--compose):not(.eva-dialog--editor) '+s).join(',')});
  changed.forEach(n=>copy.append(n.clone()));output.append(copy);
 });
 return '/* Generated from official Semi Modal Sass tokens; edit 063-dialog-theme.js. */\n'+output.toString()+'\n';
}

// Semi exposes per-field label.style, but no Form-wide label style default.
// Scope the shared typography parameters to migrated Eva forms; leave native
// error messages, optional hints and non-form labels untouched.
export function buildFormLabelTheme() {
 const {fontSize,fontWeight,lineHeight}=dialogText.fieldLabel;
 const rule=postcss.rule({selector:'.semi-form[id^="eva-form-"] .semi-form-field-label'});
 for(const [prop,value] of Object.entries({'font-size':fontSize+'px','font-weight':String(fontWeight),'line-height':lineHeight}))rule.append({prop,value});
 return '\n/* Generated from shared fieldLabel typography parameters. */\n'+rule.toString()+'\n';
}
