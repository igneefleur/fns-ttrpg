  // ---------- la vitalité ----------
  // DEUX SPÉCIALITÉS QUE LE MOTEUR CHERCHE PAR LEUR NOM, et rien d'autre. Elles
  // vivent dans la liste des spécialités comme toutes les autres — ce module
  // n'en est qu'une seconde vue, plus courte, pour les avoir sous la main sans
  // dérouler tout le bloc.
  //
  //   ┌──────────────────────────────┐
  //   │ Vitalité                     │
  //   │                       VALEUR │
  //   │ PV                    [  12] │
  //   │ Récupération          [   4] │
  //   └──────────────────────────────┘
  //
  // LE NOM EST L'IDENTITÉ, ET C'EST FRAGILE. speParNom() apparie sur le nom mis
  // en minuscules et débarrassé de ses espaces de bordure — mais PAS de ses
  // accents. « Recuperation » n'est donc pas « Récupération », et un joueur qui
  // renomme sa ligne dans le bloc des Spécialités casse l'appariement d'un coup
  // de touche. Ce module écrit les noms tels que le moteur les cherche, et les
  // affiche tels quels : montrer « Récup. » ici et créer « Récupération » dans
  // la liste aurait fait deux choses de la même.
  //
  // UNE SEULE CASE, LA MÊME DANS LES DEUX MODES. Le bloc n'a donc PAS de
  // rouage : il ne montre rien de plus en construisant qu'en jouant, et un
  // rouage qui ne change rien est un bouton qui ment.
  var VITALES = [
    { nom: "PV", aide: "Points achetés dans la spécialité « PV »" },
    { nom: "Récupération", aide: "Points achetés dans la spécialité « Récupération »" }
  ];

  // La spécialité vivante, et rien de capturé : la liste se réordonne au
  // glisser-déposer, et un objet retenu au montage cesserait d'être celui que
  // le moteur lit.
  //
  // ELLE NAÎT AU PREMIER POINT, jamais au montage. Poser ces deux spécialités
  // dans l'état à la seule ouverture de la fiche écrirait chez des personnages
  // qui n'y ont jamais touché, et les ferait reparaître à chaque montage chez
  // qui les aurait retirées — un bloc qu'on ne peut pas vider.
  function speVitale(nom, creer) {
    var s = speParNom(nom);
    if (s || !creer) return s;
    s = blankSpe(nom);
    state.specialites.push(s);
    // LES DEUX LISTES QUI LA MONTRENT DOIVENT LA VOIR. Ni l'une ni l'autre ne
    // se refait toute seule : la liste de la Fiche a son rebâti, le bloc
    // d'Options le sien. Sans eux, la ligne neuve reste invisible jusqu'au
    // prochain remontage, alors que son chiffre, lui, compte déjà.
    if (speFicheRebuild) speFicheRebuild();
    if (optSpesRebuild) optSpesRebuild();
    return s;
  }

  // UNE CASE À UN SEUL NŒUD, et c'est tout ce qui la sépare de caseSaisie :
  // celle-ci fabrique un texte pour le jeu et un champ pour l'édition, et
  // bascule de l'un à l'autre sous le rouage. Ici les deux modes montrent la
  // MÊME case, il faut donc un champ qui vive tout le temps.
  //
  // NI « pc-edit-only » NI « pc-edit-field » : ces deux classes ne veulent rien
  // dire hors d'un bloc à rouage, et la seconde grimerait le champ en texte
  // mort dès qu'un bloc voisin serait verrouillé.
  function vitaleCase(hote, lire, ecrire, aide) {
    var c = el("span", "c reglable");
    var i = el("input", "v pc-case-champ");
    i.type = "number";
    i.step = "1";
    i.min = "0";
    i.title = aide;
    i.addEventListener("input", function () {
      var v = parseInt(i.value, 10);
      if (isFinite(v)) { ecrire(v); refresh(); }
    });
    c.appendChild(i);
    hote.appendChild(c);
    // Le champ ne se réécrit JAMAIS sous les doigts : tant qu'il a le focus, ce
    // qu'on tape y reste tel quel.
    hooks.push(function () {
      if (document.activeElement !== i) i.value = lire();
    });
    return i;
  }

  function buildVitalite() {
    var b = block("Vitalité");

    // L'entête d'une seule colonne, sur le même squelette que le trio des
    // lignes : c'est ce qui garantit que le mot tombe en face des nombres.
    var tete = el("div", "pc-crow-top pc-caracs-tete");
    tete.appendChild(el("span", "sp"));
    var teteTrio = el("span", "pc-trio tete");
    var teteCase = el("span", "c");
    teteCase.appendChild(el("span", "k", "Valeur"));
    teteTrio.appendChild(teteCase);
    tete.appendChild(teteTrio);
    b.appendChild(tete);

    // DEUX LIGNES, CONNUES D'AVANCE. Rien ne s'ajoute ni ne se retire ici : pas
    // de rebâti, pas de registre local, pas de détour — chaque case pousse
    // directement dans le registre du module, qui vit aussi longtemps que lui.
    VITALES.forEach(function (def, i) {
      var row = el("div", "pc-crow" + (i % 2 === 1 ? " odd" : ""));
      var top = el("div", "pc-crow-top");
      // LE NOM EST FIXE, comme celui d'une compétence : il se lit, il ne
      // s'écrit pas. C'est dans le bloc des Spécialités qu'on le renomme — et
      // le renommer, ici comme là-bas, décroche la spécialité de sa formule.
      var nom = el("span", "nm", def.nom);
      nom.title = def.nom;
      top.appendChild(nom);
      var trio = el("span", "pc-trio");
      vitaleCase(trio,
        function () {
          var s = speVitale(def.nom, false);
          return s ? (s.pts || 0) : 0;
        },
        function (v) {
          var n = Math.max(0, Math.round(v));
          // ZÉRO NE CRÉE RIEN. Remettre à zéro une spécialité qui n'existe pas
          // n'est pas un achat : la faire naître pour porter un zéro laisserait
          // une ligne vide dans le bloc des Spécialités au premier passage du
          // curseur. Une spécialité DÉJÀ là, elle, reste à zéro comme une
          // langue sans point reste dans sa liste.
          var s = speVitale(def.nom, n > 0);
          if (s) s.pts = n;
        }, def.aide);
      top.appendChild(trio);
      row.appendChild(top);
      b.appendChild(row);
    });

    return b;
  }
