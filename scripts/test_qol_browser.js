/* Régressions qualité de vie : vraie fiche et pont Roll20 simulé.
 * node scripts/test_qol_browser.js (Playwright + Chromium)
 * OWD_CHROMIUM peut désigner un exécutable Chromium déjà installé.
 */
'use strict';
const {chromium,firefox}=require('playwright');
const fs=require('node:fs'), path=require('node:path'), http=require('node:http'), assert=require('node:assert/strict');
const M=require('../docs/javascripts/owd-attr-map.js'), C=require('../docs/javascripts/owd-sync.js');
const root=path.resolve(__dirname,'..');
let attrs, writes=[], blockWrites=false;
const seed=M.blank();seed.v=M.SCHEMA;seed.rel=M.release();seed.name='Fiche partagée';
seed.comps=[{id:'c1',nom:'Lutte',groupe:'Physique',rang:1},{id:'c2',nom:'Évasion',groupe:'Physique',rang:2}];
seed.etat.pv=100;seed.etat.pe=100;seed.combatOptions={attaques:{utiliseEndurance:true,utiliseMunition:false},defenses:{utiliseEndurance:true}};
seed.inv.objets=[{ref:'top',nom:'Tunique',qte:1,ou:'haut',vet:'haut',prot_feu:4,res_feu:5},
 {ref:'legs',nom:'Pantalon',qte:1,ou:'bas',vet:'bas',prot_feu:2,res_feu:4},
 {ref:'blade',nom:'Dague',qte:1,ou:'mainG',arme:{attaque:'6',degats:'16',parade:'8',reduction:'6',modsParade:['Force','',''],modsDegats:[],type:'dague',comp:'c1'}}];
seed.attaques=[{id:'old',arme:'blade'}, {id:'custom',nom:'Onde de feu',utiliseEndurance:true,personnalisee:{attaque:'5',degats:'20',modsDegats:['Force','',''],type:'',comp:'c1',mult:'1.2',trajet:'1:passe>6:frappe',garde:'1>9',touche:'feu',passage:'feu'}},
 {id:'simple',nom:'Poing',personnalisee:{attaque:'4',degats:'10',modsDegats:[],type:'',touche:'contondant'}}];
