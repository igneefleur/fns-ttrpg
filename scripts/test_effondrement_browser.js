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
 let text=await active.innerText();assert.match(text,/−3 niveau\(x\).*PE/);assert.match(text,/\+3 niveau\(x\).*PM/);assert.match(text,/−4 de protection contre le froid/);assert.match(text,/−3 pas/);assert.match(text,/−10 % au coût en mana/);assert.match(text,/\+2 à la difficulté/);
 await change("s.effort='sommeil'");text=await active.innerText();assert.doesNotMatch(text,/niveau\(x\).*P[EM]/);assert.match(text,/−2 niveau\(x\).*PH/);
 await eff.getByRole('button',{name:'Désactiver Effondrement',exact:true}).click();assert.equal(await active.isVisible(),false);await eff.getByRole('button',{name:'Désactiver Effondrement',exact:true}).click();
 await change("s.effParties={};s.effAlcool=3;s.horlogeAlcool={jours:0,heures:1,minutes:30,secondes:0};s.effort='repos'");
 await p.evaluate(()=>{Owd.effets.ajoute('Effondrement d’alcool +1','Bière','');Owd.__calculs.avancerSecondes(1800);});assert.equal((await read()).effAlcool,3);assert.equal((await read()).horlogeAlcool.heures,2);assert.match(await eff.getByLabel('Horloge d’alcool').innerText(),/2 h/);
 // La réception d'un état sauvegardé ne répète pas l'avance et conserve la phase.
 await change('');assert.equal((await read()).horlogeAlcool.heures,2);
 await p.evaluate(()=>Owd.__calculs.avancerSecondes(21600));assert.equal((await read()).effAlcool,0);assert.deepEqual((await read()).horlogeAlcool,{jours:0,heures:0,minutes:0,secondes:0});
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
 await p.setViewportSize({width:390,height:850});assert.equal(await eff.evaluate(n=>n.scrollWidth>n.clientWidth+1),false);assert.deepEqual(errors,[]);
 console.log('OK navigateur : 35 conditions naturelles, effets actifs et sommeil, désactivation, alcool et reprise ancienne, vomissement ciblé, petit écran sans débordement.');
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
