  // ---------- persistance ----------
  // Le bandeau du dernier enregistrement raté : absent tant que ça passe. Une
  // panne d'enregistrement ne se dit PAS en un éclair de 2,6 s vu une seule
  // fois : la fiche continuerait de s'afficher, parfaitement normale, pendant
  // qu'une session entière de travail se perd à la fermeture. Tant que ça ne
  // repasse pas, le bandeau reste.
  var elSavePanne = null;
  function save() {
    arronditReservesTemps();
    window.OwdInventoryData.normalizeSlots(state.inv.objets);
    rangeEmplacements(state.inv.objets);
    window.OwdInventoryData.bind(state.inv.objets);
    // La mise en forme se fait HORS du try du stockage, et son échec se dit
    // autrement. Un mod qui range une donnée circulaire dans ctx.state fait
    // jeter stringify : setItem n'est alors jamais atteint, donc sous Roll20 le
    // cache mémoire du pont n'est même pas à jour, donc aucune écriture
    // programmée, ni accusé de réception, ni chien de garde, ni bandeau de
    // perte. Rien ne s'enregistrerait plus et rien ne le dirait.
    var json = null, panne = "";
    try { json = JSON.stringify(state); }
    catch (e) {
      panne = "La fiche ne peut plus se mettre en forme pour l'enregistrement (" + messageErreur(e) +
              "). Un mod a sans doute rangé une donnée qui se contient elle-même : plus rien n'est enregistré.";
    }
    if (json !== null) {
      try { STORE.setItem("owd-perso", json); }
      catch (e2) { panne = "Impossible d'enregistrer (stockage plein ou bloqué) : exporter la fiche en JSON."; }
    }
    montrePanneSave(panne);
    var cards;
    try { cards = JSON.parse(STORE.getItem("owd-cards")) || {}; } catch (e3) { cards = {}; }
    var card;
    try { card = computeCard(); } catch (e4) { card = null; }
    if (card) {
      card.id = "_current";
      cards._current = card;
      try { STORE.setItem("owd-cards", JSON.stringify(cards)); } catch (e5) {}
      enregistrementModules(card,json);
    }
  }

  var enregistrementEtat=null;
  function enregistrementModules(card,json) {
    if(!window.__owdSavingModules||json===null||enregistrementEtat===json)return;
    enregistrementEtat=json;
    var out={},caps=card.capacites,caracs=card.caracs;
    function set(id,parts){out[id]=JSON.stringify(parts);}
    var own={caracs:['caracs','caracsXp','xpTotal'],effort:['effort','qualiteSommeil','horloge'],exposition:['temperature','horlogeExposition'],mouvement:['allure','allureCran'],effondrement:['effParties','effAutre','effAlcool','effAlcoolSecondes','horlogeAlcool','effDesactive','effPause'],desaction:['desTailles','desUtilises'],attaque:['attaques'],defense:['defenses'],comps:['comps','compsGroupes'],effets:['effetsActifs','effetsPermanents'],techniques:['techniques'],avantages:['avantages'],notes:['notes'],jets:['de'],modcaracs:['caracsLeviers'],optcaps:['capsLeviers'],optcomps:['compsLeviers'],modules:['modules','modActifs'],mods:['mods'],bg:['background'],inv:['inv']};
    Object.keys(own).forEach(function(id){set(id,own[id].map(function(k){return state[k];}));});
    Object.keys(state.modData||{}).forEach(function(id){set(id,[out[id],state.modData[id]]);});
    function add(id,value){set(id,[out[id],value]);}
    add('caracs',[caracs,caps.xpDepense]);
    ['pv','pe','pm','pi','pc','contenance','rupture'].forEach(function(k){add(k,[caps[k],caps[k+'Max'],['pv','pe','pm'].indexOf(k)>=0?effetConsommation(k):null]);});
    add('survie',['pr','ps','ph'].map(function(k){return [caps[k],caps[k+'Max']];}));
    add('exposition',[caps.expo,caps.expoMax,confort()]);
    add('pc',[caps.charge,caps.chargePorte,caps.acces,caps.accesPris]);
    add('contenance',caps.contenancePrise);
    var causes=['pr','ps','ph','pi','charge','contenance','chaud','froid','alcool','autre'].map(function(k){return [k,effPartie(k)];});
    add('effondrement',[caps.effondrement,causes,effSpecifiques()]);
    add('mouvement',[effetBonus('pas'),effetBonus('vitesse'),effSpecifiques().pas]);
    add('recuperation',recupListeModule().map(function(x){return [x,recupEtatVueModule(x)];}));
    add('desaction',caps.desAction);
    add('comps',(state.comps||[]).map(function(c){return [compBonus(c),compDes(c),compXp(c)];}));
    var weapons=(state.inv.objets||[]).filter(function(o){return o.arme;}),combat=[state.combatOptions,state.combatModifiers,state.combatAffichage];
    add('attaque',[weapons,combat,caracs,(state.inv.objets||[]).filter(function(o){return o.munition;}),combatTypes().map(function(t){return effetBonus('degats',t);}),effetBonus('attaque'),effetBonus('paradeAdverse'),effetsSources().filter(function(x){return !!x.d.ops.impregnation;})]);
    add('defense',[weapons,combat,effetBonus('parade'),weapons.map(function(o){return (o.arme.modsParade||[]).map(function(k){return caracs[k];});}),combatTypes().map(function(t){return defenseTotaux(t,null,false);})]);
    add('effets',effetsSources());
    if(window.__owdJournal)add('journal',window.__owdJournal().ops.map(function(o){return o.id;}));
    // A mod may declare the exact values its own module calculates.
    modules.forEach(function(m){if(typeof m.enregistrement==='function'){try{add(m.id,m.enregistrement());}catch(e){}}});
    window.__owdSavingModules(out);
  }

  function montrePanneSave(msg) {
    if(window.__owdSaveFailure){window.__owdSaveFailure(msg);return;}
    if (!msg) {
      if (elSavePanne && elSavePanne.parentNode) elSavePanne.parentNode.removeChild(elSavePanne);
      return;
    }
    if (!appEl) return;   // pas encore monté : le prochain enregistrement le posera
    if (!elSavePanne) {
      // SA PROPRE CLASSE, en plus de la commune : .pc-avis est réservée au
      // bandeau de consentement des mods, les deux peuvent coexister, et sans
      // marque distincte ni le code ni une sonde ne sait lequel il tient.
      elSavePanne = el("div", "pc-avis pc-avis-save");
      elSavePanne.appendChild(el("div", "pc-avis-txt", ""));
    }
    var txt = elSavePanne.firstChild;
    if (txt.textContent !== msg) txt.textContent = msg;
    // save() part à chaque frappe : ne toucher au DOM que si le bandeau n'est
    // pas déjà à sa place, sinon chaque lettre tapée le déplacerait.
    if (elSavePanne.parentNode === appEl) return;
    // la feuille est cherchée parmi les enfants DIRECTS : insertBefore veut un
    // repère qui soit bien un enfant de appEl, et un querySelector qui
    // descendrait dans l'arbre jetterait au lieu de poser le bandeau
    var avant = null, k;
    for (k = 0; k < appEl.children.length; k++)
      if (appEl.children[k].className === "pc-sheet") { avant = appEl.children[k]; break; }
    appEl.insertBefore(elSavePanne, avant);
  }
  function load() {
    try { return normalize(JSON.parse(STORE.getItem("owd-perso"))); }
    catch (e) { return null; }
  }
  function curTab() { try { return STORE.getItem("owd-tab") || "fiche"; } catch (e) { return "fiche"; } }
  function setTab(id) { try { STORE.setItem("owd-tab", id); } catch (e) {} }

  // bibliothèque (site seulement : dans Roll20, une fiche par personnage)
  var PKEY = "owd-persos";
  function loadPersos() {
    try { var a = JSON.parse(STORE.getItem(PKEY)); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function savePersos(a) { try { STORE.setItem(PKEY, JSON.stringify(a)); } catch (e) {} }

