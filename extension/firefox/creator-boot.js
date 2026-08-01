/* Amorce de l'iframe du créateur JJK (page d'extension chargée dans l'onglet Roll20).
 *
 * Rôle : faire tourner le VRAI jjk-creation.js du site, mais rediriger sa persistance
 * (localStorage) vers les Attributes Roll20 du personnage — SANS toucher son code.
 *
 * Mécanique :
 *  1. On installe window.__jjkLocalStorage : un shim SYNCHRONE adossé à un cache
 *     mémoire. creation-embed.js (jjk-creation.js enveloppé) utilise ce shim à la place
 *     du localStorage réel de l'extension.
 *  2. On demande au parent (content-script Roll20) les Attributes du perso ; à la
 *     réception, JjkAttrMap.attrsToState() reconstruit l'état -> on l'écrit dans le
 *     cache sous « jjk-perso ».
 *  3. SEULEMENT ALORS on injecte creation-embed.js : son init()/load() lit l'état
 *     déjà hydraté et monte la fiche.
 *  4. À chaque sauvegarde du créateur (setItem « jjk-perso »/« jjk-cards »),
 *     JjkAttrMap.stateToAttrs() redécompose l'état ; on n'envoie au parent QUE les
 *     attributs CHANGÉS (le parent throttlera les écritures d20).
 *
 * Le pont est en postMessage (l'iframe est d'origine extension, le parent d'origine
 * Roll20 : origines croisées, on tague les messages par ns:"jjk").
 */
(function () {
  "use strict";
  var M = window.JjkAttrMap;

  // id du personnage Roll20, passé par le content-script dans le hash (#c=<id>).
  var CHAR_ID = (function () {
    var m = /[#&]c=([^&]+)/.exec(location.hash || "");
    return m ? decodeURIComponent(m[1]) : "";
  })();

  var mem = {};                 // cache localStorage
  var SAVE_KEYS = { "jjk-perso": 1, "jjk-cards": 1 };
  var lastAttrs = {};           // dernier jeu d'attributs connu (base du diff)
  var ready = false;            // les sauvegardes ne partent qu'après hydratation + montage
  var saveTimer = null;

  window.__jjkLocalStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem: function (k, v) { mem[k] = String(v); if (ready && SAVE_KEYS[k]) scheduleSave(); },
    removeItem: function (k) { delete mem[k]; },
    clear: function () { mem = {}; },
    key: function (i) { return Object.keys(mem)[i] || null; },
    get length() { return Object.keys(mem).length; }
  };

  // Le pont d20 (roll20-page.js) vit dans le MONDE PRINCIPAL de la frame Roll20 du
  // haut : on lui parle donc via window.top (l'iframe du créateur est imbriquée sous
  // le dialogue du perso). En test à un seul niveau d'iframe, window.top === parent.
  function post(msg) { msg.ns = "jjk"; msg.charId = CHAR_ID; try { window.top.postMessage(msg, "*"); } catch (e) {} }

  // Signale à jjk-creation.js qu'on est dans Roll20 : affichage condensé « fiche »
  // (--jjk-compact) et jets envoyés au TCHAT Roll20 (au lieu du journal local).
  window.__jjkCompact = true;
  window.__jjkRoll = function (die, value, label) { post({ type: "roll", die: die, value: value, label: label }); };
  // envoi d'un ÉLÉMENT de la fiche (technique, arme, avantage…) au tchat Roll20
  window.__jjkSay = function (title, fields) { post({ type: "say", title: title, fields: fields }); };

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 400);
  }
  function doSave() {
    saveTimer = null;
    var state;
    try { state = JSON.parse(mem["jjk-perso"] || "null"); } catch (e) { return; }
    if (!state) return;
    var card = null;
    try { var cards = JSON.parse(mem["jjk-cards"] || "{}"); card = cards && cards._current; } catch (e) {}
    var attrs = M.stateToAttrs(state, card);
    var changed = diff(lastAttrs, attrs);
    lastAttrs = attrs;
    var names = Object.keys(changed);
    if (names.length) post({ type: "save", attrs: changed });
  }
  function val(a, key) { return a && typeof a === "object" ? a[key] : (key === "current" ? a : ""); }
  function diff(oldA, newA) {
    var out = {};
    Object.keys(newA).forEach(function (k) {
      var o = oldA[k], n = newA[k];
      if (!o || String(val(o, "current")) !== n.current || String(val(o, "max")) !== n.max) out[k] = n;
    });
    return out;
  }

  var hydrated = false;
  function hydrate(attrs) {
    if (hydrated) return;         // une seule hydratation par vie d'iframe
    hydrated = true;
    attrs = attrs || {};
    var state = M.attrsToState(attrs);
    mem["jjk-perso"] = JSON.stringify(state);
    mem["jjk-cards"] = "{}";
    mem["jjk-persos"] = "[]";     // pas de bibliothèque multi-perso dans Roll20
    lastAttrs = attrs;                 // base du diff = ce qui est réellement en base
    // charger le vrai jjk-creation.js APRÈS hydratation (son init lit jjk-perso)
    var s = document.createElement("script");
    s.src = "creation-embed.js";
    s.onload = function () { ready = true; post({ type: "mounted" }); };
    s.onerror = function () { post({ type: "error", error: "creation-embed.js" }); };
    document.body.appendChild(s);
  }

  window.addEventListener("message", function (ev) {
    var d = ev.data;
    if (!d || d.ns !== "jjk") return;
    // on n'accepte que l'hydratation de NOTRE personnage (plusieurs fiches peuvent être ouvertes)
    if (d.type === "hydrate" && (!d.charId || d.charId === CHAR_ID)) hydrate(d.attrs);
  });

  // prêt : on réclame au pont d20 les Attributes jjk_* de ce personnage
  post({ type: "load" });
})();
