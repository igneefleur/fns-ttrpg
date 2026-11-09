'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const AttrMap = require('../docs/javascripts/owd-attr-map.js');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/fiche/socle/235-listes-organisees.js'), 'utf8');
const start = source.indexOf('  function buildListeOrganisee(');
assert.notEqual(start, -1, 'builder commun présent');
const fragment = source.slice(start);

function node(tag, classes, text) {
  const names = new Set(String(classes || '').split(/\s+/).filter(Boolean));
  const result = {
    tagName: String(tag || 'div').toUpperCase(), className: classes || '', textContent: text || '',
    dataset: {}, attributes: {}, children: [], listeners: {}, style: { setProperty(k, v) { this[k] = v; } },
    disabled: false, hidden: false, value: '', parentNode: null,
    classList: {
      add(...items) { items.forEach(x => names.add(x)); result.className = [...names].join(' '); },
      remove(...items) { items.forEach(x => names.delete(x)); result.className = [...names].join(' '); },
      contains(x) { return names.has(x); },
      toggle(x, force) { const on = force === undefined ? !names.has(x) : !!force; if (on) names.add(x); else names.delete(x); result.className = [...names].join(' '); return on; }
    },
    appendChild(child) { child.parentNode = result; result.children.push(child); return child; },
    addEventListener(type, fn) { (result.listeners[type] ||= []).push(fn); },
    setAttribute(k, v) { result.attributes[k] = String(v); },
    getAttribute(k) { return result.attributes[k]; },
    removeAttribute(k) { delete result.attributes[k]; },
    getBoundingClientRect() { return { top: 100, height: 24 }; },
    get isConnected() { return true; }, get offsetParent() { return result; },
    contains(other) { for (let p = other; p; p = p.parentNode) if (p === result) return true; return false; },
    querySelectorAll(selector) {
      const wanted = String(selector).split(',').map(x => x.trim()).filter(x => x.startsWith('.')).map(x => x.slice(1));
      const out = [];
      function walk(parent) { (parent.children || []).forEach(child => { if (wanted.some(c => String(child.className || '').split(/\s+/).includes(c))) out.push(child); walk(child); }); }
      walk(result); return out;
    },
    querySelector(selector) { return result.querySelectorAll(selector)[0] || null; },
    dispatch(type, event = {}) { (result.listeners[type] || []).forEach(fn => fn(Object.assign({ target: result, preventDefault() {}, stopPropagation() {}, clientY: 110 }, event))); },
    click() { if (!result.disabled) result.dispatch('click'); }
  };
  Object.defineProperty(result, 'innerHTML', { get() { return ''; }, set(value) { if (value === '') result.children = []; } });
  return result;
}
function all(nodeValue, className) {
  const out = [];
  function walk(n) { if (String(n.className || '').split(/\s+/).includes(className)) out.push(n); (n.children || []).forEach(walk); }
  walk(nodeValue); return out;
}
function first(nodeValue, className) { return all(nodeValue, className)[0] || null; }
function text(nodeValue) { return String(nodeValue && nodeValue.textContent || ''); }

function context(state) {
  let serial = 0, saves = 0;
  const ctx = {
    state,
    window: { addEventListener() {}, __owdApplyMode() {} },
    document: { activeElement: null, querySelector() { return null; } },
    hooks: [], remontageNettoyage: [],
    el: (tag, cls, label) => node(tag, cls, label),
    block(title) { const b = node('div', 'pc-block'); b.appendChild(node('div', 'pc-block-title', title)); return b; },
    miniBtn(label, title, fn, cls) { const b = node('button', 'pc-mini ' + (cls || ''), label); b.type = 'button'; b.title = title || ''; b.addEventListener('click', fn || (() => {})); return b; },
    uid(prefix) { return prefix + (++serial).toString(36); },
    save() { saves++; },
    refresh() { saves++; ctx.hooks.forEach(fn => fn()); },
    confirmer(_title, _message, _label, fn) { fn(); },
    ficheModifiable() { return true; },
    notesRendu(target, value, mode) { target.textContent = value; target.dataset.format = mode; },
    get saves() { return saves; }
  };
  vm.createContext(ctx);
  vm.runInContext(fragment, ctx, { filename: '235-listes-organisees.js' });
  return ctx;
}

let count = 0;
function test(label, fn) { fn(); console.log('OK ' + label); count++; }

const base = { notes: { format: 1, messages: [{ id: 'journal-1', text: 'Ancien journal' }] }, recettes: [], notesOrganisees: [] };
const ctx = context(base);

function panes(rootNode) { return all(rootNode, 'pc-tech-pane'); }
function gear(pane) { return first(pane, 'pc-tech-pane-gear'); }
function addButtons(pane) { return all(pane, 'pc-tech-add'); }

