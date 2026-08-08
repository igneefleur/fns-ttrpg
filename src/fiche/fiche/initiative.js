  // ---------- initiative ----------
  // Une compétence de Body comme les autres (stade, passifs à Artiste dans
  // l'onglet Art, modificateur dans Options), malus de poids compris : il lui
  // arrive par compValue(), comme à l'esquive ou à la course, et la ligne
  // générique l'affiche déjà, d'où les crochets adj et detail retirés d'ici : ils
  // parlaient du poids BRUT et le comptaient une seconde fois. Elle a son module
  // parce qu'elle se lance à chaque combat ; la liste des compétences l'écarte
  // donc, pour ne pas doubler la même commande.
  function buildInitiative() {
    var initHooks = [];   // registre PROPRE au module : la ligne est reconstruite
    var b = block("Initiative", null, "initiative", function () { rendre(); });
    var box = el("div");
    b.appendChild(box);
    function rendre() {
      initHooks.length = 0;   // les hooks de la ligne détruite partent avec elle
      box.innerHTML = "";
      box.appendChild(compRow({ key: INIT_KEY, name: "Initiative", carac: "Body", custom: false },
                              false, {
        module: "initiative", reg: initHooks,
        // le seul écart avec une ligne ordinaire : le filtre « initiative » ne
        // vit que sur cette valeur-là, et la ligne générique le manquerait en
        // appelant compValue() directement
        value: function () { return initiative(); },
        rollLabel: "Initiative"
      }));
      applyEdit(b, "initiative");
      refresh();
    }
    hooks.push(function () { initHooks.forEach(function (f) { f(); }); });
    rendre();
    return b;
  }

