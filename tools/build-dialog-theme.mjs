import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import * as sass from 'sass';
import postcss from 'postcss';
import {floatingFormTheme,cardTheme,popconfirmTheme} from '../prototype/063-ui-theme.js';
import {modalTheme,dialogText} from '../prototype/063-dialog-theme.js';

// Compile the locked Semi source twice and retain only configured differences.
// This avoids hand-copying Semi's anatomy, and leaves Eva's existing colors,
// radii, shadows, animation and all other components untouched.
export function buildComponentTheme(component, theme, scope, root=process.cwd()) {
 const foundation=path.join(root,'node_modules/@douyinfe/semi-foundation/'+component);
 const source=fs.readFileSync(path.join(foundation,component+'.scss'),'utf8');
 const variables=fs.readFileSync(path.join(foundation,'variables.scss'),'utf8');
 for(const key of Object.keys(theme))if(!variables.includes('$'+key+':'))throw Error('Unknown Semi '+component+' token: '+key);
 const base='@import "'+path.join(root,'node_modules/@douyinfe/semi-theme-default/scss/index.scss')+'";\n';
 const compile=values=>postcss.parse(sass.compileString(base+source.replace(/@import ['"]\.\/variables\.scss['"];/,'@import "./variables.scss";\n'+values),{
  url:pathToFileURL(path.join(foundation,'eva-theme.scss')),style:'expanded',logger:{warn(){}},
 }).css);
 const defaults=[];compile('').walkRules(rule=>defaults.push(rule));
 let index=0;
 const output=postcss.root();
 compile(Object.entries(theme).map(([k,v])=>'$'+k+': '+v+';').join('\n')).walkRules(rule=>{
  const previous=defaults[index++];
  if(previous.selector!==rule.selector)throw Error('Semi theme changed rule order');
  if(rule.parent.type!=='root')return;
  const old=new Map(previous.nodes.filter(n=>n.type==='decl').map(n=>[n.prop,n.value]));
  const changed=rule.nodes.filter(n=>n.type==='decl'&&old.get(n.prop)!==n.value);if(!changed.length)return;
  const copy=postcss.rule({selector:rule.selectors.map(s=>scope ? scope+' '+s : s).join(',')});
  changed.forEach(n=>copy.append(n.clone()));output.append(copy);
 });
 return '/* Generated from official Semi '+component+' Sass tokens. */\n'+output.toString()+'\n';
}

// Semi exposes per-field label.style, but no Form-wide label style default.
// Scope the shared typography parameters to migrated Eva forms; leave native
// error messages, optional hints and non-form labels untouched.
export function buildFormLabelTheme() {
 const {fontSize,fontWeight,lineHeight}=dialogText.fieldLabel;
 const rule=postcss.rule({selector:'.semi-form[id^="eva-form-"]:not(.eva-floating-form) .semi-form-field-label'});
 for(const [prop,value] of Object.entries({'font-size':fontSize+'px','font-weight':String(fontWeight),'line-height':lineHeight}))rule.append({prop,value});
 return '\n/* Generated from shared fieldLabel typography parameters. */\n'+rule.toString()+'\n';
}

export function buildDialogTheme(root=process.cwd()) {
 return buildComponentTheme('modal',modalTheme,'.eva-dialog:not(.eva-dialog--compose):not(.eva-dialog--editor)',root);
}

// Native Form selectors sometimes start at the Form itself. Scope that root,
// rather than depending on a Popover ancestor or adding another CSS override.
export function buildFloatingFormTheme() {
 const css=postcss.parse(buildComponentTheme('form',floatingFormTheme,''));
 css.walkRules(rule=>{rule.selectors=rule.selectors.map(selector=>selector.includes('.semi-form-vertical')?selector.replace('.semi-form-vertical','.eva-floating-form.semi-form-vertical'):'.eva-floating-form '+selector);});
 return css.toString();
}

export function buildCardTheme() {
 const css=postcss.parse(buildComponentTheme('card',cardTheme,''));
 css.walkRules(rule=>{rule.selectors=rule.selectors.map(selector=>/\.semi-card(?=[^\w-]|$)/.test(selector)?selector.replace(/\.semi-card(?=[^\w-]|$)/,'.eva-card.semi-card'):selector.replace(/\.semi-card-/,'.eva-card .semi-card-'));});
 return css.toString();
}

export function buildPopconfirmTheme() {
 const css=postcss.parse(buildComponentTheme('popconfirm',popconfirmTheme,':where(.semi-portal-inner:has(.eva-popconfirm))'));
 // Semi Sass concatenates a CSS custom property with the icon width as text.
 // Restore its intended arithmetic while retaining the shared spacing token.
 css.walkRules(rule=>{
  if(!rule.selector.includes('.semi-popconfirm-body-withIcon'))return;
  rule.walkDecls('margin-left',decl=>{decl.value=`calc(${popconfirmTheme['width-popconfirm-icon']} + ${popconfirmTheme['spacing-popconfirm_header_icon-marginRight']})`;});
 });
 return css.toString();
}
