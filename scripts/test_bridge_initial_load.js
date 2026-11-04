'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const bridgeCode = fs.readFileSync('extension/firefox/beta/roll20-page.js', 'utf8');

function attr(name, current, max = '') {
  return { attributes: { name, current, max }, get(k) { return this.attributes[k]; },
    set(v) { Object.assign(this.attributes, v); }, save(_a, cb) { cb && cb.success && cb.success(this); } };
}
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
async function main() {
  const handlers = Object.create(null), sent = [];
  const stale = [attr('jjk_storage', 'stale-photo'), attr('jjk_version', '4.0.2b', '4')];
  const fresh = [attr('jjk_storage', 'fresh-server-photo'), attr('jjk_version', '4.0.2b', '4'), attr('jjk_block_large', 'x'.repeat(900))];
  let fetchNumber = 0;
  const collection = {
    models: stale.slice(),
    create(data) { const m = attr(data.name, data.current, data.max); this.models.push(m); return m; },
    fetch(options) {
      fetchNumber++;
      const attempt = fetchNumber;
      setTimeout(() => {
        if (attempt === 1) { if (options && options.error) options.error(this, new Error('fetch refusé')); return; }
        this.models = fresh.slice();
        if (options && options.success) options.success(this);
      }, 12);
    }
  };
  const character = { id: 'char-1', attribs: collection,
    get(k) { return k === 'name' ? 'Fiche test' : ''; } };
  const campaign = { id: 'campaign-1', characters: {
    get(id) { return id === character.id ? character : null; }, models: [character]
  }, players: { models: [] } };
  const rootAttrs = { 'data-jjk-extension-version': '4.0.4', 'data-jjk-bridge-protocol': '2' };
  const document = {
    documentElement: { getAttribute(k) { return rootAttrs[k] || ''; }, setAttribute(k, v) { rootAttrs[k] = String(v); }, hasAttribute() { return false; } },
    addEventListener() {}, dispatchEvent() { return true; },
    querySelector() { return null; }
  };
  const ctx = {
    window: null, document, Campaign: campaign, location: { pathname: '/editor/' },
    CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; },
    Date, JSON, Object, Array, String, Number, Math, RegExp, Error, Promise,
    setTimeout, clearTimeout, setInterval() { return 1; }, clearInterval() {}, isFinite,
    console: { log() {}, warn() {}, error() {} }
  };
  ctx.window = ctx; ctx.top = ctx; ctx.closed = false;
  ctx.addEventListener = function (name, fn) { (handlers[name] ||= []).push(fn); };
  ctx.postMessage = function () {};
  vm.createContext(ctx);
  vm.runInContext(bridgeCode, ctx, { filename: 'roll20-page.js' });
  const source = { closed: false, postMessage(message) { sent.push(message); } };
  const handler = handlers.message && handlers.message[0];
  assert.equal(typeof handler, 'function', 'le pont doit installer son écouteur de messages');
  const load = (viewId) => handler({ data: { ns: 'jjk', type: 'load', charId: 'char-1', resync: true, allege: true, viewId }, source });

  // Contrat Outward : après un fetch refusé, le pont publie une lecture marquée
  // non fraîche. Le boot l'ignore et ne peut donc pas hydrater depuis cette photo.
  load('view-1');
  assert.equal(sent.length, 0, 'aucune réponse ne doit partir avant la fin du fetch');
  await wait(30);
  const refused = sent.filter(x => x.type === 'hydrate');
  assert.equal(refused.length, 1, 'le refus suit le protocole hydrate commun à Outward');
  assert.equal(refused[0].fresh, false, 'un fetch refusé doit être explicitement marqué non frais');
  assert.equal(refused[0].attrs.jjk_storage.current, 'stale-photo', 'la photo locale peut être transmise mais jamais considérée comme fraîche');
  assert.equal(sent.some(x => x.type === 'hydrate-refresh-error'), false, 'aucun protocole d’erreur séparé ne doit être émis');

  // Même cadence minimale de 1 500 ms que le pont Outward : la relance est
  // conservée, mais elle ne déclenche pas une seconde requête trop rapprochée.
  sent.length = 0;
  load('view-1');
  assert.equal(fetchNumber, 1, 'la relance doit respecter le verrou de cadence');
  assert.equal(sent.length, 0, 'la relance attend la fin de la cadence serveur');
  await wait(1550);
  const lectures = sent.filter(x => x.type === 'hydrate');
  assert.equal(lectures.length, 1, 'une unique hydratation fraîche est attendue après la relance');
  assert.equal(lectures[0].fresh, true);
  assert.equal(lectures[0].attrs.jjk_storage.current, 'fresh-server-photo', 'l’état local stale ne doit jamais prendre le dessus');
  assert.equal(lectures[0].attrs.jjk_block_large.current.length, 900, 'le premier document reçoit les blocs lourds complets');
  assert.equal(fetchNumber, 2, 'le fetch différé doit avoir été tenté après le refus');

  // Roll20 peut conserver le même WindowProxy après une navigation de l'iframe.
  // Un VIEW_ID neuf doit donc vider le cache d'allègement, même si l'ID de
  // personnage et le contenu des attributs lourds n'ont pas changé.
  sent.length = 0;
  await wait(1550);
  load('view-2');
  await wait(35);
  const reopened = sent.filter(x => x.type === 'hydrate');
  assert.equal(reopened.length, 1, 'la nouvelle vue reçoit une hydratation fraîche');
  assert.equal(reopened[0].attrs.jjk_block_large.current.length, 900, 'la nouvelle vue reçoit de nouveau les blocs lourds');
  assert.equal((reopened[0].omis || []).includes('jjk_block_large'), false, 'les blocs d’une ancienne vue ne sont jamais omis à la réouverture');
  assert.equal(fetchNumber, 3);
  console.log('OK ouverture Roll20 : refus non frais ignoré, relance à la cadence Outward et cache des blocs lourds réinitialisé à la réouverture');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
