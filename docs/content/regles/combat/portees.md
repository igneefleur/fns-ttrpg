# Portées

Le combat se joue sur une grille dont **chaque case vaut un mètre**, et une case ne
porte qu'une personne de taille normale. La distance entre deux combattants se compte
donc en cases pleines : deux adversaires sur des cases voisines sont à une case l'un
de l'autre, torses écartés d'un mètre.

La case 0 est la case du combattant lui-même. Elle ne contient une cible que si
quelque chose se trouve **sur lui** : une créature agrippée à son bras, une entrave à
trancher, une partie de son propre corps, ou un adversaire entré dans sa case par une
saisie. Hors de ces cas, la colonne reste vide, et c'est normal.

## Mesurer une portée

La portée d'une arme est un rayon, mesuré depuis le torse de son porteur. Elle
additionne l'allonge du bras tendu et la part de l'arme qui dépasse le poing — ou qui
dépasse la **main avant** pour une arme à hampe, dont la prise décale le point d'appui.

<p class="formula">Portée = 0,70 m (bras tendu) + la part de l'arme qui dépasse le poing</p>

Les deux portées de deux adversaires ne s'additionnent jamais : pour toucher, il faut
atteindre le corps de l'autre, pas son poing. Seule compte la portée de celui qui
frappe.

La portée obtenue se convertit en cases par ces seuils. Ce sont des frontières, pas
des murs : une arme qui en chevauche une se range par son emploi le plus courant.

| Portée mesurée | Distance idéale |
| --- | :---: |
| moins de 0,70 m | case 0 |
| de 0,70 m à 1,20 m | 1 case |
| environ 1,20 m | 2 cases |
| environ 2,20 m | 3 cases |
| environ 3,20 m | 4 cases |
| environ 4,20 m | 5 cases |

## Le barème

Une arme frappe pleinement à sa distance idéale. Plus près, elle touche encore mais
mal ; plus loin, elle ne touche pas du tout. Cette asymétrie est le cœur de la règle :
une portée est une limite physique, pas une pénalité. C'est pourquoi aucune arme ne
subit de malus au-delà de sa distance, et pourquoi le vrai danger d'un combattant armé
long n'est pas qu'on l'attaque de loin, mais qu'on lui rentre dedans.

**Chaque case en dessous de la distance idéale coûte un cran**, sans plancher. Le pas
en avant n'entre pas dans ce calcul : se déplacer est une action, pas une indulgence
de portée.

Trois exceptions, et trois seulement.

**Arme courte qui blesse sans élan.** Aucune dégradation du tout : deux cases pleines
consécutives. Deux conditions doivent tenir ensemble — l'arme est tenue au poing ou
fixée au bras, assez courte pour travailler collée au corps ; et elle blesse sans que
le bras s'étende ni que le geste s'arme, par poussée, piqûre, pression, traction ou
crochet à bout portant. Le poing nu, le poing américain et le pied en sont exclus :
toute leur puissance vient de l'élan.

**Arme à deux mains qui frappe par rotation ample.** Deux crans par case au lieu d'un.
Le critère est l'amplitude, non la longueur ni le nombre de mains : les armes d'hast,
qu'on raccourcit en glissant les mains le long de la hampe, restent au barème de base.

**Portée idéale de quatre cases ou plus.** L'arme ne sert absolument plus au contact,
noté d'une croix.

## Table des portées

<div class="defs" markdown>

**0 :** l'arme est à sa distance, frappe pleine, aucun malus.

**−N :** l'arme touche encore, mais mal : N crans de malus.

**× :** trop près, l'arme ne sert plus du tout.

**— :** hors d'atteinte.

</div>

| Arme | 0 | 1 | 2 | 3 | 4 | 5 |
| --- | :---: | :---: | :---: | :---: | :---: | :---: |
| Lutte, étranglement | 0 | — | — | — | — | — |
| Morsure | 0 | — | — | — | — | — |
| Coudes, genoux, tête | 0 | — | — | — | — | — |
| Saisie, agrippement | 0 | 0 | — | — | — | — |
| Griffes, cestes lamés | 0 | 0 | — | — | — | — |
| Couteau, dague, poignard, tanto | 0 | 0 | — | — | — | — |
| Katar | 0 | 0 | — | — | — | — |
| Sai, jutte, tonfa | 0 | 0 | — | — | — | — |
| Poings, poing américain, cestes non lamés | −1 | 0 | — | — | — | — |
| Kukri, hachette | −1 | 0 | — | — | — | — |
| Faucille, serpe, kusarigama (côté faucille) | −1 | 0 | — | — | — | — |
| Pieds | −1 | 0 | — | — | — | — |
| Épée courte, gladius, wakizashi, machette | −2 | −1 | 0 | — | — | — |
| Épée d'armes, sabre, cimeterre | −2 | −1 | 0 | — | — | — |
| Hache à une main, masse, marteau | −2 | −1 | 0 | — | — | — |
| Gourdin, matraque | −2 | −1 | 0 | — | — | — |
| Bâton long, bô | −2 | −1 | 0 | — | — | — |
| Chaîne courte, fléau à une main, nunchaku | −2 | −1 | 0 | — | — | — |
| Rapière, estoc | −2 | −1 | 0 | — | — | — |
| Épée longue, épée bâtarde, katana | −4 | −2 | 0 | — | — | — |
| Épée à deux mains, espadon, nodachi | −4 | −2 | 0 | — | — | — |
| Hache à deux mains, hache danoise, maillet | −4 | −2 | 0 | — | — | — |
| Fléau d'armes à deux mains | −4 | −2 | 0 | — | — | — |
| Lance, épieu | −3 | −2 | −1 | 0 | — | — |
| Naginata, fauchard, guisarme | −3 | −2 | −1 | 0 | — | — |
| Hallebarde, bardiche, pertuisane | −3 | −2 | −1 | 0 | — | — |
| Trident | −3 | −2 | −1 | 0 | — | — |
| Kusarigama (côté chaîne) | −3 | −2 | −1 | 0 | — | — |
| Fouet | × | −3 | −2 | −1 | 0 | — |
| Chaîne longue lestée | × | −3 | −2 | −1 | 0 | — |
| Lance de cavalerie, couchée | × | −3 | −2 | −1 | 0 | — |
| Pique | × | −4 | −3 | −2 | −1 | 0 |

La table entière se régénère de tête à partir du barème et de ses trois exceptions :
une arme absente de la liste se place en mesurant sa portée, puis en descendant d'un
cran par case. C'est la contrainte qui a présidé à sa construction, et le meilleur
moyen d'y ajouter une arme sans la consulter.

## Ce que la table raconte

Chaque arme est une bande qui glisse vers la droite sans s'allonger : ce qu'elle gagne
en distance, elle le perd au contact. Le bord droit n'est qu'une banalité — je ne
t'atteins pas. Le bord gauche est le vrai sujet : tu es trop près et je ne peux plus
rien faire.

Le couteau est la seule arme qui ne se dégrade jamais en se rapprochant, et c'est toute
son identité ; son problème est entièrement de traverser la case où l'épée règne. Le
kusarigama, lui, n'est pas une exception mais deux armes reliées par une chaîne, chacune
suivant le barème ordinaire. Et la pique paie quatre cases d'effondrement pour une case
de domination : injouable en duel, redoutable en formation, où les rangs voisins couvrent
la zone morte que le piquier ne peut pas défendre.
