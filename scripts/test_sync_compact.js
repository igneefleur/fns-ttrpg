'use strict';
const assert = require('node:assert/strict');
global.window = global;
const JjkSync = require('../src/synchronisation/jjk-sync.js');
global.JjkSync = JjkSync;
const M = require('../docs/javascripts/jjk-attr-map.js');
const stable = JjkSync.Compact.stable;
const clone = x => JSON.parse(JSON.stringify(x));
const attr = value => ({ current: JSON.stringify(value), max: '' });
function stateBase() {
  const s = M.blank();
  s.v = 4; s.rel = '4.0.0b'; s.name = 'Migration JJK';
  s.pv = 17; s.xpTotal = 35;
  s.inv.objets = [{ ref: 'objet-a', id: 'id-metier-a', nom: 'Corde', qte: 2,
    poids: 1, img: '', desc: '', groupe: 0, dans: null, ou: 0 }];
  s.notesJournal = { format: 1, messages: [{ id: 'n1', at: 100, text: 'Conserver', mode: 'markdown' }] };
  return s;
}

// Une fiche complète conserve les valeurs et les identifiants métier après encodage.
const original = stateBase();
const encoded = M.compactAttrs(original);
const snap = JjkSync.Compact.snapshot(encoded);
assert.equal(stable(snap.state), stable(original));
assert.equal(snap.state.inv.objets[0].id, 'id-metier-a');
assert.equal(snap.state.inv.objets[0].ref, 'objet-a');
assert.equal(snap.state.notesJournal.messages[0].text, 'Conserver');
assert.ok(encoded.jjk_storage && Object.keys(encoded).some(k => k.startsWith('jjk_block_')));
console.log('OK Compact : fiche entière, inventaire et Notes restitués sans perte');

const emptyReserveState = clone(original); emptyReserveState.etat = {};
assert.equal(stable(JjkSync.Compact.snapshot(JjkSync.Compact.encode(emptyReserveState)).state),
  stable(emptyReserveState), 'un registre de réserves vide doit rester présent après photographie');
console.log('OK photographie : propriétés vides et registres de réserves conservés');

// La migration démarre depuis un état legacy, puis la relecture confirme le socle.
const legacyAttrs = M.stateToAttrs(original, null);
const migration = new JjkSync.Compact.Session(legacyAttrs, original, () => 1000,
  { id: 'migration-test', actor: { id: 'migration-test' } });
assert.equal(migration.hasBase, false);
const migrationAttrs = clone(migration.migration);
assert.equal(stable(JjkSync.Compact.snapshot(migrationAttrs).state), stable(original));
const confirmation = migration.receive(migrationAttrs);
assert.equal(migration.hasBase, true);
assert.equal(stable(confirmation.state), stable(original));
console.log('OK migration : jjk_state legacy -> photographie Compact vérifiée');

// Une modification faite PENDANT l'écriture de la photographie ne doit pas
// réécrire ses blocs immuables. Elle reste en attente et part ensuite comme
// opération, exactement comme dans OWD.
const preAck = new JjkSync.Compact.Session(legacyAttrs, original, () => 1500,
  { id: 'pre-ack-test', actor: { id: 'pre-ack-test' } });
const preAckSnapshot = clone(preAck.migration);
const editedBeforeAck = clone(original); editedBeforeAck.pv = 8; editedBeforeAck.xpTotal = 41;
preAck.capture(editedBeforeAck);
assert.equal(stable(preAck.migration), stable(preAckSnapshot),
  'la photographie de migration doit rester immuable avant son accusé');
assert.equal(Object.keys(preAck.outgoing()).length, Object.keys(preAckSnapshot).length,
  'avant confirmation, seuls les blocs de la photographie sont envoyés');
