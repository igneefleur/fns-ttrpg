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
 for(const id of ['ob-recherche','ob-sous-categorie','ob-categorie','ob-items','ob-details','ob-status','ob-dialog','ob-quantite-chat','ob-dialog-title','ob-annuler','ob-page','ob-precedent','ob-suivant','ob-prix-min','ob-prix-max','ob-prix-inconnu','ob-effet','ob-caracteristique','ob-carac-min','ob-poids-max','ob-volume-max','ob-taille','ob-tri','ob-inverse','ob-reset']){const n=doc.createElement(id==='ob-categorie'?'select':id==='ob-quantite-chat'?'input':'div');n.id=id;}
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
 assert.ok(catalogue.objets.length>=1600);assert.equal(catalogue.objets.filter(i=>i.objet.typeObjet==='vetement').length,430);assert.equal(new Set(catalogue.objets.map(i=>i.id)).size,catalogue.objets.length);
 assert.equal(catalogue.categories.length,12);
 for(const it of catalogue.objets){assert.ok(catalogue.categories.some(c=>c.nom===it.categorie&&c.sousCategories.includes(it.sousCategorie)),it.nom);assert.equal(it.objet.sousCategorieBoutique,it.sousCategorie);}
 const pages=Math.ceil(catalogue.objets.length/12),categories=catalogue.categories.length;
 catalogue.objets.forEach(it=>{assert.ok(it.objet&&typeof it.objet==='object',it.id+' sans données d’inventaire');if(!it.img)return;if(/^https:\/\//.test(it.img)){const image=new URL(it.img);assert.equal(image.protocol,'https:');assert.ok(['outward.wiki.gg','static.wikia.nocookie.net','outward.fandom.com','igneefleur.github.io'].includes(image.hostname),image.hostname);}else assert.ok(fs.existsSync(path.join(root,'docs',it.img)),it.img);assert.ok(it.champs.length);});
 assert.equal($('ob-items').children.length,12);assert.equal($('ob-categorie').children.length,categories+1);assert.equal($('ob-page').textContent,'1 / '+pages);
 $('ob-recherche').value='Clean Water';$('ob-recherche').oninput();$('ob-prix-max').value='10';$('ob-prix-max').oninput();assert.equal($('ob-items').children[0].textContent,'Aucun résultat.');$('ob-prix-inconnu').checked=true;$('ob-prix-inconnu').onchange();assert.ok($('ob-items').textContent.includes('Clean Water'));
 $('ob-reset').onclick();$('ob-recherche').value='Clean Water';$('ob-recherche').oninput();$('ob-effet').value='Récupération (Eau) PH II';$('ob-effet').oninput();assert.ok($('ob-items').textContent.includes('Clean Water'),'Recherche des noms des nouvelles assimilations');
 $('ob-reset').onclick();$('ob-recherche').value='Adventurer Armor';$('ob-recherche').oninput();$('ob-caracteristique').value='res_feu';$('ob-caracteristique').onchange();$('ob-carac-min').value='17';$('ob-carac-min').oninput();assert.ok($('ob-items').textContent.includes('Adventurer Armor'));$('ob-carac-min').value='18';$('ob-carac-min').oninput();assert.equal($('ob-items').children[0].textContent,'Aucun résultat.');$('ob-reset').onclick();
 $('ob-recherche').value='Great Life Potion';$('ob-recherche').oninput();$('ob-effet').value='saignement';$('ob-effet').oninput();assert.ok($('ob-items').textContent.includes('Great Life Potion'));$('ob-poids-max').value='0.2';$('ob-poids-max').oninput();assert.equal($('ob-items').children[0].textContent,'Aucun résultat.');$('ob-reset').onclick();
 assert.equal($('ob-precedent').disabled,true);$('ob-suivant').onclick();assert.equal($('ob-page').textContent,'2 / '+pages);
 $('ob-categorie').value='Armes';$('ob-categorie').onchange();$('ob-sous-categorie').value='Dagues';$('ob-sous-categorie').onchange();assert.ok($('ob-items').children.length>0);assert.equal($('ob-page').textContent,'1 / 5');
 $('ob-recherche').value='Astral';$('ob-recherche').oninput();assert.equal($('ob-items').children.length,1);assert.ok($('ob-details').textContent.includes('Astral Dagger'));
 $('ob-categorie').value='';$('ob-categorie').onchange();$('ob-recherche').value='epees';$('ob-recherche').oninput();assert.ok($('ob-items').children.length>1);assert.match($('ob-details').textContent,/épées/i);
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
 assert.equal(payload.q,9);assert.equal(payload.n,'Astral Dagger');assert.equal(payload.a,2000);assert.equal(payload.v,600);assert.equal(payload.i,'https://example.test/owd-beta/assets/equipements/dagues-astral-dagger.png');assert.equal(payload.version,1);assert.ok(payload.s.some(f=>f[0]==='Réduction de base'&&f[1]==='10'));assert.ok(payload.s.every(f=>typeof f[0]==='string'&&typeof f[1]==='string'));assert.ok(payload.s.some(f=>f[0]==='Parade'));
 assert.equal(payload.item.typeObjet,'arme');assert.equal(payload.item.arme.repartition.physique,80);assert.equal(payload.item.arme.repartition.eclair,20);
 assert.ok(catalogue.objets.some(i=>i.objet&&i.objet.typeObjet==='consommable'&&i.objet.sousType==='liquide_ingerable'));
 assert.ok(catalogue.objets.some(i=>i.objet&&i.objet.typeObjet==='vetement'&&i.objet.sousType==='hautbas'));
 message({ns:'owd',type:'inventory-drop-chat',token:begin.token,ref:begin.ref,charId:'boutique',action:'donner'});assert.equal($('ob-dialog').open,false);assert.equal(sent.length,1);
 card.ondragstart(event);const second=sent.pop();message({ns:'owd',type:'inventory-drop-chat',token:second.token,ref:second.ref,charId:'boutique',action:'montrer'});$('ob-annuler').onclick();assert.equal($('ob-dialog').open,false);assert.equal(sent.length,1);
 card.ondragstart(event);const third=sent.pop();message({ns:'owd',type:'inventory-drop-chat',token:third.token,ref:third.ref,charId:'boutique',action:'montrer'});form.onsubmit({preventDefault(){}});assert.ok(sent[1].raw.includes('name=OWD Item Show'));assert.ok(sent[1].raw.includes('/owd_item_show'));assert.ok(!sent[1].raw.includes('/owd_take'));
 message({ns:'owd',type:'panel-theme',nuit:false});assert.equal(doc.documentElement.classList.contains('night'),false);message({ns:'owd',type:'panel-theme',nuit:true});assert.equal(doc.documentElement.classList.contains('night'),true);
 const failed=boot(async()=>{throw Error('network');});await tick();assert.ok(failed.doc.ids['ob-status'].textContent.includes('Réessayer'));assert.equal(failed.doc.ids['ob-suivant'].disabled,true);

 $('ob-categorie').value='';$('ob-categorie').onchange();$('ob-recherche').value='Antidote';$('ob-recherche').oninput();
 assert.ok($('ob-items').textContent.includes('7 argent'));
 assert.ok($('ob-details').textContent.includes('Achat : 7 argent · Vente : 2 argent'));
 for(const nom of ['Clean Water','River Water','Rancid Water','Salt Water']){
  $('ob-recherche').value=nom;$('ob-recherche').oninput();
  assert.ok($('ob-items').textContent.includes('Prix non renseigné'),nom);
  $('ob-items').children.find(n=>n.dataset.id===catalogue.objets.find(i=>i.nom===nom).id).onclick();
  assert.ok($('ob-details').textContent.includes('Achat : Prix non renseigné · Vente : Prix non renseigné'),nom);
 }
 // Vérifier les objets de chaque nouvelle famille dans la chaîne Boutique -> tchat -> Prendre.
 for(const nom of ['Bandages','Crystal Powder','Tripwire Trap','Pressure Plate Trap','Frost Bomb','Spikes – Wood','Spikes – Iron','Spikes – Palladium','Charge – Incendiary','Charge – Toxic','Charge – Nerve Gas','Arcane Dampener','Antidote','Clean Water','River Water','Rancid Water','Salt Water','Master Trader Trousers','Waterskin','Great Life Potion','Ammolite','Whole Loaf','Trader Warbelt','Nomad Baldric','Arcane Robe','Thick Oil','Bolt Varnish','Campfire Kit','Bandit Cage key']){
   $('ob-categorie').value='';$('ob-categorie').onchange();$('ob-recherche').value=nom;$('ob-recherche').oninput();
   assert.ok($('ob-items').children.length>0,nom+' absent');
   const item=catalogue.objets.find(x=>x.nom===nom);assert.ok(item,nom+' non catalogué');
   const c=Array.from($('ob-items').children).find(x=>x.dataset.id===item.id);assert.ok(c,nom+' non visible');
   const dt={setData(){},effectAllowed:''};c.ondragstart({dataTransfer:dt,preventDefault(){throw Error('drag invalide : '+nom);}});
   const ref=sent.pop();message({ns:'owd',type:'inventory-drop-chat',token:ref.token,ref:ref.ref,charId:'boutique',action:'donner'});
   assert.equal($('ob-dialog').open,true);$('ob-quantite-chat').value='3';form.onsubmit({preventDefault(){}});
   const raw=sent.pop().raw, m=/\/owd_take ([\w-]+)/.exec(raw);assert.ok(m,nom+' : Prendre absent');
   const p=JSON.parse(Buffer.from(m[1],'base64url').toString('utf8'));
   assert.equal(p.item.nom,nom);assert.equal(p.item.qte,3);assert.equal(p.version,1);
   assert.equal(p.item.typeObjet,item.objet.typeObjet);
   assert.equal(p.item.sousType,item.objet.sousType);
   for(const [top,key] of [['a','achat'],['v','vente'],['p','poids'],['l','volume']])assert.equal(p[top],p.item[key],nom+' : carte et objet reçu diffèrent sur '+key);
   assert.deepEqual(JSON.parse(JSON.stringify(p.item.effets||[])),JSON.parse(JSON.stringify(item.objet.effets||[])));
   assert.ok(p.s.every(f=>f.every(v=>typeof v==='string')));
 }

 // The native chat transport accepts the exact commands emitted by Boutique.
 const ext=fs.readFileSync(path.join(root,'extension/firefox/beta/content-roll20.js'),'utf8');
 const start=ext.indexOf('  function chatAutorise('),end=ext.indexOf('\n  }',start)+4;
 const check=vm.runInNewContext('var CHAT_CORPS=/^&\\{template:[A-Za-z0-9_-]+\\}/, CHAT_CHUCHOTE=/^\\/w\\s+(?:gm|"[^"]*")\\s+/; ('+ext.slice(start,end).trim()+')');assert.equal(check(sent[0].raw),true);assert.equal(check(sent[1].raw),true);
 // Les anciennes cartes Boutique v2 et les nouvelles v1 s'affichent avec l'extension.
 const itemStart=ext.indexOf('  function itemData('),itemEnd=ext.indexOf('  function itemImageURL(',itemStart);
 const parse=vm.runInNewContext('('+ext.slice(itemStart,itemEnd).trim()+')',{atob,TextDecoder,Uint8Array});
 const encodedV1=/\/owd_take ([\w-]+)/.exec(sent[0].raw)[1],decodedV1=parse(encodedV1);
 assert.ok(decodedV1);assert.equal(decodedV1.n,'Astral Dagger');
 const legacy={...decodedV1,version:2,s:[['Quantité',2],['Type','Consommable']]};
 assert.equal(parse(Buffer.from(JSON.stringify(legacy)).toString('base64url')).s[0][1],'2');
 console.log('OK Boutique : catalogue enrichi, catégories calculées, propriétés typées, images, recherche sans accents, pagination, sélection, quantités, annulation, jeton unique, don et présentation compatibles avec le chat, thèmes et erreur réseau.');
})().catch(e=>{console.error(e);process.exitCode=1;});

// Intégration : une boutique avec catalogue mais sans entrée Roll20 ni page
// affichable reproduirait la régression signalée en 3.28.0b.
(function verifieAccesBoutique() {
 const html=fs.readFileSync(path.join(root,'docs/roll20-boutique.html'),'utf8');
 for(const id of ['ob-recherche','ob-sous-categorie','ob-categorie','ob-items','ob-details','ob-status','ob-dialog','ob-quantite-chat','ob-dialog-title','ob-annuler','ob-page','ob-precedent','ob-suivant'])
   assert.ok(html.includes('id="'+id+'"'), 'Interface Boutique : '+id+' absent');
 assert.ok(html.includes('owd-manifeste.json')&&html.includes('man.boutique'),'La page Boutique ne charge pas son module depuis le manifeste');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/owd-manifeste.json'),'utf8'));
 for(const type of ['js','css']) {
   assert.ok(Array.isArray(manifest.boutique[type])&&manifest.boutique[type].length,'Bloc boutique.'+type+' manquant');
   for(const u of manifest.boutique[type])assert.ok(fs.existsSync(path.join(root,'docs',u.split('?')[0])),'Ressource Boutique absente : '+u);
 }
 for(const mode of ['stable','beta']) {
   const ext=fs.readFileSync(path.join(root,'extension/firefox',mode,'content-roll20.js'),'utf8');
   assert.ok(/id:'boutique',titre:'Boutique',page:'roll20-boutique\.html'/.test(ext),'Outil Boutique non enregistré dans '+mode);
   assert.ok(ext.indexOf("id:'boutique'")>ext.indexOf("id:'attaques'"),'Boutique doit suivre Attaques dans '+mode);
   // Depuis 4.5.0b, cette icône provient de l’image fournie, via iconeImage().
   // Exercer le chemin réellement utilisé, plutôt qu’exiger l’ancien SVG inline.
   const startIcon=ext.indexOf('  function iconeImage('),endIcon=ext.indexOf('  function barreModele(',startIcon);
   assert.ok(startIcon>=0&&endIcon>startIcon,'Fabrique des icônes absente dans '+mode);
   const context={browser:{runtime:{getURL:p=>'moz-extension://test/'+p}},el:(tag,cls)=>({tag,cls,attrs:{},style:{values:{},setProperty(k,v){this.values[k]=v;}},setAttribute(k,v){this.attrs[k]=v;}})};
   const icon=vm.runInNewContext(ext.slice(startIcon,endIcon)+';icon("boutique")',context);
   assert.equal(icon.tag,'span');assert.equal(icon.cls,'owd-tool-icon');
   assert.equal(icon.style.values['--owd-icon'],'url("moz-extension://test/icons/owd-boutique.svg")','Image Boutique non raccordée dans '+mode);
   assert.equal(icon.attrs['aria-hidden'],'true');
   const asset='icons/owd-boutique.svg';
   assert.ok(fs.existsSync(path.join(root,'extension/firefox',asset)),'Image Boutique absente');
   for(const browser of ['firefox','chrome']){
     const m=JSON.parse(fs.readFileSync(path.join(root,'extension',browser,'manifest.json'),'utf8'));
     const resources=m.web_accessible_resources.flatMap(r=>typeof r==='string'?[r]:r.resources);
     assert.ok(resources.includes(asset),'Image Boutique non exposée par '+browser);
   }
   assert.ok(ext.includes('icon(def.id)')&&ext.includes('OUTILS.forEach(function(def,i)'),'Bouton non raccordé au montage dans '+mode);
 }
 console.log('OK Accès Boutique : page, 12 éléments UI, styles, scripts, barre Roll20 stable/beta, ordre, icône et ouverture du panneau.');
})();

// Illustrations embarquées : aucun secours distant, y compris pour le homebrew.
(function verifieImagesLocales() {
 const js=fs.readFileSync(path.join(root,'docs/javascripts/owd-boutique.js'),'utf8');
 const start=js.indexOf('  function imageCandidates('),end=js.indexOf('  function picture(',start);
 const imageCandidates=vm.runInNewContext(js.slice(start,end)+';imageCandidates',{});
 assert.deepEqual(Array.from(imageCandidates({img:'assets/objets/wiki/test.png'})),['assets/objets/wiki/test.png']);
 for(const img of ['', 'https://outward.wiki.gg/wiki/Special:FilePath/Key.png', '//other.test/a.png', 'assets/../x.png'])
   assert.equal(imageCandidates({img,nom:'Objet inventé'}).length,0);
 for(const it of catalogue.objets){
   assert.ok(!/^https?:/.test(it.img),it.nom+' : illustration distante');
   assert.equal(it.objet.img||'',it.img||'',it.nom+' : image inventaire différente');
   if(it.img)assert.ok(fs.existsSync(path.join(root,'docs',it.img)),it.nom+' : image absente');
 }
 console.log('OK illustrations locales : catalogue, inventaire et absence de secours externe.');
})();
