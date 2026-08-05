/* Panneau de l'extension, au strict nécessaire : un lien vers les règles,
 * l'interrupteur du mode beta, celui du plateau de Narration, et les numéros de
 * version. (L'ancienne liste des fiches synchronisées a été retirée : la fiche
 * vit dans le personnage Roll20, pas ici.)
 *
 * PARTAGÉ par les deux parties, et il doit le rester : c'est le poste
 * d'aiguillage, le seul endroit qui ÉCRIVE jjkBeta. Le dédoubler donnerait deux
 * interrupteurs pour un seul réglage. */
// compat : Chrome expose `chrome.*`, Firefox `browser.*` (les deux rendent des promesses).
if (typeof browser === "undefined") { var browser = chrome; }
(function () {
  "use strict";

  // Mode beta : la fiche affichée dans Roll20 est celle du chantier.
  // L'extension porte les DEUX parties, stable/ et beta/, et cette case est le
  // seul aiguillage : elle écrit jjkBeta, que chaque copie relit au chargement
  // d'une page Roll20 pour savoir si elle doit vivre ou se taire. Le lien des
  // règles suit, et l'onglet Roll20 s'annonce « Fiche JJK beta ».
  //
  // La bascule ne prend effet qu'au RECHARGEMENT de la page Roll20, et c'est
  // dit à l'utilisateur : la copie déjà réveillée garde son onglet, ses
  // écouteurs et son panneau, et le pont d20 déjà posé dans le monde principal
  // n'est pas démontable. Rien dans le code ne sait se retirer.
  var REGLES = {
    stable: "https://igneefleur.github.io/HxH-Regles-JDR/jjk/content/regles/",
    beta: "https://igneefleur.github.io/HxH-Regles-JDR/jjk-beta/content/regles/"
  };
  var beta = document.getElementById("p-beta");
  var regles = document.getElementById("p-regles");

  // ------------------------------------------------------------------------
  // LES QUATRE NUMÉROS : deux paires, fiche puis extension.
  //
  // La marque « (actuelle) » se pose sur le côté choisi des DEUX paires en même
  // temps, parce qu'une seule case commande les deux : cocher Mode beta charge
  // la fiche de chantier ET réveille la moitié beta du paquet.
  //
  // Le mot employé est « fiche », pas « site » : le joueur ne choisit pas un
  // site web, il choisit la fiche de personnage qui s'ouvrira dans Roll20.
  // ------------------------------------------------------------------------

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
    stable: "https://igneefleur.github.io/HxH-Regles-JDR/jjk/jjk-manifeste.json",
    beta: "https://igneefleur.github.io/HxH-Regles-JDR/jjk-beta/jjk-manifeste.json"
  };
  var fiches = { stable: null, beta: null };   // null : pas encore su

  // LES NUMÉROS DES DEUX MOITIÉS D'EXTENSION VIENNENT DE parties.js, que l'outil
  // de signature écrit dans le paquet juste avant de le sceller. Chacun est le
  // numéro du PAQUET auquel cette moitié a changé pour la dernière fois, et non
  // celui du paquet courant.
  //
  // Conséquence à assumer, et c'est l'information utile : changer un fichier
  // PARTAGÉ (ce popup, un gabarit, une icône) fait sortir un paquet neuf sans
  // qu'aucune moitié ne bouge. Les deux gardent alors leur ancien numéro pendant
  // que le paquet avance, et cela se lit « ces deux moitiés n'ont pas changé
  // depuis la 3.6.0 ».
  //
  // Le piège du fichier : il vit DANS le paquet, donc l'écrire change ce que
  // content_hash() calcule. Non neutralisé là-bas, il ferait croire à chaque
  // déploiement que l'extension a changé et la CI re-signerait en boucle, un
  // quota AMO par tour. Il est neutralisé pour la même raison que le champ
  // « version » des manifestes. Ne jamais figer ces numéros ici en dur : ce
  // serait recréer le version.js que les numéros de fiche ont déjà fait tomber.
  //
  // Le suffixe du chantier est posé À L'AFFICHAGE : la moitié beta se montre
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
    var el = document.getElementById(id);
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

  // LE NUMÉRO DU PAQUET A SA LIGNE, et non une infobulle. Les quatre premières
  // disent QUAND chaque moitié a changé ; aucune ne dit ce qui est installé, et
  // c'est pourtant le seul numéro que Firefox et Chrome montrent au joueur. Le
  // cacher dans une infobulle, c'est le réserver à qui pense à survoler.
  try {
    var paq = browser.runtime.getManifest().version;
    if (LIGNES.paquet.num) { LIGNES.paquet.num.textContent = paq; }
  } catch (e) {
    if (LIGNES.paquet.num) { LIGNES.paquet.num.textContent = "?"; }
  }
  // L'explication, elle, reste en infobulle, et sur la ligne qu'elle explique.
  if (LIGNES.paquet.bloc) {
    LIGNES.paquet.bloc.title = "Ce que Mozilla a signé, et ce que le navigateur "
      + "affiche. Chaque moitié, au-dessus, montre le paquet où ELLE a changé "
      + "pour la dernière fois : un correctif d'un fichier partagé fait sortir "
      + "un paquet neuf sans qu'aucune moitié ne bouge.";
  }

  // Hors ligne, ou site injoignable : on écrit « ? » plutôt que de laisser une
  // ligne vide, qui se lirait comme une extension cassée. Le popup ne doit
  // jamais attendre le réseau pour s'afficher : la case et le lien sont posés
  // tout de suite, les numéros arrivent après.
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

  function ecrit(l, numero, choisie) {
    if (!l.bloc || !l.num || !l.marque) { return; }
    l.num.textContent = numero;
    l.marque.textContent = choisie ? "(actuelle)" : "";
    l.bloc.classList.toggle("actif", choisie);
  }

  var modeSu = false;   // la case n'est lue qu'après le stockage : voir plus bas
  function rendVersions() {
    // TANT QU'ON NE SAIT PAS, ON NE MARQUE RIEN. Le premier rendu passe avant
    // la réponse du stockage : marquer « (actuelle) » d'après une case encore
    // décochée par défaut désignait la stable, puis la marque sautait sur la
    // beta un instant plus tard. Un clignotement qui dit deux vérités.
    var on = !!(beta && beta.checked);
    ecrit(LIGNES.ficheStable, fiches.stable || "…", modeSu && !on);
    ecrit(LIGNES.ficheBeta, fiches.beta || "…", modeSu && on);
    ecrit(LIGNES.extStable, numeroPartie("stable"), modeSu && !on);
    ecrit(LIGNES.extBeta, numeroPartie("beta"), modeSu && on);
  }
  rendVersions();
  litFiche("stable");
  litFiche("beta");

  function appliquerMode(on) {
    modeSu = true;          // le stockage a répondu : les marques peuvent sortir
    beta.checked = !!on;
    regles.href = on ? REGLES.beta : REGLES.stable;
    document.body.classList.toggle("beta", !!on);
    // « ACTUELLE », ET NON « EN SERVICE ». Ce que la case dit, c'est la fiche
    // qui sera chargée au prochain affichage d'une page Roll20 : les onglets
    // déjà ouverts gardent la moitié qu'ils ont montée, puisque les deux copies
    // partagent leurs marqueurs de frame et qu'un second pont d20 dans la même
    // page écrirait tout en double. Annoncer « en service » juste après une
    // bascule était faux pour toutes les fenêtres déjà là.
    rendVersions();
  }

  browser.storage.local.get("jjkBeta").then(
    function (r) { appliquerMode(r && r.jjkBeta); },
    function () { appliquerMode(false); }
  );
  beta.addEventListener("change", function () {
    var on = beta.checked;
    browser.storage.local.set({ jjkBeta: on }).then(function () { appliquerMode(on); });
  });

  // Plateau de Narration : le panneau flottant posé dans la partie. Allumé tant
  // qu'on ne l'a pas éteint (clé absente = allumé) : une partie Roll20 qui n'a
  // rien à voir avec JJK doit pouvoir s'en débarrasser sans désinstaller.
  var panneau = document.getElementById("p-panneau");
  browser.storage.local.get("jjkPanneauActif").then(
    function (r) { panneau.checked = !(r && r.jjkPanneauActif === false); },
    function () { panneau.checked = true; }
  );
  panneau.addEventListener("change", function () {
    browser.storage.local.set({ jjkPanneauActif: panneau.checked });
  });
})();