const preAckResult = preAck.receive(preAckSnapshot);
assert.equal(preAck.hasBase, true);
assert.equal(preAckResult.state.pv, 8, 'la modification pré-ack doit rester visible après fusion locale');
assert.equal(preAckResult.state.xpTotal, 41);
const preAckOps = preAck.outgoing();
assert.equal(Object.keys(preAckOps).length, 1,
  'les modifications pré-ack doivent sortir ensuite sous forme de journal');
const preAckOp = Object.values(preAckOps)[0];
const preAckJournal = 'jjk_ops_pre_ack_' + JjkSync.Compact.hash(JSON.stringify({ epoch: preAck.epoch, ops: [preAckOp] }));
const preAckServer = Object.assign({}, preAckSnapshot, { [preAckJournal]: attr({ epoch: preAck.epoch, ops: [preAckOp] }) });
const preAckConfirmed = preAck.receive(preAckServer);
assert.equal(preAckConfirmed.state.pv, 8);
assert.equal(preAckConfirmed.state.xpTotal, 41);
assert.equal(Object.keys(preAck.pending).length, 0,
  'les opérations pré-ack sont retirées uniquement après relecture');
console.log('OK migration concurrente : photographie immuable, changements pré-ack journalisés puis confirmés');

// Une modification de bloc produit un journal ciblé, pas une réécriture de la base.
const changed = clone(original); changed.pv = 12;
migration.capture(changed);
const outgoing = migration.outgoing();
const opIds = Object.keys(outgoing);
assert.equal(opIds.length, 1);
const op = outgoing[opIds[0]];
assert.ok(op.changes.some(c => JSON.parse(c.k).some(seg => seg[1] === 'pv')));
const journalName = 'jjk_ops_test_' + JjkSync.Compact.hash(JSON.stringify({ epoch: migration.epoch, ops: [op] }));
const journalAttrs = Object.assign({}, migrationAttrs, { [journalName]: attr({ epoch: migration.epoch, ops: [op] }) });
const journalRead = JjkSync.Compact.read(journalAttrs);
assert.equal(journalRead.state.pv, 12);
const acknowledged = migration.receive(journalAttrs);
assert.equal(acknowledged.state.pv, 12);
assert.equal(Object.keys(migration.pending).length, 0);
console.log('OK synchronisation : opération ciblée, journal append-only et accusé');

// Deux sessions voient et fusionnent des changements indépendants.
const shared = clone(migrationAttrs);
const left = new JjkSync.Compact.Session(shared, original, () => 2000, { id: 'left' });
const right = new JjkSync.Compact.Session(shared, original, () => 2000, { id: 'right' });
const l = clone(original); l.pv = 9; left.capture(l);
const lops = left.outgoing();
const larr = Object.keys(lops).map(k => lops[k]);
const lname = 'jjk_ops_left_' + JjkSync.Compact.hash(JSON.stringify({ epoch: left.epoch, ops: larr }));
shared[lname] = attr({ epoch: left.epoch, ops: larr });
const r = clone(original); r.xpTotal += 4; right.capture(r);
const rops = right.outgoing(), rarr = Object.keys(rops).map(k => rops[k]);
const rname = 'jjk_ops_right_' + JjkSync.Compact.hash(JSON.stringify({ epoch: right.epoch, ops: rarr }));
shared[rname] = attr({ epoch: right.epoch, ops: rarr });
const merged = JjkSync.Compact.read(shared).state;
assert.equal(merged.pv, 9);
assert.equal(merged.xpTotal, original.xpTotal + 4);
console.log('OK multi-session : deux champs indépendants fusionnés');

// Une nouvelle pile est transportée dans un bloc immuable avant son opération.
const pileSession = new JjkSync.Compact.Session(shared, merged, () => 3000, { id: 'inventory' });
const withPile = clone(merged);
withPile.inv.objets.push({ ref: 'objet-neuf', id: 'id-neuf', nom: 'Lanterne', qte: 1,
  poids: 2, img: '', desc: '', groupe: 0, ou: 0, dans: null });
