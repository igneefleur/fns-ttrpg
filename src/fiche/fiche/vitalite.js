  // ---------- la vitalité ----------
  // DEUX SPÉCIALITÉS QUE LE MOTEUR CHERCHE PAR LEUR NOM, et rien d'autre. Elles
  // vivent dans la liste des spécialités comme toutes les autres — ce module
  // n'en est qu'une seconde vue, plus courte, pour les avoir sous la main sans
  // dérouler tout le bloc.
  //
  //   ┌──────────────────────────────┐
  //   │ Vitalité                   ⚙ │
  //   │                       VALEUR │
  //   │ PV                    [  12] │
  //   │ Récupération          [   4] │
  //   └──────────────────────────────┘
  //
  // UNE SEULE COLONNE, LA MÊME DANS LES DEUX MODES — et c'est cela seul qui
  // distingue ce bloc de celui des Spécialités, dont la colonne « Valeur »
  // n'existe que sous le rouage et qui en montre trois autres à côté. Ici on
  // lit la valeur en jouant et on la règle en construisant, au même endroit.
  //
  // MAIS LE ROUAGE RESTE, parce que la valeur d'une spécialité S'ACHÈTE : c'est
  // de la construction, et toute la fiche la met sous le rouage. Un bloc qui
  // laisserait acheter des points en pleine partie serait le seul.
  //
  // LE NOM EST L'IDENTITÉ, ET C'EST FRAGILE. speParNom() apparie sur le nom mis
  // en minuscules et débarrassé de ses espaces de bordure — mais PAS de ses
  // accents. « Recuperation » n'est donc pas « Récupération », et un joueur qui
  // renomme sa ligne dans le bloc des Spécialités casse l'appariement d'un coup
  // de touche. Ce module écrit les noms tels que le moteur les cherche, et les
  // affiche tels quels : montrer « Récup. » ici et créer « Récupération » dans
  // la liste aurait fait deux choses de la même.
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

  function buildVitalite() {
    var b = block("Vitalité", null, "vitalite");

    // L'entête d'une seule colonne, sur le même squelette que le trio des
    // lignes : c'est ce qui garantit que le mot tombe en face des nombres.
    // UN SEUL MOT, ET NON DEUX : les colonnes des Langues changent de sens sous
    // le rouage — « Total » devient « Valeur » — parce qu'elles ne disent pas
    // la même chose selon le moment. Celle-ci dit la même en jouant et en
    // construisant, et un second mot aurait laissé croire le contraire.
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
      var v = caseSaisie(trio,
        function () {
          var s = speVitale(def.nom, false);
          return s ? (s.pts || 0) : 0;
        },
        function (n) {
          var pts = Math.max(0, Math.round(n));
          // ZÉRO NE CRÉE RIEN. Remettre à zéro une spécialité qui n'existe pas
          // n'est pas un achat : la faire naître pour porter un zéro laisserait
          // une ligne vide dans le bloc des Spécialités au premier passage du
          // curseur. Une spécialité DÉJÀ là, elle, reste à zéro comme une
          // langue sans point reste dans sa liste.
          var s = speVitale(def.nom, pts > 0);
          if (s) s.pts = pts;
        }, def.aide);
      top.appendChild(trio);
      row.appendChild(top);
      b.appendChild(row);

      // EN JOUANT ON LIT CE QUE LA SPÉCIALITÉ VAUT, en construisant ce qu'on y
      // a MIS — et les deux ne sont pas le même nombre dès qu'un levier de
      // l'onglet Options s'interpose. Le champ montre donc la base achetée, le
      // texte le résultat de la chaîne, et la teinte dit qu'ils diffèrent :
      // c'est le geste de toute la fiche.
      hooks.push(function () {
        var s = speVitale(def.nom, false);
        var pts = s ? (s.pts || 0) : 0;
        var vaut = s ? spePts(s) : 0;
        v.txt.textContent = String(vaut);
        v.txt.classList.toggle("adj", vaut !== pts);
      });
    });

    return b;
  }
