/* Content script sur Roll20 : onglet « Fiche Outward » dans le dialogue d'un
 * personnage, qui monte la COQUILLE creator.html ; celle-ci affiche la fiche SERVIE
 * PAR LE SITE (roll20-fiche.html), toujours à jour sans re-signer l'extension. La
 * fiche est enregistrée dans les Attributes Roll20 du personnage (préfixe owd_), donc
 * partagée à tous les joueurs qui contrôlent ce personnage.
 *
 * Deux rôles selon la frame (le script tourne all_frames) :
 *  - FRAME DU HAUT (app.roll20.net/editor) : injecte roll20-page.js dans le MONDE
 *    PRINCIPAL (là où vit window.d20 / window.Campaign, invisible du content-script) ;
 *    ce page-script lit/écrit les attributs à la demande. C'est aussi elle qui pose
 *    le BOUTON DU CAMP dans la barre d'outils de Roll20 et le cadre du panneau de
 *    Camp, ancré à cette barre ou détaché.
 *  - FRAME DE LA FEUILLE (iframe du dialogue de perso) : pose l'onglet
 *    « Fiche Outward » entre « Feuille de personnage » et « Bio & Info ». Au clic :
 *    si le perso a déjà une fiche Outward -> monte l'iframe de la coquille ; sinon
 *    -> bouton « Créer fiche Outward ». SAUF sur le personnage « Camp », qui porte le
 *    panneau et pas un personnage : l'onglet ne s'y pose pas (voir estCamp).
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
 * dans la géométrie du panneau ; le popup est le seul poste d'aiguillage.
 * Il lit owdOff (éteinte : rien ne se réveille), owdBeta (quelle moitié parle),
 * owdNuit (« auto » | « jour » | « nuit », qui décide du n=1/0 envoyé aux pages
 * du site et de la couleur du cadre flottant) et l'interrupteur du panneau.
 * Tout cela se lit à la garde, tout en bas, où l'inventaire est détaillé.
 *
 * TOUTE CORRECTION DE SÛRETÉ DOIT ÊTRE APPLIQUÉE AUX DEUX COPIES. La liste
 * blanche du canal brut, le repli des sauts de ligne dans les commandes, le
 * relais vers l'opener et le canal « Prendre » vivent en double exemplaire : un
 * correctif posé d'un seul côté laisse le trou grand ouvert de l'autre, et rien
 * ne le signalera. C'est le prix de cette structure, et il se paie ici.
 * scripts/build_extension.py --verifie contrôle les lignes marquées ; un
 * « diff -u stable/ beta/ » ne doit montrer QUE ces trois lignes-là.
 */
