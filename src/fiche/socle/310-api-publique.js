  // ---------- l'objet public ----------
  // La fiche expose UN objet : c'est par là qu'un mod remplace un module,
  // change la disposition ou détourne un calcul. Elle n'exécute rien
  // d'elle-même. window.__owdModules est un ALIAS du MÊME objet.
  window.Owd = {
    // Les deux ne se déduisent pas l'un de l'autre : version porte le suffixe
    // de beta le cas échéant, schema est un entier libre. Un mod qui tirerait
    // le schéma du majeur de la version se tromperait à la première
    // divergence ; OwdMods.lireVersion existe pour ne pas avoir à découper le
    // numéro soi-même.
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
    active: activeModule,
    etat: function (id) {
      var e = etatModule(id);
      return { echecs: e.echecs, musele: e.musele, erreur: e.erreur,
               panne: e.panne, vide: e.vide, actif: actif(id) };
    },
    remonte: remount,
    filtre: filtreCalcul,
    // bilan du dernier passage du moteur, en COPIE : vide tant qu'il n'a pas
    // tourné. « actif » vient de l'état (l'interrupteur du joueur), « etat » du
    // moteur (ok, panne, attente, coupe, recent, refuse).
    mods: function () {
      return bilanMods.map(function (b) {
        return { id: b.id, nom: b.nom, actif: modActifDe(b.id), etat: b.etat,
                 message: b.message || "", empreinte: b.empreinte };
      });
    },
    // INTERNE, pour le moteur de mods : nommer le mod qu'il lance, afin que les
    // filtres enregistrés pendant son exécution portent SON id.
    __proprietaire: function (id) {
      proprietaireCourant = id ? String(id) : PROP_MOD;
      // modEnExec ne vaut que PENDANT le lancement d'un mod : le moteur rend la
      // main avec null. C'est lui qui permet à enregistre() de marquer le
      // module au nom du mod qui l'a posé.
      modEnExec = id ? String(id) : null;
    },
    // INTERNE, pour les sondes. Le double tiret bas dit ce qu'il faut : ce
    // n'est pas le contrat public, et un mod qui s'y appuie le fait à ses
    // risques. Ils existent parce qu'une sonde qui lirait les valeurs dans le
    // DOM mesurerait la MISE EN FORME autant que le calcul.
    __calculs: {
      caracTotal: caracTotal, compBonus: compBonus, compDes: compDes, compXp: compXp,
      pvMax: pvMax, peMax: peMax, pmMax: pmMax, piMax: piMax,
      prMax: prMax, psMax: psMax, phMax: phMax,
      charge: charge, accesRapides: accesRapides, contenance: contenance,
      expoMax: expoMax, effondrement: effondrement, effNiveauDe: effNiveauDe,
      poidsPorte: poidsPorte, accesPris: accesPris, contenancePrise: contenancePrise,
      desAction: desAction, ruptureMax: ruptureMax, ruptureDepense: ruptureDepense,
      xpDepense: xpDepense, courant: courant, maxDe: maxDe, autoDe: autoDe,
      confort: confort
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
  window.__owdModules = window.Owd;

