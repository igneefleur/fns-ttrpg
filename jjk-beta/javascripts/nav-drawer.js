// Ferme le tiroir de navigation (la « table de référence » du livre) après un
// clic sur un lien de l'arbre, un clic sur le fond, ou la touche Échap. Le tiroir
// est piloté par la checkbox native #__drawer de Material ; il suffit de la
// décocher pour fermer.
//
// Les écouteurs sont DÉLÉGUÉS sur `document` et posés une seule fois : ils
// survivent à la navigation instantanée (le document ne change pas). Le clic est
// écouté en phase CAPTURE pour passer AVANT le stopPropagation() que continuous.js
// applique sur les liens déjà chargés (sinon la fermeture ne se déclencherait pas).
(function () {
  function closeDrawer() {
    var cb = document.getElementById("__drawer");
    if (cb && cb.checked) cb.checked = false;
  }

  document.addEventListener("click", function (ev) {
    var t = ev.target;
    if (t && t.closest && t.closest(".md-sidebar--primary a")) closeDrawer();
  }, true);

  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape" || ev.key === "Esc") closeDrawer();
  });
})();
