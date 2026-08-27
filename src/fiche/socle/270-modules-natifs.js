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
    // LES LANGUES SUIVENT LES COMPÉTENCES, dans la même colonne : ce sont des
    // spécialités passives de MEN, et on les lit après ce dont elles relèvent.
    { id: "langues",    titre: "Langues",           onglet: "fiche", colonne: "gauche", build: buildLangues },
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
    // ---- onglet Art ----
    { id: "arts",       titre: "Techniques et passifs", onglet: "art",  colonne: "seule",  build: buildArt },

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
    // TOUT CE QUI SE RÈGLE SUR UNE CARACTÉRISTIQUE, EN UN SEUL BLOC : son
    // plafond, son modificateur, sa limite, l'écart qu'elle impose aux
    // spécialités, ce qu'elle coûte. C'étaient cinq blocs, et cinq titres à
    // départager pour un seul et même geste ; ce sont cinq onglets dans un
    // bloc. La valeur, elle, ne se règle pas ici : elle a sa case Bonus sur la
    // fiche.
    //
    // « Réglages des caractéristiques » ET NON « Caractéristiques », pour la
    // raison écrite plus bas à propos des compétences : le titre du module se
    // lit dans le plan, dans Mia.liste() et sur sa carte, où deux
    // « Caractéristiques » seraient indiscernables. Le bloc, lui, s'intitule
    // court : il est dans l'onglet Options, on sait où on est.
    { id: "optcaracs",  titre: "Réglages des caractéristiques", onglet: "options", colonne: "gauche", build: buildOptCaracs },
    { id: "xpchamps",   titre: "XP par champ",      onglet: "options", colonne: "droite", build: buildXpChamps },
    // Création est à DROITE. La mesure qui l'y avait mise (139 px d'écart entre
    // les deux colonnes contre 12 une fois déplacé) ne vaut plus : elle datait
    // d'une gauche qui portait cinq blocs de caractéristiques et d'un Création
    // deux fois plus long — le plafond en est parti. REMESURÉ, au demi-écran et
    // sous Firefox : 1481 px à gauche contre 1231 à droite, soit 250 d'écart, et
    // c'est la GAUCHE qui dépasse. Le rééquilibrer demanderait d'envoyer à
    // droite un bloc court (« Jets » suffirait, à 70 px près) : ça ne se décide
    // pas dans un commentaire, et le bloc reste où il est en attendant. (Depuis,
    // la « Règle de l'écart » est venue à droite : l'écart est retombé à 153.)
    // Il tient d'ailleurs de l'xp autant que « XP par champ », son voisin.
    // À DROITE, et pour deux raisons qui vont ensemble. La première tient à ce
    // qu'il EST : un interrupteur qui suspend une règle pour tout le
    // personnage, quand la gauche porte les leviers qui décalent un seuil
    // caractéristique par caractéristique. La seconde est une mesure : la
    // gauche dépassait la droite de 250 px, elle n'en dépasse plus que 153.
    // LE MAXIMUM D'UNE RÉSERVE SE RÈGLE ICI, et plus dans son bloc de la Fiche :
    // c'est ce qui a permis aux deux réserves de perdre leur rouage.
    // DEUX MODULES ET NON UN : sur la Fiche, les PV et l'endurance se déplacent
    // et se coupent séparément ; leurs réglages font de même.
    { id: "optpv",      titre: "PV",                onglet: "options", colonne: "droite", build: buildOptPv },
    { id: "optendur",   titre: "Endurance",         onglet: "options", colonne: "droite", build: buildOptEndurance },
    { id: "ecartcoupe", titre: "Règle de l'écart",   onglet: "options", colonne: "droite", build: buildEcartRegle },
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
    { id: "optcomps",  titre: "Réglages des compétences", onglet: "options", colonne: "droite", build: buildOptComps },
    // UN BLOC À ELLES. Les spécialités partageaient la grille des compétences ;
    // elles ont maintenant leurs propres onglets, et il le fallait : leur liste
    // est OUVERTE, elle se rebâtit, et elles se nomment au lieu de porter un
    // sigle.
    //
    // L'ID DES COMPÉTENCES NE CHANGE PAS, et c'est délibéré : state.modActifs
    // garde à jamais un « false », que personne ne relit. Renommer l'id ferait
    // RÉAPPARAÎTRE allumé un bloc que le joueur avait coupé.
    { id: "optspes",   titre: "Réglages des spécialités", onglet: "options", colonne: "droite", build: buildOptSpes }
  ];
  modules = MODULES_NATIFS.slice();

