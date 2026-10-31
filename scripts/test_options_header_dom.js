'use strict';
// Test de structure de la fiche assemblée : nécessite jsdom et un site construit.
// Les rectangles simulés permettent aux hooks de modules de fonctionner sans moteur de mise en page.
const {JSDOM,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),M=require(root+'/docs/javascripts/owd-attr-map.js');
const seed=M.blank();seed.rel=M.release();seed.name='Personnage test';seed.xpTotal=1250;['Force','Dexterite','Vigueur','Endurance','Resistance','Ferveur','Intelligence','Chance'].forEach(k=>seed.caracs[k]=20);seed.comps=[{id:'lutte',nom:'Lutte',groupe:'Compétences physiques',rang:2}];seed.capsLeviers={max:{force:{pv:200,pe:200,pm:100}}};seed.effAutre=2;seed.inv.objets=[{ref:'objet',nom:'Objet',qte:1,poids:3,ou:'mainD',rapide:true}];seed.modules={place:{techniques:{onglet:'art',colonne:'seule'}}};
const vc=new VirtualConsole(),errors=[];vc.on('jsdomError',e=>{if(e.type!=='css-parsing')errors.push(e.message);});
const dom=new JSDOM('<!doctype html><div id="perso-fiche"></div>',{url:'http://owd.local/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc}),w=dom.window;
w.HTMLElement.prototype.getClientRects=function(){return this.isConnected?[{width:900,height:20}]:[];};
w.localStorage.setItem('owd-perso',JSON.stringify(seed));w.fetch=async()=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(root+'/site/owd-creation-runtime.json','utf8'))});w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};
const css=w.document.createElement('style');css.textContent=fs.readFileSync(root+'/docs/stylesheets/owd-fiche.css','utf8');w.document.head.appendChild(css);
for(const s of ['owd-sync','owd-attr-map','owd-inventaire-data','owd-mods','owd-fiche'])w.eval(fs.readFileSync(root+'/docs/javascripts/'+s+'.js','utf8'));
(async()=>{try{for(let i=0;i<100&&!w.Owd?.__pret;i++)await new Promise(r=>setTimeout(r,10));assert.equal(w.Owd?.__pret,true,w.document.body.textContent.slice(-700));const d=w.document,q=s=>d.querySelector(s),all=s=>[...d.querySelectorAll(s)];
assert.deepEqual(all('.pc-id-progression > .pc-meter > span:first-child').map(n=>n.textContent),['Rupture','XP dépensé']);assert.deepEqual(all('.pc-id-portage > .pc-meter > span:first-child').map(n=>n.textContent),['Charge','Accès rapides']);assert.ok(q('.pc-id-portage').textContent.includes('1 / 4'));
assert.equal(w.getComputedStyle(q('.pc-creation-budget')).display,'none');q('[data-module="caracs"] .pc-gear').click();assert.notEqual(w.getComputedStyle(q('.pc-creation-budget')).display,'none');assert.equal(q('.pc-creation-budget').parentElement.lastElementChild,q('.pc-creation-budget'));
assert.ok(q('.pc-comp-groupe-trait'));assert.deepEqual([w.Owd.__calculs.pvMax(),w.Owd.__calculs.peMax()],[180,160]);
all('.pc-tab').find(n=>n.textContent==='Options').click();assert.equal(q('[data-module="jets"]'),null);assert.equal(q('[data-module="rupture"]'),null);
const art=all('.pc-modgroupe').find(n=>n.textContent==='Art');assert.ok(art.nextElementSibling.textContent.includes('Milieu'));assert.ok(!art.nextElementSibling.textContent.includes('Pleine largeur'));
const opt=q('[data-module="optcomps"]').textContent;assert.ok(!/\bDés\b|Offerts/.test(opt));
const cap=q('[data-module="optcaps"]');assert.ok(cap.textContent.includes('200'));assert.ok(!cap.textContent.includes('180'));
q('.pc-id-xp-total').value='1500';q('.pc-id-xp-total').dispatchEvent(new w.Event('input'));assert.equal(JSON.parse(w.localStorage.getItem('owd-perso')).xpTotal,1500);
assert.deepEqual(errors,[]);console.log('OK DOM réel : en-tête, création en édition, trait, accès rapides, anciens placements Art, options retirées, PV/PE finaux et XP éditable.');
}finally{w.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
