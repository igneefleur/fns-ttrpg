  // ---------- le contexte d'un module ----------
  // C'est TOUT ce qu'un module touche, natif comme mod. Les natifs ne s'en
  // servent pas (ils appellent les fonctions directement) mais ils le
  // REÇOIVENT : un mod qui reprend l'id de l'un d'eux dispose exactement du
  // même.
  //
  // Les libellés officiels des données du personnage : un mod nomme les choses
  // comme le reste de la fiche au lieu d'inventer son vocabulaire.
  var LIBELLES = {
    nom: "Nom", espece: "Espèce", age: "Âge", sexe: "Sexe", genre: "Genre",
    pv: "Points de vie", pe: "Points d'endurance", pm: "Points de mana",
    pi: "Points d'innocence", pr: "Points de repos", ps: "Points de satiété",
    ph: "Points d'hydratation", expo: "Exposition", effondrement: "Effondrement",
    charge: "Charge", acces: "Accès rapides", contenance: "Contenance",
    rupture: "Rupture", desAction: "Dés d'action",
    competence: "Compétence", rang: "Rang", total: "Total", groupe: "Groupe",
    technique: "Technique", arme: "Arme", geste: "Geste", parade: "Parade",
    reduction: "Réduction", degats: "Dégâts", portee: "Portée", seuil: "Seuil",
    vetement: "Vêtement", froid: "Froid", chaud: "Chaud", poids: "Poids",
    quantite: "Quantité", places: "Volume", description: "Description",
    argent: "Bourse", xpTotal: "XP total", de: "Dé des jets"
  };
  function contexte(m, reg) {
    var id = m.id;
    // LE PROPRIÉTAIRE EST LE MOD, PAS LE MODULE : un mod enregistre presque
    // toujours un module dont l'id diffère du sien, et attribuer le filtre au
    // module rendrait la purge inopérante puisque c'est le MOD que le joueur
    // refuse ou supprime.
    var prop = m.__mod || id;
    // Ce qu'un module installe DEPUIS un gestionnaire (un clic, longtemps après
    // le montage) doit rester à son nom. Sans cette enveloppe,
    // proprietaireCourant est retombé à « ? » et le filtre posé par le bouton
    // d'un mod refusé survit à son refus.
    function aNous(fn) {
      if (typeof fn !== "function") return fn;
      return function () {
        var avant = proprietaireCourant;
        proprietaireCourant = prop;
        try { return fn.apply(this, arguments); }
        finally { proprietaireCourant = avant; }
      };
    }
    var donnees = {
      // LIRE NE SALIT PAS : on rend un objet DÉTACHÉ plutôt que de ranger un
      // objet vide dans l'état au premier get(). Sinon tout module qui se
      // contente de lire laisse sa trace dans le personnage.
      get: function () {
        var d = state.modData && state.modData[id];
        return (d && typeof d === "object") ? d : {};
      },
      // La validation est IMMÉDIATE et l'erreur remonte AU MODULE : un objet
      // circulaire doit casser le module qui l'écrit, jamais la sauvegarde de
      // la fiche entière.
      set: function (o) {
        if (o === null || o === undefined) o = {};
        if (typeof o !== "object") throw new TypeError("ctx.donnees.set attend un objet.");
        JSON.stringify(o);
        if (!state.modData) state.modData = {};
        state.modData[id] = o;
      }
    };
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
      id: id,
      // Le numéro tel qu'il est, suffixe de beta compris : qui veut le lire
      // passe par OwdMods.lireVersion, seul endroit qui sache ce que vaut ce
      // suffixe. Le découper à la main rendrait « 0b » sur le dernier nombre.
      version: RELEASE,
      state: state,
      data: DATA,
      donnees: donnees,
      bloc: function (titre, opts) {
        return block(titre, null, (opts && opts.edition) ? id : null);
      },
      el: el,
      fld: function (libelle, champ) { return fld(libelle, champ); },
      surRafraichissement: function (fn) { if (typeof fn === "function") reg.push(fn); },
      rafraichir: refresh,
      enregistrer: save,
      reconstruire: remount,
      edition: function () { return isEdit(id); },
      // briques : tout ce qui prend un GESTE du joueur passe par aNous()
      texte: function (lire, ecrire, indication) { return textInput(lire, aNous(ecrire), indication, reg); },
      bouton: function (libelle, infobulle, action) { return miniBtn(libelle, infobulle, aNous(action)); },
      pas: function (lire, ecrire, pas) { return stepper(lire, aNous(ecrire), pas || 1, null, reg); },
      tuile: function (libelle, valeur, action) { return bigTile(libelle, valeur, aNous(action), reg); },
      ligneComp: function (idComp) {
        var c = compDe(idComp);
        return c ? compRow(c, false, { module: id, reg: reg }) : el("div", "pc-empty", "Compétence inconnue.");
      },
      filtre: puce,
      dialogue: function (titre, corps, valider) { return dialogue(titre, corps, aNous(valider)); },
      message: flash,
      // sorties (le destinataire reste celui que le joueur a fixé)
      jet: function (libelle, valeur, des) { doRoll(libelle, valeur, deDe(des || 1), true, des || 1); },
      auTchat: function (titre, champs) { sayChat(titre, champs); },
      boutonTchat: function (libelle, titre, champs) {
        return miniBtn(libelle, "Envoyer dans le tchat Roll20", function () {
          sayChat(titre, typeof champs === "function" ? champs() : champs);
        });
      },
      // calculs : tous dérivés, donc en lecture seule
      calculs: {
        caracTotal: caracTotal, caracXp: caracXp, creationDepense: creationDepense,
        limiteRangs: limiteRangs, compRangsComptes: compRangsComptes, techRangsComptes: techRangsComptes,
        compBonus: compBonus, compDes: compDes, compXp: compXp,
        pvMax: pvMax, peMax: peMax, pmMax: pmMax, piMax: piMax,
        prMax: prMax, psMax: psMax, phMax: phMax,
        charge: charge, accesRapides: accesRapides, contenance: contenance,
        expoMax: expoMax, effondrement: effondrement,
        poidsPorte: poidsPorte, desAction: desAction, ruptureMax: ruptureMax,
        xpDepense: xpDepense, courant: courant, maxDe: maxDe
      },
      // …et de quoi les CHANGER. Le propriétaire est figé ici, à la
      // construction du contexte, et c'est celui du MOD : un module qui pose
      // son filtre depuis un bouton, longtemps après son build, reste chez lui.
      filtreCalcul: function (nom, fn) { ajouteFiltre(nom, fn, prop); },
      fmt: { signe: sign, nombre: fmtP },
      champs: LIBELLES,
      abbr: function (carac) { return abbrCarac(carac); }
    };
  }
