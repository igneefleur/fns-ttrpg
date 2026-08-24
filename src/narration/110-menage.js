
  // CE QUE LE PONT A RETIRÉ DE « NARRATION ». Une fois par chargement, il en
  // enlève tout attribut « mia_ » qui n'est pas « mia_narr_ » — la trace d'une
  // fiche de personnage ouverte un jour sur ce personnage-là (mesuré chez
  // l'auteur : 82 attributs pour 18 attendus) — et fusionne les homonymes. Il
  // rapporte { trouves, etrangers, doublons, retires } avec la lecture suivante.
  //
  // Le plateau n'en montre QUE le compte de ce qui a disparu, et une seule fois :
  // ce n'est pas une panne, c'est un ménage, et le reste du rapport (dont l'arrêt
  // sur refus) part dans la trace de dépannage. Le mot ne dit pas « de fiche » :
  // les homonymes fusionnés, eux, étaient bien du plateau.
  //
  // La lecture est tolérante à dessein. Le pont est signé et le plateau ne l'est
  // pas : ils ne sont jamais déployés le même jour, et le nombre nu comme
  // l'objet détaillé doivent tous deux se lire.
  function ditMenage(d) {
    if (!d || d.menage == null) return;
    var m = d.menage, n = 0;
    if (typeof m === "number") n = m;
    else if (Object.prototype.toString.call(m) === "[object Array]") n = m.length;
    else if (typeof m === "object") {
      n = entier(m.retires != null ? m.retires : (m.n != null ? m.n : m.nb), 0);
      trace("menage", { menage: m });
    }
    if (!(n > 0)) return;
    mot(n > 1 ? ("Ménage : " + n + " attributs retirés du plateau.")
              : "Ménage : 1 attribut retiré du plateau.", "menage");
  }
