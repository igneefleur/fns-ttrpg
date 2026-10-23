/* État collaboratif Roll20. Logique pure, utilisée aussi par les tests Node.
 * Format 2 : api.Compact, blocs vérifiés et journaux de session.
 * Les registres ci-dessous restent le lecteur historique et le moteur Monde.
 * owd_sync_base : photographie IMMUTABLE à l'activation du format.
 * owd_sync_p_*  : un registre par champ / présence / ordre d'une entrée.
 * Le dernier serveur gagne sur un même registre ; deux registres ne se
 * réécrivent jamais. Les listes d'entités sont adressées par ref/id, pas index.
 * owd_state reste la sauvegarde d'avant activation, jamais la source active.
 */
(function (root) {
  "use strict";
  // La fiche et Monde partagent le MÊME moteur, avec des espaces séparés.
  function create(options) {
  options = options || {};
  var BASE = options.base || "owd_sync_base", PREFIX = options.prefix || "owd_sync_p_", FORMAT = 1;
  var own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  function copy(v) { return JSON.parse(JSON.stringify(v)); }
  function key(path) { return JSON.stringify(path); }
  function name(k) {
    // Encodage réversible, aucun hash susceptible de confondre deux champs.
    var ascii = encodeURIComponent(k).replace(/%([0-9A-F]{2})/g, function (_, h) { return String.fromCharCode(parseInt(h, 16)); });
    var b = typeof btoa === "function" ? btoa(ascii) : Buffer.from(ascii, "binary").toString("base64");
    return PREFIX + b.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function val(a) { return a && typeof a === "object" ? String(a.current == null ? "" : a.current) : String(a == null ? "" : a); }
  function identity(x) {
    return x && typeof x === "object" && !Array.isArray(x) && (x.ref || x.id) ? String(x.ref || x.id) : null;
  }
  function flatten(state) {
    var out = Object.create(null);
    function walk(v, p) {
      var k = key(p), ids = Object.create(null), keyed = Array.isArray(v);
      if (keyed) v.forEach(function (x) { var id = identity(x); if (!id || ids[id]) keyed = false; else ids[id] = true; });
      if (p.length === 2 && p[0][1] === "effetsActifs" && p[1][0] === "e") {
        out[k] = ["v", copy(v)];
      } else if (p.length === 1 && (/^horloge(?:Digestion|Exposition|Alcool)?$/.test(p[0][1]) || p[0][1] === "effPause")) {
        out[k] = ["v", copy(v)];
      } else if (Array.isArray(v) && keyed) {
        out[k] = ["l"];
        v.forEach(function (x, i) {
          var q = p.concat([["e", identity(x)]]);
          walk(x, q); out[key(q.concat([["order"]]))] = ["v", i];
        });
      } else if (Array.isArray(v) && /^(modsDegats|modsParade)$/.test(p.length ? p[p.length - 1][1] : "")) {
        out[k] = ["i", v.length];
        v.forEach(function (x, i) { walk(x, p.concat([["index", i]])); });
      } else if (v && typeof v === "object" && !Array.isArray(v)) {
        out[k] = ["o"];
        Object.keys(v).sort().forEach(function (n) {
          if (n === "__proto__" || n === "constructor" || n === "prototype") throw new Error("Clé d'état réservée : " + n);
          walk(v[n], p.concat([["k", n]]));
        });
      } else out[k] = ["v", copy(v)];
    }
    walk(state, []); return out;
  }
  function rebuild(flat) {
    var tree = { children: Object.create(null) };
    Object.keys(flat).forEach(function (k) {
      var p = JSON.parse(k), t = tree;
      if (!Array.isArray(p) || p.length > 64) throw new Error("Chemin collaboratif invalide");
      p.forEach(function (s) {
        if (!Array.isArray(s) || ["k", "e", "order", "index"].indexOf(s[0]) < 0 ||
            ["__proto__", "constructor", "prototype"].indexOf(s[1]) >= 0) throw new Error("Segment collaboratif invalide");
        var z = key(s);
        if (!t.children[z]) t.children[z] = { segment: s, children: Object.create(null) };
        t = t.children[z];
      });
      t.node = flat[k];
    });
    function build(t) {
      var n = t.node, out;
      if (!n || n[0] === "d") return undefined;
      if (n[0] === "v") return copy(n[1]);
      if (n[0] === "l") {
        var rows = [];
        Object.keys(t.children).forEach(function (k) {
          var c = t.children[k]; if (c.segment[0] !== "e") return;
          var v = build(c); if (v === undefined) return;
          var ord = c.children[key(["order"])];
          rows.push({ id: c.segment[1], rank: ord && ord.node ? Number(ord.node[1]) || 0 : 0, value: v });
        });
        rows.sort(function (a, b) { return a.rank - b.rank || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0); });
        return rows.map(function (r) { return r.value; });
      }
      if (n[0] === "i") {
        out = [];
        for (var i = 0; i < n[1]; i++) { var c = t.children[key(["index", i])]; out.push(c ? build(c) : null); }
        return out;
      }
      if (n[0] !== "o") throw new Error("Nœud collaboratif invalide");
      out = {};
      Object.keys(t.children).forEach(function (k) {
        var c = t.children[k]; if (c.segment[0] !== "k") return;
        var v = build(c); if (v !== undefined) out[c.segment[1]] = v;
      });
      return out;
    }
    var state = build(tree);
    if (!state || typeof state !== "object" || Array.isArray(state)) throw new Error("État collaboratif invalide");
    return state;
  }
  function difference(before, after) {
    var out = Object.create(null);
    Object.keys(after).forEach(function (k) {
      if (!own(before, k) || JSON.stringify(before[k]) !== JSON.stringify(after[k])) out[k] = after[k];
    });
    Object.keys(before).forEach(function (k) {
      if (own(after, k)) return;
      var p = JSON.parse(k), n = before[k];
      // Une table éparse devenue vide ne supprime pas ses parents : un autre
      // joueur peut avoir ajouté une AUTRE clé sous le même parent.
      if (n[0] === "o" && (!p.length || p[p.length - 1][0] !== "e")) return;
      // Une suppression de ligne est portée par sa présence seule. Les champs
      // d'une ligne supprimée ne peuvent jamais la ressusciter.
      for (var i = p.length - 1; i > 0; i--) {
        var a = p.slice(0, i), ak = key(a);
        if (!own(after, ak) && a[i - 1][0] === "e") return;
      }
      out[k] = ["d"];
    });
    return out;
  }
  function read(attrs) {
    if (!attrs || !val(attrs[BASE])) return null;
    var b = JSON.parse(val(attrs[BASE]));
    if (!b || b.format !== FORMAT || !b.state) throw new Error("Format collaboratif absent ou inconnu");
    var f = flatten(b.state);
    Object.keys(attrs).forEach(function (n) {
      if (n.indexOf(PREFIX) !== 0 || !val(attrs[n])) return;
      var r = JSON.parse(val(attrs[n]));
      if (!r || !Array.isArray(r.p) || !Array.isArray(r.n) || name(key(r.p)) !== n) throw new Error("Attribut collaboratif illisible : " + n);
      f[key(r.p)] = r.n;
    });
    return { state: rebuild(f), flat: f };
  }
  function pack(changes) {
    var out = {};
    Object.keys(changes).forEach(function (k) { out[name(k)] = { current: JSON.stringify({ p: JSON.parse(k), n: changes[k] }), max: "" }; });
    return out;
  }
  function Session(attrs, state, now) {
    this.now = now || Date.now; this.attrs = attrs || {};
    var r = read(attrs);
    this.seed = copy(state); this.local = flatten(r ? r.state : state);
    this.pending = Object.create(null); this.sent = Object.create(null);
    this.hasBase = !!r; this.seedSent = 0;
    this.capture(state);
  }
  Session.prototype.capture = function (state) {
    var next = flatten(state), changes = difference(this.local, next), self = this;
    Object.keys(changes).forEach(function (k) { self.pending[k] = { node: changes[k], since: self.now(), sent: 0, before: val(self.attrs[name(k)]), attempts: 0 }; });
    this.local = next;
  };
  Session.prototype.outgoing = function () {
    var out = {}, self = this, n = this.now();
    if (!this.hasBase && (!this.seedSent || n - this.seedSent > 8000)) {
      out[BASE] = { current: JSON.stringify({ format: FORMAT, state: this.seed }), max: "" };
      this.seedSent = n;
    }
    if (!this.hasBase) return out;  // première photographie confirmée AVANT les modifications
    var changes = Object.create(null);
    Object.keys(this.pending).forEach(function (k) {
      var p = self.pending[k]; if (p.sent) return;
      changes[k] = p.node;
    });
    out = pack(changes);
    var grace = 4000 + Object.keys(out).length * 60;
    Object.keys(changes).forEach(function (k) {
      self.pending[k].sent = n; self.pending[k].grace = grace;
      self.sent[name(k)] = out[name(k)].current;
    });
    return out;
  };
  Session.prototype.receive = function (attrs) {
    var r = read(attrs), self = this, lost = false, conflict = false;
    this.attrs = attrs;
    if (!r) { if (this.hasBase) throw new Error("Photographie collaborative disparue"); return null; }
    this.hasBase = true;
    Object.keys(this.pending).forEach(function (k) {
      var p = self.pending[k], remote = val(attrs[name(k)]), expected = pack((function () { var a = {}; a[k] = p.node; return a; })())[name(k)].current;
      if (remote === expected) { delete self.pending[k]; delete self.sent[name(k)]; return; }
      if (p.sent && self.now() - p.sent >= p.grace) {
        // Un autre a écrit le MÊME registre : on accepte sa valeur, sans la
        // renvoyer en boucle. Une absence d'accusé reste signalée au joueur.
        if (remote === p.before) {
          p.sent = 0; p.attempts++;
          if (p.attempts >= 2) lost = true;
          r.flat[k] = p.node; // jamais jeter une frappe que le serveur n'a pas reçue
          return;
        }
        conflict = true; delete self.pending[k]; delete self.sent[name(k)]; return;
      }
      r.flat[k] = p.node;
    });
    var s = rebuild(r.flat); this.local = flatten(s);
    return { state: s, lost: lost, conflict: conflict };
  };
  var api = { BASE: BASE, PREFIX: PREFIX, flatten: flatten, rebuild: rebuild, difference: difference, read: read,
    pack: pack, name: name, Session: Session, copy: copy };
  api.create = create;
  return api;
  }
  // Format 2 : blocs immuables vérifiés et journaux propres à chaque session.
  // Aucune élection de chef : tous reconstruisent le même ordre causal.
  function compactEngine(legacy) {
    var META='owd_storage', BLOCK='owd_block_', STACK='owd_stack_', OPS='owd_ops_', FORMAT=2;
    function hash(s){s=String(s);var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);}
    function stable(v){if(Array.isArray(v))return '['+v.map(stable).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+':'+stable(v[k]);}).join(',')+'}';return JSON.stringify(v);}
    function val(a){return a&&typeof a==='object'?String(a.current==null?'':a.current):String(a==null?'':a);}
    function attr(v){return {current:JSON.stringify(v),max:''};}
    function parse(a){return JSON.parse(val(a));}
    var owners={bio:['name','age','espece','genre','sexe','taille','portrait','background'],caracs:['caracs','caracsXp','xpTotal'],effort:['effort','qualiteSommeil','horloge'],exposition:['temperature','horlogeExposition'],mouvement:['allure','allureCran'],effondrement:['effParties','effAutre','effAlcool','effAlcoolSecondes','horlogeAlcool','effDesactive','effPause'],actions:['desTailles','desUtilises'],attaques:['attaques'],defenses:['defenses'],competences:['comps'],recuperation:[],effets:['effetsActifs','effetsPermanents'],techniques:['techniques'],avantages:['avantages'],notes:['notes'],jets:['de'],reglages_caracs:['caracsLeviers'],reglages_capacites:['capsLeviers'],reglages_competences:['compsLeviers'],modules:['modules','modActifs'],mods:['mods']};
    function encode(state,epoch){
      var s=legacy.copy(state),blocks={},known={},schema={};
      function put(name,v){blocks[name]=attr(v);schema[name]=hash(blocks[name].current);}
      Object.keys(owners).forEach(function(name){var b={};owners[name].forEach(function(k){if(Object.prototype.hasOwnProperty.call(s,k)){b[k]=s[k];known[k]=true;}});if(Object.keys(b).length)put(BLOCK+name,b);});
      var reserves={};Object.keys(s.etat||{}).forEach(function(k){put(BLOCK+'reserve_'+k,s.etat[k]);reserves[k]=BLOCK+'reserve_'+k;});known.etat=true;
      var inv=legacy.copy(s.inv||{objets:[]}),index=[];var seen={};(inv.objets||[]).forEach(function(o){if(!o.ref||seen[o.ref])throw Error('Identifiant de pile absent ou dupliqué.');seen[o.ref]=true;var record=legacy.copy(o),place={ref:o.ref};['ou','dans','emp'].forEach(function(k){if(k in record){place[k]=record[k];delete record[k];}});var name=STACK+encodeURIComponent(o.ref);put(name,record);place.attribute=name;index.push(place);});delete inv.objets;put(BLOCK+'inventaire',{piles:index,reglages:inv});known.inv=true;
      var mods={};Object.keys(s.modData||{}).forEach(function(k){put(BLOCK+'module_'+encodeURIComponent(k),s.modData[k]);mods[k]=BLOCK+'module_'+encodeURIComponent(k);});known.modData=true;
      var combat={};['combatOptions','combatModifiers','combatAffichage'].forEach(function(k){if(Object.prototype.hasOwnProperty.call(s,k)){combat[k]=s[k];known[k]=true;}});put(BLOCK+'combat',combat);
      var rest={};Object.keys(s).forEach(function(k){if(!known[k])rest[k]=s[k];});put(BLOCK+'fiche',rest);
      var meta={format:FORMAT,phase:'staging',epoch:epoch||('e'+hash(stable(s))),blocks:schema,reserves:reserves,moduleData:mods};
      blocks[META]=attr(meta);return blocks;
    }
    function snapshot(attrs){if(!attrs||!val(attrs[META]))return null;var meta=parse(attrs[META]);if(!meta||meta.format!==FORMAT||!meta.epoch||!meta.blocks)throw Error('Format de stockage inconnu.');var blocks={};Object.keys(meta.blocks).forEach(function(k){if(k.indexOf(BLOCK)!==0&&k.indexOf(STACK)!==0)throw Error('Nom de bloc invalide.');if(!val(attrs[k])||hash(val(attrs[k]))!==meta.blocks[k])throw Error('Bloc absent ou incomplet : '+k);blocks[k]=parse(attrs[k]);});if(meta.names){Object.keys(meta.names).forEach(function(k){var physical=meta.names[k];if(k.indexOf(BLOCK)!==0&&k.indexOf(STACK)!==0)throw Error('Nom logique invalide.');if(!Object.prototype.hasOwnProperty.call(blocks,physical))throw Error('Bloc de photographie absent.');blocks[k]=blocks[physical];});}var s=legacy.copy(blocks[BLOCK+'fiche']||{});Object.keys(owners).forEach(function(k){Object.assign(s,blocks[BLOCK+k]||{});});s.etat={};Object.keys(meta.reserves).forEach(function(k){s.etat[k]=blocks[meta.reserves[k]];});s.modData={};Object.keys(meta.moduleData).forEach(function(k){s.modData[k]=blocks[meta.moduleData[k]];});Object.assign(s,blocks[BLOCK+'combat']||{});var inv=blocks[BLOCK+'inventaire'];s.inv=legacy.copy(inv.reglages);s.inv.objets=inv.piles.map(function(p){return Object.assign({},legacy.copy(blocks[p.attribute]),(function(){var q={};['ou','dans','emp'].forEach(function(k){if(k in p)q[k]=p[k];});return q;})());});return {meta:meta,state:s};}
    function invPath(p){return p[0]&&p[0][1]==='inv'&&p[1]&&p[1][1]==='objets';}
    function Reader(){this.boxes=Object.create(null);this.previous=null;}
    Reader.prototype.read=function(attrs){return read(attrs,this);};
    function baseRecords(attrs){var raw=attrs&&val(attrs[META]);if(!raw)return [];var meta=JSON.parse(raw),keys=[META].concat(Object.keys(meta.blocks||{})).sort();return keys.map(function(k){return [k,val(attrs[k])];});}
    function sameRecords(a,b){return !!(a&&b&&a.length===b.length&&a.every(function(x,i){return x[0]===b[i][0]&&x[1]===b[i][1];}));}
    function read(attrs,reader){
      var records=reader&&baseRecords(attrs),previous=reader&&reader.previous,base=previous&&sameRecords(records,previous.records)?previous.base:snapshot(attrs);if(!base)return null;
      var f,ops=[],history=[],historyIds={},ids={},heads={},seqs={};var absorbed=base.meta.absorbed||{};Object.keys(absorbed).forEach(function(id){ids[id]=true;});
      Object.keys(attrs).filter(function(k){return k.indexOf(OPS)===0&&val(attrs[k]);}).sort().forEach(function(k){var raw=val(attrs[k]),cached=reader&&reader.boxes[k],box=cached&&cached.raw===raw?cached.box:parse(attrs[k]);if(reader)reader.boxes[k]={raw:raw,box:box};if(box.epoch!==base.meta.epoch)return;if(!Array.isArray(box.ops))throw Error('Journal de session illisible.');box.ops.forEach(function(op){if(absorbed[op.id]){if(!historyIds[op.id]){history.push(op);historyIds[op.id]=true;}return;}if(!op.id||!Array.isArray(op.changes)||!Number.isSafeInteger(op.clock))throw Error('Opération illisible.');if(ids[op.id]){if(stable(ids[op.id])!==stable(op))throw Error('Opération dupliquée incohérente.');return;}ids[op.id]=op;ops.push(op);});});
      ops.sort(function(a,b){return a.clock-b.clock||(a.id<b.id?-1:a.id>b.id?1:0);});var conflicts=[],incomplete=false,start=0;
      if(previous&&base===previous.base&&!previous.incomplete&&previous.payloads.every(function(x){return val(attrs[x[0]])===x[1];})&&ops.length>=previous.ops.length&&previous.ops.every(function(op,i){return op===ops[i]||stable(op)===stable(ops[i]);})){
        f=Object.assign(Object.create(null),previous.flat);heads=Object.assign({},previous.heads);conflicts=legacy.copy(previous.conflicts);start=previous.ops.length;
      }else f=legacy.flatten(base.state);
      ops.slice(start).forEach(function(original){var op=legacy.copy(original),blocked=false,invalid=false;
        if(op.creates||op.modules){var extra=[];Object.keys(op.creates||{}).forEach(function(ref){var spec=op.creates[ref],raw=attrs[spec.attribute];if(!raw){incomplete=true;return;}if(hash(val(raw))!==spec.hash)throw Error('Pile créée corrompue : '+ref);var record=parse(raw);var tree=legacy.flatten({inv:{objets:[record]}});Object.keys(tree).forEach(function(k){var p=JSON.parse(k);if(p.length>3&&invPath(p)&&p[2][1]===ref&&p[3][0]==='k')extra.push({k:k,n:tree[k]});});});
          Object.keys(op.modules||{}).forEach(function(id){var spec=op.modules[id],raw=attrs[spec.attribute];if(!raw){incomplete=true;return;}if(hash(val(raw))!==spec.hash)throw Error('Module créé corrompu : '+id);var data={modData:{}};data.modData[id]=parse(raw);var tree=legacy.flatten(data);Object.keys(tree).forEach(function(k){var p=JSON.parse(k);if(p.length>2&&p[0][1]==='modData'&&p[1][1]===id)extra.push({k:k,n:tree[k]});});});
          if(incomplete){delete ids[op.id];return;}op.changes=op.changes.concat(extra);
        }
        if(incomplete){delete ids[op.id];return;}

        op.changes.forEach(function(c){var p=JSON.parse(c.k);if(p.some(function(x){return ['__proto__','constructor','prototype'].indexOf(x[1])>=0;}))throw Error('Chemin réservé.');
          if(invPath(p)&&p.length>2){var entity=legacy.key?legacy.key(p.slice(0,3)):JSON.stringify(p.slice(0,3));var created=op.changes.some(function(x){return x.k===entity&&x.n[0]!=='d';});if((!f[entity]||f[entity][0]==='d')&&!created)blocked=true;}
          if(invPath(p)&&c.n[0]==='d'&&p.length===3&&(!f[c.k]||f[c.k][0]==='d'))blocked=true;
          if(c.delta!==undefined){var before=f[c.k],v=before&&before[0]==='v'?before[1]:undefined;if(v==null)v=c.anchor;if(typeof v!=='number'||!Number.isFinite(v+c.delta))invalid=true;else if(invPath(p)&&p[p.length-1][1]==='qte'&&v+c.delta < -1e-8)blocked=true;}
        });
        if(blocked||invalid){conflicts.push({id:op.id,reason:blocked?'Objet modifié ou quantité insuffisante.':'Réserve sans référence numérique.'});return;}
        op.changes.forEach(function(c){var prior=f[c.k];if(c.clockDelta!==undefined){var h=legacy.copy(prior&&prior[1]||c.before[1]),sec=Math.max(0,Number(h.jours)*86400+Number(h.heures)*3600+Number(h.minutes)*60+Number(h.secondes)+c.clockDelta);h.jours=Math.floor(sec/86400);h.heures=Math.floor(sec%86400/3600);h.minutes=Math.floor(sec%3600/60);h.secondes=sec%60;f[c.k]=['v',h];}else if(c.delta!==undefined){var v=prior&&prior[0]==='v'?prior[1]:null;if(v==null)v=c.anchor;f[c.k]=['v',Math.round((v+c.delta)*1000000)/1000000];}
          else {if(c.before!==undefined&&stable(prior)!==stable(c.before)&&stable(prior)!==stable(c.n)&&c.n[0]==='v'&&(!heads[c.k]||heads[c.k].slice(0,heads[c.k].lastIndexOf(':'))!==op.id.slice(0,op.id.lastIndexOf(':'))))conflicts.push({id:op.id,reason:'Même champ modifié simultanément.',path:c.k});f[c.k]=legacy.copy(c.n);}heads[c.k]=op.id;});
      });
      if(reader){var payloads={};ops.forEach(function(o){[o.creates,o.modules].forEach(function(map){Object.keys(map||{}).forEach(function(k){var name=map[k].attribute;payloads[name]=val(attrs[name]);});});});reader.previous={records:records,base:base,flat:f,heads:heads,ops:ops.slice(),payloads:Object.keys(payloads).map(function(k){return [k,payloads[k]];}),conflicts:legacy.copy(conflicts),incomplete:incomplete};Object.keys(reader.boxes).forEach(function(k){if(!attrs[k])delete reader.boxes[k];});}
      var orderedHistory=history.concat(ops).sort(function(a,b){return a.clock-b.clock||(a.id<b.id?-1:a.id>b.id?1:0);});var publicOps=reader?legacy.copy(orderedHistory):orderedHistory,publicIds=Object.assign({},absorbed);publicOps.forEach(function(op){if(ids[op.id])publicIds[op.id]=op;});
      return {state:legacy.rebuild(f),flat:reader?Object.assign(Object.create(null),legacy.copy(f)):f,meta:reader?legacy.copy(base.meta):base.meta,ops:publicOps,ids:publicIds,conflicts:conflicts,incomplete:incomplete,clock:ops.reduce(function(n,o){return Math.max(n,o.clock);},Number(base.meta.clock)||0)};
    }
    function numeric(p){return p.length===1&&p[0][1]==='effAlcool' || p.length===2&&p[0][1]==='etat' || invPath(p)&&p[p.length-1][1]==='qte';}
    function Session(attrs,state,now,settings){
      settings=settings||{};this.actor=settings.actor||null;this.now=now||Date.now;this.attrs=attrs||{};this.id=settings.id||('s'+Math.random().toString(36).slice(2)+Date.now().toString(36));this.counter=0;this.clock=0;this.payloads={};this.pending={};this.pendingAt={};this.published={};this.maxima={};this.local=null;this.seed=null;this.hasBase=false;this.reader=new Reader();
      try{var active=this.reader.read(attrs);if(active){this.hasBase=true;this.clock=active.clock;this.epoch=active.meta.epoch;this.local=active.flat;this.migration=null;this.seed=legacy.copy(state);return;}}
      catch(e){if(!attrs.owd_sync_base&&!attrs.owd_state)throw e;}
      this.local=legacy.flatten(state);this.seed=legacy.copy(state);this.migration=encode(state);if(stable(snapshot(this.migration).state)!==stable(state))throw Error('Le nouveau stockage ne restitue pas la fiche complète.');
      var source=null;try{var old=legacy.read(attrs);source=old?old.state:attrs&&attrs.owd_state?parse(attrs.owd_state):null;}catch(e){}
      var header=parse(this.migration[META]);header.source=source?hash(stable(source)):null;var legacyValues={};Object.keys(attrs||{}).forEach(function(k){if(k==='owd_state'||k==='owd_sync_base'||k.indexOf('owd_sync_p_')===0)legacyValues[k]=val(attrs[k]);});header.legacyFingerprint=hash(stable(legacyValues));this.migration[META]=attr(header);this.epoch=header.epoch;
    }
    function captureParts(session,state){
      var cache=session.captureCache;
      if(!cache||cache.flat!==session.local){var old=legacy.rebuild(session.local);cache={flat:session.local,signs:{},groups:{}};Object.keys(old).forEach(function(k){cache.signs[k]=JSON.stringify(old[k]);cache.groups[k]=[];});Object.keys(session.local).forEach(function(k){var path=JSON.parse(k);if(path.length){var root=path[0][1];(cache.groups[root]||(cache.groups[root]=[])).push(k);}});}
      var roots=Object.keys(cache.signs).concat(Object.keys(state).filter(function(k){return !Object.prototype.hasOwnProperty.call(cache.signs,k);})),dirty=roots.filter(function(k){return cache.signs[k]!==JSON.stringify(state[k]);});
      if(!dirty.length){session.captureCache=cache;return {next:session.local,diff:{}};}
      var next=Object.assign(Object.create(null),session.local),before={},after={};
      dirty.forEach(function(root){(cache.groups[root]||[]).forEach(function(k){before[k]=session.local[k];delete next[k];});var one={};if(Object.prototype.hasOwnProperty.call(state,root))one[root]=state[root];var flat=legacy.flatten(one);delete flat['[]'];Object.assign(next,flat);Object.assign(after,flat);cache.groups[root]=Object.keys(flat);if(Object.prototype.hasOwnProperty.call(state,root))cache.signs[root]=JSON.stringify(state[root]);else delete cache.signs[root];});
      cache.flat=next;session.captureCache=cache;return {next:next,diff:legacy.difference(before,after)};
    }
    Session.prototype.capture=function(state,intent){var parts=captureParts(this,state),next=parts.next,diff=parts.diff,changes=[],self=this;Object.keys(diff).forEach(function(k){var p=JSON.parse(k),n=diff[k],b=self.local[k],c={k:k,n:n};if(b!==undefined)c.before=b;
        if(numeric(p)&&!(intent&&intent.absolute&&intent.absolute[k])&&n[0]==='v'&&typeof n[1]==='number'&&b&&b[0]==='v') {var old=b[1];if(old==null&&p[0][1]==='etat')old=self.maxima[p[1][1]];if(typeof old==='number'&&Number.isFinite(old)){c.delta=Math.round((n[1]-old)*1000000)/1000000;c.anchor=old;}}
        if(p.length===1&&/^horloge(?:Digestion|Exposition|Alcool)?$/.test(p[0][1])&&b&&b[0]==='v'&&n[0]==='v'&&b[1]&&n[1]&&b[1].regime===n[1].regime){var seconds=function(h){return Number(h.jours)*86400+Number(h.heures)*3600+Number(h.minutes)*60+Number(h.secondes);};var d=seconds(n[1])-seconds(b[1]);if(Number.isSafeInteger(d))c.clockDelta=d;}
        changes.push(c);});if(changes.length){var creates={},refs={};changes.forEach(function(c){var p=JSON.parse(c.k);if(invPath(p)&&p.length===3&&c.n[0]==='o'&&!self.local[c.k])refs[p[2][1]]=true;});
        Object.keys(refs).forEach(function(ref){var record=(state.inv.objets||[]).filter(function(o){return o.ref===ref;})[0];if(!record)return;record=legacy.copy(record);['ou','dans','emp'].forEach(function(k){delete record[k];});var name=STACK+encodeURIComponent(ref),raw=attr(record);self.payloads[name]=raw;creates[ref]={attribute:name,hash:hash(raw.current)};});
        changes=changes.filter(function(c){var p=JSON.parse(c.k);return !(invPath(p)&&p.length>3&&refs[p[2][1]]&&['ou','dans','emp','order'].indexOf(p[3][1]||p[3][0])<0);});
        var modules={};changes.forEach(function(c){var p=JSON.parse(c.k);if(p.length===2&&p[0][1]==='modData'&&c.n[0]==='o'&&!self.local[c.k]){var id=p[1][1],name=BLOCK+'module_'+encodeURIComponent(id);if(!self.attrs[name]){var raw=attr(state.modData[id]);self.payloads[name]=raw;modules[id]={attribute:name,hash:hash(raw.current)};}}});
        changes=changes.filter(function(c){var p=JSON.parse(c.k);return !(p.length>2&&p[0][1]==='modData'&&modules[p[1][1]]);});
        var lastId=Object.keys(this.pending).slice(-1)[0],last=lastId&&this.pending[lastId];
        if(last&&stable(last.actor||null)===stable(this.actor||null)&&!this.published[lastId]&&!last.creates&&!last.modules&&last.changes.length===changes.length&&changes.every(function(c,i){var old=last.changes[i];return old.k===c.k&&old.n[0]==='v'&&c.n[0]==='v'&&old.delta===undefined&&c.delta===undefined&&old.clockDelta===undefined&&c.clockDelta===undefined&&!invPath(JSON.parse(c.k));})){changes.forEach(function(c,i){if(last.changes[i].before!==undefined)c.before=last.changes[i].before;else delete c.before;});delete this.pending[lastId];}
        var op={id:this.id+':'+(++this.counter),clock:++this.clock,at:this.now(),changes:changes};if(this.actor)op.actor=legacy.copy(this.actor);
        var labels={};changes.forEach(function(c){var p=JSON.parse(c.k);p.forEach(function(seg,i){if(seg[0]!=="e")return;var prefix=p.slice(0,i+1),key=JSON.stringify(prefix.concat([["k","nom"]])),v=next[key]||self.local[key];if(!v){key=JSON.stringify(prefix.concat([["k","name"]]));v=next[key]||self.local[key];}if(v&&v[0]==="v"&&typeof v[1]==="string")labels[seg[1]]=v[1];});});if(Object.keys(labels).length)op.labels=labels;if(Object.keys(creates).length)op.creates=creates;if(Object.keys(modules).length)op.modules=modules;this.pending[op.id]=op;this.pendingAt[op.id]=this.now();}
this.local=next;};
    Session.prototype.outgoing=function(){if(!this.hasBase)return this.migration;var out={},self=this;Object.keys(this.pending).forEach(function(id){out[id]=self.pending[id];self.published[id]=true;});return out;};
    Session.prototype.tokenMax=function(k,value,remote){var s=legacy.rebuild(this.local);s.capsLeviers=s.capsLeviers||{};s.capsLeviers.max=s.capsLeviers.max||{};s.capsLeviers.max.force=s.capsLeviers.max.force||{};s.capsLeviers.max.force[k]=value;var f=legacy.flatten(s),diff=legacy.difference(this.local,f),changes=[];Object.keys(diff).forEach(function(path){var c={k:path,n:diff[path]};if(remote.flat[path]!==undefined)c.before=remote.flat[path];changes.push(c);});if(!changes.length)return;var id='token-max:'+this.epoch+':'+k+':'+hash(stable({value:value,heads:remote.ops.map(function(o){return o.id;})}));if(remote.ids[id]||this.pending[id])return;this.pending[id]={id:id,clock:remote.clock+1,at:0,changes:changes};this.pendingAt[id]=this.now();this.clock=Math.max(this.clock,remote.clock+1);this.local=f;};
    Session.prototype.token=function(k,value,remote){var p=JSON.stringify([['k','etat'],['k',k]]),before=remote.flat[p],id='token:'+this.epoch+':'+k+':'+hash(stable({value:value,heads:remote.ops.map(function(o){return o.id;})}));
      if(remote.ids[id]||this.pending[id])return;var op={id:id,clock:remote.clock+1,at:0,changes:[{k:p,n:['v',value],before:before}]};this.pending[id]=op;this.pendingAt[id]=this.now();this.clock=Math.max(this.clock,op.clock);var f=legacy.copy(this.local);f[p]=['v',value];this.local=f;};
    Session.prototype.receive=function(attrs,verified){var r;try{r=verified||this.reader.read(attrs);}catch(e){if(!this.hasBase)return null;throw e;}if(!r)return null;if(this.hasBase&&this.epoch!==r.meta.epoch&&Object.keys(this.pending).length)throw Error('La fiche a changé de format avec des opérations locales en attente ; exportez avant de recharger.');this.hasBase=true;this.attrs=attrs;this.epoch=r.meta.epoch;this.clock=Math.max(this.clock,r.clock);var self=this,lost=false;Object.keys(this.pending).forEach(function(id){if(r.ids[id]){delete self.pending[id];delete self.published[id];delete self.pendingAt[id];}});Object.keys(this.payloads).forEach(function(k){if(attrs[k]&&val(attrs[k])===val(self.payloads[k]))delete self.payloads[k];});var temp=Object.assign({},attrs);temp[OPS+'pending']=attr({epoch:this.epoch,ops:Object.keys(this.pending).map(function(id){return self.pending[id];})});Object.keys(this.payloads).forEach(function(k){if(!temp[k])temp[k]=self.payloads[k];});var merged=r;if(Object.keys(this.pending).length||Object.keys(this.payloads).length){var pendingReader=new Reader();pendingReader.previous=this.reader.previous;pendingReader.boxes=Object.assign(Object.create(null),this.reader.boxes);merged=pendingReader.read(temp);}this.local=merged.flat;return {state:merged.state,lost:Object.keys(this.pending).some(function(id){return self.now()-(self.pendingAt[id]||self.pending[id].at||self.now())>10000;}),conflict:r.conflicts.length>0,incomplete:r.incomplete,conflicts:r.conflicts};};
    return {BASE:META,PREFIX:OPS,BLOCK:BLOCK,STACK:STACK,format:FORMAT,Reader:Reader,encode:encode,snapshot:snapshot,read:read,hash:hash,stable:stable,flatten:legacy.flatten,rebuild:legacy.rebuild,copy:legacy.copy,Session:Session};
  }

  var api = create();
  api.Compact = compactEngine(api);
  var legacyRead=api.read;api.read=function(attrs){return attrs&&attrs[api.Compact.BASE]?api.Compact.read(attrs):legacyRead(attrs);};
  root.OwdSync = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
