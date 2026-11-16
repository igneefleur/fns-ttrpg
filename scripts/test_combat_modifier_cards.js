'use strict';
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
function el(tag, classes, text) {
  return {tag, classes: String(classes || '').split(' '), text, children: [], dataset: {}, attrs: {}, events: {},
    appendChild(n) { this.children.push(n); return n; },
    setAttribute(k,v) { this.attrs[k]=v; },
    addEventListener(event,fn) { this.events[event]=fn; }};
}
const ctx = {el, document:{createElementNS:(_,tag)=>el(tag)}, capFirst:t=>t, isEdit:()=>false, siteBase:()=>'/',
  save:()=>{ctx.saves++;}, refresh:()=>{}, saves:0, snum:Number,
  champNombreSigne:i=>i, litNombreSigne:Number,
  state:{combatAffichage:{}, combatModifiers:{attaquesPrimaires:{physique:2}, tauxDegats:{physique:110}, protections:{physique:3}}}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/fiche/fiche/defense.js','utf8'),ctx);
for(const module of ['attaque','defense']) {
  let redraw=0;
  const fermer=()=>ctx.combatModificateurs(module,()=>redraw++);
  const closed=fermer();
  assert.equal(closed.children[0].children[0].attrs['aria-expanded'],'false');
  closed.children[0].children[1].children.at(-1).events.click();
  const opened=fermer();
  assert.equal(opened.children[0].children[0].attrs['aria-expanded'],'true');
  const table=opened.children[1].children[0].children[0], rows=table.children;
  assert.ok(table.classes.includes('pc-attaque-grille-degats'));
  assert.equal(rows[0].children.length,8);
  assert.match(rows[0].children[1].children[0].src,/damage-physique\.png$/);
  assert.deepEqual(rows.slice(1).map(row=>row.children[0].text),module==='attaque'?
    ['Bonus pri.','Mult. att.','Bonus sec.','Mult. dég. %']:['Prot.','Rés. %']);
  if(module==='attaque') {
    const mult=rows[2].children[1].children[0], taux=rows[4].children[1].children[0];
    assert.equal(mult.value,'');
    mult.value='0.2'; mult.events.input();
    assert.equal(ctx.state.combatModifiers.attaquesMultiplicateurs.physique,1.2);
    assert.equal(taux.value,10);
    taux.value='20'; taux.events.input();
    assert.equal(ctx.state.combatModifiers.tauxDegats.physique,120);
    taux.value=''; taux.events.input();
    assert.equal(ctx.combatMod('tauxDegats','physique',100),100);
  }
  opened.children[0].children[0].events.click();
  assert.equal(redraw,2);
  assert.equal(fermer().children.length,1);
}
assert.equal(ctx.saves,3);
console.log('OK modificateurs : tableaux horizontaux, icônes, saisie des bonus et retour au taux neutre');
