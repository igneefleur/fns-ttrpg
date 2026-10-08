/* Harnais navigateur : vrai bundle et vrai pont, deux collections Backbone
 * indépendantes, serveur simulé partagé. Aucun compte Roll20 nécessaire.
 * NODE_PATH=/chemin/node_modules node scripts/test_sync_browser.js
 * Dépendance de vérification : playwright + Chromium.
 */
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'), path=require('node:path'), http=require('node:http'), assert=require('node:assert/strict');
const M=require('../docs/javascripts/owd-attr-map.js'), C=require('../docs/javascripts/owd-sync.js');
const root=path.resolve(__dirname,'..');
let attrs, writes=[], blockWrites=false;
const seed=M.blank();seed.v=M.SCHEMA;seed.rel=M.release();seed.name='Fiche partagée';
seed.comps=[{id:'c1',nom:'Lutte',groupe:'Physique',rang:1},{id:'c2',nom:'Évasion',groupe:'Physique',rang:2}];
seed.inv.objets=[{ref:'o1',id:'',nom:'Dague',qte:1,ou:'sac',arme:{attaque:'6',degats:'16',parade:'8',reduction:'6',modsDegats:['Dexterite','',''],modsParade:['','',''],type:'',comp:''}}, {ref:'o2',id:'',nom:'Pain',qte:5,ou:'sac'}];
attrs={[C.BASE]:{current:JSON.stringify({format:1,state:seed}),max:''},owd_version:{current:String(M.SCHEMA),max:M.release()},owd_state:{current:JSON.stringify(seed),max:''}};
function harness() { return `<!doctype html><meta charset="utf-8"><style>iframe{width:1500px;height:1000px}</style><script>
function model(data) {return {attributes:{...data},get(k){return this.attributes[k]},set(d){Object.assign(this.attributes,d)},save(_,opts){window.backend({kind:'write',data:this.attributes}).then(()=>opts&&opts.success&&opts.success())}}}
const collection={models:[],create(data){const m=model(data);this.models.push(m);return m},fetch(opts){window.backend({kind:'read'}).then(attrs=>{this.models=Object.keys(attrs).map(name=>model({name,...attrs[name]}));opts&&opts.success&&opts.success()})}};
const ch={id:'shared',attribs:collection,get(k){return k==='name'?'Fiche partagée':k==='controlledby'?'all':''}};
window.Campaign={characters:{get(id){return id==='shared'?ch:null},models:[ch]},players:{models:[]}};
</script><script src="/bridge.js"></script><iframe src="/roll20-fiche.html#c=shared"></iframe>`; }
const server=http.createServer((req,res)=> {
  const url=new URL(req.url,'http://localhost');let body,mime;
  if(url.pathname==='/harness'){body=harness();mime='text/html';}
  else if(url.pathname==='/bridge.js'){body=fs.readFileSync(path.join(root,'extension/firefox/beta/roll20-page.js'));mime='text/javascript';}
  else {const file=path.join(root,'site',decodeURIComponent(url.pathname));if(!file.startsWith(path.join(root,'site'))||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return;}body=fs.readFileSync(file);mime=file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream';}
  res.writeHead(200,{'content-type':mime});res.end(body);
});
(async()=> {
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE || chromium.executablePath(),args:['--no-sandbox']});const errors=[];
  try {
    const ctx=await browser.newContext({viewport:{width:1600,height:1100}});
    await ctx.exposeBinding('backend',async(_,m)=>{
      if(m.kind==='read'){await new Promise(r=>setTimeout(r,70));return C.copy(attrs);}
      if(m.kind==='write'){if(blockWrites && m.data.name.startsWith(C.PREFIX))return;await new Promise(r=>setTimeout(r,30));attrs[m.data.name]={current:String(m.data.current||''),max:String(m.data.max||'')};writes.push(m.data.name);}
    });
    const pages=await Promise.all([ctx.newPage(),ctx.newPage()]);pages.forEach(p=>p.on('pageerror',e=>errors.push(e.message)));
    await Promise.all(pages.map(p=>p.goto(url+'/harness')));
    const frames=pages.map(p=>p.frameLocator('iframe'));
    await Promise.all(frames.map(f=>f.locator('.pc-sheet').waitFor()));
    const [a,b]=frames;
    // Live notes and a simultaneous PE change, using real input handlers.
    await a.locator('.pc-tab').filter({hasText:'Bio'}).click();
    const notes=a.locator('[data-module="notes"] textarea');await notes.fill('Texte partagé');await notes.evaluate(n=>{n.focus();n.setSelectionRange(5,5)});
    const pe=b.locator('[data-module="pe"] .pc-vital-num');await pe.fill('77');
    await pages[1].waitForFunction(()=>{const f=document.querySelector('iframe');return f.contentWindow.__owdLocalStorage.getItem('owd-perso').includes('Texte partagé')});
    await pages[0].waitForTimeout(3000);
    const focused=await notes.evaluate(n=>({focus:document.activeElement===n,start:n.selectionStart,value:n.value}));
    assert.equal(C.read(attrs).state.etat.pe,77);
    assert.equal(focused.focus,true);assert.equal(focused.start,5);assert.equal(focused.value,'Texte partagé');
    console.log('OK réception en direct, modifications simultanées, focus et curseur conservés');
    // Same entity, different fields: modify quantities vs name.
    await a.locator('.pc-tab').filter({hasText:'Équipement'}).click();
    await b.locator('.pc-tab').filter({hasText:'Équipement'}).click();
    await a.locator('.pc-obj-tile').filter({hasText:'Pain'}).first().click();
    await b.locator('.pc-obj-tile').filter({hasText:'Dague'}).first().click();
    await a.locator('[data-module="inv"] .pc-gear').click();
    await b.locator('[data-module="inv"] .pc-gear').click();
    await a.locator('input[placeholder="Nom de l\'objet"]').fill('Galette');
    await b.locator('input[placeholder="Nom de l\'objet"]').fill('Lame');
    await pages[0].waitForFunction(()=>JSON.parse(document.querySelector('iframe').contentWindow.__owdLocalStorage.getItem('owd-perso')).inv.objets.every(x=>['Lame','Galette'].includes(x.nom)));
    await pages[1].waitForFunction(()=>JSON.parse(document.querySelector('iframe').contentWindow.__owdLocalStorage.getItem('owd-perso')).inv.objets.every(x=>['Lame','Galette'].includes(x.nom)));
    assert.equal(await a.locator('input[placeholder="Nom de l\'objet"]').inputValue(),'Galette');
    assert.equal(await b.locator('input[placeholder="Nom de l\'objet"]').inputValue(),'Lame');
    assert.deepEqual(C.read(attrs).state.inv.objets.map(x=>x.nom),['Lame','Galette']);
    console.log('OK inventaire simultané et sélection locale conservée');
    // A fresh opener receives the authoritative merged state.
    await pages[1].reload();await b.locator('.pc-sheet').waitFor();
    await pages[1].waitForFunction(()=>JSON.parse(document.querySelector('iframe').contentWindow.__owdLocalStorage.getItem('owd-perso')).notes==='Texte partagé');
    const reopened=await pages[1].evaluate(()=>JSON.parse(document.querySelector('iframe').contentWindow.__owdLocalStorage.getItem('owd-perso')));
    assert.equal(reopened.notes,'Texte partagé');assert.deepEqual(reopened.inv.objets.map(x=>x.nom),['Lame','Galette']);
    // Deux tentatives perdues déclenchent l'alerte. Une relecture ancienne
    // ne doit pas la fermer ; la confirmation ultérieure, oui, sans édition.
    blockWrites=true;
    await a.locator('.pc-tab').filter({hasText:'Bio'}).click();
    await notes.fill('Modification à renvoyer');
    const warning=a.locator('#owd-bandeau[data-owd-raison="sync-pending"]');
    await warning.waitFor({timeout:30000});
    await pages[0].waitForTimeout(2000);
    assert.equal(await warning.count(),1);
    assert.equal(await notes.inputValue(),'Modification à renvoyer');
    assert.equal(C.read(attrs).state.notes,'Texte partagé');
    blockWrites=false;
    await warning.waitFor({state:'detached',timeout:20000});
    assert.equal(C.read(attrs).state.notes,'Modification à renvoyer');
    await pages[1].reload();await b.locator('.pc-sheet').waitFor();
    await pages[1].waitForFunction(()=>JSON.parse(document.querySelector('iframe').contentWindow.__owdLocalStorage.getItem('owd-perso')).notes==='Modification à renvoyer');
    // La réception suivante ne doit pas effacer un bandeau d'une autre cause.
    await notes.evaluate(()=>{const n=document.createElement('div');n.id='owd-bandeau';n.dataset.owdRaison='autre';n.textContent='Autre alerte';document.body.prepend(n);});
    await notes.fill('Dernière modification');
    await pages[1].waitForFunction(()=>JSON.parse(document.querySelector('iframe').contentWindow.__owdLocalStorage.getItem('owd-perso')).notes==='Dernière modification');
    assert.equal(await a.locator('#owd-bandeau[data-owd-raison="autre"]').count(),1);
    console.log('OK échecs persistants, renvoi automatique, disparition après confirmation, réouverture et autres alertes conservées');
    assert.ok(!writes.includes('owd_state'),'aucune photographie complète réécrite');
    assert.deepEqual(errors,[]);
    console.log('OK réouverture, état fusionné, aucune écriture owd_state, aucune erreur navigateur');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
