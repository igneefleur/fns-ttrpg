/* Format 2 : blocs et opérations via le pont storageBlocks=2. Les chemins
 * historiques sont conservés pour la lecture et les reprises de migration.
 * Amorce Roll20 de la fiche Outward — chargée UNIQUEMENT par
 * roll20-fiche.html, la page que l'extension Roll20 affiche dans son iframe.
 *
 * Architecture « coquille » : l'extension signée ne contient pas la fiche.
 * Elle pose l'onglet « Fiche Outward », le pont d20 (Attributes) et le relais
 * tchat, puis affiche CETTE page servie par le site : chaque mise à jour du
 * site met à jour la fiche dans Roll20, sans re-signer l'extension.
 *
 * Rôle :
 *  1. Poser window.__owdLocalStorage : un shim SYNCHRONE adossé à un cache
 *     mémoire. owd-fiche.js (via STORE) persiste dedans à la place du
 *     localStorage réel.
 *  2. Demander au pont d20 les Attributes du perso (type "load", relancé tant
 *     que le pont n'a pas répondu) ; à la réception ("hydrate"),
 *     OwdAttrMap.attrsToState() reconstruit l'état -> cache sous « owd-perso ».
 *  3. SEULEMENT ALORS injecter le bundle : son init()/load() lit l'état déjà
 *     hydraté et monte la fiche dans #perso-fiche.
 *  4. À chaque sauvegarde (setItem « owd-perso » / « owd-cards »),
 *     OwdAttrMap.stateToAttrs() redécompose l'état ; seuls les attributs
 *     CHANGÉS partent au pont (type "save"), qui throttle les écritures d20.
 *  5. ACCUSÉ DE RÉCEPTION. Le pont n'en émet aucun sur "save" : il avale
 *     l'échec d'un attribut (writeOne est en try/catch) et abandonne un job
 *     au 61e essai sans relancer la file. Une écriture perdue l'était donc
 *     définitivement, et ce sont justement les écritures uniques (sauvegarde
 *     de secours, version, état migré) qui ne repassent jamais. On se fabrique
 *     donc l'accusé de réception qui manque avec le seul canal disponible :
 *     "load", auquel le pont répond autant de fois qu'on le demande. Le lot
 *     posté attend dans `enVol` et n'entre dans la base du diff qu'une fois
 *     RELU dans le personnage ; sinon il est re-diffé et repart.
 *  6. GEL. attrsToState() rend son diagnostic avec l'état. Un owd_state présent
 *     mais illisible ne donne qu'une reconstruction amputée : on l'affiche, on
 *     le dit, et on n'écrit plus rien tant que le joueur n'a pas tranché. Un
 *     owd_state VIDÉ chez un personnage qui garde ses autres attributs owd_
 *     donne exactement la même reconstruction amputée, et vaut donc le même
 *     gel : sans lui, vider l'attribut le plus lourd de l'onglet Attributes
 *     serait PLUS destructeur que le corrompre.
 *  7. ÉCRAN DE VERSION. Entre 2 et 3, quand la fiche trouvée dans le
 *     personnage n'a pas la FORME que le site sait lire — son SCHÉMA diffère —,
 *     on n'ouvre RIEN : on montre ce qui change et on laisse choisir (mettre à
 *     niveau, ouvrir avec sa version, exporter). Le NUMÉRO de version, lui, ne
 *     barre pas le passage : un correctif de CSS sortirait l'écran chez toute
 *     une table alors qu'aucune donnée n'a changé de forme. C'est le seul
 *     endroit du dispositif où ready vaut encore false alors que l'état est
 *     déjà connu : aucune écriture ne peut partir d'ici.
 *
 * Chemin des messages : cette page est imbriquée sous la page d'extension
 * creator.html, elle-même sous la frame de la feuille Roll20. Le pont d20 vit
 * dans le monde principal de la frame du HAUT : window.top.postMessage y
 * arrive directement, et le pont répond via ev.source (donc ici), quelles que
 * soient les origines intermédiaires. Messages tagués ns:"owd" + charId.
 */
