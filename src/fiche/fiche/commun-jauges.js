  // ================= ONGLET FICHE =================

  // ---- les leviers d'une valeur : forçage et modificateurs ----
  // Vide = valeur CALCULÉE (le placeholder la montre en filigrane), une valeur
  // la FORCE. C'est le contrat de tous les champs « Forcé » de la fiche.
  function champForceMax(cle, auto, titre, reg) {
    return champForceBoite("capsLeviers", "max", cle, auto,
      titre || "Vide = maximum calculé (modificateurs compris) ; une valeur le force.", reg);
  }
  // La ligne « Forcé + Modificateurs » sous une jauge, en mode édition.
  function ligneLeviers(cle, auto, titre) {
    var row = el("div", "pc-pvmax pc-mods-host pc-edit-only");
    row.appendChild(el("span", "lbl", "Forcé"));
    row.appendChild(champForceMax(cle, auto, titre));
    row.appendChild(el("span", "lbl", "Modificateurs"));
    row.appendChild(multiModBoite("capsLeviers", "max", cle));
    row.appendChild(el("span", "sp"));
    return row;
  }
  // La même chose en version TUILE : le libellé au-dessus du contrôle, une
  // tuile étant trop étroite pour « Modificateurs » et trois cases côte à côte.
  function tuileForce(tile, cle, auto, titre) {
    var row = el("div", "pc-bigedit pc-edit-only");
    row.appendChild(el("span", "lbl", "Forcé"));
    row.appendChild(champForceMax(cle, auto, titre));
    tile.appendChild(row);
  }
  function tuileMods(tile, cle) {
    var row = el("div", "pc-bigedit pc-edit-only");
    row.appendChild(el("span", "lbl", "Modificateurs"));
    row.appendChild(multiModBoite("capsLeviers", "max", cle));
    tile.appendChild(row);
  }

  // ---- UNE JAUGE ----
  // PV, PE, PM, PI, PR, PS, PH : sept fois le même geste, une seule fonction.
  //   - le pas −/champ/+ est un geste de JEU : toujours actif, jamais sous le
  //     rouage ;
  //   - « / max » porte l'accent quand le maximum est forcé ou modifié, et son
  //     infobulle dit D'OÙ il vient (la formule du livre, décomposée) ;
  //   - « Max » remet la valeur à null, c'est-à-dire « au maximum » : elle SUIT
  //     alors le maximum quand il bouge, et celui de PV et PE bouge à chaque
  //     niveau d'effondrement ;
  //   - le rouage ne déverrouille que le maximum forcé et ses modificateurs.
  //
  // Le nombre affiché est le nombre RÉEL, jamais borné : borner l'affichage
  // mentirait sur ce que porte le personnage, et les points de mana, dont le
  // maximum vaut zéro, seraient purement inutilisables. C'est l'ACCENT et
  // l'avertissement de l'en-tête qui disent le dépassement.
  function jauge(bloc, cle, opts) {
    opts = opts || {};
    var pas = opts.pas || 1;
    var row = el("div", "pc-kv");
    var k = el("span", "k", abbrCap(cle, cle.toUpperCase()));
    k.title = libCap(cle, cle);
    row.appendChild(k);
    row.appendChild(stepper(
      function () { return courant(cle); },
      function (v) { state.etat[cle] = Math.round(v * 100) / 100; },
      pas, libCap(cle, cle)));
    var max = el("span", "max", "");
    row.appendChild(max);
    row.appendChild(el("span", "sp"));
    row.appendChild(miniBtn("Max", "Revenir au maximum", function () {
      state.etat[cle] = null;
      refresh();
    }));
    bloc.appendChild(row);
    bloc.appendChild(ligneLeviers(cle, function () { return autoDe(cle); }, opts.titreForce));
    if (opts.note) bloc.appendChild(note(opts.note));
    hooks.push(function () {
      var m = maxDe(cle);
      var d = 0;
      var forcee = capForce(cle);
      var depasse = courant(cle) > m;
      max.textContent = "/ " + fmtP(m);
      max.classList.toggle("adj", forcee || d !== 0 || depasse);
      var t;
      if (forcee) t = chaineTexteDe(lireCap("max", cle), "calculé", autoDe(cle));
      else t = opts.provenance ? opts.provenance() : "Maximum calculé";
      if (d) t += " · modificateurs " + sign(d);
      if (depasse) t += " — la valeur courante dépasse ce maximum : elle est gardée telle quelle.";
      max.title = t;
    });
    return row;
  }
  // D'où vient un maximum, décomposé pour l'infobulle. La formule VERBATIM du
  // livre est dans les données ; on la cite, on ne la réécrit pas, et on ajoute
  // ce que la caractéristique du personnage y met aujourd'hui.
  function provenanceCap(cle) {
    return function () {
      var d = capDef(cle);
      if (!d) return "Aucune donnée pour cette capacité.";
      if (!d.formule) return "Aucune formule ne donne cette valeur.";
      var t = d.formule;
      if (d.carac) t += " — " + libCarac(d.carac) + " " + fmtP(caracTotal(d.carac));
      return t;
    };
  }

