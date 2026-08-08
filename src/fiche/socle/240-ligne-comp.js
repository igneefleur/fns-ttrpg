  // opts : { module, reg, onDrop } — le module dont le rouage déverrouille la
  // barre de stade, le registre de hooks où la ligne s'inscrit (celui du module
  // qui la reconstruit, sinon ses hooks fuiteraient), et le retrait sur mesure.
  // Par défaut : le module « comps » de l'onglet Fiche.
  function compRow(item, odd, opts) {
    opts = opts || {};
    var mod = opts.module || "comps";
    var reg = opts.reg || compHooks;
    var comp = function () { return state.comps[item.key] || blankComp(); };
    var row = el("div", "pc-comp-row" + (odd ? " odd" : ""));

    var nameBox = el("span", "pc-comp-name");
    var label = el("span", "pc-comp-label", item.name);
    label.title = item.name + " (" + item.carac + ")";
    nameBox.appendChild(label);
    if (item.custom) {
      var del = el("button", "pc-comp-del pc-edit-only", "✕");
      del.type = "button";
      del.title = item.langue ? "Retirer cette langue" : "Retirer cette compétence personnalisée";
      del.addEventListener("click", function () {
        // la compétence peut porter des données que la ligne ne montre pas
        // (un art rédigé puis stade redescendu) : confirmer avant d'effacer
        var c = state.comps[item.key];
        var garde = [];
        if (c && c.stade > 0) garde.push("de l'xp investi");
        if (c && c.techniques && c.techniques.length) garde.push("des passifs");
        if (porteArt(c)) garde.push("un art");
        if (state.compsMod[item.key]) garde.push("un modificateur (Options)");
        if (garde.length &&
            !confirm("Supprimer « " + item.name + " » effacera aussi " + garde.join(", ") + ". Continuer ?")) return;
        if (item.langue) {
          state.langues = state.langues.filter(function (n) { return n !== item.name; });
          if (state.langueBase === item.name) state.langueBase = "";
        } else if (item.arme) {
          state.armesComps = state.armesComps.filter(function (n) { return n !== item.name; });
        } else {
          state.customComps = state.customComps.filter(function (cc) { return (cc.carac + "/" + cc.name) !== item.key; });
        }
        delete state.comps[item.key];
        delete state.compsMod[item.key];   // sinon le modificateur renaîtrait sur une homonyme
        refresh();
        if (opts.onDrop) opts.onDrop();
        rebuildComps();
        if (optCompsRebuild) optCompsRebuild();
      });
      nameBox.appendChild(del);
    }
    row.appendChild(nameBox);

    // stade : une barre segmentée [ N | I | M | E | A ] au dégradé qui monte
    // jusqu'au rouge des caractéristiques ; centrée, toujours au même endroit.
    // Cliquable seulement en mode édition du module (le coût se règle tout
    // seul) ; verrouillée, elle reste l'affichage du stade. Les passifs et
    // l'art se personnalisent dans l'onglet Art.
    function applyStade(target) {
      var c = comp();
      if (target === c.stade) return;
      var next = { stade: target, techniques: c.techniques.slice() };
      // l'art suit la compétence : il survit aux allers-retours de stade
      // (il ne se montre que quand le stade qui l'ouvre est atteint)
      if (porteArt(c)) next.art = c.art;
      if (!stadeInfo(target).techniques) {
        // les passifs rédigés vivent dans l'onglet Art : la ligne ne les
        // montre pas, on confirme avant de les effacer avec la descente
        var redigees = c.techniques.filter(function (t) {
          return String(t.name || "").trim() || String(t.desc || "").trim();
        }).length;
        if (redigees &&
            !confirm("Redescendre « " + item.name + " » à " + stadeInfo(target).nom +
                     " effacera " + redigees + " passif(s) rédigé(s) (onglet Art). Continuer ?")) return;
        next.techniques = [];
      }
      var delta = compXp(next, item.key) - compXp(c, item.key);
      if (delta > 0 && xpRestant() < delta) { flash("XP insuffisant."); return; }
      // le plafond du quart ne bloque que les HAUSSES : on peut toujours redescendre
      if (delta > 0 && compXp(next, item.key) > compCap()) {
        flash("Pas plus d'un quart de l'xp total (" + compCap() + " xp) dans une seule compétence.");
        return;
      }
      state.comps[item.key] = next;
      if (!next.stade && !next.techniques.length && !next.art) delete state.comps[item.key];
      refresh();
    }
    var st = el("span", "pc-stadebar");
    var segs = [];
    DATA.stades.forEach(function (sd, i) {
      var sg = el("button", "seg s" + i, (sd.nom || "?").charAt(0).toUpperCase());
      sg.type = "button";
      sg.title = sd.nom + " (" + sign(sd.bonus) + ") — " + (DATA.xpParStade * i) + " xp";
      sg.addEventListener("click", function () {
        if (!isEdit(mod)) return;   // construction : mode édition requis
        applyStade(i);
      });
      st.appendChild(sg);
      segs.push(sg);
    });
    row.appendChild(st);

    // le total est un BOUTON de jet, comme la valeur d'une caractéristique.
    // opts.value permet à un module de compter autrement (l'initiative passe par
    // son propre filtre) sans dupliquer la ligne.
    var valeur = opts.value || function (c) { return compValue(item.carac, c, item.key); };
    var total = el("button", "pc-comp-total pc-comp-roll pc-rollable", "");
    total.type = "button";
    total.addEventListener("click", function () {
      // L'initiative, et elle seule, s'inscrit au compteur de tours de Roll20.
      // Le drapeau suit la CLÉ de la compétence, pas le module : la ligne est
      // la même quand le module Initiative est coupé et que Body/Initiative
      // revient dans la liste des compétences.
      doRoll(opts.rollLabel || (item.name + " (" + item.carac + ")"), valeur(comp()),
             null, true, item.carac, item.key === INIT_KEY);
    });
    row.appendChild(total);

    reg.push(function () {
      var c = comp();
      var d = state.compsMod[item.key] || 0;
      // le malus de poids réellement retenu par cette ligne : zéro hors des jets
      // de Body, zéro sur une arme, zéro sous un total forcé
      var m = compPoidsMalus(item.carac, item.key);
      segs.forEach(function (sg, i) {
        sg.classList.toggle("on", i <= c.stade);
        // « cur » MARQUE LE STADE COURANT, et n'a effectivement aucune regle de
        // style : c'est un REPERE, pas une decoration. Un audit l'a retiree pour
        // cette raison, et quatre sondes sont tombees — c'est par elle qu'on
        // lit, de l'exterieur, a quel stade une competence se trouve. Une marque
        // sans peinture reste une marque.
        sg.classList.toggle("cur", i === c.stade);
      });
      total.textContent = sign(valeur(c));
      // « zero » dit « rien ne s'ajoute ni ne se retranche à la caractéristique » :
      // le malus compte, sans quoi une compétence grisée comme inerte afficherait
      // un total qui bouge à chaque objet rangé dans le sac
      total.classList.toggle("zero", !c.stade && !d && !m && !opts.value);
      total.classList.toggle("adj", d !== 0 || m !== 0);
      total.title = item.carac + " " + sign(caracTotal(item.carac)) +
                    " · stade " + sign(stadeInfo(c.stade).bonus) +
                    (d ? " · modificateur (Options) " + sign(d) : "") +
                    (m ? " · poids " + sign(-m) : "") +
                    (item.langue && state.langueBase === item.name ? " · langue du personnage (gratuite)" : "") +
                    " — clic : lancer";
    });
    return row;
  }

