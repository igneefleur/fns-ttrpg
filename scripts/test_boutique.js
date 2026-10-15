/* Parcours Boutique et protocole du dépôt, exécutés sans serveur Roll20. */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'..');
const catalogue=JSON.parse(fs.readFileSync(path.join(root,'site/owd-boutique.json')));
class Node {
 constructor(tag,doc){this.tagName=tag;this.doc=doc;this.children=[];this.attributes={};this.dataset={};this.value='';this.disabled=false;this.open=false;this.listeners={};this.className='';this._text='';this.style={};this.classList={toggle:(c,on)=>{const s=new Set(this.className.split(' ').filter(Boolean));if(on)s.add(c);else s.delete(c);this.className=[...s].join(' ');},contains:c=>this.className.split(' ').includes(c)};}
 set id(x){this._id=x;this.doc.ids[x]=this;} get id(){return this._id;}
 set textContent(x){this._text=String(x);this.children=[];}get textContent(){return this._text+this.children.map(n=>n.textContent||'').join('');}
 append(...ns){this.children.push(...ns);}appendChild(n){this.append(n);return n;}replaceChildren(...ns){this.children=ns;this._text='';}
 setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k];}
 add(n){this.appendChild(n);}addEventListener(k,f){this.listeners[k]=f;}
 querySelector(s){if(s==='form')return this.children.find(n=>n.tagName==='form');return null;}
 reportValidity(){return this.tagName!=='input'||this.type!=='number'||Number.isInteger(Number(this.value))&&Number(this.value)>=Number(this.min);}
 focus(){}select(){}showModal(){this.open=true;}close(){this.open=false;}
}
function boot(fetcher){
 const doc={ids:{},createElement(tag){return new Node(tag,this);},getElementById(id){return this.ids[id];},documentElement:null};
 doc.documentElement=doc.createElement('html');
 for(const id of ['ob-recherche','ob-categorie','ob-items','ob-details','ob-status','ob-dialog','ob-quantite-chat','ob-dialog-title','ob-annuler','ob-page','ob-precedent','ob-suivant']){const n=doc.createElement(id==='ob-categorie'?'select':id==='ob-quantite-chat'?'input':'div');n.id=id;}
 const form=doc.createElement('form');doc.ids['ob-dialog'].append(form);doc.ids['ob-quantite-chat'].type='number';doc.ids['ob-quantite-chat'].min='1';
 const sent=[],listeners={},top={postMessage:d=>sent.push(d)},parent={};
 const window={top,parent,addEventListener:(t,f)=>{listeners[t]=f;}};
 const context={document:doc,window,location:{hash:'#n=1',href:'https://example.test/owd-beta/roll20-boutique.html'},URL,TextEncoder,Option:function(t,v){const n=doc.createElement('option');n.textContent=t;n.value=v;return n;},btoa:s=>Buffer.from(s,'binary').toString('base64'),setTimeout,fetch:fetcher||(()=>Promise.resolve({ok:true,json:async()=>structuredClone(catalogue)}))};
 vm.runInNewContext(fs.readFileSync(path.join(root,'docs/javascripts/owd-boutique.js'),'utf8'),context);
 return {doc,sent,top,parent,message:d=>listeners.message({data:d,source:top}),form};
}
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const {doc,sent,top,message,form}=boot();await tick();const $=id=>doc.ids[id];
 assert.equal(catalogue.objets.length,1256);assert.equal(new Set(catalogue.objets.map(i=>i.id)).size,1256);
 catalogue.objets.forEach(it=>{assert.ok(it.img,it.id+' sans illustration');assert.ok(fs.existsSync(path.join(root,'docs',it.img)));assert.ok(it.champs.length);});
 assert.equal($('ob-items').children.length,24);assert.equal($('ob-categorie').children.length,23);assert.equal($('ob-page').textContent,'1 / 53');
 assert.equal($('ob-precedent').disabled,true);$('ob-suivant').onclick();assert.equal($('ob-page').textContent,'2 / 53');
 $('ob-categorie').value='Dagues';$('ob-categorie').onchange();assert.ok($('ob-items').children.length>0);assert.equal($('ob-page').textContent,'1 / 3');
 $('ob-recherche').value='Astral';$('ob-recherche').oninput();assert.equal($('ob-items').children.length,1);assert.ok($('ob-details').textContent.includes('Astral Dagger'));
 $('ob-categorie').value='';$('ob-recherche').value='epees';$('ob-recherche').oninput();assert.ok($('ob-items').children.length>1);assert.ok($('ob-details').textContent.includes('Épées'));
 $('ob-recherche').value='NO_SUCH_EQUIPMENT_111';$('ob-recherche').oninput();assert.equal($('ob-items').children[0].textContent,'Aucun résultat.');assert.equal($('ob-suivant').disabled,true);assert.equal($('ob-details').textContent,'Aucun équipement.');
 $('ob-recherche').value='Astral Dagger';$('ob-recherche').oninput();
 const card=$('ob-items').children[0],transfer={values:{},setData(k,v){this.values[k]=v;}},event={dataTransfer:transfer,preventDefault(){this.cancelled=true;}};
 $('ob-quantite').value='0';$('ob-quantite').oninput();card.ondragstart(event);assert.equal(event.cancelled,true);assert.equal(sent.length,0);
 $('ob-quantite').value='7';$('ob-quantite').oninput();event.cancelled=false;card.ondragstart(event);assert.equal(event.cancelled,false);assert.equal(transfer.effectAllowed,'copy');
 const begin=sent.pop();assert.equal(begin.type,'inventory-drag-start');assert.equal(begin.boutique,true);assert.equal(begin.charId,'boutique');
 message({ns:'owd',type:'inventory-drop-chat',token:'wrong',ref:begin.ref,charId:'boutique',action:'donner'});assert.equal($('ob-dialog').open,false);
 message({ns:'owd',type:'inventory-drop-chat',token:begin.token,ref:begin.ref,charId:'boutique',action:'donner'});assert.equal($('ob-dialog').open,true);assert.equal($('ob-quantite-chat').value,'7');
 $('ob-quantite-chat').value='0';form.onsubmit({preventDefault(){}});assert.equal(sent.length,0);
 $('ob-quantite-chat').value='9';form.onsubmit({preventDefault(){}});assert.equal(sent.length,1);assert.equal(sent[0].type,'chat');assert.ok(sent[0].raw.includes('name=OWD Item Give'));assert.ok(sent[0].raw.includes('{{Quantité=9}}'));assert.ok(sent[0].raw.includes('[Prendre](/owd_take '));
 const encoded=/\/owd_take ([\w-]+)/.exec(sent[0].raw)[1],payload=JSON.parse(Buffer.from(encoded,'base64url').toString());
 assert.equal(payload.q,9);assert.equal(payload.n,'Astral Dagger');assert.equal(payload.a,2000);assert.equal(payload.v,600);assert.equal(payload.i,'https://example.test/owd-beta/assets/equipements/dagues-astral-dagger.png');assert.ok(payload.d.includes('Réduction de base : 10'));assert.ok(payload.s.some(f=>f[0]==='Parade'));
 message({ns:'owd',type:'inventory-drop-chat',token:begin.token,ref:begin.ref,charId:'boutique',action:'donner'});assert.equal($('ob-dialog').open,false);assert.equal(sent.length,1);
 card.ondragstart(event);const second=sent.pop();message({ns:'owd',type:'inventory-drop-chat',token:second.token,ref:second.ref,charId:'boutique',action:'montrer'});$('ob-annuler').onclick();assert.equal($('ob-dialog').open,false);assert.equal(sent.length,1);
 card.ondragstart(event);const third=sent.pop();message({ns:'owd',type:'inventory-drop-chat',token:third.token,ref:third.ref,charId:'boutique',action:'montrer'});form.onsubmit({preventDefault(){}});assert.ok(sent[1].raw.includes('name=OWD Item Show'));assert.ok(sent[1].raw.includes('/owd_item_show'));assert.ok(!sent[1].raw.includes('/owd_take'));
 message({ns:'owd',type:'panel-theme',nuit:false});assert.equal(doc.documentElement.classList.contains('night'),false);message({ns:'owd',type:'panel-theme',nuit:true});assert.equal(doc.documentElement.classList.contains('night'),true);
 const failed=boot(async()=>{throw Error('network');});await tick();assert.ok(failed.doc.ids['ob-status'].textContent.includes('Réessayer'));assert.equal(failed.doc.ids['ob-suivant'].disabled,true);
 // The native chat transport accepts the exact commands emitted by Boutique.
 const ext=fs.readFileSync(path.join(root,'extension/firefox/beta/content-roll20.js'),'utf8');
 const start=ext.indexOf('  function chatAutorise('),end=ext.indexOf('\n  }',start)+4;
 const check=vm.runInNewContext('var CHAT_CORPS=/^&\\{template:[A-Za-z0-9_-]+\\}/, CHAT_CHUCHOTE=/^\\/w\\s+(?:gm|"[^"]*")\\s+/; ('+ext.slice(start,end).trim()+')');assert.equal(check(sent[0].raw),true);assert.equal(check(sent[1].raw),true);
 console.log('OK Boutique : 1 256 équipements, 22 catégories, images, recherche sans accents, pagination, sélection, quantités, annulation, jeton unique, don et présentation compatibles avec le chat, thèmes et erreur réseau.');
})().catch(e=>{console.error(e);process.exitCode=1;});
