/* Content script sur Roll20 : onglet « Fiche JJK » dans le dialogue d'un personnage,
 * qui monte le VRAI créateur (jjk-creation.js) dans une iframe d'extension. La fiche est
 * enregistrée dans les Attributes Roll20 du personnage (préfixe jjk_), donc partagée à
 * tous les joueurs qui contrôlent ce personnage.
 *
 * Deux rôles selon la frame (le script tourne all_frames) :
 *  - FRAME DU HAUT (app.roll20.net/editor) : injecte roll20-page.js dans le MONDE
 *    PRINCIPAL (là où vit window.d20 / window.Campaign, invisible du content-script) ;
 *    ce page-script lit/écrit les attributs à la demande.
 *  - FRAME DE LA FEUILLE (iframe du dialogue de perso) : pose l'onglet « Fiche JJK »
 *    entre « Feuille de personnage » et « Bio & Info ». Au clic : si le perso a déjà
 *    une fiche JJK -> monte l'iframe du créateur ; sinon -> bouton « Créer fiche JJK ».
 *
 * L'iframe du créateur dialogue DIRECTEMENT avec le page-script via window.top
 * (postMessage) : ce content-script ne fait que poser l'onglet, interroger has-sheet,
 * et monter l'iframe avec le charId dans le hash.
 */
