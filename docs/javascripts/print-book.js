// Bouton « Télécharger le livre (PDF) » dans l'en-tête, sur les pages du livre.
//
// Le PDF est généré au build par WeasyPrint (plugin mkdocs-to-pdf, configuré dans
// mkdocs.ci.yml et exécuté en CI). Il est déposé à <base>/pdf/livre-de-regles.pdf.
// Le bouton est un simple lien de téléchargement vers ce fichier : aucun
// assemblage côté client, le rendu (polices, pagination, couverture) est fait au
// build et identique pour tout le monde.
(function () {
  const SCOPE = "/content/regles/";
  const PDF_FILE = "pdf/livre-de-regles.pdf";
  const DOWNLOAD_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
    '<path d="M5,20H19V18H5V20M19,9H15V3H9V9H5L12,16L19,9Z"/></svg>';

  // URL du PDF, préfixe GitHub Pages compris : on coupe le chemin courant à
  // /content/regles/ pour récupérer la base du site ("/fns-ttrpg-rules" en ligne,
  // "" en local), puis on y accroche le fichier.
  function pdfHref() {
    const base = location.pathname.split(SCOPE)[0].replace(/\/$/, "");
    return base + "/" + PDF_FILE;
  }

  // Ajoute (ou met à jour) le lien dans l'en-tête, sur les pages du livre.
  function ensureButton() {
    const onBook = location.pathname.includes(SCOPE);
    const header = document.querySelector(".md-header__inner");
    let btn = header && header.querySelector(".print-book-btn");
    if (!onBook) { if (btn) btn.remove(); return; }
    if (!header) return;
    if (btn) { btn.href = pdfHref(); return; }   // navigation SPA : garder l'URL à jour
    btn = document.createElement("a");
    btn.className = "md-header__button md-icon print-book-btn";
    btn.href = pdfHref();
    btn.setAttribute("download", "HxH-Livre-de-Regles.pdf");
    btn.title = "Télécharger le livre (PDF)";
    btn.setAttribute("aria-label", "Télécharger le livre au format PDF");
    btn.innerHTML = DOWNLOAD_ICON;
    const search = header.querySelector(".md-search");
    header.insertBefore(btn, search || null);
  }

  if (window.document$) {
    document$.subscribe(ensureButton);   // navigation.instant : à chaque page
  } else {
    document.addEventListener("DOMContentLoaded", ensureButton);
  }
})();
