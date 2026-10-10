/* Regressions: MIA tab without a native character sheet, localized labels,
 * character-only insertion, narration exclusion, idempotence and pane ordering.
 * Run: node scripts/test_onglet.js */
'use strict';
const fs=require('fs'), path=require('path'), vm=require('vm'), assert=require('assert');
class Element {
  constructor(tag='div',cls='') {this.tagName=tag.toUpperCase();this.className=cls;this.children=[];this.parentNode=null;this.style={};this.attrs={};this.textContent='';this.events={};this.classList={add:c=>{if(!this.matches('.'+c))this.className+=' '+c;},remove:c=>{this.className=this.className.split(/\s+/).filter(x=>x!==c).join(' ');}};}
  get parentElement(){return this.parentNode;}
  get nextElementSibling(){if(!this.parentNode)return null;return this.parentNode.children[this.parentNode.children.indexOf(this)+1]||null;}
  setAttribute(k,v){this.attrs[k]=v;}
  getAttribute(k){return this.attrs[k];}
  appendChild(c){c.parentNode=this;this.children.push(c);return c;}
  insertBefore(c,b){if(c.getAttribute('data-tab')==='miafiche')throw Error('wrong structure');c.parentNode=this;const i=this.children.indexOf(b);i<0?this.children.push(c):this.children.splice(i,0,c);}
  removeChild(c){this.children.splice(this.children.indexOf(c),1);c.parentNode=null;}
  addEventListener(n,f){this.events[n]=f;}
  matches(sel){return sel.split(',').some(s=>{s=s.trim();if(s==="[class*='dialog']")return this.className.includes('dialog');if(s.startsWith('.'))return s.slice(1).split('.').every(c=>this.className.split(/\s+/).includes(c));if(s==='[data-characterid]')return 'data-characterid' in this.attrs;if(s==='a[data-tab]')return this.tagName==='A'&&'data-tab' in this.attrs;return this.tagName===s.toUpperCase();});}
  closest(sel){for(let n=this;n;n=n.parentNode)if(n.matches(sel))return n;return null;}
  querySelectorAll(sel){const out=[];for(const c of this.children){if(c.matches(sel))out.push(c);out.push(...c.querySelectorAll(sel));}return out;}
  querySelector(sel){return this.querySelectorAll(sel)[0]||null;}
}
function scenario(labels,opts={}) {
  const body=new Element('body'),html=new Element('html');html.appendChild(body);
  const dlg=new Element('div',opts.nonCharacter?'ui-dialog':'ui-dialog characterdialog');
  if(!opts.nonCharacter)dlg.setAttribute('data-characterid',opts.narration?'narr':'hero');body.appendChild(dlg);
  const strip=new Element('ul','nav');dlg.appendChild(strip);
  for(let i=0;i<labels.length;i++){const li=new Element('li',i===0?'active':'');const a=new Element('a');a.setAttribute('data-tab','native'+i);a.textContent=labels[i];li.appendChild(a);strip.appendChild(li);}
  const panes=new Element('div','tab-content');dlg.appendChild(panes);panes.appendChild(new Element('div','tab-pane native0'));
  const document={body,documentElement:html,querySelectorAll:s=>html.querySelectorAll(s),querySelector:s=>html.querySelector(s),createElement:t=>new Element(t)};
  const context=vm.createContext({document,window:{frameElement:null},location:{pathname:'/editor'},LIBELLE:'Fiche MIA beta',charIdOfFrame:d=>d.getAttribute('data-characterid'),estPlateau:id=>id==='narr',el:(t,c)=>new Element(t,c),refitFrame:()=>{},requestBridge:()=>{},populate:()=>{}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/extension/content-roll20/090-onglet.js'),'utf8'),context);
  const placed=context.placeTabs();
  if(opts.narration||opts.nonCharacter){assert.equal(placed,0);assert.equal(strip.querySelector('.mia-tab'),null);return;}
  assert.equal(placed,1);const tab=strip.querySelector('.mia-tab');assert.ok(tab);assert.equal(strip.children[1],tab);assert.equal(tab.querySelector('a').textContent,'Fiche MIA beta');
  assert.ok(panes.querySelector('.tab-pane.miafiche'));
  assert.equal(context.placeTabs(),1);assert.equal(strip.querySelectorAll('.mia-tab').length,1);
  tab.querySelector('a').events.click({preventDefault:()=>{},stopPropagation:()=>{}});
  assert.ok(panes.querySelector('.miafiche').matches('.mia-on'));
}
scenario(['Bio & Info','Attributes & Abilities']); // No native character sheet.
scenario(['Feuille de personnage','Bio & Info','Attributs']);
scenario(['Character Sheet','Bio & Info']);
scenario(['Biografie','Attribute']); // No text/locale dependency.
scenario(['Bio & Info']); // Single native tab.
scenario(['Bio & Info','Attributes'],{narration:true});
scenario(['Bio & Info','Attributes'],{nonCharacter:true});
console.log('ONGLET MIA: PASS (no native sheet, French/English/other labels, single tab, character-only, narration exclusion, idempotence and click).');