(function () {
  "use strict";
  var M = window.OwdAttrMap;
  var C = window.OwdSync && window.OwdSync.Compact;
  var storageCapable=false, storageSession="";
  var edition=false, extensionReady=false, extensionChecking=false, extensionInfo=null, lastHydration=null;
  var OPERATION_TIMEOUT=36000;
  var operationTimer=null, operationSerial=0, operationBusy=false, failureKind='', loadingKind='opening';
  var preparationFailed=false;
  var firstPendingAt=0, saveFailure='', openingDone=false, presenceRows=[];
  var openingStartedAt=window.__owdOpeningAt||Date.now();
  window.__owdCanEdit=function(){return edition&&!gele&&accesInventaire&&ready&&!document.getElementById('owd-ecran');};
  var tokenObserved={},tokenMaxObserved={},storageIntent={absolute:{}};
  window.__owdReserveSet=function(k){storageIntent.absolute[JSON.stringify([['k','etat'],['k',k]])]=true;};
  window.__owdInventorySet=function(ref){storageIntent.absolute[JSON.stringify([['k','inv'],['k','objets'],['e',ref],['k','qte']])]=true;};

  // id du personnage Roll20, passé de creator.html au hash de cette page (#c=<id>).
  var CHAR_ID = (function () {
    var m = /[#&]c=([^&]+)/.exec(location.hash || "");
    return m ? decodeURIComponent(m[1]) : "";
  })();

  // Page ouverte directement dans un onglet (hors Roll20) : rien à hydrater,
  // on oriente le visiteur au lieu d'attendre un pont qui ne répondra jamais.
  window.__owdVueAttaques = /[#&]view=attaques(?:&|$)/.test(location.hash || "");
  window.__owdVueDefenses = /[#&]view=defenses(?:&|$)/.test(location.hash || "");
  window.__owdVueNotes = /[#&]view=notes(?:&|$)/.test(location.hash || "");
  window.__owdVueInventaire = window.__owdVueNotes || window.__owdVueAttaques || window.__owdVueDefenses || /[#&]view=inventaire(?:&|$)/.test(location.hash || "");
  document.documentElement.classList.toggle("owd-vue-outil", window.__owdVueInventaire);
  var objetDrag = null, accesInventaire = true;
  var STANDALONE = (function () { try { return window.top === window; } catch (e) { return false; } })();

  var VIEW_ID = "v" + Date.now().toString(36) + Math.random().toString(36).slice(2);
  var mem = {};                 // cache localStorage
  var SAVE_KEYS = { "owd-perso": 1, "owd-cards": 1 };
  var lastAttrs = {};           // ce que Roll20 a été VU contenir (base du diff)
  var enVol = null;             // lot posté, pas encore relu : ni oublié, ni tenu pour acquis
  var enVolTimer = null;
  var echecs = 0;               // confirmations manquées d'affilée
  var miseANiveauDemandee = false, miseANiveauOps = [], versionBloquee = false;
  var migrationSource=null,migrationEnvoyee=false;
  var ready = false;            // les sauvegardes ne partent qu'après hydratation + montage
  var storageInitialSentAt = 0;
  var journalPlayer = null, journalRemote = null;
  window.__owdJournal = function () {
    var remote=journalRemote, ops=remote ? remote.ops.slice() : [], ids={};
    ops.forEach(function(op){ids[op.id]=true;});
    var pending={};
    if(collaboration)Object.keys(collaboration.pending).forEach(function(id){if(!ids[id]){ops.push(collaboration.pending[id]);pending[id]=true;}});
    return {ops:ops, pending:pending, conflicts:remote ? remote.conflicts : [], identity:!!journalPlayer,
      payload:function(name){var a=collaboration&&collaboration.payloads[name]||lastAttrs[name];try{return a?JSON.parse(a.current):null;}catch(e){return null;}}};
  };
  var saveTimer = null;
  var askTimer = null;          // relance de la demande d'hydratation
  var gardeArmee = false;       // le chien de garde ne se lance qu'une fois par session
  var taillesPostees = [];      // tailles récentes de owd_state posté (repère du chien de garde)
  var collaboration = null, collaborationPont = false, collaborationApplique = false;
  var derniereLecture = 0, modificationLocale = 0;
  var synchronisationDifferée = null;
  // Les formulaires composant du texte (IME) et les modales gardent leur DOM.
  // La réception continue ; le remontage attend la fin de cette interaction.
  var composition = false;
  document.addEventListener("compositionstart", function () { composition = true; });
  document.addEventListener("compositionend", function () { composition = false; appliqueDiffere(); });
  var lectureVerifiee=null, baseVerifiee=null, empreinteBaseVerifiee="", gelVolontaire=false, attrsEnErreur=null;
  var gele = false;             // fiche lue à moitié : on n'écrit plus rien (voir hydrate)

  // Le shim que le bundle prend en priorité (var STORE = window.__owdLocalStorage
  // || localStorage). setItem ne déclenche une sauvegarde que si `ready` est
  // vrai ET si la clé est une des deux qui portent le personnage : l'onglet
  // courant et les réglages d'affichage vivent aussi ici, en mémoire, et
  // meurent avec la page — c'est voulu.
  window.__owdLocalStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem: function (k, v) {
      if(versionBloquee&&SAVE_KEYS[k])return;
      if(ready&&!collaborationApplique&&!edition&&!miseANiveauDemandee&&SAVE_KEYS[k])return;
      if(SAVE_KEYS[k]&&mem[k]===String(v)){if(k==='owd-perso')storageIntent={absolute:{}};return;}
      mem[k] = String(v);
      if (collaboration && !collaborationApplique && (edition||miseANiveauDemandee) && k === "owd-perso") {
        updateStorageMaxima();collaboration.actor=journalPlayer;collaboration.capture(JSON.parse(mem[k]),storageIntent);lastCapturedPerson=mem[k];storageIntent={absolute:{}};actualiseStatutEnregistrement(); modificationLocale = Date.now();
      }
      if (ready && !collaborationApplique && SAVE_KEYS[k]) scheduleSave();
    },
    removeItem: function (k) { delete mem[k]; },
    clear: function () { mem = {}; },
    key: function (i) { return Object.keys(mem)[i] || null; },
    get length() { return Object.keys(mem).length; }
  };

  var takeOpenedAt = Date.now(), takeEnabled = !window.__owdVueInventaire;
  var defendOpenedAt = Date.now(), defendEnabled = !window.__owdVueInventaire;
  var defendEligible = !window.__owdVueAttaques && !window.__owdVueNotes;
  var wireRevision=null,wireAttrs=null;
  function post(msg) {
    if(msg.type==='load'){msg.lightRead=1;msg.readRevision=(!gele&&wireAttrs)?wireRevision:null;}
    msg.ns = "owd"; msg.charId = CHAR_ID; msg.viewId = VIEW_ID;
    if (window.__owdVueInventaire) msg.inventory = true;
    if (!window.__owdVueAttaques && !window.__owdVueDefenses && !window.__owdVueNotes) { msg.takeOpenedAt = takeOpenedAt; msg.takeEnabled = takeEnabled&&edition; }
    if (defendEligible) { msg.defendOpenedAt = defendOpenedAt; msg.defendEnabled = defendEnabled&&edition; }
    try { window.top.postMessage(msg, "*"); } catch (e) {}
  }
  window.addEventListener('pagehide', function () { takeEnabled = false; defendEnabled = false; post({type:'presence',action:'leave'}); post({type:'storage-release'}); post({type:'take-target'}); });
  window.addEventListener('message', function (ev) {
    var d=ev.data;
    if(!d||d.ns!=='owd'||ev.source!==window.parent)return;
    if(d.type==='take-active'&&!window.__owdVueAttaques&&!window.__owdVueDefenses&&!window.__owdVueNotes){
      takeEnabled=!!d.active;if(takeEnabled)takeOpenedAt=Date.now();
      defendEnabled=takeEnabled;if(defendEnabled)defendOpenedAt=Date.now();post({type:'take-target'});
    }else if(d.type==='defend-active'&&defendEligible){
      defendEnabled=!!d.active;if(defendEnabled)defendOpenedAt=Date.now();post({type:'defend-target'});
    }
  });
  if(!window.__owdVueAttaques&&!window.__owdVueDefenses&&!window.__owdVueNotes)try{window.parent.postMessage({ns:'owd',type:'take-ready',charId:CHAR_ID},'*');}catch(e){}
  if(defendEligible)try{window.parent.postMessage({ns:'owd',type:'defend-ready',charId:CHAR_ID},'*');}catch(e){}
  window.addEventListener('focus',function(){if(defendEligible&&defendEnabled){defendOpenedAt=Date.now();post({type:'defend-target'});}});
  var defendQueue = [];
  function defendFromChat(payload) {
    if(typeof payload!=='string'||payload.length>16000||!defendEligible)return;
    if(!ready){defendQueue.push(payload);if(defendQueue.length>8)defendQueue.shift();return;}
    if(window.__owdCanEdit()&&window.Owd&&window.Owd.__defendreDepuisChat)window.Owd.__defendreDepuisChat(payload);
  }
  // ---------- mode jour / nuit ----------
  // Le CSS nuit existe déjà dans la feuille de la fiche (html.night …) ; ici on
  // ne fait que poser la classe. Préférence locale à CE navigateur (vrai
  // localStorage de la page, pas le shim) : "1" nuit, "0" jour, "auto" suit
  // Roll20, ABSENTE = NUIT.
  //
  // LA NUIT EST LE DÉFAUT DANS ROLL20, et c'est une décision : la fiche y vit
  // à côté d'un plateau sombre, et c'est là que la palette du wiki d'Outward
  // veut être — fond noir, encre claire, touches d'or.
  //
  // L'« auto » suit ROLL20 : l'extension détecte le mode sombre de Roll20 au
  // montage de la fiche et le passe par le hash (n=1/0). Une extension plus
  // ancienne n'envoie pas d'indice : repli sur le mode sombre du navigateur
  // (prefers-color-scheme). Il se RANGE désormais tel quel — sans cela,
  // choisir « Selon Roll20 » reviendrait à n'avoir rien choisi, donc à la
  // nuit, et le réglage n'aurait servi à rien.
  // L'onglet Options de la fiche expose ce réglage via window.__owdNight.
  var NIGHT_KEY = "owd-r20-night";
  var NIGHT_HINT = (function () {
    if (/[#&]n=1/.test(location.hash || "")) return true;
    if (/[#&]n=0/.test(location.hash || "")) return false;
    try { return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches); }
    catch (e) { return false; }
  })();
  function nightPref() {
    try {
      var v = localStorage.getItem(NIGHT_KEY);
      return (v === "1" || v === "0" || v === "auto") ? v : "1";
    } catch (e) { return "1"; }
  }
  function applyNight() {
    var p = nightPref();
    var on = p === "0" ? false : p === "auto" ? (NIGHT_HINT === true) : true;
    document.documentElement.classList.toggle("night", on);
    // la surcouche peint les cartes de dés du tchat comme la fiche : elle doit
    // donc connaître son mode, à l'ouverture comme à chaque bascule
    post({ type: "nuit", on: on });
  }
  window.__owdNight = {
    pref: nightPref,          // "auto" | "0" (jour) | "1" (nuit)
    auto: NIGHT_HINT,         // ce que donne l'« auto » (mode de Roll20 ; repli navigateur)
    set: function (v) {
      try {
        // « auto » se RANGE, il ne s'efface pas : une clé absente vaut la nuit.
        if (v === "1" || v === "0" || v === "auto") localStorage.setItem(NIGHT_KEY, v);
        else localStorage.removeItem(NIGHT_KEY);
      } catch (e) {}
      applyNight();
    }
  };
  applyNight();

  // Signale au bundle qu'on est dans Roll20 : affichage condensé (pas de barre
  // d'outils ni de bibliothèque) et jets envoyés au TCHAT Roll20.
  window.__owdCompact = true;
  // CANAUX HISTORIQUES, conservés en REPLI. Sur ce chemin-là c'est l'extension
  // qui recompose la commande : elle n'ajoute ni seuil, ni requête, et un jet
  // parti par là est un « <n>d8 + bonus » public, point. Le canal du jour est
  // __owdChat, plus bas.
  window.__owdRoll = function (die, value, label) { post({ type: "roll", die: die, value: value, label: label }); };
  // envoi d'un ÉLÉMENT de la fiche (objet, arme, technique) au tchat Roll20
  window.__owdSay = function (title, fields) { post({ type: "say", title: title, fields: fields }); };
  // CANAL BRUT : commande de tchat COMPOSÉE par la fiche. L'extension ne
  // réécrit rien et se contente d'une liste blanche (une seule ligne, préfixe
  // de chuchotement facultatif, corps qui commence par &{template:…}) : le
  // format des cartes et des jets vit donc côté site et peut évoluer sans
  // re-signature.
  window.__owdChat = function (raw) { post({ type: "chat", raw: raw }); };
  // Objet pris au tchat : l'extension relaie le payload du lien /owd_take. Il
  // peut arriver AVANT que le bundle soit monté (clic pendant le chargement) :
  // on le met alors en attente et on le rejoue dès que la fiche répond.
  var takeQueue = [];
  window.__owdTake = function (payload) {
    if(ready&&!window.__owdCanEdit())return;
    if (typeof window.__owdOnTake === "function") { window.__owdOnTake(payload); return; }
    if(ready&&!window.__owdCanEdit())return;
    takeQueue.push(payload);
  };
  // Joueurs connectés, pour le sélecteur « À un joueur » de la barre d'envoi.
  // La fiche est une iframe d'une autre origine : elle ne peut pas lire la
  // liste de Roll20 elle-même, seule l'extension y accède. Une extension qui
  // ne connaît pas ce message ne répond RIEN (aucun accusé de réception dans
  // ce pont) : le délai rend alors la main avec null et la fiche retombe sur
  // la liste saisie à la main.
  var playersWait = [];
  window.__owdPlayers = function (cb) {
    if (typeof cb !== "function") return;
    playersWait.push(cb);
    post({ type: "players" });
    setTimeout(function () {
      var i = playersWait.indexOf(cb);
      if (i >= 0) { playersWait.splice(i, 1); cb(null); }
    }, 1200);
  };
  function playersReply(noms) {
    var q = playersWait.slice();
    playersWait.length = 0;
    q.forEach(function (cb) { cb(noms); });
  }
  setInterval(function () {
    if(window.__owdCanEdit()&&window.Owd&&window.Owd.__defendreDepuisChat&&defendQueue.length) {
      var pending=defendQueue.shift(); window.Owd.__defendreDepuisChat(pending);
    }
    if (!window.__owdCanEdit() || !takeQueue.length || typeof window.__owdOnTake !== "function") return;
    var q = takeQueue.slice();
    takeQueue.length = 0;
    q.forEach(function (p) { window.__owdOnTake(p); });
  }, 400);

  var derniereSauvegarde=0;
  function memoriseLectureVerifiee(attrs,remote){
    try{remote=remote||C.read(attrs);if(!remote||remote.incomplete)return;journalRemote=remote;lectureVerifiee=attrs;
      if(!derniereSauvegarde||Date.now()-derniereSauvegarde>=3600000){
        post({type:'backup-snapshot',state:remote.state,reason:derniereSauvegarde?'hourly':'opening'});derniereSauvegarde=Date.now();
      }
      var stamp=remote.meta.epoch+':'+C.hash(C.stable(remote.meta.blocks));if(stamp===empreinteBaseVerifiee)return;
      var base={};base[C.BASE]=attrs[C.BASE];Object.keys(remote.meta.blocks).forEach(function(k){base[k]=attrs[k];});baseVerifiee=base;empreinteBaseVerifiee=stamp;
    }catch(e){}
  }
  function repareBlocsVerifies(attrs){
    try{var cached=baseVerifiee;if(!cached)return false;
      var source=C.snapshot(cached);if(!source)return false;var meta=attrs[C.BASE]?JSON.parse(attrs[C.BASE].current):null,fix={};
      if(!meta){if(!attrs[C.BLOCK+'fiche']||!attrs[C.BLOCK+'inventaire'])return false;var trial=Object.assign({},attrs);trial[C.BASE]=cached[C.BASE];C.read(trial);fix[C.BASE]=cached[C.BASE];}
      else{if(meta.epoch!==source.meta.epoch)return false;Object.keys(meta.blocks||{}).forEach(function(k){if((!attrs[k]||C.hash(attrs[k].current)!==meta.blocks[k])&&cached[k]&&C.hash(cached[k].current)===meta.blocks[k])fix[k]=cached[k];});}
      if(!Object.keys(fix).length)return false;post({type:'save',attrs:fix});return true;
    }catch(e){return false;}
  }
  function exporterRecuperation(){
    var raw=JSON.stringify({format:'outward-recovery',character:CHAR_ID,at:Date.now(),attrs:attrsEnErreur||attrsVus||lastAttrs,verified:lectureVerifiee||baseVerifiee,displayed:mem['owd-perso']||null},null,2);
    var url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='outward-recuperation.json';link.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);
  }
  function reprendLectureValide(attrs){
    if(!gele||gelVolontaire||collaboration||!bundleCharge||!ready||!window.Owd)return;
    try{var remote=C.read(attrs);if(!remote||remote.incomplete)return;
      if(Number(remote.state.v)!==window.Owd.schema){location.reload();return;}
      collaborationApplique=true;try{window.Owd.__recoitEtat(remote.state);}finally{collaborationApplique=false;}
      attrsVus=lastAttrs=attrs;collaboration=new C.Session(attrs,JSON.parse(mem['owd-perso']));updateStorageMaxima();collaboration.capture(JSON.parse(mem['owd-perso']));
      var resumed=collaboration.receive(attrs);synchronisationDifferée=resumed.state;appliqueDiffere();
      gele=false;attrsEnErreur=null;memoriseLectureVerifiee(attrs,remote);fermerBandeau();scheduleSave();
    }catch(e){attrsEnErreur=attrs;}
  }

  function updateStorageMaxima(){if(!collaboration)return;try{var cards=JSON.parse(mem['owd-cards']||'{}'),caps=cards._current&&cards._current.capacites||{};Object.keys(caps).forEach(function(k){if(/Max$/.test(k)&&typeof caps[k]==='number')collaboration.maxima[k.slice(0,-3)]=caps[k];});}catch(e){}}
  // Les saisies en attente vivent seulement dans la session ouverte.
  // Ne jamais lire ni rejouer les anciens journaux persistants du navigateur.
  function purgeAnciennesModificationsLocales() {
    try {
      var prefixes = ['owd-pending-v2:' + CHAR_ID + ':', 'owd-recovery-v2:' + CHAR_ID + ':'];
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key === 'owd-verified-base-v2:' + CHAR_ID || prefixes.some(function(p){return key && key.indexOf(p) === 0;})) keys.push(key);
      }
      keys.forEach(function(key){try{localStorage.removeItem(key);}catch(e){}});
    } catch (e) {}
  }
  purgeAnciennesModificationsLocales();
  var saveStatus = '', saveStatusTimer = null;
  function statutEnregistrement(text,failed) {
    if(failed){saveFailure=text||'error';afficheErreurEnregistrement(true);return;}
    var n=document.getElementById('owd-save-status');
    if(!n){n=document.createElement('div');n.id='owd-save-status';n.setAttribute('role','status');var controls=document.querySelector('#owd-mode-bar .owd-mode-controls');if(controls)controls.appendChild(n);else document.body.insertBefore(n,document.getElementById('perso-fiche'));}
    if(n.textContent!==text)n.textContent=text;n.hidden=!text;saveStatus=text;
    if(saveStatusTimer)clearTimeout(saveStatusTimer);
    if(text==='Enregistré')saveStatusTimer=setTimeout(function(){n.hidden=true;saveStatus='';},2500);
  }
  function afficheErreurEnregistrement(failed){
    if(!ready)return;
    var title=failed?'Impossible d’enregistrer le personnage':'Enregistrement en attente';
    var text=failed?'Une erreur empêche l’enregistrement des dernières modifications. Réessayez dans quelques instants.':'Roll20 n’a pas confirmé les dernières modifications. Elles restent dans cette fenêtre et seront perdues si vous la fermez ou la rechargez. Réessayez dans quelques instants.';
    var n=bandeau(title+' — '+text,[{texte:'Réessayer',acte:'reessayer-enregistrement',action:function(){saveFailure='';firstPendingAt=Date.now();scheduleSave();post({type:'load',resync:true});}},{texte:'Exporter le personnage (JSON)',acte:'export',action:exporter}]);n.dataset.owdRaison='recording';
  }
  window.__owdSaveFailure=function(message){preparationFailed=!!message;if(message){saveFailure=message;afficheErreurEnregistrement(true);}else actualiseStatutEnregistrement(false);};
  function actualiseStatutEnregistrement(failed){
    if(typeof updateSaveContours==='function')updateSaveContours();
    var count=collaboration?Object.keys(collaboration.pending).length:0;
    if(!count&&typeof saveContours!=='undefined'&&saveContours)count=Object.keys(saveContours.records).filter(function(id){return saveContours.records[id].phase==='pending';}).length;
    if(count){if(!firstPendingAt)firstPendingAt=Date.now();statutEnregistrement('Enregistrement en cours…');if(saveFailure)afficheErreurEnregistrement(true);else if(Date.now()-firstPendingAt>=12000)afficheErreurEnregistrement(false);}
    else if(!preparationFailed&&(firstPendingAt||saveFailure)){firstPendingAt=0;saveFailure='';var n=document.getElementById('owd-bandeau');if(n&&n.dataset.owdRaison==='recording')fermerBandeau();statutEnregistrement('Enregistré');}
  }
  function scheduleSave() {
    if (gele) return;           // rien ne sort d'une fiche qu'on n'a pas su lire en entier
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 400);
  }
  var lastSavePerson=null,lastSaveCards=null,lastSaveAttrs=null,lastCapturedPerson=null,miroirsEnAttente=false;
  var saveContours=window.OwdSaveProgress?new window.OwdSaveProgress.Tracker():null;
  var savePainter=saveContours?new window.OwdSaveProgress.Painter(saveContours,document):null;
  window.__owdSavingModules=function(values){
    if(!saveContours)return;
    saveContours.capture(values,collaboration?collaboration.pending:{},ready&&openingDone&&!miseANiveauDemandee&&!collaborationApplique&&!gele);
    updateSaveContours();
  };
  function updateSaveContours(){
    if(!saveContours)return;
    saveContours.confirm(journalRemote,function(id){
      if(['pv','pe','pm'].indexOf(id)<0)return true;
      try{var c=JSON.parse(mem['owd-cards']||'{}')._current,caps=c&&c.capacites,a=lastAttrs['owd_'+id];
        return !!(caps&&a&&String(a.current)===String(caps[id]==null?caps[id+'Max']:caps[id])&&String(a.max)===String(caps[id+'Max']));
      }catch(e){return false;}
    });
    savePainter.sync();
  }
  window.addEventListener('pagehide',function(){if(savePainter)savePainter.destroy();});

  function doSave() {
    if (gele || versionBloquee || !accesInventaire || (miseANiveauDemandee&&migrationEnvoyee)) return;
    saveTimer = null;
    // Les sondes continuent ; une fiche inchangée n'a rien à re-sérialiser.
    if(collaboration&&collaboration.hasBase&&!miseANiveauDemandee&&!miroirsEnAttente&&!Object.keys(collaboration.pending).length&&lastSavePerson===mem['owd-perso']&&lastSaveCards===mem['owd-cards']&&lastSaveAttrs===lastAttrs)return;
    lastSavePerson=mem['owd-perso'];lastSaveCards=mem['owd-cards'];lastSaveAttrs=lastAttrs;
    var state;
    try { state = JSON.parse(mem["owd-perso"] || "null"); } catch (e) { return; }
    if (!state) return;
    var card = null;
    try { var cards = JSON.parse(mem["owd-cards"] || "{}"); card = cards && cards._current; } catch (e) {}
    if (collaboration) {
      collaboration.actor=journalPlayer;if((edition||miseANiveauDemandee)&&lastCapturedPerson!==mem['owd-perso']){collaboration.capture(state);lastCapturedPerson=mem['owd-perso'];}
      var cardCaps=card&&card.capacites||{};
      ['pv','pe','pm','pr','ps','ph','pi','pc','contenance','expo','rupture'].forEach(function(k){var m=cardCaps[k+'Max'];if(typeof m==='number')collaboration.maxima[k]=m;});
      var lot = collaboration.outgoing();
      if(!collaboration.hasBase){
        // Le pont écrit les blocs un à un. Renvoyer toute la base chaque seconde
        // réinsérait les premiers blocs devant le manifeste, qui n'arrivait jamais.
        if(Date.now()-storageInitialSentAt>=10000){var missing=diff(lastAttrs,lot);if(Object.keys(missing).length){post({type:'save',attrs:missing});storageInitialSentAt=Date.now();}}return;
      }
      if(Object.keys(lot).length)post({type:'storage-ops',epoch:collaboration.epoch,ops:Object.keys(lot).map(function(k){return lot[k];}),payloads:collaboration.payloads});
      // Réserves dérivées et version lisible ; les blocs restent la source de vérité.
      var mirrors={};
      // Le marqueur reflète uniquement une lecture Roll20 vérifiée, jamais une saisie en vol.
      if(journalRemote&&!journalRemote.incomplete&&journalRemote.meta.epoch===collaboration.epoch)mirrors.owd_version={current:String(journalRemote.state.v),max:String(journalRemote.state.rel||'')};
      if(card)['pv','pe','pm'].forEach(function(k){var current=cardCaps[k]==null?cardCaps[k+'Max']:cardCaps[k],max=cardCaps[k+'Max'];if(current!==undefined&&max!==undefined)mirrors['owd_'+k]={current:String(current),max:String(max)};});
      var delta=diff(lastAttrs,mirrors);
      if(Object.keys(collaboration.pending).length){
        // Une opération indépendante ne doit pas empêcher de confirmer la version déjà enregistrée.
        miroirsEnAttente=!!delta.owd_version;if(delta.owd_version)post({type:'save',attrs:{owd_version:delta.owd_version}});
      }else{miroirsEnAttente=Object.keys(delta).length>0;if(miroirsEnAttente)post({type:'save',attrs:delta});}

      return;
    }
    var attrs = M.stateToAttrs(state, card);
    // Diff contre ce que Roll20 est CENSÉ contenir : le relu (lastAttrs) plus
    // le lot encore en vol. Le supposer arrivé évite de tout réémettre à
    // chaque frappe ; s'il ne se confirme pas il quitte cette base et repart
    // au save suivant, donc rien ne se perd à le supposer.
    var changed = diff(fusion(lastAttrs, enVol), attrs);
    var names = Object.keys(changed);
    if (!names.length) return;
    enVol = fusion(enVol, changed);
    post({ type: "save", attrs: changed });
    // repère du chien de garde : la taille du owd_state qu'on vient de poster
    var st = attrs[M.PREFIX + "state"];
    taillesPostees.push(st ? String(st.current).length : 0);
    if (taillesPostees.length > 5) taillesPostees.shift();
    armerConfirmation();
    armerGarde();
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
  function fusion(a, b) {
    var out = {};
    if (a) Object.keys(a).forEach(function (k) { out[k] = a[k]; });
    if (b) Object.keys(b).forEach(function (k) { out[k] = b[k]; });
    return out;
  }

  // ---------- accusé de réception ----------
  // Sonde : un « load » dont on attend la réponse. Le pont répond au load par
  // un « hydrate » ; APRÈS la première hydratation ce message n'hydrate plus
  // rien, il vient ici (voir le routage de l'écouteur). Une absence de réponse
  // rend la main avec null : c'est déjà un verdict (personnage injoignable).
  var sondes = [];
  function sonde(cb, frais) {
    var s = { cb: cb, t: null, frais: !!frais };
    s.t = setTimeout(function () {
      var i = sondes.indexOf(s);
      if (i >= 0) sondes.splice(i, 1);
      cb(null);
    }, frais ? 6000 : 1500);
    sondes.push(s);
    post({ type: "load", resync: true });
  }
  function sondeReponse(attrs, frais) {
    var q = sondes.filter(function(s){return !s.frais || frais === true;});
    sondes = sondes.filter(function(s){return q.indexOf(s)<0;});
    q.forEach(function (s) { clearTimeout(s.t); s.cb(attrs || {}); });
  }

  // Empreinte d'une valeur : longueur, 64 premiers et 64 derniers caractères.
  // owd_state pèse couramment des centaines de kilo-octets ; le comparer en
  // entier à chaque sonde figerait le fil de la fiche pour rien. Une écriture
  // perdue, tronquée ou restée à sa valeur précédente change la longueur ou
  // l'une des deux extrémités.
  function empreinte(v) {
    var s = v == null ? "" : String(v);
    // Séparateur en caractère de contrôle, écrit en échappement pour rester
    // visible dans le source. Sans lui, une longueur de 12 suivie de « ab »
    // et une longueur de 1 suivie de « 2ab » donneraient la même empreinte.
    return s.length + "\u0001" + s.slice(0, 64) + "\u0001" + s.slice(-64);
  }
  function concorde(recu, attendu) {
    var noms = Object.keys(attendu);
    for (var i = 0; i < noms.length; i++) {
      var n = noms[i], r = recu[n], a = attendu[n];
      if (r == null) return false;
      if (empreinte(val(r, "current")) !== empreinte(a.current)) return false;
      if (empreinte(val(r, "max")) !== empreinte(a.max)) return false;
    }
    return true;
  }

  // Poste un « load », compare ce qui revient au lot attendu, rappelle
  // cb(true/false). Le pont écrit un attribut toutes les 60 ms en file
  // séquentielle : un gros lot met plusieurs secondes à se poser, d'où les
  // relectures espacées jusqu'au délai maximum.
  function confirme(attrs, cb, delaiMax) {
    if (!attrs || !Object.keys(attrs).length) { cb(true); return; }
    var fin = Date.now() + (delaiMax || 8000);
    (function essai() {
      sonde(function (recu) {
        if (recu && concorde(recu, attrs)) { cb(true); return; }
        if (Date.now() >= fin) { cb(false); return; }
        setTimeout(essai, 700);
      });
    })();
  }

  function armerConfirmation() {
    // 400 ms de grâce, et une seule confirmation à la fois : inutile de relire
    // le personnage pendant que le pont vide sa file, et un save plus récent
    // englobe le précédent (enVol cumule).
    if (enVolTimer) clearTimeout(enVolTimer);
    enVolTimer = setTimeout(function () {
      enVolTimer = null;
      var lot = enVol;
      if (!lot) return;
      confirme(lot, function (ok) {
        if (lot !== enVol) return;   // un save plus récent a repris la main
        if (ok) { lastAttrs = fusion(lastAttrs, lot); enVol = null; echecs = 0; return; }
        // Échec : le lot QUITTE la base du diff. Il redevient donc une
        // différence, et le prochain doSave le repostera de lui-même.
        enVol = null;
        echecs++;
        if (echecs < 2) { scheduleSave(); return; }   // une relance discrète suffit souvent
        // Deux fois de suite : ce n'est plus un contretemps. On prévient, et
        // on cesse de relancer tout seul — le lot part quand même à la
        // prochaine modification, le diff ne l'a pas oublié.
        bandeauPerte();
      }, OPERATION_TIMEOUT);
    }, 400);
  }

  // Chien de garde : une seule fois par session, 5 s après la première
  // sauvegarde. Il ne cherche pas la perte d'un attribut (confirme() s'en
  // charge) mais le cas où RIEN ne s'écrit : fenêtre popout orpheline de sa
  // partie, personnage en lecture seule. C'est le seul détecteur de ces deux
  // situations, où le pont lit très bien mais n'écrit jamais.
  function armerGarde() {
    if (gardeArmee) return;
    gardeArmee = true;
    setTimeout(chienDeGarde, 5000);
  }
  function chienDeGarde() {
    // Deux divergences d'affilée sont exigées, et toute taille RÉCEMMENT
    // postée est acceptée : entre la sonde et sa réponse l'utilisateur a pu
    // taper une lettre de plus, et la taille attendue changer sous nos pieds.
    var restant = 2;
    (function verifier() {
      sonde(function (recu) {
        var a = recu ? recu[M.PREFIX + "state"] : null;
        var vu = a ? String(val(a, "current")).length : -1;
        if (taillesPostees.indexOf(vu) >= 0) return;
        if (--restant > 0) { setTimeout(verifier, 1500); return; }
        bandeauPerte();
      });
    })();
  }

  // ---------- bandeau ----------
  // Les styles sont injectés d'ici et non posés dans stylesheets/owd-roll20.css :
  // ces bandeaux doivent pouvoir s'afficher même quand la feuille n'a pas été
  // chargée (manifeste en repli, réseau coupé en cours de route) — or c'est
  // précisément dans ces moments qu'ils ont quelque chose à dire.
  //
  // Conséquence : les couleurs sont ici EN DUR, jamais en var(). Aucune
  // variable de palette n'est garantie dans ce cadre — extra.css et night.css
  // ne sont pas du bundle de l'iframe, et owd-fiche.css pose les siennes sur
  // .perso-fiche, que ni le bandeau ni l'écran ne touchent (ils vivent au-dessus
  // et à côté de la fiche, souvent AVANT qu'elle existe). Ce sont donc les
  // valeurs du wiki d'Outward recopiées, les mêmes que celles de :root et de
  // html.night body dans extra.css / night.css :
  //   jour  feuille #ffffff · pourtour #e9e7e2 · encre #1a1a1a · pavé #f5f2ea
  //         filet doré #e0cfa0 · or de texte #7a5c10
  //   nuit  feuille #0d0d0d · pourtour #000000 · encre #e6e6e6 · pavé #1a1a1a
  //         filet doré #6b5a2e
  //   les deux : le bandeau #262626 et l'or du wiki #ffd77f, qui donne 11:1 sur
  //         ce gris, 15,3:1 sur le noir, et 12,7:1 en FOND sous une encre
  //         sombre — jamais en texte sur du clair, où il tombe à 1,4:1.
  // Le rouge #a5342c et son voile ne sont pas de la palette : ils disent le
  // danger, et rien d'autre dans ces deux pièces ne porte de couleur.
  var CSS_BANDEAU =
    // Le bandeau est SOMBRE de jour comme de nuit, comme l'en-tête du site et
    // comme le châssis du wiki : c'est le fond sur lequel l'or se lit le mieux,
    // et une alerte n'a pas à changer de nature quand on change de mode.
    "#owd-bandeau{position:sticky;top:0;z-index:50;display:flex;flex-wrap:wrap;align-items:center;" +
    "gap:.5rem;padding:.5rem .7rem;background:#262626;color:#ffd77f;border-bottom:1px solid #6b5a2e;" +
    "font-family:'Proxima Nova',proxima-nova,'Nunito Sans','Helvetica Neue',Helvetica,Arial,sans-serif;" +
    "font-size:.72rem;line-height:1.45}" +
    "#owd-bandeau .owd-bandeau-txt{flex:1 1 14rem;min-width:0}" +
    // Bouton creusé DANS le bandeau : un cran plus noir que lui, cerné d'un
    // filet doré. L'or y donne 14:1 ; le survol éclaircit le fond, pas le texte.
    "#owd-bandeau .owd-bandeau-btn{flex:0 0 auto;padding:.2rem .6rem;border:1px solid #6b5a2e;" +
    "border-radius:.2rem;background:#0d0d0d;color:#ffd77f;font:inherit;cursor:pointer}" +
    "#owd-bandeau .owd-bandeau-btn:hover{background:#3a3a3a}" +
    // Les deux règles de nuit du bandeau redisent exactement le jour : elles
    // sont gardées parce que le sélecteur html.night est le seul endroit d'où
    // le bandeau pourrait un jour diverger, et qu'on ne le retrouverait plus.
    "html.night #owd-bandeau{background:#262626;color:#ffd77f;border-bottom-color:#6b5a2e}" +
    "html.night #owd-bandeau .owd-bandeau-btn{background:#0d0d0d;color:#ffd77f;border-color:#6b5a2e}" +
    // Écran de version : il RECOUVRE la page (position fixed, z-index au-dessus
    // du bandeau) parce qu'il n'annonce pas, il barre le passage. La fiche
    // n'est pas derrière : elle n'est pas encore chargée.
    // Le pourtour de l'écran est celui du plan de travail, la boîte celui de la
    // feuille : blanche le jour, à peine au-dessus du noir la nuit. Son filet
    // est DORÉ (#e0cfa0), la seule touche d'or que porte un fond clair.
    "#owd-ecran{position:fixed;top:0;left:0;right:0;bottom:0;z-index:80;overflow:auto;" +
    "padding:1rem;background:#e9e7e2;color:#1a1a1a;" +
    "font-family:'Proxima Nova',proxima-nova,'Nunito Sans','Helvetica Neue',Helvetica,Arial,sans-serif;" +
    "font-size:.8rem;line-height:1.5}" +
    "#owd-ecran .owd-ecran-boite{box-sizing:border-box;max-width:34rem;margin:0 auto;background:#ffffff;" +
    "border:1px solid #e0cfa0;border-radius:.3rem;padding:.9rem 1rem}" +
    // Écran d'échec : le filet doré cède au rouge, et la boîte prend son voile.
    "#owd-ecran.owd-ecran-rouge .owd-ecran-boite{border-color:#a5342c;background:#fdf1ec}" +
    // Titres : la Condensed de Roll20 d'abord, comme les titres de ses panneaux.
    "#owd-ecran h1{margin:0 0 .5rem;font-family:'Proxima Nova Condensed','Proxima Nova',proxima-nova," +
    "'Nunito Sans',Helvetica,Arial,sans-serif;font-size:1.15rem;line-height:1.25}" +
    "#owd-ecran h2{margin:.85rem 0 .25rem;font-size:.88rem}" +
    "#owd-ecran p{margin:.35rem 0}" +
    "#owd-ecran ul{margin:.3rem 0;padding-left:1.1rem}" +
    "#owd-ecran li{margin:.25rem 0}" +
    "#owd-ecran .owd-ecran-vers{display:flex;flex-wrap:wrap;gap:.2rem 1.4rem;margin:.5rem 0;" +
    // Le pavé des numéros de version : la zébrure impaire du site (#f5f2ea le
    // jour, #1a1a1a la nuit), assez pour se détacher de la feuille sans filet.
    "padding:.35rem .6rem;background:#f5f2ea;border-radius:.2rem}" +
    "#owd-ecran .owd-ecran-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin:.85rem 0 .4rem}" +
    // Bouton ordinaire : la feuille elle-même, cernée du filet doré. Le fond
    // étant déjà blanc, c'est le survol qui s'assombrit d'un cran (#f5f2ea) :
    // un survol qui éclaircirait vers le blanc pur ne se verrait plus.
    "#owd-ecran button{padding:.35rem .7rem;border:1px solid #e0cfa0;border-radius:.2rem;" +
    "background:#ffffff;color:#1a1a1a;font:inherit;cursor:pointer}" +
    "#owd-ecran button:hover:not([disabled]){background:#f5f2ea}" +
    // Bouton principal : PLEIN d'or vif, sous une encre sombre — 12,7:1. C'est
    // le seul emploi permis de #ffd77f près d'un fond clair : en fond, jamais
    // en texte. Il ne change pas de mode, l'or n'a qu'une valeur.
    "#owd-ecran button.owd-ecran-primaire{background:#ffd77f;color:#1a1a1a;border-color:#ffd77f}" +
    "#owd-ecran button[disabled]{opacity:.45;cursor:not-allowed}" +
    "#owd-ecran .owd-ecran-note{font-size:.72rem;opacity:.85}" +
    "#owd-ecran label.owd-ecran-epingle{display:block;margin:.2rem 0}" +
    // box-sizing explicite : sans lui le textarea déborde de la boîte dans
    // l'iframe Roll20, où la feuille de la fiche n'est pas toujours chargée.
    "#owd-ecran textarea{box-sizing:border-box;width:100%;min-height:8rem;margin-top:.3rem;" +
    "font-family:'Roboto Mono',monospace;font-size:.66rem}" +
    // Nuit : le noir du wiki au pourtour, la feuille juste au-dessus pour s'en
    // détacher sans devenir grise, et le filet doré qui s'assombrit (#6b5a2e)
    // puisqu'il n'a plus le blanc à trancher.
    "html.night #owd-ecran{background:#000000;color:#e6e6e6}" +
    "html.night #owd-ecran .owd-ecran-boite{background:#0d0d0d;border-color:#6b5a2e}" +
    "html.night #owd-ecran.owd-ecran-rouge .owd-ecran-boite{background:#2e1d1a;border-color:#a5342c}" +
    "html.night #owd-ecran .owd-ecran-vers{background:#1a1a1a}" +
    "html.night #owd-ecran button{background:#1a1a1a;color:#e6e6e6;border-color:#6b5a2e}" +
    // Le bouton principal garde son or plein : sur du noir, l'encre sombre qu'il
    // porte descend à #0d0d0d, la feuille de nuit, plutôt que le gris du jour.
    "html.night #owd-ecran button.owd-ecran-primaire{background:#ffd77f;color:#0d0d0d;border-color:#ffd77f}" +
    "html.night #owd-ecran textarea{background:#0d0d0d;color:#e6e6e6;border-color:#3a3a3a}";
  function poserStyles() {
    if (document.getElementById("owd-bandeau-css")) return;
    var s = document.createElement("style");
    s.id = "owd-bandeau-css";
    s.textContent = CSS_BANDEAU + "#owd-save-status{padding:.2rem .6rem;font-size:12px}.owd-consultation #perso-fiche input:not([type=search]),.owd-consultation #perso-fiche textarea,.owd-consultation #perso-fiche select{cursor:default}.owd-ecran-telecharger{display:inline-block;padding:.35rem .7rem;border:1px solid #6b5a2e;border-radius:.2rem;color:inherit;text-decoration:none}";
    document.head.appendChild(s);
  }
  // txt : texte brut (jamais de HTML, il peut venir d'un message d'erreur).
  // actions : [{ texte, action, acte }] rendues en boutons à droite du texte.
  // `acte` est un nom stable posé en data-owd-act : les libellés se réécrivent,
  // les harnais de test s'accrochent à ça et non à la prose.
  function bandeau(txt, actions) {
    poserStyles();
    var b = document.getElementById("owd-bandeau");
    if (!b) {
      b = document.createElement("div");
      b.id = "owd-bandeau";
      document.body.insertBefore(b, document.body.firstChild);
    }
    delete b.dataset.owdRaison;
    b.innerHTML = "";
    var p = document.createElement("span");
    p.className = "owd-bandeau-txt";
    p.textContent = txt;
    b.appendChild(p);
    (actions || []).forEach(function (a) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "owd-bandeau-btn";
      btn.textContent = a.texte;
      if (a.acte) btn.setAttribute("data-owd-act", a.acte);
      btn.onclick = a.action;
      b.appendChild(btn);
    });
    return b;
  }
  function fermerBandeau() {
    var b = document.getElementById("owd-bandeau");
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }
  function bandeauPerte(){afficheErreurEnregistrement(false);}
  function bandeauGelIllisible(raison){erreurOuverture(/absent|incomplet/i.test(raison||'')?'incomplete':'unreadable');}
  function bandeauGelDisparu(){erreurOuverture('incomplete');}
  // ================= écran de version =================
  /* La fiche vit dans le personnage Roll20, le code vit sur le site, et les
   * deux ne bougent pas ensemble : une table peut ne pas rouvrir une fiche
   * pendant des mois, pendant que le site publie trois versions. Rouvrir en
   * silence, c'est réécrire une fiche avec un code qui ne l'a pas écrite —
   * exactement ce qu'un jeu refuse de faire avec une sauvegarde d'une autre
   * version.
   *
   * D'où cet écran, posé ENTRE la réception des attributs et l'injection du
   * bundle : à cet instant `ready` vaut encore false, donc setItem ne
   * déclenche aucun save, et le bundle n'est pas là pour en produire. Rien ne
   * peut être écrit tant que le joueur n'a pas tranché. C'est la seule
   * garantie qui compte ici, et elle est structurelle, pas déclarative.
   *
   * Deux entrées asynchrones mènent à la décision (les attributs qui
   * arrivent, le manifeste qui peut arriver après) : decider() ne fait rien
   * tant qu'il manque l'une des deux, et n'agit qu'une fois.
   */

  // Épinglage : « ne plus me demander pour ce personnage ». Vrai localStorage
  // de la page (pas le shim), donc PAR NAVIGATEUR : le choix d'un joueur
  // d'ouvrir une vieille fiche avec son ancien code ne s'impose pas à la table.
  var PIN_PREFIX = "owd-r20-version:";
  // Ce que la montée met à l'abri, dans le personnage lui-même.

  var attrsVus = null;          // les attributs reçus, gardés pour la décision
  var attrsPrets = false;
  var manifPret = false;
  var decide = false;           // decider() n'agit qu'une fois
  var boiteCourante = null;     // la boîte de l'écran affiché (pour y ajouter le JSON)

  function manifeste() { return window.__owdManifeste || null; }
  function releaseSite() {
    var r = null;
    try { r = M.release ? M.release() : null; } catch (e) {}
    return r || M.RELEASE || "";
  }
  function schemaSite() {
    var m = manifeste();
    var n = m ? parseInt(m.schema, 10) : NaN;
    if (isFinite(n)) return n;
    // Repli sans manifeste : la constante de la carte d'attributs, JAMAIS le
    // majeur de la release. Le schéma est un entier indépendant, monté au seul
    // changement de forme de l'état : le jour où X monte seul (2.0.0 en schéma
    // 1), le déduire du majeur ferait passer tout le parc pour périmé et
    // proposerait une montée que le moteur refuse, à chaque ouverture.
    var s = M && M.SCHEMA;
    return (typeof s === "number" && isFinite(s)) ? s : 1;
  }
  // Toute différence de release ou de schéma demande un accord explicite.
  // LA lecture d'un numéro, seule de tout le fichier, et celle du contrat :
  // « v » facultatif, un à trois nombres (les manquants valent 0), « b » de
  // la beta COLLÉ au dernier, suffixe de fabrication [-+…] toléré. Rend
  // { rang: [x, y, z], beta } ou null. UNE SEULE LECTURE DANS TOUT LE FICHIER,
  // c'est la règle : trois lectures cohabitaient dans le fichier dont celui-ci
  // est repris et n'acceptaient pas les mêmes textes, si bien que le même
  // numéro pouvait désigner une ligne d'archive et rester illisible pour la
  // comparaison, qui retombait alors sur l'égalité de chaînes et déclarait deux
  // versions différentes. Le suffixe ne change PAS le rang, la beta étant ce
  // que le stable recevra à la fusion : une fiche écrite sur la beta ne paraît
  // jamais plus récente que le site stable du même numéro.
  function lire(rel) {
    var m = /^\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(b?)(?:[-+][0-9A-Za-z.-]*)?\s*$/
      .exec(String(rel == null ? "" : rel));
    return m ? { rang: [parseInt(m[1], 10), parseInt(m[2] || "0", 10), parseInt(m[3] || "0", 10)],
                 beta: m[4] === "b" } : null;
  }
  // Même rang, ou même LIGNE X.Y quand `ligne` est vrai. Illisible d'un côté :
  // on retombe sur l'égalité de chaîne — une version qu'on ne sait pas lire ne
  // doit rien casser, la fiche s'ouvre.
  function memeRang(a, b, ligne) {
    var x = lire(a), y = lire(b);
    if (!x || !y) return String(a) === String(b);
    return x.rang[0] === y.rang[0] && x.rang[1] === y.rang[1] &&
           (!!ligne || x.rang[2] === y.rang[2]);
  }
  // 1 si a est au-dessus de b, -1 en dessous, 0 au même rang, null dès que l'un
  // des deux est illisible : conclure « égal » en silence est justement ce qui
  // laisserait passer une fiche venue du futur sans un mot.
  function compare(a, b) {
    var x = lire(a), y = lire(b);
    if (!x || !y) return null;
    for (var i = 0; i < 3; i++) {
      if (x.rang[i] !== y.rang[i]) return x.rang[i] > y.rang[i] ? 1 : -1;
    }
    return 0;
  }

  // Une URL de manifeste doit rester dans le site : relative, sans schéma ni
  // « // », sans remontée de dossier. L'amorceur applique déjà cette règle à ce
  // qu'il charge, mais PAS aux archives, qu'il ne lit pas : c'est donc ici
  // qu'un manifeste trafiqué serait arrêté avant de faire injecter un script.
  function urlSure(u) {
    return typeof u === "string" && !!u &&
           !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(u) && u.indexOf("//") !== 0 && u.indexOf("..") < 0;
  }
  function listeSure(l) { return Array.isArray(l) && !!l.length && l.every(urlSure); }

  // Le bundle du jour. Ses styles sont déjà posés par l'amorceur : on ne
  // recharge ici que les scripts.
  function specCourant() {
    var m = manifeste();
    var b = (m && m.bundle) || null;
    return {
      js: (b && listeSure(b.js)) ? b.js : ["javascripts/owd-fiche.js"],
      css: (b && Array.isArray(b.css)) ? b.css : [],
      data: (b && b.data) || null
    };
  }

  // Archive d'une version passée, déclarée par le manifeste sous son numéro :
  //   "archives": { "1.0.0": { "js": [...], "css": [...], "data": "...",
  //                            "attrmap": "..." } }
  // Un simple tableau de scripts est accepté. Rend null si rien n'est publié
  // pour la LIGNE demandée, ou si une seule URL sort du site. Outward part
  // avec « archives »: {} — le bouton est donc grisé, avec sa raison, ce qui
  // est le comportement correct tant qu'aucune ligne n'a été gelée.
  //
  // Recherche par LIGNE X.Y, jamais par clé exacte : une ligne ne gèle qu'UNE
  // archive, à sa première release (« 1.2.0 » ouvre la ligne 1.2), et les
  // correctifs qui suivent n'ont donc pas de dossier à eux. Chercher
  // m.archives["1.2.4"] ne trouverait rien et griserait « ouvrir avec sa
  // version » pour toute une ligne. Le personnage descend alors à la release de
  // l'archive (1.2.4 ouvert par 1.2.0) : c'est le prix assumé du gel par ligne,
  // et il ne boucle pas, la ligne de 1.2.0 restant 1.2.
  function archiveDe(rel) {
    var r = lire(rel);
    var m = manifeste();
    var tout = (m && m.archives && typeof m.archives === "object") ? m.archives : null;
    if (!r || !tout) return null;
    var cles = Object.keys(tout).sort(), cle = null, cr = null;
    for (var i = 0; i < cles.length; i++) {
      var c = lire(cles[i]);
      if (!c || c.rang[0] !== r.rang[0] || c.rang[1] !== r.rang[1]) continue;
      // La plus récente de la ligne. X et Y sont déjà égaux par le filtre :
      // comparer Z compare donc le rang entier. En NOMBRE, car un tri de
      // chaînes rangerait « 1.2.10 » avant « 1.2.9 ». Ce départage doit être
      // IDENTIQUE, à la lettre, dans l'outil qui gèle les archives et ici, sans
      // quoi les deux désigneraient deux dossiers différents pour la même
      // fiche : clés parcourues TRIÉES et comparaison STRICTE, donc à rang égal
      // (« 1.2.0 » et « 1.2.0b ») c'est la plus PETITE qui tranche, et rien ne
      // dépend de l'ordre des clés du JSON, qui n'est pas une garantie.
      if (!cr || c.rang[2] > cr.rang[2]) { cr = c; cle = cles[i]; }
    }
    if (!cle) return null;
    var a = tout[cle];
    if (!a) return null;
    // release portée par la spec : chargerBundle en fait la release EFFECTIVE,
    // celle que la carte d'attributs écrira dans owd_version.max. C'est la CLÉ
    // retenue, jamais la version demandée : inscrire « 1.2.4 » alors que c'est
    // le code de 1.2.0 qui tourne ferait mentir la seule ligne qui dit ce qui
    // tourne vraiment.
    var spec = Array.isArray(a) ? { js: a, css: [], data: null, attrmap: null, release: cle }
             : { js: a.js, css: Array.isArray(a.css) ? a.css : [], data: a.data == null ? null : a.data,
                 attrmap: a.attrmap == null ? null : a.attrmap, release: cle };
    // Contrôles d'URL sur la SEULE entrée retenue, et refus net si elle est mal
    // formée : redescendre à une clé plus ancienne de la ligne servirait un
    // autre code que celui qu'annonce le bouton. Un bouton grisé est honnête,
    // une archive de repli silencieuse ne l'est pas.
    if (!listeSure(spec.js)) return null;
    if (spec.css.length && !listeSure(spec.css)) return null;
    if (spec.data != null && !urlSure(spec.data)) return null;
    if (spec.attrmap != null && !urlSure(spec.attrmap)) return null;
    return spec;
  }

  function versionFiche(attrs) {
    var f = null;
    try { f = M.ficheDe(attrs); } catch (e) { f = null; }
    return f || null;
  }
  function texteVersion(rel, sch) {
    var s = (sch == null) ? "schéma inconnu" : ("schéma " + sch);
    return (rel ? rel : "version non inscrite") + " (" + s + ")";
  }

  // ---------- fabrique de l'écran ----------
  // Tout est construit noeud par noeud : aucun innerHTML avec du contenu
  // variable (un numéro de version ou une note de migration viennent d'un
  // fichier JSON, et un jour d'une archive).
  function noeud(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function fermerEcran() {
    var e = document.getElementById("owd-ecran");
    if (e && e.parentNode) e.parentNode.removeChild(e);
    boiteCourante = null;
  }
  function ecran(titre, rouge) {
    poserStyles();
    fermerEcran();
    var fond = document.createElement("div");
    fond.id = "owd-ecran";
    if (rouge) fond.className = "owd-ecran-rouge";
    fond.setAttribute("role", "dialog");
    var boite = noeud("div", "owd-ecran-boite");
    boite.appendChild(noeud("h1", null, titre));
    fond.appendChild(boite);
    document.body.appendChild(fond);
    boiteCourante = boite;
    return boite;
  }
  function zoneActions(boite) {
    var d = noeud("div", "owd-ecran-actions");
    boite.appendChild(d);
    return d;
  }
  // acte : nom stable en data-owd-act, sur lequel s'accrochent les harnais.
  function bouton(zone, texte, acte, action, primaire) {
    var b = noeud("button", primaire ? "owd-ecran-primaire" : null, texte);
    b.type = "button";
    b.setAttribute("data-owd-act", acte);
    b.onclick = action;
    zone.appendChild(b);
    return b;
  }
  function griser(btn, raison, boite) {
    btn.disabled = true;
    btn.title = raison;
    boite.appendChild(noeud("p", "owd-ecran-note", raison));
  }
  function ecranAttente(titre, txt) {
    var b = ecran(titre, false);
    b.appendChild(noeud("p", null, txt));
    return b;
  }

  function startLoading(kind,step){
    if(kind==='opening'&&!operationBusy&&operationSerial)openingStartedAt=Date.now();
    loadingKind=kind||'opening';failureKind='';operationBusy=true;var serial=++operationSerial;
    if(operationTimer)clearTimeout(operationTimer);
    ecranAttente('Chargement du personnage',step||'Vérification de l’extension…');
    operationTimer=setTimeout(function(){if(serial!==operationSerial)return;operationBusy=false;if(loadingKind==='upgrade')erreurMiseAJour();else erreurOuverture(extensionReady?'timeout':'extension');},kind==='opening'?Math.max(0,OPERATION_TIMEOUT-(Date.now()-openingStartedAt)):OPERATION_TIMEOUT);
    return serial;
  }
  function stopLoading(){operationBusy=false;++operationSerial;if(operationTimer)clearTimeout(operationTimer);operationTimer=null;}
  function updateLoading(step){var e=document.querySelector('#owd-ecran .owd-ecran-boite p');if(e&&operationBusy)e.textContent=step;}
  function exportPossible(){return !!(mem['owd-perso']&&mem['owd-perso']!=='null'&&mem['owd-perso']!=='{}');}
  function exportButton(z,available){var b=bouton(z,'Exporter les données disponibles','export',exporter);if(!available)griser(b,'Aucune donnée du personnage disponible à exporter.',z.parentNode);return b;}
  function erreurOuverture(kind){
    stopLoading();failureKind=kind;
    var messages={timeout:'Roll20 n’a pas répondu à la demande de chargement du personnage.',extension:'Les informations nécessaires pour vérifier la version de l’extension n’ont pas pu être récupérées.',incomplete:'Roll20 n’a pas transmis toutes les données nécessaires pour ouvrir ce personnage.',unreadable:'Les données reçues de Roll20 ne peuvent pas être lues. Le personnage n’a pas pu être ouvert.',files:'Les fichiers nécessaires au fonctionnement de la fiche n’ont pas pu être chargés.',program:'Une erreur empêche l’affichage de la fiche.'};
    var b=ecran('Impossible d’ouvrir le personnage',true);b.appendChild(noeud('p',null,(messages[kind]||messages.program)+' Réessayez dans quelques instants.'));
    var z=zoneActions(b);bouton(z,'Réessayer','reessayer-ouverture',function(){if(!extensionReady){extensionChecking=false;verifyExtension(lastHydration);return;}if(bundleCharge&&kind==='files'||bundleCharge&&kind==='program'){location.reload();return;}hydrated=false;decide=false;attrsPrets=false;gele=false;startLoading('opening','Chargement des données du personnage depuis Roll20…');post({type:'load',resync:true});});exportButton(z,exportPossible());
  }
  function erreurMiseAJour(){stopLoading();failureKind='upgrade';var b=ecran('Impossible de mettre à jour le personnage',true);b.appendChild(noeud('p',null,'La mise à jour du personnage n’a pas pu être terminée. Réessayez dans quelques instants.'));var z=zoneActions(b);bouton(z,'Réessayer','reessayer-upgrade',function(){location.reload();});boutonExport(z);}
  function extensionUpdate(installed,latest){stopLoading();var b=ecran('Extension Outward à mettre à jour',false);b.appendChild(noeud('p',null,'Votre extension Outward n’est pas à jour. Installez la dernière version, puis rechargez la page Roll20 pour ouvrir ce personnage.'));var v=noeud('div','owd-ecran-vers');v.appendChild(noeud('span',null,'Votre version de l’extension : '+installed));v.appendChild(noeud('span',null,'Dernière version de l’extension : '+latest));b.appendChild(v);var z=zoneActions(b);boutonExport(z);var a=noeud('a','owd-ecran-telecharger','Télécharger la mise à jour');a.href=new URL('extension/',location.href).href;a.target='_blank';a.rel='noopener';z.appendChild(a);}
  function compareExtension(a,b){
    function parts(v){return /^\d+\.\d+\.\d+(?:\.\d+)?$/.test(String(v))?String(v).split('.').map(Number):null;}
    var x=parts(a),y=parts(b);if(!x||!y)return null;
    for(var i=0;i<4;i++){var n=(x[i]||0)-(y[i]||0);if(n)return n<0?-1:1;}return 0;
  }
  function verifyExtension(d){
    if(extensionReady||extensionChecking)return;
    extensionChecking=true;extensionInfo=d&&d.extension||null;
    startLoading('opening','Vérification de l’extension…');
    var serial=operationSerial;
    fetch('download/ext-signed.json?t='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw Error('extension');return r.json();}).then(function(meta){
      if(serial!==operationSerial)return;
      var mode=/b$/.test(releaseSite())?'beta':'stable',installed=extensionInfo&&extensionInfo.version,latest=meta&&meta.version;
      var comparison=compareExtension(installed,latest);
      if(comparison===null){erreurOuverture('extension');return;}
      if(comparison<0||!storageCapable||!collaborationPont||!extensionInfo.sessionUi){extensionUpdate(installed,latest);return;}
      extensionReady=true;extensionChecking=false;updateLoading('Chargement des données du personnage depuis Roll20…');
      if(lastHydration&&lastHydration.fresh===true)hydrate(lastHydration.attrs);else post({type:'load',resync:true});
    }).catch(function(){if(serial===operationSerial)erreurOuverture('extension');});
  }
  window.__owdOpenFailure=function(kind){if(miseANiveauDemandee)erreurMiseAJour();else erreurOuverture(kind||'program');};

  function canUseControl(target){
    if(!target||!target.closest)return false;
    return target.matches('.pc-obj-tile,.pc-inv-objet,.pc-obj-content-slot.plein,.pc-tab,.pc-attaque-tete,.pc-combat-ouvrir,.pc-comp-groupe-nom,.pc-comp-repli,.pc-comp-roll,.pc-notes-latest,.pc-notes-older,.pc-notes-newer,.pc-note-toggle,.pc-journal-toggle,summary,a[href]') || !!target.closest('[data-consultation],.pc-notes-search,.pc-journal-pages') || target.type==='search';
  }
  var sharedModeState=null;
  function applySharedMode(mode){
    if(!mode)return;
    var at=Number(mode.modeAt)||0,by=String(mode.modeBy||'');
    if(sharedModeState&&(at<sharedModeState.modeAt||at===sharedModeState.modeAt&&by<sharedModeState.modeBy))return;
    sharedModeState={mode:mode.mode==='edition'?'edition':'consultation',modeAt:at,modeBy:by};
    if(!ready||!openingDone||!document.getElementById('owd-mode-bar'))return;
    var next=sharedModeState.mode==='edition',changed=edition!==next;edition=next;
    var bar=document.getElementById('owd-mode-bar');bar.querySelector('.owd-mode-label').textContent=edition?'Mode Edition':'Mode Consultation';
    bar.querySelector('#owd-mode-switch').textContent=edition?'Passer en Mode Consultation':'Passer en Mode Edition';
    document.documentElement.classList.toggle('owd-consultation',!edition);
    if(changed&&window.Owd&&window.Owd.remonte)window.Owd.remonte();
    if(changed){post({type:'take-target'});post({type:'defend-target'});}
    renderPresence();applyModeControls();
  }
  function installModeBar(){
    var bar=document.getElementById('owd-mode-bar');if(bar){applySharedMode(sharedModeState);renderPresence();return;}
    bar=noeud('div','owd-mode-bar');bar.id='owd-mode-bar';
    var label=noeud('strong','owd-mode-label','Mode Consultation'),button=noeud('button','pc-btn','Passer en Mode Edition');button.type='button';button.id='owd-mode-switch';
    button.onclick=function(){
      if(gele||!accesInventaire||document.getElementById('owd-ecran'))return;
      post({type:'presence',action:'mode',mode:edition?'consultation':'edition'});
    };
    var controls=noeud('div','owd-mode-controls'),presence=noeud('div','owd-mode-presence');
    controls.appendChild(label);controls.appendChild(button);presence.appendChild(noeud('div','owd-presence-edition'));presence.appendChild(noeud('div','owd-presence-consultation'));bar.appendChild(controls);bar.appendChild(presence);var status=document.getElementById('owd-save-status');if(status)controls.appendChild(status);
    document.body.insertBefore(bar,document.getElementById('perso-fiche'));document.documentElement.classList.add('owd-consultation');applySharedMode(sharedModeState);sendPresence('join');renderPresence();applyModeControls();
  }
  function applyModeControls(scope){
    if(!ready)return;
    var surface=scope&&scope.querySelectorAll?scope:document;
    if(surface===document&&savePainter)savePainter.sync();surface.querySelectorAll(surface===document?'#perso-fiche input,#perso-fiche textarea,#perso-fiche select,#perso-fiche button,#perso-fiche [draggable="true"]':'input,textarea,select,button,[draggable="true"]').forEach(function(n){
      if(!window.__owdCanEdit()){
        // Une tuile reste sélectionnable, mais ne devient jamais une source de déplacement.
        if(n.draggable)n.draggable=false;
        if(!canUseControl(n)){n.setAttribute('data-owd-readonly','1');if(n.tagName==='TEXTAREA'||n.tagName==='INPUT'&&!/^(checkbox|radio|range|file|button|submit)$/.test(n.type))n.readOnly=true;else n.disabled=true;}
      }
    });
  }
  window.__owdApplyMode=applyModeControls;
  function sendPresence(action){if(ready&&openingDone&&journalPlayer)post({type:'presence',action:action||'heartbeat',mode:edition?'edition':'consultation'});}
  function renderPresence(){
    var bar=document.getElementById('owd-mode-bar');if(!bar)return;
    var byPlayer={};(presenceRows||[]).forEach(function(r){if(r.left||Date.now()-r.at>=30000)return;var id=r.player,name=r.name||id;if(!byPlayer[id])byPlayer[id]={name:name,edition:false};if(r.mode==='edition')byPlayer[id].edition=true;});
    if(journalPlayer){var me=byPlayer[journalPlayer.id]||(byPlayer[journalPlayer.id]={name:journalPlayer.name,edition:false});if(edition)me.edition=true;}
    var edit=[],read=[];Object.keys(byPlayer).sort().forEach(function(id){(byPlayer[id].edition?edit:read).push(byPlayer[id].name);});
    var e=bar.querySelector('.owd-presence-edition'),c=bar.querySelector('.owd-presence-consultation'),et='En édition : '+(edit.join(', ')||'—'),ct='En consultation : '+(read.join(', ')||'—');if(e.textContent!==et)e.textContent=et;if(c.textContent!==ct)c.textContent=ct;
  }
  setInterval(sendPresence,10000);
  function guardConsultation(ev){
    if(!ready||window.__owdCanEdit()||!ev.target||!ev.target.closest||!ev.target.closest('#perso-fiche'))return;
    // Les permissions de lecture concernent le clic, jamais le déplacement ni le dépôt.
    var interaction=/^(dragstart|dragenter|dragover|drop|contextmenu|submit)$/.test(ev.type)||ev.type==='keydown'&&(ev.key==='ContextMenu'||ev.key==='F10'&&ev.shiftKey);
    var target=ev.target.closest('button,input,textarea,select,a,summary,[contenteditable="true"],.pc-obj-content-slot,.pc-obj-tile,.pc-inv-objet,.pc-comp-groupe-nom,.pc-tab,.pc-comp-roll,.pc-note-toggle,.pc-journal-toggle,[data-consultation]');
    if(!interaction&&canUseControl(target))return;
    // Conserver la sélection et la copie de texte, le défilement et la navigation au clavier.
    if(ev.type==='keydown'&&((ev.ctrlKey||ev.metaKey)&&/^[ac]$/i.test(ev.key)||/^(Tab|Escape|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|PageUp|PageDown|Home|End)$/.test(ev.key)))return;
    ev.preventDefault();ev.stopImmediatePropagation();
  }
  ['click','dblclick','beforeinput','input','change','keydown','paste','cut','submit','contextmenu','dragstart','dragenter','dragover','drop'].forEach(function(type){document.addEventListener(type,guardConsultation,true);});
  document.addEventListener('focusin',function(ev){if(!window.__owdCanEdit()&&ready&&ev.target&&ev.target.matches&&ev.target.matches('#perso-fiche input,#perso-fiche textarea,#perso-fiche select')&&!canUseControl(ev.target)){ev.target.blur();}},true);

  // ---------- export ----------
  // Le JSON du personnage TEL QU'IL A ÉTÉ LU, avant toute migration : c'est
  // lui qu'il faut pouvoir garder de côté avant d'accepter quoi que ce soit.
  function jsonPerso() {
    var brut = mem["owd-perso"] || "{}";
    try { return JSON.stringify(JSON.parse(brut), null, 2); } catch (e) { return brut; }
  }
  function nomFichier() {
    var n = "";
    try { n = (JSON.parse(mem["owd-perso"] || "{}") || {}).name || ""; } catch (e) {}
    return (n || "personnage-outward") + ".json";
  }
  // Le JSON en clair, sélectionné, avec un bouton copier : c'est le REPLI de
  // l'export. L'iframe de l'extension n'a pas forcément allow-downloads, et un
  // téléchargement refusé là-dedans ne lève rien du tout — impossible de le
  // détecter. On propose donc toujours le texte après la tentative, plutôt que
  // de laisser croire à un fichier qui n'existe pas.
  function montrerJson(txt, intro) {
    var b = boiteCourante;
    if (!b) return;
    var zone = document.getElementById("owd-ecran-json-zone");
    if (!zone) {
      zone = noeud("div");
      zone.id = "owd-ecran-json-zone";
      b.appendChild(zone);
    }
    zone.innerHTML = "";
    zone.appendChild(noeud("p", "owd-ecran-note", intro));
    var ta = noeud("textarea");
    ta.id = "owd-ecran-json";
    ta.readOnly = true;
    ta.value = txt;
    zone.appendChild(ta);
    var z = zoneActions(zone);
    bouton(z, "Copier", "copier", function () {
      ta.focus();
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      if (!ok && navigator.clipboard && navigator.clipboard.writeText) {
        try { navigator.clipboard.writeText(txt); } catch (e) {}
      }
    });
    ta.focus();
    ta.select();
  }
  function exporter() {
    var txt = jsonPerso();
    var lance = false;
    try {
      var a = document.createElement("a");
      if ("download" in a) {
        var url = null;
        if (window.URL && window.URL.createObjectURL && window.Blob) {
          url = window.URL.createObjectURL(new Blob([txt], { type: "application/json" }));
        } else {
          url = "data:application/json;charset=utf-8," + encodeURIComponent(txt);
        }
        a.href = url;
        a.download = nomFichier();
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        lance = true;
        setTimeout(function () {
          if (a.parentNode) a.parentNode.removeChild(a);
          if (window.URL && window.URL.revokeObjectURL && url.indexOf("blob:") === 0) window.URL.revokeObjectURL(url);
        }, 4000);
      }
    } catch (e) { lance = false; }
    if (!lance) {
      montrerJson(txt, "Le téléchargement est impossible dans cette fenêtre. Voici le personnage en JSON, à copier dans un fichier.");
      return;
    }
    setTimeout(function () {
      montrerJson(txt, "Si aucun fichier ne s'est téléchargé (Roll20 le bloque parfois dans son cadre), voici le personnage en JSON, à copier dans un fichier.");
    }, 1200);
  }
  function boutonExport(zone) {
    var button=bouton(zone, 'Exporter le personnage (JSON)', 'export', exporter);if(!exportPossible()){button.disabled=true;button.title='Aucune donnée du personnage disponible à exporter.';}return button;
  }

  // ---------- chargement du bundle ----------
  // Point d'arrivée de TOUTES les branches de decider() : c'est le seul endroit
  // qui met `ready` à true, donc le seul qui rouvre le robinet des écritures.
  var bundleCharge = false;
  function chargerBundle(spec, remplacerCss) {
    // Un double clic sur « mettre à niveau » lancerait deux protocoles, donc
    // deux injections : la fiche se monterait deux fois dans la même page.
    if (bundleCharge || !spec) return;
    if(!extensionReady)return;
    bundleCharge = true;
    updateLoading('Préparation de la fiche…');
    // data : le owd-creation.json à lire. Une archive embarque le sien, gelé à
    // sa date ; sans lui un ancien bundle lirait les règles d'aujourd'hui.
    window.__owdDataUrl = spec.data || null;
    // RELEASE EFFECTIVE : celle qui TOURNE, pas celle que le site publie. Sans
    // ça, une archive enregistrerait owd_version.max à la version du site, la
    // fiche paraîtrait à jour, et sa prochaine ouverture repartirait sur le
    // bundle du jour — « ouvrir avec sa version » ne tiendrait qu'une session.
    // Posé AVANT toute écriture et avant l'attr-map de l'archive, qui lira le
    // global (et non une variable de module, perdue au remplacement de M).
    if (M && M.setRelease) M.setRelease(spec.release || null);
    if (remplacerCss) {
      // Les feuilles du jour portent data-owd (posé par l'amorceur) : une
      // archive amène les siennes, et faire cohabiter les deux donnerait une
      // fiche à moitié restylée.
      var vieux = document.querySelectorAll("link[data-owd]");
      for (var k = 0; k < vieux.length; k++) {
        if (vieux[k].parentNode) vieux[k].parentNode.removeChild(vieux[k]);
      }
      (spec.css || []).forEach(function (u) {
        var l = document.createElement("link");
        l.rel = "stylesheet";
        l.href = u;
        l.setAttribute("data-owd", "1");
        document.head.appendChild(l);
      });
    }
    var urls = spec.js || [];
    var i = 0;
    function serie() {
      if(failureKind)return;
      if (i >= urls.length) {
        // Le script peut avoir fini avant son fetch de règles et son montage.
        // Ne pas initialiser une session sur la mémoire encore au vieux schéma.
        if (window.Owd && window.Owd.__pret === false) { setTimeout(serie, 25); return; }
        var schemaAttendu=spec.release?versionFiche(attrsVus):null;
        schemaAttendu=schemaAttendu?schemaAttendu.schema:schemaSite();
        if(!window.Owd||Number(window.Owd.schema)!==schemaAttendu||!memeRang(window.Owd.version,spec.release||releaseSite())){
          if(miseANiveauDemandee)erreurMiseAJour();else erreurOuverture('files');return;
        }
        if(miseANiveauDemandee){
          ready=true;loadingKind='upgrade';migrationEnvoyee=true;
          post({type:'storage-import',state:JSON.parse(mem['owd-perso']),blocks:C.encode(JSON.parse(mem['owd-perso'])),expected:migrationSource});
          return;
        }
        if (C && collaborationPont && !gele) {
          collaboration = new C.Session(lastAttrs, JSON.parse(mem["owd-perso"]), null, {id:VIEW_ID});
          updateStorageMaxima();
          // Le bundle vient de migrer en mémoire. Capturer cette montée AVANT
          // une réponse distante encore à l'ancien schéma, même si le réseau
          // retarde sa confirmation de plusieurs secondes.
          if(miseANiveauDemandee||!collaboration.hasBase)collaboration.capture(JSON.parse(mem["owd-perso"]));
          if(miseANiveauDemandee)miseANiveauOps=Object.keys(collaboration.pending);
          actualiseStatutEnregistrement();
          if(collaboration.hasBase&&Object.keys(collaboration.pending).length){var restored=collaboration.receive(lastAttrs);if(restored){synchronisationDifferée=restored.state;appliqueDiffere();}}
          // La photographie n'est écrite qu'une fois. Elle est aussi annoncée
          // au vieux code par owd_state/schema 11, pour empêcher ses écritures.
          if (!collaboration.hasBase) {
            var initial = collaboration.outgoing();

            initial[M.PREFIX + "version"] = { current: String(collaboration.seed.v), max: M.release() };
            post({ type: "save", attrs: initial });storageInitialSentAt=Date.now();
          }
        }
        ready = true; post({ type: "mounted" });
        if(miseANiveauDemandee){loadingKind='upgrade';scheduleSave();}
        else {stopLoading();fermerEcran();openingDone=true;installModeBar();}
        return;
      }
      var s = document.createElement("script");
      var u = urls[i++];
      s.src = u;
      s.onload = serie;
      s.onerror = function () { post({ type: 'error', error: u }); window.__owdOpenFailure('files'); };
      document.body.appendChild(s);
    }
    // Une archive peut apporter SA correspondance état <-> Attributes. Elle
    // compte autant que le bundle : c'est elle qui décomposera l'état à chaque
    // sauvegarde, et la version du jour ne connaît pas forcément les champs
    // d'alors. `M` est capturé une fois pour toutes au démarrage de l'amorce :
    // charger le fichier ne suffit donc pas, il faut REPOINTER M dessus. On ne
    // le fait que si le module chargé expose bien ce que l'amorce lui demande,
    // sinon on garde celui du jour plutôt que de casser les sauvegardes.
    if (spec.attrmap) {
      var sm = document.createElement("script");
      sm.src = spec.attrmap;
      sm.onload = function () {
        var neuf = window.OwdAttrMap;
        if (neuf && typeof neuf.stateToAttrs === "function" && neuf.PREFIX) M = neuf;
        serie();
      };
      sm.onerror = function () { post({ type: "error", error: spec.attrmap }); serie(); };
      document.body.appendChild(sm);
      return;
    }
    serie();
  }

  // Le moteur de migration est livré avec le BUNDLE, pas avec l'amorce : au
  // moment de l'écran il n'est donc pas encore là, alors que c'est lui qui sait
  // dire ce que la montée change. On charge ce seul fichier (il ne fait que
  // poser window.OwdMigr, il ne touche à rien) ; s'il manque, l'écran le dit au
  // lieu d'inventer un « rien à signaler ».
  //
  // Le garde de tête reste POUR TOUJOURS, comme celui de migre() côté bundle :
  // le repli gelé de roll20-fiche.html ne nomme pas le moteur, et une fiche
  // sans moteur doit s'ouvrir quand même.
  function avecMigrations(cb) {
    if (window.OwdMigr && window.OwdMigr.resume) { cb(); return; }
    var u = null;
    (specCourant().js || []).forEach(function (x) { if (!u && /owd-migrations/.test(x)) u = x; });
    if (!u) { cb(); return; }
    var fini = false;
    function une() { if (fini) return; fini = true; cb(); }
    var s = document.createElement("script");
    s.src = u;
    s.onload = une;
    s.onerror = une;
    document.body.appendChild(s);
    setTimeout(une, 3000);
  }

  // La migration se prépare en mémoire ; le pont publie une photographie
  // vérifiée, puis le manifeste. Aucun journal de normalisation n'est créé.
  function monter(silencieux, f) {
    if(operationBusy)return;
    miseANiveauDemandee=true;
    var serial=startLoading('upgrade','Préparation de la fiche…');
    sonde(function(attrs){
      if(serial!==operationSerial||bundleCharge)return;
      try{
        var state=M.attrsToState(attrs);
        if(!state||state.degrade==='illisible'||state.degrade==='partiel')throw Error('Personnage incomplet.');
        migrationSource=attrs;attrsVus=lastAttrs=attrs;mem['owd-perso']=JSON.stringify(state);
        post({type:'backup-snapshot',state:state,reason:'migration'});
        chargerBundle(specCourant());
      }catch(e){erreurMiseAJour();}
    },true);
  }

  // ---------- l'écran lui-même ----------
  //
  // CE QUE LE JOUEUR LIT NE DIT JAMAIS « SITE ». Le numéro montré ici est celui
  // de la FICHE servie, et le popup de l'extension nomme ses deux lignes « fiche
  // stable » et « fiche beta » : un écran qui parlerait du « site » enverrait
  // chercher un numéro de pages de règles là où il n'y en a pas, et laisserait
  // croire que la fiche du personnage et « le site » sont deux choses sans
  // rapport. Les identifiants, eux, gardent « site » (relSite, releaseSite) :
  // ils nomment l'endroit d'où la version est lue, personne ne les lit en jeu,
  // et les renommer ne changerait rien pour un joueur.
  function ecranVersion(f,relSite,schSite){
    stopLoading();var newer=f.schema>schSite||compare(f.release,relSite)>0;
    var b=ecran(newer?'Version du personnage incompatible':'Personnage à mettre à jour',false);
    b.appendChild(noeud('p',null,newer?'Ce personnage a été enregistré avec une version plus récente de la fiche Outward. La version actuellement disponible ne peut pas l’ouvrir.':'Ce personnage a été enregistré avec une ancienne version de la fiche Outward. Mettez-le à jour pour l’ouvrir avec la version actuelle.'));
    var v=noeud('div','owd-ecran-vers');v.appendChild(noeud('span',null,'Version du personnage : '+(f.release||'Inconnue')));v.appendChild(noeud('span',null,'Version actuelle de la fiche : '+relSite));b.appendChild(v);
    var z=zoneActions(b),arch=archiveDe(f.release);
    if(arch&&!memeRang(arch.release,f.release))arch=null;
    if(!newer)bouton(z,'Mettre à jour le personnage','monter',function(){if(!operationBusy)monter(false,f);},true);
    var open=bouton(z,newer?'Ouvrir avec la version du personnage':'Ouvrir avec l’ancienne version','archive',function(){if(arch&&!operationBusy){miseANiveauDemandee=false;startLoading('opening','Préparation de la fiche…');chargerBundle(arch,true);}});
    if(newer)bouton(z,'Réessayer','reessayer-version',function(){location.reload();});
    boutonExport(z);
    if(!arch)griser(open,f.release?'Cette version de la fiche n’est plus disponible. Le personnage ne peut pas être ouvert avec cette version.':'La version utilisée pour enregistrer ce personnage est inconnue. Le personnage ne peut pas être ouvert avec son ancienne version.',b);
  }

  function actualiseAvantMontage(attrs){
    if(bundleCharge||gele||!attrsPrets||operationBusy)return;
    var f=versionFiche(attrs);if(!f||f.schema!==schemaSite()||!memeRang(f.release,releaseSite()))return;
    var state=M.attrsToState(attrs);if(!state||state.degrade)return;
    attrsVus=lastAttrs=attrs;mem['owd-perso']=JSON.stringify(state);decide=false;decider();
  }

  // ---------- la décision ----------
  function decider(){
    if(decide||!attrsPrets||!manifPret||!extensionReady)return;
    decide=true;updateLoading('Vérification de la version du personnage…');
    if(gele){erreurOuverture('unreadable');return;}
    var f=versionFiche(attrsVus||{}),rel=releaseSite(),schema=schemaSite();
    if(!f||f.schema===null){chargerBundle(specCourant());return;}
    var sameRelease=f.release&&memeRang(f.release,rel);
    if(f.schema===schema&&sameRelease){chargerBundle(specCourant());return;}
    avecMigrations(function(){ecranVersion(f,rel,schema);});
  }

  // Le manifeste est posé par l'amorceur AVANT l'amorce ; mais l'amorce peut
  // aussi être chargée par un repli qui ne l'a pas encore, ou plus du tout. On
  // l'attend donc un temps borné, puis on décide sans lui (les valeurs par
  // défaut de owd-attr-map font foi).
  function attendreManifeste() {
    var fin = Date.now() + 3500;
    (function voir() {
      if (manifeste() || Date.now() > fin) { manifPret = true; decider(); return; }
      setTimeout(voir, 100);
    })();
  }

  // message d'attente / d'orientation de roll20-fiche.html
  function note(html) {
    var n = document.getElementById("owd-roll20-note");
    if (!n && html != null) { n = document.createElement("div"); n.id = "owd-roll20-note"; document.body.insertBefore(n, document.body.firstChild); }
    if (n) { if (html == null) n.remove(); else n.innerHTML = html; }
  }

  // Création interrompue : reconstruire le manifeste uniquement si tous les
  // blocs canoniques sont déjà présents sur Roll20, sans consulter le navigateur.
  function reconstitueCreation(attrs) {
    if(!C||attrs[C.BASE]||attrs.owd_version||attrs.owd_state||attrs.owd_sync_base||!attrs[C.BLOCK+'fiche']||!attrs[C.BLOCK+'inventaire'])return null;
    try {
      var required=C.encode(M.blank());if(Object.keys(required).some(function(k){return k.indexOf(C.BLOCK)===0&&!attrs[k];}))return null;
      var meta=JSON.parse(required[C.BASE].current);meta.blocks={};meta.reserves={};meta.moduleData={};
      Object.keys(attrs).forEach(function(k){if(k.indexOf(C.BLOCK)!==0&&k.indexOf(C.STACK)!==0)return;meta.blocks[k]=C.hash(attrs[k].current);
        if(k.indexOf(C.BLOCK+'reserve_')===0)meta.reserves[k.slice((C.BLOCK+'reserve_').length)]=k;
        if(k.indexOf(C.BLOCK+'module_')===0)meta.moduleData[decodeURIComponent(k.slice((C.BLOCK+'module_').length))]=k;
      });
      var trial=Object.assign({},attrs);trial[C.BASE]={current:JSON.stringify(meta),max:''};var state=C.read(trial).state,canonical=C.encode(state);
      if(!Object.keys(canonical).filter(function(k){return k.indexOf(C.BLOCK)===0||k.indexOf(C.STACK)===0;}).every(function(k){return attrs[k]&&C.stable(JSON.parse(attrs[k].current))===C.stable(JSON.parse(canonical[k].current));}))return null;
      meta.epoch=JSON.parse(canonical[C.BASE].current).epoch;trial[C.BASE].current=JSON.stringify(meta);trial.owd_version={current:String(state.v),max:state.rel||''};return trial;
    }catch(e){return null;}
  }

  var hydrated = false;
  function hydrate(attrs) {
    if (hydrated) return;         // une seule hydratation par vie de page
    hydrated = true;
    if (askTimer) { clearTimeout(askTimer); askTimer = null; }   // plus rien à réclamer
    note(null);
    attrs = attrs || {};
    var restored=reconstitueCreation(attrs);if(restored){attrs=restored;post({type:'save',attrs:{owd_storage:attrs.owd_storage,owd_version:attrs.owd_version}});}
    if (window.__owdVueInventaire && !attrs.owd_version && !attrs.owd_state && !attrs.owd_sync_base && !(C&&attrs[C.BASE])) {
      hydrated = false; note("Ce personnage n’a pas encore de fiche Outward. Ouvrez sa fiche pour la créer.");
      askTimer = setTimeout(function () { post({type: "load", resync: true}); }, 2000); return;
    }
    var state = M.attrsToState(attrs);
    // attrsToState DIT dans quel état il a trouvé la fiche (propriétés non
    // énumérables, donc invisibles au JSON.stringify qui suit) :
    //   null        -> owd_state lu, état complet ;
    //   "illisible" -> owd_state présent mais cassé ;
    //   "partiel"   -> pas de owd_state, et là tout dépend du RESTE.
    //
    // « partiel » couvre deux situations opposées, et le confondre en une
    // seule coûterait la fiche. Un personnage NEUF n'a aucun attribut owd_ :
    // il n'y a rien à perdre, on ouvre et on écrit normalement. Un personnage
    // qui garde ses autres attributs owd_ mais dont owd_state a disparu, lui,
    // vient de perdre la seule copie complète de sa fiche : owd_state est
    // l'attribut le plus lourd de l'onglet Attributes de Roll20, et le vider à
    // la main est un geste tentant. Ce qui reste est le repli, volontairement
    // allégé par owd-attr-map (pas de vignettes d'équipement) : la
    // reconstruction est donc amputée exactement comme dans le cas
    // « illisible », et le premier enregistrement la graverait par-dessus. Même
    // danger, même gel — sans quoi vider owd_state serait PLUS destructeur que
    // le corrompre, puisqu'un caractère de travers, lui, arrête tout.
    //
    // La distinction ne se refait pas ici : elle est déjà dans la raison rendue
    // par attrsToState, et RAISON_SANS_FICHE la nomme. Une version antérieure
    // de owd-attr-map.js (cache du navigateur) ne connaîtrait pas cette
    // constante, et n'aurait alors pas de quoi séparer les deux cas : on ne
    // gèle que sur l'ancien critère, la fiche se comporte comme avant. Plus
    // ancienne encore, elle ne pose aucun diagnostic : `undefined` ne gèle rien
    // non plus. Compatibilité descendante voulue.
    var degrade = state ? state.degrade : null;
    var neuf = !M.RAISON_SANS_FICHE || !!(state && state.raison === M.RAISON_SANS_FICHE);
    var illisible = degrade === "illisible";
    var disparu = degrade === "partiel" && !neuf;
    if (illisible || disparu){gele = true;attrsEnErreur=attrs;repareBlocsVerifies(attrs);}else if(C&&attrs[C.BASE])memoriseLectureVerifiee(attrs);
    mem["owd-perso"] = JSON.stringify(state);
    mem["owd-cards"] = "{}";
    mem["owd-persos"] = "[]";     // pas de bibliothèque multi-perso dans Roll20
    lastAttrs = attrs;                 // base du diff = ce qui est réellement en base
    enVol = null;
    // le bandeau vient APRÈS le cache : son bouton « écraser » déclenche une
    // sauvegarde, qui lit mem["owd-perso"]
    if (illisible) {bandeauGelIllisible(state.raison);return;}
    else if (disparu) {bandeauGelDisparu();return;}
    // POINT D'INSERTION DE L'ÉCRAN DE VERSION. Les attributs sont là, le bundle
    // n'est pas encore chargé, `ready` vaut false : c'est le seul instant où
    // l'on connaît la fiche sans pouvoir l'écrire. decider() choisit quoi
    // charger — bundle du jour, archive, ou rien tant que le joueur n'a pas
    // tranché — et c'est lui qui appelle chargerBundle().
    attrsVus = attrs;
    attrsPrets = true;
    decider();
  }

  function afficheNettoyage(){}

  window.addEventListener("message", function (ev) {
    var d = ev.data;
    if (!d || d.ns !== "owd" || ev.source !== window.top) return;
    if(d.type==='presence-state'&&d.charId===CHAR_ID){presenceRows=d.presence||[];applySharedMode(d.modeState);renderPresence();return;}
    if(d.type==='backup-restored'&&d.charId===CHAR_ID){gele=true;versionBloquee=true;edition=false;post({type:'storage-release'});location.reload();return;}
    if(d.type==='storage-import-progress'&&d.charId===CHAR_ID&&miseANiveauDemandee){startLoading('upgrade','Enregistrement du personnage…');return;}
    if(d.type==='storage-import-result'&&d.charId===CHAR_ID){
      if(!miseANiveauDemandee)return;
      if(!d.ok){erreurMiseAJour();return;}
      try{
        var verified=C.read(d.attrs);
        if(!verified||verified.incomplete||Number(verified.state.v)!==schemaSite()||!memeRang(verified.state.rel,releaseSite()))throw Error('Version non confirmée.');
        lastAttrs=attrsVus=d.attrs;journalRemote=verified;
        collaboration=new C.Session(d.attrs,verified.state,null,{id:VIEW_ID});updateStorageMaxima();
        collaborationApplique=true;try{window.Owd.__recoitEtat(verified.state);}finally{collaborationApplique=false;}
        miseANiveauDemandee=false;migrationEnvoyee=false;stopLoading();failureKind='';fermerEcran();openingDone=true;
        memoriseLectureVerifiee(d.attrs,verified);installModeBar();post({type:'mounted'});scheduleSave();
      }catch(e){erreurMiseAJour();}
      return;
    }
    if(d.type==='storage-cleanup-status'&&(!d.charId||d.charId===CHAR_ID)){
      afficheNettoyage(d);return;
    }
    if(d.type==='storage-error'&&(!d.charId||d.charId===CHAR_ID)){if(miseANiveauDemandee)erreurMiseAJour();else statutEnregistrement(d.error,true);return;}
    // on n'accepte que l'hydratation de NOTRE personnage (plusieurs fiches peuvent être ouvertes)
    if (d.type === "hydrate" && (!d.charId || d.charId === CHAR_ID)) {
      if(miseANiveauDemandee&&migrationEnvoyee)return;
      if(d.unchanged){if(!wireAttrs||d.revision!==wireRevision){wireRevision=null;post({type:'load',resync:true});return;}d.attrs=wireAttrs;}
      else if(d.attrs&&d.fresh===true&&typeof d.revision==='string'){wireAttrs=d.attrs;wireRevision=d.revision;}

      if(d.player && typeof d.player.id === "string" && typeof d.player.name === "string") journalPlayer={id:d.player.id,name:d.player.name};
      if(collaboration)collaboration.actor=journalPlayer;
      // ROUTAGE CRITIQUE. Une fois la fiche hydratée, un « hydrate » n'hydrate
      // plus rien : c'est la réponse à une sonde de confirmation, qui n'a le
      // droit que de LIRE. Le passer à hydrate() — ou même le laisser tomber
      // dans son garde-fou — écraserait mem["owd-perso"], donc la saisie en
      // cours, par un état lu il y a une seconde. Les réponses tardives à la
      // relance d'ouverture arrivent par ce même chemin et se perdent sans
      // dommage : aucune sonde ne les attend.
      if (window.__owdVueInventaire && d.inventoryAccess === false) {
        accesInventaire = false;
        document.getElementById("perso-fiche").inert = true;
        note(window.__owdVueNotes ? "Vous n’avez plus accès aux notes de ce personnage." : "Vous n’avez plus accès à l’inventaire de ce personnage.");
        return;
      }
      if (window.__owdVueInventaire && d.inventoryAccess === true && !accesInventaire) {
        accesInventaire = true; document.getElementById("perso-fiche").inert = false; note(null);
      }
      if(d.storageBlocks===2&&d.storageCleanup!==3)afficheNettoyage({status:'error',error:'Le pont de cette partie utilise encore un ancien nettoyage. Après installation de l’extension 4.2.0, rechargez la page entière de la partie Roll20.'});
      storageCapable=d.storageBlocks===2&&d.storageVolatile===1&&d.storageVersion===1&&d.storageImport===1&&d.localBackups===1&&d.localBackupRelay===1&&d.sharedMode===1;storageSession=d.storageSession||"";
      collaborationPont = d.collaboration === 1 && d.resync === true;
      if (d.fresh === true || !collaborationPont) {
        derniereLecture = Date.now();
        var avertissement = document.getElementById('owd-bandeau');
        if (avertissement && avertissement.dataset.owdRaison === 'sync-timeout') fermerBandeau();
      }
      lastHydration=d;
      if(!hydrated&&d.attrs){attrsVus=lastAttrs=d.attrs;try{var initial=M.attrsToState(d.attrs);if(initial&&!initial.degrade)mem['owd-perso']=JSON.stringify(initial);}catch(e){}}
      if(d.presence){presenceRows=d.presence;renderPresence();}
      if(!extensionReady){verifyExtension(d);return;}
      if(!openingDone)updateLoading('Chargement des données du personnage depuis Roll20…');
      if (hydrated) {
        sondeReponse(d.attrs, d.fresh);
        if (collaboration && d.fresh === true && !gelVolontaire && !collaborationApplique) recoitCollaboration(d.attrs || {});
        else if(d.fresh===true){if(gele&&!gelVolontaire){repareBlocsVerifies(d.attrs||{});reprendLectureValide(d.attrs||{});}else actualiseAvantMontage(d.attrs||{});}
      } else if (!collaborationPont || d.fresh === true) hydrate(d.attrs);
    }
    // objet pris au tchat : destiné à une seule fiche, choisie par l'extension (le lien
    // /owd_take est public, chaque client décide s'il le prend), d'où l'absence
    // de filtre sur charId ; c'est le dialogue de réception qui demande
    // confirmation.
    else if (d.type === "inventory-drop-chat" && d.charId === CHAR_ID && objetDrag &&
        d.token === objetDrag.token && d.ref === objetDrag.ref && Date.now() - objetDrag.t < 30000) {
      objetDrag = null;
      if (window.__owdCanEdit() && !inventoryLocked && window.Owd && window.Owd.__actionObjet) window.Owd.__actionObjet(d.ref, d.action || "montrer");
      appliqueDiffere();
    }
    else if (d.type === "take" && d.payload) window.__owdTake(d.payload);
    else if (d.type === "defend" && typeof d.payload === "string" && d.payload.length <= 16000) {
      defendFromChat(d.payload);
    }
    // liste des joueurs connectés, en réponse à __owdPlayers
    else if (d.type === "players-result") playersReply(d.players || []);
  });

  window.__owdObjetDrag = function (ref, dt) {
    if(!window.__owdCanEdit())return false;
    var token = window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random();
    objetDrag = {ref: ref, token: token, t: Date.now(), active: true};
    dt.setData("application/x-owd-item", JSON.stringify({ref: ref, token: token, charId: CHAR_ID}));
    dt.effectAllowed = "copyMove";
    post({type: "inventory-drag-start", ref: ref, token: token});
    inventoryParent({type:"inventory-drag-start",ref:ref,token:token});
  };
  document.addEventListener("drop", function () {
    if (objetDrag && objetDrag.active) setTimeout(function () { window.__owdObjetDragFin(); }, 0);
  }, true);
  window.__owdObjetDragFin = function () {
    if (objetDrag) objetDrag.active = false;
    post({type: "inventory-drag-end", token: objetDrag && objetDrag.token});
    inventoryParent({type:"inventory-drag-end",token:objetDrag && objetDrag.token});
    setTimeout(appliqueDiffere, 100);
  };
  window.addEventListener("message", function (ev) {
    var d = ev.data;
    if (d && d.ns === "owd" && d.type === "panel-theme" && (ev.source === window.parent || ev.source === window.top))
      document.documentElement.classList.toggle("night", !!d.nuit);
  });

  function inventoryParent(msg) {msg.ns='owd';msg.charId=CHAR_ID;try{window.parent.postMessage(msg,'*');}catch(e){}}
  var externalDrag=null, inventoryLocked=false;
  var attackOwner = "a" + Date.now().toString(36) + Math.random().toString(36).slice(2), attackSequence = 0, attackPreview = null, attackHeartbeat = null;
  function sendAttackPreview() {
    if (!attackPreview || !window.__owdVueAttaques || !ready || gele || !accesInventaire || document.hidden) { window.__owdAttackPreview(null); return; }
    post({type:"attack-preview",action:"show",owner:attackOwner,sequence:attackSequence,
      preview:{mirror:attackPreview.mirror,orientation:attackPreview.orientation,path:attackPreview.path,owner:attackOwner,expiresAt:Date.now()+8000}});
  }
  window.__owdAttackPreview = function (preview) {
    if (!window.__owdVueAttaques) return;
    if (attackHeartbeat) clearInterval(attackHeartbeat); attackHeartbeat=null;
    var was=attackPreview; attackPreview=preview; attackSequence++;
    if (preview) { sendAttackPreview(); if(attackPreview) attackHeartbeat=setInterval(sendAttackPreview,1000); }
    else if (was) post({type:"attack-preview",action:"stop",owner:attackOwner,sequence:attackSequence});
  };
  window.addEventListener("pagehide",function(){window.__owdAttackPreview(null);});
  document.addEventListener("visibilitychange",function(){if(document.hidden)window.__owdAttackPreview(null);});

  window.addEventListener('message',function(ev){
    var d=ev.data;if(!d||d.ns!=='owd'||ev.source!==window.parent)return;
    if(d.type==='view-visible'){window.__owdViewVisible=!!d.active;if(d.active&&ready&&window.Owd&&Owd.__afficheVue)Owd.__afficheVue();return;}
    if(!window.__owdVueInventaire)return;
    if(d.type==='attack-preview-cancel'){window.__owdAttackPreview(null);return;}
    if(!window.__owdVueNotes && d.type==='inventory-external-drag'){externalDrag=d.drag||null;return;}
    if(d.type==='inventory-poll'){post({type:'load',resync:true});if(ready&&!gele)doSave();return;}
    if(d.type!=='inventory-command')return;
    if(!window.__owdCanEdit()&&['status','check','describe'].indexOf(d.action)<0){inventoryParent({type:'inventory-result',request:d.request,error:'Mode Consultation'});return;}
    var reply={type:'inventory-result',request:d.request};
    try {
      var active=ready&&!gele&&accesInventaire&&!!collaboration&&!!window.Owd;
      if(d.action==='status'||d.action==='check'){
        var remote=collaboration&&C.read(collaboration.attrs), server=remote&&remote.state;
        reply.value={ready:active,pending:collaboration?Object.keys(collaboration.pending).length:0,lastRead:derniereLecture};
        if(d.job&&server&&window.OwdInventoryData){reply.value.received=OwdInventoryData.received(server,d.job);reply.value.committed=OwdInventoryData.committed(server,d.job);reply.value.removed=OwdInventoryData.removed(server,d.job);reply.value.cancelled=OwdInventoryData.cancelled(server,d.job);}
      } else {
        if(!active)throw new Error('Inventaire indisponible ou accès retiré.');
        if(window.__owdVueNotes)throw new Error('La vue Notes ne déplace pas les objets.');
        if(d.action==='describe')reply.value=window.Owd.__objetsTransfert(d.ref);
        else if(d.action==='prepare')reply.value=window.Owd.__prepareTransfert(d.job);
        else if(d.action==='import')reply.value=window.Owd.__importeTransfert(d.job);
        else if(d.action==='commit')reply.value=window.Owd.__confirmeTransfert(d.job);
        else if(d.action==='remove')reply.value=window.Owd.__retireTransfert(d.job);
        else if(d.action==='cancel')reply.value=window.Owd.__annuleTransfert(d.job);
        else if(d.action==='lock'){inventoryLocked=!!d.lock;document.getElementById('perso-fiche').inert=!!d.lock||!accesInventaire;reply.value=true;}
        else throw new Error('Commande inconnue.');
        doSave();
      }
    }catch(e){reply.error=e.message||String(e);}
    inventoryParent(reply);
  });
  function externalDrop(e){
    if(!window.__owdCanEdit()||!externalDrag||externalDrag.charId===CHAR_ID||!e.dataTransfer||
        Array.prototype.indexOf.call(e.dataTransfer.types,'application/x-owd-item')<0)return;
    if(!e.target.closest||!e.target.closest('[data-module="inv"]'))return;
    e.preventDefault();e.stopImmediatePropagation();e.dataTransfer.dropEffect='move';
    if(e.type==='drop'&&e.isTrusted){
      inventoryParent({type:'inventory-tab-drop',drag:externalDrag});externalDrag=null;
    }
  }
  document.addEventListener('dragenter',externalDrop,true);
  document.addEventListener('dragover',externalDrop,true);
  document.addEventListener('drop',externalDrop,true);

  // ---------- édition collaborative ----------
  var lastCollaborationAttrs=null;
  function memeLecturePersonnage(a,b){
    if(!a||!b)return false;
    var keys=Object.keys(a).filter(function(k){return k!=='owd_presence';});
    if(keys.length!==Object.keys(b).filter(function(k){return k!=='owd_presence';}).length)return false;
    return keys.every(function(k){return b[k]&&String(a[k].current)===String(b[k].current)&&String(a[k].max)===String(b[k].max);});
  }
  function recoitCollaboration(attrs) {
    try {
      if(versionBloquee)return;
      if(!gele&&!miseANiveauDemandee&&memeLecturePersonnage(attrs,lastCollaborationAttrs)){actualiseStatutEnregistrement(false);return;}
      // capture() a déjà reçu chaque frappe dans le shim SYNCHRONE, avant le
      // debounce de sauvegarde : même une réponse arrivée à cet instant la garde.
      var previous=journalRemote,server=(collaboration.reader?collaboration.reader.read(attrs):C.read(attrs));if(server)journalRemote=server;if(!server&&collaboration.hasBase)throw Error('Manifeste de stockage absent de la lecture Roll20.');if(!previous)try{previous=C.read(collaboration.attrs);}catch(e){}
      if(server&&window.Owd&&typeof window.Owd.version==='string'&&(Number(server.state.v)>Number(window.Owd.schema)||compare(server.state.rel,window.Owd.version)>0)){
        versionBloquee=true;gele=true;edition=false;synchronisationDifferée=null;
        if(saveTimer){clearTimeout(saveTimer);saveTimer=null;}
        post({type:'storage-release'});post({type:'take-target'});post({type:'defend-target'});sendPresence();
        document.getElementById('perso-fiche').inert=true;
        ecranVersion({schema:Number(server.state.v),release:server.state.rel},window.Owd.version,Number(window.Owd.schema));return;
      }
      if(server&&collaboration.hasBase){['pv','pe','pm'].forEach(function(k){var a=attrs['owd_'+k],raw=a&&String(a.current),n=Number(raw),actual=server.state.etat[k];
        if(actual==null)actual=collaboration.maxima[k];
        var old=previous&&previous.state.etat[k];if(old==null)old=collaboration.maxima[k];
        // Une projection retardée de l'ancienne réserve n'est pas une saisie.
        // Les barres sont des valeurs absolues ; les dépenses de fiche restent des deltas.
        if(raw!==undefined&&raw.trim()!==''&&isFinite(n)&&typeof actual==='number'&&n!==actual&&n!==old&&!(server.state.etat[k]==null&&n===Number(a.max)&&tokenObserved[k]===undefined)&&tokenObserved[k]!==raw){collaboration.token(k,n,server);}
        var maximum=a&&String(a.max),maxValue=Number(maximum),computed=collaboration.maxima[k];
        if(maximum!==undefined&&maximum.trim()!==''&&isFinite(maxValue)&&maxValue>=0&&typeof computed==='number'&&maxValue!==computed&&tokenMaxObserved[k]!==undefined&&maximum!==tokenMaxObserved[k]){if(server.state.etat[k]==null&&isFinite(n))collaboration.token(k,n,server);collaboration.tokenMax(k,maxValue,server);}
        tokenMaxObserved[k]=maximum;
        tokenObserved[k]=raw;
      });}
      var recu = collaboration.receive(attrs,server);
      lastAttrs = attrs;
      if (!recu) return;
      if(!recu.incomplete)lastCollaborationAttrs=attrs;
      if(server&&!server.incomplete)memoriseLectureVerifiee(attrs,server);
      if(miseANiveauDemandee&&server&&!server.incomplete&&Number(server.state.v)===schemaSite()&&memeRang(server.state.rel,releaseSite())&&attrs.owd_version&&Number(attrs.owd_version.current)===schemaSite()&&memeRang(attrs.owd_version.max,releaseSite())&&miseANiveauOps.every(function(id){return !!server.ids[id];})){miseANiveauDemandee=false;stopLoading();fermerEcran();openingDone=true;installModeBar();}
      if(collaboration.hasBase&&!recu.incomplete){if(server.meta.phase!=='ready')post({type:'storage-activate'});else post({type:'storage-cleanup'});}

      actualiseStatutEnregistrement(recu.lost);
      synchronisationDifferée = recu.state;
      appliqueDiffere();
      if(!recu.incomplete){gele=false;attrsEnErreur=null;if(failureKind==='unreadable'||failureKind==='incomplete'){stopLoading();failureKind='';fermerEcran();}var resumedBanner=document.getElementById('owd-bandeau');if(resumedBanner&&resumedBanner.dataset.owdRaison==='sync-unreadable')fermerBandeau();}
      scheduleSave();
    } catch (err) {
      gele = true;
      attrsEnErreur=attrs;repareBlocsVerifies(attrs);bandeauGelIllisible("Synchronisation interrompue : " + err.message);
    }
  }
  function appliqueDiffere() {
    if (!synchronisationDifferée || composition || (objetDrag && objetDrag.active && Date.now() - objetDrag.t < 30000) || document.querySelector(".pc-modal-over") ||
        !window.Owd || typeof window.Owd.__recoitEtat !== "function") return;
    var s = synchronisationDifferée;
    // Rejouer les frappes faites DEPUIS la dernière réception, si une modale a
    // retardé l'affichage. La base locale du moteur connaît déjà ces frappes.
    if (modificationLocale) s = C.rebuild(collaboration.local);
    if (JSON.stringify(s) === mem["owd-perso"]) { synchronisationDifferée = null; return; }
    collaborationApplique = true;
    try {
      window.Owd.__recoitEtat(s);
      collaboration.local = C.flatten(JSON.parse(mem["owd-perso"]));
      synchronisationDifferée = null;
    } finally { collaborationApplique = false; }
  }
  setInterval(function () {
    try{appliqueDiffere();}catch(e){gele=true;bandeauGelIllisible(e.message);}
    if (!STANDALONE && hydrated && ready && !gelVolontaire && collaborationPont) {
      post({ type: "load", resync: true });
      // Le début d'activation et les lots en attente sont aussi repris après
      // une coupure de réseau, sans dépendre d'une frappe supplémentaire.
      if (collaboration && !gele) doSave();
      actualiseStatutEnregistrement(false);
      renderPresence();
    }
  }, 1200);

  // La décision de version attend DEUX entrées : les attributs (hydrate) et le
  // manifeste. Cette seconde attente démarre ici, en parallèle de la première.
  //
  // ELLE PASSE AVANT LE CAS « page ouverte seule ». Comme c'est decider() qui
  // charge le bundle, une hydratation arrivée sans que cette attente ait
  // démarré laisserait manifPret à false pour toujours : decider() ne
  // trancherait jamais, et la fiche ne s'ouvrirait pas du tout, en silence.
  // Le cas se produit dès qu'un « hydrate » atteint une page de premier niveau
  // (harnais de test, page rouverte hors de son cadre) ; le garder sous le
  // retour ci-dessous ferait dépendre le montage de la façon dont la page est
  // imbriquée, ce qui n'a rien à y voir. Démarrer l'attente ici ne coûte qu'un
  // drapeau quand personne n'hydrate.
  attendreManifeste();

  if (STANDALONE) {
    note("Cette page est le cœur de l'extension « Fiche Outward sur Roll20 » : elle " +
         "s'affiche dans l'onglet Fiche Outward d'un personnage Roll20 et n'a rien à " +
         "montrer ici. Pour créer un personnage : <a href='personnage/'>le créateur</a>. " +
         "Pour l'extension : <a href='extension/'>la page Extension</a>.");
    return;
  }

  // Réclamer les Attributes owd_* au pont d20, avec relances : le pont vient
  // peut-être d'être injecté, et cette page arrive par le réseau.
  // La relance s'arrête à la PREMIÈRE hydratation : au-delà, un « load » de
  // plus produirait un « hydrate » de plus, et donc une réponse tardive qui
  // n'aurait plus rien à hydrater.
  startLoading('opening','Vérification de l’extension…');
  var tries = 0;
  (function ask() {
    askTimer = null;
    if (hydrated) return;
    tries++;
    if(failureKind)return;
    post({ type: "load", resync: true });
    askTimer = setTimeout(ask, 500);
  })();
})();
