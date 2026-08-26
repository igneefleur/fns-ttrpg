  var compBox = null;
  // LE FILTRE EST CELUI DES SPÉCIALITÉS, et de nulle part ailleurs. Les huit
  // compétences sont toujours toutes là et tiennent à l'écran : les filtrer ne
  // cache rien qu'on cherchait. Les spécialités, elles, sont une liste ouverte
  // que le joueur remplit lui-même — c'est la seule de la fiche qui puisse
  // devenir assez longue pour qu'on s'y perde.
  //
  // Réglage de VUE : il survit au remontage de la fiche, et ne voyage pas avec
  // le personnage.
  var speFilter = "";
  // DEUX SÉLECTEURS EN PLUS DU TEXTE : la caractéristique et la compétence dont
  // une spécialité relève. Ce sont les deux seules choses qu'une spécialité
  // porte en plus de son nom, et chercher « toutes celles qui tiennent de DEX »
  // ne se fait pas en tapant des lettres.
  var speFiltreCarac = "";
  var speFiltreComp = "";
  // Les filtres se coupent depuis l'onglet Options. Coupé, un filtre DISPARAÎT
  // et cesse d'agir : un filtre invisible qui masque encore des lignes est un
  // piège. Réglages d'AFFICHAGE, donc dans le vrai localStorage du navigateur,
  // jamais dans le personnage.
  var FILTRES = { texte: "mia-filtre-texte",
                  carac: "mia-filtre-carac",
                  comp: "mia-filtre-comp" };
  function filtreTexteOn() { return lpref(FILTRES.texte, "1") !== "0"; }
  function filtreCaracOn() { return lpref(FILTRES.carac, "1") !== "0"; }
  function filtreCompOn() { return lpref(FILTRES.comp, "1") !== "0"; }
  // champ de filtre d'un module ; rend null quand le réglage le coupe, et le
  // texte est alors ignoré par les listes (voir filtreDe)
  function champFiltre(get, set, placeholder, onChange) {
    if (!filtreTexteOn()) return null;
    var s = el("input", "pc-comp-search");
    s.type = "search";
    s.placeholder = placeholder || "Filtrer…";
    s.value = get();   // le filtre survit au remontage : le champ doit le montrer
    s.addEventListener("input", function () { set(s.value); onChange(); });
    return s;
  }
  function filtreDe(v) { return filtreTexteOn() ? String(v || "").trim().toLowerCase() : ""; }
  // Un sélecteur de filtre : rend null quand le réglage le coupe, comme le champ
  // de texte. La première réponse est le VIDE — « toutes » —, et elle porte le
  // nom de la colonne pour qu'on sache ce qu'on choisit sans avoir à déplier.
  function selFiltre(codes, mot, titres, get, set, onChange) {
    var s = el("select", "pc-select pc-comp-filtre");
    var tout = el("option", null, mot);
    tout.value = "";
    s.appendChild(tout);
    codes.forEach(function (c) {
      var o = el("option", null, c);
      o.value = c;
      o.title = (titres && titres[c]) || c;
      s.appendChild(o);
    });
    s.value = get();   // le filtre survit au remontage : le sélecteur doit le montrer
    s.addEventListener("change", function () { set(s.value); onChange(); });
    return s;
  }
  // Ce que les trois filtres laissent passer, une fois les coupés ignorés.
  function filtreSpes(items) {
    var flt = filtreDe(speFilter);
    var fc = filtreCaracOn() ? speFiltreCarac : "";
    var fk = filtreCompOn() ? speFiltreComp : "";
    if (flt) items = items.filter(function (it) {
      return it.name.toLowerCase().indexOf(flt) >= 0;
    });
    if (fc) items = items.filter(function (it) { return it.carac === fc; });
    if (fk) items = items.filter(function (it) { return it.comp === fk; });
    return items;
  }
