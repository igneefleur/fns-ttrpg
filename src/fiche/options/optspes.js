  // ---- onglet Options : LES SPÉCIALITÉS, TOUT CE QUI SE RÈGLE ----
  // SON PROPRE BLOC, ET NON PLUS LA MOITIÉ DROITE DE CELUI DES COMPÉTENCES. Une
  // spécialité n'est pas une compétence : sa liste est OUVERTE, elle se nomme au
  // lieu de porter un sigle, et elle se rebâtit à chaque ajout.
  //
  // CINQ ONGLETS : Valeur, Plafond, Bonus, XP, Écart — le même ordre que les
  // deux autres blocs, « Valeur » à gauche de « Plafond ».
  //
  // SON PLAFOND NE MORD QUE S'IL EST RÉGLÉ, et c'est la seule différence avec
  // les deux autres blocs : les règles n'en donnent aucun à une spécialité. Le
  // nombre montré est celui qui mordrait, non celui qui mord.
  //
  // LE BONUS A SA CHAÎNE À LUI, et il ne pouvait pas entrer dans celle de la
  // valeur : il s'ajoute APRÈS le rabattage de l'écart, et l'y faire entrer
  // ferait rabattre la spécialité par son propre bonus.
  //
  // CE QUI N'A TOUJOURS PAS D'ONGLET : la CARACTÉRISTIQUE et la COMPÉTENCE.
  // Deux sélecteurs les portent déjà sur la ligne de la Fiche, et deux endroits
  // pour dire la même chose finissent par se contredire.
  function buildOptSpes() {
    var b = block("Spécialités");
    var bande = bandeOnglets(b);
    var B = boitesSpe();
    // LE REGISTRE EST CELUI DU SOCLE, « optSpesHooks », et surtout pas un
    // tableau à nous : refresh() ne joue que les registres qu'il connaît
    // (voir 150-refresh.js). Un tableau local recueillait bien les fonctions,
    // et PERSONNE ne les appelait — le bloc restait vide, sans une faute, sans
    // un message : les champs s'affichaient, aucun nombre n'y entrait jamais.
    //
    // LA LISTE EST OUVERTE : elle se rebâtit, donc le registre se remet à vide
    // AVANT qu'un seul champ ne s'y inscrive — sans quoi les fonctions des
    // lignes détruites rafraîchiraient des éléments qui ont quitté la page.

    // LA SPÉCIALITÉ SE PREND VIVANTE, jamais capturée au montage : la liste
    // bouge sous la ligne (ajout, suppression, glissement), et une référence
    // figée écrirait dans un objet que l'état ne porte plus.
    function vivante(i) {
      return function () { return (state.specialites || [])[i]; };
    }

    function lignes() {
      return (state.specialites || []).map(function (sp, i) {
        return { cle: i, index: i, spe: sp,
                 nom: sp.nom || "Sans nom",
                 titre: (sp.nom || "Sans nom") +
                        (sp.carac || sp.comp ? " — " + (sp.carac || "—") + " · " + (sp.comp || "—") : "") };
      });
    }

    function tab(titre, aide, nom, mot, borne, auto, rendu) {
      bande.onglet(titre, aide, function (p) {
        var corps = el("div");
        p.appendChild(corps);
        function bati() {
          corps.innerHTML = "";
          var liste = lignes();
          if (!liste.length) {
            corps.appendChild(el("div", "pc-empty", "Aucune spécialité."));
            return;
          }
          grilleLevier(corps, {
            cls: "levier",
            entete: ["Spé.", "Spécialité"],
            lignes: liste,
            rangee: function (hote, cls, ligne, i) {
              var row = rangeeNom(hote, cls, ligne.nom, i, ligne.titre);
              // LE NOM SE RELIT À CHAQUE PASSE : rangeeNom l'écrit une fois, et
              // renommer une spécialité ne rebâtit rien. Le bloc gardait donc
              // l'ancien nom jusqu'au prochain ajout ou retrait.
              var lab = row.querySelector(".pc-comp-label");
              if (lab) optSpesHooks.push(function () {
                var sp = (state.specialites || [])[ligne.index];
                if (!sp) return;
                var n = sp.nom || "Sans nom";
                if (lab.textContent !== n) lab.textContent = n;
                lab.title = n + (sp.carac || sp.comp
                  ? " — " + (sp.carac || "—") + " · " + (sp.comp || "—") : "");
              });
              return row;
            },
            lire: function (i) { return B.lire(nom, vivante(i)); },
            ecrire: function (i, boite, v) { B.ecrire(nom, boite, vivante(i), v); },
            mot: mot, borne: borne,
            auto: function (i) { return auto((state.specialites || [])[i]); },
            rendu: function (i) { return rendu((state.specialites || [])[i], i); },
            reg: optSpesHooks
          });
        }
        bati();
        rebatis.push(bati);
      });
    }
    // Les onglets se rebâtissent ENSEMBLE : une spécialité ajoutée apparaît
    // partout, pas seulement dans celui qu'on regarde.
    var rebatis = [];

    // ---------- Valeur ----------
    tab("Valeur", "", "valeur", ["Valeur", "Les points employés au jet"], 999,
      spePtsAuto,
      function (sp, i) {
        return { texte: String(spePts(sp)),
                 titre: chaineTexteDe(B.lire("valeur", vivante(i)), "points achetés :",
                                      (sp && sp.pts) || 0) };
      });

    // ---------- Plafond ----------
    // LA BASE VIENT DE SA COMPÉTENCE, et sans compétence du MOD de sa
    // caractéristique. Tant qu'aucune boîte n'est réglée, rien ne mord.
    tab("Plafond", "", "plafond", ["Plafond", "Plafond effectif des points"], 999,
      spePlafondAuto,
      function (sp, i) {
        var pose = sp ? spePlafondPose(sp) : false;
        return { texte: sp && pose ? String(spePlafond(sp)) : "—", zero: !pose,
                 titre: chaineTexteDe(B.lire("plafond", vivante(i)),
                                      sp && sp.comp ? "de " + sp.comp + " :"
                                                    : "de " + ((sp && sp.carac) || "—") + " :",
                                      sp ? spePlafondSocle(sp) : 0) };
      });

    // ---------- Bonus ----------
    // CE QUI S'AJOUTE APRÈS LE RABATTAGE DE L'ÉCART. La base est la case Bonus
    // de la ligne, sur la Fiche.
    tab("Bonus", "", "bonus", ["Bonus", "Bonus effectif"], 999,
      speBonusAuto,
      function (sp, i) {
        var b = speBonus(sp);
        return { texte: sign(b), zero: !b,
                 titre: chaineTexteDe(B.lire("bonus", vivante(i)), "de la Fiche",
                                      speBonusSocle(sp)) };
      });

    // ---------- XP ----------
    // Un point de spécialité coûte un QUART d'xp : le total est décimal, et
    // c'est voulu.
    tab("XP", "", "xp", ["Coût", "Coût effectif en xp"], 9999,
      speXpAuto,
      function (sp, i) {
        var xp = speXp(sp);
        return { texte: xp + " xp", zero: !xp,
                 titre: chaineTexteDe(B.lire("xp", vivante(i)), "points achetés :",
                                      speXpSocle(sp)) };
      });

    // ---------- Écart ----------
    // DERNIER ÉTAGE DE LA CASCADE : la base est l'écart de sa compétence, qui
    // tient lui-même celui de sa caractéristique. Sans compétence — et c'est
    // une réponse légitime — l'étage du milieu n'existe pas et la base est
    // celle de la caractéristique, directement.
    tab("Écart", "", "ecart", ["Écart", "Écart minimum effectif"], 9999,
      function (sp) { return ecartSpeAuto(sp); },
      function (sp, i) {
        var base = sp ? ecartSpeBase(sp) : 0;
        var mot = sp && sp.comp ? "de " + sp.comp + " :" : "de " + (sp && sp.carac ? sp.carac : "—") + " :";
        return { texte: String(sp ? ecartSpe(sp) : 0),
                 titre: chaineTexteDe(B.lire("ecart", vivante(i)), mot, base) };
      });

    // Le rebâti que la Fiche appelle quand la liste change.
    optSpesRebuild = function () {
      optSpesHooks.length = 0;
      rebatis.forEach(function (f) { f(); });
      // ET ON REJOUE CE QU'ON VIENT D'INSCRIRE. Les trois appelants (ajout,
      // retrait, glissement) lancent refresh() PUIS ce rebâti : les fonctions
      // fraîches naissent donc après la passe, et le bloc restait entièrement
      // vide — neuf champs sans un chiffre, sans même le filigrane — jusqu'à
      // la frappe suivante.
      for (var i = 0; i < optSpesHooks.length; i++) {
        try { optSpesHooks[i](); } catch (e) { /* la muselière jugera à la passe suivante */ }
      }
    };
    bande.montre(0);
    return b;
  }
