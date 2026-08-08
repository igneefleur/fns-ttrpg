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

