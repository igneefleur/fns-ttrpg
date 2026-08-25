  // La fiche expose UN objet public : c'est par là qu'un mod remplace un
  // module, change la disposition ou détourne un calcul. Elle n'exécute rien
  // d'elle-même. window.__miaModules est l'ANCIEN nom du MÊME objet : ce qui a
  // été écrit avant la 3.0.0 continue de marcher tel quel.
  window.Mia = {
    // Les deux annoncent ce qu'ils ont toujours annoncé, mais ils ne se
    // déduisent plus l'un de l'autre : version porte le suffixe de beta le
    // cas échéant, schema est un entier libre. Un mod qui tirerait le schéma
    // du majeur de la version se tromperait à la première divergence, et le
    // moteur de mods offre MiaMods.lireVersion pour ne pas avoir à découper
    // le numéro soi-même.
    version: RELEASE,
    schema: SCHEMA,
    enregistre: enregistre,
    ordonne: ordonne,
    // une COPIE de la description : personne ne remanie la table de l'extérieur
    liste: function () {
      return ordreModules().map(function (m) {
        return { id: m.id, titre: m.titre, onglet: m.onglet, colonne: m.colonne, actif: actif(m.id) };
      });
    },
    actif: actif,
    // l'interrupteur : couper un module le retire de la fiche sans rien
    // effacer (son coffre et ses données restent, il ne s'affiche plus)
    active: activeModule,
    // de quoi afficher l'état d'un module : ses pannes, sa muselière
    etat: function (id) {
      var e = etatModule(id);
      return { echecs: e.echecs, musele: e.musele, erreur: e.erreur,
               panne: e.panne, vide: e.vide, actif: actif(id) };
    },
    remonte: remount,
    // filtrer un calcul de la fiche (les neuf points de FILTRES_CONNUS)
    filtre: filtreCalcul,
    // bilan du dernier passage du moteur de mods, en COPIE : vide tant qu'il
    // n'a pas tourné. « actif » vient de l'état (l'interrupteur du joueur),
    // « etat » du moteur (ok, panne, attente, coupe, recent, refuse).
    mods: function () {
      return bilanMods.map(function (b) {
        return { id: b.id, nom: b.nom, actif: modActifDe(b.id), etat: b.etat,
                 message: b.message || "", empreinte: b.empreinte };
      });
    },
    // INTERNE, pour le moteur de mods : nommer le mod qu'il lance, afin que les
    // filtres enregistrés pendant son exécution portent SON id. Sans cet appel
    // ils reviennent tous à « mod », ce qui n'est faux que dans le journal.
    __proprietaire: function (id) {
      proprietaireCourant = id ? String(id) : PROP_MOD;
      // modEnExec ne vaut que PENDANT le lancement d'un mod : le moteur rend la
      // main avec null. C'est lui qui permet à enregistre() de marquer le module
      // au nom du mod qui l'a posé.
      modEnExec = id ? String(id) : null;
    },
    // INTERNE, pour les sondes. Le double tiret bas dit ce qu'il faut : ce
    // n'est pas le contrat public, la page Mods ne les nomme pas, et un mod qui
    // s'y appuie le fait à ses risques. Ils existent parce qu'une sonde qui
    // lirait les valeurs dans le DOM mesurerait la MISE EN FORME autant que le
    // calcul : « 30 » et « 30 m » se ressemblent trop pour juger d'un filtre.
    __calculs: {
      caracTotal: caracTotal, caracMod: caracMod, caracLim: caracLim,
      compPts: compPts, compPlafond: compPlafond, compXp: compXp,
      spePts: spePts, speXp: speXp, jetBonus: jetBonus,
      prestige: prestige, enduranceMax: enduranceMax, enduranceMalus: enduranceMalus,
      recupJour: recupJour, chargeMax: chargeMax,
      pvMax: pvMax, pvCourant: pvCourant, initiative: initiative,
      vitesse: vitesse, vitesseVal: vitesseVal,
      sautLong: sautLong, sautHaut: sautHaut,
      poidsPorte: poidsPorte, xpDepense: xpDepense
    },
    // le registre des filtres, à plat et en copie : nom, propriétaire, fautes
    __filtres: function () {
      var out = [];
      Object.keys(filtres).forEach(function (nom) {
        (filtres[nom] || []).forEach(function (f) {
          out.push({ nom: nom, prop: f.prop, echecs: f.echecs });
        });
      });
      return out;
    }
  };
  window.__miaModules = window.Mia;

