  // ---------- l'objet public ----------
  // La fiche expose UN objet : c'est par là qu'un mod remplace un module,
  // change la disposition ou détourne un calcul. Elle n'exécute rien
  // d'elle-même. window.__owdModules est un ALIAS du MÊME objet.
  function recoitEtatCollaboratif(s) {
    if (!s || parseInt(s.v, 10) !== SCHEMA) throw new Error("Schéma distant incompatible : recharger la fiche.");
    s = normalize(s);
    if (JSON.stringify(s) === JSON.stringify(state)) return;
    var changes=Object.keys(state).concat(Object.keys(s).filter(function(k){return !Object.prototype.hasOwnProperty.call(state,k);})).filter(function(k){return JSON.stringify(s[k])!==JSON.stringify(state[k]);});
    if(!changes.length)return;
    var structural={notes:[],background:['bg'],avantages:['avantages'],comps:['comps','optcomps','attaque','defense'],techniques:['techniques'],inv:['inv','attaque','defense','effets'],attaques:['attaque'],defenses:['defense'],combatOptions:['attaque','defense'],combatModifiers:['attaque','defense'],combatAffichage:['attaque','defense'],effetsActifs:['effets','recuperation'],effetsPermanents:['effets','recuperation'],caracs:['caracs'],caracsXp:['caracs'],caracsLeviers:['modcaracs'],capsLeviers:['optcaps'],compsLeviers:['optcomps','comps']};
    var scalar=['name','portrait','age','sexe','genre','espece','taille','xpTotal','etat','effort','temperature','qualiteSommeil','horloge','horlogeDigestion','horlogeExposition','horlogeAlcool','effAlcool','effAlcoolSecondes','effParties','effAutre','effDesactive','effPause','allure','allureCran','desTailles','desUtilises'];
    var oldData=state.modData||{},newData=s.modData||{};
    if(Object.keys(oldData).concat(Object.keys(newData)).every(function(k){return k==='recuperation'||JSON.stringify(oldData[k])===JSON.stringify(newData[k]);}))structural.modData=['recuperation'];
    var targets=[],partial=!modulesPersoActifs()&&changes.every(function(k){return structural[k]||scalar.indexOf(k)>=0;});
    if(partial)changes.forEach(function(k){(structural[k]||[]).forEach(function(id){if(targets.indexOf(id)<0)targets.push(id);});});
    var actif = document.activeElement, focus = null, positions = [];
    function signature(c) { return [c.tagName, c.type || "", c.className, c.getAttribute("placeholder") || "", c.getAttribute("aria-label") || ""].join("|"); }
    function ancre(c) {
      var a = c.closest("[data-sync-entity], [data-id], [data-module]") || rootEl;
      var m = a.closest("[data-module]");
      return { module: m ? m.dataset.module : "",
        entity: a.dataset ? (a.dataset.syncEntity || a.dataset.id || "") : "", el: a };
    }
    if (actif && rootEl && rootEl.contains(actif) && /^(INPUT|TEXTAREA|SELECT)$/.test(actif.tagName)) {
      var a = ancre(actif), sig = signature(actif);
      var semblables = Array.prototype.filter.call(a.el.querySelectorAll("input,textarea,select"), function (c) { return signature(c) === sig; });
      focus = { module: a.module, entity: a.entity, signature: sig, index: semblables.indexOf(actif),
        reserve: actif.dataset.syncReserve || null, value: actif.value, start: actif.selectionStart, end: actif.selectionEnd, direction: actif.selectionDirection, scroll: actif.scrollTop };
    }
    var sx = window.scrollX, sy = window.scrollY;
    Array.prototype.forEach.call(rootEl.querySelectorAll("[data-module]"), function (m) {
      if(partial&&targets.indexOf(m.dataset.module)<0)return;
      Array.prototype.forEach.call(m.querySelectorAll("*"), function (n, i) {
        if (n.scrollTop || n.scrollLeft) positions.push({ module: m.dataset.module, index: i, top: n.scrollTop, left: n.scrollLeft });
      });
    });
    journalTemps=[];
    if(partial){
      changes.forEach(function(k){if(s[k]===undefined)delete state[k];else if(k==='etat'){Object.keys(state.etat).forEach(function(r){if(!(r in s.etat))delete state.etat[r];});Object.assign(state.etat,s.etat);}else state[k]=s[k];});
      reconstruitModules(targets);refresh();
    }else{effVu=null;effMaxVu={};state=s;remount();}
    positions.forEach(function (p) {
      var m = Array.prototype.find.call(rootEl.querySelectorAll("[data-module]"), function (n) { return n.dataset.module === p.module; });
      var n = m && m.querySelectorAll("*")[p.index]; if (n) { n.scrollTop = p.top; n.scrollLeft = p.left; }
    });
    if (focus) {
      var scope = rootEl;
      if (focus.module) scope = Array.prototype.find.call(rootEl.querySelectorAll("[data-module]"), function (n) { return n.dataset.module === focus.module; });
      if (scope && focus.entity) scope = Array.prototype.find.call(scope.querySelectorAll("[data-sync-entity], [data-id]"), function (n) { return (n.dataset.syncEntity || n.dataset.id) === focus.entity; });
      if (scope) {
        var champs = Array.prototype.filter.call(scope.querySelectorAll("input,textarea,select"), function (c) { return signature(c) === focus.signature; });
        var c = champs[focus.index];
        if (c && !c.disabled) {
          c.focus({ preventScroll: true });
          // Les commandes ± ne sont pas encore dans l'état. Une saisie locale
          // reste aussi sous les doigts pendant la réception d'autres champs.
          c.value = focus.reserve ? courant(focus.reserve) : focus.value;
          try { if (focus.start !== null) c.setSelectionRange(focus.start, focus.end, focus.direction); } catch (e) {}
          c.scrollTop = focus.scroll;
        }
      }
    }
    window.scrollTo(sx, sy);
  }

  window.Owd = {
    __pret: false,
    __afficheVue:function(){monteOnglet(window.__owdVueInventaire?null:curTab());refresh(true);},
    __recoitEtat: recoitEtatCollaboratif,
    __defendreDepuisChat: defenseDepuisChat,
    __montreObjet: montreObjet,
    __actionObjet: actionObjet,
    __objetsTransfert: objetsTransfert,
    __prepareTransfert: prepareTransfert,
    __importeTransfert: importeTransfert,
    __confirmeTransfert: confirmeTransfert,
    __retireTransfert: retireTransfert,
    __annuleTransfert: annuleTransfert,
    // Les deux ne se déduisent pas l'un de l'autre : version porte le suffixe
    // de beta le cas échéant, schema est un entier libre. Un mod qui tirerait
    // le schéma du majeur de la version se tromperait à la première
    // divergence ; OwdMods.lireVersion existe pour ne pas avoir à découper le
    // numéro soi-même.
    version: RELEASE,
    schema: SCHEMA,
    effets: {
      liste: function(){return copieTemps(state.effetsActifs);},
      definitions: function(){return copieTemps(effetsDefinitions());},
      ajoute: function(id,source,cible,duree){var ok=appliqueEffet(id,source,cible,duree);refresh();return ok;},
      retire: function(id){retireEffet(id);refresh();},
      coupRecu: function(){effetCoupRecu();refresh();},
      finTour: function(){effetFinTour();refresh();},
      cout: effetCout,
      accumulation: function(points){return Math.ceil(Math.max(0,num(points,0)) * Math.max(0,1-effetBonus("alterations")/100) - 1e-9);},
      consomme: function(ref,q,cible){var it=state.inv.objets.filter(function(o){return o.ref===ref;})[0];return it?invConsommer(it,q,cible||""):false;}
    },
    enregistre: enregistre,
    ordonne: ordonne,
    // une COPIE de la description : personne ne remanie la table de l'extérieur
    liste: function () {
      return ordreModules().map(function (m) {
        return { id: m.id, titre: m.titre, onglet: m.onglet, colonne: m.colonne, actif: actif(m.id) };
      });
    },
    actif: actif,
    active: activeModule,
    etat: function (id) {
      var e = etatModule(id);
      return { echecs: e.echecs, musele: e.musele, erreur: e.erreur,
               panne: e.panne, vide: e.vide, actif: actif(id) };
    },
    remonte: remount,
    filtre: filtreCalcul,
    // bilan du dernier passage du moteur, en COPIE : vide tant qu'il n'a pas
    // tourné. « actif » vient de l'état (l'interrupteur du joueur), « etat » du
    // moteur (ok, panne, attente, coupe, recent, refuse).
    mods: function () {
      return bilanMods.map(function (b) {
        return { id: b.id, nom: b.nom, actif: modActifDe(b.id), etat: b.etat,
                 message: b.message || "", empreinte: b.empreinte };
      });
    },
    // INTERNE, pour le moteur de mods : nommer le mod qu'il lance, afin que les
    // filtres enregistrés pendant son exécution portent SON id.
    __proprietaire: function (id) {
      proprietaireCourant = id ? String(id) : PROP_MOD;
      // modEnExec ne vaut que PENDANT le lancement d'un mod : le moteur rend la
      // main avec null. C'est lui qui permet à enregistre() de marquer le
      // module au nom du mod qui l'a posé.
      modEnExec = id ? String(id) : null;
    },
    // INTERNE, pour les sondes. Le double tiret bas dit ce qu'il faut : ce
    // n'est pas le contrat public, et un mod qui s'y appuie le fait à ses
    // risques. Ils existent parce qu'une sonde qui lirait les valeurs dans le
    // DOM mesurerait la MISE EN FORME autant que le calcul.
    __calculs: {
      caracTotal: caracTotal, caracXp: caracXp, creationDepense: creationDepense,
      limiteRangs: limiteRangs, compRangsComptes: compRangsComptes, techRangsComptes: techRangsComptes,
      compBonus: compBonus, compDes: compDes, compXp: compXp,
      pvMax: pvMax, peMax: peMax, pmMax: pmMax, piMax: piMax,
      prMax: prMax, psMax: psMax, phMax: phMax,
      charge: charge, accesRapides: accesRapides, contenance: contenance,
      expoMax: expoMax, effondrement: effondrement, effBasePartie: effBasePartie, effApresEffets: effApresEffets, effPartie: effPartie, effNiveauDe: effNiveauDe,
      poidsPorte: poidsPorte, accesPris: accesPris, contenancePrise: contenancePrise,
      desAction: desAction, ruptureMax: ruptureMax, ruptureDepense: ruptureDepense,
      xpDepense: xpDepense, courant: courant, maxDe: maxDe, autoDe: autoDe,
      confort: confort, defenseTotaux:defenseTotaux, defenseValeurs:defenseValeurs,
      effetBonus:effetBonus, effetAlerte:effetAlerte,
      avancerSecondes:function(n){var t=avancerSecondes(n);refresh();return t;},
      reculerSecondes:function(n){var t=reculerSecondes(n);refresh();return t;},
      epPermis:epPermis, nbEp:nbEp, objetEp:objetEp
    },
    // le registre des filtres, à plat et en copie : nom, propriétaire, fautes
    __filtres: function () {
      var out = [];
      Object.keys(filtres).forEach(function (nom) {
        (filtres[nom] || []).forEach(function (f) {
          out.push({ nom: nom, prop: f.prop, echecs: f.echecs });
        });
      });
      return out;
    }
  };
  window.__owdModules = window.Owd;


  // Les commandes externes ne doivent pas contourner le mode Consultation.
  function gardeCommandeEdition(obj,key){var fn=obj[key];obj[key]=function(){if(window.__owdCanEdit&&!window.__owdCanEdit())return false;return fn.apply(this,arguments);};}
  ['__defendreDepuisChat','__prepareTransfert','__importeTransfert','__confirmeTransfert','__retireTransfert','__annuleTransfert'].forEach(function(k){gardeCommandeEdition(window.Owd,k);});
  ['ajoute','retire','coupRecu','finTour','consomme'].forEach(function(k){gardeCommandeEdition(window.Owd.effets,k);});
  ['avancerSecondes','reculerSecondes'].forEach(function(k){gardeCommandeEdition(window.Owd.__calculs,k);});
