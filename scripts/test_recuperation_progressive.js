'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const M=require('../docs/javascripts/owd-attr-map.js'),C=require('../docs/javascripts/owd-sync.js').Compact;
const catalogue=require('../docs/data/owd-boutique.json');
const rules=JSON.parse(cp.execFileSync('python3',['-c',`import json
from pathlib import Path
from hooks.owd_creation import _temps,_effondrement
s=Path('docs/content/regles/base/capacites-physiques.md').read_text()
print(json.dumps(dict(temps=_temps(s),effondrement=_effondrement(s,[{'cle':k,'libelle':v} for k,v in [('pr','points de repos'),('ps','points de satiété'),('ph','points d’hydratation')]]))))`],{encoding:'utf8'}));
let count=0;const near=(a,b,tol=1.1e-6)=>assert.ok(Math.abs(a-b)<tol,`${a} ≠ ${b}`);
function test(n,f){f();count++;console.log('OK '+n);}
function setup(native=false){
 const state=M.blank(),maxima={pv:100,pe:100,pm:100,pr:100,ps:100,ph:100,pi:100};let id=0,segments=0;
 state.etat={pv:40,pe:40,pm:40,pr:100,ps:100,ph:100,pi:100,expo:0,contenance:0};state.effort='repos';state.temperature=30;
 const temps=structuredClone(rules.temps);if(!native)temps.recuperations=[];
 const ctx={capFirst:s=>s,state,D:()=>({...catalogue,temps}),aClef:(o,k)=>Object.hasOwn(o,k),num:(x,d=0)=>x==null||!Number.isFinite(Number(x))?d:Number(x),snum:x=>Number(x)||0,pnum:x=>Math.max(0,Number(x)||0),clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),pub:(k,n)=>n,uid:()=>String(++id),effDef:()=>rules.effondrement,capDef:k=>({signe:k==='expo'}),equipementsPortes:()=>[],casePermise:()=>false,casesDe:()=>[],invType:()=>'',window:{},hooks:[],effondrementActif:null};
 vm.createContext(ctx);
 for(const f of ['socle/080-calculs-capacites.js','socle/100-calculs-climat.js','fiche/effets.js'])vm.runInContext(fs.readFileSync('src/fiche/'+f,'utf8'),ctx);
 let recup=fs.readFileSync('src/fiche/fiche/recuperation.js','utf8');vm.runInContext(recup.slice(0,recup.indexOf('  // ---- résumé par réserve')),ctx);
 const refresh=fs.readFileSync('src/fiche/socle/150-refresh.js','utf8');vm.runInContext(refresh.slice(refresh.indexOf('  var effVu ='),refresh.indexOf('  var refreshEmpreintes')),ctx);
 Object.assign(ctx,{maxDe:k=>k==='pv'||k==='pe'?Math.floor(maxima[k]*(1-(k==='pv'?0.05:0.1)*ctx.effondrement())):maxima[k],expoMax:()=>100,confort:()=>({bas:28,haut:32}),poidsPorte:()=>0,charge:()=>100,contenancePrise:()=>state.etat.contenance,contenance:()=>40,lireCap:()=>({}),chaine:(l,v)=>v,effetBonusOriginal:ctx.effetBonus});
 const orig=ctx.prochainStopTemps;ctx.prochainStopTemps=(...a)=>{segments++;assert.ok(segments<100000,'Boucle du solveur');return orig(...a);};
 function add(level,reserve='pv',duration=1e9){const r={id:'custom'+(++id),nom:'Test',reserve,niveau:level,actif:true,type:'2h',temps:duration/7200,resteSecondes:duration};ctx.recupCoffre(true).ajouts=(ctx.recupCoffre(false).ajouts||[]).concat(r);return r;}
 function effect(name,duration){return ctx.appliqueEffet(catalogue.effets.find(d=>d.nom===name).id,'Test','',duration);}
 return {ctx,state,maxima,add,effect,segments:()=>segments,advance:s=>ctx.avancerSecondes(s),value:k=>ctx.courant(k)};
}
test('5 / 8 h : round, heure et 9 621 rounds, six décimales',()=>{
 for(const [s,gain] of [[3,0.000521],[3600,0.625],[28863,5.010938]]){const w=setup();w.add(1);w.advance(s);near(w.value('pv'),40+gain);assert.equal(w.segments(),1,'Pas de simulation par round');}
});
test('20 / 8 h : 5 en deux heures sans changer le niveau 4',()=>{const w=setup();w.add(4,'pv',7200);w.advance(14400);assert.equal(w.value('pv'),45);assert.equal(w.ctx.recupAjoutsModule(false).length,0);});
test('fin d’effet à la seconde 1 801 : segment fractionnaire acquis puis arrêt',()=>{const w=setup();w.effect('Récupération (Eau) PE I',1801);w.advance(3600);near(w.value('pe'),40+1801/60);assert.equal(w.state.effetsActifs.length,0);assert.equal(w.segments(),2);});
test('gains et pertes simultanés au maximum : bilan appliqué avant plafonnement',()=>{const w=setup();w.state.etat.pv=null;w.add(5);w.add(-6);w.advance(3600);assert.equal(w.value('pv'),95);});
test('aucun crédit caché au maximum ou sous zéro, perte stoppée à zéro',()=>{
 const w=setup();w.state.etat.pv=99;w.add(5,'pv',7200);w.advance(7200);assert.equal(w.value('pv'),100);w.state.etat.pv=90;w.advance(3600);assert.equal(w.value('pv'),90);
 const v=setup();v.state.etat.pv=1;v.add(-5);v.advance(7200);assert.equal(v.value('pv'),0);
});
test('sauvegarde compacte, rechargement et dépense conservent la fraction',()=>{const w=setup();w.add(1);w.advance(3600);const attrs=C.encode(w.state),s=C.read(attrs).state;assert.equal(s.etat.pv,40.625);const z=setup();Object.assign(z.state,s);z.ctx.bougeReserve('pv',-3);z.advance(3600);assert.equal(z.value('pv'),38.25);});
test('fin de deux effets au même instant : pas de double application',()=>{const w=setup();w.add(5,'pv',1800);w.add(6,'pv',1800);w.advance(3600);assert.equal(w.value('pv'),47.5);assert.equal(w.segments(),2);});
test('franchissement PR : nouvelle récupération PM et nouveau maximum PE immédiatement',()=>{
 const w=setup();w.state.etat.pr=91;w.add(-6,'pr');w.ctx.recupCoffre(true).niveaux={};
 // PM naturel (bonus de repos) sans les autres consommations natives.
 w.ctx.recupListeTemps=()=>w.ctx.recupAjoutsNormalisesModule().concat([{id:'pm:repos',reserve:'pm',niveau:0,categorie:'naturelle',condition:'toujours'}]);
 w.advance(3600);near(w.value('pr'),81);near(w.value('pm'),40+0.9*5/28800*3600);assert.equal(w.ctx.effPartie('pr'),1);assert.equal(w.ctx.maxDe('pe'),90);
});
test('PR en hausse : quitter exactement un seuil reprend le bon niveau naturel',()=>{
 const w=setup();w.state.etat.pr=80;w.add(6,'pr');w.ctx.recupListeTemps=()=>w.ctx.recupAjoutsNormalisesModule().concat([{id:'pm:repos',reserve:'pm',niveau:0,categorie:'naturelle',condition:'toujours'}]);
 w.advance(3600);assert.equal(w.value('pr'),90);near(w.value('pm'),40.625);assert.equal(w.ctx.effPartie('pr'),1);
});
test('événement à temps fractionnaire : une avance égale plusieurs segments sans arrondi intermédiaire',()=>{
 const a=setup(),b=setup();for(const w of [a,b]){w.state.etat.pr=90.123456;w.add(-7,'pr');w.add(5,'pv');}
 a.advance(3600);for(let i=0;i<4;i++)b.advance(900);
 for(const k of ['pv','pr'])near(a.value(k),b.value(k),2e-6);near(a.ctx.horlogeVersSecondes(),3600);assert.ok(a.segments()<10);
});
test('exposition, digestion, alcool et effets simultanés : mêmes résultats en long et court',()=>{
 const a=setup(true),b=setup(true);for(const w of [a,b]){w.state.etat.expo=30;w.state.etat.contenance=43;w.state.effAlcool=2;w.effect('Récupération (Nourriture) PV I',1800);}
 a.advance(7200);for(let i=0;i<24;i++)b.advance(300);
 for(const k of ['pv','pe','pm','pr','ps','ph','expo','contenance'])near(a.value(k)||a.state.etat[k],b.value(k)||b.state.etat[k],2e-5);
 assert.equal(a.state.effAlcool,b.state.effAlcool);assert.ok(a.segments()<100);
});
test('protection thermique expirant sur une échéance : ancien climat jusqu’à cet instant',()=>{
 const w=setup();w.state.temperature=42;w.ctx.paliersClimat=()=>w.state.effetsActifs.length?0:4;w.effect('Protection contre la chaleur (Eau)',600);w.advance(600);assert.equal(w.state.etat.expo,0);w.advance(600);assert.equal(w.state.etat.expo,4);
});
test('recul exact restaure fractions, effets et horloges',()=>{const w=setup(true);w.effect('Récupération (Nourriture) PV I');const before=JSON.stringify(w.ctx.photoTemps());w.advance(28863);w.ctx.reculerSecondes(28863);assert.equal(JSON.stringify(w.ctx.photoTemps()),before);});
test('migration des anciens compteurs sans perte ni double gain',()=>{
 const w=setup();const r=w.add(1);const e=w.ctx.recupEtatTemps(r);w.ctx.recupCoffre(true).suivi={[r.id]:{secondes:3600,signature:w.ctx.recupSignatureTemps(r,e)}};w.ctx.recupSynchroniseSuivi();assert.equal(w.value('pv'),40.625);w.ctx.recupSynchroniseSuivi();assert.equal(w.value('pv'),40.625);
 w.effect('Récupération (Eau) PE I');w.state.effetsActifs[0].suivi=30;w.ctx.recupSynchroniseSuivi();assert.equal(w.value('pe'),40.5);w.ctx.recupSynchroniseSuivi();assert.equal(w.value('pe'),40.5);
});
console.log(count+' scénarios de récupération progressive validés.');
