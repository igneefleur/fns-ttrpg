  // ---------- refresh ----------
  // Registres de rafraîchissement : les fonctions rappelées à chaque
  // changement d'état. Il y en a UN PAR MODULE, plus un pour ce qui n'est pas
  // un module (barre d'outils, en-tête, barre d'envoi). Tous sont remis à zéro
  // à chaque mount() : les anciens pointent sur un DOM qui n'existe plus.
  //
  // « hooks » désigne le registre COURANT : monteModules le fait pointer sur
  // celui du module en construction. Les briques (textInput, stepper, bigTile,
  // gearBtn…) écrivent donc dans « hooks » sans rien savoir des modules, et
  // chaque fonction atterrit chez son propriétaire. C'est ce qui permet de
  // museler un module sans toucher aux autres.
  var regHors = [];
  var regsModules = {};
  var hooks = regHors;
  var compHooks = [];           // lignes de compétences, vidées par rebuildComps()
  var recupHooks = [];          // lignes de récupération, vidées par rebuildRecuperation()
  var optHooks = [];            // bloc Options rebâtissable
  var optCompsRebuild = null;   // posé par le module « optcomps »
  // filtres de VUE du bloc Options, propres à lui : les siens ne doivent pas
  // suivre ceux de l'onglet Fiche, on n'y cherche pas la même chose
  var optFilter = "";
  var optOnly = COMPACT;

  function regModule(id) {
    if (!regsModules[id]) regsModules[id] = [];
    return regsModules[id];
  }
  // Musellement : un module dont le registre jette EN CHAÎNE finit par se
  // taire. Cinq échecs consécutifs, parce qu'un hook peut échouer une fois sur
  // un état transitoire (une frappe en cours) sans être cassé pour autant ;
  // cinq fois d'affilée, c'est le module qui est en faute. Une seule réussite
  // remet le compteur à zéro.
  var MUSELIERE = 5;
  var etatsModules = {};
  function etatModule(id) {
    if (!etatsModules[id])
      etatsModules[id] = { echecs: 0, musele: false, erreur: "", panne: "", vide: false };
    return etatsModules[id];
  }
  function messageErreur(e) {
    return String((e && (e.message || e.toString())) || "erreur inconnue");
  }
  // Le résultat n'est pas jugé ici mais RETENU dans le bilan de la passe, et le
  // compteur ne bouge qu'une fois la passe finie. C'est nécessaire parce qu'un
  // même id peut avoir DEUX registres (« comps » et « optcomps » ont aussi
  // celui de leurs lignes rebâties) : en jugeant registre par registre, la
  // réussite du premier remettait le compteur à zéro juste avant l'échec du
  // second, et la muselière de ces deux modules-là ne serait jamais tombée.
  function joue(id, reg, bilan) {
    if (etatModule(id).musele) return;
    if (bilan[id] === undefined) bilan[id] = null;
    for (var i = 0; i < reg.length; i++) {
      try { reg[i](); } catch (err) { if (!bilan[id]) bilan[id] = err; }
    }
  }
  // LES PV ET LES PE SUIVENT L'EFFONDREMENT, dans un seul sens. Quand le
  // niveau monte, le maximum descend et la valeur courante qui le dépasse
  // descend avec lui (100/100 devient 95/95, 50/100 devient 50/95). Quand il
  // redescend, le maximum remonte mais PAS la valeur : les points perdus ne
  // reviennent pas. Une valeur « au maximum » (null) suivrait le maximum en
  // remontant ; elle se fige donc à l'ancien maximum à ce moment-là.
  // Seul un changement de NIVEAU joue ici : un maximum baissé par un levier du
  // MJ ne réécrit rien, comme partout ailleurs dans la fiche.
  // La mémoire du dernier état vu ne vit qu'en mémoire : la première passe
  // après un chargement ne fait que la poser.
  var effVu = null, effMaxVu = {};
  function suitEffondrement() {
    var e = effondrement();
    ["pv", "pe"].forEach(function (k) {
      var m = maxDe(k), v = state.etat[k], avant = effMaxVu[k];
      if (effVu !== null && avant !== undefined) {
        if (e > effVu && v !== null && v > m) state.etat[k] = m;
        if (e < effVu && v === null && m > avant) state.etat[k] = avant;
      }
      effMaxVu[k] = m;
    });
    effVu = e;
  }
  var refreshEmpreintes=null;
  var VUE_DEPENDANCES={notes:['notes'],bg:['background'],avantages:['avantages'],techniques:['techniques'],journal:[],modules:['modules','modActifs'],mods:['mods']};
  function refresh(force) {
    recupSynchroniseSuivi();
    actualiseHorlogeAlcool();
    actualiseRegimeExposition();
    suitEffondrement();
    save();
    var stamps={},changes=[],invalidStamp=false;
    try{
    Object.keys(state).forEach(function(k){if(k==='etat'){Object.keys(state.etat).forEach(function(r){stamps['etat.'+r]=JSON.stringify(state.etat[r]);});}else stamps[k]=JSON.stringify(state[k]);});
    }catch(e){invalidStamp=true;}
    Object.keys(stamps).forEach(function(k){if(!refreshEmpreintes||stamps[k]!==refreshEmpreintes[k])changes.push(k);});
    var all=invalidStamp||force===true||!refreshEmpreintes||!changes.length||modulesPersoActifs();refreshEmpreintes=invalidStamp?null:stamps;
    function doit(id){
      // Le panneau Notes peut être masqué par le conteneur Roll20 sans signal.
      // Sa fenêtre limitée de messages reste cohérente sans reconstruire le module.
      if(id==='notes'&&changes.indexOf('notes')>=0)return true;
      if(window.__owdViewVisible===false&&!modulesPersoActifs())return false;
      var node=elModules[id];if(node&&!node.getClientRects().length&&!modulesPersoActifs())return false;
      if(all)return true;
      if(changes.every(function(k){return /^etat\.(pv|pe|pm)$/.test(k);}))return changes.some(function(k){return k==='etat.'+id;})||id==='optcaps';
      if(VUE_DEPENDANCES[id])return changes.some(function(k){return VUE_DEPENDANCES[id].indexOf(k)>=0;});
      if(changes.every(function(k){return ['notes','background','portrait','name','age','sexe','genre'].indexOf(k)>=0;}))return false;
      return true;
    }
    var bilan = {};
    joue("", regHors, bilan);
    // les clés d'un objet se parcourent dans leur ordre de création : c'est
    // l'ordre de montage des modules, donc l'affichage ne bouge pas
    Object.keys(regsModules).forEach(function (id) {if(doit(id))joue(id,regsModules[id],bilan);});
    if(doit("comps"))joue("comps",compHooks,bilan);
    if(doit("recuperation"))joue("recuperation",recupHooks,bilan);
    if(doit("optcomps"))joue("optcomps",optHooks,bilan);
    Object.keys(bilan).forEach(function (id) {
      var e = etatModule(id);
      if (e.musele) return;
      if (!bilan[id]) { e.echecs = 0; return; }
      e.echecs++;
      e.erreur = messageErreur(bilan[id]);
      // « » n'est pas un module mais ce qui encadre les onglets : le museler
      // éteindrait la fiche elle-même, sans bloc à marquer ni interrupteur pour
      // le rallumer. Ses hooks restent sous try/catch, c'est là qu'est la
      // protection.
      if (id && e.echecs >= MUSELIERE) {
        e.musele = true;
        museleAffiche(id, e);
      }
    });
    // Après les hooks : Bio et Notes viennent notamment de recevoir leur
    // valeur distante. La lecture doit montrer cette même valeur dès la passe.
    majTextesLecture(rootEl);
    if(window.__owdApplyMode)window.__owdApplyMode();
  }
  var remontageNettoyage = [];
  var rootEl = null;
  var appEl = null;      // le .perso-fiche monté : porte les jetons de couleur
  // Remplacement d'état COMPLET (import, bibliothèque, nouveau personnage) :
  // toutes les sections tiennent des références sur l'ancien état, on remonte
  // donc la fiche entière. C'est aussi ce que rendent ctx.reconstruire et
  // Owd.remonte ; appelé PENDANT un montage, il ne relance rien sur-le-champ
  // (mount() note la demande et l'honore une fois le montage fini).
  function remount() { if (rootEl) mount(rootEl); }

  function flash(msg) {
    var f = document.querySelector(".pc-flash") || el("div", "pc-flash");
    f.textContent = msg;
    document.body.appendChild(f);
    f.classList.add("on");
    setTimeout(function () { f.classList.remove("on"); }, 2600);
  }