pileSession.capture(withPile);
const pilesOps = pileSession.outgoing(), pileOp = Object.values(pilesOps)[0];
assert.ok(pileOp.creates && pileOp.creates['objet-neuf']);
const pileAttrs = Object.assign({}, shared, pileSession.payloads);
const pileJournalName = 'jjk_ops_inventory_' + JjkSync.Compact.hash(JSON.stringify({ epoch: pileSession.epoch, ops: [pileOp] }));
pileAttrs[pileJournalName] = attr({ epoch: pileSession.epoch, ops: [pileOp] });
const pileRead = JjkSync.Compact.read(pileAttrs);
assert.ok(pileRead.state.inv.objets.some(o => o.ref === 'objet-neuf' && o.nom === 'Lanterne'));
console.log('OK inventaire : création de pile séparée et vérifiée par empreinte');

// Le plateau Narration emploie un espace isolé ; les fonds restent des attributs à part.
const Narr = JjkSync.createCompact({ meta: 'jjk_narr_storage', block: 'jjk_narr_block_',
  stack: 'jjk_narr_stack_', ops: 'jjk_narr_ops_', inventory: false, reserves: false,
  owners: { narration: ['conf', 'points'] } }).Compact;
const board = { v: 1, conf: { v: 1, seq: 3, joueurs: [] },
  points: { mj1: { x: 120, y: 340 }, j1: { x: 700, y: 220 } }, modData: {} };
const boardAttrs = Narr.encode(board);
assert.ok(boardAttrs.jjk_narr_storage);
assert.ok(Object.keys(boardAttrs).some(k => k.startsWith('jjk_narr_block_')));
assert.equal(Object.keys(boardAttrs).some(k => k.startsWith('jjk_block_')), false);
assert.equal(stable(Narr.snapshot(boardAttrs).state), stable(board));
const boardSession = new Narr.Session({}, board, () => 4000, { id: 'narr-test' });
assert.equal(boardSession.hasBase, false);
const boardMigrated = boardSession.migration;
assert.equal(stable(Narr.snapshot(boardMigrated).state), stable(board));
assert.equal(boardSession.hasBase, false);
const boardAck = boardSession.receive(boardMigrated);
assert.equal(boardAck.incomplete, false);
assert.equal(boardSession.hasBase, true, 'la relecture doit confirmer la première photographie du plateau');
assert.equal(stable(boardAck.state), stable(board));
console.log('OK Narration : migration, relecture de confirmation, espace indépendant et état restitué');

// AttrMap traite une photographie Compact comme source canonique et refuse un compact corrompu.
const readState = M.attrsToState(encoded);
assert.equal(readState.pv, original.pv);
// La carte d'attributs doit appliquer les journaux, pas seulement relire la
// photographie initiale. Sinon l'ouverture d'une fiche compacte réinitialise
// visuellement les changements tant que le prochain poll n'est pas arrivé.
const fromJournal = M.attrsToState(journalAttrs);
assert.equal(fromJournal.pv, 12);
const versionFromJournal = M.ficheDe(journalAttrs);
assert.equal(versionFromJournal.schema, original.v);
assert.equal(versionFromJournal.release, original.rel);
const incompletePayload = clone(journalAttrs);
incompletePayload[journalName] = attr({ epoch: migration.epoch, ops: [{
  id: 'broken:create', clock: 999, at: 1, changes: [],
  creates: { 'missing-pile': { attribute: 'jjk_stack_missing-pile', hash: '00000000' } }
}] });
const frozenCompact = M.attrsToState(incompletePayload);
assert.equal(frozenCompact.degrade, 'illisible');
const corrupt = clone(encoded);
const block = Object.keys(corrupt).find(k => k.startsWith('jjk_block_'));
corrupt[block].current += 'x';
const broken = M.attrsToState(corrupt);
assert.ok(broken.degrade);
console.log('OK AttrMap : lecture des journaux Compact, gel sur payload incomplet ou bloc corrompu');
