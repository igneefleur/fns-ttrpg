  // ---- la règle de l'écart : un interrupteur, et rien d'autre ----
  // UN BLOC À LUI SEUL, ET IL LE REDEVIENT. Il avait été rangé en tête de
  // l'onglet Écart du bloc des caractéristiques, au motif qu'on ne le cherche
  // nulle part ailleurs qu'à l'endroit où l'écart se règle. C'était une erreur
  // de nature : les cinq onglets d'à côté DÉCALENT un seuil, caractéristique
  // par caractéristique ; celui-ci SUSPEND une règle, pour le personnage
  // entier. On ne coche pas l'un en croyant régler l'autre, et un réglage qui
  // porte sur toute la fiche n'a pas à se cacher dans l'onglet d'une des huit.
  //
  // Il ne pose AUCUN avertissement en tête de fiche : c'est un réglage voulu,
  // pas un état du personnage. Ce qu'il fait se lit ici, là où on le coche.
  function buildEcartRegle() {
    var b = block("Règle de l'écart");
    var row = el("div", "pc-kv");
    var lab = el("label", "pc-case-mot");
    var boite = el("input");
    boite.type = "checkbox";
    boite.addEventListener("change", function () {
      state.ecartCoupe = boite.checked;
      save();
      refresh();
    });
    hooks.push(function () { boite.checked = !!state.ecartCoupe; });
    lab.appendChild(boite);
    lab.appendChild(el("span", "t", "Désactiver la règle d'écart pour ce personnage"));
    row.appendChild(lab);
    b.appendChild(row);
    return b;
  }
