// Bouton « Mode nuit » dans l'en-tête, sur toutes les pages.
//
// Le mode nuit inverse le rendu global de la page (voir stylesheets/night.css) :
// une seule classe .night sur <html> fait basculer tout le site, contenu custom
// compris, sans thème parallèle à maintenir. Ce fichier ne gère que le bouton et
// l'état (bascule + mémorisation). L'application AVANT le premier rendu (anti-flash)
// est faite par le script inline de overrides/main.html.
(function () {
  const MOON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
    '<path d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,10.5L19.61,11.76L20.2,13.74L18.5,12.56L16.8,13.74L17.39,11.76L15.75,10.5L17.81,10.43L18.5,8.5L19.19,10.43L21.25,10.5M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95Z"/></svg>';
  const SUN =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
    '<path d="M3.55,19.09L4.96,20.5L6.76,18.71L5.34,17.29M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M20,13H23V11H20M17.24,18.71L19.04,20.5L20.45,19.09L18.66,17.29M20.45,5L19.04,3.5L17.24,5.29L18.66,6.71M13,1H11V4H13M6.76,5.29L4.96,3.5L3.55,4.91L5.34,6.71M1,13H4V11H1M13,20H11V23H13V20Z"/></svg>';

  function isNight() {
    return document.documentElement.classList.contains("night");
  }

  function apply(on) {
    document.documentElement.classList.toggle("night", on);
    try {
      localStorage.setItem("night", on ? "1" : "0");
    } catch (e) {}
    sync();
  }

  // Met à jour les libellés d'accessibilité du bouton selon l'état courant.
  // (L'icône affichée, elle, est pilotée en pur CSS par html.night.)
  function sync() {
    const btn = document.querySelector(".night-btn");
    if (!btn) return;
    const on = isNight();
    const label = on ? "Repasser en mode jour" : "Passer en mode nuit";
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", label);
    btn.title = label;
  }

  // Insère (une seule fois) le bouton dans l'en-tête. Rappelé à chaque page via
  // document$ (navigation.instant) : idempotent, il ne recrée pas le bouton.
  function ensureButton() {
    const header = document.querySelector(".md-header__inner");
    if (!header) return;
    if (header.querySelector(".night-btn")) {
      sync();
      return;
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "md-header__button md-icon night-btn";
    btn.innerHTML =
      '<span class="night-btn__moon">' + MOON + "</span>" +
      '<span class="night-btn__sun">' + SUN + "</span>";
    btn.addEventListener("click", function () {
      apply(!isNight());
    });
    const search = header.querySelector(".md-search");
    header.insertBefore(btn, search || null);
    sync();
  }

  // À chaque page en navigation instantanée (Material réémet document$)...
  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(ensureButton);
  }
  // ...et un filet indépendant au premier chargement, au cas où document$
  // n'émettrait pas (ensureButton est idempotent, donc pas de doublon).
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureButton);
  } else {
    ensureButton();
  }
})();