seed.defenses={esquive:{comp:'c2',utiliseEndurance:true},entrees:[{id:'shield',arme:'blade',utiliseEndurance:true},
 {id:'customDef',nom:'Barrière',personnalisee:{parade:'5',reduction:'3',modsParade:[],comp:'c1'},utiliseEndurance:true}]};
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
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port;
 const extra=process.env.OWD_CHROMIUM ? {executablePath:process.env.OWD_CHROMIUM,args:['--no-sandbox']} : {};
 const browser=await chromium.launch({headless:true,...extra}); const errors=[];
 try {
  const ctx=await browser.newContext({viewport:{width:1600,height:1100}});
  await ctx.exposeBinding('backend',async(_,m)=>{if(m.kind==='read')return C.copy(attrs);if(m.kind==='write'){writes.push(m.data.name);attrs[m.data.name]={current:String(m.data.current||''),max:String(m.data.max||'')};}});
  const page=await ctx.newPage(); page.on('pageerror',e=>errors.push(e.message)); await page.goto(url+'/harness');
  const sheet=page.frameLocator('iframe'); await sheet.locator('.pc-sheet').waitFor();
  let frame=page.frames().find(f=>f.url().includes('roll20-fiche'));
  const state=()=>frame.evaluate(()=>JSON.parse(__owdLocalStorage.getItem('owd-perso')));
  const replace=async(fn)=>{let s=await state();fn(s);await frame.evaluate(s=>Owd.__recoitEtat(s),s);};
  await frame.evaluate(()=>{window.chats=[];window.__owdChat=c=>chats.push(c);});
  assert.equal(await sheet.locator('[data-module="survie"] button').filter({hasText:/chat/i}).count(),0);
  assert.equal(await sheet.locator('[data-module="survie"] .pc-vital-palier').count(),27);
  assert.equal(await sheet.locator('[data-module="pi"] .pc-vital-palier').count(),9);
  assert.equal(await sheet.locator('.pc-expo-jauge .pc-vital-palier').count(),9);
  for(const id of ['pv','pe','pm','pc','contenance']) assert.equal(await sheet.locator('[data-module="'+id+'"] .pc-vital-palier').count(),0);
  assert.equal(await sheet.locator('[data-module="pi"] .pc-vital-nom').textContent(),'Innocence');
  assert.equal(await sheet.locator('[data-module="pi"]').evaluate(n=>n.previousElementSibling.dataset.module),'survie');
  assert.equal(await sheet.locator('[data-module="exposition"]').evaluate(n=>n.previousElementSibling.dataset.module),'effort');
  const pv=sheet.locator('[data-module="pv"] .pc-vital-delta');
  for(const [text,expected] of [['+20',120],['-20',100],['20',120],['−20',100]]){
    await pv.fill(text);await pv.press('Enter');assert.equal((await state()).etat.pv,expected);
  }
  await pv.fill('+garbage');await pv.press('Enter');assert.equal((await state()).etat.pv,100);
  const belly=sheet.locator('[data-module="contenance"] .pc-vital-delta');
  await belly.fill('+2,5');await belly.press('Enter');assert.equal((await state()).etat.contenance,2.5);
  const expo=sheet.locator('[data-module="exposition"] .pc-vital-delta');
  await expo.fill('+20');await expo.press('Enter');assert.equal((await state()).etat.expo,20);
  const hour=sheet.getByLabel('Heures, en plus ou en moins');
  const minute=sheet.getByLabel('Minutes, en plus ou en moins');
  const before=(await state()).horloge.minutes;
  await minute.fill('+1');await minute.press('Enter');assert.equal((await state()).horloge.minutes,before+1);
  const colors=await frame.evaluate(()=>{const a=document.querySelector('.pc-temps-val'),b=document.querySelector('.pc-vital-delta');return [getComputedStyle(a).backgroundColor,getComputedStyle(b).backgroundColor];});assert.equal(colors[0],colors[1]);
  // Exposition : chaque sens utilise la largeur entière et zéro est vide.
  const exFill=sheet.locator('.pc-expo-jauge > i');
  for(const [factor,left,width,filled] of [[.3,'0%','30%',3],[-.3,'70%','30%',3],[0,'0%','0%',0]]){
    const m=await frame.evaluate(()=>Owd.__calculs.expoMax());
    await replace(s=>s.etat.expo=m*factor);
    assert.equal(await exFill.evaluate(n=>n.style.left),left);
    assert.equal(await exFill.evaluate(n=>n.style.width),width);
    assert.equal(await sheet.locator('.pc-expo-jauge .plein').count(),filled);
  
  }
  // Individual use and recovery, send, remount, theme and received state preserve use.
  const action=sheet.locator('[data-module="desaction"]');
  await action.getByRole('button',{name:'Consommer le dé 1',exact:true}).click();
  assert.equal((await state()).desUtilises[0],true);
  assert.equal(await action.locator('.pc-desaction-pose').nth(0).isDisabled(),true);
  await frame.evaluate(()=>Owd.remonte());
  assert.equal(await action.locator('.pc-desaction-pose').nth(0).isDisabled(),true);
  await frame.evaluate(()=>document.documentElement.classList.toggle('night'));
  await page.waitForTimeout(50);
  assert.equal(await action.locator('.pc-desaction-pose').nth(0).isDisabled(),true);
  await replace(s=>s.notes='réception distante');
  assert.equal(await action.locator('.pc-desaction-pose').nth(0).isDisabled(),true);
  await action.getByRole('button',{name:'Récupérer le dé 1',exact:true}).click();
  // Sélection + envoi dans le même tour : une réception distante entre les deux
  // gestes peut légitimement reconstruire une sélection d’interface temporaire.
  await action.evaluate(n=>{n.querySelector('.pc-desaction-pose').click();n.querySelector('.pc-desaction-envoi').click();});
  assert.equal((await state()).desUtilises[0],true);
  for(let attempt=0;attempt<400&&!C.read(attrs).state.desUtilises?.[0];attempt++)await page.waitForTimeout(100);
  assert.equal(C.read(attrs).state.desUtilises[0],true);
  await page.reload();await sheet.locator('.pc-sheet').waitFor();
  frame=page.frames().find(f=>f.url().includes('roll20-fiche'));
  assert.equal(await action.locator('.pc-desaction-pose').nth(0).isDisabled(),true);
  await replace(s=>{s.allure='lourd';s.allureCran=5;});
  assert.equal(await action.locator('.pc-desaction-de.perdu').count(),0);
  assert.equal(await action.locator('.pc-desaction-pose:not(:disabled)').count(),await action.locator('.pc-desaction-pose').count()-1);
  await action.getByRole('button',{name:'Récupérer',exact:true}).click();
  assert.equal(await action.locator('.pc-desaction-pose:disabled').count(),0);
  // Dépassement : tranches COMPLÈTES de 5 %, et retour immédiat sous le seuil.
  const initialInv=(await state()).inv.objets;
  const capacity=await frame.evaluate(()=>({charge:Owd.__calculs.charge(),ctn:Owd.__calculs.contenance()}));
  for(const [ratio,level] of [[.9,0],[1,0],[1.0499,0],[1.05,1],[1.10,2],[1.25,5],[1.50,10],[1,0]]){
    await replace(s=>{s.inv.objets=[{ref:'ballast',nom:'Charge de test',qte:1,poids:capacity.charge*ratio,ou:'poches'}];s.etat.contenance=capacity.ctn*ratio;});
    assert.equal(await frame.evaluate(()=>Owd.__calculs.effBasePartie('charge')),level);
    assert.equal(await frame.evaluate(()=>Owd.__calculs.effBasePartie('contenance')),level);
  }
  await replace(s=>{s.etat.pr=null;s.etat.ps=null;s.etat.ph=null;s.etat.pi=null;s.etat.expo=0;s.effAlcool=0;s.effAutre=0;s.effParties={};s.inv.objets=[{ref:'ballast',nom:'Charge de test',qte:1,poids:capacity.charge*1.1,ou:'poches'}];s.etat.contenance=capacity.ctn*1.1;});
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),4);
  await replace(s=>{s.inv.objets=initialInv;s.etat.contenance=42;s.effort='repos';});
  const tenMinutes=sheet.getByLabel('Minutes, en plus ou en moins');
  await tenMinutes.fill('+10');await tenMinutes.press('Enter');
  assert.equal((await state()).etat.contenance,41);
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effBasePartie('contenance')),0);
  await replace(s=>{s.etat.contenance=0;});
  // Raw bases and effects do not cancel another category. Additional modifiers apply once.
  const max=await frame.evaluate(()=>{const c=Owd.__calculs;return {pr:c.prMax(),ps:c.psMax(),ph:c.phMax(),expo:c.expoMax()};});
  await replace(s=>{s.etat.pr=max.pr*.7;s.etat.ps=max.ps*.5;s.etat.ph=max.ph*.8;s.etat.expo=0;s.effAlcool=0;s.effAutre=0;s.effParties={pr:{effet:-1,mod:0},ps:{effet:-20,mod:0}};});
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effNiveauDe('ps')),5);
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effPartie('ps')),0);
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effPartie('ph')),2);
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),4);
  const collapse=sheet.locator('[data-module="effondrement"]');
  assert.deepEqual(await collapse.locator('.pc-eff-partie').evaluateAll(ns=>ns.map(n=>n.dataset.effPartie)),['pr','charge','froid','chaud','ps','contenance','ph','alcool','pi','autre']);
  for(const label of ['Repos','Charge','Froid','Chaud','Satiété','Contenance','Hydratation','Alcool','Innocence','Autre']){
    for(const field of ['Base','Effet']) assert.equal(await sheet.getByLabel(label+' — '+field,{exact:true}).getAttribute('readonly'),'');
  }
  // Les effets sont alimentés par l’état/mods, jamais édités dans cette grille.
  await replace(s=>s.effParties.ph={effet:-1,mod:0});
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),3);
  const deltaRepos=sheet.getByLabel('Repos — ±',{exact:true});
  await deltaRepos.fill('+2');
  assert.equal((await state()).effParties.pr.mod,2);
  await deltaRepos.press('Enter');
  assert.equal((await state()).effParties.pr.mod,2);
  assert.equal(await deltaRepos.inputValue(),'+2');
  await deltaRepos.fill('+3');assert.equal((await state()).effParties.pr.mod,3);
  await deltaRepos.fill('');assert.equal((await state()).effParties.pr.mod,0);
  await deltaRepos.fill('-');assert.equal((await state()).effParties.pr.mod,0);
  await deltaRepos.fill('+2');
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),5);
  const deltaAutre=sheet.getByLabel('Autre — ±',{exact:true});
  await deltaAutre.fill('-1');
  assert.equal((await state()).effAutre,-1);
  await deltaAutre.press('Enter');assert.equal((await state()).effAutre,-1);
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),4);
  await frame.evaluate(()=>Owd.remonte());
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),4);
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effNiveauDe('ps')),5);
  await replace(s=>{s.etat.pi=80;});
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effPartie('pi')),2);
  assert.equal(await sheet.getByLabel('Innocence — Base',{exact:true}).inputValue(),'2');
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),6);
  // Désactiver retire les pénalités ; Pauser conserve les niveaux et leur détail.
  const off=collapse.getByRole('button',{name:'Désactiver effondrement',exact:true});
  const paused=collapse.getByRole('button',{name:'Pauser Effondrement',exact:true});
  const basePE=await frame.evaluate(()=>Owd.__calculs.peMax());
  await off.click();
  assert.equal((await state()).effDesactive,true);
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),0);
  assert.ok(await frame.evaluate(()=>Owd.__calculs.peMax())>basePE);
  await replace(s=>{s.etat.ph=max.ph*.6;});
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),0);
  assert.equal(await sheet.getByLabel('Hydratation — Base',{exact:true}).inputValue(),'4');
  await off.click();
  const current=await frame.evaluate(()=>Owd.__calculs.effondrement());
  await paused.click();
  const snap=(await state()).effPause;
  assert.equal(snap.niveau,current);
  assert.equal(await sheet.getByLabel('Repos — ±',{exact:true}).isDisabled(),true);
  await replace(s=>{s.etat.pr=max.pr;s.etat.ph=max.ph;s.etat.ps=max.ps;s.etat.pi=100;s.etat.expo=0;});
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),current);
  assert.equal(await sheet.getByLabel('Hydratation — Base',{exact:true}).inputValue(),'4');
  await frame.evaluate(()=>Owd.remonte());
  assert.equal(await paused.getAttribute('aria-pressed'),'true');
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),current);
  const freezeAttrs=M.stateToAttrs(await state(),null);delete freezeAttrs.owd_state;
  assert.deepEqual(M.attrsToState(freezeAttrs).effPause,snap);
  await off.click();assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),0);
  assert.deepEqual((await state()).effPause,snap);
  const offAttrs=M.stateToAttrs(await state(),null);delete offAttrs.owd_state;
  assert.equal(M.attrsToState(offAttrs).effDesactive,true);
  for(let attempt=0;attempt<400;attempt++){
    const saved=C.read(attrs).state;
    if(saved.effDesactive){try{assert.deepEqual(saved.effPause,snap);break;}catch(_){}}
    await page.waitForTimeout(100);
  }
  assert.equal(C.read(attrs).state.effDesactive,true);
  assert.deepEqual(C.read(attrs).state.effPause,snap);
  await page.reload();await sheet.locator('.pc-sheet').waitFor();
  frame=page.frames().find(f=>f.url().includes('roll20-fiche'));
  assert.equal(await off.getAttribute('aria-pressed'),'true');
  assert.equal(await paused.getAttribute('aria-pressed'),'true');
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),0);
  assert.deepEqual((await state()).effPause,snap);

  await off.click();assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),current);
  await paused.click();assert.equal((await state()).effPause,null);
  assert.equal(await sheet.getByLabel('Hydratation — Base',{exact:true}).inputValue(),'0');
  assert.equal(await sheet.getByLabel('Repos — ±',{exact:true}).isDisabled(),false);
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effondrement()),1);
  // Temps et digestion continuent pendant la pause, sans modifier ses niveaux.
  await replace(s=>{s.etat.contenance=42;s.effAlcool=2;s.effAlcoolSecondes=0;});
  await paused.click();const beforePausedTime=(await state()).effPause;
  await minute.fill('+10');await minute.press('Enter');
  assert.equal((await state()).etat.contenance,41);
  assert.equal((await state()).effAlcoolSecondes,600);
  assert.deepEqual((await state()).effPause,beforePausedTime);
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effBasePartie('contenance')),1);
  await paused.click();assert.equal(await frame.evaluate(()=>Owd.__calculs.effBasePartie('contenance')),0);
  await replace(s=>{s.etat.pr=max.pr*.7;s.etat.ps=max.ps*.5;s.etat.ph=max.ph*.8;s.etat.pi=80;s.etat.contenance=0;s.effAlcool=0;s.effParties={pr:{effet:-1,mod:2},ps:{effet:-20,mod:0},ph:{effet:-1,mod:0}};s.effAutre=-1;});
  // Les deux signes de l’exposition restent exclusifs, les modificateurs sont indépendants.
  await replace(s=>{s.etat.expo=-max.expo*.3;s.effParties.froid={effet:-1,mod:0};s.effParties.chaud={effet:0,mod:0};});
  assert.equal(await sheet.getByLabel('Froid — Base',{exact:true}).inputValue(),'3');
  assert.equal(await sheet.getByLabel('Chaud — Base',{exact:true}).inputValue(),'0');
  await replace(s=>s.etat.expo=max.expo*.3);
  assert.equal(await sheet.getByLabel('Froid — Base',{exact:true}).inputValue(),'0');
  assert.equal(await sheet.getByLabel('Chaud — Base',{exact:true}).inputValue(),'3');
  // Migration des réglages d’exposition de la version précédente.
  await replace(s=>{s.etat.expo=-max.expo*.2;s.effParties={expo:{effet:-1,mod:1}};});
  assert.equal((await state()).effParties.froid.effet,-1);
  assert.equal((await state()).effParties.froid.mod,1);
  // Alcohol counts only occupied time and expires one level per two hours; exact undo.
  await replace(s=>{s.effParties={};s.effAutre=0;s.effAlcool=2;s.effAlcoolSecondes=0;s.effort='repos';});
  // Le journal d’annulation est local : tester les gestes consécutifs dans le
  // même tour évite qu’une réception serveur ne l’invalide entre deux commandes.
  const alcoholSteps=await frame.evaluate(()=>{
    const input=document.querySelector('[aria-label="Heures, en plus ou en moins"]');
    return ['+1','+1','-1','+3'].map(value=>{
      input.value=value;input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
      const s=JSON.parse(__owdLocalStorage.getItem('owd-perso'));
      return [s.effAlcool,s.effAlcoolSecondes];
    });
  });
  assert.deepEqual(alcoholSteps,[[2,3600],[1,0],[2,3600],[0,0]]);
  // Fallback attributes and sync preserve all added fields.
  const sample=await state();sample.desUtilises={0:true,2:true};sample.effParties.pr={effet:-3,mod:1};sample.effAlcool=1;sample.effAlcoolSecondes=99;
  sample.effParties.pi={base:2,effet:-1,mod:1};sample.effParties.charge={effet:-1,mod:2};sample.effParties.contenance={effet:-2,mod:1};
  const packed=M.stateToAttrs(sample,null);delete packed.owd_state;
  const back=M.attrsToState(packed);assert.deepEqual(back.desUtilises,sample.desUtilises);assert.deepEqual(back.effParties,sample.effParties);assert.equal(back.effAlcool,1);assert.equal(back.effAlcoolSecondes,99);
  assert.deepEqual(C.rebuild(C.flatten(sample)),sample);
  // Preview representative values, check bounds in both themes and compact width.
  await replace(s=>{s.etat.contenance=60;s.etat.pi=50;s.etat.pr=max.pr*.8;s.etat.ps=max.ps*.8;s.etat.ph=max.ph*.9;s.etat.expo=max.expo*.1;s.effAlcool=1;s.effAlcoolSecondes=0;s.effParties={pr:{effet:-1,mod:0},ps:{effet:-1,mod:0}};s.effAutre=0;s.desUtilises=[true,false,true];});
  async function capture(locator,file){
    for(let attempt=0;attempt<5;attempt++){
      try{await locator.screenshot({path:file});return;}
      catch(e){if(attempt===4)throw e;await page.waitForTimeout(150);}
    }
  }
  for(const night of [true,false]){
   await frame.evaluate(n=>document.documentElement.classList.toggle('night',n),night);await page.waitForTimeout(50);
   await page.mouse.move(0,0);
   await capture(collapse,'/tmp/owd-effondrement-'+(night?'night':'day')+'.png');
   await capture(sheet.locator('[data-module="pi"]'),'/tmp/owd-innocence-'+(night?'night':'day')+'.png');
   await capture(sheet.locator('[data-module="exposition"]'),'/tmp/owd-exposition-'+(night?'night':'day')+'.png');
   const layout=await collapse.locator('.pc-eff-partie').evaluateAll(ns=>ns.map(n=>({key:n.dataset.effPartie,x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,w:n.getBoundingClientRect().width,bg:getComputedStyle(n).backgroundColor})));
   for(let i=0;i<10;i+=2)assert.equal(layout[i].y,layout[i+1].y);
   for(let i=2;i<10;i+=2)assert.ok(layout[i].y>layout[i-2].y);
   const fonts=await collapse.locator('.pc-big .k, .pc-eff-tete > .k').evaluateAll(ns=>ns.map(n=>{const s=getComputedStyle(n);return [s.fontSize,s.fontFamily,s.fontWeight,s.letterSpacing].join('|')}));
   assert.equal(new Set(fonts).size,1);
   assert.equal(await collapse.locator('.pc-eff-partie .pc-vital-jauge').count(),10);
   const reference=await sheet.locator('[data-module="pv"] .pc-vital-num').evaluate(n=>getComputedStyle(n).fontSize);
   const referenceMax=await sheet.locator('[data-module="pv"] .pc-vital-max').evaluate(n=>getComputedStyle(n).fontSize);
   const savedWidth=await collapse.evaluate(n=>n.style.width);
   for(const width of ['380px','150px',savedWidth]){
     await collapse.evaluate((n,w)=>n.style.width=w,width);await page.waitForTimeout(40);
     assert.ok(await collapse.locator('.pc-eff-partie-total').evaluateAll((ns,f)=>ns.every(n=>getComputedStyle(n).fontSize===f),reference));
     assert.ok(await collapse.locator('.pc-eff-lecture .pc-vital-max').evaluateAll((ns,f)=>ns.every(n=>getComputedStyle(n).fontSize===f),referenceMax));
     assert.ok(await collapse.locator('.pc-eff-tete').evaluateAll(ns=>ns.every(n=>{const a=n.children[0].getBoundingClientRect(),b=n.children[1].getBoundingClientRect(),p=n.getBoundingClientRect();return (a.right<=b.left||a.bottom<=b.top)&&b.right<=p.right+1;})));
     if(width==='380px')assert.deepEqual(await collapse.locator('.pc-eff-tete > .k').evaluateAll(ns=>ns.map(n=>n.innerText)),['PR','CHARGE','FROID','CHAUD','PS','CONTENANCE','PH','ALCOOL','PI','AUTRE']);
     if(width==='150px')await capture(collapse,'/tmp/owd-effondrement-compact-'+(night?'night':'day')+'.png');
   }
   assert.ok(await collapse.locator('.pc-eff-partie .pc-vital-jauge > i').evaluateAll(ns=>ns.every(n=>n.style.marginLeft==='0px')));

   assert.equal(await collapse.locator('.pc-eff-legende').count(),0);
   for(const box of await collapse.locator('.pc-eff-champs').all()){
     assert.equal(await box.locator('input').count(),3);
     assert.ok(await box.evaluate(n=>{const a=n.children[0].getBoundingClientRect(),b=n.children[1].getBoundingClientRect(),c=n.children[2].getBoundingClientRect();return a.y===b.y&&b.y===c.y;}));
   }
   const readonly=collapse.getByLabel('Repos — Base',{exact:true});
   const appearance=()=>readonly.evaluate(n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return {color:s.color,background:s.backgroundColor,transform:s.transform,x:r.x,y:r.y,w:r.width,h:r.height}});
   await page.mouse.move(0,0);await page.waitForTimeout(200);const normal=await appearance();
   await readonly.hover();await page.waitForTimeout(200);assert.deepEqual(await appearance(),normal);
   assert.ok(await collapse.locator('.pc-eff-partie .pc-vital-max').evaluateAll(ns=>ns.every(n=>n.textContent==='/ 10')));
   assert.ok(await collapse.locator('.pc-eff-champs').evaluateAll(ns=>ns.every(n=>{const a=n.getBoundingClientRect(),b=n.parentElement.getBoundingClientRect();return Math.abs(a.left-b.left)<=1&&Math.abs(a.right-b.right)<=1;})));
   assert.ok(await sheet.locator('.pc-temps-val').evaluateAll(ns=>ns.every(n=>getComputedStyle(n).boxShadow==='none'&&getComputedStyle(n).borderTopWidth==='0px')));
   assert.ok(await action.locator('.pc-desaction-bascule').evaluateAll(ns=>ns.every(n=>{const a=n.getBoundingClientRect(),b=n.parentElement.getBoundingClientRect();return Math.abs(a.top-b.top)<1&&Math.abs(a.right-b.right)<1&&a.width>20;})));
   assert.ok(!(await collapse.textContent()).includes('Aucune'));
   const ticks=await sheet.locator('[data-module="pi"] .pc-vital-palier').evaluateAll(ns=>ns.map(n=>({filled:n.classList.contains('plein'),color:getComputedStyle(n).backgroundColor})));
   if(night)assert.ok(ticks.filter(t=>t.filled).every(t=>t.color==='rgb(48, 52, 59)'));
   await capture(action,'/tmp/owd-actions-'+(night?'night':'day')+'.png');
   assert.ok(await collapse.locator('.pc-eff-valeur').evaluateAll(ns=>ns.every(n=>{let r=n.getBoundingClientRect(),p=n.closest('.pc-eff-partie').getBoundingClientRect();return r.left>=p.left&&r.right<=p.right+1;})));
  }
  assert.deepEqual(errors,[]);
  console.log('OK survie sans chat, paliers, saisies +/−/virgule, couleurs, dés persistants/manuels sans blocage mouvement, effets locaux et total, alcool 2h/recul, fallback/sync, rendu jour/nuit sans débordement.');
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
