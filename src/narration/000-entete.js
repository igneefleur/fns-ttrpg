/* Plateau de Narration — le contenu du panneau flottant de Roll20.
 *
 * CE QUE C'EST. La table de narration, celle qu'on faisait avec de vrais
 * jetons posés dans un coin de la carte : la réserve du MJ à gauche, les
 * joueurs à droite, et des jetons qu'on pousse de l'un vers l'autre au fil de
 * la partie. Tout le monde voit le même plateau, en même temps.
 *
 * CE QUE CE N'EST PAS. Une comptabilité. Aucun jeton n'appartient à personne :
 * il est POSÉ quelque part, et c'est sa position qui dit à qui il est. Le
 * compte affiché sur chaque place est un calcul de géométrie, jamais une valeur
 * enregistrée. D'où l'absence totale de protocole d'échange : donner un point,
 * c'est le pousser, comme sur la table.
 *
 * OÙ VIT L'ÉTAT. Dans les Attributes d'un personnage Roll20 nommé
 * « Narration », que le MJ partage à tous les joueurs (c'est le seul objet de
 * la campagne où chacun a lecture ET écriture : un joueur ne peut pas lire la
 * fiche d'un autre joueur). Trois natures d'attributs, et trois seulement :
 *
 *   mia_narr_conf     la configuration (les places, les fonds en URL, la
 *                     donne), en JSON. Elle change rarement, et une seule
 *                     personne à la fois y touche : un seul attribut convient.
 *   mia_narr_pt_<id>  UN JETON, « x,y » en millièmes du plateau. Un attribut
 *                     par jeton, et x et y ENSEMBLE : plus fin serait deux
 *                     écritures pour un seul geste, plus gros ferait qu'un
 *                     joueur qui pousse son jeton écraserait le geste
 *                     simultané d'un autre (Roll20 n'a pas de transaction :
 *                     le dernier qui écrit gagne). Une valeur vide = jeton
 *                     retiré du plateau.
 *   mia_narr_bg_<id>  LE FOND D'UNE PLACE importé, en data: WebP. Son propre
 *                     attribut, et surtout pas un champ de mia_narr_conf :
 *                     changer un fond réécrirait sinon toute la configuration
 *                     de la table, donc les places et la donne de tout le
 *                     monde, pour une image. Vide = pas de fond importé.
 *
 * COMMENT ÇA PARLE À ROLL20. Par le pont d20 de l'extension, exactement comme
 * la fiche : postMessage vers window.top, réponses par ev.source. Le pont ne
 * laisse écrire que des attributs « mia_ », et lie une frame au premier
 * personnage qu'elle charge — cette page ne charge donc que « Narration », et
 * ne peut rien écrire ailleurs.
 *
 * FRAÎCHEUR. Le pont ne pousse rien de lui-même : le plateau redemande l'état
 * toutes les 1.2 s. Sur une table qui bouge trois fois par heure, personne ne
 * verra la différence avec du temps réel, et rien ne peut s'emballer.
 *
 * CE QUE VAUT UNE LECTURE. Roll20 ne peuple les Attributes d'un personnage qu'à
 * l'ouverture de sa fiche : le pont ouvre donc « Narration » lui-même, hors
 * champ, et dit avec chaque lecture si elle vaut vérité. Tant qu'elle ne vaut
 * rien, le plateau ne touche à rien — c'est la règle qui tient tout le reste.
 *
 * LA TRACE DE DÉPANNAGE EST ÉTEINTE, ET VOICI COMMENT LA RALLUMER. Elle écrivait
 * « [plateau MIA] … » dans la console à chaque lecture, c'est-à-dire deux fois
 * par seconde et chez chaque joueur pendant toute une partie. Elle a servi, elle
 * resservira, elle est intacte — mais sous condition. Pour la ralentir, au
 * choix :
 *
 *   - ajouter « #diag » à l'adresse du plateau. La coquille y pose déjà l'indice
 *     de nuit, l'adresse devient donc « …/roll20-narration.html#n=1&diag » ;
 *   - ou, dans la console du CADRE du plateau (celui de igneefleur.github.io,
 *     pas celui de Roll20) : localStorage.setItem("mia-plateau-diag", "1"),
 *     puis rouvrir le plateau. localStorage.removeItem("mia-plateau-diag")
 *     l'éteint. C'est le seul des deux qui survive à une réouverture.
 *
 * Par défaut, trace() ne dit RIEN : ni console, ni message vers la fenêtre du
 * haut.
 */
(function () {
  "use strict";
