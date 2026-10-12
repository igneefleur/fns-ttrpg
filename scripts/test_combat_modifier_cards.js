'use strict';
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
function el(tag, classes, text) {
  return {
    tag, classes: String(classes || '').split(' ').filter(Boolean), text: text || '', children: [], dataset: {}, attrs: {}, events: {}, type: '', value: '',
    appendChild(n) {this.children.push(n); return n;},
    setAttribute(k,v){this.attrs[k]=v;},
    addEventListener(event, fn){this.events[event]=fn;},
    classList:{add() {},remove() {}}
  };
}
const ctx = {
  el, snum:n=>Number(n)||0, capFirst:t=>t.charAt(0).toUpperCase()+t.slice(1), isEdit:()=>false, save:()=>{ctx.saves++;},refresh:()=>{}, saves:0,
  state:{combatModifiers:{attaques:{feu:2},protections:{feu:3},resistances:{feu:7}}}
};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('src/fiche/fiche/defense.js','utf8'),ctx);
for(const module of ['attaque','defense']) {
  let redraw=0;
  const closed=ctx.combatModificateurs(module,()=>redraw++);
  assert.ok(closed.classes.includes('pc-attaque-card'));
  assert.ok(closed.classes.includes('pc-combat-modificateurs'));
  assert.equal(closed.dataset.combatModifiers,module);
  assert.equal(closed.children.length,1);
  const heading=closed.children[0];
  const button=heading.children[0];
  assert.equal(button.attrs['aria-expanded'],'false');
  assert.match(button.children[0].text,/Modificateurs/);
  heading.children[1].children[0].events.click();
  assert.equal(redraw,1);
  const opened=ctx.combatModificateurs(module,()=>redraw++);
  const table=opened.children[1].children[0];
  assert.ok(opened.children[1].classes.includes('pc-defense-detail'));
  assert.ok(table.classes.includes('pc-defense-valeurs'));
  assert.equal(table.children.length,10); // 1 en-tête + 9 types
  assert.equal(table.children[0].children.length,module==='attaque'?2:3);
  assert.equal(table.children[0].children[0].text,'Type');
  assert.equal(table.children[0].children[1].text,module==='attaque'?'Dégâts':'Protection');
  if(module==='defense')assert.equal(table.children[0].children[2].text,'Résistance');
  const feu=table.children.find(r=>r.dataset.damageType==='feu');
  const input=feu.children[1].children[0].children[0];
  assert.equal(input.tag,'input');
  assert.equal(input.value,module==='attaque'?2:3);
  input.value='-5';input.events.input();
  assert.equal(ctx.state.combatModifiers[module==='attaque'?'attaques':'protections'].feu,-5);
  assert.equal(opened.children[0].children[0].attrs['aria-expanded'],'true');
  opened.children[0].children[0].events.click();
  assert.equal(redraw,2);
  assert.equal(ctx.combatModificateurs(module,()=>{}).children.length,1);
}
assert.equal(ctx.saves,2);
console.log('OK : cartes repliables des deux modules, tableau des défenses, 9 types, saisie et état conservé');
