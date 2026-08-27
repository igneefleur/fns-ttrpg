  // ---------- version ----------
  // RELEASE est ce qu'on montre, SCHEMA est ce qui compte. Les deux sont
  // désormais INDÉPENDANTS : le schéma est un entier libre, que rien ne
  // déduit du majeur de la release, et le manifeste les publie séparément.
  // Un mod qui ferait parseInt(Mia.version) pour en tirer le schéma se
  // tromperait dès la première fois où les deux divergeront.
  //
  // Le SCHÉMA ne monte QUE lorsqu'une donnée EXISTANTE change de forme ou de
  // sens (renommage, fusion, déplacement, changement de type). Ajouter une
  // clé racine avec un défaut n'en est pas un : normalize() la complète et ne
  // purge aucune clé racine inconnue, donc une telle fiche s'ouvre dans les
  // deux sens sans migration. C'est ce qui permettra de livrer la disposition
  // des modules puis les mods sans forcer un 4.0.0 puis un 5.0.0.
  //
  // À l'inverse, une petite mise à jour (le Z de X.Y.Z) ne doit JAMAIS toucher
  // au format de l'état du personnage : c'est ce qui autorise une seule
  // archive par ligne X.Y, et c'est le seul garde-fou qui reste depuis que
  // l'écran de version ne paraît plus qu'au désaccord de schéma.
  //
  // Le suffixe « b » marque la branche beta, pour que le joueur voie sur quel
  // site il est. Il ne change PAS le rang : « 1.0.1b » et « 1.0.1 » sont de
  // même version, parce que la beta est ce que le site stable recevra à la
  // fusion (MiaMods.compareVersions tient cette règle).
  var RELEASE = "1.24.1b";
  var SCHEMA = 6;

  // ---------- ce que la fiche ne décide PAS ----------
  // Les barèmes du jeu ne sont plus ici : ils viennent de DATA, c'est-à-dire de
  // la page de règles relue au build par hooks/mia_creation.py. La table
  // « Valeur / MOD / LIM / XP cumulés » donne les vingt et une lignes déjà
  // calculées, le prestige donne le plafond, et les multiplicateurs de
  // l'initiative, de la vitesse, des sauts et de la récupération sont pêchés
  // dans les formules de la page. Aucun nombre de règle ne s'écrit dans ce
  // fichier — c'est la seule façon qu'une règle corrigée arrive à l'outil.
  //
  // LES REPLIS CI-DESSOUS NE SONT PAS DES RÈGLES : ce sont les valeurs qu'on
  // sert quand DATA manque (données trop anciennes, fetch expiré, fiche ouverte
  // hors ligne). Ils évitent une fiche qui ne s'ouvre pas ; ils ne prétendent
  // pas dire le jeu, et lire une règle ici serait une faute.
  var REPLI = {
    prestigeMax: 20,
    xpComp: 1, xpSpe: 0.25,       // ce que coûte un point de compétence, de spécialité
    speMarge: 50,                 // la marge sous la limite au-delà de laquelle on avertit
    // LES LANGUES. La page de règles n'en dit pas un mot : ni la
    // caractéristique dont elles relèvent, ni les seuils de leurs trois
    // niveaux. Ces deux-là sont donc posés ICI, faute de mieux — et le jour où
    // la page les dira, DATA prendra le dessus sans qu'on rouvre un fichier.
    langueCarac: "MEN",
    langueNiveaux: [100, 150, 200],
    endurAction: 50,              // endurance dépensable sur une même action
    iniMult: 2, iniMainsNues: 20,
    vitesseCarre: true, vitesseMult: 2,   // « AGI × AGI » ; le second ne sert que si la page repasse à « AGI × n »
    sautLong: 1.75, sautHaut: 2, recupMult: 2, recupEndurMult: 2
  };

  var MOD_PAS = 5;            // tous les modificateurs se règlent de 5 en 5
  // LA BORNE D'UN FACTEUR, et elle n'est pas celle d'un ajout. Les ajouts vont
  // jusqu'à 999 ou 9999 selon l'échelle du levier ; un facteur, lui, MULTIPLIE :
  // ×999 sur une limite de 1000 en ferait 999 000, ce qui ne veut rien dire. Cent
  // fois la valeur des règles est déjà au-delà de tout ce qu'une partie demande.
  var MULT_BORNE = 100;

  // LES PALIERS DE CHARGE. Leurs SEUILS se lisent dans les données (la table
  // « Charge / Effets » de la page) ; leurs EFFETS, eux, sont du code, parce
  // qu'une division par 1,5 ne se lit pas dans une phrase française. Les deux
  // doivent donc bouger ENSEMBLE : un palier ajouté à la page sans sa ligne ici
  // s'afficherait au joueur sans rien peser sur ses chiffres.
  //
  // Ils se CUMULENT : à 100 % de charge, l'esquive a pris −10, −40 puis −100,
  // et les sauts ont été divisés par 3 puis par 4.
  var CHARGE_EFFETS = {
    50:  { ini: -50,  esq: -10 },
    75:  { esq: -40,  vitesseDiv: 1.5, sautDiv: 3 },
    100: { esq: -100, vitesseDiv: 2, iniDiv: 2, sautDiv: 4 }
  };
  // La charge frappe « l'esquive », et l'esquive est une SPÉCIALITÉ que le
  // joueur nomme lui-même. On la reconnaît donc par son nom, à la casse près :
  // une fiche qui n'en porte pas ne subit simplement rien.
  var CHARGE_ESQUIVE = "Esquive";

  // LE DÉ DES JETS. Un jet MIA n'est pas un dé nu : c'est un couple
  // « 1d100 + bonus » et « la limite », dont Roll20 ne garde que le plus bas
  // (kl1). La limite plafonne donc le résultat, et le tchat l'affiche déjà
  // plafonné. Ce champ ne porte que la partie ALÉATOIRE ; jetExpr() bâtit le
  // reste autour d'elle.
  var DE_DEFAUT = "1d100";

  // LES DEUX SEUILS DU CRITIQUE : échec de 1 à 5, réussite de 96 à 100. Écrits
  // en marqueurs Roll20 (« cs> » la réussite critique, « cf< » l'échec), ils
  // font surligner le dé dans le tchat — c'est Roll20 qui les rend, la fiche ne
  // fait que les transporter.
  //
  // CES DEUX NOMBRES SONT ÉCRITS ICI, ET ILS NE DEVRAIENT PAS L'ÊTRE. Tout le
  // reste des chiffres du jeu vient de la page de règles, relue au build ; le
  // critique, lui, n'y est pas encore écrit. Le jour où la page le dira, ces
  // deux-là doivent partir dans DATA comme les autres — sans quoi une règle
  // corrigée dans le livre laisserait l'outil sur l'ancienne.
  var CRIT_REUSSITE = 96;
  var CRIT_ECHEC = 5;
  var CRIT_DEFAUT = "cs>" + CRIT_REUSSITE + "cf<" + CRIT_ECHEC;
  var DE_TEST_DEFAUT = DE_DEFAUT + CRIT_DEFAUT;

