/* Fiche complète dans Chromium : effets actifs, horloge et ingestion. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright'),M=require('../docs/javascripts/owd-attr-map.js');
const root=path.resolve(__dirname,'..');
function html(){const s=M.blank();s.effort='repos';s.etat.pr=null;s.etat.ps=null;s.etat.ph=null;s.etat.pi=null;const manifest=JSON.parse(fs.readFileSync('docs/owd-manifeste.json'));return `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/stylesheets/owd-fiche.css"></head><body><div id="perso-fiche"></div><script>window.__owdDataUrl='/owd-creation.json';var mem={'owd-perso':JSON.stringify(${JSON.stringify(s)})};window.__owdLocalStorage={getItem:k=>mem[k]||null,setItem:(k,v)=>mem[k]=v,removeItem:k=>delete mem[k]};</script>${manifest.bundle.js.map(f=>'<script src="/'+f+'"></script>').join('')}</body></html>`;}
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://local');if(u.pathname==='/fixture'){res.setHeader('Content-Type','text/html');return res.end(html());}let f=path.join(root,'docs',u.pathname);if(!fs.existsSync(f))f=path.join(root,'site',u.pathname);if(!fs.existsSync(f)){res.statusCode=404;return res.end();}res.setHeader('Content-Type',({'.js':'application/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const p=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port+'/fixture');await p.waitForFunction(()=>window.Owd&&Owd.__pret);
 const read=()=>p.evaluate(()=>JSON.parse(__owdLocalStorage.getItem('owd-perso')));
 async function change(code){await p.evaluate(code=>{const s=JSON.parse(__owdLocalStorage.getItem('owd-perso'));new Function('s',code)(s);Owd.__recoitEtat(s);},code);}
 const eff=p.locator('[data-module="effondrement"]'),active=eff.getByLabel('Effets d’effondrement appliqués');
 assert.equal(await p.locator('[data-module="recuperation"] .pc-rec-row:not(.head)').count(),35);assert.equal(await active.isVisible(),false);
 await change("s.effParties={pr:{mod:3},ps:{mod:2},ph:{mod:1},charge:{mod:2},contenance:{mod:1},froid:{mod:4},chaud:{mod:5}};s.effAlcool=2");
 const disposition=await eff.evaluate(n=>{
   const rect=e=>e.getBoundingClientRect();
   const effets=n.querySelector('.pc-eff-actifs');
   const commandes=n.querySelector('.pc-eff-commandes');
   const jauge=n.querySelector('.pc-eff-global-jauge');
   const exposition=document.querySelector('.pc-expo-stats');
   const [ideal,thermique]=exposition.children;
   const cadreExpo=rect(exposition.parentElement), statExpo=rect(exposition);
   const retraitStandard=parseFloat(getComputedStyle(document.querySelector('[data-module="pv"] .pc-vital-cmd')).paddingLeft);
   const cellules=[...exposition.querySelectorAll('.pc-stat > .c'),
     ...document.querySelectorAll('.pc-mouv-dist > .c')];
   const [arreter,pauser]=commandes.children;
   return {
     jauge:jauge.nextElementSibling.matches('.pc-vital-taux') && !n.querySelector('.pc-eff-global-valeur').matches('input'),
     taux:[...jauge.nextElementSibling.children].map(e=>e.textContent),
     hauteurs:cellules.map(e=>rect(e).height),
     exposition:[ideal.children.length,thermique.children.length,rect(thermique).top-rect(ideal).bottom],
     margesExpo:[statExpo.left-cadreExpo.left,cadreExpo.right-statExpo.right,
       retraitStandard],
     effets:[effets.children.length,rect(effets).top>=rect(commandes).bottom],
     commandes:[rect(arreter).width-rect(pauser).width,rect(arreter).height-rect(document.querySelector('.pc-temps-appliquer')).height]
   };
 });
 assert.ok(disposition.jauge);
 assert.deepEqual(await eff.locator('.pc-eff-global-jauge .pc-vital-palier').evaluateAll(ns=>ns.map(n=>n.style.left)),
   ['10%','20%','30%','40%','50%','60%','70%','80%','90%']);
 assert.equal(await p.locator(':is([data-module="pv"],[data-module="pe"],[data-module="pm"],[data-module="pc"]) .pc-vital-palier').count(),0);
 const ecarts=await p.evaluate(()=>{
   const effort=[...document.querySelectorAll('[data-module="effort"] .pc-effort-section')];
   const survie=[...document.querySelectorAll('[data-module="survie"] .pc-vital-res')];
   function retraits(groupes,selecteur) {
     return groupes.slice(1).map((g,i)=>g.querySelector(selecteur).getBoundingClientRect().top-
       groupes[i].getBoundingClientRect().bottom);
   }
   return [...retraits(effort,'.pc-block-title'),...retraits(survie,'.pc-block-title')];
 });
 assert.ok(ecarts.length===4 && ecarts.every(x=>Math.abs(x-ecarts[0])<.6));
 assert.equal(await eff.locator('.pc-eff-global-jauge > i').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(0, 0, 0)');
 assert.match(disposition.taux[0],/^PV [0-9]+ %$/);
 assert.match(disposition.taux[1],/^PE [0-9]+ %$/);
 assert.ok(disposition.hauteurs[0]>0 && disposition.hauteurs.every(h=>Math.abs(h-disposition.hauteurs[0])<.5));
 assert.deepEqual(disposition.exposition,[1,2,0]);
 const [retraitGauche,retraitDroit,retraitStandard]=disposition.margesExpo;
 assert.ok(retraitStandard>0 && [retraitGauche,retraitDroit].every(n=>Math.abs(n-retraitStandard)<.5));
 assert.ok(disposition.effets[0]>1);assert.equal(disposition.effets[1],true);
 assert.ok(disposition.commandes.every(n=>Math.abs(n)<.5));
 await eff.screenshot({path:'/tmp/owd-effondrement-4.12.png'});
 let text=await active.innerText();assert.match(text,/−3 niveau\(x\).*PE/);assert.match(text,/\+3 niveau\(x\).*PM/);assert.match(text,/−4 de protection contre le froid/);assert.match(text,/−3 pas/);assert.match(text,/−10 % au coût en mana/);assert.match(text,/\+2 à la difficulté/);
 await change("s.effort='sommeil'");text=await active.innerText();assert.doesNotMatch(text,/niveau\(x\).*P[EM]/);assert.match(text,/−2 niveau\(x\).*PH/);
 await eff.getByRole('button',{name:'Désactiver',exact:true}).click();assert.equal(await active.isVisible(),false);await eff.getByRole('button',{name:'Désactiver',exact:true}).click();
 await change("s.effParties={};s.effAlcool=3;s.horlogeAlcool={jours:0,heures:1,minutes:30,secondes:0};s.effort='repos'");
 await p.evaluate(()=>{Owd.effets.ajoute('Effondrement d’alcool +1','Bière','');Owd.__calculs.avancerSecondes(1800);});assert.equal((await read()).effAlcool,3);assert.equal((await read()).horlogeAlcool.heures,2);assert.equal(await eff.getByLabel('Horloge d’alcool').count(),0);
 // La réception d'un état sauvegardé ne répète pas l'avance et conserve la phase.
 await change('');assert.equal((await read()).horlogeAlcool.heures,2);
 await p.evaluate(()=>Owd.__calculs.avancerSecondes(21600));assert.equal((await read()).effAlcool,0);assert.deepEqual((await read()).horlogeAlcool,{jours:0,heures:0,minutes:0,secondes:0});
 const gearEff=eff.getByRole('button',{name:'Modifier Effondrement',exact:true});
 const atrPv=eff.getByLabel('Effondrement — PV ATR (%)',{exact:true});
 assert.equal(await atrPv.isVisible(),false);
 await gearEff.click();
 assert.equal(await atrPv.getAttribute('placeholder'),'±');
 await atrPv.fill('-10');
 assert.equal((await read()).modData.reservesVitales.eff_pv,-10);
 await atrPv.fill('');
 await gearEff.click();
 const contenance=p.getByLabel('Contenance actuelle',{exact:true});
 await contenance.fill('2,5');
 assert.ok(await contenance.evaluate(n=>{
   const s=getComputedStyle(n), max=n.nextElementSibling.getBoundingClientRect(), valeur=n.getBoundingClientRect();
   return s.outlineStyle==='none' && s.boxShadow==='none' && s.borderTopWidth==='0px' &&
     max.top>=valeur.bottom && Math.abs((max.left+max.right)-(valeur.left+valeur.right))<1;
 }));
 assert.equal((await read()).etat.contenance,2.5);
 await contenance.fill('0');
 // Coûts visibles et Appliquer : l’entrée est le coût avant réduction.
 await change("s.effParties={};s.effAlcool=2;s.inv.objets=[{ref:'speedblade',nom:'Test',typeObjet:'arme',qte:1,ou:'mainD',stats:{vitesse:12,couts:{pv:-20,pe:25,pm:-20}}}];s.etat.pv=100;s.etat.pe=100;s.etat.pm=100;s.allure='leger'");
 for (const [k,pct,cost] of [['pv',80,10],['pe',125,16],['pm',70,9]]) {
  const mod=p.locator('[data-module="'+k+'"]');
  const taux=mod.locator('.pc-vital-taux');
  assert.deepEqual(await taux.locator('.pc-info').allInnerTexts(),['PERTE '+pct+' %','GAIN 100 %']);
  assert.ok(await taux.evaluate(n=>{
    const [perte,gain]=n.children, jauge=n.previousElementSibling, commande=n.nextElementSibling.nextElementSibling;
    const rect=e=>e.getBoundingClientRect(), proche=(a,b)=>Math.abs(a-b)<.6;
    return jauge.matches('.pc-vital-jauge') && commande.matches('.pc-vital-cmd') &&
      proche(rect(jauge).bottom,rect(n).top) && rect(n).bottom<=rect(commande).top+.6 &&
      proche(rect(perte).width,rect(gain).width);
  }));
  const appliquer=mod.getByRole('button',{name:'Appliquer',exact:true});
  await mod.locator('.pc-vital-delta').fill('-13.4');await appliquer.click();
  assert.equal((await read()).etat[k],100-cost);
  const sources=mod.locator('.pc-vital-detail-taux');
  assert.equal(await sources.isVisible(),false);
  await mod.getByRole('button',{name:'Modifier '+k.toUpperCase(),exact:true}).click();
  assert.equal(await sources.isVisible(),true);
  assert.ok(await sources.evaluate(n=>{
    const [perte,gain]=n.children, [totalPerte,totalGain]=n.parentElement.previousElementSibling.children;
    const proche=(a,b)=>Math.abs(a-b)<.6;
    return [[perte,totalPerte],[gain,totalGain]].every(([g,t])=>{
      const cellules=[...g.children];
      return proche(g.getBoundingClientRect().left,t.getBoundingClientRect().left) &&
        proche(g.getBoundingClientRect().width,t.getBoundingClientRect().width) &&
        cellules.length===3 && cellules[2].matches('input') &&
        cellules.slice(0,2).every(cellule=>/^[+−]?[0-9.]+$/.test(cellule.textContent) &&
          cellule.textContent!=='+0');
    });
  }));
  await mod.getByLabel(k.toUpperCase()+' — Gain ATR (%)',{exact:true}).fill('20');
  assert.equal(await taux.locator('.pc-info').last().innerText(),'GAIN 120 %');
  await mod.locator('.pc-vital-delta').fill('+10');await appliquer.click();
  assert.equal((await read()).etat[k],112-cost);
 }
 assert.equal(await p.locator('.pc-vital-taux').count(),9);
 const hydratation=p.getByRole('button',{name:'Modifier Hydratation',exact:true});
 assert.ok(await hydratation.evaluate(g=>{
   const chiffres=g.parentElement.querySelector('.pc-vital-val').getBoundingClientRect();
   const rouage=g.getBoundingClientRect();
   return rouage.top<chiffres.top && Math.abs(rouage.right-chiffres.right)<.6 &&
     getComputedStyle(g).position==='absolute';
 }));
 const survie=p.locator('[data-module="survie"]');
 const bordSurvie=()=>survie.evaluate(n=>getComputedStyle(n).borderTopColor);
 const bordRepos=await bordSurvie();
 await hydratation.click();
 assert.notEqual(await bordSurvie(),bordRepos);
 const repos=survie.getByRole('button',{name:'Modifier Repos',exact:true});
 await repos.click();
 await hydratation.click();
 assert.notEqual(await bordSurvie(),bordRepos,'Le contour reste doré si un autre rouage est ouvert');
 await repos.click();
 assert.equal(await bordSurvie(),bordRepos);
 assert.equal(await p.locator('[data-module="pm"] .pc-vital-sacrifice .pc-info').innerText(),'SACRIFICE');
 await p.locator('[data-module="pm"]').screenshot({path:'/tmp/owd-consommation-4.12.png'});
 const movement=p.locator('[data-module="mouvement"]');const speedSteps=Number(await movement.locator('.pc-mouv-dist .c').first().locator('.v').innerText());
 await change("s.inv.objets[0].stats.vitesse=9");assert.equal(Number(await movement.locator('.pc-mouv-dist .c').first().locator('.v').innerText()),speedSteps-1);
 const distances=await movement.locator('.pc-mouv-dist .v').allTextContents();assert.match(distances[1],/^\d+$/);assert.match(distances[2],/^\d+(?:[.,]\d)?$/);
 await change("s.inv.objets=[];s.effAlcool=0");
 // Consommation réelle : nourriture puis potion, catégories persistantes.
 const catalogue=JSON.parse(fs.readFileSync('site/owd-creation.json')).consommables;
 const samples=[catalogue.find(o=>o.effets.some(id=>id.startsWith('Récupération Nourriture'))),catalogue.find(o=>o.effets.some(id=>id.startsWith('Récupération Potion')))];
 for(const [i,item] of samples.entries()){
  await p.evaluate(({item,i})=>{const s=JSON.parse(__owdLocalStorage.getItem('owd-perso'));s.effetsActifs=[];s.inv.objets=[{...item,ref:'sample'+i,qte:1}];Owd.__recoitEtat(s);Owd.effets.consomme('sample'+i,1,'');},{item,i});
  assert.ok((await read()).effetsActifs.length>0);assert.ok((await read()).effetsActifs.every(e=>e.categorie==='digestive'));
  await change('');assert.ok((await read()).effetsActifs.every(e=>e.categorie==='digestive'));
  await p.locator('[data-module="contenance"]').getByRole('button',{name:'Vomir',exact:true}).click();assert.equal((await read()).effetsActifs.length,0);
 }
 // Reprise d'un ancien compteur et des effets temporaires d'alcool.
 await change("s.effAlcool=1;s.effAlcoolSecondes=5400;s.horlogeAlcool={jours:0,heures:0,minutes:0,secondes:0};s.effetsActifs=[{id:'old',effet:'Effondrement d’alcool +1',source:'Bière',actif:true,duree:7200,reste:7000}]");assert.equal((await read()).effAlcool,2);assert.equal((await read()).horlogeAlcool.minutes,30);assert.equal((await read()).effetsActifs.length,0);
 await change("s.effAlcool=0;s.effetsActifs=[{id:'pausedAlcohol',effet:'Effondrement d’alcool +1',actif:false,duree:7200,reste:6000}]");assert.equal((await read()).effAlcool,0);assert.equal((await read()).effetsActifs[0].actif,false);
 await change("s.effAlcool=0;s.effetsActifs=[{id:'food',effet:'Récupération Nourriture PV V',categorie:'digestive',source:'Repas',actif:true,reste:7200},{id:'spell',effet:'Réduction du coût en mana',categorie:'speciale',source:'Sort',actif:true,reste:60}];s.etat.contenance=10;s.etat.pv=20");
 await p.locator('[data-module="contenance"]').getByRole('button',{name:'Vomir',exact:true}).click();let s=await read();assert.equal(s.etat.contenance,0);assert.equal(s.etat.pv,20);assert.deepEqual(s.effetsActifs.map(e=>e.id),['spell']);
 const positions=await p.evaluate(()=>{
   const normal=document.querySelector('[data-module="comps"] > .pc-block-title > .pc-gear');
   const barre=document.querySelector('[data-module="pv"] .pc-vital-tete > .pc-gear');
   return [normal,barre].map(g=>{
     const module=g.closest('.pc-block').getBoundingClientRect(), r=g.getBoundingClientRect();
     return [r.top-module.top,module.right-r.right];
   });
 });
 assert.ok(positions[0].every((v,i)=>Math.abs(v-positions[1][i])<.6));
 await change("s.capsLeviers={max:{force:{pe:0}}}");
 assert.ok(await p.getByText("Points d'endurance au maximum de zéro : le personnage est inconscient.",{exact:true}).isVisible());
 assert.doesNotMatch(await p.locator('[data-module="pe"]').innerText(),/inconscient/i);
 await p.setViewportSize({width:390,height:850});assert.equal(await eff.evaluate(n=>n.scrollWidth>n.clientWidth+1),false);assert.deepEqual(errors,[]);
 console.log('OK navigateur : 35 conditions naturelles, effets actifs et sommeil, désactivation, alcool et reprise ancienne, vomissement ciblé, petit écran sans débordement.');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
