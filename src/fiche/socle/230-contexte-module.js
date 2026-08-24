  // ---------- le contexte d'un module ----------
  // C'est TOUT ce qu'un module touche, natif comme mod : le contrat public
  // décrit dans la page Mods. Les modules natifs de ce fichier n'en font pas
  // usage (ils appellent les fonctions directement), mais ils le reçoivent :
  // un mod qui reprend l'id de l'un d'eux dispose exactement du même.
  //
  // Les libellés officiels des données du personnage : un mod nomme les choses
  // comme le reste de la fiche au lieu d'inventer son vocabulaire.
  var LIBELLES = {
    nom: "Nom", espece: "Espèce", age: "Âge", sexe: "Sexe", genre: "Genre",
    pv: "PV", pvMax: "PV max", endurance: "Endurance",
    initiative: "Initiative", vitesse: "Vitesse", recup: "Récupération / jour",
    poids: "Poids porté", charge: "Charge maximale", prestige: "Prestige",
    xpTotal: "XP total", total: "Total", mod: "MOD", lim: "LIM",
    points: "Points", plafond: "Plafond",
    caracteristique: "Caractéristique", competence: "Compétence",
    specialite: "Spécialité",
    arme: "Arme", degats: "Dégâts", armure: "Armure",
    quantite: "Quantité", groupe: "Groupe", description: "Description",
    avantage: "Avantage", defaut: "Défaut", qualite: "Qualité",
    background: "Background", notes: "Notes", de: "Dé des jets de test"
  };
  function contexte(m, reg) {
    var id = m.id;
    // LE PROPRIÉTAIRE EST LE MOD, PAS LE MODULE. Un mod enregistre presque
    // toujours un module dont l'id diffère du sien (« lmod » qui pose
    // « bloc-journal ») : attribuer le filtre au module rendrait la purge
    // inopérante, puisque c'est le MOD que le joueur refuse ou supprime.
    // m.__mod est posé par enregistre() quand un mod tourne.
    var prop = m.__mod || id;
    // Ce qu'un module installe DEPUIS un gestionnaire (un clic, longtemps après
    // le montage) doit rester à son nom. Sans cette enveloppe, proprietaireCourant
    // est retombé à « ? » et le filtre posé par le bouton d'un mod refusé
    // survivait à son refus : c'est exactement le défaut que la contre-relecture
    // a rouvert.
    function aNous(fn) {
      if (typeof fn !== "function") return fn;
      return function () {
        var avant = proprietaireCourant;
        proprietaireCourant = prop;
        try { return fn.apply(this, arguments); }
        finally { proprietaireCourant = avant; }
      };
    }
    // le coffre privé du module, rangé dans state.modData[id] : il voyage avec
    // le personnage (bibliothèque, export JSON, Attributes Roll20)
    var donnees = {
      // LIRE NE SALIT PAS. L'ancienne version rangeait un objet vide dans
      // l'état au premier get() : tout module qui se contentait de lire
      // laissait sa trace dans le personnage, et un personnage qui n'a jamais
      // rien réglé se retrouvait avec autant d'entrées que de modules. On rend
      // un objet détaché ; c'est set() qui écrit, lui seul.
      get: function () {
        var d = state.modData && state.modData[id];
        return (d && typeof d === "object") ? d : {};
      },
      // La validation est IMMÉDIATE et l'erreur remonte AU MODULE. Un objet
      // circulaire doit casser le module qui l'écrit, jamais la sauvegarde de
      // la fiche : rangé tel quel, il ferait échouer le JSON.stringify(state)
      // du premier save() et le personnage entier cesserait de s'enregistrer.
      set: function (o) {
        if (o === null || o === undefined) o = {};
        if (typeof o !== "object") throw new TypeError("ctx.donnees.set attend un objet.");
        JSON.stringify(o);              // circulaire : l'erreur part au module
        if (!state.modData) state.modData = {};
        state.modData[id] = o;
      }
    };
    // puce de filtre, comme celles des modules Armes et Compétences
    function puce(libelle, lire, ecrire) {
      var c = el("span", "pc-chip", libelle);
      c.classList.toggle("on", !!lire());
      c.addEventListener("click", function () {
        ecrire(!lire());
        c.classList.toggle("on", !!lire());
        refresh();
      });
      reg.push(function () { c.classList.toggle("on", !!lire()); });
      return c;
    }
    return {
      // identité
      id: id,
      // Le numéro tel qu'il est, suffixe de beta compris : qui voudrait le
      // lire passe par MiaMods.lireVersion, seul endroit qui sache ce que
      // vaut ce suffixe. Le découper à la main ici rendrait « 0b » sur le
      // dernier nombre, et le majeur n'apprend RIEN du schéma.
      version: RELEASE,
      // données (en lecture : ce qui appartient au personnage appartient aux
      // modules natifs, un module ne le corrige pas dans le dos des autres)
      state: state,
      data: DATA,
      donnees: donnees,
      // structure
      // Le rouage d'édition est OPTIONNEL : ctx.bloc("Titre", { edition: true }).
      // Sans lui, un module qui n'a rien à éditer affichait quand même le
      // bouton, qui ne faisait que basculer un mode dont il ne se servait pas.
      // Le bloc reste repérable sans : monteModules pose data-module lui-même.
      bloc: function (titre, opts) {
        return block(titre, null, (opts && opts.edition) ? id : null);
      },
      el: el,
      fld: function (libelle, champ) { return fld(libelle, champ); },
      // cycle
      surRafraichissement: function (fn) { if (typeof fn === "function") reg.push(fn); },
      rafraichir: refresh,
      enregistrer: save,
      reconstruire: remount,
      edition: function () { return isEdit(id); },
      // briques. Tout ce qui prend un GESTE du joueur passe par aNous() : le
      // code appelé au clic doit rester attribué à son mod, sinon ce qu'il
      // installe alors n'a plus d'ayant droit et survit à son refus.
      texte: function (lire, ecrire, indication) { return textInput(lire, aNous(ecrire), indication, reg); },
      bouton: function (libelle, infobulle, action) { return miniBtn(libelle, infobulle, aNous(action)); },
      pas: function (lire, ecrire, pas) { return stepper(lire, aNous(ecrire), pas || 1, null, reg); },
      tuile: function (libelle, valeur, action) { return bigTile(libelle, valeur, aNous(action), reg); },
      ligneComp: function (carac, nom) {
        return compRow({ key: carac + "/" + nom, name: nom, carac: carac, custom: false },
                       false, { module: id, reg: reg });
      },
      filtre: puce,
      dialogue: function (titre, corps, valider) { return dialogue(titre, corps, aNous(valider)); },
      message: flash,
      // sorties (le destinataire reste celui que le joueur a fixé)
      jet: function (libelle, valeur) { doRoll(libelle, valeur, null, true); },
      auTchat: function (titre, champs) { sayChat(titre, champs); },
      boutonTchat: function (libelle, titre, champs) {
        return miniBtn(libelle, "Envoyer dans le tchat Roll20", function () {
          sayChat(titre, typeof champs === "function" ? champs() : champs);
        });
      },
      // calculs : tous dérivés, donc en lecture seule
      calculs: {
        caracTotal: caracTotal,
        caracMod: caracMod,
        caracLim: caracLim,
        compPts: compPts,
        compPlafond: compPlafond,
        spePts: spePts,
        spePlafond: spePlafond,
        jetBonus: jetBonus,
        prestige: prestige,
        pvMax: pvMax,
        pvCourant: pvCourant,
        enduranceMax: enduranceMax,
        enduranceMalus: enduranceMalus,
        recupJour: recupJour,
        initiative: initiative,
        vitesse: vitesse,
        poidsPorte: poidsPorte,
        chargeMax: chargeMax
      },
      // …et de quoi les CHANGER : un filtre reçoit la valeur calculée et rend
      // celle qu'il veut, pour toute la fiche. Le propriétaire est figé ici, à
      // la construction du contexte, et c'est celui du MOD : un module qui pose
      // son filtre depuis un bouton, longtemps après son build, reste chez lui,
      // et refuser le mod emporte bien le filtre.
      filtreCalcul: function (nom, fn) { ajouteFiltre(nom, fn, prop); },
      // mise en forme
      fmt: { signe: sign, nombre: fmtP },
      champs: LIBELLES,
      abbr: function (carac) { return caracInfo(carac).code || carac; },
      nomDe: function (carac) { return caracInfo(carac).nom || carac; }
    };
  }

