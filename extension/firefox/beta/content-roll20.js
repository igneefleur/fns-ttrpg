/* Content script sur Roll20 : onglet « Fiche MIA » dans le dialogue d'un personnage,
 * qui monte la COQUILLE creator.html ; celle-ci affiche la fiche SERVIE PAR LE SITE
 * (roll20-fiche.html), toujours à jour sans re-signer l'extension. La fiche est
 * enregistrée dans les Attributes Roll20 du personnage (préfixe mia_), donc partagée à
 * tous les joueurs qui contrôlent ce personnage.
 *
 * Deux rôles selon la frame (le script tourne all_frames) :
 *  - FRAME DU HAUT (app.roll20.net/editor) : injecte roll20-page.js dans le MONDE
 *    PRINCIPAL (là où vit window.d20 / window.Campaign, invisible du content-script) ;
 *    ce page-script lit/écrit les attributs à la demande.
 *  - FRAME DE LA FEUILLE (iframe du dialogue de perso) : pose l'onglet « Fiche MIA »
 *    entre « Feuille de personnage » et « Bio & Info ». Au clic : si le perso a déjà
 *    une fiche MIA -> monte l'iframe de la coquille ; sinon -> bouton « Créer fiche MIA ».
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
 * RÉGLAGES. Ce fichier ne fait que LIRE le stockage, jamais écrire : le popup
 * est le seul poste d'aiguillage. Il lit miaOff (éteinte : rien ne se réveille),
 * miaBeta (quelle moitié parle) et miaNuit (« auto » | « jour » | « nuit », qui
 * décide du n=1/0 envoyé aux pages du site et de la couleur de nos boîtes).
 * Tout cela se lit à la garde, tout en bas, où l'inventaire est détaillé.
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
  // « Fiche MIA beta » avec la fiche stable dedans parce que l'utilisateur avait
  // basculé entre les deux lectures. Ici, la copie qui construit l'adresse dicte
  // la coquille, et il n'y a plus rien à accorder.
  //
  // LIBELLE est figé, alors qu'il se posait autrefois après coup : le stockage
  // répondait parfois APRÈS la construction de l'écran « pas encore de fiche »,
  // dont le titre restait « Fiche MIA » même en beta. Plus rien n'est construit
  // avant que le mode soit connu, le défaut disparaît de lui-même.
  var MODE = "beta";                                     // propre à cette copie
  var LIBELLE = "Fiche MIA beta";                        // propre à cette copie

  // Fenêtre popout d'une fiche : la barre d'onglets vit dans le document du HAUT
  // (aucune iframe de dialogue), il faut donc y poser l'onglet nous-mêmes.
  var IS_POPOUT = IS_TOP && /^\/editor\/character\/[^/]+\//.test(location.pathname);

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

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
  // compose RÉELLEMENT (mia-fiche.js), c'est-à-dire, dans cet ordre :
  //   - envPrefixe() : rien, « /w gm », ou « /w "Nom du joueur" » ;
  //   - puis cmdJet, cmdCarte ou la carte d'objet donné (avec son lien
  //     « [Prendre](/mia_take <base64>) ») : toutes commencent par
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
  // Le marqueur data-mia-bridge est COMMUN aux deux copies, tout comme le
  // window.__miaBridge du pont lui-même : c'est délibéré. Un marqueur qui
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
    if (!root || root.hasAttribute("data-mia-bridge")) return;
    root.setAttribute("data-mia-bridge", "1");
    var s = document.createElement("script");
    s.id = "mia-page-bridge";
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
        if (!d || d.ns !== "mia") return;   // ignore tout ce qui n'est pas à nous
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
  function requestBridge() { try { window.top.postMessage({ ns: "mia", type: "need-bridge" }, "*"); } catch (e) {} }
  // interroge has-sheet, avec relances (le page-script vient peut-être d'être injecté)
  function queryHasSheet(charId, cb) {
    ensureHasListener();
    if (!charId) { cb(null); return; }
    pendingHas[charId] = cb;
    var tries = 0;
    (function send() {
      if (!pendingHas[charId]) return;   // déjà répondu
      tries++;
      try { window.top.postMessage({ ns: "mia", type: "has-sheet", charId: charId }, "*"); } catch (e) {}
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
  // signature). Ce n'est plus le dernier mot : c'est l'INDICE que suit le
  // réglage « auto » (voir nuitEffective juste dessous).
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

  // ---------- jour / nuit : le réglage du popup, puis Roll20 ----------
  // miaNuit vaut « auto » (défaut), « jour » ou « nuit ». Il est lu UNE FOIS,
  // dans la même lecture de stockage que le mode (voir garde) : une seconde
  // lecture serait une seconde course, et on a déjà vu ce que ça donne quand
  // deux lectures se contredisent (l'onglet annonçait « Fiche MIA beta » avec
  // la fiche stable dedans).
  //
  // CE QUI PART DANS LE HASH RESTE « n=1/0 », et ce choix a une raison précise.
  // Le paramètre n dit aux pages servies par le site DE QUELLE COULEUR ELLES
  // DOIVENT ÊTRE ; jusqu'ici il ne rapportait que le thème de Roll20, il
  // rapporte maintenant le thème VOULU, c'est-à-dire l'ordre de l'utilisateur
  // quand il en a donné un, et le thème de Roll20 sinon. Le faire disparaître
  // en mode « auto », comme on l'a envisagé, aurait coûté la seule chose que
  // l'extension sait faire de mieux que le site : sans indice, l'« auto » de la
  // fiche retombe sur prefers-color-scheme, donc sur le thème du NAVIGATEUR, et
  // une partie Roll20 en sombre s'ouvrirait en clair sur un navigateur en clair.
  // Aucune page du site n'a besoin d'être touchée :
  // elles lisent n comme avant.
  //
  // La fiche garde le dernier mot par sa propre préférence (onglet Options,
  // localStorage mia-r20-night) : un joueur qui a explicitement mis SA fiche en
  // jour la garde en jour. C'est voulu, le réglage le plus précis gagne.
  var NUIT_ORDRE = "auto";
  function normNuit(v) { return v === "jour" || v === "nuit" ? v : "auto"; }
  function nuitEffective() {
    if (NUIT_ORDRE === "nuit") return true;
    if (NUIT_ORDRE === "jour") return false;
    return detectNight();
  }
  // Nos boîtes portent leur nuit sur elles-mêmes (.mia-nuit), jamais sur la
  // racine : overlay.css est injectée dans TOUTES les frames de Roll20, et une
  // classe posée sur <html> serait une main sur l'interface d'un autre site.
  function poseNuit(elt) {
    if (elt) elt.classList.toggle("mia-nuit", nuitEffective());
    return elt;
  }
  // creator.html est PARTAGÉE par les deux parties : rien dedans ne dépend du
  // mode, seule la coquille qu'elle charge en dépend. Le mode lui arrive donc
  // dans le hash (« &m=… »), d'où shell-loader.js le lit sans rien demander au
  // stockage. Le hash entier descend ensuite jusqu'à la page du site, qui ignore
  // ce qu'elle ne connaît pas.
  function creatorFrame(charId) {
    var f = el("iframe", "mia-creator-frame");
    f.src = browser.runtime.getURL("creator.html") + "#c=" + encodeURIComponent(charId || "") +
            "&n=" + (nuitEffective() ? "1" : "0") + "&m=" + MODE;
    f.setAttribute("allow", "clipboard-write");
    // le fond de l'iframe se voit AVANT que la fiche distante ait peint : clair
    // sous une fiche sombre, cela faisait un éclair blanc à chaque ouverture
    poseNuit(f);
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
    var wrap = poseNuit(el("div", "mia-create"));
    wrap.appendChild(el("div", "mia-create-title", LIBELLE));
    wrap.appendChild(el("p", "mia-create-msg",
      exists === null
        ? "Roll20 n'a pas encore répondu (personnage non prêt). Ouvrir la fiche MIA :"
        : "Ce personnage n'a pas encore de fiche MIA."));
    var btn = el("button", "mia-create-btn", exists === null ? "Ouvrir la fiche MIA" : "Créer fiche MIA");
    btn.type = "button";
    btn.addEventListener("click", function () { fillCreator(host, charId); });
    wrap.appendChild(btn);
    host.appendChild(wrap);
  }
  // Décide quoi afficher dans l'hôte selon l'existence d'une fiche.
  function populate(host, charId) {
    host.innerHTML = "";
    host.appendChild(poseNuit(el("div", "mia-create", "Chargement…")));
    queryHasSheet(charId, function (exists) {
      if (exists === true) fillCreator(host, charId);
      else fillButton(host, charId, exists);   // false = pas de fiche ; null = inconnu
    });
  }

  // ---------- pose de l'onglet dans la barre d'onglets du dialogue ----------
  // LA BARRE SE RECONNAÎT À SES ONGLETS, JAMAIS À LEURS NOMS.
  //
  // L'onglet se posait entre « Feuille de personnage » et « Bio & Info »,
  // trouvés par leur libellé. Trois défauts, et le troisième est le pire :
  // l'interface de Roll20 est LOCALISÉE selon le compte, donc il fallait
  // connaître d'avance la traduction de chaque langue ; les libellés changent
  // au gré de Roll20 ; et surtout, une campagne SANS feuille de personnage n'a
  // pas d'onglet « Feuille de personnage » du tout — l'onglet ne se posait
  // alors jamais, sans le moindre message.
  //
  // On repère donc la barre par les liens « data-tab » que Roll20 y pose, quels
  // qu'ils disent, et on prend la DEUXIÈME PLACE. Aucun libellé n'est lu, aucun
  // onglet particulier n'a besoin d'exister.
  function barresOnglets() {
    var liens = document.querySelectorAll("a[data-tab]");
    var barres = [];
    for (var i = 0; i < liens.length; i++) {
      var item = liens[i].parentNode;
      var strip = item && item.parentNode;
      if (!strip || strip === document.body || strip === document.documentElement) continue;
      // une barre d'onglets est courte : au-delà, on est tombé sur un conteneur
      // qui n'en est pas une, et notre onglet s'y perdrait
      if (strip.children.length > 24) continue;
      if (barres.indexOf(strip) < 0) barres.push(strip);
    }
    return barres;
  }
  // Les ITEMS d'une barre, c'est-à-dire ceux qui portent vraiment un onglet :
  // Roll20 glisse parfois autre chose entre eux, et compter les enfants nus
  // poserait le nôtre au mauvais rang.
  function itemsOnglets(strip) {
    var out = [];
    for (var i = 0; i < strip.children.length; i++) {
      var c = strip.children[i];
      if (c.querySelector && c.querySelector("a[data-tab]")) out.push(c);
    }
    return out;
  }
  function dialogOf(node) {
    return node.closest(".ui-dialog") || node.closest("[class*='dialog']") || node.offsetParent || node.parentElement;
  }
  // CE DIALOGUE EST-IL CELUI D'UN PERSONNAGE ? La question ne se posait pas tant
  // qu'on cherchait l'onglet « Feuille de personnage » : le trouver répondait
  // déjà oui. Maintenant qu'on ne lit plus aucun libellé, n'importe quelle barre
  // d'onglets de Roll20 — celle des réglages, celle d'un mod — recevrait notre
  // onglet, et il s'ouvrirait sur la fiche d'un personnage qui n'est pas là.
  //
  // On exige donc que le dialogue PORTE LUI-MÊME la marque, plutôt que de se
  // contenter du charId : celui-ci se rabat en dernier recours sur le premier
  // [data-characterid] du document, c'est-à-dire sur un AUTRE dialogue resté
  // ouvert à côté.
  function estDialoguePersonnage(dialog) {
    try {
      var fe = window.frameElement;
      if (fe && fe.closest && fe.closest(".characterdialog")) return true;
    } catch (e) {}
    if (dialog && dialog.matches && dialog.matches(".characterdialog, [data-characterid]")) return true;
    if (dialog && dialog.closest && dialog.closest(".characterdialog, [data-characterid]")) return true;
    if (dialog && dialog.querySelector && dialog.querySelector("[data-characterid]")) return true;
    // fenêtre popout : pas de dialogue autour, l'adresse fait foi
    return /^\/editor\/character\//.test(location.pathname);
  }
  function contentBoxOf(dialog, strip) {
    return (dialog.querySelector && dialog.querySelector(".tab-content")) || strip.nextElementSibling;
  }

  function placeTabs() {
    var placed = 0;
    barresOnglets().forEach(function (strip) {
      var items = itemsOnglets(strip);
      // Le PREMIER onglet natif sert de patron : on lui emprunte sa balise et
      // ses classes, pour que le nôtre ait exactement le même aspect et le même
      // violet une fois actif. Sans lui, rien à cloner : on passe.
      var modele = items[0];
      if (!modele) return;
      var dialog = dialogOf(strip);
      if (!estDialoguePersonnage(dialog)) return;
      var charId = charIdOfFrame(dialog);

      if (strip.querySelector(".mia-tab")) { placed++; return; }   // déjà là

      var contentBox = contentBoxOf(dialog, strip);
      // conteneur des panes = parent d'un pane natif (là où Roll20 les place)
      var nativePane = (dialog && dialog.querySelector(".tab-pane")) || document.querySelector(".tab-pane");
      var paneBox = (nativePane && nativePane.parentNode) || contentBox;
      if (!paneBox) return;

      // On travaille AVEC le système d'onglets de Jumpgate (source vérifiée) :
      //   bindTabEvents() fait, pour chaque `.nav li a`,
      //     allTabs[a.data-tab] = find('.tab-pane.'+data-tab)[0]; allTabs[...].style...
      //   -> si le pane manque, allTabs[...] est undefined et Roll20 PLANTE (fiche
      //   qui ne s'ouvre plus). On crée donc TOUJOURS le pane `.tab-pane.miafiche`
      //   AVANT de poser l'onglet `<a data-tab="miafiche">` : Roll20 l'enregistre et
      //   le gère nativement (affichage + onglet actif violet).
      var pane = paneBox.querySelector(".tab-pane.miafiche");
      if (!pane) {
        pane = el("div", "tab-pane miafiche mia-pane");
        pane.style.display = "none";
        paneBox.appendChild(pane);
      }

      // vrai onglet, cloné des onglets natifs (styles Roll20 : look + actif violet)
      var tab = document.createElement(modele.tagName || "li");
      tab.className = ((modele.className || "").replace(/\b(active|ui-tabs-active|ui-state-active|chosen)\b/g, "").trim() + " mia-tab").trim();
      var nativeA = modele.querySelector("a");
      var a = document.createElement("a");
      if (nativeA && nativeA.className) a.className = nativeA.className;
      a.setAttribute("href", "javascript:void(0);");
      a.setAttribute("data-tab", "miafiche");
      a.textContent = LIBELLE;
      tab.appendChild(a);

      var built = false;
      function showOurPane() {
        var panes = paneBox.querySelectorAll(".tab-pane");
        for (var j = 0; j < panes.length; j++) panes[j].style.display = (panes[j] === pane) ? "block" : "none";
        pane.classList.add("mia-on");   // seule cette classe rend le pane visible (overlay.css)
        for (var k = 0; k < strip.children.length; k++) strip.children[k].classList.remove("active");
        tab.classList.add("active");
        refitFrame();   // l'iframe redevient visible : réajuster sa hauteur au dialogue
      }
      function hideOurPane() { pane.style.display = "none"; pane.classList.remove("mia-on"); tab.classList.remove("active"); }

      // On gère nous-mêmes l'affichage (fiable quel que soit le moment où bindTabEvents
      // s'exécute) et on bloque le gestionnaire délégué de Roll20 pour NOTRE onglet.
      a.addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        if (!built) { built = true; requestBridge(); populate(pane, charId); }
        showOurPane();
      });
      // clic sur un onglet natif -> on masque le nôtre (Roll20 affiche le sien)
      strip.addEventListener("click", function (ev) {
        var na = ev.target.closest && ev.target.closest("a[data-tab]");
        if (na && na.getAttribute("data-tab") !== "miafiche") hideOurPane();
      }, true);

      // DEUXIÈME PLACE : devant l'onglet qui occupe le rang 2. S'il n'y en a
      // qu'un, insertBefore(tab, undefined) ajoute à la fin — et le deuxième
      // rang, c'est justement la fin.
      strip.insertBefore(tab, items[1] || null);
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
      o.postMessage({ ns: "mia", type: d.type, charId: d.charId, die: d.die, value: d.value,
                      label: d.label, title: d.title, fields: d.fields, raw: d.raw, relayed: true },
                    "https://app.roll20.net");
    } catch (e) {}
  }

  // ---------- « Prendre » : le lien d'un objet donné, cliqué dans le tchat ----------
  // La fiche vit dans une iframe : elle ne voit pas le tchat. C'est donc ICI
  // qu'on intercepte le clic sur le lien « [Prendre](/mia_take <payload>) »
  // composé par la fiche, pour renvoyer le payload — jamais interprété ici —
  // aux fiches ouvertes, qui affichent leur dialogue de réception.
  var TAKE_RE = /^\/mia_take\s+([A-Za-z0-9+/=_-]+)$/;
  var sheets = [];   // fenêtres de fiches (ou popouts) qui nous ont parlé
  function rememberSheet(w) {
    if (!w) return;
    try { if (sheets.indexOf(w) < 0) sheets.push(w); } catch (e) {}
  }
  function diffuseTake(payload) {
    sheets = sheets.filter(function (w) { try { return w && !w.closed; } catch (e) { return false; } });
    var n = 0;
    sheets.forEach(function (w) {
      try { w.postMessage({ ns: "mia", type: "take", payload: payload }, "*"); n++; } catch (e) {}
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
        toast("Ouvre ta fiche MIA (onglet « Fiche MIA » du personnage), puis reclique « Prendre ».");
      }
    }, true);
  }

  // ---------- le seul réglage relu en cours de partie : la nuit ----------
  // Une nuit qui réclame de recharger la partie n'est pas une nuit : on l'allume
  // le soir venu, entre deux jets, et l'écran doit suivre. Elle est aussi le
  // seul réglage qu'on peut appliquer à chaud SANS RIEN DÉMONTER : repeindre
  // n'enlève ni un onglet, ni un écouteur, ni un pont, et ne peut donc pas
  // laisser Roll20 dans un état où il n'était pas prévu.
  //
  // L'extinction (miaOff) n'est volontairement PAS relue ici : elle démonte, et
  // démonter à chaud est ce qui casse (voir la garde, tout en bas, pour ce que
  // « éteindre » peut et ne peut pas).
  //
  // La fiche servie par le site n'est pas repeinte : ce serait la RECHARGER
  // sous les doigts du joueur, au milieu d'une saisie. Elle a son propre
  // réglage dans son onglet Options, et prendra celui du popup à sa prochaine
  // ouverture.
  function repeintTout() {
    var n = document.querySelectorAll(".mia-create, .mia-creator-frame");
    for (var i = 0; i < n.length; i++) poseNuit(n[i]);
  }
  function ecouteNuit() {
    try {
      browser.storage.onChanged.addListener(function (ch, zone) {
        if (zone && zone !== "local") return;
        if (!ch || !ch.miaNuit) return;
        var v = normNuit(ch.miaNuit.newValue);
        if (v === NUIT_ORDRE) return;
        NUIT_ORDRE = v;
        repeintTout();
      });
    } catch (e) {}
  }

  // ---------- démarrage : tout ce qui a un effet passe par ici ----------
  // Rien de ce fichier ne s'exécute avant que la garde n'ait appelé cette
  // fonction : ni écouteur, ni écriture dans le DOM, ni message posté. C'est la
  // condition pour que la copie qui n'est pas du mode, ou l'extension éteinte,
  // ne laisse aucune trace.
  function demarre() {
    ecouteNuit();
    posePriseTake();
    if (IS_TOP) {
      // FRAME DU HAUT : on n'injecte RIEN au chargement (l'injection main-world gênait
      // l'ouverture des fiches Roll20). On attend que l'utilisateur ouvre l'onglet
      // Fiche MIA (depuis une fiche déjà ouverte) : il pose alors le pont via need-bridge.
      // Reçoit aussi les JETS de la fiche -> tchat Roll20 (le tchat vit dans cette frame,
      // sauf popout : relais vers l'opener).
      window.addEventListener("message", function (ev) {
        try {
          var d = ev.data;
          if (!d || d.ns !== "mia") return;
          // « take » descend vers les fiches : ne jamais retenir sa source comme
          // destinataire, sinon deux fenêtres se le renverraient sans fin
          if (d.type === "take") {
            if (d.payload) diffuseTake(d.payload);
            return;
          }
          rememberSheet(ev.source);
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
    } else {
      startScan();
    }
  }

  // ---------- garde : éteinte ? puis quel mode ? ----------
  // Les deux copies de ce fichier sont injectées dans CHAQUE frame de Roll20 :
  // le manifeste les déclare toutes les deux, et rien ne permet d'en charger une
  // seule à l'exécution. C'est donc ici, et nulle part ailleurs, que la copie qui
  // n'est pas du mode s'arrête, et ici aussi que les DEUX s'arrêtent quand
  // l'extension est éteinte.
  //
  // Le mode ne vit que dans browser.storage.local, dont la lecture est
  // ASYNCHRONE dans un script de contenu : il n'existe aucune lecture synchrone
  // équivalente. Une garde écrite en tête de fichier aurait donc, au mieux, déjà
  // laissé passer quelque chose. C'est pourquoi tout ce qui a un effet est
  // enfermé dans demarre(), appelé d'ici seulement.
  //
  // UNE SEULE LECTURE pour les trois réglages. Trois lectures, ce serait trois
  // moments différents, donc trois occasions de se contredire : on a déjà vu
  // l'onglet annoncer un mode et montrer l'autre pour exactement cette raison.
  // Ici les deux copies lisent la même chose au même instant : éteintes, elles
  // se taisent toutes les deux, et il n'y a pas de course à arbitrer.
  //
  // miaOff ABSENT VAUT ALLUMÉ, et la comparaison est stricte : une extension
  // fraîchement installée, dont le stockage est vide, doit fonctionner.
  //
  // Un rejet du stockage désigne explicitement le mode stable, allumé. Sans ce
  // choix, les DEUX copies se tairaient et l'onglet disparaîtrait sans un mot ;
  // la partie publiée est celle qui doit survivre à une panne. Le prix est
  // assumé : si le stockage était injoignable, on ne saurait pas non plus que
  // l'utilisateur a éteint. Cela ne se produit que si l'API storage manque
  // elle-même, c'est-à-dire jamais tant que la permission est accordée.
  //
  // CE QU'ÉTEINDRE FAIT, ET CE QU'IL NE PEUT PAS FAIRE. Le popup doit pouvoir
  // le dire au joueur sans mentir, alors voici l'inventaire exact.
  //   Sur les pages Roll20 OUVERTES ENSUITE, rien ne se réveille : pas d'onglet
  //   « Fiche MIA », pas de pane, pas de pont d20 (il n'est injecté que sur
  //   need-bridge, qui ne part plus), aucun écouteur de message, aucune
  //   interception du lien « Prendre », aucune écriture dans le stockage. La
  //   frame reste exactement telle que Roll20 l'a faite.
  //   Sur une partie DÉJÀ OUVERTE, rien ne se démonte, et c'est délibéré :
  //     - le pont posé dans le monde principal ne peut pas être retiré. Aucun
  //       script de contenu n'atteint ce monde, sa balise <script> s'est retirée
  //       toute seule à l'onload et son écouteur, lui, est resté ;
  //     - les écouteurs déjà posés sont des fonctions anonymes (message de la
  //       frame du haut, clic de capture de « Prendre », resize, ResizeObserver) :
  //       removeEventListener n'a rien à leur passer ;
  //     - le pane .tab-pane.miafiche ne doit surtout pas être retiré. Le système
  //       d'onglets de Roll20 garde un renvoi vers lui ; le supprimer d'un
  //       dialogue déjà lié empêche la fiche du personnage de s'ouvrir, la
  //       nôtre comme les siennes ;
  //     - overlay.css est injectée par le manifeste dans toutes les frames et ne
  //       se retire pas non plus. Elle ne peint rien tant que rien ne porte nos
  //       classes.
  //   Autrement dit : éteindre prend effet AU RECHARGEMENT DE LA PARTIE, comme
  //   chez uBlock. C'est la seule promesse tenable, et la seule qui ne laisse
  //   pas Roll20 à moitié démonté.
  function garde() {
    try {
      browser.storage.local.get(["miaOff", "miaBeta", "miaNuit"]).then(
        function (r) {
          if (r && r.miaOff === true) return;   // éteinte : aucune des deux copies ne bouge
          NUIT_ORDRE = normNuit(r && r.miaNuit);
          if ((r && r.miaBeta ? "beta" : "stable") === MODE) reclame();
        },
        function () { if (MODE === "stable") reclame(); }
      );
    } catch (e) {
      if (MODE === "stable") reclame();
    }
  }
  // Verrou de frame. Les deux copies partagent le monde isolé, donc cet objet
  // window (un expando de script de contenu reste invisible de la page, comme le
  // window.__miaBridge du pont l'est du monde isolé). Si les deux se réveillaient
  // ensemble (stockage incohérent, extension rechargée, bascule pendant la
  // lecture), la première arrivée prend la frame et la seconde se tait. Sans ce
  // verrou, deux écouteurs « message » dans la frame du haut enverraient chaque
  // jet DEUX FOIS au tchat : le site poste vers window.top avec « * », tous les
  // écouteurs reçoivent le même message, et sendToChat ne dédoublonne rien.
  //
  // Deuxième ligne de défense, gratuite et volontairement conservée : les
  // marqueurs de DOM portent les MÊMES noms dans les deux copies (classe
  // .mia-tab, attribut data-mia-bridge), si bien que placeTabs abandonne tout
  // seul devant le travail de l'autre copie.
  function reclame() {
    try {
      if (window.__miaRoll20) return;   // une copie tient déjà cette frame
      window.__miaRoll20 = MODE;
    } catch (e) {}
    demarre();
  }
  garde();
})();
