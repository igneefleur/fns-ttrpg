# Le plateau de Narration, en morceaux

Ces fichiers sont les sources de `docs/javascripts/mia-narration.js`. L'ordre du
collage est dans `scripts/assemblage.plan`, avec ce que fait chaque morceau.

## Ce ne sont pas des modules

C'est le point à comprendre avant d'ouvrir un seul de ces fichiers. Le plateau
est écrit dans une fonction anonyme unique, et le découpage a tranché dedans :
un morceau est un FRAGMENT, une suite de lignes, assemblée comme un `#include`.
Isolé, il n'est pas du JavaScript valide, ses accolades ne s'équilibrent pas, et
`node --check` n'a rien à y faire. La seule vérification qui vaille porte sur le
fichier ASSEMBLÉ :

    python scripts/assembler.py --verifie   # compare au dépôt, n'écrit rien
    python scripts/assembler.py             # réassemble docs/javascripts/mia-narration.js
    node --check docs/javascripts/mia-narration.js

C'est le prix de la règle qui a présidé au découpage : le fichier assemblé doit
être identique à l'octet près à celui d'avant. Le manifeste nomme ce fichier-là,
le chargeur le prend tel quel, et `docs/fiche/v*/` en fige des copies exactes qui
sont la mémoire des personnages déjà écrits. Un découpage purement mécanique, où
pas une espace n'a bougé, ne peut rien avoir cassé en chemin. Les vrais modules
autonomes viendront après, un par un, chacun sous sa propre vérification.

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
