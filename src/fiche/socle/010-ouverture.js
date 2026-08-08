/* Créateur de personnage JJK — onglet « Création » du site.
 *
 * Mise en page « dossier » transposée du créateur HxH : barre d'outils avec la
 * bibliothèque, feuille à largeur fixe, en-tête portrait + identité, compteurs
 * de budgets, onglets (Fiche / Art / Équipement / Bio / Options), colonnes,
 * valeurs cliquables pour lancer les jets, journal de jets flottant.
 * La Fiche a trois colonnes (caractéristiques | combat | compétences), tout
 * dans l'ordre Body, Mind, Prestance ; une ligne par compétence (nom | stade
 * en menu | total-jet). L'onglet Art porte la personnalisation : les
 * passifs d'une compétence et son art (au stade Artiste).
 * Chaque module éditable porte un rouage (mode édition par module) : la
 * construction du personnage est verrouillée hors édition, seuls les gestes
 * de jeu restent actifs (jets, tchat, PV, narration, quantités, notes).
 *
 * Le contenu des règles (caractéristiques, listes de compétences, stades,
 * vitesses, difficultés, blessures, courbes d'armes/armures, actions) vient de
 * jjk-creation.json, généré au build par hooks/jjk_creation.py depuis la page
 * de règles. Ce fichier porte la sémantique d'interface et les règles de
 * calcul prosaïques :
 *   - création : 120 points à répartir dans les 3 caractéristiques (0 à 80) ;
 *   - 500 xp à la création (total modifiable) ; 20 xp par stade de compétence
 *     (Non initié, Initié, Maitre, Expert, Artiste), 20 xp par +5 de
 *     caractéristique (limite 80 sans avantage) ; le stade Artiste (sans bonus
 *     propre) ouvre l'art et les passifs de la compétence : le passif
 *     original est inclus dans le stade, les suivants coûtent 20 xp pièce ;
 *   - pas plus d'un quart de l'xp total investi dans une seule compétence ;
 *   - PV max = (20 + Body) / 2 ; récupération Body/10 PV par jour ;
 *   - jet = 1d100 + caractéristique (+ bonus de stade pour une compétence) ;
 *     96+ au dé : coup critique ; 5 ou moins : échec critique.
 *
 * Persistance : localStorage « jjk-perso » (état), « jjk-cards » (cartes
 * calculées, _current = brouillon), « jjk-persos » (bibliothèque). Clés
 * préfixées jjk- : le site partage son origine avec le site HxH.
 *
 * Dans Roll20 (l'extension affiche roll20-fiche.html, servie par CE site),
 * javascripts/jjk-roll20-boot.js pose AVANT ce script :
 *   - window.__jjkLocalStorage : persistance -> Attributes Roll20 (via STORE) ;
 *   - window.__jjkRoll : les jets partent dans le tchat Roll20 ;
 *   - window.__jjkCompact : masque la barre d'outils et la bibliothèque.
 */
(function () {
  "use strict";

  var COMPACT = typeof window !== "undefined" && window.__jjkCompact === true;
  // Persistance : le localStorage du navigateur sur le site ; dans Roll20, la
  // page d'amorce pose window.__jjkLocalStorage (shim -> Attributes Roll20)
  // avant ce script. Les appels sont tous sous try/catch : STORE peut être nul
  // (stockage refusé par le navigateur) sans casser la fiche.
  var STORE = (typeof window !== "undefined" && window.__jjkLocalStorage) ||
              (function () { try { return window.localStorage; } catch (e) { return null; } })();
  var DATA = null;
  var state = null;

