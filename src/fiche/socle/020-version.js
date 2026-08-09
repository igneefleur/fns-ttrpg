  // ---------- version ----------
  // RELEASE est ce qu'on montre, SCHEMA est ce qui compte. Les deux sont
  // désormais INDÉPENDANTS : le schéma est un entier libre, que rien ne
  // déduit du majeur de la release, et le manifeste les publie séparément.
  // Un mod qui ferait parseInt(Jjk.version) pour en tirer le schéma se
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
  // site il est. Il ne change PAS le rang : « 3.6.0b » et « 3.6.0 » sont de
  // même version, parce que la beta est ce que le site stable recevra à la
  // fusion (JjkMods.compareVersions tient cette règle).
  var RELEASE = "3.6.0b";
  var SCHEMA = 3;

  var XP_CREATION = 500;      // xp de départ (le total reste modifiable)
  // Les deux barèmes de la création. Ce ne sont plus des murs : le bloc
  // Création des Options les décale ou les remplace, fiche par fiche (et pour
  // le plafond, caractéristique par caractéristique).
  var PTS_CREATION = 120;     // points de caractéristiques à la création
  var CARAC_MAX = 80;         // plafond d'une caractéristique
  var CARAC_PAS = 5;          // +5 par achat d'xp
  var MOD_PAS = 5;            // tous les modificateurs se règlent de 5 en 5
  var QUART = 4;              // « pas plus d'un quart de l'xp total »

  var ABBR = { Mind: "MIND", Body: "BODY", Prestance: "PRES" };

  // LE DÉ DES JETS DE TEST, écrit comme les règles le disent et comme Roll20
  // le comprend : « 96+ au dé est un coup critique, 5- au dé est un échec
  // critique ». cs> et cf< sont les annotations de critique de Roll20 : le
  // résultat s'y colore de lui-même dans le tchat, vert sur un critique et
  // rouge sur un échec critique, sans que la fiche ait à le calculer.
  var DE_DEFAUT = "1d100cs>96cf<5";

