/* Regression checks for the narration port. Run: node scripts/test_narration.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
function timers() {
  const queue = [];
  return {setTimeout: f => {queue.push(f); return queue.length;}, clearTimeout: () => {}, flush: () => {let n=0; while(queue.length) {if (++n>2000) throw Error('unbounded timer queue'); queue.shift()();}}};
}
// Use the assembled Roll20 bridge with a minimal Backbone-compatible campaign.
const t = timers(), listeners = {}, chars = {};
const document = {querySelector: () => null, addEventListener: () => {}};
const window = {document, is_gm: true, currentPlayer: {id:'gm'}, addEventListener: (n,f) => {listeners[n]=f;}, Campaign: {characters: {models:[], get: id => chars[id]}}};
function character(id, name, attributes) {
  const c = {id, get: key => key==='name'?name:key==='controlledby'?'all':'', attribs: {models:[], fetch: () => {c.fetches=(c.fetches||0)+1;}}};
  c.attribs.create = data => {const m = {attributes:{...data}, get:k=>m.attributes[k], set:d=>Object.assign(m.attributes,d), save: (d,o) => {m.saved=(m.saved||0)+1; if(o && o.success)o.success();}, destroy: o=>{c.attribs.models.splice(c.attribs.models.indexOf(m),1);if(o && o.success)o.success();}}; c.attribs.models.push(m); return m;};
  attributes.forEach(a=>c.attribs.create(a)); chars[id]=c;window.Campaign.characters.models.push(c);return c;
}
const board = character('board','Narration',[
 {name:'mia_narr_conf',current:'{"v":1}',max:''},
 {name:'mia_narr_pt_p1',current:'100,100',max:''},
 {name:'mia_state',current:'existing MIA character',max:''},
 {name:'mia_state',current:'second existing value',max:''},
 {name:'mia_narr_future',current:'preserve unknown narration data',max:''},
 {name:'mia_narr_pt_duplicate',current:'1,2',max:''},
 {name:'mia_narr_pt_duplicate',current:'3,4',max:''},
 {name:'hp',current:'44',max:'44'}]);
const hero = character('hero','Riko',[{name:'mia_pv',current:'90',max:'100'}]);
const bridge = vm.createContext({window, document, location:{pathname:'/editor'}, console, setTimeout:t.setTimeout, clearTimeout:t.clearTimeout});
vm.runInContext(read('extension/firefox/beta/roll20-page.js'),bridge);
function client() {return {closed:false, answers:[],postMessage(d) {this.answers.push(d);}};}
function send(source, data) {listeners.message({source,data:{ns:'mia',...data}});t.flush();}
const a=client(), b=client(), stranger=client();
send(a,{type:'narration-char'}); assert.equal(a.answers.at(-1).charId,'board');
send(a,{type:'load',charId:'board',menageGarde:['mia_narr_conf','mia_narr_pt_','mia_narr_bg_'],resync:true});
assert.equal(a.answers.at(-1).sur,true);
assert.equal(board.attribs.models.filter(m=>m.get('name')==='mia_state').length,2,'existing character attributes must survive');
assert.equal(board.attribs.models.filter(m=>m.get('name')==='mia_narr_pt_duplicate').length,2,'no automatic deletion of duplicate attributes');
assert.equal(board.attribs.models.find(m=>m.get('name')==='mia_narr_future').get('current'),'preserve unknown narration data');
send(a,{type:'save',charId:'board',attrs:{mia_narr_pt_p1:{current:'700,500'},hp:{current:'0'},jjk_narr_pt_p1:{current:'0,0'}}});
assert.equal(board.attribs.models.find(m=>m.get('name')==='mia_narr_pt_p1').get('current'),'700,500');
assert.equal(board.attribs.models.find(m=>m.get('name')==='hp').get('current'),'44');
assert.ok(!board.attribs.models.some(m=>m.get('name').startsWith('jjk_')));
send(b,{type:'load',charId:'board',resync:true});assert.equal(b.answers.at(-1).attrs.mia_narr_pt_p1.current,'700,500','second client sees saved position');
send(a,{type:'save',charId:'hero',attrs:{mia_pv:{current:'0'}}});
send(stranger,{type:'save',charId:'hero',attrs:{mia_pv:{current:'0'}}});
assert.equal(hero.attribs.models[0].get('current'),'90','unbound or cross-character writes refused');
const heroClient=client();send(heroClient,{type:'load',charId:'hero'});send(heroClient,{type:'save',charId:'hero',attrs:{mia_pv:{current:'80',max:'100'}}});
assert.equal(hero.attribs.models[0].get('current'),'80','normal sheet persistence remains functional');
// Exercise the actual board parsing, distribution and echo logic without a DOM renderer.
const boardListeners={}, writes=[];
const bw = {addEventListener:(n,f)=>{boardListeners[n]=f;},top:{postMessage:m=>writes.push(m)}};
const bc = vm.createContext({window:bw,document:{readyState:'loading',addEventListener:()=>{}},location:{hash:''},localStorage:{getItem:()=>null},setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>1,console});
let code=read('docs/javascripts/mia-narration.js');
code=code.replace('  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarre);',`  window.testBoard = {
    confVide: confVide, litConf: litConf, litPoint: litPoint, jugeDroits: jugeDroits,
    prepare: function(c) { conf=c; charId='board'; etatSur=true; ecrivable=true; points={}; connus={}; attente={}; rend=function(){}; montreEtat=function(){}; auHasardDans=function(id){return {x:id==='mj'?100:800,y:500};}; },
    distribute: distribue, gather: ramasse,
    state: function(){return {conf:conf,points:points,attente:attente};},
    hydrate: applique,
    writable: function(v){ecrivable=v;},
    write: ecrire
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", demarre);`);
vm.runInContext(code,bc);const api=bw.testBoard;
let conf=api.confVide();assert.equal(conf.donne.mj,5);assert.equal(conf.donne.joueur,3);
conf.joueurs=[{id:'j1',nom:'Riko',img:''},{id:'j2',nom:'Reg',img:''}];api.prepare(conf);api.distribute();
assert.equal(Object.keys(api.state().points).length,11);
const first=writes.at(-1);assert.equal(first.ns,'mia');assert.equal(first.plateau,true,'board messages must be distinguishable from character messages');assert.equal(first.type,'save');assert.equal(first.charId,'board');
assert.equal(Object.keys(first.attrs).filter(k=>k.startsWith('mia_narr_pt_')).length,11);
assert.equal(Object.values(api.state().points).filter(p=>p.x===100).length,5);
api.distribute();assert.equal(Object.keys(api.state().points).length,11,'redistribute without duplicating tokens');assert.equal(api.state().conf.seq,11);
api.gather();assert.equal(Object.values(api.state().points).filter(p=>p.x===100).length,11);
api.writable(false);const before=writes.length;api.write({mia_narr_pt_p1:'2,3'});assert.equal(writes.length,before,'read-only never saves');
assert.equal(api.jugeDroits({gm:false,moi:'alice',controlledby:'bob'}),false);
assert.equal(api.jugeDroits({gm:false,moi:'alice',controlledby:'all'}),true);
assert.equal(api.litPoint('invalid'),null);assert.equal(api.litPoint('1200,-9').x,1000);assert.equal(api.litPoint('1200,-9').y,0);
const raw=fs.readFileSync(path.join(root,'docs/assets/images/fate_token.png'));assert.ok(raw.length>1000);
assert.ok(read('docs/stylesheets/mia-narration.css').includes('../assets/images/fate_token.png'));
assert.equal(JSON.parse(read('extension/firefox/manifest.json')).version,'1.0.0.6');
assert.equal(JSON.parse(read('extension/chrome/manifest.json')).version,'1.0.0.6');
console.log('Narration: PASS (session distribution, repeated distribution, collection, shared hydration, persistence, permissions, MIA attribute preservation, namespace isolation, browser versions and token asset).');
