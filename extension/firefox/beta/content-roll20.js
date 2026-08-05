/* Content script sur Roll20 : onglet « Fiche JJK » dans le dialogue d'un personnage,
 * qui monte la COQUILLE creator.html ; celle-ci affiche la fiche SERVIE PAR LE SITE
 * (roll20-fiche.html), toujours à jour sans re-signer l'extension. La fiche est
 * enregistrée dans les Attributes Roll20 du personnage (préfixe jjk_), donc partagée à
 * tous les joueurs qui contrôlent ce personnage.
 *
 * Deux rôles selon la frame (le script tourne all_frames) :
 *  - FRAME DU HAUT (app.roll20.net/editor) : injecte roll20-page.js dans le MONDE
 *    PRINCIPAL (là où vit window.d20 / window.Campaign, invisible du content-script) ;
 *    ce page-script lit/écrit les attributs à la demande.
 *  - FRAME DE LA FEUILLE (iframe du dialogue de perso) : pose l'onglet « Fiche JJK »
 *    entre « Feuille de personnage » et « Bio & Info ». Au clic : si le perso a déjà
 *    une fiche JJK -> monte l'iframe de la coquille ; sinon -> bouton « Créer fiche JJK ».
 *
 * Cas particulier : la fiche OUVERTE EN FENÊTRE SÉPARÉE (bouton popout ->
 * app.roll20.net/editor/character/<campagne>/<perso>/...). Roll20 y sert le MÊME
 * document que dans l'iframe du dialogue, mais directement en haut de fenêtre :
 * cette frame cumule alors les deux rôles (onglet + pont). Le tchat et le d20 de
 * la campagne restent dans la fenêtre qui a ouvert le popout : les jets y sont
 * relayés via window.opener (même origine), et le pont d20 se rabat sur le
 * Campaign de l'opener (voir roll20-page.js).
 *
 * La page distante (sous la coquille) dialogue DIRECTEMENT avec le page-script via
 * window.top (postMessage, réponses par ev.source) : ce content-script ne fait que
 * poser l'onglet, interroger has-sheet, et monter l'iframe avec le charId dans le hash.
 *
 * COPIE. Ce fichier existe DEUX FOIS, stable/content-roll20.js et
 * beta/content-roll20.js, et les DEUX sont déclarées au manifeste : un script de
 * contenu ne se charge pas à l'exécution (il faudrait un eval, refusé à la revue
 * Mozilla, ou l'import dynamique, absent du manifeste V2). Les deux copies sont
 * donc injectées dans chaque frame, et celle qui n'est pas du mode s'éteint sans
 * avoir rien fait : voir la garde, tout en bas du fichier. Ce qui appartient à
 * cette copie et à elle seule porte un commentaire en bout de ligne. Il y en a
 * trois, pas une de plus : tout le reste doit rester rigoureusement identique
 * d'un côté et de l'autre.
 *
 * TOUTE CORRECTION DE SÛRETÉ DOIT ÊTRE APPLIQUÉE AUX DEUX COPIES. La liste
 * blanche du canal brut, le repli des sauts de ligne dans les commandes, le
 * relais vers l'opener et le canal « Prendre » vivent désormais en double
 * exemplaire : un correctif posé d'un seul côté laisse le trou grand ouvert de
 * l'autre, et rien ne le signalera. C'est le prix de cette structure, et il se
 * paie ici. scripts/build_extension.py --verifie compare mécaniquement les deux
 * copies hors des lignes marquées : le lancer après toute correction.
 */
