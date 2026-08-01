// Boutons « copier » de l'accueil : les URL internes (about:debugging…,
// chrome://extensions) ne sont pas cliquables depuis une page web, on les copie.
// Écouteur DÉLÉGUÉ attaché une seule fois : il survit à la navigation instantanée
// de Material (le document persiste). Copie via l'API presse-papier, repli execCommand.
(function () {
  "use strict";
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".ext-copy");
    if (!b) return;
    e.preventDefault();
    var txt = b.getAttribute("data-copy") || "";
    if (!b.getAttribute("data-label")) b.setAttribute("data-label", b.textContent);
    function done() {
      b.textContent = "copié ✓";
      b.classList.add("ok");
      setTimeout(function () {
        b.textContent = b.getAttribute("data-label");
        b.classList.remove("ok");
      }, 1300);
    }
    function fallback() {
      try {
        var ta = document.createElement("textarea");
        ta.value = txt;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch (_) {}
      done();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, fallback);
    } else {
      fallback();
    }
  });
})();