const recettes = ctx.buildRecettes();
test('Recettes : trois colonnes avec les intitulés attendus', () => {
  const p = panes(recettes);
  assert.equal(p.length, 3);
  assert.deepEqual(p.map(x => text(first(x, 'pc-tech-pane-title').children[0])), ['Catégories', 'Recettes', 'Entrées']);
});
test('Recettes : états vides correctement accordés dans les trois colonnes', () => {
  const p = panes(recettes);
  assert.deepEqual(p.map(x => text(first(x, 'pc-empty'))), ['Aucune catégorie.', 'Aucune recette.', 'Aucune entrée.']);
});
test('Recettes : création indépendante catégorie > recette > entrée', () => {
  const p = panes(recettes);
  gear(p[0]).click(); addButtons(p[0]).find(x => text(x).includes('Catégorie')).click();
  assert.equal(base.recettes.length, 1);
  const categoryRow = first(panes(recettes)[0], 'pc-tech-item');
  assert.equal(categoryRow.children[3].title, 'Supprimer cette catégorie');
  assert.equal(categoryRow.children[0].title, 'Glisser pour réordonner les catégories');
  assert.equal(text(first(panes(recettes)[1], 'pc-empty')), 'Aucune recette.');
  gear(panes(recettes)[1]).click();
  addButtons(panes(recettes)[1]).find(x => text(x).includes('Recette')).click();
  assert.equal(base.recettes[0].elements.length, 1);
  const recipeRow = first(panes(recettes)[1], 'pc-tech-item');
  assert.equal(recipeRow.children[3].title, 'Supprimer cette recette');
  assert.equal(recipeRow.children[0].title, 'Glisser pour réordonner ou déplacer vers une autre catégorie');
  assert.equal(text(first(panes(recettes)[2], 'pc-empty')), 'Aucune entrée.');
  gear(panes(recettes)[2]).click(); addButtons(panes(recettes)[2]).find(x => text(x).includes('Entrée')).click();
  assert.equal(base.recettes[0].elements[0].entrees.length, 1);
  assert.equal(base.recettes[0].elements[0].entrees[0].nom, '');
  assert.equal(base.recettes[0].elements[0].entrees[0].desc, '');
});
test('Recettes : une entrée possède uniquement nom, description et format', () => {
  const entree = base.recettes[0].elements[0].entrees[0];
  assert.deepEqual(Object.keys(entree).sort(), ['desc', 'id', 'mode', 'nom']);
  const card = first(recettes, 'pc-catalog-entry');
  const name = first(card, 'pc-catalog-entry-name');
  const editor = first(card, 'pc-tech-rank-editor');
  name.value = 'Potion de soin'; name.dispatch('input');
  editor.value = 'Rend **10 PV**.'; editor.dispatch('input');
  assert.equal(entree.nom, 'Potion de soin');
  assert.equal(entree.desc, 'Rend **10 PV**.');
});
test('Recettes : mode Markdown partagé et rendu de description', () => {
  const entree = base.recettes[0].elements[0].entrees[0];
  const modes = first(recettes, 'pc-notes-modes');
  const markdown = modes.children.find(x => text(x) === 'Markdown');
  markdown.click();
  assert.equal(entree.mode, 'markdown');
  assert.equal(first(recettes, 'pc-tech-rank-read').dataset.format, 'markdown');
});
test('Recettes : changer de catégorie ferme les éditions liées aux colonnes dépendantes', () => {
  base.recettes.push({ id: 'lg-other', nom: 'Autre catégorie', elements: [] });
  ctx.refresh();
  const reads = all(recettes, 'pc-tech-item-read');
  reads[1].click();
  const current = panes(recettes);
  assert.equal(current[1].classList.contains('editing'), false);
  assert.equal(current[2].classList.contains('editing'), false);
  assert.equal(gear(current[2]).disabled, true, 'aucune entrée sélectionnée dans cette catégorie');
});

