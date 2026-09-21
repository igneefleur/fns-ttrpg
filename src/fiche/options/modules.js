  // ---- 19. Modules : le plan de la fiche ----
  // Ce bloc-ci parle de TOUS les autres. Il n'écrit que deux choses : la
  // disposition (state.modules) et les interrupteurs (state.modActifs) ; rien
  // du personnage ne passe par lui. Les outils qu'il appelle sont ceux du
  // MONTAGE (ordreModules, squeletteColonnes, MODULES_NATIFS), pour que le plan
  // dise exactement ce que la fiche a fait.
  function disposition() {
    if (!state.modules || typeof state.modules !== "object" || Array.isArray(state.modules))
      state.modules = {};
    return state.modules;
  }
  // La place qu'un module DEMANDE : la consigne enregistrée si elle existe,
  // sinon celle qu'il a déclarée au montage. On ne lit surtout pas
  // modules[i].onglet : appliqueDisposition l'a déjà remanié, il porte la place
  // FORCÉE — et « Disposition d'origine » ne montrerait rien avant le
  // rechargement, un module déplacé deux fois repartant de sa place forcée.
  function placeDemandee(m) {
    var p = (disposition().place || {})[m.id];
    if (p && typeof p === "object" && typeof p.onglet === "string" && typeof p.colonne === "string")
      return { onglet: p.onglet, colonne: p.colonne };
    var o = placeOrigine[m.id];
    if (o) return { onglet: o.onglet, colonne: o.colonne };
    return { onglet: m.onglet, colonne: m.colonne };
  }
  function idsConnus() { return ordreModules().map(function (m) { return m.id; }); }
  function memeColonne(id, onglet, colonne) {
    var i = rangModule(id);
    if (i < 0) return false;
    var p = placeDemandee(modules[i]);
    return p.onglet === onglet && p.colonne === colonne;
  }
  // ON N'ÉPINGLE QUE LA COLONNE TOUCHÉE, et c'est tout le sujet. L'ancienne
  // version écrivait l'ordre COMPLET de tous les modules, tous onglets
  // confondus : un seul clic n'importe où, et la disposition du personnage
  // était gelée pour toujours — la fiche pouvait ensuite réagencer un onglet
  // auquel le joueur n'avait jamais touché, il ne le voyait jamais. C'est
  // arrivé pour de bon en JJK.
  //
  // ordonne() accepte un ordre PARTIEL : c'est ce qui rend la chose possible.
  function ecritOrdre(ids, onglet, colonne) {
    var d = disposition();
    var ancien = Array.isArray(d.ordre) ? d.ordre : [];
    var neuf = [], vus = {}, i;
    for (i = 0; i < ancien.length; i++) {
      if (onglet && memeColonne(ancien[i], onglet, colonne)) continue;
      if (!vus[ancien[i]]) { vus[ancien[i]] = 1; neuf.push(ancien[i]); }
    }
    for (i = 0; i < ids.length; i++) {
      if (onglet && !memeColonne(ids[i], onglet, colonne)) continue;
      if (!vus[ids[i]]) { vus[ids[i]] = 1; neuf.push(ids[i]); }
    }
    d.ordre = neuf;
    // L'ordre vivant suit tout de suite, mais LA FICHE NE SE REMONTE PAS : elle
    // se remontait, et ranger trois modules reconstruisait trois fois la fiche
    // entière, l'onglet sautait, et le moindre clic coûtait une seconde.
    ordonne(d.ordre);
    save();
  }
  function natifDe(id) {
    for (var i = 0; i < MODULES_NATIFS.length; i++)
      if (MODULES_NATIFS[i].id === id) return MODULES_NATIFS[i];
    return null;
  }
  function deplaceModule(id, onglet, colonne, avantId) {
    var d = disposition();
    var nat = placeOrigine[id] || natifDe(id);
    if (!d.place || typeof d.place !== "object" || Array.isArray(d.place)) d.place = {};
    // Revenir à sa place d'origine EFFACE l'entrée plutôt que d'y ranger cette
    // place : la disposition reste éparse, et un module que la fiche
    // déménagera un jour suivra son déménagement au lieu d'être épinglé ici.
    if (nat && nat.onglet === onglet && nat.colonne === colonne) delete d.place[id];
    else d.place[id] = { onglet: onglet, colonne: colonne };
    var ids = idsConnus();
    var j = ids.indexOf(id);
    if (j >= 0) ids.splice(j, 1);
    var k = avantId ? ids.indexOf(avantId) : -1;
    if (k >= 0) ids.splice(k, 0, id);
    else {
      // à la fin de SA colonne, et non à la fin de tout : sinon un module lâché
      // au bas d'une colonne se rangerait derrière ceux des autres onglets
      var dernier = -1, q;
      for (q = 0; q < ids.length; q++) if (memeColonne(ids[q], onglet, colonne)) dernier = q;
      if (dernier >= 0) ids.splice(dernier + 1, 0, id);
      else ids.push(id);
    }
    ecritOrdre(ids, onglet, colonne);
    redessinePlan();
  }
  // Redessiner LE PLAN SEUL, sans reconstruire la fiche. Enveloppé : un plan
  // qui échoue ne doit pas emporter la fiche avec lui.
  function redessinePlan() {
    try {
      var vieux = document.querySelector('[data-module="' + MODULE_REGLAGES + '"]');
      if (!vieux || !vieux.parentNode) return;
      var neuf = buildModules();
      if (!neuf) return;
      neuf.dataset.module = MODULE_REGLAGES;
      vieux.parentNode.replaceChild(neuf, vieux);
      elModules[MODULE_REGLAGES] = neuf;
    } catch (e) {}
  }
  // La colonne d'un module existe-t-elle dans le squelette de son onglet ? Un
  // mod qui recopie « milieu » dans un onglet qui n'en a pas se retrouve sans
  // hôte : il ne se monte nulle part, alors que sa ligne, elle, figure bien
  // sous son onglet, l'air d'un module ordinaire. Il faut le reconnaître pour
  // le dire.
  function colonneRepli(p) {
    var cols = colonnesDe(p.onglet);
    if (!cols) return null;                    // onglet inconnu : autre cas
    if (aClef(cols, p.colonne)) return p.colonne;
    return Object.keys(cols)[0] || null;
  }
  function colonneInconnue(p) {
    var r = colonneRepli(p);
    return !!r && r !== p.colonne;
  }
  function buildModules() {
    var b = block("Modules");
    var plan = el("div", "pc-modplan");
    var visibles = ordreModules().filter(moduleAffichable);
    var vus = {};
    var pris = null;        // l'id qu'on tient
    var listes = [];        // toutes les zones de dépôt, pour les éteindre

    function eteintTout() {
      listes.forEach(function (z) { z.classList.remove("survol"); });
      var c = plan.querySelectorAll(".pc-modplan-carte.avant");
      for (var i = 0; i < c.length; i++) c[i].classList.remove("avant");
    }
    // Devant quelle carte se pose ce qu'on lâche à cette hauteur ? La moitié
    // HAUTE d'une carte veut dire « avant elle ».
    function cibleDe(liste, y) {
      var cartes = liste.querySelectorAll(".pc-modplan-carte");
      for (var i = 0; i < cartes.length; i++) {
        var r = cartes[i].getBoundingClientRect();
        if (y < r.top + r.height / 2) return cartes[i];
      }
      return null;
    }
    function carte(m, souci) {
      var c = el("div", "pc-modplan-carte");
      c.dataset.id = m.id;
      c.draggable = true;
      var t = el("span", "t", m.titre || m.id);
      t.title = (m.titre || m.id) + (souci ? " — " + souci : "");
      c.appendChild(t);
      // L'œil : affiché ou masqué. Le bloc des réglages lui-même n'en a pas,
      // c'est lui qui rallume les autres.
      if (m.id !== MODULE_REGLAGES) {
        var oeil = el("span", "pc-modplan-oeil");
        oeil.textContent = actif(m.id) ? "●" : "○";
        oeil.title = actif(m.id)
          ? "Affiché sur la fiche. Cliquer pour le masquer : rien n'est effacé."
          : "Masqué. Cliquer pour le réafficher.";
        oeil.addEventListener("click", function (e) {
          e.stopPropagation();
          activeModule(m.id, !actif(m.id));
          redessinePlan();       // comme le rangement : la fiche attend son chargement
        });
        c.appendChild(oeil);
      }
      var e = etatModule(m.id);
      if (e.panne) { c.dataset.etat = "panne"; t.title += " — en panne : " + e.panne; }
      else if (e.musele) { c.dataset.etat = "panne"; t.title += " — muselé : " + e.erreur; }
      if (souci) c.dataset.etat = "perdu";
      if (!actif(m.id)) c.classList.add("off");

      c.addEventListener("dragstart", function (ev) {
        pris = m.id;
        c.classList.add("pris");
        try {
          ev.dataTransfer.effectAllowed = "move";
          // Firefox refuse de commencer un glissement sans donnée posée
          ev.dataTransfer.setData("text/plain", m.id);
        } catch (err) {}
      });
      c.addEventListener("dragend", function () {
        pris = null;
        c.classList.remove("pris");
        eteintTout();
      });
      return c;
    }
    function zone(onglet, colonne, libelle) {
      var z = el("div", "pc-modplan-col");
      z.appendChild(el("div", "pc-modplan-col-nom", libelle));
      var liste = el("div", "pc-modplan-liste");
      z.appendChild(liste);
      listes.push(liste);
      liste.addEventListener("dragover", function (ev) {
        if (!pris) return;
        ev.preventDefault();           // sans ça, le navigateur refuse le dépôt
        try { ev.dataTransfer.dropEffect = "move"; } catch (err) {}
        eteintTout();
        liste.classList.add("survol");
        var avant = cibleDe(liste, ev.clientY);
        if (avant) avant.classList.add("avant");
      });
      liste.addEventListener("dragleave", function (ev) {
        if (ev.target === liste) liste.classList.remove("survol");
      });
      liste.addEventListener("drop", function (ev) {
        ev.preventDefault();
        var id = pris;
        if (!id) { try { id = ev.dataTransfer.getData("text/plain"); } catch (err) { id = null; } }
        eteintTout();
        if (!id) return;
        var avant = cibleDe(liste, ev.clientY);
        if (avant && avant.dataset.id === id) return;   // se lâcher sur soi-même ne range rien
        deplaceModule(id, onglet, colonne, avant ? avant.dataset.id : null);
      });
      return { bloc: z, liste: liste };
    }
    function remplit(onglet, dedans, noms, premiere) {
      var rangee = el("div", "pc-modplan-cols");
      rangee.style.gridTemplateColumns = "repeat(" + noms.length + ", minmax(0, 1fr))";
      noms.forEach(function (c) {
        var z = zone(onglet, c, LIB_COLONNES[c] || capFirst(c));
        dedans.forEach(function (o) {
          // une colonne que l'onglet ne connaît pas : la carte se pose dans la
          // PREMIÈRE colonne, marquée, plutôt que de n'apparaître nulle part —
          // sinon le module serait invisible ET impossible à ranger
          var perdue = colonneInconnue(o.place);
          var ici = perdue ? (c === premiere) : (o.place.colonne === c);
          if (!ici) return;
          vus[o.m.id] = 1;
          z.liste.appendChild(carte(o.m, perdue
            ? "colonne « " + o.place.colonne + " » inconnue dans cet onglet : ce module ne s'affiche nulle part"
            : ""));
        });
        rangee.appendChild(z.bloc);
      });
      return rangee;
    }

    TABS.forEach(function (t) {
      var dedans = [];
      visibles.forEach(function (m) {
        var p = placeDemandee(m);
        if (p.onglet === t.id) dedans.push({ m: m, place: p });
      });
      if (!dedans.length) return;
      plan.appendChild(el("div", "pc-modgroupe", t.label));
      var d = squeletteColonnes(t.id) || { noms: [], larges: {} };
      var noms = d.noms.length ? d.noms : ["gauche"];
      // Une colonne PLEINE LARGEUR n'est pas une colonne de la grille : sur la
      // fiche elle court sous les autres. Le plan la met donc SOUS elles, dans
      // sa propre rangée, au lieu de la serrer entre deux voisines à qui elle
      // prendrait un tiers de la place.
      var etroites = noms.filter(function (c) { return !d.larges[c]; });
      var larges = noms.filter(function (c) { return !!d.larges[c]; });
      if (!etroites.length) { etroites = larges; larges = []; }
      plan.appendChild(remplit(t.id, dedans, etroites, etroites[0]));
      larges.forEach(function (c) { plan.appendChild(remplit(t.id, dedans, [c], null)); });
    });

    // Un module dont l'ONGLET n'existe pas (un mod mal réglé) ne se monte nulle
    // part. Sans cette rangée il serait invisible ET impossible à ranger : le
    // joueur n'aurait plus qu'à effacer le mod pour s'en défaire.
    var perdus = visibles.filter(function (m) { return !vus[m.id]; });
    if (perdus.length) {
      plan.appendChild(el("div", "pc-modgroupe", "Onglet inconnu"));
      var rp = el("div", "pc-modplan-cols");
      rp.style.gridTemplateColumns = "minmax(0, 1fr)";
      var zp = zone(TABS[0].id, "gauche", "À ranger");
      perdus.forEach(function (m) {
        zp.liste.appendChild(carte(m, "onglet « " + placeDemandee(m).onglet +
          " » inconnu : ce module ne s'affiche nulle part"));
      });
      rp.appendChild(zp.bloc);
      plan.appendChild(rp);
    }

    if (!plan.children.length) plan.appendChild(el("div", "pc-empty", "Aucun module."));
    b.appendChild(plan);
    var tools = el("div", "pc-comp-tools");
    // Ranger n'agit plus tout de suite, et IL FAUT LE DIRE : sans cette ligne,
    // le plan montrerait un rangement que la fiche derrière ne suit pas, et on
    // le croirait cassé.
    tools.appendChild(el("div", "pc-modplan-avis",
      "La disposition ne change qu'au chargement de la fiche."));
    var duo = el("div", "pc-modplan-duo");
    duo.appendChild(miniBtn("Disposition d'origine",
      "Rendre à chaque module son onglet, sa colonne et son rang d'origine. Les modules masqués le restent.",
      function () {
        state.modules = {};
        ordonne([]);
        save();
        redessinePlan();
        flash("Disposition d'origine rétablie. Recharger la fiche pour la voir.");
      }));
    duo.appendChild(miniBtn("Recharger la fiche", "Reconstruire la fiche avec le rangement du plan.",
      function () { remount(); flash("Fiche rechargée."); }));
    tools.appendChild(duo);
    b.appendChild(tools);
    return b;
  }