// compat : Chrome expose `chrome.*`, Firefox `browser.*`.
if (typeof browser === "undefined") { var browser = chrome; }
(function () {
  "use strict";

  var IS_TOP = (function () { try { return window.top === window; } catch (e) { return true; } })();

  // ---------- ce que cette copie a de propre ----------
  // MODE nomme la copie. Il voyage aussi dans le hash des coquilles (« &m=… »)
  // pour que shell-loader.js n'ait pas à relire le mode dans le stockage : une
  // seconde lecture serait une seconde course, et une bascule survenue entre
  // les deux ferait annoncer « Fiche Outward beta » à un onglet qui montre la
  // fiche stable. Ici, la copie qui construit l'adresse dicte la coquille, et
  // il n'y a plus rien à accorder.
  //
  // LIBELLE est figé à la déclaration, et non posé après coup : le stockage
  // répondrait parfois APRÈS la construction de l'écran « pas encore de fiche »,
  // dont le titre resterait « Fiche Outward » même en beta. Plus rien n'est
  // construit avant que le mode soit connu, le défaut ne peut pas apparaître.
  var MODE = "beta";                                     // propre à cette copie
  var LIBELLE = "Fiche Outward beta";                    // propre à cette copie

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
  // n'importe quel code de la page de la fiche peut poster ce message — la
  // page est servie par le site, l'extension est signée, et les deux ne sont
  // jamais déployées le même jour. Ses deux champs libres se replient donc
  // ici : un saut de ligne dans « die » ou « label » ferait sortir une SECONDE
  // ligne au tchat, que Roll20 exécuterait comme une commande à part
  // (« !api », « /w gm »…) au nom du joueur.
  // Les accolades de « die » restent, elles : une macro Roll20 (?{Dé|1d8})
  // est un dé légitime sur ce canal.
  function replie(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  function rollCommand(die, value, label) {
    die = replie(die) || "1d100";
    var v = value >= 0 ? "+ " + value : "- " + (-value);
    var name = replie(label).replace(/[{}]/g, "") || "Jet";
    return "&{template:default} {{name=" + name + "}} {{Jet=[[" + die + " " + v + "]]}}";
  }
  // Carte d'ÉLÉMENT au tchat (objet, compétence, capacité…) : template par
  // défaut, une ligne par champ non vide. Accolades et sauts de ligne
  // neutralisés. Une étiquette VIDE donne « {{=texte}} » : la ligne prend toute
  // la largeur de la carte, sans colonne de libellé — c'est ce que la fiche
  // envoie pour les textes libres (effet d'une capacité, description d'un
  // objet…), dont le libellé n'apprendrait rien que le titre ne dise déjà.
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
  // site. La propriété qu'il faut tenir ne dépend d'aucune fonctionnalité de
  // la fiche : un message « ns:"owd" » peut venir de n'importe quel code de la
  // page, et cette page n'est pas signée. On n'accepte donc que ce que la
  // fiche compose RÉELLEMENT (owd-fiche.js), c'est-à-dire, dans cet ordre :
  //   - envPrefixe() : rien, « /w gm », ou « /w "Nom du joueur" » ;
  //   - puis cmdJet, cmdCarte ou la carte d'objet donné (avec son lien
  //     « [Prendre](/owd_take <base64>) ») : toutes commencent par
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
  // Le marqueur data-owd-bridge est COMMUN aux deux copies, tout comme le
  // window.__owdBridge du pont lui-même : c'est délibéré. Un marqueur qui
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
    if (!root || root.hasAttribute("data-owd-bridge")) return;
    root.setAttribute("data-owd-bridge", "1");
    var s = document.createElement("script");
    s.id = "owd-page-bridge";
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
        if (!d || d.ns !== "owd") return;   // ignore tout ce qui n'est pas à nous
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
  function requestBridge() { try { window.top.postMessage({ ns: "owd", type: "need-bridge" }, "*"); } catch (e) {} }
  // interroge has-sheet, avec relances (le page-script vient peut-être d'être injecté)
  function queryHasSheet(charId, cb) {
    ensureHasListener();
    if (!charId) { cb(null); return; }
    pendingHas[charId] = cb;
    var tries = 0;
    (function send() {
      if (!pendingHas[charId]) return;   // déjà répondu
      tries++;
      try { window.top.postMessage({ ns: "owd", type: "has-sheet", charId: charId }, "*"); } catch (e) {}
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

  // ---------- « Camp » porte un panneau, pas un personnage ----------
  // Ce personnage-là existe pour ranger l'état du camp dans ses Attributes,
  // et pour rien d'autre : le MJ le rend contrôlable par tous, c'est le seul
  // objet d'une campagne où chacun a lecture et écriture. Lui poser l'onglet
  // « Fiche Outward », c'est inviter à créer une fiche de personnage dessus, et
  // la carte d'attributs d'une fiche en produit une soixantaine — un compte
  // relevé à 82 attributs pour 18 attendus, que le pont doit ensuite retirer au
  // démarrage. On coupe donc à la racine.
  //
  // LE NOM EST CELUI QUE LE PONT CONNAÎT (roll20-page.js, CAMP_NOM) : c'est la
  // même chaîne, comparée de la même façon, et les deux doivent bouger
  // ensemble. Ici on ne peut pas interroger le pont — un script de contenu ne
  // voit pas window.Campaign — et surtout on ne veut pas l'INJECTER pour si
  // peu : ce fichier tient à ne rien injecter de son propre chef.
  //
  // Trois sources, de la plus fiable à la plus lointaine, parce qu'aucune n'est
  // garantie : le journal de la partie (là où Roll20 écrit les noms, et où le
  // pont va déjà chercher de quoi ouvrir la fiche), le titre du dialogue, et en
  // fenêtre séparée le titre du document. AUCUN NOM TROUVÉ VAUT « ce n'est pas
  // le camp » : on ne retire jamais un chemin d'accès sur un doute.
  var CAMP_NOM = "monde";
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
  function estCamp(charId) {
    var n = nomJournal(charId) || nomDialogue() || (IS_POPOUT ? document.title : "");
    return !!n && (norm(n) === CAMP_NOM || norm(n) === "camp");
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
  // owdNuit vaut « auto » (défaut), « jour » ou « nuit ». Il est lu UNE FOIS,
  // dans la même lecture de stockage que le mode (voir garde) : une seconde
  // lecture serait une seconde course, et deux lectures qui se contredisent
  // font annoncer un mode à l'onglet et en montrer un autre.
  //
  // CE QUI PART DANS LE HASH RESTE « n=1/0 », et ce choix a une raison précise.
  // Le paramètre n dit aux pages servies par le site DE QUELLE COULEUR ELLES
  // DOIVENT ÊTRE : il ne rapporte pas le thème de Roll20 mais le thème VOULU,
  // c'est-à-dire l'ordre de l'utilisateur quand il en a donné un, et le thème
  // de Roll20 sinon. Le faire disparaître en mode « auto » coûterait la seule
  // chose que l'extension sait faire de mieux que le site : sans indice,
  // l'« auto » de la fiche et la nuit du camp retombent sur
  // prefers-color-scheme, donc sur le thème du NAVIGATEUR, et une partie Roll20
  // en sombre s'ouvrirait en clair sur un navigateur en clair. Aucune page du
  // site n'a besoin d'être touchée : elles lisent n comme avant.
  //
  // La fiche garde le dernier mot par sa propre préférence (onglet Options,
  // localStorage owd-r20-night) : un joueur qui a explicitement mis SA fiche en
  // jour la garde en jour. C'est voulu, le réglage le plus précis gagne ; le
  // camp, lui, n'a pas de préférence à lui et suit le popup.
  var NUIT_ORDRE = "auto";
  // LA NUIT DE LA FICHE, quand elle en a annoncé une (message « nuit » de son
  // iframe). En « auto », c'est ELLE qui décide, avant le mode de Roll20 : les
  // cartes de dés que la fiche envoie se lisent à côté d'elle, et une fiche de
  // nuit qui fait tomber des cartes de jour dans le tchat n'a aucun sens.
  var NUIT_FICHE = null;
  function normNuit(v) { return v === "jour" || v === "nuit" ? v : "auto"; }
  function nuitEffective() {
    if (NUIT_ORDRE === "nuit") return true;
    if (NUIT_ORDRE === "jour") return false;
    if (NUIT_FICHE !== null) return NUIT_FICHE;
    return detectNight();
  }
  // Nos boîtes portent leur nuit sur elles-mêmes (.owd-nuit), jamais sur la
  // racine : overlay.css est injectée dans TOUTES les frames de Roll20, et une
  // classe posée sur <html> serait une main sur l'interface d'un autre site.
  function poseNuit(elt) {
    if (elt) elt.classList.toggle("owd-nuit", nuitEffective());
    return elt;
  }
  // creator.html est PARTAGÉE par les deux parties : rien dedans ne dépend du
  // mode, seule la coquille qu'elle charge en dépend. Le mode lui arrive donc
  // dans le hash (« &m=… »), d'où shell-loader.js le lit sans rien demander au
  // stockage. Le hash entier descend ensuite jusqu'à la page du site, qui ignore
  // ce qu'elle ne connaît pas.
  function creatorFrame(charId) {
    var f = el("iframe", "owd-creator-frame");
    f.src = browser.runtime.getURL("creator.html") + "#c=" + encodeURIComponent(charId || "") +
            "&n=" + (nuitEffective() ? "1" : "0") + "&m=" + MODE;
    f.setAttribute("allow", "clipboard-write");
    // le fond de l'iframe se voit AVANT que la fiche distante ait peint : clair
    // sous une fiche sombre, cela ferait un éclair blanc à chaque ouverture
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
    var wrap = poseNuit(el("div", "owd-create"));
    wrap.appendChild(el("div", "owd-create-title", LIBELLE));
    wrap.appendChild(el("p", "owd-create-msg",
      exists === null
        ? "Roll20 n'a pas encore répondu (personnage non prêt). Ouvrir la fiche Outward :"
        : "Ce personnage n'a pas encore de fiche Outward."));
    var btn = el("button", "owd-create-btn", exists === null ? "Ouvrir la fiche Outward" : "Créer fiche Outward");
    btn.type = "button";
    btn.addEventListener("click", function () { fillCreator(host, charId); });
    wrap.appendChild(btn);
    host.appendChild(wrap);
  }
  // Décide quoi afficher dans l'hôte selon l'existence d'une fiche.
  function populate(host, charId) {
    host.innerHTML = "";
    host.appendChild(poseNuit(el("div", "owd-create", "Chargement…")));
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

      // Le camp n'a pas de fiche. Le contrôle est refait à CHAQUE passage, et
      // pas seulement avant la pose : le journal peut n'avoir pas encore répondu
      // au premier balayage, et l'onglet serait alors déjà là. On le retire
      // alors — l'onglet SEUL. Le pane, lui, reste : le système d'onglets de
      // Roll20 garde un renvoi vers lui, et le supprimer d'un dialogue déjà lié
      // empêche la fiche du personnage de s'ouvrir, la nôtre comme les siennes.
      if (estCamp(charId)) {
        var vieux = strip.querySelector(".owd-tab");
        if (vieux && vieux.parentNode) vieux.parentNode.removeChild(vieux);
        var vieuxPane = dialog && dialog.querySelector && dialog.querySelector(".tab-pane.owdfiche");
        if (vieuxPane) { vieuxPane.style.display = "none"; vieuxPane.classList.remove("owd-on"); }
        return;
      }
      if (strip.querySelector(".owd-tab")) { placed++; return; }   // déjà là

      var contentBox = contentBoxOf(dialog, strip);
      // conteneur des panes = parent d'un pane natif (là où Roll20 les place)
      var nativePane = (dialog && dialog.querySelector(".tab-pane")) || document.querySelector(".tab-pane");
      var paneBox = (nativePane && nativePane.parentNode) || contentBox;
      if (!paneBox) return;

      // On travaille AVEC le système d'onglets de Jumpgate (source vérifiée) :
      //   bindTabEvents() fait, pour chaque `.nav li a`,
      //     allTabs[a.data-tab] = find('.tab-pane.'+data-tab)[0]; allTabs[...].style...
      //   -> si le pane manque, allTabs[...] est undefined et Roll20 PLANTE (fiche
      //   qui ne s'ouvre plus). On crée donc TOUJOURS le pane `.tab-pane.owdfiche`
      //   AVANT de poser l'onglet `<a data-tab="owdfiche">` : Roll20 l'enregistre et
      //   le gère nativement (affichage + onglet actif violet).
      var pane = paneBox.querySelector(".tab-pane.owdfiche");
      if (!pane) {
        pane = el("div", "tab-pane owdfiche owd-pane");
        pane.style.display = "none";
        paneBox.appendChild(pane);
      }

      // vrai onglet, cloné des onglets natifs (styles Roll20 : look + actif violet)
      var tab = document.createElement(feuilleItem.tagName || "li");
      tab.className = ((feuilleItem.className || "").replace(/\b(active|ui-tabs-active|ui-state-active|chosen)\b/g, "").trim() + " owd-tab").trim();
      var nativeA = feuilleItem.querySelector("a");
      var a = document.createElement("a");
      if (nativeA && nativeA.className) a.className = nativeA.className;
      a.setAttribute("href", "javascript:void(0);");
      a.setAttribute("data-tab", "owdfiche");
      a.textContent = LIBELLE;
      tab.appendChild(a);

      var built = false;
      function showOurPane() {
        var panes = paneBox.querySelectorAll(".tab-pane");
        for (var j = 0; j < panes.length; j++) panes[j].style.display = (panes[j] === pane) ? "block" : "none";
        pane.classList.add("owd-on");   // seule cette classe rend le pane visible (overlay.css)
        for (var k = 0; k < strip.children.length; k++) strip.children[k].classList.remove("active");
        tab.classList.add("active");
        refitFrame();   // l'iframe redevient visible : réajuster sa hauteur au dialogue
      }
      function hideOurPane() { pane.style.display = "none"; pane.classList.remove("owd-on"); tab.classList.remove("active"); }

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
        if (na && na.getAttribute("data-tab") !== "owdfiche") hideOurPane();
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
      o.postMessage({ ns: "owd", type: d.type, charId: d.charId, die: d.die, value: d.value,
                      label: d.label, title: d.title, fields: d.fields, raw: d.raw, relayed: true },
                    "https://app.roll20.net");
    } catch (e) {}
  }

  // ---------- « Prendre » : le lien d'un objet donné, cliqué dans le tchat ----------
  // La fiche vit dans une iframe : elle ne voit pas le tchat. C'est donc ICI
  // qu'on intercepte le clic sur le lien « [Prendre](/owd_take <payload>) »
  // composé par la fiche, pour renvoyer le payload — jamais interprété ici —
  // aux fiches ouvertes, qui affichent leur dialogue de réception.
  var TAKE_RE = /^\/owd_take\s+([A-Za-z0-9+/=_-]+)$/;
  var sheets = [];   // fenêtres de fiches (ou popouts) qui nous ont parlé
  function rememberSheet(w) {
    if (!w) return;
    try { if (sheets.indexOf(w) < 0) sheets.push(w); } catch (e) {}
  }
  function diffuseTake(payload) {
    sheets = sheets.filter(function (w) { try { return w && !w.closed; } catch (e) { return false; } });
    var n = 0;
    sheets.forEach(function (w) {
      try { w.postMessage({ ns: "owd", type: "take", payload: payload }, "*"); n++; } catch (e) {}
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
  // Cet écouteur ne peut pas se poser au chargement du fichier : tant que le
  // stockage n'a pas répondu, cette copie ignore si elle est celle du mode, et
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
        toast("Ouvre ta fiche Outward (onglet « Fiche Outward » du personnage), puis reclique « Prendre ».");
      }
    }, true);
  }


  // ---------- les dés d'action : rhabiller le message du tchat ----------
  // Roll20 sait lancer, il ne sait pas présenter. La commande que le joueur
  // envoie est un gabarit « default » ordinaire :
  //
  //     &{template:default}{{name=OWD Action Dice}}{{rolls=[[1d6]][[1d6]]…}}
  //
  // …et Roll20 la rend en tableau gris, un jet par petite boîte jaune. On ne
  // touche NI à la commande NI au jet : les dés sont lancés par Roll20, donc
  // vérifiables par tous. On ne réécrit QUE la présentation, et seulement dans
  // le navigateur de qui porte l'extension — un joueur sans elle voit le
  // tableau d'origine, et les deux lisent les mêmes chiffres.
  //
  // D'OÙ VIENT CE DÉ. La construction suit « 3D Dice with CSS » de jico
  // (codepen.io/jico/pen/wvMpgog) : six faces posées par un quart de tour puis
  // un translateZ, des coins arrondis, et des POINTS plutôt que des chiffres.
  // Une première version maison empilait des triangles découpés au clip-path et
  // orientés par décomposition d'Euler. Elle était géométriquement exacte —
  // solides fermés, sommets au bon endroit — et illisible à l'écran. Elle a été
  // jetée : ce sont les coins arrondis et les points qui font reconnaître un dé,
  // pas la trigonométrie.
  //
  // POUR L'INSTANT, LE d6 SEUL. Tout autre dé reçoit un jeton rond, qui ne
  // prétend à aucune forme. Les solides à faces triangulaires viendront ensuite,
  // sur cette base-ci — mieux vaut un dé juste que six approximatifs.
  //
  // DEUX NOMS DE CLASSES, PAS UN DE PLUS, pour la reconnaissance :
  // « .sheet-rolltemplate-default » et « .inlinerollresult », documentés et
  // stables depuis des années. Viser la structure interne du tableau (les <td>,
  // l'ordre des lignes) aurait fait dépendre ce fichier — que la signature fige
  // — d'un détail que Roll20 change quand il veut.
  //
  // POURQUOI UN MARQUEUR SUR LE NOEUD. Notre réécriture est elle-même une
  // mutation du DOM : sans « data-owd-des », l'observateur se rappellerait sur
  // son propre travail, indéfiniment. Le marqueur se pose AVANT de construire,
  // jamais après : une exception au milieu de la construction laisserait sinon
  // un noeud non marqué que la mutation suivante reprendrait en boucle.
  var DES_NOM = "owd action dice";      // ce que {{name=…}} doit dire, normalisé
  var DES_MARQUE = "data-owd-des";      // posé sur le gabarit déjà rhabillé
  var desObs = null;                    // l'observateur du tchat, une fois posé
  var desCompteur = 0;                  // pour donner un id unique à chaque repli
  var desPosees = 0;                    // combien de cartes ont été rhabillées
  var desClicDit = false;               // le premier clic sur un dé se dit, une fois
  var desRefusDit = false;              // le premier refus se dit, les suivants non

  // LES BOUTONS DE LA CARTE ÉCOUTENT CHACUN LE SIEN, et c'est ce qui marche.
  //
  // IL Y A EU UN DÉLÉGUÉ, posé sur `window` en phase de capture, sur l'idée que
  // Roll20 interceptait les clics de son tchat avant qu'ils n'atteignent leur
  // cible. C'ÉTAIT FAUX : les boutons du pied — « re-animer », « détail Roll20 »
  // — ont toujours répondu avec un simple `addEventListener` sur eux-mêmes. Le
  // délégué corrigeait donc un problème qui n'existait pas, et il a été retiré.
  //
  // LA LEÇON EST DANS LA MÉTHODE, PAS DANS LE CODE. Un dé qui ne se cochait pas
  // a été expliqué par une théorie — « le tchat avale les clics » — au lieu
  // d'être observé. La théorie était cohérente, elle rendait compte du symptôme,
  // et elle était fausse ; le remède a coûté plus cher que le mal. Quand quelque
  // chose ne répond pas dans une page qu'on ne peut pas ouvrir, on instrumente
  // AVANT de réparer.

  // ---- LE DÉ, ET D'OÙ IL VIENT ----
  // Le dessin des dés n'est pas ici : il est dans `des3d.js`, chargé avant ce
  // fichier et partagé par les deux modes. Ce fichier-ci ne sait que deux
  // choses : lire le tchat, et demander un dé.
  //
  // LE RAYON, en pixels. C'est le rayon de la sphère qui circonscrit le solide,
  // donc la MÊME grandeur pour les six : un d20 et un d4 côte à côte occupent le
  // même cercle, comme dans une boîte de dés du commerce.
  //
  // 23 ET PAS PLUS, et c'est la colonne du tchat qui décide. Un jet d'action
  // d'Outward, c'est CINQ dés ; la piste les enveloppe à la ligne quand ils ne
  // tiennent pas, et cinq dés sur deux lignes se comptent moins bien que cinq
  // dés sur une.
  var DE_RAYON = 23;

  // LA COULEUR NE SE RÈGLE PLUS ICI, ET C'EST VOULU. Chaque type de dé a la
  // sienne, en deux versions — claire le jour, sombre la nuit — et c'est le
  // moteur qui la pose, sur la foi du mode qu'on lui passe. Le d20 reprend le
  // violet du d20 du logo Roll20. L'encre du chiffre suit toute seule : noire sur
  // un dé clair, blanche sur un dé sombre. Rien ne le décide, cela tombe du
  // contraste — voir `encrePour` dans des3d.js.

  // Le réglage « réduire les animations » n'est pas interrogé ICI : le moteur des
  // dés le fait lui-même, à chaque dé, et il est le seul à animer quoi que ce
  // soit sur cette carte. Voir `moinsDeMouvement` dans des3d.js.

  // La valeur d'un jet en ligne. textContent porte le résultat ; on refuse tout
  // ce qui n'est pas un entier, plutôt que de rendre « NaN » dans une jolie
  // boîte — un dé illisible vaut « pas de dé », et le message reste tel quel.
  function desValeur(n) {
    var t = String((n && n.textContent) || "").replace(/\s+/g, "");
    return /^\d+$/.test(t) ? parseInt(t, 10) : null;
  }

  // ==================================================================
  // DEUX LECTURES, ET ELLES N'ONT PAS LE MÊME DROIT À L'ERREUR
  // ==================================================================
  // DESSINER est indulgent : on cherche « NdM » n'importe où dans l'infobulle,
  // et à défaut on prend six faces. Se tromper de solide n'affirme rien de faux
  // — le CHIFFRE affiché vient de Roll20 et reste exact, et c'est lui qu'on lit.
  //
  // RELANCER est strict : recomposer une commande de jet à partir d'une lecture
  // approximative remplacerait un total par un dé unique sans que personne ne le
  // voie. Un jet qu'on ne sait pas recomposer n'est simplement pas
  // sélectionnable — il s'affiche, il ne se relance pas.
  //
  // C'EST LA LEÇON LA PLUS CHÈREMENT PAYÉE DE CE FICHIER. Les deux lectures ont
  // été fondues en une seule, stricte, au nom de la rigueur ; le résultat n'a pas
  // été une carte plus sévère mais une carte ABSENTE, car le moindre jet illisible
  // refusait le message entier. Et dans une page qu'on ne peut pas ouvrir, une
  // lecture qui rate ne se voit pas : elle s'écrit « rien ne se passe ».

  // L'EXPRESSION D'UN JET, ET L'INFOBULLE EST DU HTML — pas du texte. Relevé sur
  // une vraie partie, le `title` d'un jet en ligne vaut :
  //
  //     <img src="/images/quantumrollwhite.png" class="inlineqroll"> Rolling 1d8
  //     = (<span class="basicdiceroll critsuccess ">8</span>)
  //
  // ON RETIRE DONC LES BALISES AVANT TOUT LE RESTE, et l'ordre n'est pas une
  // commodité : sans cela, le premier « = » rencontré est celui de `src=`, on
  // tronque à cet endroit, et il ne reste que « <img ». C'est exactement ce qui
  // s'est produit — `desRelancable` ne reconnaissait plus rien, rendait zéro, et
  // pas un dé n'était sélectionnable. Le dessin, lui, marchait : `desTaille` lit
  // la chaîne brute et y trouve « 1d8 » sans passer par ici. Des dés justes, et
  // aucun bouton : le symptôme n'accusait rien de ce qui était en cause.
  //
  // LE PRÉFIXE EST RETIRÉ SANS ÊTRE NOMMÉ : un mot de lettres en tête s'en va,
  // quel qu'il soit. Écrire « Rolling » en toutes lettres, ce serait parier sur
  // la langue de l'interface et sur le mot que Roll20 emploie cette année.
  function desExpr(detail) {
    var t = String(detail || "").replace(/<[^>]*>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");
    t = t.replace(/^[^A-Za-zÀ-ÿ0-9]*[A-Za-zÀ-ÿ]+\s+/, "");
    var i = t.indexOf("=");
    if (i >= 0) t = t.slice(0, i);
    return t.replace(/\s+/g, "");
  }

  // CE DÉ PEUT-IL ÊTRE RELANCÉ SEUL ? Il faut pour cela savoir le RECOMPOSER, et
  // on ne le sait que de deux formes :
  //     « 1d8 », « d8 »   un dé simple, qu'on relance à l'identique ;
  //     « 0d8+7 »         un dé TENU à sa valeur par une relance précédente,
  //                       qu'on peut donc relancer pour de bon cette fois.
  // Tout le reste — « 2d6 », « 1d6+2 », « 4d6kh3 » — rend zéro : le dé s'affiche,
  // mais il n'offre pas de case à cocher.
  var RE_SIMPLE = /^(?:1)?d(\d{1,3})$/i;
  var RE_TENU = /^0d(\d{1,3})\+(\d+)$/i;
  function desRelancable(detail) {
    var e = desExpr(detail);
    var m = RE_SIMPLE.exec(e) || RE_TENU.exec(e);
    return m ? parseInt(m[1], 10) : 0;
  }

  // LA TAILLE POUR LE DESSIN, et elle ne renonce jamais. Le premier « NdM »
  // rencontré donne le solide ; à défaut, six faces. Ce défaut n'est pas un
  // aveu de paresse : il vaut mieux un d6 portant le bon chiffre qu'un blanc.
  function desTaille(detail) {
    var m = /(\d*)\s*d\s*(\d{1,3})/i.exec(String(detail || ""));
    var n = m ? parseInt(m[2], 10) : 0;
    return n >= 2 ? n : 6;
  }

  // Le gabarit porte-t-il NOS dés d'action ? On exige les trois à la fois : le
  // gabarit, le nom, et au moins un jet en ligne. Le nom seul ne suffirait pas —
  // quelqu'un qui écrirait « OWD Action Dice » au tchat verrait son message
  // rhabillé en dés.
  function desConcerne(tpl) {
    if (!tpl || tpl.getAttribute(DES_MARQUE)) return null;
    if (norm(tpl.textContent).indexOf(DES_NOM) < 0) return null;
    var brut = tpl.querySelectorAll(".inlinerollresult");
    var out = [];
    for (var i = 0; i < brut.length; i++) {
      var v = desValeur(brut[i]);
      if (v === null) continue;       // un jet illisible est sauté, pas fatal
      var det = brut[i].getAttribute("title") || "";
      out.push({ valeur: v, detail: det, taille: desTaille(det),
                 relancable: desRelancable(det) });
    }
    return out.length ? out : null;
  }

  // LE DÉ D'UN JET, ET IL SORT TOUJOURS QUELQUE CHOSE. Quand le moteur sait
  // dessiner le solide, c'est un vrai dé qui roule. Quand il ne sait pas — un
  // d100, une somme, une taille qu'aucun des six solides ne porte —, c'est un
  // JETON : une pastille ronde avec le chiffre. Le chiffre est ce qui compte,
  // et il est juste dans les deux cas.
  function desFace(d, rang, lot) {
    var fait = null;
    try {
      if (window.OwdDes3d && window.OwdDes3d.connait(d.taille, d.valeur)) {
        fait = window.OwdDes3d.creer(d.taille, d.valeur, rang, DE_RAYON, lot,
                                     nuitEffective());
      }
    } catch (e) {}
    var boite = el("div", "owd-de");
    if (d.valeur >= d.taille) boite.classList.add("owd-de-haut");
    if (d.valeur <= 1) boite.classList.add("owd-de-bas");
    if (fait) {
      if (d.detail) fait.noeud.setAttribute("title", d.detail);
      boite.appendChild(fait.noeud);
      return { noeud: boite, rejoue: fait.rejoue };
    }
    var jeton = el("div", "owd-jeton", String(d.valeur));
    if (d.detail) jeton.setAttribute("title", d.detail);
    boite.appendChild(jeton);
    return { noeud: boite, rejoue: function () {} };
  }

  function desCarte(liste) {
    // la carte suit le réglage jour/nuit du popup, comme toutes nos boîtes :
    // le tchat de Roll20 a son propre thème, qui n'est pas forcément le nôtre
    var carte = poseNuit(el("div", "owd-des"));
    var tete = el("div", "owd-des-tete");
    tete.appendChild(el("span", "owd-des-titre", "Dés d'action"));

    // L'ÉTIQUETTE DIT CE QU'ON A VRAIMENT LANCÉ, dé par dé : « 3d6 · 1d4 »
    // plutôt qu'un « 4d6 » qui serait faux dès qu'un jet mélange les dés.
    // COLLÉ, sans espace entre le compte et le dé : « 1d20 » est la notation du
    // jet telle qu'on l'écrit à la table et telle que Roll20 la lit ; « 1 d20 »
    // n'est la notation de personne, et fait lire deux mots là où il n'y a
    // qu'une seule chose.
    var compte = {}, ordre = [], i;
    for (i = 0; i < liste.length; i++) {
      var t = liste[i].taille;
      if (!compte[t]) { compte[t] = 0; ordre.push(t); }
      compte[t]++;
    }
    var bouts = [];
    for (i = 0; i < ordre.length; i++) bouts.push(compte[ordre[i]] + "d" + ordre[i]);
    tete.appendChild(el("span", "owd-des-compte", bouts.join(" · ")));
    carte.appendChild(tete);

    // LES DÉS DE CETTE CARTE PARTENT D'UN MÊME GESTE. Le lot porte le premier
    // coup — son axe et sa vitesse — et le moteur le donne à chacun ; tout le
    // reste, orientation de départ, durée de vol, rebonds, leur appartient. Le
    // lot vaut aussi pour « re-animer » : le moteur voit repasser un dé qu'il a
    // déjà servi et en déduit qu'un nouveau geste commence.
    var lot = (window.OwdDes3d && window.OwdDes3d.lot) ? window.OwdDes3d.lot() : null;
    var piste = el("div", "owd-des-piste");
    var somme = 0, haut = 0, choisis = [], choix = [];
    for (i = 0; i < liste.length; i++) {
      var de = desFace(liste[i], i, lot);
      somme += liste[i].valeur;
      if (liste[i].valeur > haut) haut = liste[i].valeur;
      choisis.push(false);

      // ON CHOISIT LES DÉS EN CLIQUANT DESSUS, et c'est la plus grande cible de
      // la carte — la seule qui désigne sans ambiguïté celui qu'on vise. Une
      // case à cocher posée à côté aurait demandé de viser deux fois : le dé
      // pour le lire, la case pour le prendre.
      //
      // MAIS LE BOUTON NE CONTIENT PAS LE DÉ, IL SE POSE DESSUS — et c'est le
      // point qui a coûté le plus cher de toute cette carte.
      //
      // LE SEUL FAIT DONT ON DISPOSE SUR LE VRAI ROLL20 : les boutons du PIED
      // répondent, ceux des dés non. Même carte, même feuille de style, même
      // `addEventListener("click")`. La différence n'était donc ni dans le
      // tchat, ni dans l'écouteur, ni dans l'anneau — elle était dans ce que le
      // bouton CONTENAIT. Celui du pied ne porte que du texte ; celui d'un dé
      // enfermait toute la scène : un sous-arbre `contain: layout style`, un
      // contexte 3D avec sa perspective, et une dizaine de faces réécrites à
      // chaque image. C'était aussi un <div> dans un <button>, que le modèle de
      // contenu HTML interdit — sans conséquence tant que personne ne
      // resérialise le message, fatal le jour où quelqu'un le fait.
      //
      // ON SUPPRIME LA DIFFÉRENCE AU LIEU DE LA CONTOURNER. Le bouton devient
      // un carré transparent, VIDE, frère du dé et posé par-dessus lui. Il est
      // alors structurellement le bouton du pied, dont on SAIT qu'il répond.
      // Sa taille est celle de la sphère circonscrite — deux rayons de côté,
      // centrée sur le centre du solide : quelle que soit la rotation, le dé y
      // tient tout entier, donc on le clique partout où on le voit.
      //
      // UN <button aria-pressed> et non une case : ce n'est pas un formulaire
      // qu'on soumet, c'est un état qu'on bascule. Le dé non relançable, lui,
      // n'en reçoit aucun : un bouton qui refuse tous les clics est un piège.
      if (liste[i].relancable) {
        var etui = el("div", "owd-de-case");
        // LE DÉCOR D'ABORD, ET C'EST TOUT L'INTÉRÊT : premier dans l'arbre donc
        // premier peint, il passe SOUS le dé au lieu de le ronger. Le bouton,
        // lui, reste au-dessus — mais il ne montre plus rien.
        etui.appendChild(el("div", "owd-de-halo"));
        etui.appendChild(de.noeud);
        var b = el("button", "owd-de-choix");
        b.type = "button";
        b.setAttribute("aria-pressed", "false");
        b.setAttribute("title", "Cliquer pour relancer ce dé ; recliquer pour le garder.");
        // le bouton est VIDE : il lui faut donc un nom dit à voix haute
        b.setAttribute("aria-label", "dé " + (i + 1) + " sur " + liste.length +
                       ", d" + liste[i].taille + ", valeur " + liste[i].valeur);
        // deux rayons de côté, écrits ici parce que c'est ici qu'on connaît le
        // rayon ; la feuille de style, elle, ne peut pas le deviner
        b.style.width = (2 * DE_RAYON) + "px";
        b.style.height = (2 * DE_RAYON) + "px";
        etui.appendChild(b);
        (function (b2, k, etui2) {
          b2.addEventListener("click", function (ev) {
            ev.preventDefault(); ev.stopPropagation();
            choisis[k] = !choisis[k];
            b2.setAttribute("aria-pressed", choisis[k] ? "true" : "false");
            // l'état sur l'ÉTUI : c'est lui qui porte le halo, et le halo est
            // le frère du bouton, qu'aucun sélecteur simple ne saurait viser
            // depuis lui.
            etui2.classList.toggle("owd-choisi", choisis[k]);
            majRelance();
            if (!desClicDit) {
              desClicDit = true;
              desDit("premier clic sur un dé : il répond, sélection " +
                     (choisis[k] ? "posée" : "retirée"));
            }
          });
        })(b, choisis.length - 1, etui);
        choix.push(b);
        piste.appendChild(etui);
      } else {
        // pas de case à cocher : ce jet-là, on sait l'afficher mais pas le refaire
        piste.appendChild(de.noeud);
      }
    }
    carte.appendChild(piste);

    // LA VALEUR EST AUSSI ÉCRITE EN CLAIR, sous chaque dé. Des points se comptent
    // mal du coin de l'oeil, et une capture d'écran du tchat doit rester lisible.
    var chiffres = el("div", "owd-des-chiffres");
    for (i = 0; i < liste.length; i++) {
      var c = el("span", "owd-des-chiffre", String(liste[i].valeur));
      if (liste[i].valeur >= liste[i].taille) c.classList.add("owd-des-chiffre-haut");
      if (liste[i].valeur <= 1) c.classList.add("owd-des-chiffre-bas");
      chiffres.appendChild(c);
    }
    carte.appendChild(chiffres);

    // Le pied dit la SOMME et le MEILLEUR, discrètement. Aucun des deux n'est le
    // résultat du tour : les dés d'action s'engagent un à un, c'est le joueur qui
    // choisit lesquels. Les mettre en gros ferait croire à un jet unique.
    var pied = el("div", "owd-des-pied");
    pied.appendChild(el("span", "owd-des-info", "somme " + somme));
    pied.appendChild(el("span", "owd-des-info", "meilleur " + haut));

    // PLUS DE « RE-ANIMER » (retiré à la demande de l'auteur, 21/09/2026) : il
    // ne servait à rien, et sa place revient aux deux commandes utiles, qui
    // tiennent désormais sur une même ligne. Le pied a DEUX GROUPES qui ne se
    // cassent pas : les résultats, puis les commandes ; s'il manque de place,
    // c'est le groupe entier qui passe à la ligne, jamais un bouton seul.
    var infos = el("span", "owd-des-groupe");
    while (pied.firstChild) infos.appendChild(pied.firstChild);
    pied.appendChild(infos);
    var cmds = el("span", "owd-des-groupe");
    pied.appendChild(cmds);

    // LE DÉTAIL DE ROLL20, PAR UN BOUTON DE LA CARTE. Le message d'origine était
    // replié dans un <details> posé SOUS la carte, avec son propre libellé : deux
    // commandes, deux endroits, deux styles, pour une carte qui n'en demande
    // qu'un. Le bouton rejoint donc « re-animer » dans le pied, et le <details>
    // devient une simple boîte que ce bouton montre ou cache.
    // C'est `desRhabille` qui les marie : lui seul a les deux sous la main.
    var det = el("button", "owd-des-rejouer owd-des-detail", "Détails");
    det.type = "button";
    det.setAttribute("aria-expanded", "false");
    det.setAttribute("title", "Montre le message que Roll20 a réellement écrit.");
    cmds.appendChild(det);

    // RELANCER LES DÉS CHOISIS, ET EUX SEULS.
    //
    // CE QUE ÇA ENVOIE. Un NOUVEAU message au tchat, qui reprend la main entière
    // dans son ordre : les dés choisis en jet neuf, les autres tenus à leur
    // valeur. Ce n'est pas la carte qu'on modifie — on ne modifie jamais un jet
    // déjà écrit —, c'est un jet de plus, que toute la table voit passer et peut
    // vérifier. L'ancienne carte reste au-dessus, avec ses valeurs.
    //
    // COMMENT ON TIENT UNE VALEUR — et c'est tout le problème. Écrire « [[7]] »
    // rendrait bien 7, mais rien dans ce message ne dirait plus que ce 7 était un
    // d8 : la carte suivante ne saurait plus quel solide dessiner. On écrit donc
    //
    //     [[0d8+7]]
    //
    // Zéro dé à huit faces, plus sept : le résultat est 7, toujours, et
    // l'infobulle porte « 0d8 ». La TAILLE voyage ainsi dans l'expression même
    // que Roll20 évalue, sans champ supplémentaire à inventer ni convention à
    // retenir — et un lecteur qui ouvre « détail Roll20 » voit en clair que cette
    // valeur a été tenue, pas relancée.
    // Une première version écrivait « [[1d8*0+7]] », par prudence : on n'était
    // pas certain que Roll20 accepte de lancer zéro dé. Il l'accepte, et « 0d8 »
    // dit exactement ce qu'il veut dire — aucun dé n'a été lancé pour cette
    // valeur — là où « 1d8*0 » lançait un dé pour le jeter aussitôt.
    var rel = el("button", "owd-des-rejouer owd-des-relancer", "relancer");
    rel.type = "button";
    rel.disabled = true;
    rel.setAttribute("title", "Choisis un ou plusieurs dés sur la carte, puis relance-les.");
    rel.addEventListener("click", function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      if (rel.disabled) return;
      var k, bouts = [];
      for (k = 0; k < liste.length; k++) {
        if (choisis[k]) bouts.push("[[1d" + liste[k].relancable + "]]");
        else bouts.push("[[0d" + (liste[k].relancable || liste[k].taille) +
                        "+" + liste[k].valeur + "]]");
      }
      desDit("relance : " + bouts.join(""));
      sendToChat(document, "&{template:default}{{name=OWD Action Dice}}{{rolls=" +
                 bouts.join("") + "}}");

      // ON DÉCOCHE TOUT, LA COMMANDE PARTIE. Le jet suivant arrive dans une
      // carte NEUVE ; celle-ci n'est plus qu'un historique, et un anneau resté
      // allumé dessus laisserait croire qu'un choix y attend encore. Le geste
      // est fini : la carte doit le montrer.
      for (k = 0; k < choisis.length; k++) {
        choisis[k] = false;
        if (choix[k]) {
          choix[k].setAttribute("aria-pressed", "false");
          if (choix[k].parentNode) choix[k].parentNode.classList.remove("owd-choisi");
        }
      }
      majRelance();
    });
    cmds.appendChild(rel);

    function majRelance() {
      var k, n = 0;
      for (k = 0; k < choisis.length; k++) if (choisis[k]) n++;
      rel.disabled = n === 0;
      rel.textContent = n ? ("relancer " + n) : "relancer";
    }

    carte.appendChild(pied);
    return { noeud: carte, detail: det };
  }

  // Rhabille UN gabarit. L'original n'est pas supprimé : il est replié dans un
  // <details> fermé, sous la carte. Deux raisons, et la seconde est la vraie —
  // on peut vérifier le détail d'un jet contesté à la table, et le jour où cette
  // réécriture se trompera, le message d'origine sera encore là pour le dire.
  function desRhabille(tpl) {
    var liste = desConcerne(tpl);
    if (!liste) return false;
    tpl.setAttribute(DES_MARQUE, "1");   // AVANT de construire : voir l'en-tête
    try {
      var hote = el("div", "owd-des-hote");
      var fait = desCarte(liste);
      hote.appendChild(fait.noeud);

      // LE REPLI N'EST PLUS UN <details>, C'EST UNE BOÎTE QU'UN BOUTON MONTRE.
      // Un <details> apporte son propre <summary> — donc un second libellé, une
      // seconde commande, un second style — là où la carte en a déjà un dans son
      // pied. Cacher ce <summary> aurait laissé un élément interactif invisible,
      // ce qui est pire que pas d'élément du tout. Une boîte et `hidden` disent
      // exactement la même chose, et `aria-expanded` sur le bouton porte l'état
      // aux lecteurs d'écran, ce que le <summary> caché ne faisait plus.
      var repli = el("div", "owd-des-repli");
      repli.hidden = true;
      repli.id = "owd-des-repli-" + (++desCompteur);
      fait.detail.setAttribute("aria-controls", repli.id);
      fait.detail.addEventListener("click", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        repli.hidden = !repli.hidden;
        fait.detail.setAttribute("aria-expanded", repli.hidden ? "false" : "true");
      });

      // le gabarit d'origine est DÉPLACÉ, jamais recopié : une copie se
      // désynchroniserait d'une éventuelle mise à jour de Roll20
      tpl.parentNode.insertBefore(hote, tpl);
      repli.appendChild(tpl);
      hote.appendChild(repli);
      desPosees++;
      if (desPosees === 1) desDit("première carte de dés posée (" + liste.length + " dés)");
      return true;
    } catch (e) {
      return false;
    }
  }

  // LE PREMIER GABARIT VU SE SIGNALE, une seule fois. C'est le dernier angle
  // mort du diagnostic : si aucune carte n'apparaît, il faut pouvoir dire si
  // c'est parce qu'aucun gabarit n'a été RECONNU, ou parce qu'un gabarit a bien
  // été vu mais qu'il ne portait pas notre nom. Sans cette ligne, les deux cas
  // sont muets et se ressemblent exactement.
  var desGabaritDit = false;
  function desSignaleGabarit(tpl) {
    if (desGabaritDit) return;
    desGabaritDit = true;
    var t = norm(tpl.textContent).slice(0, 90);
    desDit("premier gabarit vu — nom " +
           (t.indexOf(DES_NOM) >= 0 ? "RECONNU" : "étranger") + " : « " + t + " »");
  }

  function desBalaye(racine) {
    if (!racine || !racine.querySelectorAll) return;
    var l = racine.querySelectorAll(".sheet-rolltemplate-default:not([" + DES_MARQUE + "])");
    for (var i = 0; i < l.length; i++) { desSignaleGabarit(l[i]); desRhabille(l[i]); }
    // le noeud ajouté PEUT être le gabarit lui-même, pas seulement son parent
    if (racine.classList && racine.classList.contains("sheet-rolltemplate-default")) {
      desSignaleGabarit(racine); desRhabille(racine);
    }
  }

  // Le tchat, quel que soit le nom que Roll20 donne à sa boîte cette année. On
  // observe le plus PROCHE conteneur trouvé plutôt que le document entier :
  // l'éditeur Roll20 mute sans arrêt (jetons, calques, minuteurs), et écouter
  // tout ferait tourner ce balayage des centaines de fois par seconde.
  // OÙ EST LE TCHAT ? La liste est longue à dessein, et elle a une histoire :
  // Roll20 a changé de moteur — « Jumpgate » — et rien ne garantit que le
  // conteneur du tchat porte encore le même identifiant d'une partie à l'autre.
  // On essaie donc du plus PRÉCIS au plus LARGE, et l'on retient le premier qui
  // réponde. Le nom du sélecteur qui a mordu est gardé : c'est lui qu'on affiche
  // au démarrage, et c'est la seule façon, d'ici, de savoir sur quel Roll20 on
  // est tombé.
  var DES_SELS = [
    "#textchat .content",
    "#textchat",
    "[id*='textchat'] .content",
    "[id*='textchat']",
    "[class*='textchat'] [class*='content']",
    "[class*='textchat']",
    "[data-testid*='chat'] [class*='content']",
    "[data-testid*='chat']",
    "[class*='chat-messages']",
    "[class*='chatmessages']",
    "[aria-label*='chat' i]"
  ];
  var desSelTrouve = "";
  function desBoite() {
    for (var i = 0; i < DES_SELS.length; i++) {
      var n = document.querySelector(DES_SELS[i]);
      if (n) { desSelTrouve = DES_SELS[i]; return n; }
    }
    desSelTrouve = "";
    return null;
  }

  function poseDes() {
    if (desObs) return;
    var boite = desBoite();
    if (!boite) return;
    desBalaye(boite);   // les messages DÉJÀ là (rechargement en cours de partie)
    try {
      desObs = new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) {
          var aj = muts[i].addedNodes;
          for (var j = 0; j < aj.length; j++) {
            if (aj[j].nodeType === 1) desBalaye(aj[j]);
          }
        }
      });
      desObs.observe(boite, { childList: true, subtree: true });
    } catch (e) {}
  }

  // Le tchat n'existe pas forcément quand le script démarre : Roll20 le monte
  // après sa connexion. On réessaie quelques secondes, puis on renonce — un
  // intervalle laissé tourner pour rien, dans un onglet ouvert toute une soirée,
  // finit par se voir.
  // L'EXTENSION DIT CE QU'ELLE FAIT, ET C'EST UNE LEÇON PAYÉE CHER.
  // Elle ne disait rien : ni qu'elle s'était chargée, ni qu'elle avait trouvé le
  // tchat, ni qu'elle avait renoncé. Quand un joueur signale « je ne vois plus
  // rien », il n'y a alors AUCUN moyen de distinguer une extension absente d'une
  // extension présente qui ne trouve pas le tchat, ou d'un contrat de lecture
  // devenu trop étroit — trois pannes qui se ressemblent et se corrigent
  // autrement. Une ligne au démarrage tranche entre les trois en une seconde.
  // Une ligne, pas un flot : le journal de Roll20 est déjà un mur.
  function desDit(quoi) {
    try { console.info("[OWD " + MODE + "] " + quoi); } catch (e) {}
  }

  function guetteDes() {
    poseDes();
    if (desObs) { desDit("tchat trouvé (" + desSelTrouve + ") — dés d'action prêts"); return; }
    var n = 0;
    var iv = setInterval(function () {
      poseDes();
      if (desObs) {
        clearInterval(iv);
        desDit("tchat trouvé après " + n + " s (" + desSelTrouve + ") — dés d'action prêts");
      } else if (++n > 30) {
        clearInterval(iv);
        desDit("TCHAT INTROUVABLE après 30 s — les dés d'action ne seront pas " +
               "rhabillés. Aucun de ces sélecteurs ne répond : " + DES_SELS.join(" · "));
      }
    }, 1000);
  }

  // OUTWARD : même squelette de séparateur et boutons que VTTK/Roll20.
  // La hauteur appartient au panneau, jamais à la barre (notamment côté MJ).
  var IS_EDITEUR = IS_TOP && !IS_POPOUT && /^\/editor(\/|$)/.test(location.pathname);
  var outils = {}, barreObs = null, panelFront = 100020;
  var OUTILS = [
    {id:'monde',titre:'Monde',page:'roll20-camp.html',cle:'owdPanneau:roll20-camp.html',w:360,h:350,minW:280,minH:320},
    {id:'inventaire',titre:'Inventaire',page:'roll20-inventaire.html',cle:'owdPanneau:roll20-inventaire.html',w:850,h:650,minW:340,minH:320}
  ];
  function barreZone(){return document.querySelector('#master-toolbar .upper-buttons')||document.querySelector('#vm-master-toolbar .upper-buttons');}
  function barreRect(){var n=document.getElementById('master-toolbar')||document.getElementById('vm-master-toolbar');return n?n.getBoundingClientRect():null;}
  function borne(p){var e=p.etat,vw=window.innerWidth||1200,vh=window.innerHeight||800;
    e.w=Math.max(Math.min(p.def.minW,vw),Math.min(e.w,vw-16));e.h=Math.max(Math.min(p.def.minH,vh),Math.min(e.h,vh-16));
    e.x=Math.max(8,Math.min(e.x,Math.max(8,vw-e.w-8)));e.y=Math.max(8,Math.min(e.y,Math.max(8,vh-e.h-8)));}
  function geo(p){borne(p);var e=p.etat,r=barreRect();
    if(e.ancre&&r&&r.width>8){return {x:Math.max(8,Math.min(Math.round(r.right+16),window.innerWidth-e.w-8)),y:Math.max(8,Math.min(Math.round(r.top+24),window.innerHeight-e.h-8)),w:e.w,h:e.h};}
    return e;}
  function range(p){if(p.timer)clearTimeout(p.timer);p.timer=setTimeout(function(){var o={};o[p.def.cle]=p.etat;try{browser.storage.local.set(o);}catch(e){}},400);}
  function paintButton(p){var n=document.getElementById('owd-outil-'+p.def.id),slot=n&&n.querySelector('.icon-slot');if(!n)return;
    var b=n.querySelector('button')||n;b.setAttribute('aria-expanded',p.etat.ouvert?'true':'false');
    if(slot){slot.classList.toggle('icon-selected',p.etat.ouvert);if(p.etat.ouvert)slot.style.setProperty('background-color','var(--vtt-toolbar-active-selection-bg)');else slot.style.removeProperty('background-color');}}
  function applique(p){if(!p.box)return;var g=geo(p);p.box.hidden=!p.etat.ouvert;p.box.style.display=p.etat.ouvert?'flex':'none';
    p.box.style.left=g.x+'px';p.box.style.top=g.y+'px';p.box.style.width=g.w+'px';p.box.style.height=g.h+'px';
    p.anchor.title=p.etat.ancre?'Détacher':'Ancrer';p.anchor.textContent=p.etat.ancre?'⇲':'⇱';paintButton(p);}
  function remplit(p){if(p.frame)return;p.frame=el('iframe','owd-panneau-frame');p.frame.title=p.def.titre;p.frame.setAttribute('allow','clipboard-write');
    p.frame.src=browser.runtime.getURL('panneau.html')+'#p='+p.def.page+'&n='+(nuitEffective()?'1':'0')+'&m='+MODE;p.body.appendChild(p.frame);}
  function ouvre(p,on){if(on)p.box.style.zIndex=String(++panelFront);p.etat.ouvert=!!on;applique(p);if(on)remplit(p);range(p);}
  function geste(p,e,move){if(e.button!==0)return;e.preventDefault();e.stopPropagation();var target=e.currentTarget,g=geo(p),x=e.clientX,y=e.clientY;
    if(move){p.etat.ancre=false;p.etat.x=g.x;p.etat.y=g.y;}
    var start={x:p.etat.x,y:p.etat.y,w:p.etat.w,h:p.etat.h};p.box.classList.add('owd-panneau-geste');
    try{target.setPointerCapture(e.pointerId);}catch(err){}
    function drag(ev){var dx=ev.clientX-x,dy=ev.clientY-y;if(move){p.etat.x=start.x+dx;p.etat.y=start.y+dy;}else{p.etat.w=start.w+dx;p.etat.h=start.h+dy;p.etat.tailleChoisie=true;}applique(p);}
    function end(){target.removeEventListener('pointermove',drag);target.removeEventListener('pointerup',end);target.removeEventListener('pointercancel',end);window.removeEventListener('blur',end);try{target.releasePointerCapture(e.pointerId);}catch(err){}p.box.classList.remove('owd-panneau-geste');range(p);}
    target.addEventListener('pointermove',drag);target.addEventListener('pointerup',end);target.addEventListener('pointercancel',end);window.addEventListener('blur',end);}
  function monte(p){p.box=poseNuit(el('div','owd-panneau'));p.box.id=p.def.id==='monde'?'owd-panneau':'owd-panneau-inventaire';p.box.setAttribute('role','dialog');p.box.setAttribute('aria-label',p.def.titre);p.box.addEventListener('pointerdown',function(){p.box.style.zIndex=String(++panelFront);});
    var head=el('div','owd-panneau-tete');head.appendChild(el('span','owd-panneau-titre',p.def.titre));
    p.anchor=el('button','owd-panneau-btn','⇲');p.anchor.type='button';p.anchor.setAttribute('aria-label','Ancrer ou détacher '+p.def.titre);
    p.anchor.addEventListener('pointerdown',function(e){e.stopPropagation();});p.anchor.addEventListener('click',function(){var g=geo(p);p.etat.x=g.x;p.etat.y=g.y;p.etat.ancre=!p.etat.ancre;applique(p);range(p);});head.appendChild(p.anchor);
    var close=el('button','owd-panneau-btn','×');close.type='button';close.title='Fermer';close.setAttribute('aria-label','Fermer '+p.def.titre);close.addEventListener('pointerdown',function(e){e.stopPropagation();});close.addEventListener('click',function(){ouvre(p,false);});head.appendChild(close);
    head.addEventListener('pointerdown',function(e){geste(p,e,true);});p.box.appendChild(head);p.body=el('div','owd-panneau-corps');p.box.appendChild(p.body);
    var grip=el('div','owd-panneau-grip');grip.title='Redimensionner '+p.def.titre;grip.setAttribute('role','separator');grip.setAttribute('aria-label',grip.title);grip.tabIndex=0;
    grip.addEventListener('pointerdown',function(e){geste(p,e,false);});grip.addEventListener('keydown',function(e){var d={ArrowRight:[20,0],ArrowLeft:[-20,0],ArrowDown:[0,20],ArrowUp:[0,-20]}[e.key];if(d){e.preventDefault();p.etat.w+=d[0];p.etat.h+=d[1];p.etat.tailleChoisie=true;applique(p);range(p);}});p.box.appendChild(grip);document.body.appendChild(p.box);applique(p);if(p.etat.ouvert)remplit(p);}
  function icon(id){var ns='http://www.w3.org/2000/svg',s=document.createElementNS(ns,'svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('width','18');s.setAttribute('height','18');s.setAttribute('fill','currentColor');s.setAttribute('aria-hidden','true');
    function node(tag,attrs){var n=document.createElementNS(ns,tag);Object.keys(attrs).forEach(function(k){n.setAttribute(k,attrs[k]);});s.appendChild(n);}
    if(id==='monde'){node('circle',{cx:12,cy:12,r:7});node('ellipse',{cx:12,cy:12,rx:12,ry:3.7,transform:'rotate(-27 12 12)',fill:'none',stroke:'currentColor','stroke-width':2});}
    else{node('path',{'fill-rule':'evenodd',d:'M8 5V4a4 4 0 0 1 8 0v1a5 5 0 0 1 4 5v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-9a5 5 0 0 1 4-5Zm2 0h4V4a2 2 0 0 0-4 0v1Zm-2 9v5h8v-5H8Zm1.5 1.5h5v2h-5v-2Z'});}
    return s;}
  function barreModele(z){var l=z.querySelectorAll('.toolbar-button-outer');for(var i=0;i<l.length;i++){var n=l[i];if(n.hasAttribute('data-owd-rang')||n.classList.contains('vttk-outil')||(!n.offsetWidth&&!n.offsetHeight))continue;if(n.querySelector('.icon-slot'))return n;}return null;}
  function insert(z,n,rank){n.setAttribute('data-owd-rang',rank);var ours=z.querySelectorAll('[data-owd-rang]'),before=null;
    for(var i=0;i<ours.length;i++)if(Number(ours[i].getAttribute('data-owd-rang'))>rank){before=ours[i];break;}
    if(!before)before=z.querySelector('#more-tools-button');if(before&&before.parentNode===z)z.insertBefore(n,before);else z.appendChild(n);}
  function barrePose(){var z=barreZone();if(!z)return false;var model=barreModele(z);if(!model)return false;
    if(!document.getElementById('owd-outils-titre')){var sep=z.querySelector('.spacer-outer:has(.spacer-header)')||z.querySelector('.spacer-outer'),n=sep?sep.cloneNode(true):el('div','spacer-outer');n.id='owd-outils-titre';var mot=n.querySelector('.spacer-header');if(!mot){if(!n.firstChild)n.appendChild(el('div','spacer-inner'));mot=el('div','spacer-header');n.appendChild(mot);}mot.textContent='OUTWARD';insert(z,n,0);}
    OUTILS.forEach(function(def,i){var p=outils[def.id];if(!p||document.getElementById('owd-outil-'+def.id))return;var n=model.cloneNode(true);n.id='owd-outil-'+def.id;
      Array.prototype.forEach.call(n.querySelectorAll('[id]'),function(c){c.removeAttribute('id');});var caret=n.querySelector('.submenu-caret');if(caret)caret.remove();var slot=n.querySelector('.icon-slot');slot.classList.remove('icon-selected');slot.style.removeProperty('background-color');
      var ico=n.querySelector('.grimoire__roll20-icon')||slot;ico.textContent='';ico.appendChild(icon(def.id));
      var b=n.querySelector('button')||n;b.title=def.titre;b.setAttribute('aria-label',def.titre);if(b===n){b.setAttribute('role','button');b.tabIndex=0;b.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();ouvre(p,!p.etat.ouvert);}});}
      b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();ouvre(p,!p.etat.ouvert);});insert(z,n,i+1);paintButton(p);});return true;}
  function panDemarre(){var keys=['owdPanneauActif'].concat(OUTILS.map(function(d){return d.cle;}));
    function start(r){r=r||{};OUTILS.forEach(function(d){if(d.id==='monde'&&r.owdPanneauActif===false)return;var e=r[d.cle]||{};var p={def:d,etat:{ouvert:!!e.ouvert,ancre:e.ancre!==false,x:Number(e.x)||80,y:Number(e.y)||60,w:Number(e.w)||d.w,h:e.ancre!==false&&e.tailleChoisie==null?d.h:(Number(e.h)||d.h),tailleChoisie:!!e.tailleChoisie}};outils[d.id]=p;monte(p);});
      barrePose();var queued=false;barreObs=new MutationObserver(function(){if(queued)return;queued=true;setTimeout(function(){queued=false;barrePose();Object.keys(outils).forEach(function(k){applique(outils[k]);});},150);});barreObs.observe(document.body,{childList:true,subtree:true});
      window.addEventListener('resize',function(){Object.keys(outils).forEach(function(k){applique(outils[k]);});});}
    try{browser.storage.local.get(keys).then(start,function(){start({});});}catch(e){start({});}}
  function panRepeint(){Object.keys(outils).forEach(function(k){var p=outils[k];poseNuit(p.box);if(p.frame)p.frame.contentWindow.postMessage({ns:'owd',type:'panel-theme',nuit:nuitEffective()},'*');});}
  function panelMessage(d){var p=outils[d.panel||'monde'];if(!p)return;if(d.nuit!=null)p.box.classList.toggle('owd-nuit',!!d.nuit);
    if(!p.etat.tailleChoisie){if(d.w!=null)p.etat.w=Number(d.w)||p.def.w;if(d.h!=null)p.etat.h=Number(d.h)||p.def.h;}if(d.replie!=null)p.etat.ouvert=!d.replie;applique(p);}
  // Le vrai drop sur le tchat confirme le partage ; commencer un drag ne publie rien.
  var objetDrag=null;
  function chatTarget(n){return n&&n.closest&&n.closest('#textchat,#textchat-input,#textchat-log,.textchatcontainer,.chat-pane,#chat-input');}
  function dragMessage(ev,d){if(d.type==='inventory-drag-start'&&d.token&&d.ref&&d.charId){objetDrag={source:ev.source,token:d.token,ref:d.ref,charId:d.charId,t:Date.now()};return true;}
    if(d.type==='inventory-drag-end'){var token=d.token;setTimeout(function(){if(objetDrag&&objetDrag.token===token)objetDrag=null;},1500);return true;}return false;}
  function chatDropInit(){document.addEventListener('dragover',function(e){if(!objetDrag||!chatTarget(e.target)||Date.now()-objetDrag.t>30000)return;e.preventDefault();if(e.dataTransfer)e.dataTransfer.dropEffect='copy';},true);
    document.addEventListener('drop',function(e){if(!e.isTrusted||!objetDrag||!chatTarget(e.target))return;var data;try{data=JSON.parse(e.dataTransfer.getData('application/x-owd-item'));}catch(err){return;}
      if(!data||data.token!==objetDrag.token||Date.now()-objetDrag.t>30000)return;e.preventDefault();e.stopImmediatePropagation();var d=objetDrag;objetDrag=null;d.source.postMessage({ns:'owd',type:'inventory-drop-chat',token:d.token,ref:d.ref,charId:d.charId},'*');},true);}

  // ---------- le seul réglage relu en cours de partie : la nuit ----------
  // Une nuit qui réclame de recharger la partie n'est pas une nuit : on l'allume
  // le soir venu, entre deux jets, et l'écran doit suivre. Elle est aussi le
  // seul réglage qu'on peut appliquer à chaud SANS RIEN DÉMONTER : repeindre
  // n'enlève ni un onglet, ni un écouteur, ni un pont, et ne peut donc pas
  // laisser Roll20 dans un état où il n'était pas prévu.
  //
  // L'extinction (owdOff) et l'interrupteur du panneau ne sont volontairement
  // PAS relus ici : ils démontent, et démonter à chaud est ce qui casse (voir
  // la garde, tout en bas, pour ce que « éteindre » peut et ne peut pas).
  //
  // La fiche servie par le site n'est pas repeinte : ce serait la RECHARGER
  // sous les doigts du joueur, au milieu d'une saisie. Elle a son propre
  // réglage dans son onglet Options, et prendra celui du popup à sa prochaine
  // ouverture.
  function repeintTout() {
    panRepeint();
    // les cartes de dés déjà posées prennent le fond du mode ; leurs dés gardent
    // la teinte de leur naissance, les suivants naîtront dans le bon mode
    var n = document.querySelectorAll(".owd-create, .owd-creator-frame, .owd-des");
    for (var i = 0; i < n.length; i++) poseNuit(n[i]);
  }
  function ecouteNuit() {
    try {
      browser.storage.onChanged.addListener(function (ch, zone) {
        if (zone && zone !== "local") return;
        if (!ch || !ch.owdNuit) return;
        var v = normNuit(ch.owdNuit.newValue);
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
    // Le tchat vit dans la frame de l'ÉDITEUR : ni la fenêtre popout d'une
    // fiche ni l'iframe d'une feuille n'en portent, et y guetter reviendrait
    // à laisser un intervalle tourner trente secondes pour rien.
    if (IS_EDITEUR) guetteDes();
    if (IS_TOP) {
      // FRAME DU HAUT : on n'injecte RIEN au chargement (l'injection main-world gêne
      // l'ouverture des fiches Roll20). On attend que l'utilisateur ouvre l'onglet
      // Fiche Outward (depuis une fiche déjà ouverte) : il pose alors le pont via
      // need-bridge. Reçoit aussi les JETS de la fiche -> tchat Roll20 (le tchat vit
      // dans cette frame, sauf popout : relais vers l'opener).
      window.addEventListener("message", function (ev) {
        try {
          var d = ev.data;
          if (!d || d.ns !== "owd") return;
          // « take » descend vers les fiches : ne jamais retenir sa source comme
          // destinataire, sinon deux fenêtres se le renverraient sans fin
          if (d.type === "take") {
            if (d.payload) diffuseTake(d.payload);
            return;
          }
          rememberSheet(ev.source);
          // LE CADRE S'AGRANDIT POUR LES RÉGLAGES. Le camp ne peut pas faire
          // sortir un dialogue de son iframe : serré dans une colonne ancrée à
          // la barre, il devient illisible. Il demande donc de la place, on la
          // lui donne au centre de la page, et on la reprend à la fermeture.
          // L'état rangé n'est PAS touché : on ne mémorise pas une géométrie de
          // passage, sinon rouvrir Roll20 retrouverait le panneau grand ouvert
          // au milieu de l'écran.
          // CE TEST EST AU MÊME NIVEAU QUE « panneau », et jamais dedans : à
          // l'intérieur d'une branche qui a déjà comparé d.type, il serait
          // toujours faux, donc du code mort, et le dialogue de réglages
          // resterait serré dans sa colonne sans que rien ne l'explique.
          if (dragMessage(ev,d)) return;
          if (d.type === "pan-grand") return;
          if (d.type === "panneau") { panelMessage(d); return; }
          if (d.type === "nuit") {
            NUIT_FICHE = !!d.on;
            repeintTout();
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
      // la partie elle-même (et elle seule) reçoit le panneau et son bouton
      if (IS_EDITEUR) { panDemarre(); chatDropInit(); }
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
  // moments différents, donc trois occasions de se contredire : un onglet qui
  // annonce un mode et montre l'autre vient exactement de là. Ici les deux
  // copies lisent la même chose au même instant : éteintes, elles se taisent
  // toutes les deux, et il n'y a pas de course à arbitrer.
  //
  // owdOff ABSENT VAUT ALLUMÉ, et la comparaison est stricte : une extension
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
  //   « Fiche Outward », pas de pane, pas de panneau de Camp, pas de bouton dans
  //   la barre d'outils, pas de pont d20 (il n'est injecté que sur need-bridge,
  //   qui ne part plus), aucun écouteur de message, aucune interception du lien
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
  //     - le pane .tab-pane.owdfiche ne doit surtout pas être retiré. Le système
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
      browser.storage.local.get(["owdOff", "owdBeta", "owdNuit"]).then(
        function (r) {
          if (r && r.owdOff === true) return;   // éteinte : aucune des deux copies ne bouge
          NUIT_ORDRE = normNuit(r && r.owdNuit);
          if ((r && r.owdBeta ? "beta" : "stable") === MODE) reclame();
        },
        function () { if (MODE === "stable") reclame(); }
      );
    } catch (e) {
      if (MODE === "stable") reclame();
    }
  }
  // Verrou de frame. Les deux copies partagent le monde isolé, donc cet objet
  // window (un expando de script de contenu reste invisible de la page, comme le
  // window.__owdBridge du pont l'est du monde isolé). Si les deux se réveillaient
  // ensemble (stockage incohérent, extension rechargée, bascule pendant la
  // lecture), la première arrivée prend la frame et la seconde se tait. Sans ce
  // verrou, deux écouteurs « message » dans la frame du haut enverraient chaque
  // jet DEUX FOIS au tchat : le site poste vers window.top avec « * », tous les
  // écouteurs reçoivent le même message, et sendToChat ne dédoublonne rien.
  //
  // Deuxième ligne de défense, gratuite et volontairement conservée : les
  // marqueurs de DOM portent les MÊMES noms dans les deux copies (classe
  // .owd-tab, id #owd-panneau, attribut data-owd-bridge), si bien que placeTabs
  // et panMonte abandonnent tout seuls devant le travail de l'autre copie.
  function reclame() {
    try {
      if (window.__owdRoll20) return;   // une copie tient déjà cette frame
      window.__owdRoll20 = MODE;
    } catch (e) {}
    // LA PREMIÈRE LIGNE, ET ELLE DIT LE MINIMUM UTILE : quelle copie a pris la
    // frame, et si c'est bien la page de l'éditeur. Sans elle, « je ne vois plus
    // rien » ne se distingue pas d'une extension désinstallée — et Firefox retire
    // les modules temporaires à chaque redémarrage.
    try {
      console.info("[OWD " + MODE + "] active — éditeur : " + (IS_EDITEUR ? "oui" : "non"));
    } catch (e) {}
    demarre();
  }
  garde();
})();
