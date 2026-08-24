/* Pont d20 — s'exécute dans le MONDE PRINCIPAL de la page Roll20 (là où vit
 * window.d20 / window.Campaign, invisible depuis un content-script isolé). Injecté
 * par content-roll20.js dans la frame du haut via <script src=web_accessible>.
 *
 * Rôle : lire, créer et mettre à jour les Attributes « mia_* » d'un personnage, à la
 * demande de l'iframe du créateur (qui poste des messages vers window.top). Modèle
 * client confirmé par VTTES / Beyond20 / roll20-character-exporter-importer :
 *   Campaign.characters.get(id).attribs -> collection Backbone
 *     .models                 -> [{ get('name'|'current'|'max'), attributes, save() }]
 *     .create()               -> nouvel attribut (on remplit .attributes puis .save())
 *   attr.save({current,max})  -> persiste (Firebase) et synchronise à tous les joueurs.
 *
 * Écritures THROTTLÉES : Roll20 déconnecte / perd des écritures sur des rafales
 * (importateurs tiers insèrent un « Rest Time »). On écrit un attribut à la fois,
 * espacés, en file séquentielle.
 *
 * COPIE. Ce fichier existe DEUX FOIS, stable/roll20-page.js et
 * beta/roll20-page.js. Une seule des deux est jamais chargée : content-roll20.js
 * choisit l'adresse à l'exécution, et l'isolation est donc ici RÉELLE. Les deux
 * copies sont AUJOURD'HUI IDENTIQUES À L'OCTET, et c'est normal : ce pont ne
 * connaît pas le mode et n'a pas à le connaître. Il n'écrit que les Attributes
 * mia_* du personnage, que les deux parties se partagent de toute façon. La
 * séparation n'existe ici que pour laisser la partie de chantier changer son
 * pont sans toucher à celui qui tourne en partie.
 *
 * TOUTE CORRECTION DE SÛRETÉ DOIT ÊTRE APPLIQUÉE AUX DEUX COPIES. Les verrous
 * de ce fichier (window.__miaBridge, ecrivable(), lier()/liee() et sa table de
 * soixante-quatre places, le repli sur l'opener strictement réservé au popout,
 * l'ouverture forcée de la fiche du plateau et le « sûr » qu'elle seule donne,
 * et les trois verrous du ménage des attributs, qui est la seule opération
 * DESTRUCTRICE du dispositif) vivent désormais en double exemplaire : un
 * correctif posé d'un seul côté laisse le trou grand ouvert de l'autre, et
 * rien ne le signalera.
 * scripts/build_extension.py --verifie compare mécaniquement les deux copies.
 *
 * Le verrou window.__miaBridge est COMMUN aux deux copies, tout comme le
 * marqueur data-mia-bridge que pose content-roll20.js : deux ponts dans le même
 * monde principal écriraient chaque attribut deux fois et rempliraient la table
 * des liaisons deux fois plus vite. Ne jamais y faire entrer le mode.
 */
(function () {
  "use strict";
  if (window.__miaBridge) return;   // jamais deux ponts (écouteurs en double)
  window.__miaBridge = true;