test('Notes : trois colonnes indépendantes avec les intitulés attendus', () => {
  const notes = ctx.buildNotesOrganisees();
  const p = panes(notes);
  assert.equal(p.length, 3);
  assert.deepEqual(p.map(x => text(first(x, 'pc-tech-pane-title').children[0])), ['Dossiers', 'Notes', 'Entrées']);
  assert.deepEqual(p.map(x => text(first(x, 'pc-empty'))), ['Aucun dossier.', 'Aucune note.', 'Aucune entrée.']);
  gear(p[0]).click(); addButtons(p[0]).find(x => text(x).includes('Dossier')).click();
  assert.equal(text(first(panes(notes)[1], 'pc-empty')), 'Aucune note.');
  gear(panes(notes)[1]).click(); addButtons(panes(notes)[1]).find(x => text(x).includes('Note')).click();
  assert.equal(text(first(panes(notes)[2], 'pc-empty')), 'Aucune entrée.');
  gear(panes(notes)[2]).click(); addButtons(panes(notes)[2]).find(x => text(x).includes('Entrée')).click();
  assert.equal(base.notesOrganisees.length, 1);
  assert.equal(base.notesOrganisees[0].elements[0].entrees.length, 1);
  assert.equal(base.notes.messages[0].text, 'Ancien journal', 'le journal historique reste intact');
});
test('Arts : messages vides simples et correctement accordés dans les trois colonnes', () => {
  const arts = fs.readFileSync(path.join(root, 'src/fiche/art/techniques.js'), 'utf8');
  assert.match(arts, /"Aucun art\."/);
  assert.equal((arts.match(/"Aucune technique\."/g) || []).length, 2);
  assert.match(arts, /"Aucun rang\."/);
  assert.doesNotMatch(arts, /Sélectionnez ou créez un art|Sélectionnez ou créez une technique|Sélectionnez un art puis une technique/);
  assert.doesNotMatch(arts, /rang\(s\) acquis|technique\(s\)\./);
});
test('Titres d’onglets, ordre, module Journal et stockage sont déclarés', () => {
  const tabs = fs.readFileSync(path.join(root, 'src/fiche/socle/200-onglets.js'), 'utf8');
  const expected = ['Fiche', 'Recettes', 'Arts', 'Équipement', 'Bio', 'Notes', 'Options'];
  const at = expected.map(x => tabs.indexOf('label: "' + x + '"'));
  assert.ok(at.every((x, i) => x >= 0 && (!i || x > at[i - 1])));
  const native = fs.readFileSync(path.join(root, 'src/fiche/socle/270-modules-natifs.js'), 'utf8');
  assert.match(native, /id: "notes",\s+titre: "JOURNAL",\s+onglet: "bio"/);
  assert.match(native, /id: "notesOrganisees",\s+titre: "NOTES",\s+onglet: "notes"/);
  assert.match(fs.readFileSync(path.join(root, 'src/fiche/bio/notes.js'), 'utf8'), /block\('Journal'\)/);
  assert.match(fs.readFileSync(path.join(root, 'src/fiche/socle/120-persistance.js'), 'utf8'), /recettes:\['recettes'\],notesOrganisees:\['notesOrganisees'\]/);
  const attrMap = fs.readFileSync(path.join(root, 'docs/javascripts/owd-attr-map.js'), 'utf8');
  assert.match(attrMap, /\[\"recettes\", \"recettes\"\], \[\"notesOrganisees\", \"notes_organisees\"\]/);
  assert.match(fs.readFileSync(path.join(root, 'src/fiche/socle/040-etat-defaut.js'), 'utf8'), /recettes: \[\], notesOrganisees: \[\]/);
  assert.match(fs.readFileSync(path.join(root, 'src/fiche/socle/060-etat-normalise.js'), 'utf8'), /s\.recettes = normaliseListeOrganisee\(s\.recettes/);
  const blank = AttrMap.blank();
  assert.deepEqual(blank.recettes, []);
  assert.deepEqual(blank.notesOrganisees, []);
  const source = fs.readFileSync(path.join(root, 'src/fiche/socle/060-etat-normalise.js'), 'utf8');
  const normStart = source.indexOf('    function normaliseListeOrganisee(');
  const normEnd = source.indexOf('    s.recettes = normaliseListeOrganisee', normStart);
  const normCtx = { uid: (prefix => { let i = 0; return p => p + (++i); })() };
  vm.createContext(normCtx);
  vm.runInContext(source.slice(normStart, normEnd), normCtx);
  const normalized = normCtx.normaliseListeOrganisee([{ id: 'g', nom: 'Potions', elements: [{ id: 'r', nom: 'Soin', entrees: [{ id: 'e', nom: 'Simple', desc: '**Eau**', mode: 'markdown', xp: 50, rupture: 2 }] }] }], 'lg');
  assert.equal(normalized[0].elements[0].entrees[0].desc, '**Eau**');
  assert.deepEqual(Object.keys(normalized[0].elements[0].entrees[0]).sort(), ['desc', 'id', 'mode', 'nom']);
  const attrs = AttrMap.stateToAttrs(Object.assign(blank, { recettes: normalized, notesOrganisees: [{ id: 'd', nom: 'Dossier', elements: [] }] }));
  const roundTrip = AttrMap.attrsToState(attrs);
  assert.equal(JSON.stringify(roundTrip.recettes), JSON.stringify(normalized));
  assert.equal(roundTrip.notesOrganisees[0].nom, 'Dossier');
});

console.log('TOTAL ' + count + ' scénarios validés');
