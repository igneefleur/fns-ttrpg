  // ---- onglet Options : LES SPÉCIALITÉS, TOUT CE QUI SE RÈGLE ----
  // SON PROPRE BLOC, ET NON PLUS LA MOITIÉ DROITE DE CELUI DES COMPÉTENCES. Une
  // spécialité n'est pas une compétence : sa liste est OUVERTE, elle se nomme au
  // lieu de porter un sigle, et elle se rebâtit à chaque ajout.
  //
  // TROIS ONGLETS. « Valeur » n'était pas dans la demande, et il faut le dire :
  // sans lui, les points d'une spécialité — son forçage et ses deux décalages —
  // n'auraient plus d'interface DU TOUT. Ils ne sont pas sur la Fiche, qui ne
  // porte que les points achetés et le bonus.
  //
  // CE QUI N'A PAS D'ONGLET, ET POURQUOI :
  //   — le PLAFOND : les règles n'en donnent aucun à une spécialité. Ce qui en
  //     tient lieu est l'avertissement de l'en-tête quand l'écart se resserre ;
  //   — la CARACTÉRISTIQUE et la COMPÉTENCE : deux sélecteurs les portent déjà
  //     sur la ligne de la Fiche, et deux endroits pour dire la même chose
  //     finissent par se contredire ;
  //   — le BONUS : il s'ajoute APRÈS le rabattage de l'écart. L'entrer dans une
  //     chaîne de levier ferait rabattre la spécialité par son propre bonus.
  function buildOptSpes() {
    var b = block("Spécialités");
    var bande = bandeOnglets(b);
    var B = boitesSpe();
    // LA LISTE EST OUVERTE : elle se rebâtit. Le registre du rebâti est
    // REMPLACÉ à chaque fois, donc il se remet à vide AVANT qu'un seul champ ne
    // s'y inscrive — sans quoi les champs poussent dans l'ancien tableau, que
    // plus personne ne joue.
    var boites = [];

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
              return rangeeNom(hote, cls, ligne.nom, i, ligne.titre);
            },
            lire: function (i) { return B.lire(nom, vivante(i)); },
            ecrire: function (i, boite, v) { B.ecrire(nom, boite, vivante(i), v); },
            mot: mot, borne: borne,
            auto: function (i) { return auto((state.specialites || [])[i]); },
            rendu: function (i) { return rendu((state.specialites || [])[i], i); },
            reg: boites
          });
        }
        bati();
        rebatis.push(bati);
      });
    }
    // Les quatre onglets se rebâtissent ensemble : une spécialité ajoutée
    // apparaît partout, pas seulement dans celui qu'on regarde.
    var rebatis = [];

    // ---------- Valeur ----------
    tab("Valeur", "", "valeur", ["Valeur", "Les points employés au jet"], 999,
      spePtsAuto,
      function (sp, i) {
        return { texte: String(spePts(sp)),
                 titre: chaineTexteDe(B.lire("valeur", vivante(i)), "points achetés :",
                                      (sp && sp.pts) || 0) };
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
      boites.length = 0;
      rebatis.forEach(function (f) { f(); });
    };
    bande.montre(0);
    return b;
  }
