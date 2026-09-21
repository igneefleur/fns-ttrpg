/* Fiche de personnage Outward — page « Personnage » du site, et fiche de
 * l'extension Roll20 (la coquille signée sert docs/roll20-fiche.html, qui
 * charge ce bundle d'après docs/owd-manifeste.json).
 *
 * Mise en page « dossier », la même qu'en HxH et en JJK : barre d'outils avec
 * la bibliothèque (site seulement), feuille à largeur fixe, en-tête portrait +
 * identité + compteurs de budgets, onglets, colonnes, valeurs cliquables qui
 * lancent les jets dans le tchat Roll20.
 *
 * TROIS onglets, et pas un de plus :
 *   Fiche       les huit caractéristiques, les capacités dérivées (PV, PE, PM,
 *               PI, PR, PS, PH), l'exposition, l'effondrement, la rupture,
 *               TOUTES les compétences d'un coup, et les techniques ;
 *   Inventaire  armes et gestes, charge et contenance, vêtements, bourse, et
 *               l'inventaire illustré par groupes ;
 *   Options     les leviers du MJ (forçages et modificateurs), les réglages
 *               d'envoi, l'export/import, le plan des modules et les mods.
 *
 * Chaque bloc de la fiche est un MODULE : un id stable, un onglet, une colonne,
 * un build() qui RETOURNE son élément. C'est ce qui permet de le déplacer
 * (bloc Modules), de le couper, de le museler quand il jette, et à un mod de le
 * remplacer sans qu'on rouvre ce fichier.
 *
 * Chaque module éditable porte un rouage : la CONSTRUCTION du personnage est
 * verrouillée hors édition (rangs, achats, forçages, modificateurs, textes),
 * seuls les gestes de JEU restent actifs (jets, envois au tchat, jauges
 * courantes, quantités d'objets, bourse, contenance).
 *
 * LES RÈGLES NE S'AFFICHENT PAS. Pas de table de récupération, pas de table du
 * froid ni du chaud, pas de table des milieux, pas de barème de prix, pas de
 * table de l'effondrement. La fiche CALCULE avec elles ; les infobulles
 * décomposent le calcul, le DOM ne montre aucun barème. Seule exception : les
 * avertissements, qui disent l'ÉTAT du personnage (« PE MAX à zéro :
 * inconscient »), jamais une règle.
 *
 * Le contenu des règles (caractéristiques, rangs, capacités et leurs formules,
 * effondrement, climat, armes, types de dégâts) vient de owd-creation.json,
 * produit AU BUILD par hooks/owd_creation.py depuis docs/content/regles/. Rien
 * de ce qui est une valeur de règle ne s'écrit ici : les données viennent des
 * règles, jamais du code.
 *
 * Persistance : STORE (« owd-perso » l'état, « owd-cards » la carte calculée,
 * « owd-persos » la bibliothèque). Dans Roll20, owd-roll20-boot.js pose AVANT
 * ce script :
 *   - window.__owdLocalStorage : persistance -> Attributes Roll20 (via STORE) ;
 *   - window.__owdCompact : affichage condensé, pas de bibliothèque ;
 *   - window.__owdChat / __owdRoll / __owdSay / __owdTake / __owdPlayers :
 *     les SEULS canaux du pont. LE PAQUET EST SIGNÉ ET GELÉ : un message de
 *     plus coûterait une re-signature chez Mozilla, dont le quota est très
 *     serré. On compose donc les commandes ICI et on les passe telles quelles.
 */
(function () {
  "use strict";

  var COMPACT = typeof window !== "undefined" && window.__owdCompact === true;
  // Persistance : le localStorage du navigateur sur le site ; dans Roll20,
  // l'amorce pose window.__owdLocalStorage (shim -> Attributes Roll20) avant ce
  // script. Tous les appels sont sous try/catch : STORE peut être nul (stockage
  // refusé par le navigateur) sans casser la fiche.
  var STORE = (typeof window !== "undefined" && window.__owdLocalStorage) ||
              (function () { try { return window.localStorage; } catch (e) { return null; } })();
  var DATA = null;
  var state = null;

