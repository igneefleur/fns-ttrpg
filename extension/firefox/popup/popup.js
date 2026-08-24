/* Panneau de l'extension — le poste d'aiguillage.
 *
 * PARTAGÉ par les deux moitiés, et il doit le rester : c'est le SEUL endroit qui
 * écrive les réglages. Le dédoubler donnerait deux interrupteurs pour un seul
 * réglage, et le jour où les deux copies ne diraient pas la même chose, personne
 * ne saurait laquelle croire.
 *
 * CE QU'IL COMMANDE, dans l'ordre où on les rencontre :
 *   miaOff             l'interrupteur général      (absent = allumée)
 *   miaNuit            "auto" | "jour" | "nuit"    (absent = auto)
 *   miaPanneauActif    le plateau de Narration     (absent = allumé)
 *   miaBeta            la moitié beta              (absent = stable)
 *
 * LE MOT EST « BETA » DANS TOUT CE QU'UN JOUEUR LIT — le réglage et la pastille
 * comme les lignes du pied, qui le disaient déjà. « Mode de chantier » traînait
 * ailleurs alors que le mot était arrêté. Rien d'autre n'a bougé : la clé
 * miaBeta est déjà posée chez les joueurs et lue par les deux copies de
 * content-roll20.js, et l'identifiant p-chantier ne se lit que d'ici.
 *
 * CE QU'IL NE FAIT PLUS : repeindre quoi que ce soit selon le mode. L'ancien
 * panneau posait une classe « beta » sur le corps et le lien des règles virait
 * au jaune. Une interface qui change de couleur selon la moitié chargée fait
 * douter de ce qu'on lit, et la couleur ne portait aucune information que le mot
 * ne porte mieux. Il ne reste du mode qu'une pastille de texte et deux adresses
 * de lien qui changent.
 *
 * CE QU'IL N'ÉCRIT PLUS : les notices sous les réglages. Trois paragraphes
 * disaient ce que le libellé disait déjà, ou répétaient « prend effet au
 * rechargement » alors que le bouton de rechargement sort tout seul quand c'est
 * vrai. Ce qui ne se devine pas est passé en title=, le reste est parti.
 *
 * ES5 prudent : var, pas de fonction fléchée, pas de gabarit, pas de spread.
 * Une page d'extension sert des navigateurs qu'on ne choisit pas.
 */
