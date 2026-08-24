/* Content script sur Roll20 : onglet « Fiche MIA » dans le dialogue d'un personnage,
 * qui monte la COQUILLE creator.html ; celle-ci affiche la fiche SERVIE PAR LE SITE
 * (roll20-fiche.html), toujours à jour sans re-signer l'extension. La fiche est
 * enregistrée dans les Attributes Roll20 du personnage (préfixe mia_), donc partagée à
 * tous les joueurs qui contrôlent ce personnage.
 *
 * Deux rôles selon la frame (le script tourne all_frames) :
 *  - FRAME DU HAUT (app.roll20.net/editor) : injecte roll20-page.js dans le MONDE
 *    PRINCIPAL (là où vit window.d20 / window.Campaign, invisible du content-script) ;
 *    ce page-script lit/écrit les attributs à la demande. C'est aussi elle qui pose
 *    le BOUTON DU PLATEAU dans la barre d'outils de Roll20 et le cadre du plateau
 *    de Narration, ancré à cette barre ou détaché.
 *  - FRAME DE LA FEUILLE (iframe du dialogue de perso) : pose l'onglet « Fiche MIA »
 *    entre « Feuille de personnage » et « Bio & Info ». Au clic : si le perso a déjà
 *    une fiche MIA -> monte l'iframe de la coquille ; sinon -> bouton « Créer fiche MIA ».
 *    SAUF sur le personnage « Narration », qui porte le plateau et pas un personnage :
 *    l'onglet ne s'y pose pas (voir estPlateau).
 *
 * Cas particulier : la fiche OUVERTE EN FENÊTRE SÉPARÉE (bouton popout ->
 * app.roll20.net/editor/character/<campagne>/<perso>/...). Roll20 y sert le MÊME
 * document que dans l'iframe du dialogue, mais directement en haut de fenêtre :
 * cette frame cumule alors les deux rôles (onglet + pont). Le tchat et le d20 de
 * la campagne restent dans la fenêtre qui a ouvert le popout : les jets y sont
 * relayés via window.opener (même origine), et le pont d20 se rabat sur le
 * Campaign de l'opener (voir roll20-page.js).
 *
 * La page distante (sous la coquille) dialogue DIRECTEMENT avec le page-script via
 * window.top (postMessage, réponses par ev.source) : ce content-script ne fait que
 * poser l'onglet, interroger has-sheet, et monter l'iframe avec le charId dans le hash.
 *
 * COPIE. Ce fichier existe DEUX FOIS, stable/content-roll20.js et
 * beta/content-roll20.js, et les DEUX sont déclarées au manifeste : un script de
 * contenu ne se charge pas à l'exécution (il faudrait un eval, refusé à la revue
 * Mozilla, ou l'import dynamique, absent du manifeste V2). Les deux copies sont
 * donc injectées dans chaque frame, et celle qui n'est pas du mode s'éteint sans
 * avoir rien fait : voir la garde, tout en bas du fichier. Ce qui appartient à
 * cette copie et à elle seule porte un commentaire en bout de ligne. Il y en a
 * trois, pas une de plus : tout le reste doit rester rigoureusement identique
 * d'un côté et de l'autre.
 *
 * RÉGLAGES. Ce fichier ne fait que LIRE le stockage, jamais écrire ailleurs que
 * dans la géométrie du plateau ; le popup est le seul poste d'aiguillage.
 * Il lit miaOff (éteinte : rien ne se réveille), miaBeta (quelle moitié parle),
 * miaNuit (« auto » | « jour » | « nuit », qui décide du n=1/0 envoyé aux pages
 * du site et de la couleur du cadre flottant) et l'interrupteur du plateau.
 * Tout cela se lit à la garde, tout en bas, où l'inventaire est détaillé.
 *
 * TOUTE CORRECTION DE SÛRETÉ DOIT ÊTRE APPLIQUÉE AUX DEUX COPIES. La liste
 * blanche du canal brut, le repli des sauts de ligne dans les commandes, le
 * relais vers l'opener et le canal « Prendre » vivent désormais en double
 * exemplaire : un correctif posé d'un seul côté laisse le trou grand ouvert de
 * l'autre, et rien ne le signalera. C'est le prix de cette structure, et il se
 * paie ici. scripts/build_extension.py --verifie compare mécaniquement les deux
 * copies hors des lignes marquées : le lancer après toute correction.
 */
// compat : Chrome expose `chrome.*`, Firefox `browser.*`.
if (typeof browser === "undefined") { var browser = chrome; }
(function () {
  "use strict";

  var IS_TOP = (function () { try { return window.top === window; } catch (e) { return true; } })();

