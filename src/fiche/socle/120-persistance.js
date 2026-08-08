  // ---------- persistance ----------
  // Le bandeau du dernier enregistrement raté : absent tant que ça passe. Une
  // panne d'enregistrement ne se dit PAS en un éclair de 2.6 s vu une seule
  // fois, comme le faisait l'ancien flash : la fiche continuerait de s'afficher,
  // parfaitement normale, pendant qu'une session entière de travail se perd à
  // la fermeture. Tant que ça ne repasse pas, le bandeau reste.
  var elSavePanne = null;
  function save() {
    // La mise en forme se fait HORS du try du stockage, et son échec se dit
    // autrement. Un mod qui range une donnée circulaire dans ctx.state (la page
    // Mods invite justement à y écrire, et seul ctx.donnees.set s'en protège)
    // fait jeter stringify : setItem n'était alors jamais atteint, donc sous
    // Roll20 le cache mémoire du pont n'était même pas à jour, donc aucune
    // écriture programmée, donc ni accusé de réception, ni chien de garde, ni
    // bandeau de perte. Rien ne s'enregistrait plus et rien ne le disait.
    var json = null, panne = "";
    try { json = JSON.stringify(state); }
    catch (e) {
      panne = "La fiche ne peut plus se mettre en forme pour l'enregistrement (" + messageErreur(e) +
              "). Un mod a sans doute rangé une donnée qui se contient elle-même : plus rien n'est enregistré.";
    }
    if (json !== null) {
      try { STORE.setItem("jjk-perso", json); }
      catch (e) { panne = "Impossible d'enregistrer (stockage plein ou bloqué) : exporter la fiche en JSON."; }
    }
    montrePanneSave(panne);
    var cards;
    try { cards = JSON.parse(STORE.getItem("jjk-cards")) || {}; } catch (e) { cards = {}; }
    var card = computeCard();
    card.id = "_current";
    cards._current = card;
    try { STORE.setItem("jjk-cards", JSON.stringify(cards)); } catch (e) {}
  }
  // Le bandeau de perte : même mise en forme que celui des mods, au même
  // endroit, juste avant la feuille. Il n'y en a qu'UN, gardé d'un montage à
  // l'autre : mount() vide la racine, l'élément se retrouve détaché, et le
  // premier enregistrement du nouveau montage le remet en tête. Il s'en va tout
  // seul dès qu'un enregistrement repasse, sans que personne ait à y penser.
  //
  // SA PROPRE CLASSE, en plus de la commune. Le contrat réserve .pc-avis au
  // bandeau de consentement ; les deux peuvent coexister (un mod en attente ET
  // un enregistrement en panne), et sans marque distincte plus personne, code
  // ou sonde, ne sait lequel des deux il tient.
  function montrePanneSave(msg) {
    if (!msg) {
      if (elSavePanne && elSavePanne.parentNode) elSavePanne.parentNode.removeChild(elSavePanne);
      return;
    }
    if (!appEl) return;   // pas encore monté : le prochain enregistrement le posera
    if (!elSavePanne) {
      elSavePanne = el("div", "pc-avis pc-avis-save");
      elSavePanne.appendChild(el("div", "pc-avis-txt", ""));
    }
    var txt = elSavePanne.firstChild;
    if (txt.textContent !== msg) txt.textContent = msg;
    // save() part à chaque frappe : ne toucher au DOM que si le bandeau n'est
    // pas déjà à sa place, sinon chaque lettre tapée le déplacerait.
    if (elSavePanne.parentNode === appEl) return;
    // la feuille est cherchée parmi les enfants DIRECTS : insertBefore veut un
    // repère qui soit bien un enfant de appEl, et un querySelector qui
    // descendrait dans l'arbre jetterait au lieu de poser le bandeau
    var avant = null, k;
    for (k = 0; k < appEl.children.length; k++)
      if (appEl.children[k].className === "pc-sheet") { avant = appEl.children[k]; break; }
    appEl.insertBefore(elSavePanne, avant);
  }
  function load() {
    try { return normalize(JSON.parse(STORE.getItem("jjk-perso"))); }
    catch (e) { return null; }
  }
  function curTab() { try { return STORE.getItem("jjk-tab") || "fiche"; } catch (e) { return "fiche"; } }
  function setTab(id) { try { STORE.setItem("jjk-tab", id); } catch (e) {} }

  // bibliothèque (site seulement : dans Roll20, une fiche par personnage)
  var PKEY = "jjk-persos";
  function loadPersos() { try { var a = JSON.parse(STORE.getItem(PKEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  // jjk-cards ne porte QUE la fiche ouverte (« _current »), la seule que le
  // popup de l'extension et les attributs miroir lisent : y recalculer une carte
  // par personnage de la bibliothèque ne servait personne.
  function savePersos(a) {
    try { STORE.setItem(PKEY, JSON.stringify(a)); } catch (e) {}
  }

