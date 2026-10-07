/* État collaboratif Roll20. Logique pure, utilisée aussi par les tests Node.
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
      if (p.length === 1 && /^horloge(?:Digestion|Exposition)?$/.test(p[0][1])) {
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
  var api = create();
  root.OwdSync = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
