
  // Budget de construction. Les réserves courante et maximale sont indépendantes.
  function eoDepense() {
    var total = 0;
    (state.energieOrganisee || []).forEach(function (categorie) {
      (categorie.elements || []).forEach(function (technique) {
        (technique.entrees || []).forEach(function (entree) {
          if (entree.acquis) total += entree.cout || 0;
        });
      });
    });
    return total;
  }

  function buildEnergie() {
    return buildListeOrganisee({
      cle: "energieOrganisee", titre: "Techniques occultes", groupes: "Catégories", elements: "Techniques", entrees: "Entrées",
      groupeSingulier: "Catégorie", elementSingulier: "Technique", elementPluriel: "Techniques",
      groupeDefini: "cette catégorie", groupeIndefini: "une catégorie", groupeAutre: "une autre catégorie",
      elementDefini: "cette technique", elementIndefini: "une technique",
      videGroupe: "Aucune catégorie.", videElement: "Aucune technique.", videEntree: "Aucune entrée.",
      groupeSansNom: "Catégorie sans nom", elementSansNom: "Technique sans nom",
      nouveauGroupe: "Nouvelle catégorie", nouvelElement: "Nouvelle technique",
      unite: "EO", cout: function (entree) { return entree.cout || 0; }
    });
  }
