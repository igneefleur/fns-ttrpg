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
    { id: "caracs",       titre: "Caractéristiques", onglet: "fiche", colonne: "gauche", build: buildCaracs },
    { id: "effort",       titre: "Temps",            onglet: "fiche", colonne: "gauche", build: buildEffort },
    { id: "survie",       titre: "Survie",           onglet: "fiche", colonne: "gauche", build: buildSurvie },
    { id: "exposition",   titre: "Exposition",       onglet: "fiche", colonne: "gauche", build: buildExposition },
    { id: "pi",           titre: "PI",               onglet: "fiche", colonne: "gauche", build: buildPi },
    { id: "corps",        titre: "Corps",            onglet: "fiche", colonne: "gauche", build: buildCorps },
    // TROIS RÉSERVES, TROIS MODULES : même forme, mais on ne les lit pas au
    // même moment, et elles se déplacent — ou se coupent — l'une sans l'autre.
    { id: "pv",           titre: "PV",               onglet: "fiche", colonne: "milieu", build: buildPv },
    { id: "pe",           titre: "PE",               onglet: "fiche", colonne: "milieu", build: buildPe },
    { id: "pm",           titre: "PM",               onglet: "fiche", colonne: "milieu", build: buildPm },
    { id: "effondrement", titre: "Effondrement",     onglet: "fiche", colonne: "milieu", build: buildEffondrement },
    { id: "contenance",   titre: "Contenance",       onglet: "fiche", colonne: "milieu", build: buildContenance },
    { id: "desaction",    titre: "Actions",          onglet: "fiche", colonne: "droite", build: buildDesAction },
    { id: "comps",        titre: "Compétences",      onglet: "fiche", colonne: "droite", build: buildComps },
    // ---- onglet Art ----
    // Pleine largeur, seul de son onglet : une technique est une CARTE, avec
    // ses rangs, son coût et son effet. Elle vivait sous les huit blocs de la
    // Fiche, c'est-à-dire là où personne n'allait la chercher.
    { id: "techniques",   titre: "Techniques",       onglet: "art", colonne: "seule",  build: buildTechniques },
    // ---- onglet Équipement ----
    { id: "armes",        titre: "Armes",            onglet: "equipement", colonne: "gauche", build: buildArmes },
    { id: "charge",       titre: "Charge et contenance", onglet: "equipement", colonne: "droite", build: buildCharge },
    { id: "vetements",    titre: "Vêtements",        onglet: "equipement", colonne: "droite", build: buildVetements },
    { id: "bourse",       titre: "Bourse",           onglet: "equipement", colonne: "droite", build: buildBourse },
    { id: "inv",          titre: "Inventaire",       onglet: "equipement", colonne: "bas",    build: buildInv },
    // ---- onglet Bio ----
    // La prose, dans son propre onglet : ce qui se lit ne se met pas devant ce
    // qui se joue, et ces deux zones sont les seules de la fiche qu'on ne
    // consulte pas en combat. « bg » porte le nom de son champ d'état.
    { id: "bg",           titre: "Bio",              onglet: "bio", colonne: "gauche", build: buildBio },
    { id: "notes",        titre: "Notes",            onglet: "bio", colonne: "droite", build: buildNotes },
    // ---- onglet Options ----
    // Deux colonnes qui se répondent : à gauche ce qui touche aux valeurs et au
    // dispositif, à droite ce qui touche à la fiche et aux longues listes.
    { id: "jets",         titre: "Jets",             onglet: "options", colonne: "gauche", build: buildJets },
    { id: "actions",      titre: "Fiche",            onglet: "options", colonne: "droite", build: buildActions },
    { id: "modcaracs",    titre: "Réglages des caractéristiques", onglet: "options", colonne: "gauche", build: buildModCaracs },
    { id: "optcaps",      titre: "Réglages des capacités", onglet: "options", colonne: "droite", build: buildOptCaps },
    // les points de rupture DISPONIBLES, à forcer : un réglage, pas un geste de jeu
    { id: "rupture",      titre: "Rupture",          onglet: "options", colonne: "gauche", build: buildRupture },
    // « Affichage » n'existe que dans Roll20 ; son absence sur le site laisse
    // les deux colonnes à égalité.
    { id: "affichage",    titre: "Affichage",        onglet: "options", colonne: "gauche", build: buildAffichage, pour: affichagePresent },
    { id: "filtres",      titre: "Outils de filtre", onglet: "options", colonne: "droite", build: buildFiltres },
    { id: "mods",         titre: "Mods",             onglet: "options", colonne: "gauche", build: buildMods },
    { id: "modules",      titre: "Modules",          onglet: "options", colonne: "gauche", build: buildModules },
    // le titre dit ce que le bloc AFFICHE : « Compétences » le confondrait avec
    // celui de l'onglet Fiche, dans le plan comme partout où les modules se
    // nomment
    { id: "optcomps",     titre: "Réglages des compétences", onglet: "options", colonne: "droite", build: buildOptComps }
  ];
  modules = MODULES_NATIFS.slice();

