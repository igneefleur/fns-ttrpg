# La fiche de personnage, en morceaux

Ces fichiers sont les sources de `docs/javascripts/jjk-fiche.js`. L'ordre du collage est dans
`scripts/assemblage.plan`, avec ce que fait chaque morceau.

Le socle d'abord — l'amorce, l'état, les calculs communs, les entêtes et les
onglets — puis UN FICHIER PAR MODULE, rangé sous le nom de l'onglet où il
paraît : `fiche/`, `art/`, `equipement/`, `bio/`. `options/` porte ce qui sert
les modules sans en être un (les dialogues de réglage, les filtres, les jets).

## Ce ne sont pas des modules

C'est le point à comprendre avant d'ouvrir un seul de ces fichiers. Le code
est écrit dans une fonction anonyme unique, et le découpage a tranché dedans :
un morceau est un FRAGMENT, une suite de lignes, assemblée comme un
`#include`. Il n'est donc pas un fichier JavaScript valide isolément, et
`node --check` ne s'applique qu'au fichier ASSEMBLÉ, jamais à un morceau.

C'est le prix de la règle qui a présidé au découpage : le fichier produit doit
être identique à l'octet près à celui d'avant. Ce point d'appui acquis, les
fragments deviendront de vrais modules autonomes, un par un.

## Les trois règles pour ne rien casser

1. Le fichier servi ne s'édite plus. On modifie un morceau, puis on lance
   `python scripts/assembler.py`. Une publication réassemble d'elle-même
   (`scripts/release_fiche.py`) ; en ESSAI, elle refuse de conclure quand un
   fichier servi ne correspond plus à ses morceaux, parce que tout ce qu'elle
   juge ensuite — le numéro, le schéma, les archives — se lit DEDANS. Et la
   chaîne d'intégration, elle, vérifie sans jamais réparer : un dépôt où les
   deux divergent arrête le déploiement au lieu d'être rafistolé en silence.
2. La ligne vide est en tête de morceau, jamais en queue. Chaque fichier
   commence par la ligne vide qui le séparait du précédent. L'inverse aurait
   paru plus naturel, mais presque tous les éditeurs rognent les blancs de fin :
   ils mangeraient ce dernier saut de ligne, et deux sections se souderaient sans
   que rien ne le montre.
3. UTF-8 sans marque d'ordre des octets, fins de ligne LF. L'assembleur
   ramène tout en LF et retire une marque d'ordre des octets en tête de morceau,
   donc une extraction Windows ne peut pas fausser le résultat. Mais du texte qui
   n'est pas de l'UTF-8 est refusé sans être deviné.

## Si la vérification échoue

`--verifie` nomme le fichier, le premier octet différent, la ligne, la colonne,
les deux versions de la ligne, et le morceau source qui fournit cette ligne. Il
sait reconnaître les quatre pannes qui font perdre des heures : marque d'ordre
des octets, fins de ligne, saut de ligne final en trop, saut de ligne final
manquant. Lire son verdict avant de chercher.
