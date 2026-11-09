#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs.readFileSync('src/fiche/socle/150-refresh.js', 'utf8');
const montage = fs.readFileSync('src/fiche/socle/320-montage.js', 'utf8');
const start = source.indexOf('  var refreshEmpreintes = null;');
const end = source.indexOf('\n  // Remplacement d\'état COMPLET', start);
assert.ok(start >= 0 && end > start, 'bloc refresh sélectif absent');
const code = source.slice(start, end);
const calls = [];
const context = {
  enMontage: false,
  state: {
    v: 4, rel: '4.2.2b', portrait: '', name: 'Test',
    pv: 10, caracsBase: { Mind: 10 }, background: 'texte', sansLimite: false
  },
  save() {},
  modulesPersoActifs() { return false; },
  regHors: [],
  regsModules: {
    narration: [], caracs: [], langues: [], initiative: [], tuiles: [], pv: [],
    armescomp: [], comps: [], arts: [], armes: [], armures: [], inv: [],
    perso: [], avantages: [], bg: [], notes: [], jets: [], actions: [],
    modcaracs: [], xpchamps: [], creation: [], mods: [], modules: [], optcomps: []
  },
  compHooks: [], optHooks: [],
  joue(id) { calls.push(id); },
  window: {
    __jjkApplyMode() {},
    JjkSync: { Compact: { stable(value) {
      const stable = v => {
        if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
        if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
        return JSON.stringify(v);
      };
      return stable(value);
    } } }
  }
};
vm.createContext(context);
vm.runInContext(code, context);

// Un refresh demandé PENDANT le montage doit être ignoré : les registres
// sont incomplets jusqu'à ce que tous les modules soient construits.
context.enMontage = true;
context.refresh();
assert.deepEqual(calls, [], 'aucun hook ne doit tourner pendant le montage');
assert.equal(context.refreshEmpreintes, null, 'le montage ne doit pas figer une empreinte partielle');
context.enMontage = false;

// Première passe après montage : toutes les références DOM sont neuves, tous les hooks tournent.
context.refresh();
assert.ok(calls.includes('caracs') && calls.includes('pv') && calls.includes('bg'));

// Une modification des PV ne doit plus relancer les hooks des autres modules.
calls.length = 0;
context.state.pv = 8;
context.refresh();
assert.deepEqual(calls, ['', 'pv']);

// Le background est isolé dans son propre module.
calls.length = 0;
context.state.background = 'nouveau texte';
context.refresh();
assert.deepEqual(calls, ['', 'bg']);

// Une lecture Roll20 identique ne reconstruit aucun module à la cadence 1,2 s.
calls.length = 0;
context.refresh();
assert.deepEqual(calls, [''], 'un état inchangé ne doit rafraîchir que les hooks hors module');

// La sérialisation canonique ignore uniquement l'ordre des clés d'un objet.
calls.length = 0;
context.state.caracsBase = { Body: 10, Mind: 10 };
context.refresh();
assert.deepEqual(calls, ['', 'caracs', 'initiative', 'tuiles', 'modcaracs', 'creation']);
calls.length = 0;
context.state.caracsBase = { Mind: 10, Body: 10 };
context.refresh();
assert.deepEqual(calls, [''], 'un ordre de clés différent ne doit pas déclencher de rafraîchissement');

// Les Arts doivent suivre toutes les clés dont leur liste dépend.
for (const key of ['comps', 'customComps', 'armesComps', 'langues']) {
  assert.ok(context.VUE_DEPENDANCES.arts.includes(key), `Arts doit dépendre de ${key}`);
}

// Un changement de compétence doit bien rejouer le registre Arts.
calls.length = 0;
context.state.comps = { 'Prestance/Aura Farming': { stade: 4, art: { name: 'Aura Farming', desc: 'test' }, techniques: [] } };
context.refresh();
assert.ok(calls.includes('arts'), 'un changement de comps doit rafraîchir les Arts');

// Les clés conservées par le schéma JJK ont toutes une dépendance connue.
assert.equal(context.DEPENDANCES_CONNues.sansLimite, 1);

// Une clé future/inconnue garde le repli prudent : tous les modules sont rafraîchis.
calls.length = 0;
context.state.nouvelleCle = { x: 1 };
context.refresh();
assert.ok(calls.includes('caracs') && calls.includes('pv') && calls.includes('bg'));

// Un remontage complet doit invalider les empreintes du DOM précédent.
assert.match(montage, /refreshEmpreintes\s*=\s*null/);
console.log('OK refresh sélectif : aucun rafraîchissement sans changement, empreintes canoniques, dépendances JJK et repli sûr sur clé inconnue');
