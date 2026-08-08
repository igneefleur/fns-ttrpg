/* Content script sur Roll20 : onglet « Fiche JJK » dans le dialogue d'un personnage,
 * qui monte la COQUILLE creator.html ; celle-ci affiche la fiche SERVIE PAR LE SITE
 * (roll20-fiche.html), toujours à jour sans re-signer l'extension. La fiche est
 * enregistrée dans les Attributes Roll20 du personnage (préfixe jjk_), donc partagée à
 * tous les joueurs qui contrôlent ce personnage.
 *
 * Deux rôles selon la frame (le script tourne all_frames) :
 *  - FRAME DU HAUT (app.roll20.net/editor) : injecte roll20-page.js dans le MONDE
 *    PRINCIPAL (là où vit window.d20 / window.Campaign, invisible du content-script) ;
 *    ce page-script lit/écrit les attributs à la demande. C'est aussi elle qui pose
 *    le BOUTON DU PLATEAU dans la barre d'outils de Roll20 et le cadre du plateau
 *    de Narration, ancré à cette barre ou détaché.
 *  - FRAME DE LA FEUILLE (iframe du dialogue de perso) : pose l'onglet « Fiche JJK »
 *    entre « Feuille de personnage » et « Bio & Info ». Au clic : si le perso a déjà
 *    une fiche JJK -> monte l'iframe de la coquille ; sinon -> bouton « Créer fiche JJK ».
 *    SAUF sur le personnage « Narration », qui porte le plateau et pas un personnage :
 *    l'onglet ne s'y pose pas (voir estPlateau).
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
 * RÉGLAGES. Ce fichier ne fait que LIRE le stockage, jamais écrire ailleurs que
 * dans la géométrie du plateau ; le popup est le seul poste d'aiguillage.
 * Il lit jjkOff (éteinte : rien ne se réveille), jjkBeta (quelle moitié parle),
 * jjkNuit (« auto » | « jour » | « nuit », qui décide du n=1/0 envoyé aux pages
 * du site et de la couleur du cadre flottant) et l'interrupteur du plateau.
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

  // ---------- « Narration » porte un plateau, pas un personnage ----------
  // Ce personnage-là existe pour ranger l'état du plateau dans ses Attributes,
  // et pour rien d'autre : le MJ le rend contrôlable par tous, c'est le seul
  // objet d'une campagne où chacun a lecture et écriture. Lui poser l'onglet
  // « Fiche JJK », c'est inviter à créer une fiche de personnage dessus — et
  // c'est déjà arrivé : la carte d'attributs d'une fiche en produit une
  // soixantaine, mesurés à 82 attributs « jjk_ » pour 18 attendus, que le pont
  // doit maintenant retirer au démarrage. On coupe donc à la racine.
  //
  // LE NOM EST CELUI QUE LE PONT CONNAÎT (roll20-page.js, NARR_NOM) : c'est la
  // même chaîne, comparée de la même façon, et les deux doivent bouger
  // ensemble. Ici on ne peut pas interroger le pont — un script de contenu ne
  // voit pas window.Campaign — et surtout on ne veut pas l'INJECTER pour si
  // peu : ce fichier tient à ne rien injecter de son propre chef.
  //
  // Trois sources, de la plus fiable à la plus lointaine, parce qu'aucune n'est
  // garantie : le journal de la partie (là où Roll20 écrit les noms, et où le
  // pont va déjà chercher de quoi ouvrir la fiche), le titre du dialogue, et en
  // fenêtre séparée le titre du document. AUCUN NOM TROUVÉ VAUT « ce n'est pas
  // le plateau » : on ne retire jamais un chemin d'accès sur un doute.
  var NARR_NOM = "narration";
  function docsDeNoms() {
    var out = [];
    function ajoute(d) { try { if (d && out.indexOf(d) < 0) out.push(d); } catch (e) {} }
    ajoute(document);
    try { ajoute(window.top && window.top.document); } catch (e) {}
    try { var o = window.opener; if (o && !o.closed) ajoute(o.document); } catch (e) {}
    return out;
  }
  function nomJournal(charId) {
    if (!/^[-A-Za-z0-9_]{1,40}$/.test(String(charId || ""))) return "";
    var docs = docsDeNoms();
    for (var i = 0; i < docs.length; i++) {
      try {
        var li = docs[i].querySelector('[data-itemid="' + charId + '"]');
        var n = li && (li.querySelector(".namecontainer") || li.querySelector(".name"));
        if (n && n.textContent) return n.textContent;
      } catch (e) {}
    }
    return "";
  }
  function nomDialogue() {
    try {
      var fe = window.frameElement;
      var dlg = fe && fe.closest && fe.closest(".ui-dialog");
      var t = dlg && dlg.querySelector(".ui-dialog-title");
      if (t && t.textContent) return t.textContent;
    } catch (e) {}
    return "";
  }
  function estPlateau(charId) {
    var n = nomJournal(charId) || nomDialogue() || (IS_POPOUT ? document.title : "");
    return !!n && norm(n) === NARR_NOM;
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
  // jjkNuit vaut « auto » (défaut), « jour » ou « nuit ». Il est lu UNE FOIS,
  // dans la même lecture de stockage que le mode (voir garde) : une seconde
  // lecture serait une seconde course, et on a déjà vu ce que ça donne quand
  // deux lectures se contredisent (l'onglet annonçait « Fiche JJK beta » avec
  // la fiche stable dedans).
  //
  // CE QUI PART DANS LE HASH RESTE « n=1/0 », et ce choix a une raison précise.
  // Le paramètre n dit aux pages servies par le site DE QUELLE COULEUR ELLES
  // DOIVENT ÊTRE ; jusqu'ici il ne rapportait que le thème de Roll20, il
  // rapporte maintenant le thème VOULU, c'est-à-dire l'ordre de l'utilisateur
  // quand il en a donné un, et le thème de Roll20 sinon. Le faire disparaître
  // en mode « auto », comme on l'a envisagé, aurait coûté la seule chose que
  // l'extension sait faire de mieux que le site : sans indice, l'« auto » de la
  // fiche et la nuit du plateau retombent sur prefers-color-scheme, donc sur le
  // thème du NAVIGATEUR, et une partie Roll20 en sombre s'ouvrirait en clair
  // sur un navigateur en clair. Aucune page du site n'a besoin d'être touchée :
  // elles lisent n comme avant.
  //
  // La fiche garde le dernier mot par sa propre préférence (onglet Options,
  // localStorage jjk-r20-night) : un joueur qui a explicitement mis SA fiche en
  // jour la garde en jour. C'est voulu, le réglage le plus précis gagne ; le
  // plateau, lui, n'a pas de préférence à lui et suit le popup.
  var NUIT_ORDRE = "auto";
  function normNuit(v) { return v === "jour" || v === "nuit" ? v : "auto"; }
  function nuitEffective() {
    if (NUIT_ORDRE === "nuit") return true;
    if (NUIT_ORDRE === "jour") return false;
    return detectNight();
  }
  // Nos boîtes portent leur nuit sur elles-mêmes (.jjk-nuit), jamais sur la
  // racine : overlay.css est injectée dans TOUTES les frames de Roll20, et une
  // classe posée sur <html> serait une main sur l'interface d'un autre site.
  function poseNuit(elt) {
    if (elt) elt.classList.toggle("jjk-nuit", nuitEffective());
    return elt;
  }
  // creator.html est PARTAGÉE par les deux parties : rien dedans ne dépend du
  // mode, seule la coquille qu'elle charge en dépend. Le mode lui arrive donc
  // dans le hash (« &m=… »), d'où shell-loader.js le lit sans rien demander au
  // stockage. Le hash entier descend ensuite jusqu'à la page du site, qui ignore
  // ce qu'elle ne connaît pas.
  function creatorFrame(charId) {
    var f = el("iframe", "jjk-creator-frame");
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
    var wrap = poseNuit(el("div", "jjk-create"));
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
    host.appendChild(poseNuit(el("div", "jjk-create", "Chargement…")));
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
      var dialog = dialogOf(strip);
      var charId = charIdOfFrame(dialog);

      // Le plateau n'a pas de fiche. Le contrôle est refait à CHAQUE passage, et
      // pas seulement avant la pose : le journal peut n'avoir pas encore répondu
      // au premier balayage, et l'onglet serait alors déjà là. On le retire
      // alors — l'onglet SEUL. Le pane, lui, reste : le système d'onglets de
      // Roll20 garde un renvoi vers lui, et le supprimer d'un dialogue déjà lié
      // empêche la fiche du personnage de s'ouvrir, la nôtre comme les siennes.
      if (estPlateau(charId)) {
        var vieux = strip.querySelector(".jjk-tab");
        if (vieux && vieux.parentNode) vieux.parentNode.removeChild(vieux);
        var vieuxPane = dialog && dialog.querySelector && dialog.querySelector(".tab-pane.jjkfiche");
        if (vieuxPane) { vieuxPane.style.display = "none"; vieuxPane.classList.remove("jjk-on"); }
        return;
      }
      if (strip.querySelector(".jjk-tab")) { placed++; return; }   // déjà là

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
        if (!built) { built = true; requestBridge(); populate(pane, charId); }
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

  // ---------- le plateau de Narration : ancré à la barre, ou flottant ----------
  // Un panneau posé DANS la partie, que tous les joueurs voient : les jetons de
  // narration s'y poussent d'une place à l'autre. Le contenu est servi par le
  // site (roll20-narration.html) à travers la coquille générique panneau.html :
  // tout ce qui suit est un CHÂSSIS, et rien d'autre — s'ouvrir, se ranger,
  // s'étirer, se souvenir. Le plateau lui-même peut donc changer autant qu'il
  // voudra sans re-signature.
  //
  // DEUX PLACES, JAMAIS DEUX PLATEAUX. Par défaut il s'ANCRE : un bouton dans la
  // barre d'outils de Roll20 l'ouvre et le referme, et il se déplie collé à la
  // barre, sur toute la hauteur, comme les panneaux natifs. Il ne flotte plus,
  // ne se déplace plus, et ne recouvre plus la carte au hasard de l'endroit où
  // on l'avait laissé. Qui le préfère détaché a le second choix : le bouton
  // « Détacher » de sa barre de titre le rend flottant, avec sa place et sa
  // taille d'avant. C'est LA MÊME BOÎTE et LA MÊME IFRAME dans les deux cas —
  // on n'en construit jamais deux, ce qui rend l'exigence structurelle plutôt
  // que surveillée, et évite au passage de rebâtir une fenêtre (voir panRemplit :
  // chaque fenêtre coûte une place dans la table des liaisons du pont).
  //
  // La place par défaut du mode FLOTTANT est mesurée sur l'interface de Roll20 :
  // la barre d'outils tient la colonne x ∈ [20, 52], et la bande y ∈ [20, 54]
  // revient aux actions de jeton, qui apparaissent dès qu'un jeton est
  // sélectionné. Le panneau se pose donc juste à côté et juste en dessous.
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
  // DEUX NOMS POUR UN SEUL INTERRUPTEUR, et c'est une assurance, pas une
  // hésitation. L'interrupteur du plateau s'est toujours appelé
  // jjkPanneauActif ; le contrat de réglages écrit pour la refonte du popup le
  // nomme jjkPanneau. Les deux se ressemblent assez pour qu'une main les
  // confonde, et un popup qui écrirait le mauvais nom laisserait une case qui
  // ne fait plus rien, sans le moindre message. On lit donc les deux : le nom
  // du contrat l'emporte quand il est posé, l'historique sert sinon.
  // ATTENTION, jjkPanneau n'est PAS le préfixe PAN_CLE ci-dessus : celui-là
  // s'écrit « jjkPanneau:roll20-narration.html » et range la géométrie. Deux
  // clés distinctes, jamais la même chaîne.
  var PAN_ACTIF_BIS = "jjkPanneau";
  // « ancre » entre dans l'état rangé : le choix de la place se retient d'une
  // session à l'autre, comme le reste. Absent (installation d'avant), il vaut
  // ancré — c'est la place voulue, le flottant est le second choix.
  var PAN_DEF = { ouvert: false, ancre: true, x: 62, y: 60, w: 380, h: 330 };
  var PAN_MIN_W = 260, PAN_MIN_H = 190;
  var panEtat = null, panBoite = null, panCorps = null, panBtn = null, panBtnAncre = null,
      panTitre = null, panEcrit = null;

  function panNombre(v, def) { var n = parseInt(v, 10); return isFinite(n) ? n : def; }

  // ---------- le bouton dans la barre d'outils de Roll20 ----------
  // LE BOUTON EST UN CLONE, jamais un bouton reconstruit à la main, et c'est le
  // point qui décide de tout le reste. La barre est une application VUE et son
  // CSS est « scopé » : chaque règle est écrite « .toolbar-button-inner[data-v-
  // 0dd4681e] », « .grimoire__roll20-icon[data-v-2f0bc668] ». Un bouton
  // reconstruit porterait les bonnes CLASSES et pas ces attributs : ni la
  // police d'icônes, ni les marges, ni le fond de l'état actif ne s'y
  // appliqueraient, et l'icône s'afficherait en toutes lettres. Cloner un
  // bouton natif emporte les attributs avec, sans avoir à deviner un seul de
  // ces condensats — qui changent à chaque déploiement de Roll20, alors que ce
  // fichier est figé par la signature.
  //
  // Relevé dans un vrai document (2026) :
  //   #vm-master-toolbar > #master-toolbar.master-toolbar-outer > .upper-buttons
  //     > .toolbar-button-outer#select-button
  //        > .toolbar-button-mid > button.toolbar-button-inner
  //             > .icon-slot > span.grimoire__roll20-icon
  // L'icône est le TEXTE de ce span (une ligature de la police d'icônes).
  //
  // L'ICÔNE EST NATIVE et discrète : « dualSheets », deux feuillets posés l'un
  // sur l'autre, relevée dans ce même document donc certainement présente dans
  // la police. Elle n'est utilisée par aucun bouton de la barre, elle est du
  // même trait que les autres, et elle ne crie pas.
  var BARRE_ICONE = "dualSheets";
  var BARRE_ID = "jjk-barre-bouton";
  var BARRE_TITRE = "Plateau de narration";
  var barreOK = false;     // le bouton a été posé au moins une fois
  var barreObs = null;

  function barreZone() {
    return document.querySelector("#master-toolbar .upper-buttons") ||
           document.querySelector("#vm-master-toolbar .upper-buttons") || null;
  }
  // Le modèle à cloner : un bouton SANS sous-menu (pas de caret à retirer), avec
  // une icône, et surtout VISIBLE. On ne nomme pas #select-button : un
  // identifiant de Roll20 se renomme, la forme, elle, tient.
  //
  // La visibilité n'est pas une coquetterie : la barre porte un
  // #more-tools-button rangé en « display: none » inline, et le cloner nous
  // donnerait un bouton invisible — posé, compté comme posé, et introuvable.
  function barreModele(zone) {
    var l = zone.querySelectorAll(".toolbar-button-outer");
    for (var i = 0; i < l.length; i++) {
      if (l[i].id === BARRE_ID) continue;
      if (!l[i].offsetWidth && !l[i].offsetHeight) continue;
      if (l[i].querySelector(".submenu-caret")) continue;
      if (l[i].querySelector(".icon-slot") && l[i].querySelector("button")) return l[i];
    }
    return null;
  }
  function barreFabrique(modele) {
    var n = modele.cloneNode(true);   // cloneNode ne copie AUCUN écouteur : le
    n.id = BARRE_ID;                  // clone est inerte tant qu'on ne lui en pose pas
    // L'identifiant SUFFIT à le désigner, et il n'y a rien d'autre à poser : le
    // clone gardait en plus une classe « jjk-barre-bouton » qu'aucune feuille ne
    // lisait — overlay.css vise « #jjk-barre-bouton », et barreModele() reconnaît
    // notre bouton par son id.
    // ceinture : un modèle masqué ne doit pas transmettre son invisibilité
    try { n.style.removeProperty("display"); } catch (e) {}
    var slot = n.querySelector(".icon-slot");
    if (slot) {
      // l'état actif du modèle ne doit pas voyager : notre bouton s'allume
      // quand NOTRE plateau est ouvert, pas quand l'outil cloné est choisi
      slot.classList.remove("icon-selected");
      try { slot.style.removeProperty("background-color"); } catch (e) {}
    }
    var caret = n.querySelector(".submenu-caret");
    if (caret && caret.parentNode) caret.parentNode.removeChild(caret);
    var icone = n.querySelector(".grimoire__roll20-icon");
    if (icone) icone.textContent = BARRE_ICONE;
    var btn = n.querySelector("button");
    if (btn) {
      btn.setAttribute("title", BARRE_TITRE);
      btn.setAttribute("aria-label", BARRE_TITRE);
      btn.addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        if (panEtat) panOuvre(!panEtat.ouvert);
      });
    }
    return n;
  }
  // Le bouton s'allume comme un outil natif choisi : Roll20 pose .icon-selected
  // et le fond --vtt-toolbar-active-selection-bg sur la pastille d'icône. On
  // rejoue exactement ce geste plutôt que d'inventer une couleur à nous, qui
  // jurerait le jour où Roll20 change de thème.
  function barrePeint() {
    var n = document.getElementById(BARRE_ID);
    var slot = n && n.querySelector(".icon-slot");
    if (!slot) return;
    var actif = !!(panEtat && panEtat.ouvert);
    slot.classList.toggle("icon-selected", actif);
    try {
      if (actif) slot.style.setProperty("background-color", "var(--vtt-toolbar-active-selection-bg)");
      else slot.style.removeProperty("background-color");
    } catch (e) {}
  }
  // Pose, ou repose. Vue reconstruit sa barre (au repli, à un changement
  // d'outils, à une reconnexion) et emporte notre noeud avec : le guet plus bas
  // rappelle cette fonction, qui ne fait rien tant que le bouton est en place.
  // On l'ajoute EN FIN de barre, là où le patch de Vue a le moins de raisons de
  // passer, et jamais au milieu de ses propres enfants.
  function barrePose() {
    var zone = barreZone();
    if (!zone) return false;
    var deja = document.getElementById(BARRE_ID);
    if (deja && deja.parentNode === zone) { barrePeint(); return true; }
    var modele = barreModele(zone);
    if (!modele) return false;
    if (deja && deja.parentNode) deja.parentNode.removeChild(deja);
    barreInsere(zone, barreFabrique(modele));
    barreOK = true;
    barrePeint();
    return true;
  }
  // DANS « OUTILS », PAS DANS « EFFETS ». Ajouté à la fin de la liste, le bouton
  // tombait après effects-button, donc sous l'intitulé « Effets » — l'auteur l'a
  // vu sur sa capture. La barre est faite de groupes séparés par des
  // « .spacer-outer » : settings | select, pan | draw, text, measure, dice |
  // effects, more. Le groupe des outils finit donc juste avant le séparateur qui
  // précède le bouton des effets.
  //
  // On vise ce séparateur-là par le bouton des effets, et non par un rang : un
  // rang se décale au premier outil que Roll20 ajoute. Si rien n'est reconnu, on
  // ajoute à la fin comme avant : mal placé vaut mieux qu'absent.
  function barreInsere(zone, noeud) {
    var ancre = null;
    try {
      var eff = zone.querySelector("#effects-button");
      if (eff) {
        var p = eff.previousElementSibling;
        ancre = (p && p.className && String(p.className).indexOf("spacer") >= 0) ? p : eff;
      }
      if (!ancre) {
        var sp = zone.querySelectorAll(".spacer-outer");
        if (sp.length) ancre = sp[sp.length - 1];
      }
    } catch (e) { ancre = null; }
    if (ancre && ancre.parentNode === zone) zone.insertBefore(noeud, ancre);
    else zone.appendChild(noeud);
  }
  function barreGuet() {
    if (barreObs) return;
    var racine = document.getElementById("vm-master-toolbar") ||
                 document.getElementById("master-toolbar");
    if (!racine) return;
    var pendant = false;
    try {
      barreObs = new MutationObserver(function () {
        if (pendant) return;
        pendant = true;
        setTimeout(function () {
          pendant = false;
          barrePose();
          // la barre a pu changer de largeur (repli) : le plateau ancré la suit
          if (panEtat) panApplique();
        }, 200);
      });
      barreObs.observe(racine, { childList: true, subtree: true });
    } catch (e) {}
  }
  // La géométrie de la barre, mesurée et non devinée : c'est elle qui dit où le
  // plateau ancré commence. Une barre repliée ou pas encore peinte ne compte
  // pas — le plateau retombe alors sur sa place flottante, plutôt que de se
  // coller à un fantôme.
  // COLLÉ VEUT DIRE COLLÉ : zéro pixel entre la barre et le plateau, et pas un
  // seul pixel DESSOUS non plus.
  function barreRect() {
    var b = document.getElementById("master-toolbar") ||
            document.getElementById("vm-master-toolbar");
    if (!b || !b.getBoundingClientRect) return null;
    var r = null;
    try { r = b.getBoundingClientRect(); } catch (e) { return null; }
    if (!r || r.width < 8 || r.height < 8) return null;
    return r;
  }
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
  // ANCRÉ vaut « ancré ET une barre pour s'y coller ». Sans barre, l'état a beau
  // dire ancré, il n'y a rien où s'accrocher : on retombe sur le flottant, qui
  // marche partout. C'est ce qui tient la promesse « si la barre n'existe pas,
  // aucun chemin d'accès existant ne disparaît ».
  function panAncre() { return !!(panEtat && panEtat.ancre) && !!barreRect(); }
  // Collé à la barre, pleine hauteur. La largeur reste celle que le joueur (ou
  // la page du plateau) a demandée, bornée à ce qui tient à droite de la barre.
  // GRAND ET CENTRÉ, LE TEMPS D'UN RÉGLAGE. Une géométrie de PASSAGE : elle
  // n'est jamais rangée dans le stockage, et panApplique() la retrouve tant
  // qu'elle est posée. À la fermeture, on la jette et le panneau reprend
  // exactement la place qu'il avait, ancrée ou flottante.
  var panGeoGrande = null;
  function panGrand(on) {
    if (!on) { panGeoGrande = null; panApplique(); return; }
    var vw = window.innerWidth || 1200, vh = window.innerHeight || 800;
    var w = Math.max(PAN_MIN_W, Math.min(760, vw - 80));
    var h = Math.max(PAN_MIN_H, Math.min(640, vh - 80));
    panGeoGrande = { x: Math.round((vw - w) / 2), y: Math.round((vh - h) / 2), w: w, h: h };
    panApplique();
  }
  function panGeoAncree() {
    var vw = window.innerWidth || 1200, vh = window.innerHeight || 800;
    var r = barreRect();
    // ON NE GLISSE PAS SOUS LA BARRE. Un chevauchement de dix pixels avait été
    // essayé pour boucher le creux du coin arrondi : il faisait passer la place
    // du MJ sous la boîte à outils, ce que l'auteur avait explicitement exclu.
    // Le creux se règle par un coin arrondi, pas en poussant le plateau dessous.
    var x = r ? Math.round(r.right) : PAN_DEF.x;
    var y = r ? Math.max(0, Math.round(r.top)) : PAN_DEF.y;
    return {
      x: x, y: y,
      w: Math.max(PAN_MIN_W, Math.min(panEtat.w, Math.max(PAN_MIN_W, vw - x - 8))),
      // LA MÊME HAUTEUR QUE LA BOÎTE À OUTILS, exactement. Le plateau prenait
      // toute la fenêtre et descendait bien plus bas que la barre : posés côte à
      // côte, les deux ne formaient pas un bloc. On suit donc la barre, sans
      // plancher qui la contredirait — si elle est courte, le plateau est court.
      h: r ? Math.round(r.height) : Math.max(PAN_MIN_H, vh - y - 8)
    };
  }
  function panApplique() {
    if (!panBoite) return;
    var ancre = panAncre() && panEtat.ouvert;
    // FERMÉ, DEUX VISAGES. Quand la barre porte le bouton, fermer efface le
    // plateau : c'est le bouton qui le rouvre, une étiquette de plus sur la
    // carte ne servirait à rien. Sans bouton (barre absente, ou Roll20 qui a
    // changé de barre), fermer se contente de replier le panneau à son
    // étiquette — sinon il n'y aurait plus AUCUN moyen de le rouvrir.
    var efface = !panEtat.ouvert && barreOK;
    panBoite.style.display = efface ? "none" : "";
    panBoite.classList.toggle("jjk-panneau-ancre", ancre);
    // Le coin bas-gauche ne s'arrondit que s'il se VOIT : quand la barre descend
    // jusqu'au bas de la fenêtre, ce coin est hors champ et un arrondi y
    // dessinerait une encoche dans le vide. Le CSS ne peut pas mesurer la barre,
    // c'est donc ici qu'on tranche.
    var rb = ancre ? barreRect() : null;
    panBoite.classList.toggle("jjk-panneau-bas-plein",
      !!(rb && rb.bottom >= (window.innerHeight || 800) - 4));
    panBoite.classList.toggle("jjk-panneau-replie", !panEtat.ouvert && !efface);
    // La géométrie de passage (réglages ouverts) l'emporte sur tout : ancré ou
    // flottant, on veut le dialogue grand et au centre. Elle disparaît d'elle
    // même à la fermeture, sans avoir rien écrit.
    var g = panGeoGrande ? panGeoGrande : (ancre ? panGeoAncree() : panEtat);
    if (panGeoGrande) { panBoite.classList.remove("jjk-panneau-ancre"); }
    panBoite.style.left = g.x + "px";
    panBoite.style.top = g.y + "px";
    // replié, le panneau se réduit à son étiquette : une barre de 380 px de
    // large pour un seul mot occuperait le haut de la carte pour rien
    panBoite.style.width = panEtat.ouvert ? g.w + "px" : "auto";
    panBoite.style.height = panEtat.ouvert ? g.h + "px" : "auto";
    if (panBtn) {
      panBtn.textContent = barreOK ? "×" : (panEtat.ouvert ? "–" : "+");
      panBtn.title = barreOK ? "Fermer le plateau"
                             : (panEtat.ouvert ? "Replier le plateau" : "Déplier le plateau");
    }
    // Le bouton « Détacher » n'a de sens que là où il y a une barre : sans
    // barre, le plateau est déjà flottant et le rester est son seul choix.
    if (panBtnAncre) {
      var possible = !!barreRect();
      panBtnAncre.style.display = possible ? "" : "none";
      panBtnAncre.textContent = panEtat.ancre ? "⇲" : "⇱";
      panBtnAncre.title = panEtat.ancre ? "Détacher" : "Ancrer";
    }
    barrePeint();
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
            "#p=" + PAN_PAGE + "&n=" + (nuitEffective() ? "1" : "0") + "&m=" + MODE;
    f.setAttribute("allow", "clipboard-write");
    panCorps.appendChild(f);
    // pas d'injection du pont ici : la page distante le réclame elle-même
    // (need-bridge), et le fichier tient à ne rien injecter de son propre chef
  }
  // Le CADRE et le PLATEAU ne doivent jamais être l'un clair et l'autre sombre.
  // Le cadre vit ici, le plateau est servi par le site et ne lit sa nuit qu'au
  // chargement, dans le hash : les accorder demande donc de refaire l'iframe,
  // car changer le seul fragment d'une adresse ne recharge rien (c'est une
  // navigation dans le même document, la page distante ne s'en aperçoit même
  // pas). Refaire l'iframe est sans danger depuis que la table des liaisons du
  // pont fait le ménage des fenêtres mortes, et le plateau n'a rien à perdre :
  // son état, ce sont les jetons rangés dans Roll20, jamais la page.
  function panRepeint() {
    if (!panBoite) return;
    poseNuit(panBoite);
    if (panCorps && panCorps.firstChild) {
      panCorps.innerHTML = "";
      panRemplit();
    }
  }
  function panOuvre(ouvert) {
    panEtat.ouvert = !!ouvert;
    panApplique();
    if (panEtat.ouvert) panRemplit();
    panRange();
  }
  // Détacher, puis rattacher. La boîte et l'iframe ne bougent pas : seule leur
  // géométrie change, et le plateau ne s'aperçoit de rien — pas de rechargement,
  // pas de fenêtre de plus dans la table des liaisons du pont, pas d'instant où
  // deux plateaux existeraient.
  function panDetache(ancre) {
    panEtat.ancre = !!ancre;
    // DÉTACHÉ, IL NE DOIT PAS TOMBER DERRIÈRE LA BARRE. La place flottante est
    // mesurée sur la barre d'il y a deux ans (x = 62, juste à sa droite) ; le
    // jour où Roll20 l'élargit, ou la déplace, ce qu'il a déjà fait, on
    // détacherait le plateau sous elle, où il aurait l'air d'avoir disparu.
    // On ne le repousse que s'il le faut, et jamais plus loin que nécessaire.
    if (!panEtat.ancre) {
      var r = barreRect();
      // DÉTACHÉ, on ne glisse pas sous la barre : ce serait le perdre. Le
      // chevauchement n'a de sens qu'ancré, où la barre le cache exprès.
      if (r && panEtat.x < r.right) panEtat.x = Math.round(r.right + 4);
    }
    panBorne(panEtat);
    panApplique();
    panRange();
  }
  // Un geste (déplacement ou redimensionnement) se fait à la CAPTURE DE
  // POINTEUR : la page de Roll20 est pleine d'iframes (chaque dialogue de
  // personnage en est une), et des écouteurs posés sur le document perdaient le
  // pointeur dès qu'il passait au-dessus de l'une d'elles. Le geste ne se
  // terminait alors jamais : le panneau restait inerte, sans que rien ne le
  // dise. La capture suit le pointeur partout, y compris hors de la fenêtre, et
  // le relâchement revient toujours.
  //
  // ANCRÉ, LE PLATEAU NE SE DÉPLACE PAS : c'est tout l'objet de l'ancrage, et le
  // déplacer sous les doigts en ferait un flottant sans le dire. La poignée, en
  // revanche, reste utile : elle ne règle plus que la LARGEUR, la hauteur étant
  // celle de la fenêtre.
  var panGesteEnCours = false;
  function panGeste(ev, bouge) {
    if (panGesteEnCours || (ev.button != null && ev.button !== 0)) return;
    var ancre = panAncre();
    if (ancre && bouge) return;
    panGesteEnCours = true;
    var cible = ev.currentTarget;
    var x0 = ev.clientX, y0 = ev.clientY;
    var e0 = { x: panEtat.x, y: panEtat.y, w: panEtat.w, h: panEtat.h };
    panBoite.classList.add("jjk-panneau-geste");
    function suit(m) {
      var dx = m.clientX - x0, dy = m.clientY - y0;
      if (bouge) { panEtat.x = e0.x + dx; panEtat.y = e0.y + dy; }
      else { panEtat.w = e0.w + dx; if (!ancre) panEtat.h = e0.h + dy; }
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
    panBoite = poseNuit(el("div", "jjk-panneau"));
    panBoite.id = "jjk-panneau";

    var tete = el("div", "jjk-panneau-tete");
    panTitre = el("span", "jjk-panneau-titre", "Narration");
    tete.appendChild(panTitre);
    // Deux boutons, et aucune phrase d'explication sous eux : l'infobulle suffit.
    panBtnAncre = el("button", "jjk-panneau-btn", "⇲");
    panBtnAncre.type = "button";
    panBtnAncre.addEventListener("pointerdown", function (ev) { ev.stopPropagation(); });
    panBtnAncre.addEventListener("click", function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      panDetache(!panEtat.ancre);
    });
    tete.appendChild(panBtnAncre);
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
    return { ouvert: PAN_DEF.ouvert, ancre: PAN_DEF.ancre,
             x: PAN_DEF.x, y: PAN_DEF.y, w: PAN_DEF.w, h: PAN_DEF.h };
  }
  // Éteint seulement si on l'a dit : les deux clés absentes valent allumé, une
  // partie fraîchement installée montre donc le plateau.
  function panEteint(r) {
    if (!r) return false;
    if (r[PAN_ACTIF_BIS] !== undefined) return r[PAN_ACTIF_BIS] === false;
    return r[PAN_ACTIF] === false;
  }
  // LA BARRE D'ABORD, LA BOÎTE ENSUITE, et l'ordre compte : c'est la présence du
  // bouton qui décide de quoi « fermé » a l'air (effacé, ou replié à son
  // étiquette). Monter la boîte avant de savoir la ferait clignoter d'un état à
  // l'autre au chargement de la partie. Vue construit sa barre en quelques
  // centaines de millisecondes ; on lui en laisse huit secondes, puis on monte
  // sans elle plutôt que d'attendre indéfiniment.
  //
  // Le guet, lui, continue après : une barre qui arrive en retard (reconnexion,
  // changement de page de la partie) trouvera son bouton reposé, et le plateau
  // s'ancrera à la première ouverture qui suit.
  function panPrepare(etat) {
    var essais = 0;
    (function cherche() {
      barreGuet();
      if (barrePose()) { panMonte(etat); return; }
      if (++essais > 20) {
        panMonte(etat);
        // dernier filet : une minute de rappels espacés, au cas où la barre se
        // peindrait après tout le monde. barrePose() ne fait rien si le bouton
        // est déjà là, et repeint le plateau s'il vient d'arriver.
        var n = 0, iv = setInterval(function () {
          // LE GUET S'ARME ICI AUSSI. Il n'était appelé que dans la boucle des
          // vingt essais : une barre peinte après huit secondes — partie lourde,
          // reconnexion, onglet ouvert en arrière-plan — recevait bien le bouton
          // par ce filet, mais plus aucun observateur. Vue le retirait au premier
          // re-rendu et il ne revenait jamais.
          barreGuet();
          if (barrePose()) { panApplique(); clearInterval(iv); return; }
          if (++n > 30) clearInterval(iv);
        }, 2000);
        return;
      }
      setTimeout(cherche, 400);
    })();
  }
  function panDemarre() {
    try {
      browser.storage.local.get([PAN_CLE, PAN_ACTIF, PAN_ACTIF_BIS]).then(function (r) {
        // l'interrupteur du popup : une partie Roll20 qui n'a rien à voir avec
        // JJK ne doit pas se voir imposer une étiquette à demeure
        if (panEteint(r)) return;
        var e = (r && r[PAN_CLE]) || {};
        panPrepare({
          ouvert: !!e.ouvert,
          ancre: e.ancre === undefined ? PAN_DEF.ancre : !!e.ancre,
          x: panNombre(e.x, PAN_DEF.x), y: panNombre(e.y, PAN_DEF.y),
          w: panNombre(e.w, PAN_DEF.w), h: panNombre(e.h, PAN_DEF.h)
        });
      }, function () { panPrepare(panDefaut()); });
    } catch (e) {
      panPrepare(panDefaut());
    }
  }

  // ---------- le seul réglage relu en cours de partie : la nuit ----------
  // Une nuit qui réclame de recharger la partie n'est pas une nuit : on l'allume
  // le soir venu, entre deux jets, et l'écran doit suivre. Elle est aussi le
  // seul réglage qu'on peut appliquer à chaud SANS RIEN DÉMONTER : repeindre
  // n'enlève ni un onglet, ni un écouteur, ni un pont, et ne peut donc pas
  // laisser Roll20 dans un état où il n'était pas prévu.
  //
  // L'extinction (jjkOff) et l'interrupteur du plateau ne sont volontairement
  // PAS relus ici : ils démontent, et démonter à chaud est ce qui casse (voir
  // la garde, tout en bas, pour ce que « éteindre » peut et ne peut pas).
  //
  // La fiche servie par le site n'est pas repeinte : ce serait la RECHARGER
  // sous les doigts du joueur, au milieu d'une saisie. Elle a son propre
  // réglage dans son onglet Options, et prendra celui du popup à sa prochaine
  // ouverture.
  function repeintTout() {
    panRepeint();
    var n = document.querySelectorAll(".jjk-create, .jjk-creator-frame");
    for (var i = 0; i < n.length; i++) poseNuit(n[i]);
  }
  function ecouteNuit() {
    try {
      browser.storage.onChanged.addListener(function (ch, zone) {
        if (zone && zone !== "local") return;
        if (!ch || !ch.jjkNuit) return;
        var v = normNuit(ch.jjkNuit.newValue);
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
            // LA COULEUR DU CADRE SUIT CELLE DU PLATEAU, dès que le plateau la
            // dit. Le cadre est signé, le plateau ne l'est pas : le jour où il
            // se donne un réglage de nuit à lui, et il l'a fait, lui seul sait
            // de quelle couleur il s'est peint. Un cadre qui n'écouterait que
            // le réglage de l'extension resterait clair autour d'un plateau
            // devenu sombre, et c'est précisément ce qu'il ne doit jamais
            // arriver. Sans ce message, le cadre garde le réglage du popup,
            // que le plateau suit de toute façon par défaut.
            if (d.nuit != null && panBoite) panBoite.classList.toggle("jjk-nuit", !!d.nuit);
            // LE CADRE S'AGRANDIT POUR LES RÉGLAGES. Le plateau ne peut pas
            // faire sortir un dialogue de son iframe : serré dans une colonne
            // ancrée à la barre, il devenait illisible. Il demande donc de la
            // place, on la lui donne au centre de la page, et on la reprend à
            // la fermeture. L'état rangé n'est PAS touché : on ne mémorise pas
            // une géométrie de passage, sinon rouvrir Roll20 retrouverait le
            // plateau grand ouvert au milieu de l'écran.
            if (d.type === "pan-grand") { panGrand(!!d.grand); }
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
      // la partie elle-même (et elle seule) reçoit le plateau et son bouton
      if (IS_EDITEUR) panDemarre();
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
  // jjkOff ABSENT VAUT ALLUMÉ, et la comparaison est stricte : une extension
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
  //   « Fiche JJK », pas de pane, pas de plateau, pas de bouton dans la barre
  //   d'outils, pas de pont d20 (il n'est injecté que sur need-bridge, qui ne
  //   part plus), aucun écouteur de message, aucune interception du lien
  //   « Prendre », aucune écriture dans le stockage. La frame reste exactement
  //   telle que Roll20 l'a faite.
  //   Sur une partie DÉJÀ OUVERTE, rien ne se démonte, et c'est délibéré :
  //     - le pont posé dans le monde principal ne peut pas être retiré. Aucun
  //       script de contenu n'atteint ce monde, sa balise <script> s'est retirée
  //       toute seule à l'onload et son écouteur, lui, est resté ;
  //     - les écouteurs déjà posés sont des fonctions anonymes (message de la
  //       frame du haut, clic de capture de « Prendre », resize, ResizeObserver) :
  //       removeEventListener n'a rien à leur passer ;
  //     - le bouton déjà posé dans la barre d'outils reste, et le guet qui le
  //       repose aussi. Le retirer serait faisable, mais ce serait un démontage
  //       de plus dans une interface Vue qu'on ne contrôle pas, pour gagner une
  //       demi-seconde sur un rechargement de partie ;
  //     - le pane .tab-pane.jjkfiche ne doit surtout pas être retiré. Le système
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
      browser.storage.local.get(["jjkOff", "jjkBeta", "jjkNuit"]).then(
        function (r) {
          if (r && r.jjkOff === true) return;   // éteinte : aucune des deux copies ne bouge
          NUIT_ORDRE = normNuit(r && r.jjkNuit);
          if ((r && r.jjkBeta ? "beta" : "stable") === MODE) reclame();
        },
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
