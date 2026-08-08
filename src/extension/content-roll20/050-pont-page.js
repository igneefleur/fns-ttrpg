  // ---------- frame du haut : injecter le pont d20 dans le monde principal ----------
  // Marqueur DURABLE sur <html> : la balise <script> se retire à l'onload, un
  // getElementById laissait donc chaque need-bridge (une fiche ouverte de plus)
  // réinjecter un pont -> écouteurs en double -> écritures d'attributs en double.
  //
  // Le marqueur data-jjk-bridge est COMMUN aux deux copies, tout comme le
  // window.__jjkBridge du pont lui-même : c'est délibéré. Un marqueur qui
  // porterait le mode laisserait un utilisateur ayant basculé sans recharger sa
  // partie se retrouver avec DEUX ponts dans le monde principal : chaque save
  // écrit deux fois dans les Attributes, chaque has-sheet répond deux fois, et la
  // table des liaisons du pont, qui ne compte que soixante-quatre places, se
  // remplit deux fois plus vite. Le prix de ce choix : le pont déjà posé reste
  // celui de l'ancien mode jusqu'au rechargement de la page.
  //
  // L'adresse est écrite en toutes lettres, jamais assemblée : concaténée, elle
  // deviendrait invisible au contrôle de complétude comme à l'analyse statique
  // d'AMO, qui ne savent lire que des littéraux.
  function injectPageScript() {
    var root = document.documentElement;
    if (!root || root.hasAttribute("data-jjk-bridge")) return;
    root.setAttribute("data-jjk-bridge", "1");
    var s = document.createElement("script");
    s.id = "jjk-page-bridge";
    s.src = browser.runtime.getURL("@@partie@@/roll20-page.js");@@colonne:64@@// propre à cette copie
    s.onload = function () { this.remove(); };   // le listener reste actif, on retire la balise
    (document.head || root).appendChild(s);
  }