// compat : Chrome expose `chrome.*`, Firefox `browser.*` (les deux rendent des promesses).
if (typeof browser === "undefined") { var browser = chrome; }
(function () {
  "use strict";

  var CLE_OFF = "miaOff";
  var CLE_NUIT = "miaNuit";
  var CLE_BETA = "miaBeta";

  // DEUX NOMS POUR UN SEUL INTERRUPTEUR DE PLATEAU, ET C'EST DÉLIBÉRÉ.
  //
  // La clé que les deux copies de content-roll20.js lisent réellement s'appelle
  // miaPanneauActif (PAN_ACTIF, ligne 555). Le contrat de la refonte, lui,
  // annonce « miaPanneau ». Les deux moitiés de ce chantier s'écrivent en
  // parallèle et ne se parlent pas : écrire l'un des deux noms au hasard, c'est
  // une chance sur deux que l'interrupteur du plateau ne fasse plus rien, et
  // personne ne s'en apercevrait avant une vraie partie, qui ne se joue pas ici.
  //
  // Le panneau écrit donc LES DEUX, et lit miaPanneauActif en premier parce que
  // c'est la valeur déjà posée chez les joueurs. Le jour où le nom retenu sera
  // tranché, la ligne de trop se retire en une minute ; l'inverse aurait coûté
  // une signature, qui se compte à la dizaine par jour.
  //
  // Aucune collision avec la géométrie : celle-ci est rangée sous
  // « miaPanneau:roll20-narration.html », et storage.local.get("miaPanneau") ne
  // rend que la clé exacte, jamais ce qui commence pareil.
  var CLE_PAN = "miaPanneauActif";
  var CLE_PAN_BIS = "miaPanneau";
  var CLE_PAN_GEO = "miaPanneau:roll20-narration.html";

  var CLE_DEP = ["mia_sheet_url", "mia_site_url"];

  // L'écho de la nuit, rangé dans le localStorage de CETTE page (et non dans
  // browser.storage, qui est asynchrone). Il ne sert qu'à peindre le premier
  // rendu ; miaNuit reste la seule autorité, et les deux se recalent dès que le
  // stockage a répondu.
  var CLE_ECHO = "miaNuitEcho";

  // ==========================================================================
  // 1. LA NUIT, AVANT TOUT LE RESTE
  //
  // Ces lignes s'exécutent pendant l'analyse de l'en-tête, donc avant que le
  // corps existe et avant le premier rendu. Elles ne touchent que la racine, qui
  // existe déjà. Tout ce qui a besoin du corps attend plus bas.
  // ==========================================================================

  function nuitVoulue(v) {
    if (v === "nuit") { return true; }
    if (v === "jour") { return false; }
    // « auto » : le thème du navigateur, lu en JavaScript plutôt qu'en media
    // query. Le résultat est le même, mais le réglage garde le dernier mot ;
    // avec une media query seule, « Jour » et « Nuit » ne voudraient rien dire.
    try {
      return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    } catch (e) { return false; }
  }
  function peint(v) {
    document.documentElement.classList.toggle("night", nuitVoulue(v));
  }
  function litEcho() {
    try {
      var v = localStorage.getItem(CLE_ECHO);
      return (v === "jour" || v === "nuit" || v === "auto") ? v : "auto";
    } catch (e) { return "auto"; }
  }
  function ecritEcho(v) {
    try { localStorage.setItem(CLE_ECHO, v); } catch (e) { /* mode privé : tant pis, un éclair */ }
  }
  peint(litEcho());

  // ==========================================================================
  // 2. L'ÉTAT, ET RIEN QUE L'ÉTAT
  // ==========================================================================

  var etat = {
    off: false,
    nuit: "auto",
    beta: false,
    panneau: true,
    depannage: []      // les clés de dépannage trouvées posées
  };
  var su = false;        // le stockage a-t-il répondu
  // CE QUE LE JOUEUR A DÉJÀ TOUCHÉ, et que la réponse du stockage ne doit plus
  // écraser : le panneau est cliquable avant que la lecture revienne.
  var touche = {};
  var fiches = { stable: null, beta: null };   // null : pas encore su
  var demandees = false; // les manifestes de site ont-ils déjà été demandés

  var REGLES = {
    stable: "https://igneefleur.github.io/fns-ttrpg/mia/content/regles/",
    beta: "https://igneefleur.github.io/fns-ttrpg/mia-beta/content/regles/"
  };
  var PAGE_EXT = {
    stable: "https://igneefleur.github.io/fns-ttrpg/mia/extension/",
    beta: "https://igneefleur.github.io/fns-ttrpg/mia-beta/extension/"
  };
  // LES NUMÉROS DES FICHES SE LISENT À LA SOURCE, jamais en dur.
  //
  // Ils étaient déclarés dans version.js, donc figés dans le paquet signé. Or
  // une fiche avance sans qu'on signe quoi que ce soit : le numéro de la fiche
  // stable est devenu faux en moins d'une heure, et il serait resté faux
  // jusqu'à la signature suivante. Le popup va donc les chercher dans les deux
  // manifestes de site, qui sont, eux, republiés à chaque déploiement.
  //
  // Aucune permission n'est nécessaire pour cela : GitHub Pages répond
  // « Access-Control-Allow-Origin: * », donc une simple lecture depuis une autre
  // origine passe. Élargir les permissions aurait fait réexaminer l'extension et
  // redemandé leur accord aux joueurs, pour deux nombres d'affichage.
  var MANIFESTES = {
    stable: "https://igneefleur.github.io/fns-ttrpg/mia/mia-manifeste.json",
    beta: "https://igneefleur.github.io/fns-ttrpg/mia-beta/mia-manifeste.json"
  };

  // ==========================================================================
  // 3. LE RESTE, QUAND LE CORPS EXISTE
  // ==========================================================================

  function demarre() {

    var $ = function (id) { return document.getElementById(id); };

    var elBody = document.body;
    var elEtatTxt = $("p-etat-txt");
    var elChantier = $("p-chantier");
    var elOff = $("p-off");
    var elOffTxt = $("p-off-txt");
    var elRecharge = $("p-recharge");
    var elNuit = $("p-nuit");
    var elPan = $("p-panneau");
    var elPanReplacer = $("p-pan-replacer");
    var elBeta = $("p-beta");
    var elFlash = $("p-flash");
    var elRegles = $("p-regles");
    var elMaj = $("p-maj");
    var elDepannage = $("p-depannage");
    var segs = elNuit ? elNuit.querySelectorAll(".seg") : [];

    // ---------------------------------------------------------------- rendu

    function marque(el, on) {
      if (el) { el.setAttribute("aria-checked", on ? "true" : "false"); }
    }

    function rendEtat() {
      elBody.classList.toggle("p-off", etat.off);
      elEtatTxt.textContent = !su ? "…" : (etat.off ? "Éteinte" : "Active");

      // LA SEULE MARQUE DE LA BETA : un mot. Pas une couleur, pas un fond, pas
      // un liseré. C'est l'exigence explicite de l'auteur, et elle vaut mieux
      // que ce qu'elle remplace : le jaune de l'ancien lien n'apprenait rien à
      // qui ne connaissait pas déjà le code couleur.
      elChantier.hidden = !etat.beta;

      marque(elOff, !etat.off);
      // Deux mots, et l'interrupteur à côté. Ce qu'une extinction ne peut PAS
      // défaire (le pont vit dans le monde principal, où aucun script de contenu
      // n'entre ; les écouteurs déjà posés sont anonymes et ne se retirent pas)
      // reste vrai et reste dit — en title=, sur le bouton, dans popup.html.
      elOffTxt.textContent = etat.off ? "Extension éteinte" : "Extension active";
    }

    function rendNuit() {
      var i;
      for (i = 0; i < segs.length; i++) {
        var on = segs[i].getAttribute("data-v") === etat.nuit;
        marque(segs[i], on);
        // Un seul segment est atteignable au clavier ; les flèches passent de
        // l'un à l'autre. C'est la façon dont un groupe de radios se parcourt,
        // et trois arrêts de tabulation pour un réglage seraient trois de trop.
        segs[i].tabIndex = on ? 0 : -1;
      }
    }

    function rendPieces() {
      marque(elPan, etat.panneau);
      marque(elBeta, etat.beta);
      // GRISER NE SUFFIT PAS. L'opacité et pointer-events arrêtent la souris et
      // rien d'autre : au clavier, ces trois boutons restaient dans l'ordre de
      // tabulation et se déclenchaient à la barre d'espace, sur un bloc que
      // l'écran donne pour hors service. disabled, lui, les sort de l'ordre de
      // tabulation ET les annonce désactivés aux lecteurs d'écran.
      elPan.disabled = etat.off;
      elBeta.disabled = etat.off;
      elPanReplacer.disabled = etat.off;
      elRegles.href = etat.beta ? REGLES.beta : REGLES.stable;
      elMaj.href = etat.beta ? PAGE_EXT.beta : PAGE_EXT.stable;
    }

    function rendDepannage() {
      if (!etat.depannage.length) { elDepannage.hidden = true; return; }
      elDepannage.hidden = false;
      // Nommer la clé, et dire ce qu'elle force. Oubliée en place, elle fait
      // afficher le site stable sous un onglet « Fiche MIA beta », et rien nulle
      // part ne l'annonce : ce panneau est le seul endroit qui puisse le dire
      // sans ouvrir une console.
      var mots = [], i;
      for (i = 0; i < etat.depannage.length; i++) {
        mots.push(etat.depannage[i].cle + " → " + etat.depannage[i].val);
      }
      elDepannage.textContent = "Clé de dépannage posée : " + mots.join(" ; ");
      elDepannage.title = "Elle remplace l'adresse du site quel que soit le mode.";
    }

    // ------------------------------------------------------- les cinq numéros

    // Le suffixe de la beta est posé À L'AFFICHAGE : la moitié beta se montre
    // avec un « b », la stable jamais, et le manifeste, lui, n'en porte aucun (le
    // même paquet sert les deux branches, un numéro suffixé y brûlerait un numéro
    // que la branche stable doit encore publier).
    //
    // Le « b » est retiré avant d'être remis, ce qui n'est pas un détour inutile :
    // l'outil de signature écrit aujourd'hui « 3.6.0b » pour la moitié beta, et
    // reprendre la valeur telle quelle marcherait, mais le jour où il écrirait le
    // numéro nu, une ligne resterait sans suffixe, et le jour inverse on lirait
    // « 3.6.0bb ». Les deux conventions donnent ici le même affichage.
    function numeroPartie(quel) {
      var v = (typeof PARTIES !== "undefined" && PARTIES) ? PARTIES[quel] : null;
      // Déclaration absente : « ? », jamais une ligne vide, qui se lirait comme
      // une extension cassée.
      if (typeof v !== "string" || v === "") { return "?"; }
      v = v.replace(/b+$/, "");
      return quel === "beta" ? v + "b" : v;
    }

    // Une ligne = trois cases (le libellé, le numéro, la marque). Les libellés
    // restent dans le HTML : le script n'écrit que ce qui change.
    function ligne(id) {
      var el = $(id);
      return {
        bloc: el,
        num: el ? el.querySelector(".num") : null,
        marque: el ? el.querySelector(".marque") : null
      };
    }
    var LIGNES = {
      ficheStable: ligne("p-l-fiche-stable"),
      ficheBeta: ligne("p-l-fiche-beta"),
      extStable: ligne("p-l-ext-stable"),
      extBeta: ligne("p-l-ext-beta"),
      paquet: ligne("p-l-paquet")
    };

    // LE NUMÉRO DU PAQUET RESTE EN VUE, les quatre autres se replient. Les
    // quatre disent QUAND chaque moitié a changé ; aucune ne dit ce qui est
    // installé, et c'est pourtant le seul numéro que Firefox et Chrome montrent
    // au joueur. Il occupait un cinquième d'une fenêtre qui n'avait pas encore
    // d'interrupteur ; il occupe maintenant une ligne, en haut du pied.
    try {
      var paq = browser.runtime.getManifest().version;
      if (LIGNES.paquet.num) { LIGNES.paquet.num.textContent = paq; }
    } catch (e) {
      if (LIGNES.paquet.num) { LIGNES.paquet.num.textContent = "?"; }
    }

    function ecrit(l, numero, choisie) {
      if (!l.bloc || !l.num || !l.marque) { return; }
      l.num.textContent = numero;
      l.marque.textContent = choisie ? "(actuelle)" : "";
      l.bloc.classList.toggle("actif", choisie);
    }

    function rendVersions() {
      // TANT QU'ON NE SAIT PAS, ON NE MARQUE RIEN. Le premier rendu passe avant
      // la réponse du stockage : marquer « (actuelle) » d'après un interrupteur
      // encore à sa valeur par défaut désignait la stable, puis la marque
      // sautait sur la beta un instant plus tard. Un clignotement qui dit deux
      // vérités.
      //
      // Et rien n'est « actuel » quand l'extension est éteinte : aucune des deux
      // moitiés ne se réveille, la marque désignerait une fiche que personne ne
      // verra.
      var montre = su && !etat.off;
      ecrit(LIGNES.ficheStable, fiches.stable || (etat.off ? "non lu" : "…"), montre && !etat.beta);
      ecrit(LIGNES.ficheBeta, fiches.beta || (etat.off ? "non lu" : "…"), montre && etat.beta);
      ecrit(LIGNES.extStable, numeroPartie("stable"), montre && !etat.beta);
      ecrit(LIGNES.extBeta, numeroPartie("beta"), montre && etat.beta);
    }

    // Hors ligne, ou site injoignable : on écrit « ? » plutôt que de laisser une
    // ligne vide, qui se lirait comme une extension cassée. Le panneau ne doit
    // jamais attendre le réseau pour s'afficher : tout est posé tout de suite,
    // les numéros arrivent après.
    //
    // ET ON NE TÉLÉPHONE PAS QUAND L'EXTENSION EST ÉTEINTE. L'ancien panneau
    // lançait ses deux requêtes à chaque ouverture, quoi qu'il arrive ; une
    // extension arrêtée qui va quand même chercher deux nombres sur un site
    // n'est pas une extension arrêtée.
    function litFiche(quel) {
      var ctrl = null;
      try { ctrl = new AbortController(); setTimeout(function () { ctrl.abort(); }, 4000); }
      catch (e) { ctrl = null; }
      fetch(MANIFESTES[quel], ctrl ? { signal: ctrl.signal, cache: "no-store" }
                                   : { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (m) {
          fiches[quel] = (m && typeof m.release === "string") ? m.release : "?";
          rendVersions();
        })
        .catch(function () { fiches[quel] = "?"; rendVersions(); });
    }
    function litFiches() {
      if (demandees || etat.off) { return; }
      demandees = true;
      litFiche("stable");
      litFiche("beta");
    }

    // --------------------------------------------------------------- le tout

    function rend() {
      rendEtat();
      rendNuit();
      rendPieces();
      rendDepannage();
      rendVersions();
    }

    // --------------------------------------------------- messages et actions

    var flashId = 0;
    function flash(txt) {
      elFlash.textContent = txt;
      elFlash.hidden = false;
      clearTimeout(flashId);
      flashId = setTimeout(function () { elFlash.hidden = true; }, 4000);
    }

    // LA PROPOSITION DE RECHARGEMENT NE SORT QU'APRÈS UNE BASCULE QUI L'EXIGE,
    // et jamais à l'ouverture : un bouton toujours là serait un bouton qu'on
    // finit par cliquer sans raison. Le libellé dit « l'onglet actif » et non
    // « la partie », parce que c'est exactement ce qui sera rechargé : savoir
    // qu'il s'agit bien de Roll20 demanderait la permission tabs, et une
    // permission de plus fait réexaminer l'extension et redemander leur accord
    // aux joueurs, pour un bouton de confort.
    function proposeRechargement() {
      if (!browser.tabs || !browser.tabs.reload) { return; }
      elRecharge.hidden = false;
    }
    elRecharge.addEventListener("click", function () {
      try {
        var p = browser.tabs.reload();
        if (p && p.then) {
          p.then(function () { window.close(); },
                 function () { flash("Rechargement refusé : recharger la page Roll20 à la main."); });
        }
      } catch (e) {
        flash("Rechargement refusé : recharger la page Roll20 à la main.");
      }
    });

    function pose(o) {
      // Un rejet du stockage ne doit pas laisser l'écran mentir : on affiche ce
      // qu'on a voulu, et l'erreur se voit au réglage suivant qui ne tiendra pas.
      try { return browser.storage.local.set(o); }
      catch (e) { return null; }
    }

    // ------------------------------------------------------- l'interrupteur

    elOff.addEventListener("click", function () {
      etat.off = !etat.off;
      touche[CLE_OFF] = true;
      pose({ miaOff: etat.off });
      rend();
      litFiches();          // rallumée : les numéros du site peuvent être lus
      proposeRechargement();
    });

    // ------------------------------------------------------------ la nuit

    function choisitNuit(v) {
      if (v !== "auto" && v !== "jour" && v !== "nuit") { return; }
      etat.nuit = v;
      touche[CLE_NUIT] = true;
      peint(v);             // le panneau s'habille avant même l'écriture
      ecritEcho(v);         // pour que la prochaine ouverture n'ait pas d'éclair
      pose({ miaNuit: v });
      rendNuit();
      // Le panneau s'habille seul, mais la fiche et le plateau d'une partie déjà
      // ouverte gardent la couleur qu'ils avaient : leur nuit voyage dans
      // l'adresse posée au montage, et cette adresse ne se réécrit pas sous eux.
      proposeRechargement();
    }
    var i;
    for (i = 0; i < segs.length; i++) {
      segs[i].addEventListener("click", function () {
        choisitNuit(this.getAttribute("data-v"));
      });
    }
    elNuit.addEventListener("keydown", function (ev) {
      var pas = ev.key === "ArrowRight" || ev.key === "ArrowDown" ? 1
              : ev.key === "ArrowLeft" || ev.key === "ArrowUp" ? -1 : 0;
      if (!pas) { return; }
      ev.preventDefault();
      var k;
      for (k = 0; k < segs.length; k++) {
        if (segs[k].getAttribute("aria-checked") === "true") { break; }
      }
      var suivant = (k + pas + segs.length) % segs.length;
      choisitNuit(segs[suivant].getAttribute("data-v"));
      segs[suivant].focus();
    });

    // LE THÈME DU NAVIGATEUR PEUT CHANGER PENDANT QUE LE PANNEAU EST OUVERT
    // (un coucher de soleil, sous un système qui bascule tout seul). En mode
    // auto, le panneau doit suivre : sans cela il resterait clair au milieu d'un
    // bureau devenu sombre, et « auto » cesserait d'être vrai.
    try {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      var suit = function () { if (etat.nuit === "auto") { peint("auto"); } };
      if (mq.addEventListener) { mq.addEventListener("change", suit); }
      else if (mq.addListener) { mq.addListener(suit); }
    } catch (e) { /* pas de matchMedia : le mode auto vaut jour, et c'est déjà géré */ }

    // ------------------------------------------------------------ les pièces

    elPan.addEventListener("click", function () {
      etat.panneau = !etat.panneau;
      touche[CLE_PAN] = true;
      // Les deux noms, pour la raison dite en tête de fichier. La valeur est la
      // même des deux côtés : jamais deux vérités.
      var o = {};
      o[CLE_PAN] = etat.panneau;
      o[CLE_PAN_BIS] = etat.panneau;
      pose(o);
      rendPieces();
    });

    elPanReplacer.addEventListener("click", function () {
      try { browser.storage.local.remove(CLE_PAN_GEO); } catch (e) { /* rien à replacer */ }
      flash("Plateau replacé.");
    });

    elBeta.addEventListener("click", function () {
      etat.beta = !etat.beta;
      touche[CLE_BETA] = true;
      pose({ miaBeta: etat.beta });
      // « ACTUELLE », ET NON « EN SERVICE ». Ce que l'interrupteur dit, c'est la
      // fiche qui sera chargée au prochain affichage d'une page Roll20 : les
      // onglets déjà ouverts gardent la moitié qu'ils ont montée, puisque les
      // deux copies partagent leurs marqueurs de frame et qu'un second pont d20
      // dans la même page écrirait tout en double.
      rend();
      proposeRechargement();
    });

    // ------------------------------------------------------------- le départ

    rend();

    // UNE SEULE LECTURE, ET ELLE NE PEUT PAS FAIRE ÉCHOUER LE PANNEAU. Un
    // stockage en panne laissait autrefois des cases dans leur état par défaut
    // sans que rien ne le dise ; ici l'échec passe par le même chemin que la
    // réponse vide, et le panneau s'affiche avec les valeurs par défaut, qui
    // sont aussi celles que les scripts de contenu prendront.
    var voulues = [CLE_OFF, CLE_NUIT, CLE_BETA, CLE_PAN, CLE_PAN_BIS]
      .concat(CLE_DEP);
    try {
      browser.storage.local.get(voulues).then(recu, function () { recu(null); });
    } catch (e) {
      recu(null);
    }

    function recu(r) {
      su = true;
      r = r || {};
      // CETTE LECTURE INITIALISE, ELLE N'ÉCRASE PAS. Le panneau s'affiche avant
      // que le stockage ait répondu, et il est cliquable tout de suite : un
      // joueur pressé bascule l'interrupteur général en 60 ms, la réponse
      // arrive 400 ms plus tard avec l'instantané d'AVANT le clic, et le
      // réglage revient tout seul à sa position précédente sous ses yeux. Pire,
      // l'écriture a bien eu lieu : l'écran et le stockage disent alors le
      // contraire l'un de l'autre. Un réglage déjà touché par le joueur fait
      // donc autorité sur ce que le stockage rapporte.
      if (!touche[CLE_OFF]) { etat.off = !!r[CLE_OFF]; }
      if (!touche[CLE_BETA]) { etat.beta = !!r[CLE_BETA]; }
      if (!touche[CLE_NUIT]) {
        etat.nuit = (r[CLE_NUIT] === "jour" || r[CLE_NUIT] === "nuit") ? r[CLE_NUIT] : "auto";
      }
      // Absent = allumé, des deux côtés : une partie Roll20 qui n'a rien à voir
      // avec MIA doit pouvoir se débarrasser du plateau sans désinstaller, mais
      // ne doit pas avoir à l'allumer pour l'avoir.
      if (!touche[CLE_PAN]) {
        etat.panneau = !(r[CLE_PAN] === false || r[CLE_PAN_BIS] === false);
      }

      var k;
      etat.depannage = [];
      for (k = 0; k < CLE_DEP.length; k++) {
        if (r[CLE_DEP[k]]) {
          etat.depannage.push({ cle: CLE_DEP[k], val: String(r[CLE_DEP[k]]) });
        }
      }

      // Le stockage a le dernier mot sur l'écho : si les deux ne disent pas la
      // même chose (réglage changé depuis une autre fenêtre, écho effacé avec
      // l'historique), le panneau se recale ici, un rendu après. C'est le seul
      // clignotement possible, et il ne dure qu'une image.
      peint(etat.nuit);
      ecritEcho(etat.nuit);

      rend();
      litFiches();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", demarre);
  } else {
    demarre();
  }
})();
