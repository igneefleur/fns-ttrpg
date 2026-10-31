  // ---------- registre de modules ----------
  // Un module = un bloc autonome de la fiche, désigné par un id STABLE (celui
  // que porte son attribut data-module, et sur lequel les sondes s'accrochent).
  // Le registre ne fait rien de plus que ce que le montage ferait en dur : il
  // le rend NOMMABLE. C'est la condition pour qu'un mod se substitue à un
  // module natif, ou change la disposition, sans qu'on rouvre ce fichier.
  //
  //   id      identifiant stable, unique
  //   titre   ce que le module affiche (repris par le plan et les cartes de panne)
  //   onglet  clé d'un onglet de TABS
  //   colonne clé d'une colonne du squelette de cet onglet
  //   pour    prédicat facultatif : le module n'existe que s'il rend vrai
  //   build   fonction SANS effet de bord sur la page : elle RETOURNE son bloc
  var modules = [];
  var moduleOrdre = [];    // ordre partiel demandé par ordonne() ; brut, filtré au montage
  var placeOrigine = {};   // id -> place déclarée, relevée AVANT toute consigne

  function rangModule(id) {
    for (var i = 0; i < modules.length; i++) if (modules[i].id === id) return i;
    return -1;
  }
  // Un id DÉJÀ PRÉSENT est REMPLACÉ, À SA PLACE : c'est ainsi qu'un mod se
  // substitue à un module natif. Le renvoyer en fin de colonne changerait la
  // disposition en douce, ce que personne n'a demandé.
  function enregistre(m) {
    var i = rangModule(m.id);
    // QUI a enregistré ce module. Un mod pose presque toujours un module dont
    // l'id diffère du sien : sans cette marque, ni la purge de horsMontage ni
    // les filtres du module ne sauraient remonter jusqu'au mod que le joueur
    // refuse. Posée une fois pour toutes, elle survit au rejeu.
    if (m && modEnExec && !m.__mod) m.__mod = modEnExec;
    if (i >= 0) modules[i] = m;
    else modules.push(m);
    if (!enMontage)
      gardeHorsMontage({ mod: m, prop: (m && (m.__mod || m.id)) ? String(m.__mod || m.id) : "?" });
    return m;
  }
  // Ordre PARTIEL : les id listés passent devant, dans l'ordre donné ; tous les
  // autres suivent à leur rang de déclaration. La liste est gardée BRUTE et
  // filtrée seulement au montage : un id peut nommer un module pas encore
  // enregistré (un mod chargé après), et un module retiré un jour ne doit pas
  // casser une disposition enregistrée.
  function ordonne(liste) {
    moduleOrdre = [];
    if (!liste) return;
    for (var i = 0; i < liste.length; i++)
      if (moduleOrdre.indexOf(liste[i]) < 0) moduleOrdre.push(liste[i]);
  }
  function ordreModules() {
    var vus = {}, out = [];
    moduleOrdre.forEach(function (id) {
      var i = rangModule(id);
      if (i >= 0 && !vus[id]) { vus[id] = 1; out.push(modules[i]); }
    });
    modules.forEach(function (m) {
      if (!vus[m.id]) { vus[m.id] = 1; out.push(m); }
    });
    return out;
  }

  // Squelette de chaque onglet : ses colonnes, dans l'ordre. Il vit ICI, et pas
  // dans les modules, pour qu'un mod n'ait qu'un bloc à fournir sans rien
  // savoir de la charpente.
  //
  // Une colonne PLEINE LARGEUR se reconnaît à ce qu'elle rend le PANNEAU
  // lui-même (c[k] === pane) : c'est ainsi que l'inventaire passe sous les deux
  // colonnes, et c'est ce que squeletteColonnes() exploite pour dessiner le
  // plan. L'onglet Fiche en gagne une (JJK n'en avait pas) : les techniques
  // s'étalent sous les trois colonnes, le CSS le porte déjà
  // (.pc-cols-fiche + .pc-block { margin-top: var(--gut) }).
  var SQUELETTES = {
    // TROIS COLONNES, et pas de rangée pleine largeur : ce qui s'y trouvait est
    // parti dans ses propres onglets.
    fiche: function (pane) {
      var cols = el("div", "pc-cols-fiche");
      var c1 = el("div", "pc-col");
      var c2 = el("div", "pc-col");
      var c3 = el("div", "pc-col");
      cols.appendChild(c1);
      cols.appendChild(c2);
      cols.appendChild(c3);
      pane.appendChild(cols);
      return { gauche: c1, milieu: c2, droite: c3 };
    },
    // UNE SEULE COLONNE, et c'est le PANNEAU lui-même : une carte de technique
    // porte cinq champs et une macro, elle ne tient pas dans un tiers de
    // feuille. Rendre le panneau au lieu d'un enfant est la convention qui dit
    // « pleine largeur » — le plan des modules la reconnaît et dessine alors sa
    // propre rangée.
    art: function (pane) {
      return { milieu: pane };
    },
    equipement: function (pane) {
      return { milieu: pane };
    },
    bio: function (pane) {
      var cols = el("div", "pc-cols2");
      var c1 = el("div", "pc-col");
      var c2 = el("div", "pc-col");
      cols.appendChild(c1);
      cols.appendChild(c2);
      pane.appendChild(cols);
      return { gauche: c1, droite: c2 };
    },
    options: function (pane) {
      var cols = el("div", "pc-cols2");
      var c1 = el("div", "pc-col");
      var c2 = el("div", "pc-col");
      cols.appendChild(c1);
      cols.appendChild(c2);
      pane.appendChild(cols);
      return { gauche: c1, droite: c2 };
    }
  };
  // Libellés COURTS : ils coiffent une colonne du plan, qui est étroite.
  var LIB_COLONNES = {
    gauche: "Gauche", milieu: "Milieu", droite: "Droite",
    seule: "Pleine largeur", bas: "Pleine largeur"
  };

  // L'interrupteur du module. SEULS les modules COUPÉS figurent dans
  // state.modActifs : tout le reste est actif, y compris un module inconnu de
  // la fiche qui l'ouvre.
  function actif(id) {
    return !state || !state.modActifs || state.modActifs[id] !== false;
  }
  // Couper un module le retire de la fiche SANS RIEN EFFACER : son coffre et
  // ses données restent, il ne s'affiche plus.
  function activeModule(id, oui) {
    if (!state) return;
    if (!state.modActifs) state.modActifs = {};
    // Le bloc des réglages ne se coupe pas, et LE REFUS EST ICI, DANS
    // L'ÉCRITURE, pas seulement au montage. Sinon un mod qui appelle
    // Owd.active("modules", false) laisse « modules: false » dans le personnage
    // pour toujours : le bloc s'affiche (le montage l'exempte) pendant que
    // Owd.actif("modules") répond faux, et le personnage transmis emporte une
    // incohérence que rien n'efface.
    if (String(id) === MODULE_REGLAGES) { delete state.modActifs[id]; save(); return; }
    if (oui === false) state.modActifs[id] = false;
    else delete state.modActifs[id];
    save();
  }
  var elModules = {};   // id -> l'élément monté (pour marquer une muselière)
  // Le prédicat « pour » d'un module natif dit s'il existe ICI (« affichage »
  // n'existe que dans Roll20). Il passe par cette enveloppe qui ATTRAPE ses
  // exceptions : un prédicat qui jette emportait sinon TOUT le montage, donc la
  // fiche, sans rien pour rouvrir.
  function moduleAffichable(m) {
    if (typeof m.pour !== "function") return true;
    try { return !!m.pour(); } catch (e) { return false; }
  }

  var modulesDifferes=[],moduleObserver=null;
  function observeModuleDiffere(slot){if(moduleObserver)moduleObserver.observe(slot);}
  function observeVisibiliteModules(){
    if(typeof IntersectionObserver!=='function')return;
    var seen=false,wasVisible=true;
    var observer=new IntersectionObserver(function(entries){
      var restore=false;entries.forEach(function(e){if(e.target===rootEl){if(seen&&!wasVisible&&e.isIntersecting)restore=true;seen=true;wasVisible=e.isIntersecting;}});
      if(window.__owdViewVisible===false)return;
      var ready=modulesDifferes.filter(function(x){return entries.some(function(e){return e.target===x.slot&&e.isIntersecting;})&&x.slot.getClientRects().length;});
      modulesDifferes=modulesDifferes.filter(function(x){return ready.indexOf(x)<0;});
      ready.forEach(function(x){observer.unobserve(x.slot);construitModule(x.m,x.hote,x.slot);});
      if(ready.length||restore)refresh(true);
    });
    moduleObserver=observer;observer.observe(rootEl);remontageNettoyage.push(function(){observer.disconnect();});
  }
  function moduleNatif(m){return MODULES_NATIFS.some(function(n){return n.id===m.id&&n.build===m.build;});}
  function modulesPersoActifs(){return (typeof filtres!=='undefined'&&Object.keys(filtres).some(function(k){return filtres[k].length>0;}))||(Array.isArray(modules)&&modules.some(function(m){return !moduleNatif(m);}))||(state.mods||[]).some(function(m){return m.actif!==false&&modAutorise(m.id);});}
  function construitModule(m,hote,slot){
    var reg=regModule(m.id),precedent=hooks,propPrecedent=proprietaireCourant,e;
    hooks=reg;proprietaireCourant=m.__mod||m.id;
    var cleanStart=remontageNettoyage.length;
    try{e=m.build(contexte(m,reg));if(e&&e.nodeType!==1)e=null;if(e&&!e.dataset.module)e.dataset.module=m.id;etatModule(m.id).panne='';}
    catch(err){reg.length=0;e=blocEnPanne(m,err);}
    finally{hooks=precedent;proprietaireCourant=propPrecedent;}
    remontageNettoyage.slice(cleanStart).forEach(function(fn){fn._owdModule=m.id;});
    etatModule(m.id).vide=!e;
    if(!e){if(slot)slot.remove();delete elModules[m.id];return;}
    try{if(slot&&slot.parentNode)slot.parentNode.replaceChild(e,slot);else hote.appendChild(e);elModules[m.id]=e;}
    catch(err2){reg.length=0;var carte=blocEnPanne(m,err2);if(slot&&slot.parentNode)slot.parentNode.replaceChild(carte,slot);else hote.appendChild(carte);elModules[m.id]=carte;}
  }
  function monteOnglet(id){
    var todo=modulesDifferes.filter(function(x){return id==null||x.m.onglet===id;});
    modulesDifferes=modulesDifferes.filter(function(x){return id!=null&&x.m.onglet!==id;});
    todo.forEach(function(x){if(moduleObserver)moduleObserver.unobserve(x.slot);construitModule(x.m,x.hote,x.slot);});
  }
  function reconstruitModules(ids){
    ids.forEach(function(id){
      var old=elModules[id],m=modules.filter(function(x){return x.id===id;})[0];
      if(!old||!old.parentNode||!m||old.classList.contains('pc-module-differe'))return;
      var retained=[];remontageNettoyage.forEach(function(fn){if(fn._owdModule===id){try{fn();}catch(e){}}else retained.push(fn);});remontageNettoyage=retained;
      regsModules[id]=[];if(id==='comps')compHooks=[];if(id==='recuperation')recupHooks=[];if(id==='optcomps')optHooks=[];
      etatsModules[id]={echecs:0,musele:false,erreur:'',panne:'',vide:false};
      if((window.__owdViewVisible===false||!old.getClientRects().length)&&!m.__mod&&!modulesPersoActifs()){
        var parent=old.parentNode,slot=el('div','pc-module-differe');slot.dataset.module=id;slot.style.minHeight='1px';parent.replaceChild(slot,old);elModules[id]=slot;modulesDifferes.push({m:m,hote:parent,slot:slot});observeModuleDiffere(slot);
      }else construitModule(m,old.parentNode,old);
    });
  }
  function monteModules(panes){
    var colonnes={};elModules={};modulesDifferes=[];observeVisibiliteModules();
    TABS.forEach(function(t){if(SQUELETTES[t.id]&&panes[t.id])colonnes[t.id]=SQUELETTES[t.id](panes[t.id]);});
    ordreModules().forEach(function(m){
      if(panes.inventoryRoot&&m.id!==(panes.onlyModule||'inv'))return;
      if(!panes.inventoryRoot&&m.id!==MODULE_REGLAGES&&!actif(m.id))return;
      if(!moduleAffichable(m))return;
      var cols=colonnes[m.onglet],hote=panes.inventoryRoot||((cols&&aClef(cols,m.colonne))?cols[m.colonne]:null);
      if(!hote){etatModule(m.id).vide=true;return;}
      if(((panes.inventoryRoot&&window.__owdViewVisible===false)||(!panes.inventoryRoot&&m.onglet!==curTab()))&&!m.__mod&&!modulesPersoActifs()){
        var slot=el('div','pc-module-differe');slot.dataset.module=m.id;slot.style.minHeight='1px';hote.appendChild(slot);elModules[m.id]=slot;modulesDifferes.push({m:m,hote:hote,slot:slot});observeModuleDiffere(slot);
      }else construitModule(m,hote,null);
    });
  }
