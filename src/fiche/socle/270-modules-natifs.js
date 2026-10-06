  // ---------- les modules natifs ----------
  // L'ordre de cette table EST l'ordre par défaut de la fiche : chaque module
  // tombe dans sa colonne, à la suite de ceux déjà déclarés pour elle.
  // buildTop, buildHead et buildEnvoi n'y sont pas : la barre d'outils,
  // l'en-tête et la barre d'envoi ne sont pas des modules, ils encadrent les
  // onglets et ne se déplacent pas.
  //
  // CETTE TABLE NE SE REMANIE JAMAIS : chaque mount() en repart
  // (modules = MODULES_NATIFS.slice()). Sans cette copie intacte, un mod qui
  // remplace un module natif le remplacerait pour toujours — même désinstallé,
  // la fiche n'aurait plus l'original à remettre.
  var MODULES_NATIFS = [
    // ---- onglet Fiche ----
    { id: "caracs",       titre: "CARACTÉRISTIQUES", onglet: "fiche", colonne: "gauche", build: buildCaracs },
    { id: "effort",       titre: "EFFORT ET TEMPS",  onglet: "fiche", colonne: "gauche", build: buildEffort },
    { id: "survie",       titre: "SURVIE",           onglet: "fiche", colonne: "gauche", build: buildSurvie },
    { id: "exposition",   titre: "EXPOSITION",       onglet: "fiche", colonne: "gauche", build: buildExposition },
    // TROIS RÉSERVES, TROIS MODULES : même forme, mais on ne les lit pas au
    // même moment, et elles se déplacent — ou se coupent — l'une sans l'autre.
    { id: "pv",           titre: "PV",               onglet: "fiche", colonne: "milieu", build: buildPv },
    { id: "pe",           titre: "PE",               onglet: "fiche", colonne: "milieu", build: buildPe },
    { id: "pm",           titre: "PM",               onglet: "fiche", colonne: "milieu", build: buildPm },
    { id: "mouvement",    titre: "MOUVEMENT",        onglet: "fiche", colonne: "milieu", build: buildMouvement },
    { id: "effondrement", titre: "EFFONDREMENT",     onglet: "fiche", colonne: "milieu", build: buildEffondrement },
    { id: "pi",           titre: "PI",               onglet: "fiche", colonne: "milieu", build: buildPi },
    { id: "pc",           titre: "PC",               onglet: "fiche", colonne: "milieu", build: buildPc },
    { id: "contenance",   titre: "CONTENANCE",       onglet: "fiche", colonne: "milieu", build: buildContenance },
    { id: "desaction",    titre: "ACTIONS",          onglet: "fiche", colonne: "droite", build: buildDesAction },
    { id: "attaque",      titre: "ARMES",          onglet: "fiche", colonne: "droite", build: buildAttaque },
    { id: "comps",        titre: "COMPÉTENCES",      onglet: "fiche", colonne: "droite", build: buildComps },
    { id: "recuperation", titre: "RÉCUPÉRATION",     onglet: "fiche", colonne: "droite", build: buildRecuperation },
    // ---- onglet Art ----
    // Pleine largeur, seul de son onglet : une technique est une CARTE, avec
    // ses rangs, son coût et son effet. Elle vivait sous les huit blocs de la
    // Fiche, c'est-à-dire là où personne n'allait la chercher.
    { id: "techniques",   titre: "TECHNIQUES",       onglet: "art", colonne: "seule",  build: buildTechniques },
    // ---- onglet Équipement ----
    { id: "inv",          titre: "INVENTAIRE",       onglet: "equipement", colonne: "bas",    build: buildInv },
    // ---- onglet Bio ----
    // La prose, dans son propre onglet : ce qui se lit ne se met pas devant ce
    // qui se joue, et ces deux zones sont les seules de la fiche qu'on ne
    // consulte pas en combat. « bg » porte le nom de son champ d'état.
    { id: "bg",           titre: "BIO",              onglet: "bio", colonne: "gauche", build: buildBio },
    { id: "avantages",    titre: "AVANTAGES",        onglet: "bio", colonne: "gauche", build: buildAvantages },
    { id: "notes",        titre: "NOTES",            onglet: "bio", colonne: "droite", build: buildNotes },
    // ---- onglet Options ----
    // Deux colonnes qui se répondent : à gauche ce qui touche aux valeurs et au
    // dispositif, à droite ce qui touche à la fiche et aux longues listes.
    { id: "jets",         titre: "JETS",             onglet: "options", colonne: "gauche", build: buildJets },
    { id: "actions",      titre: "FICHE",            onglet: "options", colonne: "droite", build: buildActions },
    { id: "modcaracs",    titre: "RÉGLAGES DES CARACTÉRISTIQUES", onglet: "options", colonne: "gauche", build: buildModCaracs },
    { id: "optcaps",      titre: "RÉGLAGES DES CAPACITÉS", onglet: "options", colonne: "droite", build: buildOptCaps },
    // les points de rupture DISPONIBLES, à forcer : un réglage, pas un geste de jeu
    { id: "rupture",      titre: "RUPTURE",          onglet: "options", colonne: "gauche", build: buildRupture },
    // « Affichage » n'existe que dans Roll20 ; son absence sur le site laisse
    // les deux colonnes à égalité.
    { id: "affichage",    titre: "AFFICHAGE",        onglet: "options", colonne: "gauche", build: buildAffichage, pour: affichagePresent },
    { id: "filtres",      titre: "OUTILS DE FILTRE", onglet: "options", colonne: "droite", build: buildFiltres },
    { id: "mods",         titre: "MODS",             onglet: "options", colonne: "gauche", build: buildMods },
    { id: "modules",      titre: "MODULES",          onglet: "options", colonne: "gauche", build: buildModules },
    // le titre dit ce que le bloc AFFICHE : « Compétences » le confondrait avec
    // celui de l'onglet Fiche, dans le plan comme partout où les modules se
    // nomment
    { id: "optcomps",     titre: "RÉGLAGES DES COMPÉTENCES", onglet: "options", colonne: "droite", build: buildOptComps }
  ];
  modules = MODULES_NATIFS.slice();