// compat : Chrome expose `chrome.*`, Firefox `browser.*`.
if (typeof browser === "undefined") { var browser = chrome; }
(function () {
  "use strict";

  var IS_TOP = (function () { try { return window.top === window; } catch (e) { return true; } })();

  // ---------- ce que cette copie a de propre ----------
  // MODE nomme la copie. Il voyage aussi dans le hash des coquilles (« &m=… »)
  // pour que shell-loader.js n'ait pas à relire le mode dans le stockage : une
  // seconde lecture serait une seconde course, et on a vu l'onglet annoncer
  // « Fiche JJK beta » avec la fiche stable dedans parce que l'utilisateur avait
  // basculé entre les deux lectures. Ici, la copie qui construit l'adresse dicte
  // la coquille, et il n'y a plus rien à accorder.
  //
  // LIBELLE est figé, alors qu'il se posait autrefois après coup : le stockage
  // répondait parfois APRÈS la construction de l'écran « pas encore de fiche »,
  // dont le titre restait « Fiche JJK » même en beta. Plus rien n'est construit
  // avant que le mode soit connu, le défaut disparaît de lui-même.
  var MODE = "beta";                                     // propre à cette copie
  var LIBELLE = "Fiche JJK beta";                        // propre à cette copie

  // Fenêtre popout d'une fiche : la barre d'onglets vit dans le document du HAUT
  // (aucune iframe de dialogue), il faut donc y poser l'onglet nous-mêmes.
  var IS_POPOUT = IS_TOP && /^\/editor\/character\/[^/]+\//.test(location.pathname);

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function norm(s) { return (s || "").replace(/ /g, " ").replace(/\s+/g, " ").trim().toLowerCase(); }

  // ---------- jets au tchat Roll20 (frame du haut) ----------
  // Commande de jet : template par défaut + jet en ligne. Négatifs en « - N ».
  //
  // Le canal « roll » compose sa commande ICI : il ne traverse donc PAS la
  // liste blanche du canal brut, qui ne juge que du texte déjà composé. Or
  // n'importe quel code de la page de la fiche (un mod, qui voyage dans le
  // personnage) peut poster ce message. Ses deux champs libres se replient
  // donc ici : un saut de ligne dans « die » ou « label » ferait sortir une
  // SECONDE ligne au tchat, que Roll20 exécuterait comme une commande à part
  // (« !api », « /w gm »…) au nom du joueur.
  // Les accolades de « die » restent, elles : une macro Roll20 (?{Dé|1d100})
  // est un dé légitime sur ce canal, qui sert les extensions antérieures au
  // canal brut.
  function replie(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  function rollCommand(die, value, label) {
    die = replie(die) || "1d100";
    var v = value >= 0 ? "+ " + value : "- " + (-value);
    var name = replie(label).replace(/[{}]/g, "") || "Jet";
    return "&{template:default} {{name=" + name + "}} {{Jet=[[" + die + " " + v + "]]}}";
  }
  // Carte d'ÉLÉMENT au tchat (passif, arme, avantage…) : template par défaut,
  // une ligne par champ non vide. Accolades et sauts de ligne neutralisés.
  // Une étiquette VIDE donne « {{=texte}} » : la ligne prend toute la largeur
  // de la carte, sans colonne de libellé — c'est ce que la fiche envoie pour
  // les textes libres (effet d'un passif, description d'un art…), dont le
  // libellé n'apprendrait rien que le titre ne dise déjà.
  function sanitizeField(s) { return String(s == null ? "" : s).replace(/[{}]/g, "").replace(/\s+/g, " ").trim(); }
  function sayCommand(title, fields) {
    var cmd = "&{template:default} {{name=" + sanitizeField(title) + "}}";
    (fields || []).forEach(function (f) {
      if (!f) return;
      var k = sanitizeField(f[0]);
      var v = sanitizeField(f[1]);
      if (v) cmd += " {{" + k + "=" + v + "}}";
    });
    return cmd;
  }
  // ---------- liste blanche du canal brut (« chat ») ----------
  // Ce canal envoie au tchat, AU NOM DU JOUEUR, une commande composée côté
  // site. Or la fiche exécute désormais des mods rangés dans le personnage :
  // quiconque l'ouvre exécute leur code. On n'accepte donc que ce que la fiche
  // compose RÉELLEMENT (jjk-fiche.js), c'est-à-dire, dans cet ordre :
  //   - envPrefixe() : rien, « /w gm », ou « /w "Nom du joueur" » ;
  //   - puis cmdJet, cmdCarte ou la carte d'objet donné (avec son lien
  //     « [Prendre](/jjk_take <base64>) ») : toutes commencent par
  //     « &{template:default} ».
  // Le NOM du gabarit reste libre : un gabarit ne fait qu'afficher, et le site
  // doit pouvoir en changer sans re-signer l'extension. Tout le reste (une
  // commande « / » quelconque, un appel d'API « ! », du texte libre) est ignoré
  // en silence.
  // Le saut de ligne est refusé : Roll20 traite chaque ligne comme une commande
  // à part, une seule ligne cachée sortirait de la liste. La fiche n'en produit
  // jamais (ses champs replient les blancs, ses noms sont des <input>).
  var CHAT_CHUCHOTE = /^\/w\s+(?:gm|"[^"]*")\s+/;
  var CHAT_CORPS = /^&\{template:[A-Za-z0-9_-]+\}/;
  function chatAutorise(raw) {
    var s = String(raw == null ? "" : raw);
    if (!s || /[\r\n]/.test(s)) return false;
    return CHAT_CORPS.test(s.replace(CHAT_CHUCHOTE, ""));
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
  // Marqueur DURABLE sur <html> : la balise <script> se retire à l'onload, un
  // getElementById laissait donc chaque need-bridge (une fiche ouverte de plus)
  // réinjecter un pont -> écouteurs en double -> écritures d'attributs en double.
  //
  // Le marqueur data-jjk-bridge est COMMUN aux deux copies, tout comme le
  // window.__jjkBridge du pont lui-même : c'est délibéré. Un marqueur qui
  // porterait le mode laisserait un utilisateur ayant basculé sans recharger sa
  // partie se retrouver avec DEUX ponts dans le monde principal : chaque save
  // écrit deux fois dans les Attributes, chaque has-sheet répond deux fois, et la
  // table des liaisons du pont, qui ne compte que soixante-quatre places, se
  // remplit deux fois plus vite. Le prix de ce choix : le pont déjà posé reste
  // celui de l'ancien mode jusqu'au rechargement de la page.
  //
  // L'adresse est écrite en toutes lettres, jamais assemblée : concaténée, elle
  // deviendrait invisible au contrôle de complétude comme à l'analyse statique
  // d'AMO, qui ne savent lire que des littéraux.
  function injectPageScript() {
    var root = document.documentElement;
    if (!root || root.hasAttribute("data-jjk-bridge")) return;
    root.setAttribute("data-jjk-bridge", "1");
    var s = document.createElement("script");
    s.id = "jjk-page-bridge";
    s.src = browser.runtime.getURL("beta/roll20-page.js");     // propre à cette copie
    s.onload = function () { this.remove(); };   // le listener reste actif, on retire la balise
    (document.head || root).appendChild(s);
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
          // exists:null = perso injoignable POUR L'INSTANT (Campaign pas prêt) :
          // on laisse les relances retenter ; le délai final rendra null au pire.
          if (d.exists === null || d.exists === undefined) return;
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
      // dernier essai : laisser sa réponse arriver avant de conclure null
      else setTimeout(function () {
        if (pendingHas[charId]) { delete pendingHas[charId]; cb(null); }
      }, 700);
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
    if (n) return n.getAttribute("data-characterid");
    // fenêtre popout : pas de dialogue autour, mais l'id est le 2e segment de
    // l'URL (/editor/character/<campagne>/<perso>/...)
    var m = /^\/editor\/character\/[^/]+\/([^/?#]+)/.exec(location.pathname);
    if (m) { try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; } }
    return "";
  }

  // ---------- montage de l'iframe du créateur / bouton de création ----------
  // Mode sombre de Roll20, lu dans le document de la feuille (même document en
  // popout) : marqueur officiel body.sheet-darkmode, variantes connues
  // (darkmode, data-colortheme), puis repli sur la luminance du fond réellement
  // peint (résiste aux évolutions de Roll20 : ce script est figé par la
  // signature). L'état passe à la fiche par le hash (n=1/0) ; c'est ELLE qui
  // tranche selon la préférence de son onglet Options (auto/jour/nuit).
  function parseRgb(s) {
    var m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/.exec(s || "");
    if (!m) return null;
    if (m[4] !== undefined && parseFloat(m[4]) === 0) return null;   // transparent
    return [+m[1], +m[2], +m[3]];
  }
  function detectNight() {
    try {
      var de = document.documentElement, b = document.body;
      var cls = (((de && de.className) || "") + " " + ((b && b.className) || "")).toLowerCase();
      if (cls.indexOf("darkmode") >= 0) return true;
      var ct = (((de && de.getAttribute("data-colortheme")) || "") + " " +
                ((b && b.getAttribute("data-colortheme")) || "")).toLowerCase();
      if (ct.replace(/\s/g, "")) return ct.indexOf("dark") >= 0;
      var rgb = (b && parseRgb(getComputedStyle(b).backgroundColor)) ||
                (de && parseRgb(getComputedStyle(de).backgroundColor));
      if (rgb) return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) < 96;
    } catch (e) {}
    return false;
  }
  // creator.html est PARTAGÉE par les deux parties : rien dedans ne dépend du
  // mode, seule la coquille qu'elle charge en dépend. Le mode lui arrive donc
  // dans le hash (« &m=… »), d'où shell-loader.js le lit sans rien demander au
  // stockage. Le hash entier descend ensuite jusqu'à la page du site, qui ignore
  // ce qu'elle ne connaît pas.
  function creatorFrame(charId) {
    var f = el("iframe", "jjk-creator-frame");
    f.src = browser.runtime.getURL("creator.html") + "#c=" + encodeURIComponent(charId || "") +
            "&n=" + (detectNight() ? "1" : "0") + "&m=" + MODE;
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
    wrap.appendChild(el("div", "jjk-create-title", LIBELLE));
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
  // labels : un libellé ou une liste — l'interface Roll20 est LOCALISÉE selon le
  // compte (« Feuille de personnage » en français, « Character Sheet » en
  // anglais…) : on accepte toutes les variantes connues, sinon l'onglet
  // n'apparaît que pour les comptes en français.
  function labelEls(labels) {
    var wants = (Array.isArray(labels) ? labels : [labels]).map(norm);
    var nodes = document.querySelectorAll("a, span, li");
    var raw = [];
    for (var i = 0; i < nodes.length; i++) if (wants.indexOf(norm(nodes[i].textContent)) >= 0) raw.push(nodes[i]);
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
    labelEls(["Feuille de personnage", "Character Sheet"]).forEach(function (feuille) {
      var bios = labelEls(["Bio & Info", "Bio and Info"]);
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
      a.textContent = LIBELLE;
      tab.appendChild(a);

      var built = false;
      function showOurPane() {
        var panes = paneBox.querySelectorAll(".tab-pane");
        for (var j = 0; j < panes.length; j++) panes[j].style.display = (panes[j] === pane) ? "block" : "none";
        pane.classList.add("jjk-on");   // seule cette classe rend le pane visible (overlay.css)
        for (var k = 0; k < strip.children.length; k++) strip.children[k].classList.remove("active");
        tab.classList.add("active");
        refitFrame();   // l'iframe redevient visible : réajuster sa hauteur au dialogue
      }
      function hideOurPane() { pane.style.display = "none"; pane.classList.remove("jjk-on"); tab.classList.remove("active"); }

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
  function scan() { placeTabs(); }
  function startScan() {
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

  // Fenêtre popout : pas de tchat ici. Le jet repart à la fenêtre qui a ouvert le
  // popout (l'éditeur, même origine) où ce même content script le rejouera.
  // On poste une COPIE (jamais muter ev.data, potentiellement Xray-wrappé) avec
  // relayed:true (un seul rebond, jamais de boucle) et une origine CIBLÉE : si
  // l'utilisateur a fait naviguer la fenêtre principale ailleurs, rien ne part.
  function relayToOpener(d) {
    if (d.relayed) return;
    try {
      var o = window.opener;
      if (!o || o.closed) return;
      o.postMessage({ ns: "jjk", type: d.type, charId: d.charId, die: d.die, value: d.value,
                      label: d.label, title: d.title, fields: d.fields, raw: d.raw, relayed: true },
                    "https://app.roll20.net");
    } catch (e) {}
  }

  // ---------- « Prendre » : le lien d'un objet donné, cliqué dans le tchat ----------
  // La fiche vit dans une iframe : elle ne voit pas le tchat. C'est donc ICI
  // qu'on intercepte le clic sur le lien « [Prendre](/jjk_take <payload>) »
  // composé par la fiche, pour renvoyer le payload — jamais interprété ici —
  // aux fiches ouvertes, qui affichent leur dialogue de réception.
  var TAKE_RE = /^\/jjk_take\s+([A-Za-z0-9+/=_-]+)$/;
  var sheets = [];   // fenêtres de fiches (ou popouts) qui nous ont parlé
  function rememberSheet(w) {
    if (!w) return;
    try { if (sheets.indexOf(w) < 0) sheets.push(w); } catch (e) {}
  }
  function diffuseTake(payload) {
    sheets = sheets.filter(function (w) { try { return w && !w.closed; } catch (e) { return false; } });
    var n = 0;
    sheets.forEach(function (w) {
      try { w.postMessage({ ns: "jjk", type: "take", payload: payload }, "*"); n++; } catch (e) {}
    });
    return n;
  }
  function toast(msg) {
    try {
      var t = el("div", null, msg);
      t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483647;" +
        "background:#2a2620;color:#f3ecdd;font:13px/1.4 sans-serif;padding:8px 14px;border-radius:7px;" +
        "box-shadow:0 4px 14px rgba(0,0,0,.35);max-width:80vw;text-align:center";
      document.body.appendChild(t);
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 4000);
    } catch (e) {}
  }
  // Cet écouteur se posait au chargement du fichier. Il ne peut plus : tant que
  // le stockage n'a pas répondu, cette copie ignore si elle est celle du mode, et
  // une copie éteinte qui écoute déjà les clics n'est pas éteinte du tout. Il est
  // donc posé par demarre(), comme tous les autres effets.
  function posePriseTake() {
    document.addEventListener("click", function (e) {
      var a = e.target && (e.target.tagName === "A" ? e.target
              : (e.target.closest ? e.target.closest("a") : null));
      if (!a) return;
      var m = TAKE_RE.exec((a.getAttribute("href") || "").trim());
      if (!m) return;
      e.preventDefault(); e.stopPropagation();
      if (!diffuseTake(m[1])) {
        toast("Ouvre ta fiche JJK (onglet « Fiche JJK » du personnage), puis reclique « Prendre ».");
      }
    }, true);
  }

  // ---------- panneau flottant : le plateau de Narration ----------
  // Un panneau posé DANS la partie, en haut à gauche, que tous les joueurs
  // voient : les jetons de narration s'y poussent d'une place à l'autre. Le
  // contenu est servi par le site (roll20-narration.html) à travers la coquille
  // générique panneau.html : tout ce qui suit est un CHÂSSIS, et rien d'autre —
  // se déplacer, se redimensionner, se replier, se souvenir. Le plateau
  // lui-même peut donc changer autant qu'il voudra sans re-signature.
  //
  // La place par défaut est mesurée sur l'interface de Roll20 : la barre
  // d'outils tient la colonne x ∈ [20, 52], et la bande y ∈ [20, 54] revient
  // aux actions de jeton, qui apparaissent dès qu'un jeton est sélectionné. Le
  // panneau se pose donc juste à côté et juste en dessous — et se déplace de
  // toute façon à la souris, sa place étant retenue par navigateur.
  var IS_EDITEUR = IS_TOP && !IS_POPOUT && /^\/editor(\/|$)/.test(location.pathname);
  // La page servie et la clé de rangement portent le nom du panneau : un
  // deuxième panneau, un jour, n'aura pas à déloger la place et la taille de
  // celui-ci — ni à faire re-signer quoi que ce soit pour ça.
  //
  // Ces deux clés restent COMMUNES aux deux copies, et c'est un choix : la place
  // du panneau est une préférence d'affichage, la même main la déplace des deux
  // côtés, et la suffixer par mode ferait oublier au plateau où il était posé à
  // chaque bascule. PAN_ACTIF, lui, DOIT rester commun : le popup n'a qu'une
  // case, et une clé par mode ferait qu'éteindre le plateau ne l'éteindrait que
  // d'un côté.
  var PAN_PAGE = "roll20-narration.html";
  var PAN_CLE = "jjkPanneau:" + PAN_PAGE;
  var PAN_ACTIF = "jjkPanneauActif";   // interrupteur du popup (absent = allumé)
  var PAN_DEF = { ouvert: false, x: 62, y: 60, w: 380, h: 330 };
  var PAN_MIN_W = 260, PAN_MIN_H = 190;
  var panEtat = null, panBoite = null, panCorps = null, panBtn = null, panTitre = null, panEcrit = null;

  function panNombre(v, def) { var n = parseInt(v, 10); return isFinite(n) ? n : def; }
  // La largeur se borne AVANT l'abscisse, et l'abscisse tient compte de la
  // largeur retenue : les borner séparément laissait un panneau large posé au
  // bord droit déborder de la fenêtre (état hérité d'un grand écran, fenêtre
  // rétrécie ensuite). En hauteur on ne retient que la barre de titre : un
  // panneau plus haut que la fenêtre doit pouvoir dépasser par le bas, sinon il
  // remonterait tout seul dès qu'on réduit la fenêtre.
  function panBorne(e) {
    var vw = window.innerWidth || 1200, vh = window.innerHeight || 800;
    e.w = Math.max(PAN_MIN_W, Math.min(e.w, Math.max(PAN_MIN_W, vw - 20)));
    e.h = Math.max(PAN_MIN_H, Math.min(e.h, Math.max(PAN_MIN_H, vh - 20)));
    e.x = Math.max(0, Math.min(e.x, Math.max(0, vw - e.w)));
    e.y = Math.max(0, Math.min(e.y, Math.max(0, vh - 28)));
    return e;
  }
  // L'état ne vaut pas une écriture par pixel parcouru : on attend la fin du
  // geste (le storage est asynchrone, et Roll20 n'a pas besoin de ça).
  function panRange() {
    if (panEcrit) clearTimeout(panEcrit);
    panEcrit = setTimeout(function () {
      panEcrit = null;
      try {
        var o = {};
        o[PAN_CLE] = panEtat;
        browser.storage.local.set(o);
      } catch (e) {}
    }, 400);
  }
  function panApplique() {
    if (!panBoite) return;
    panBoite.style.left = panEtat.x + "px";
    panBoite.style.top = panEtat.y + "px";
    // replié, le panneau se réduit à son étiquette : une barre de 380 px de
    // large pour un seul mot occuperait le haut de la carte pour rien
    panBoite.style.width = panEtat.ouvert ? panEtat.w + "px" : "auto";
    panBoite.style.height = panEtat.ouvert ? panEtat.h + "px" : "auto";
    panBoite.classList.toggle("jjk-panneau-replie", !panEtat.ouvert);
    if (panBtn) {
      panBtn.textContent = panEtat.ouvert ? "–" : "+";
      panBtn.title = panEtat.ouvert ? "Replier le plateau" : "Déplier le plateau";
    }
  }
  // L'iframe est créée UNE FOIS et ne meurt plus : au repli elle est masquée,
  // pas détruite. Détruire une fenêtre et en refaire une à chaque pli mangeait
  // une place dans la table des liaisons du pont (source <-> personnage), qui
  // n'en compte que soixante-quatre : au bout d'une soirée de plis, le pont
  // refusait tout, plateau ET fiches. Masquée, elle voit sa fenêtre tomber à
  // zéro pixel, ce que la page distante reconnaît pour cesser d'interroger
  // Roll20 — cette décision-là lui appartient, et reste donc modifiable sans
  // signature.
  function panRemplit() {
    if (!panCorps || panCorps.firstChild) return;
    var f = el("iframe", "jjk-panneau-frame");
    f.src = browser.runtime.getURL("panneau.html") +
            "#p=" + PAN_PAGE + "&n=" + (detectNight() ? "1" : "0") + "&m=" + MODE;
    f.setAttribute("allow", "clipboard-write");
    panCorps.appendChild(f);
    // pas d'injection du pont ici : la page distante le réclame elle-même
    // (need-bridge), et le fichier tient à ne rien injecter de son propre chef
  }
  function panOuvre(ouvert) {
    panEtat.ouvert = !!ouvert;
    panApplique();
    if (panEtat.ouvert) panRemplit();
    panRange();
  }
  // Un geste (déplacement ou redimensionnement) se fait à la CAPTURE DE
  // POINTEUR : la page de Roll20 est pleine d'iframes (chaque dialogue de
  // personnage en est une), et des écouteurs posés sur le document perdaient le
  // pointeur dès qu'il passait au-dessus de l'une d'elles. Le geste ne se
  // terminait alors jamais : le panneau restait inerte, sans que rien ne le
  // dise. La capture suit le pointeur partout, y compris hors de la fenêtre, et
  // le relâchement revient toujours.
  var panGesteEnCours = false;
  function panGeste(ev, bouge) {
    if (panGesteEnCours || (ev.button != null && ev.button !== 0)) return;
    panGesteEnCours = true;
    var cible = ev.currentTarget;
    var x0 = ev.clientX, y0 = ev.clientY;
    var e0 = { x: panEtat.x, y: panEtat.y, w: panEtat.w, h: panEtat.h };
    panBoite.classList.add("jjk-panneau-geste");
    function suit(m) {
      var dx = m.clientX - x0, dy = m.clientY - y0;
      if (bouge) { panEtat.x = e0.x + dx; panEtat.y = e0.y + dy; }
      else { panEtat.w = e0.w + dx; panEtat.h = e0.h + dy; }
      panBorne(panEtat);
      panApplique();
    }
    function fin() {
      if (!panGesteEnCours) return;
      panGesteEnCours = false;
      cible.removeEventListener("pointermove", suit);
      cible.removeEventListener("pointerup", fin);
      cible.removeEventListener("pointercancel", fin);
      window.removeEventListener("blur", fin);
      try { cible.releasePointerCapture(ev.pointerId); } catch (e) {}
      panBoite.classList.remove("jjk-panneau-geste");
      panRange();
    }
    try { cible.setPointerCapture(ev.pointerId); } catch (e) {}
    cible.addEventListener("pointermove", suit);
    cible.addEventListener("pointerup", fin);
    cible.addEventListener("pointercancel", fin);
    window.addEventListener("blur", fin);
    ev.preventDefault();
    ev.stopPropagation();
  }
  function panMonte(etat) {
    if (document.getElementById("jjk-panneau")) return;
    panEtat = panBorne(etat);
    panBoite = el("div", "jjk-panneau");
    panBoite.id = "jjk-panneau";

    var tete = el("div", "jjk-panneau-tete");
    panTitre = el("span", "jjk-panneau-titre", "Narration");
    tete.appendChild(panTitre);
    panBtn = el("button", "jjk-panneau-btn", "–");
    panBtn.type = "button";
    panBtn.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); });
    panBtn.addEventListener("click", function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      panOuvre(!panEtat.ouvert);
    });
    tete.appendChild(panBtn);
    tete.addEventListener("pointerdown", function (ev) { panGeste(ev, true); });
    panBoite.appendChild(tete);

    panCorps = el("div", "jjk-panneau-corps");
    panBoite.appendChild(panCorps);

    var grip = el("div", "jjk-panneau-grip");
    grip.title = "Redimensionner";
    grip.addEventListener("pointerdown", function (ev) { panGeste(ev, false); });
    panBoite.appendChild(grip);

    document.body.appendChild(panBoite);
    panApplique();
    // Rouvert d'une session à l'autre : on attend que la partie ait FINI de
    // charger avant de monter l'iframe. C'est un événement, pas un nombre de
    // millisecondes choisi au doigt mouillé — et le pont, lui, n'est plus posé
    // d'ici du tout.
    if (panEtat.ouvert) {
      if (document.readyState === "complete") setTimeout(panRemplit, 400);
      else window.addEventListener("load", function () { setTimeout(panRemplit, 400); });
    }
    window.addEventListener("resize", function () { panBorne(panEtat); panApplique(); });
  }
  function panDefaut() {
    return { ouvert: PAN_DEF.ouvert, x: PAN_DEF.x, y: PAN_DEF.y, w: PAN_DEF.w, h: PAN_DEF.h };
  }
  function panDemarre() {
    try {
      browser.storage.local.get([PAN_CLE, PAN_ACTIF]).then(function (r) {
        // l'interrupteur du popup : une partie Roll20 qui n'a rien à voir avec
        // JJK ne doit pas se voir imposer une étiquette à demeure
        if (r && r[PAN_ACTIF] === false) return;
        var e = (r && r[PAN_CLE]) || {};
        panMonte({
          ouvert: !!e.ouvert,
          x: panNombre(e.x, PAN_DEF.x), y: panNombre(e.y, PAN_DEF.y),
          w: panNombre(e.w, PAN_DEF.w), h: panNombre(e.h, PAN_DEF.h)
        });
      }, function () { panMonte(panDefaut()); });
    } catch (e) {
      panMonte(panDefaut());
    }
  }

  // ---------- démarrage : tout ce qui a un effet passe par ici ----------
  // Rien de ce fichier ne s'exécute avant que la garde n'ait appelé cette
  // fonction : ni écouteur, ni écriture dans le DOM, ni message posté. C'est la
  // condition pour que la copie qui n'est pas du mode ne laisse aucune trace.
  function demarre() {
    posePriseTake();
    if (IS_TOP) {
      // FRAME DU HAUT : on n'injecte RIEN au chargement (l'injection main-world gênait
      // l'ouverture des fiches Roll20). On attend que l'utilisateur ouvre l'onglet
      // Fiche JJK (depuis une fiche déjà ouverte) : il pose alors le pont via need-bridge.
      // Reçoit aussi les JETS de la fiche -> tchat Roll20 (le tchat vit dans cette frame,
      // sauf popout : relais vers l'opener).
      window.addEventListener("message", function (ev) {
        try {
          var d = ev.data;
          if (!d || d.ns !== "jjk") return;
          // « take » descend vers les fiches : ne jamais retenir sa source comme
          // destinataire, sinon deux fenêtres se le renverraient sans fin
          if (d.type === "take") {
            if (d.payload) diffuseTake(d.payload);
            return;
          }
          rememberSheet(ev.source);
          // Le panneau règle sa propre taille : c'est LA page servie par le site
          // qui sait ce qu'elle a à montrer, et le châssis ne doit pas devenir la
          // pièce qu'il faut re-signer pour élargir un plateau. Les valeurs sont
          // bornées ici, comme tout ce qui vient d'une page.
          if (d.type === "panneau") {
            if (!panEtat) return;
            // le titre appartient à la page : elle peut se renommer sans qu'on
            // touche à l'extension
            if (d.titre != null && panTitre) panTitre.textContent = String(d.titre).slice(0, 40);
            if (d.w != null) panEtat.w = panNombre(d.w, panEtat.w);
            if (d.h != null) panEtat.h = panNombre(d.h, panEtat.h);
            panBorne(panEtat);
            if (d.replie != null) { panOuvre(!d.replie); return; }
            panApplique();
            panRange();
            return;
          }
          if (d.type === "need-bridge") injectPageScript();
          else if (d.type === "roll") {
            if (!sendToChat(document, rollCommand(d.die, d.value, d.label)) && IS_POPOUT) relayToOpener(d);
          } else if (d.type === "say") {
            if (!sendToChat(document, sayCommand(d.title, d.fields)) && IS_POPOUT) relayToOpener(d);
          } else if (d.type === "chat") {
            // commande COMPOSÉE par la fiche (carte d'objet donné + lien « Prendre ») :
            // envoyée telle quelle, sans rien en réécrire ici — son format vit
            // côté site, qui peut donc évoluer sans re-signer l'extension. Seule
            // la FORME est vérifiée (liste blanche), jamais le contenu.
            var brut = String(d.raw || "");
            if (!chatAutorise(brut)) return;   // hors liste blanche : rien ne part, ni ici ni à l'opener
            if (!sendToChat(document, brut) && IS_POPOUT) relayToOpener(d);
          }
        } catch (e) {}
      });
      // popout : la barre d'onglets de la fiche vit dans CE document, on y pose l'onglet.
      if (IS_POPOUT) startScan();
      // la partie elle-même (et elle seule) reçoit le panneau flottant
      if (IS_EDITEUR) panDemarre();
    } else {
      startScan();
    }
  }

  // ---------- garde de mode ----------
  // Les deux copies de ce fichier sont injectées dans CHAQUE frame de Roll20 :
  // le manifeste les déclare toutes les deux, et rien ne permet d'en charger une
  // seule à l'exécution. C'est donc ici, et nulle part ailleurs, que la copie qui
  // n'est pas du mode s'arrête.
  //
  // Le mode ne vit que dans browser.storage.local, dont la lecture est
  // ASYNCHRONE dans un script de contenu : il n'existe aucune lecture synchrone
  // équivalente. Une garde écrite en tête de fichier aurait donc, au mieux, déjà
  // laissé passer quelque chose. C'est pourquoi tout ce qui a un effet est
  // enfermé dans demarre(), appelé d'ici seulement.
  //
  // Un rejet du stockage désigne explicitement le mode stable. Sans ce choix,
  // les DEUX copies se tairaient et l'onglet disparaîtrait sans un mot ; la
  // partie publiée est celle qui doit survivre à une panne.
  function garde() {
    try {
      browser.storage.local.get("jjkBeta").then(
        function (r) { if ((r && r.jjkBeta ? "beta" : "stable") === MODE) reclame(); },
        function () { if (MODE === "stable") reclame(); }
      );
    } catch (e) {
      if (MODE === "stable") reclame();
    }
  }
  // Verrou de frame. Les deux copies partagent le monde isolé, donc cet objet
  // window (un expando de script de contenu reste invisible de la page, comme le
  // window.__jjkBridge du pont l'est du monde isolé). Si les deux se réveillaient
  // ensemble (stockage incohérent, extension rechargée, bascule pendant la
  // lecture), la première arrivée prend la frame et la seconde se tait. Sans ce
  // verrou, deux écouteurs « message » dans la frame du haut enverraient chaque
  // jet DEUX FOIS au tchat : le site poste vers window.top avec « * », tous les
  // écouteurs reçoivent le même message, et sendToChat ne dédoublonne rien.
  //
  // Deuxième ligne de défense, gratuite et volontairement conservée : les
  // marqueurs de DOM portent les MÊMES noms dans les deux copies (classe
  // .jjk-tab, id #jjk-panneau, attribut data-jjk-bridge), si bien que placeTabs
  // et panMonte abandonnent tout seuls devant le travail de l'autre copie.
  function reclame() {
    try {
      if (window.__jjkRoll20) return;   // une copie tient déjà cette frame
      window.__jjkRoll20 = MODE;
    } catch (e) {}
    demarre();
  }
  garde();
})();
