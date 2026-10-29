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
</script><script data-owd-version="4.2.0" data-owd-mode="beta" data-owd-browser="firefox" src="/bridge.js"></script><iframe src="/roll20-fiche.html#c=shared"></iframe>`; }
const server=http.createServer((req,res)=> {
  const url=new URL(req.url,'http://localhost');let body,mime;
  if(url.pathname==='/harness'){body=harness();mime='text/html';}
  else if(url.pathname==='/bridge.js'){body=fs.readFileSync(path.join(root,'extension/firefox/beta/roll20-page.js'));mime='text/javascript';}
  else {const file=path.join(root,'site',decodeURIComponent(url.pathname));if(!file.startsWith(path.join(root,'site'))||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return;}body=fs.readFileSync(file);mime=file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream';}
  res.writeHead(200,{'content-type':mime});res.end(body);
});
(async()=> {
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:process.env.OWD_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
 const errors=[];
 try {
  const ctx=await browser.newContext({viewport:{width:1600,height:1100}});
  await ctx.exposeBinding('backend',async(_,m)=>{if(m.kind==='read')return C.copy(attrs);if(m.kind==='write')attrs[m.data.name]={current:String(m.data.current||''),max:String(m.data.max||'')};});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port+'/harness');
  const sheet=page.frameLocator('iframe');await sheet.locator('.pc-sheet').waitFor();await sheet.locator('#owd-mode-bar').waitFor();if(await sheet.locator('#owd-mode-switch').textContent()==='Passer en Mode Edition')await sheet.locator('#owd-mode-switch').click();
  let frame=page.frames().find(f=>f.url().includes('roll20-fiche'));
  const state=()=>frame.evaluate(()=>JSON.parse(__owdLocalStorage.getItem('owd-perso')));
  const replace=async fn=>{let s=await state();fn(s);await frame.evaluate(s=>Owd.__recoitEtat(s),s);};
  const add=id=>frame.evaluate(id=>Owd.effets.ajoute(id,'Test'),id);
  const advance=n=>frame.evaluate(n=>Owd.__calculs.avancerSecondes(n),n);
  const reset=async()=>{await replace(s=>{s.effetsActifs=[];s.effetsPermanents={};s.effAlcool=0;s.effParties={};s.effAutre=0;s.etat.pr=null;s.etat.ps=null;s.etat.ph=null;s.etat.pi=null;s.etat.expo=0;s.etat.contenance=0;s.effort='repos';s.etat.pv=0;s.inv.objets=[];});};
  await frame.evaluate(()=>{window.chats=[];window.__owdChat=c=>chats.push(c);});
  assert.equal(await sheet.locator('[data-module="effets"]').evaluate(n=>n.previousElementSibling.dataset.module),'recuperation');
  await reset();const clean=await state();await advance(600);const baseline=(await state()).etat.pv;
  await frame.evaluate(s=>Owd.__recoitEtat(s),clean);await add('Récupération Nourriture PV V');
  await advance(599);assert.equal((await state()).etat.pv,0);await advance(1);
  assert.equal((await state()).etat.pv,baseline+10);assert.equal((await state()).effetsActifs[0].reste,6600);
  // Un recul exact restaure aussi les compteurs de l'effet.
  await frame.evaluate(()=>Owd.__calculs.reculerSecondes(1));assert.equal((await state()).effetsActifs[0].reste,6601);
  await add('Récupération Nourriture PV I');assert.equal((await state()).effetsActifs[0].effet,'Récupération Nourriture PV V');
  await add('Récupération Potion PV V');assert.equal((await state()).effetsActifs.length,2);
  await advance(60);assert.equal((await state()).effetsActifs.length,1);
  assert.ok((await sheet.locator('[data-module="recuperation"]').textContent()).includes('Récupération (Nourriture) PV V'));
  // Deux ajouts concurrents de même famille ne doublent pas la récupération.
  await replace(s=>{s.etat.pv=0;const e=s.effetsActifs[0];s.effetsActifs=[{...e,reste:7200,suivi:0},{...e,id:'concurrent-copy',reste:7200,suivi:0}];});
  await advance(600);assert.equal((await state()).etat.pv,10);
  // Alerte : cumul plafonné, pénalités et expiration, retrait explicite sur coup reçu.
  await reset();await add('Bénédiction');await add('Alerte +2 niveaux');await add('Alerte +2 niveaux');await add('Alerte +2 niveaux');
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effetAlerte()),4);
  assert.equal(await frame.evaluate(()=>Owd.__calculs.defenseTotaux('eclair',null,true).reduction),0);
  assert.equal(await frame.evaluate(()=>Owd.__calculs.defenseTotaux('physique',null,true).reduction),-20);
  // La difficulté d'esquive baisse, son coût de base reste 8 PE.
  await replace(s=>{s.etat.pe=100;s.combatOptions.defenses.utiliseEndurance=true;s.combatOptions.defenses.lente=false;});
  const esquive=sheet.locator('[data-defense-id="esquive"]');await esquive.locator('.pc-attaque-tete').click();await esquive.getByRole('button',{name:'Se défendre',exact:true}).click();
  await sheet.locator('.pc-modal').getByLabel('Dégâts Physique',{exact:true}).fill('1');await sheet.locator('.pc-modal').getByRole('button',{name:'Valider',exact:true}).click();assert.equal((await state()).etat.pe,92);
  await frame.evaluate(()=>Owd.effets.coupRecu());assert.equal(await frame.evaluate(()=>Owd.__calculs.effetAlerte()),3);
  await advance(60);assert.equal(await frame.evaluate(()=>Owd.__calculs.effetAlerte()),0);
  assert.equal(await frame.evaluate(()=>Owd.__calculs.defenseTotaux('eclair',null,true).reduction),20);
  await add('Réduction du coût en mana');assert.equal(await frame.evaluate(()=>Owd.effets.cout('pm',20)),17);
  await add('Résistance aux altérations augmentée');assert.equal(await frame.evaluate(()=>Owd.effets.accumulation(9)),3);
  await replace(s=>{s.capsLeviers.max=s.capsLeviers.max||{};s.capsLeviers.max.force=s.capsLeviers.max.force||{};s.capsLeviers.max.force.pm=100;s.etat.pm=100;});
  await sheet.getByLabel('Coût en ressource avant effets').fill('+20');
  await sheet.getByRole('button',{name:'Consommer PM',exact:true}).click();assert.equal((await state()).etat.pm,83);
  // Suppressions et poison descriptif, sans dégâts périodiques automatiques.
  await reset();await add('Poison');await add('Burning');await add('Suppression du poison');assert.ok(!(await state()).effetsActifs.some(e=>e.effet==='Poison'));
  await add('Suppression de Burning');assert.equal((await state()).effetsActifs.length,0);
  await reset();await add('Poison');await advance(60);assert.equal((await state()).etat.pv,0);
  // Les maximums permanents sont uniques et ne restaurent pas les points courants.
  await reset();const m=await frame.evaluate(()=>Owd.__calculs.pvMax());await add('Effet du Pacificateur');await add('Effet du Pacificateur');
  assert.equal(await frame.evaluate(()=>Owd.__calculs.pvMax()),m+20);assert.equal((await state()).etat.pv,0);
  // Consommation réelle : propriétés numériques, dose, contenance, effets, préservation des métadonnées.
  await reset();await replace(s=>{s.etat.ps=100;s.etat.ph=100;s.inv.objets=[{ref:'food',nom:'Dose',qte:2,poids:.2,volume:.4,typeObjet:'solide',sousType:'ingerable',nourri:true,places:3,ps:5,ph:8,tempsConsommation:1,effets:['Alerte +1 niveau'],restaurations:{pv:10},unitesRestauration:{pv:'points'},ou:'poches'}];});
  const before=await state();assert.equal(await frame.evaluate(()=>Owd.effets.consomme('food',1)),true);
  let s=await state();assert.equal(s.inv.objets[0].qte,1);assert.equal(s.etat.pv,before.etat.pv+10);assert.equal(s.etat.ps,100);assert.equal(s.etat.ph,100);assert.ok(s.effetsActifs.some(e=>e.effet==='recup-nourriture-ps-1'));assert.ok(s.effetsActifs.some(e=>e.effet==='recup-nourriture-ph-2'));assert.equal(s.etat.contenance,3);assert.equal(s.inv.objets[0].volume,.4);
  assert.equal(await frame.evaluate(()=>Owd.__calculs.effetAlerte()),1);
  const packed=M.stateToAttrs(s,null);delete packed.owd_state;assert.deepEqual(M.attrsToState(packed).effetsActifs,s.effetsActifs);assert.deepEqual(C.rebuild(C.flatten(s)),s);
  await frame.evaluate(()=>Owd.remonte());assert.equal((await state()).effetsActifs[0].reste,60);
  // Interface : la consommation retire la dernière dose, sans laisser une pile fantôme.
  await sheet.locator('.pc-tab').filter({hasText:'Équipement'}).click();await sheet.locator('[data-object-ref="food"]').first().click();
  await sheet.getByRole('button',{name:'Consommer',exact:true}).click();assert.equal((await state()).inv.objets.length,0);
  // Fusion physique sans perdre les anciennes valeurs de réglage.
  await replace(s=>{s.combatModifiers={attaques:{contondant:1,perforant:2,tranchant:3},protections:{},resistances:{}};});
  assert.equal((await state()).combatModifiers.attaques.physique,3);assert.equal((await state()).combatModifiers.legacyPhysique.attaques.perforant,2);
  await replace(s=>{s.combatModifiers={attaques:{},protections:{},resistances:{}};});
  // L'ancien catalogue récupère ses champs techniques sans perdre sa quantité.
  await replace(s=>{s.inv.objets=[{ref:'legacy',id:'boutique:robes-arcane-robe',nom:'Arcane Robe',qte:2,poids:2.5,ou:'poches'}];});
  assert.equal((await state()).inv.objets[0].vet,'hautbas');assert.equal((await state()).inv.objets[0].stats.couts.pm,-16);assert.equal((await state()).inv.objets[0].qte,2);
  // Répartition 80/20, multiplicateur du coup, MOD puis bonus élémentaire.
  const astral=JSON.parse(fs.readFileSync(path.join(root,'docs/data/owd-boutique.json'))).equipements.find(o=>o.nom==='Astral Dagger');
  await replace(s=>{s.effetsActifs=[];s.effetsPermanents={};s.inv.objets=[{...astral,ref:'dagger',qte:1,ou:'mainG',img:''}];s.attaques=[{id:'astral',arme:'dagger'}];});
  await sheet.locator('.pc-tab').filter({hasText:/^Fiche$/}).click();await add('Bénédiction');
  const attack=sheet.locator('[data-module="attaque"] .pc-attaque-card').first();await attack.locator('.pc-attaque-tete').click();
  await attack.locator('.pc-attaque-coup').first().click();let chat=await frame.evaluate(()=>chats[chats.length-1]);
  assert.match(chat,/79 physique/);assert.match(chat,/23 eclair/);
  await frame.evaluate(()=>Owd.effets.ajoute('Imprégnation de foudre supérieure','Test','dagger'));
  await attack.locator('.pc-attaque-coup').first().click();chat=await frame.evaluate(()=>chats[chats.length-1]);assert.match(chat,/49 eclair/);
  // Le don du chat transporte aussi restaurations, effets et répartition.
  await frame.evaluate(()=>{const item={id:'potion-sur-mesure',nom:'Élixir donné',qte:3,typeObjet:'liquide',sousType:'ingerable',effets:['Discipline'],restaurations:{pv:37},unitesRestauration:{pv:'points'},volume:.25,poids:.25};
    const payload=btoa(unescape(encodeURIComponent(JSON.stringify({n:item.nom,q:3,item})))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');__owdOnTake(payload);});
  await sheet.getByRole('button',{name:'Prendre',exact:true}).click();
  const received=(await state()).inv.objets.find(o=>o.nom==='Élixir donné');assert.equal(received.restaurations.pv,37);assert.deepEqual(received.effets,['Discipline']);assert.equal(received.qte,3);
  // Les sous-types de Munition partagent les clés des armes et des carquois.
  await replace(s=>{s.effetsActifs=[];s.inv.objets=[{ref:'bow',nom:'Arc',qte:1,ou:'mainD',arme:{type:'arc-long',attaque:'7',degats:'20',repartition:{physique:100},mains:2}},{ref:'arrow',nom:'Flèche',qte:3,typeObjet:'munition',sousType:'fleche',ou:'poches'}];s.attaques=[{id:'bow-atk',arme:'bow'}];});
  assert.equal((await state()).inv.objets.find(o=>o.ref==='arrow').sousType,'fleches');
  await sheet.locator('[data-module="attaque"] .pc-attaque-tete').first().click();assert.equal(await sheet.locator('.pc-attaque-munition option[value="arrow"]').count(),1);
  // Un objet de taille moyenne occupe UNE accroche ; la taille maximale reste contrôlée.
  await replace(s=>{s.effetsActifs=[];s.inv.objets=[{ref:'bag',nom:'Sac',sac:true,typeObjet:'rangement',sousType:'sac',qte:1,ou:'dos',cap:50,ep:3,tailleInterieure:'Petite',tailleAccroche:'Moyenne'},{ref:'medium',nom:'Arme moyenne',qte:1,taille:'Moyenne',ou:'sacep',dans:'bag',emp:0},{ref:'big',nom:'Grande',qte:1,taille:'Grande',ou:'poches'}];});
  assert.equal(await frame.evaluate(()=>Owd.__calculs.objetEp('sacep',1)),null);
  assert.equal(await frame.evaluate(()=>Owd.__calculs.objetEp('sacep',0).ref),'medium');
  assert.equal(await frame.evaluate(()=>Owd.__calculs.epPermis(JSON.parse(__owdLocalStorage.getItem('owd-perso')).inv.objets.find(o=>o.ref==='big'),'sacep')),false);
  await sheet.locator('.pc-tab').filter({hasText:/^Fiche$/}).click();
  await add('Récupération Nourriture PE III');await add('Discipline');await add('Protection augmentée II');await add('Alerte +2 niveaux');
  for(const night of [true,false]){await frame.evaluate(n=>document.documentElement.classList.toggle('night',n),night);for(let attempt=0;attempt<5;attempt++){try{await sheet.locator('[data-module="effets"]').screenshot({path:'/tmp/effets-'+(night?'night':'day')+'.png'});break;}catch(e){if(attempt===4)throw e;await page.waitForTimeout(150);}}}
  assert.equal(await sheet.locator('[data-module="effets"]').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
  assert.deepEqual(errors,[]);
  console.log('OK récupération discrète, deux sources, expiration/recul, Alerte partiellement automatisée, résistances/coûts, dissipation, poison manuel, permanent unique, consommation UI, sauvegarde/fallback/sync, une accroche par objet et rendu jour/nuit.');
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
