  // ---- 22. Réglages des compétences ----
  // Le pendant des deux blocs précédents, compétence par compétence, et le seul
  // des trois à porter une BANDE D'ONGLETS : une compétence a quatre valeurs
  // dérivées, là où une caractéristique n'en a qu'une.
  //
  //   Bonus    ce qu'elle ajoute au jet
  //   Dés      combien de dés d'action elle laisse engager
  //   XP       ce que ses rangs ont coûté
  //   Rupture  ce que ses rangs ont engagé
  //
  // La liste est OUVERTE (le joueur nomme ses compétences) et FILTRÉE : le bloc
  // se rebâtit donc, et ses fonctions de rafraîchissement vivent dans un
  // registre à lui, `optHooks`, vidé à chaque passe — sinon chaque rebâti
  // fuirait des hooks qui pointent sur un DOM disparu.
  //
  // LES QUATRE ONGLETS SE REBÂTISSENT ENSEMBLE, et le rejeu final est
  // obligatoire : les appelants lancent refresh() PUIS le rebâti, donc les
  // fonctions fraîches naîtraient après la passe et les totaux resteraient
  // vides jusqu'au prochain geste.
  //
  // Ses variables de vue lui sont PROPRES (optFilter, optOnly) : on ne cherche
  // pas la même chose ici que dans l'onglet Fiche.
  function buildOptComps() {
    var b = block("Réglages des compétences");
    var tools = el("div", "pc-comp-tools");
    var l1 = el("div", "row");
    var search = champFiltre(function () { return optFilter; },
                             function (v) { optFilter = v; }, "Filtrer les compétences…",
                             function () { optCompsRebuild(); });
    if (search) l1.appendChild(search);
    if (l1.children.length) tools.appendChild(l1);
    var l2 = el("div", "row");
    var puce = el("span", "pc-chip", "Investies");
    puce.title = "N'afficher que les compétences où un rang ou un levier est posé.";
    puce.classList.toggle("on", optOnly);
    puce.addEventListener("click", function () {
      optOnly = !optOnly;
      puce.classList.toggle("on", optOnly);
      optCompsRebuild();
    });
    l2.appendChild(puce);
    tools.appendChild(l2);
    b.appendChild(tools);

    var bande = bandeOnglets(b);
    var B = boitesTable("compsLeviers");
    var rebatis = [];

    // Ce que les quatre onglets montrent, dans l'ordre de la vie d'une
    // compétence : ce qu'elle DONNE (bonus, dés), puis ce qu'elle COÛTE
    // (xp, rupture).
    function onglet(titre, aide, nom, mot, borne, auto, rendu) {
      bande.onglet(titre, aide, function (page) {
        var corps = el("div");
        page.appendChild(corps);
        function bati() {
          corps.innerHTML = "";
          var liste = compsVisibles();
          if (!liste.length) { corps.appendChild(el("div", "pc-empty", motVide())); return; }
          grilleLevier(corps, {
            cls: "levier",
            entete: ["Comp.", "Compétence"],
            lignes: liste.map(function (c) {
              return { cle: c.id, nom: c.nom || "Sans nom",
                       titre: (c.nom || "Sans nom") + " · " + (compGroupe(c) || "sans groupe") };
            }),
            rangee: function (hote, cls, ligne, i) {
              return rangeeNom(hote, cls, ligne.nom, i, ligne.titre);
            },
            lire: function (id) { return B.lire(nom, id); },
            ecrire: function (id, boite, v) { B.ecrire(nom, boite, id, v); },
            mot: mot, borne: borne,
            auto: function (id) { return auto(compDe(id)); },
            rendu: function (id) { return rendu(compDe(id)); },
            reg: optHooks
          });
        }
        bati();
        rebatis.push(bati);
      });
    }

    function compsVisibles() {
      var flt = filtreDe(optFilter);
      return state.comps.filter(function (c) {
        if (optOnly && !compInvestie(c)) return false;
        if (flt && pli(c.nom).indexOf(flt) < 0 && pli(c.groupe).indexOf(flt) < 0) return false;
        return true;
      });
    }
    function motVide() {
      var flt = filtreDe(optFilter);
      return !state.comps.length ? "Aucune compétence sur cette fiche."
        : flt ? "Aucune compétence ne correspond à la recherche."
              : "Aucune compétence investie : la puce « Investies » masque les autres.";
    }

    onglet("Bonus", "", "bonus", ["Bonus", "Bonus effectif au jet"], 999,
      function (c) { return compBonusAuto(c); },
      function (c) {
        if (!c) return { texte: "—", titre: "" };
        var rang = compRang(c), info = rangInfo(rang);
        return {
          texte: sign(compBonus(c)),
          zero: !rang && !levierRegleDe(lireComp("bonus", c.id)),
          titre: chaineTexteDe(lireComp("bonus", c.id),
                               "rang " + rang + " (" + (info.nom || "?") + ")",
                               sign(num(info.bonus, 0)))
        };
      });

    onglet("Dés", "", "des", ["Dés", "Dés d'action engageables"], 99,
      function (c) { return c ? num(rangInfo(compRang(c)).des, 0) : 0; },
      function (c) {
        if (!c) return { texte: "—", titre: "" };
        var rang = compRang(c);
        return {
          texte: fmtP(compDes(c)),
          zero: !compDes(c),
          titre: chaineTexteDe(lireComp("des", c.id), "rang " + rang + " :",
                               num(rangInfo(rang).des, 0))
        };
      });

    onglet("XP", "", "xp", ["Coût", "Coût effectif en xp"], 9999,
      function (c) { return compXpAuto(c); },
      function (c) {
        if (!c) return { texte: "—", titre: "" };
        return {
          texte: fmtP(compXp(c)),
          zero: !compXp(c),
          titre: chaineTexteDe(lireComp("xp", c.id),
                               "rangs pris jusqu'au rang " + compRang(c) + " :",
                               compXpAuto(c))
        };
      });

    onglet("Rupture", "", "rupture", ["Points", "Points de rupture engagés"], 99,
      function (c) { return compRuptureAuto(c); },
      function (c) {
        if (!c) return { texte: "—", titre: "" };
        return {
          texte: fmtP(compRupture(c)),
          zero: !compRupture(c),
          titre: chaineTexteDe(lireComp("rupture", c.id),
                               "rangs pris jusqu'au rang " + compRang(c) + " :",
                               compRuptureAuto(c))
        };
      });

    optCompsRebuild = function () {
      optHooks.length = 0;
      rebatis.forEach(function (f) { f(); });
      // Les fonctions qui viennent de naître n'ont pas été jouées par la passe
      // en cours : sans ce rejeu, les totaux restent vides jusqu'au geste
      // suivant, et le bloc a l'air cassé.
      for (var i = 0; i < optHooks.length; i++) {
        try { optHooks[i](); } catch (e) { /* une rangée fautive n'emporte pas le bloc */ }
      }
    };

    bande.montre(0);
    return b;
  }

