  // ---------- frame du haut : injection du pont d20 dans le monde principal ----------
  // Marqueur durable commun aux copies stable/beta : la balise script se retire
  // après chargement, mais le pont et ses écouteurs restent installés.
  // Le principe et le cycle de demande sont les mêmes que dans Outward.
  function injectPageScript() {
    var root = document.documentElement;
    if (!root || root.hasAttribute("data-jjk-bridge")) return;
    root.setAttribute("data-jjk-bridge", "1");
    // Le page-script ne peut pas lire browser.runtime. On lui transmet donc
    // la version du paquet et le protocole utilisés par le contrat JJK.
    try { root.setAttribute("data-jjk-extension-version", String(browser.runtime.getManifest().version || "")); }
    catch (e) { root.setAttribute("data-jjk-extension-version", ""); }
    root.setAttribute("data-jjk-bridge-protocol", "2");
    var s = document.createElement("script");
    s.id = "jjk-page-bridge";
    s.src = browser.runtime.getURL("@@partie@@/roll20-page.js");@@colonne:64@@// propre à cette copie
    s.onload = function () { this.remove(); };
    (document.head || root).appendChild(s);
  }
