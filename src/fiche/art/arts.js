
  // ---------- onglet Art ----------
  function porteArt(c) {
    return !!(c && c.art && (String(c.art.name || "").trim() || String(c.art.desc || "").trim() ||
      c.art.cout !== undefined || c.art.acquis === false));
  }

  function nouvelArtCatalogue(key, c) {
    var nomComp = key.slice(key.indexOf("/") + 1);
    var art = { id: key, nom: c.art && c.art.name || nomComp, elements: [] };
    function ancienneEntree(t, id, gratuite) {
      var entree = { id: id, nom: t.name, desc: t.desc, mode: t.mode, acquis: t.acquis !== false };
      if (t.cout != null) entree.cout = t.cout;
      if (gratuite) entree.gratuite = true;
      return entree;
    }
    if (porteArt(c)) {
      art.elements.push({ id: key + "-principal", nom: "Art principal",
        entrees: [ancienneEntree(c.art, key + "-passif-initial", true)] });
    }
    if (c.techniques && c.techniques.length) {
      art.elements.push({ id: key + "-passifs", nom: "Passifs",
        entrees: c.techniques.map(function (t, i) { return ancienneEntree(t, key + "-passif-" + i, false); }) });
    }
    return art;
  }

  function ajouteArtsEligibles(liste, comps) {
    var presents = new Set(liste.map(function (g) { return g.id; }));
    Object.keys(comps).forEach(function (key) {
      if (presents.has(key)) return;
      var c = comps[key], stade = DATA && stadeInfo(c.stade);
      if (porteArt(c) || (c.techniques || []).length || (stade && (stade.art || stade.techniques))) {
        liste.push(nouvelArtCatalogue(key, c));
      }
    });
    return liste;
  }

  function coutEntreeArt(entree) {
    return entree.cout == null && entree.gratuite ? 0 : techXp(entree);
  }

  function artXpCatalogue(art, changement) {
    var total = 0;
    art.elements.forEach(function (technique) {
      (technique.entrees || []).forEach(function (entree) {
        var valeur = changement && changement.entree === entree ? changement.valeur : entree;
        if (valeur.acquis) total += coutEntreeArt(valeur);
      });
    });
    return total;
  }

  function valideAchatArt(key, entree, cout, acquis) {
    if (!acquis) return true;
    var c = state.comps[key] || { stade: 0 };
    var futur = { entree: entree, valeur: Object.assign({}, entree, { cout: cout, acquis: acquis }) };
    var xp = compXp(c, key, futur);
    var delta = xp - compXp(c, key);
    if (delta <= 0) return true;
    if (xpRestant() < delta) { flash("XP insuffisant."); return false; }
    if (xp > compCap()) {
      flash("Pas plus d’un quart de l’XP total (" + compCap() + " XP) dans une seule compétence.");
      return false;
    }
    return true;
  }

  function buildArt() {
    return buildListeOrganisee({
      groupesDe: function () { return ajouteArtsEligibles(state.artsOrganises, state.comps); },
      titre: "Arts", groupes: "Arts", elements: "Techniques", entrees: "Entrées",
      groupesObligatoires: true, groupeAutre: "un autre art",
      elementSingulier: "Technique", elementIndefini: "une technique", elementDefini: "cette technique",
      groupeSansNom: "Art sans nom", elementSansNom: "Technique sans nom", nouvelElement: "Nouvelle technique",
      videGroupe: "Aucune compétence n’ouvre d’art ou de passif.", videElement: "Aucune technique.", videEntree: "Aucune entrée.",
      unite: "XP", cout: coutEntreeArt, valideAchat: valideAchatArt
    });
  }
