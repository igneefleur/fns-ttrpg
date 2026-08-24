  // ---------- le ménage des attributs du plateau ----------
  // Mesuré chez l'auteur : 82 attributs « mia_ » sur « Narration » pour 18
  // attendus. Deux causes, deux remèdes, et la SEULE opération destructrice de
  // ce fichier — donc la plus surveillée.
  //   - LES ÉTRANGERS. Une fiche de personnage MIA a été ouverte un jour sur ce
  //     personnage : sa carte d'attributs en produit une soixantaine (mia_pv,
  //     mia_state…). Elles n'ont rien à faire sur un plateau, alourdissent
  //     chaque lecture, et font passer le plateau pour un personnage.
  //   - LES HOMONYMES. Le pont lui-même en a fabriqué tant que la fiche de
  //     « Narration » n'était pas ouverte : la collection était vide, chaque
  //     écriture créait un doublon au lieu de mettre à jour l'existant.
  //
  // L'ORDRE N'EST PAS NÉGOCIABLE. On écrit D'ABORD la valeur retenue dans TOUS
  // les homonymes, on ne supprime qu'ENSUITE. Si une suppression échoue au
  // milieu, ce qui survit dit déjà la bonne chose ; l'ordre inverse pourrait
  // laisser un survivant porteur d'une valeur périmée, et le plateau reculerait
  // d'un tour sans que personne ne comprenne pourquoi.
  //
  // TROIS VERROUS.
  //   1. LE PERSONNAGE DU PLATEAU, ET LUI SEUL. narrId est choisi par le pont
  //      lui-même, d'après le nom ; aucun autre personnage n'est jamais touché,
  //      et surtout pas une fiche de joueur.
  //   2. JAMAIS LE DERNIER EXEMPLAIRE D'UN NOM « mia_narr_ » : c'est l'état du
  //      plateau, et une place perdue ne se retrouve pas. Le contrôle est refait
  //      JUSTE AVANT chaque suppression, sur la collection vivante, parce que
  //      les autres joueurs font le même ménage au même moment sur le même
  //      personnage partagé. Les étrangers, eux, se retirent jusqu'au dernier :
  //      ils ne portent aucun état de plateau, c'est même toute la raison de les
  //      retirer — leur appliquer ce verrou reviendrait à ne rien faire.
  //   3. UNE SUPPRESSION QUI ÉCHOUE ARRÊTE TOUT. Insister sur un serveur qui
  //      refuse (un joueur sans droit d'écriture, par exemple), c'est marteler
  //      Roll20 à chaque chargement de partie pour rien. On note où l'on s'est
  //      arrêté, et le plateau pourra le dire.
  //
  // Le ménage ne se fait qu'UNE FOIS PAR CHARGEMENT DE PAGE, et seulement quand
  // la lecture vaut vérité (« sur ») : sur une collection non peuplée, tout
  // paraîtrait absent et il n'y aurait rien à retirer — mais rien ne le dirait.
  // Repli si la page ne dit rien : le ménage garde alors TOUT, donc ne détruit
  // rien. Le préfixe n'est plus écrit ici — c'est le site qui le donne.
  var menageFait = false;     // une fois par chargement, pas une fois par lecture
  var menageRapport = null;   // ce qu'il a fait, transmis avec la lecture suivante

  // AUCUN « silent » ICI, contrairement aux écritures, et c'est un choix.
  // Pour Roll20, silencieux veut dire NE PAS PROPAGER (c'est exactement ce qui
  // rendait save() inopérant, voir plus haut) : une suppression silencieuse
  // resterait donc locale, l'attribut reviendrait au rechargement suivant, et
  // le ménage aurait l'air de marcher sans rien retirer. On accepte en échange
  // que Roll20 rafraîchisse la fiche de « Narration » — qui est ouverte, mais
  // hors champ, et qu'aucun joueur ne regarde — au plus une fois par
  // chargement de partie, puisque le ménage ne se fait qu'une fois.
  function detruit(m, ok, ko) {
    var fini = false;
    function fin(f, a) { if (fini) return; fini = true; f(a); }
    try {
      if (!m || typeof m.destroy !== "function") { fin(ko, "destroy absent"); return; }
      m.destroy({
        success: function () { fin(ok); },
        error: function (mm, rep) { fin(ko, texteReponse(rep)); }
      });
    } catch (e) {
      fin(ko, String((e && e.message) || e).slice(0, 120));
      return;
    }
    setTimeout(function () { fin(ko, "aucune reponse"); }, 4000);
  }
  function encoreLa(ch, m) {
    var ms = models(ch);
    for (var i = 0; i < ms.length; i++) { if (ms[i] === m) return true; }
    return false;
  }

  // CE QUI APPARTIENT AU PLATEAU EST DIT PAR LE SITE, jamais deviné ici.
  //
  // « tout mia_ qui n'est pas mia_narr_ est un reste de fiche » est un critère
  // NÉGATIF : gravé dans un paquet signé, il condamnerait tout nom que la page
  // du plateau se mettrait à écrire plus tard — et cette page, elle, change sans
  // signature. Le site envoie donc SES préfixes avec la demande de ménage, et
  // rien d'autre n'est jamais conservé. Sans cette liste, on ne détruit RIEN :
  // un ménage qui ne sait pas ce qu'il garde n'est pas un ménage.
  var menageGarde = null;   // liste de préfixes, donnée par la page du plateau
  function aMoi(n) {
    if (!menageGarde || !menageGarde.length) return true;   // on ne sait pas -> on garde
    for (var i = 0; i < menageGarde.length; i++) {
      if (n.indexOf(menageGarde[i]) === 0) return true;
    }
    return false;
  }
  function menagePlateau(ch) {
    if (menageFait) return;
    if (!ch || !narrId || ch.id !== narrId) return;   // VERROU 1
    menageFait = true;   // posé AVANT le travail : un échec ne doit pas le relancer
    var rap = { trouves: 0, etrangers: 0, doublons: 0, retires: 0 };
    var ms = models(ch), parNom = {}, noms = [], fusions = [], morts = [], i, n;
    for (i = 0; i < ms.length; i++) {
      n = attrVal(ms[i], "name");
      if (typeof n !== "string" || n.indexOf(PREFIX) !== 0) continue;
      rap.trouves++;
      if (!aMoi(n)) {
        rap.etrangers++;
        morts.push({ nom: n, m: ms[i], plateau: false });
        continue;
      }
      if (!parNom[n]) { parNom[n] = []; noms.push(n); }
      parNom[n].push(ms[i]);
    }
    for (i = 0; i < noms.length; i++) {
      var l = parNom[noms[i]];
      if (l.length < 2) continue;
      rap.doublons += l.length - 1;
      fusions.push(noms[i]);
      for (var k = 1; k < l.length; k++) morts.push({ nom: noms[i], m: l[k], plateau: true });
    }
    if (!fusions.length && !morts.length) { menageRapport = rap; return; }

    // Les étapes se déroulent UNE À UNE et espacées, comme les écritures du
    // plateau : Roll20 perd des écritures sur une rafale, et une rafale de
    // suppressions n'est pas moins brutale.
    //
    // « garde » retient l'exemplaire conservé pour chaque nom, « confirme » dit
    // si le serveur a accepté SA valeur. Les copies ne meurent qu'après ce oui.
    var garde = {}, confirme = {};
    // Pas d'attributs en argument : comme sauve(), c'est « m.save(null, …) » qui
    // envoie l'état que le set juste avant a posé dans le modèle.
    function sauveConfirme(m, nom) {
      try {
        if (!m || !m.save) return;
        m.save(null, {
          success: function () { confirme[nom] = true; },
          error: function () { confirme[nom] = false; }
        });
      } catch (e) { confirme[nom] = false; }
    }
    var etape = 0;
    function suite() { setTimeout(pas, WRITE_DELAY); }
    function pas() {
      if (etape < fusions.length) {
        var nom = fusions[etape++];
        // La valeur est relue MAINTENANT, jamais celle de l'inventaire : le
        // plateau écrit pendant ce temps-là, et une valeur d'il y a trois
        // secondes écraserait un jeton qu'on vient de pousser.
        var tous = findAllAttrs(ch, nom);
        if (tous.length > 1) {
          // Le DERNIER fait foi : c'est celui que readAll retient (elle parcourt
          // tout et laisse le dernier gagner), donc celui que le plateau montre.
          var d0 = tous[tous.length - 1];
          var data = { name: nom, current: str(attrVal(d0, "current")), max: str(attrVal(d0, "max")) };
          // ON RETIENT CELUI QU'ON GARDE, ET ON ATTEND SA CONFIRMATION. Les
          // copies ne seront détruites que si le serveur a dit « accepté » pour
          // lui : supprimer avant de savoir si la valeur conservée a pris, c'est
          // la perdre. On a passé la journée à découvrir qu'une écriture peut
          // être acceptée en mémoire et jamais persistée.
          garde[nom] = d0;
          for (var j = 0; j < tous.length; j++) {
            try {
              if (tous[j].set) tous[j].set(data, { silent: true });
              if (tous[j] === d0) { sauveConfirme(tous[j], nom); }
              else { sauve(tous[j], nom); }
            } catch (e) {}
          }
        }
        return suite();
      }
      var mort = morts[etape - fusions.length];
      etape++;
      if (!mort) { menageRapport = rap; return; }
      if (!encoreLa(ch, mort.m)) return suite();   // un autre joueur est passé avant
      if (mort.plateau) {
        // VERROU 2, EN DEUX TEMPS, parce qu'un seul ne suffisait pas.
        //
        // a. jamais le DERNIER exemplaire, recompté sur la collection VIVANTE
        //    juste avant la suppression, et non sur l'inventaire du début ;
        // b. et seulement si le serveur a CONFIRMÉ la valeur de celui qu'on
        //    garde. Sans ce second temps, deux joueurs qui rangent en même temps
        //    voient chacun deux exemplaires, en suppriment chacun un, et il n'en
        //    reste zéro : leur collection locale ignore encore la suppression de
        //    l'autre. La confirmation les sérialise sur le serveur, qui lui ne
        //    ment pas.
        if (findAllAttrs(ch, mort.nom).length < 2) return suite();
        if (confirme[mort.nom] !== true) {
          rap.attendus = (rap.attendus || 0) + 1;
          return suite();
        }
      }
      detruit(mort.m,
        function () { rap.retires++; suite(); },
        function (pourquoi) {                       // VERROU 3 : on s'arrête, on ne s'acharne pas
          rap.arret = mort.nom + " : " + pourquoi;
          menageRapport = rap;
        });
    }
    pas();
  }

