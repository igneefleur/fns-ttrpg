  // ---------- les modules natifs ----------
  // L'ordre de cette table EST l'ordre par défaut de la fiche : chaque module
  // tombe dans sa colonne, à la suite de ceux déjà déclarés pour elle.
  // buildTop, buildHead et buildEnvoi n'y sont pas : la barre d'outils,
  // l'en-tête et la barre d'envoi ne sont pas des modules, ils encadrent les
  // onglets et ne se déplacent pas.
  //
  // Cette table-ci ne se remanie JAMAIS : chaque mount() en repart (modules =
  // MODULES_NATIFS.slice()). Sans cette copie intacte, un mod qui remplace un
  // module natif le remplacerait pour toujours — même désinstallé, la fiche
  // n'aurait plus l'original à remettre. Un module déplacé se recopie donc
  // avant d'être touché (appliqueDisposition).
  var MODULES_NATIFS = [
    // ---- onglet Fiche ----
    // TROIS COLONNES INÉGALES : un quart, un quart, une moitié. Les deux listes
    // fermées — huit caractéristiques, huit compétences — tiennent dans un quart
    // parce qu'elles ne portent que trois nombres chacune ; les valeurs du corps
    // tiennent dans le deuxième. LA MOITIÉ EST AUX SPÉCIALITÉS : c'est la seule
    // liste OUVERTE de la fiche, la seule qui s'allonge sans fin, et la seule
    // dont chaque ligne porte cinq nombres, un nom libre et deux sigles.
    { id: "caracs",     titre: "Caractéristiques",  onglet: "fiche", colonne: "gauche", build: buildCaracs },
    // Les compétences suivent les caractéristiques, dans la même colonne : ce
    // sont deux listes de huit lignes, de la même forme, qu'on lit l'une après
    // l'autre — la compétence dit à quelle caractéristique elle emprunte.
    { id: "comps",      titre: "Compétences",       onglet: "fiche", colonne: "gauche", build: buildComps },
    // Initiative et récupération vont ensemble : deux valeurs qu'on relit, et
    // qui portent chacune le bouton qui en fait quelque chose.
    { id: "initiative", titre: "Initiative",        onglet: "fiche", colonne: "milieu", build: buildInitiative },
    { id: "recup",      titre: "Récup / jour",      onglet: "fiche", colonne: "milieu", build: buildRecup },
    // Vitesse, charge et les deux sauts partagent une grille de cases qui ne se
    // découpe pas : elles ne forment qu'UN module, même si chacune garde son
    // rouage.
    { id: "tuiles",     titre: "Corps",             onglet: "fiche", colonne: "milieu", build: buildVitesse },
    // DEUX RÉSERVES, DEUX MODULES : même forme, mais on ne les lit pas au même
    // moment, et elles se déplacent — ou se coupent — l'une sans l'autre.
    { id: "pv",         titre: "PV",                onglet: "fiche", colonne: "milieu", build: buildPv },
    { id: "endurance",  titre: "Endurance",         onglet: "fiche", colonne: "milieu", build: buildEndurance },
    // Les spécialités ont la colonne large POUR ELLES SEULES : cinq nombres,
    // un nom qu'on écrit, deux sigles à choisir et un filtre, sur une liste qui
    // n'a pas de fin. Elles étouffaient sous un tiers de feuille.
    { id: "specialites", titre: "Spécialités",      onglet: "fiche", colonne: "droite", build: buildSpecialites },
    // ---- onglet Équipement ----
    // PLUS D'ARMES NI D'ARMURES : les deux modules ont été retirés le
    // 25/08/2026. Ce qu'on porte se tient dans l'inventaire, qui pèse déjà.
    { id: "inv",        titre: "Inventaire",        onglet: "equipement", colonne: "bas",    build: buildInv },
    // ---- onglet Bio ----
    { id: "perso",      titre: "Personnalité",      onglet: "bio", colonne: "gauche", build: buildPerso },
    { id: "avantages",  titre: "Avantages",         onglet: "bio", colonne: "gauche", build: buildAvantages },
    { id: "bg",         titre: "Background",        onglet: "bio", colonne: "droite", build: buildBackground },
    { id: "notes",      titre: "Notes",             onglet: "bio", colonne: "droite", build: buildNotes },
    // ---- onglet Options ----
    // À GAUCHE, dans l'ordre de la Fiche : ce qui touche aux caractéristiques
    // d'abord (leurs modificateurs, puis où est parti l'xp), la création
    // ensuite, le jeu après, et les réglages d'affichage en bas.
    // L'onglet Options se lit en DEUX COLONNES QUI SE RÉPONDENT, du plus
    // employé au plus long :
    //   en tête, ce qu'on ouvre le plus souvent : les Jets à gauche, la Fiche
    //     (exporter, importer, réinitialiser) à droite ;
    //   au deuxième rang, les deux faces de l'xp, côte à côte : ce qu'on ajoute
    //     aux caractéristiques à gauche, où l'xp est parti à droite ;
    //   au milieu, les réglages courts, répartis pour que les deux colonnes
    //     arrivent à la même hauteur ;
    //   tout en bas, les deux longues listes, qui déroulent sans fin : les
    //     Modules à gauche, les Compétences à droite.
    // L'ordre de déclaration EST l'ordre d'affichage, colonne par colonne.
    { id: "jets",       titre: "Jets",              onglet: "options", colonne: "gauche", build: buildJets },
    { id: "actions",    titre: "Fiche",             onglet: "options", colonne: "droite", build: buildActions },
    // LES TROIS LEVIERS DU MENEUR, à gauche avec le reste de ce qui touche aux
    // caractéristiques. La valeur, elle, ne se règle plus ici : elle a sa case
    // Bonus sur la fiche.
    { id: "limcaracs",  titre: "Limite des caractéristiques", onglet: "options", colonne: "gauche", build: buildLimCaracs },
    { id: "modcaracs",  titre: "Modificateur des caractéristiques", onglet: "options", colonne: "gauche", build: buildModCaracs },
    { id: "ecartcaracs", titre: "Écart des spécialités", onglet: "options", colonne: "gauche", build: buildEcartCaracs },
    { id: "xpcaracs",   titre: "Coût en xp des caractéristiques", onglet: "options", colonne: "gauche", build: buildXpCaracs },
    { id: "xpchamps",   titre: "XP par champ",      onglet: "options", colonne: "droite", build: buildXpChamps },
    // Création passe à DROITE, et ce n'est pas un choix de goût : mesuré sous
    // Firefox, les deux longues listes du bas démarraient à 139 px d'écart avec
    // ce bloc à gauche, contre 12 px une fois déplacé. Il tient d'ailleurs de
    // l'xp autant que « XP par champ », son voisin du dessus.
    { id: "creation",   titre: "Création",          onglet: "options", colonne: "droite", build: buildCreation },
    { id: "filtres",    titre: "Outils de filtre",  onglet: "options", colonne: "droite", build: buildFiltres },
    // « Affichage » n'existe que dans Roll20 : à gauche, il y compense les deux
    // blocs de réglages que porte la droite, et son absence sur le site laisse
    // les deux colonnes à égalité.
    { id: "affichage",  titre: "Affichage",         onglet: "options", colonne: "gauche", build: buildAffichage, pour: affichagePresent },
    { id: "mods",       titre: "Mods",              onglet: "options", colonne: "gauche", build: buildMods },
    { id: "modules",    titre: "Modules",           onglet: "options", colonne: "gauche", build: buildModules },
    // le titre dit ce que le bloc AFFICHE : « Compétences » le confondait avec
    // celui de l'onglet Fiche, dans le plan comme partout où les modules se
    // nomment
    { id: "optcomps",   titre: "Modificateurs de compétences", onglet: "options", colonne: "droite", build: buildOptComps }
  ];
  modules = MODULES_NATIFS.slice();

