  // ---------- onglet Art ----------
  // La personnalisation d'une compétence vit ICI : au stade qui ouvre les
  // passifs et l'art (« Artiste » sous les règles actuelles), sa carte porte les
  // fiches de passifs, le nom et la description de l'art. Aucun
  // contenu de règles : seulement les données du personnage. La liste se
  // reconstruit seulement quand les compétences éligibles (ou leur stade)
  // changent, pas à chaque frappe.
  // porteArt : la compétence a un art non vide (même si le stade est redescendu)
  function porteArt(c) {
    return !!(c && c.art && (String(c.art.name || "").trim() || String(c.art.desc || "").trim() ||
      c.art.cout !== undefined || c.art.acquis === false));
  }
  function artComps() {
    // même ordre que la Fiche : Body, puis Mind, puis Prestance, puis alphabétique
    var rang = {};
    CHAMPS.forEach(function (ch, i) { rang[ch] = i; });
    return allComps().filter(function (it) {
      var c = state.comps[it.key];
      // les passifs rédigés et l'art restent VISIBLES même si le stade ne les
      // ouvre plus (stade redescendu, ou stade d'ouverture déplacé) : les
      // données du joueur ne disparaissent jamais en silence
      return !!(c && (stadeInfo(c.stade).techniques || stadeInfo(c.stade).art ||
                      (c.techniques && c.techniques.length) || porteArt(c)));
    }).sort(function (a, b) {
      return (rang[a.carac] || 0) - (rang[b.carac] || 0)
        || a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
    });
  }
  function artGroupes() {
    var articles = artComps();
    return CHAMPS.map(function (champ) {
      return {
        id: champ,
        get nom() { return state.artCategories[champ] || champ; },
        set nom(nom) { state.artCategories[champ] = nom; },
        elements: articles.filter(function (it) { return it.carac === champ; }).map(function (it) {
          var c = state.comps[it.key];
          var art = c.art || { name: "", desc: "", mode: "plain", acquis: true };
          var principale = null;
          if (stadeInfo(c.stade).art || porteArt(c)) {
            principale = { id: "art-" + it.key, principale: true };
            ["name", "desc", "mode", "cout", "acquis"].forEach(function (key) {
              Object.defineProperty(principale, key, {
                enumerable: true,
                get: function () { return art[key]; },
                set: function (value) {
                  if (value === undefined) delete art[key];
                  else art[key] = value;
                  c.art = art;
                }
              });
            });
          }
          return {
            id: it.key, stade: c.stade,
            get nom() { return art.name ? art.name + " · " + it.name : it.name; },
            set nom(nom) {
              art.name = nom;
              c.art = art;
            },
            get nomEdition() { return principale ? art.name : null; },
            entrees: c.techniques,
            principale: principale
          };
        })
      };
    });
  }

  function valideAchatArt(element, entree, cout, acquis) {
    if (!acquis) return true;
    var c = state.comps[element.id];
    var futur = Object.assign({}, c);
    var prochaine = Object.assign({}, entree, { cout: cout, acquis: acquis });
    if (entree.principale) futur.art = prochaine;
    else futur.techniques = c.techniques.map(function (t) { return t === entree ? prochaine : t; });
    var xp = compXp(futur, element.id);
    var delta = xp - compXp(c, element.id);
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
      titre: "Arts et passifs", groupes: "Champs", elements: "Arts", entrees: "Entrées",
      groupeSansNom: "Champ sans nom", elementSansNom: "Art sans nom",
      videGroupe: "Aucun champ.", videElement: "Aucune compétence n’ouvre d’art ou de passif.", videEntree: "Aucune entrée.",
      groupesDe: artGroupes, structureFixe: true, unite: "XP", nomChamp: "name", envoi: true,
      cout: function (entree) { return entree.principale ? Number(entree.cout) || 0 : techXp(entree); },
      valideAchat: valideAchatArt,
      effacePrincipale: function (element) { delete state.comps[element.id].art; },
      peutAjouter: function (element) { return stadeInfo(element.stade).techniques; },
      nouvelleEntree: function () { return { id: uid("passif"), name: "", desc: "", mode: "plain", acquis: false }; }
    });
  }