// compat : Chrome expose `chrome.*`, Firefox `browser.*`.
if (typeof browser === "undefined") { var browser = chrome; }
(function () {
  "use strict";

  var IS_TOP = (function () { try { return window.top === window; } catch (e) { return true; } })();

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function norm(s) { return (s || "").replace(/ /g, " ").replace(/\s+/g, " ").trim().toLowerCase(); }

  // ---------- jets au tchat Roll20 (frame du haut) ----------
  // Commande de jet : template par défaut + jet en ligne. Négatifs en « - N ».
  function rollCommand(die, value, label) {
    die = String(die || "1d100").trim() || "1d100";
    var v = value >= 0 ? "+ " + value : "- " + (-value);
    var name = String(label || "Jet").replace(/[{}]/g, "");
    return "&{template:default} {{name=" + name + "}} {{Jet=[[" + die + " " + v + "]]}}";
  }
  function findChatInput(doc) {
    var sels = ["#textchat-input textarea", "[id*='textchat-input'] textarea",
                "[id*='textchat'] textarea", "textarea#textchat-textarea", "textarea[name='chat']"];
    for (var i = 0; i < sels.length; i++) { var ta = doc.querySelector(sels[i]); if (ta) return ta; }
    return null;
  }
  function setChatValue(ta, text) {
    try {
      var proto = Object.getPrototypeOf(ta);
      var desc = Object.getOwnPropertyDescriptor(proto, "value") || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
      if (desc && desc.set) desc.set.call(ta, text); else ta.value = text;
    } catch (e) { ta.value = text; }
    ta.dispatchEvent(new Event("input", { bubbles: true }));
    ta.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function sendToChat(doc, text) {
    var ta = findChatInput(doc);
    if (!ta) return false;
    ta.focus();
    setChatValue(ta, text);
    var container = ta.closest("[id*='textchat-input'], [id*='textchat']") || ta.parentElement || doc;
    var btn = container.querySelector(".btn, button, [role='button']");
    if (btn) btn.click();
    else ["keydown", "keypress", "keyup"].forEach(function (t) {
      ta.dispatchEvent(new KeyboardEvent(t, { bubbles: true, cancelable: true, key: "Enter", code: "Enter", keyCode: 13, which: 13 }));
    });
    setChatValue(ta, "");
    return true;
  }

  // ---------- frame du haut : injecter le pont d20 dans le monde principal ----------
  function injectPageScript() {
    if (document.getElementById("jjk-page-bridge")) return;
    var s = document.createElement("script");
    s.id = "jjk-page-bridge";
    s.src = browser.runtime.getURL("roll20-page.js");
    s.onload = function () { this.remove(); };   // le listener reste actif, on retire la balise
    (document.head || document.documentElement).appendChild(s);
  }

  // ---------- pont léger vers le page-script (has-sheet) ----------
  // L'écouteur n'est POSÉ QU'À LA PREMIÈRE requête (aucun code au chargement de la page).
  var pendingHas = {}, hasListener = false;
  function ensureHasListener() {
    if (hasListener) return;
    hasListener = true;
    window.addEventListener("message", function (ev) {
      try {
        var d = ev.data;
        if (!d || d.ns !== "jjk") return;   // ignore tout ce qui n'est pas à nous
        if (d.type === "has-sheet-result" && pendingHas[d.charId]) {
          var cb = pendingHas[d.charId]; delete pendingHas[d.charId]; cb(d.exists);
        }
      } catch (e) {}
    });
  }
  // Demande au page-script d20 de s'injecter (l'injection ne se fait QUE là, sur
  // interaction — jamais au chargement de l'éditeur, pour ne pas gêner Roll20).
  function requestBridge() { try { window.top.postMessage({ ns: "jjk", type: "need-bridge" }, "*"); } catch (e) {} }
  // interroge has-sheet, avec relances (le page-script vient peut-être d'être injecté)
  function queryHasSheet(charId, cb) {
    ensureHasListener();
    if (!charId) { cb(null); return; }
    pendingHas[charId] = cb;
    var tries = 0;
    (function send() {
      if (!pendingHas[charId]) return;   // déjà répondu
      tries++;
      try { window.top.postMessage({ ns: "jjk", type: "has-sheet", charId: charId }, "*"); } catch (e) {}
      if (tries < 5) setTimeout(send, 700);
      else if (pendingHas[charId]) { delete pendingHas[charId]; cb(null); }
    })();
  }

  // charId du personnage dont CETTE frame (la feuille) est la vue.
  function charIdOfFrame(dialog) {
    try {
      var fe = window.frameElement;
      var dlg = fe && fe.closest && fe.closest(".characterdialog");
      if (dlg && dlg.getAttribute("data-characterid")) return dlg.getAttribute("data-characterid");
    } catch (e) {}
    var n = (dialog && dialog.querySelector && dialog.querySelector("[data-characterid]")) ||
            document.querySelector("[data-characterid]");
    return n ? n.getAttribute("data-characterid") : "";
  }

  // ---------- montage de l'iframe du créateur / bouton de création ----------
  function creatorFrame(charId) {
    var f = el("iframe", "jjk-creator-frame");
    f.src = browser.runtime.getURL("creator.html") + "#c=" + encodeURIComponent(charId || "");
    f.setAttribute("allow", "clipboard-write");
    return f;
  }
  // La fiche doit ÉPOUSER la fenêtre de la feuille Roll20 (dialogue de perso) et suivre
  // ses redimensionnements. Ce content-script tourne DANS la frame de la feuille, donc
  // window.innerHeight = hauteur utile du dialogue. On règle la hauteur de l'iframe pour
  // qu'elle remplisse de son sommet jusqu'au bas du dialogue ; l'iframe interne défile
  // pour une feuille plus haute. On recalcule à chaque resize / changement de layout.
  var currentFrame = null, resizeBound = false;
  function refitFrame() {
    var fr = currentFrame;
    if (!fr || !fr.isConnected || !fr.offsetParent) return;   // caché -> rien à faire
    var top = fr.getBoundingClientRect().top;
    var vh = window.innerHeight || document.documentElement.clientHeight || 620;
    fr.style.height = Math.max(400, Math.round(vh - top - 6)) + "px";
  }
  function fitCreatorHeight(iframe) {
    currentFrame = iframe;
    refitFrame();
    // le layout se stabilise après l'affichage de l'onglet : passes de rattrapage
    setTimeout(refitFrame, 60); setTimeout(refitFrame, 250); setTimeout(refitFrame, 800);
    if (!resizeBound) {
      resizeBound = true;
      window.addEventListener("resize", refitFrame);
      try { new ResizeObserver(refitFrame).observe(document.documentElement); } catch (e) {}
    }
  }
  function fillCreator(host, charId) {
    host.innerHTML = "";
    var f = creatorFrame(charId);
    host.appendChild(f);
    fitCreatorHeight(f);
  }
  function fillButton(host, charId, exists) {
    host.innerHTML = "";
    var wrap = el("div", "jjk-create");
    wrap.appendChild(el("div", "jjk-create-title", "Fiche JJK"));
    wrap.appendChild(el("p", "jjk-create-msg",
      exists === null
        ? "Roll20 n'a pas encore répondu (personnage non prêt). Ouvrir la fiche JJK :"
        : "Ce personnage n'a pas encore de fiche JJK."));
    var btn = el("button", "jjk-create-btn", exists === null ? "Ouvrir la fiche JJK" : "Créer fiche JJK");
    btn.type = "button";
    btn.addEventListener("click", function () { fillCreator(host, charId); });
    wrap.appendChild(btn);
    host.appendChild(wrap);
  }
  // Décide quoi afficher dans l'hôte selon l'existence d'une fiche.
  function populate(host, charId) {
    host.innerHTML = "";
    host.appendChild(el("div", "jjk-create", "Chargement…"));
    queryHasSheet(charId, function (exists) {
      if (exists === true) fillCreator(host, charId);
      else fillButton(host, charId, exists);   // false = pas de fiche ; null = inconnu
    });
  }

  // ---------- pose de l'onglet dans la barre d'onglets du dialogue ----------
  function labelEls(label) {
    var want = norm(label);
    var nodes = document.querySelectorAll("a, span, li");
    var raw = [];
    for (var i = 0; i < nodes.length; i++) if (norm(nodes[i].textContent) === want) raw.push(nodes[i]);
    return raw.filter(function (n) { return !raw.some(function (m) { return m !== n && n.contains(m); }); });
  }
  function siblingItems(a, b) {
    for (var pa = a; pa; pa = pa.parentNode)
      for (var pb = b; pb; pb = pb.parentNode)
        if (pb.parentNode && pb.parentNode === pa.parentNode) return [pa, pb];
    return null;
  }
  function dialogOf(node) {
    return node.closest(".ui-dialog") || node.closest("[class*='dialog']") || node.offsetParent || node.parentElement;
  }
  function contentBoxOf(dialog, strip) {
    return (dialog.querySelector && dialog.querySelector(".tab-content")) || strip.nextElementSibling;
  }

  function placeTabs() {
    var placed = 0;
    labelEls("Feuille de personnage").forEach(function (feuille) {
      var bios = labelEls("Bio & Info");
      var items = null;
      for (var i = 0; i < bios.length && !items; i++) {
        var it = siblingItems(feuille, bios[i]);
        if (!it) continue;
        var parent = it[0].parentNode;
        if (parent === document.body || parent === document.documentElement) continue;
        if (parent.children.length > 24) continue;
        items = it;
      }
      if (!items) return;
      var feuilleItem = items[0], bioItem = items[1], strip = bioItem.parentNode;
      if (strip.querySelector(".jjk-tab")) { placed++; return; }   // déjà là

      var dialog = dialogOf(strip);
      var contentBox = contentBoxOf(dialog, strip);
      // conteneur des panes = parent d'un pane natif (là où Roll20 les place)
      var nativePane = (dialog && dialog.querySelector(".tab-pane")) || document.querySelector(".tab-pane");
      var paneBox = (nativePane && nativePane.parentNode) || contentBox;
      if (!paneBox) return;

      // On travaille AVEC le système d'onglets de Jumpgate (source vérifiée) :
      //   bindTabEvents() fait, pour chaque `.nav li a`,
      //     allTabs[a.data-tab] = find('.tab-pane.'+data-tab)[0]; allTabs[...].style...
      //   -> si le pane manque, allTabs[...] est undefined et Roll20 PLANTE (fiche
      //   qui ne s'ouvre plus). On crée donc TOUJOURS le pane `.tab-pane.jjkfiche`
      //   AVANT de poser l'onglet `<a data-tab="jjkfiche">` : Roll20 l'enregistre et
      //   le gère nativement (affichage + onglet actif violet).
      var pane = paneBox.querySelector(".tab-pane.jjkfiche");
      if (!pane) {
        pane = el("div", "tab-pane jjkfiche jjk-pane");
        pane.style.display = "none";
        paneBox.appendChild(pane);
      }

      // vrai onglet, cloné des onglets natifs (styles Roll20 : look + actif violet)
      var tab = document.createElement(feuilleItem.tagName || "li");
      tab.className = ((feuilleItem.className || "").replace(/\b(active|ui-tabs-active|ui-state-active|chosen)\b/g, "").trim() + " jjk-tab").trim();
      var nativeA = feuilleItem.querySelector("a");
      var a = document.createElement("a");
      if (nativeA && nativeA.className) a.className = nativeA.className;
      a.setAttribute("href", "javascript:void(0);");
      a.setAttribute("data-tab", "jjkfiche");
      a.textContent = "Fiche JJK";
      tab.appendChild(a);

      var built = false;
      function showOurPane() {
        var panes = paneBox.querySelectorAll(".tab-pane");
        for (var j = 0; j < panes.length; j++) panes[j].style.display = (panes[j] === pane) ? "block" : "none";
        for (var k = 0; k < strip.children.length; k++) strip.children[k].classList.remove("active");
        tab.classList.add("active");
        refitFrame();   // l'iframe redevient visible : réajuster sa hauteur au dialogue
      }
      function hideOurPane() { pane.style.display = "none"; tab.classList.remove("active"); }

      // On gère nous-mêmes l'affichage (fiable quel que soit le moment où bindTabEvents
      // s'exécute) et on bloque le gestionnaire délégué de Roll20 pour NOTRE onglet.
      a.addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        if (!built) { built = true; requestBridge(); populate(pane, charIdOfFrame(dialog)); }
        showOurPane();
      });
      // clic sur un onglet natif -> on masque le nôtre (Roll20 affiche le sien)
      strip.addEventListener("click", function (ev) {
        var na = ev.target.closest && ev.target.closest("a[data-tab]");
        if (na && na.getAttribute("data-tab") !== "jjkfiche") hideOurPane();
      }, true);

      strip.insertBefore(tab, bioItem);   // vrai onglet DANS la barre, entre Feuille et Bio
      placed++;
    });
    return placed;
  }

  // ---------- boucle ----------
  function scan() { if (!IS_TOP) placeTabs(); }

  if (IS_TOP) {
    // FRAME DU HAUT : on n'injecte RIEN au chargement (l'injection main-world gênait
    // l'ouverture des fiches Roll20). On attend que l'utilisateur ouvre l'onglet
    // Fiche JJK (depuis une fiche déjà ouverte) : il pose alors le pont via need-bridge.
    // Reçoit aussi les JETS de la fiche -> tchat Roll20 (le tchat vit dans cette frame).
    window.addEventListener("message", function (ev) {
      try {
        var d = ev.data;
        if (!d || d.ns !== "jjk") return;
        if (d.type === "need-bridge") injectPageScript();
        else if (d.type === "roll") sendToChat(document, rollCommand(d.die, d.value, d.label));
      } catch (e) {}
    });
  } else {
    scan();
    var pending = false;
    var obs = new MutationObserver(function () {
      if (pending) return;
      pending = true;
      setTimeout(function () { pending = false; scan(); }, 300);
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    var n = 0, iv = setInterval(function () { scan(); if (++n > 12) clearInterval(iv); }, 1000);
  }
})();
