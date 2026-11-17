  // ---------- outils ----------
  // Ajustement au contenu par défaut, hauteur libre après un resize manuel.
  function textareaEditable(area) {
    var module = area.closest(".pc-editable");
    return ficheModifiable() && !area.disabled && !area.readOnly &&
      (!module || module.classList.contains("editing"));
  }
  function ajusteHauteurTextarea(area) {
    if (!area || area.tagName !== "TEXTAREA" || area.__jjkHauteurEnCours) return;
    area.__jjkHauteurEnCours = true;
    var frame = window.requestAnimationFrame || function (fn) { return window.setTimeout(fn, 0); };
    frame(function () {
      area.__jjkHauteurEnCours = false;
      if (!area.isConnected || !area.getClientRects().length || area.__jjkResizeEnCours) return;
      var editable = textareaEditable(area);
      var hauteurManuelle = parseFloat(area.dataset.jjkHauteurManuelle);
      area.style.resize = editable ? "vertical" : "none";
      area.style.overflowY = editable && isFinite(hauteurManuelle) ? "auto" : "hidden";
      if (editable && isFinite(hauteurManuelle)) {
        area.style.height = hauteurManuelle + "px";
        return;
      }
      var rows = area.rows;
      area.style.height = "auto";
      area.rows = 1;
      var style = window.getComputedStyle(area);
      var bordures = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
      var contenu = area.scrollHeight;
      area.rows = rows;
      area.style.height = Math.ceil(contenu + (bordures || 0)) + "px";
    });
  }
  function brancheTextarea(area) {
    if (!area || area.tagName !== "TEXTAREA" || area.__jjkAutoHauteur) return;
    area.__jjkAutoHauteur = true;
    area.style.boxSizing = "border-box";
    area.style.minHeight = "0";
    area.style.maxHeight = "none";
    area.addEventListener("input", function () { ajusteHauteurTextarea(area); });
    area.addEventListener("change", function () { ajusteHauteurTextarea(area); });
    try {
      var valeur = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
      if (valeur && valeur.get && valeur.set) Object.defineProperty(area, "value", {
        configurable: true, enumerable: valeur.enumerable,
        get: function () { return valeur.get.call(this); },
        set: function (v) {
          var avant = valeur.get.call(this);
          valeur.set.call(this, v);
          if (valeur.get.call(this) !== avant) ajusteHauteurTextarea(this);
        }
      });
    } catch (e) {}
    var termineResize = null;
    area.addEventListener("pointerdown", function (ev) {
      if (!textareaEditable(area)) return;
      var r = area.getBoundingClientRect();
      if (ev.clientX < r.right - 22 || ev.clientY < r.bottom - 22) return;
      if (termineResize) termineResize();
      area.__jjkResizeEnCours = true;
      area.style.overflowY = "auto";
      termineResize = function () {
        document.removeEventListener("pointerup", termineResize, true);
        document.removeEventListener("pointercancel", termineResize, true);
        area.dataset.jjkHauteurManuelle = String(area.getBoundingClientRect().height);
        area.__jjkResizeEnCours = false;
        termineResize = null;
      };
      document.addEventListener("pointerup", termineResize, true);
      document.addEventListener("pointercancel", termineResize, true);
    });
    // Une zone créée dans un onglet masqué se mesure à sa première apparition.
    var largeur = 0;
    var observateur = window.ResizeObserver ? new ResizeObserver(function (entries) {
      var nouvelleLargeur = entries[0].contentRect.width;
      if (nouvelleLargeur !== largeur) {
        largeur = nouvelleLargeur;
        ajusteHauteurTextarea(area);
      }
    }) : null;
    if (observateur) observateur.observe(area);
    remontageNettoyage.push(function () {
      if (observateur) observateur.disconnect();
      if (termineResize) termineResize();
    });
    ajusteHauteurTextarea(area);
  }
  function synchroniseTaillesTextarea(surface) {
    Array.prototype.forEach.call(surface.querySelectorAll("textarea"), function (area) {
      var editable = textareaEditable(area);
      if (area.__jjkDerniereEdition === editable) return;
      area.__jjkDerniereEdition = editable;
      ajusteHauteurTextarea(area);
    });
  }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    if (String(tag).toLowerCase() === "textarea") brancheTextarea(e);
    return e;
  }
  // URL du jeu de données. Une ARCHIVE de version embarque son propre
  // jjk-creation.json, gelé à sa date : l'amorce le désigne par
  // window.__jjkDataUrl avant d'injecter le bundle. Sans lui, un bundle
  // d'archive lirait les règles d'AUJOURD'HUI, et un renommage de compétence
  // suffirait à trahir la version qu'on croit rejouer.
  // Une archive est gelée par LIGNE X.Y, à la première release de la ligne :
  // les règles qu'elle embarque sont donc celles de ce jour-là, et un
  // correctif ultérieur qui les retoucherait ne serait archivé nulle part.
  function dataUrl() {
    var u = typeof window !== "undefined" ? window.__jjkDataUrl : null;
    return u || (siteBase() + "jjk-creation.json");
  }
  function siteBase() {
    var l = document.querySelector('link[href*="assets/"], script[src*="assets/"]');
    var u = l ? (l.href || l.getAttribute("src")) : null;
    if (u) { var i = u.indexOf("assets/"); if (i >= 0) return u.slice(0, i); }
    return new URL(".", location.href).href;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function num(v, d) { var n = parseInt(v, 10); return isNaN(n) ? d : n; }
  // poids : décimal positif, virgule tolérée à la saisie, arrondi au centième
  function pnum(v) {
    var n = parseFloat(String(v == null ? "" : v).replace(",", "."));
    return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0;
  }
  // affichage des poids : point décimal, sans zéros de traîne (« 0.5 », « 3 »)
  function fmtP(n) { return String(Math.round(n * 100) / 100); }
  // modificateurs divers : TOUJOURS un tableau de 3 emplacements (équipement /
  // art / décision du MJ), sommés dans la valeur effective — le geste de la
  // fiche HxH. modArr assainit ce qui entre, modSum totalise.
  function modArr(a) {
    if (!Array.isArray(a)) a = [];
    var out = [0, 0, 0];
    for (var i = 0; i < 3; i++) {
      var n = parseFloat(a[i]);
      out[i] = isFinite(n) ? clamp(Math.round(n * 100) / 100, -999, 999) : 0;
    }
    return out;
  }
  function modSum(a) {
    var t = 0;
    (a || []).forEach(function (n) { if (isFinite(n)) t += n; });
    return Math.round(t * 100) / 100;
  }
  function nowStamp() { return new Date().toISOString(); }
  function sign(n) { return n >= 0 ? "+" + n : String(n).replace("-", "−"); }
  // les compétences commencent toujours par une majuscule (« apnée » -> « Apnée »)
  function capFirst(t) { t = String(t == null ? "" : t); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }


  function uid(prefixe) {
    var crypto = window.crypto;
    var suffixe = crypto && typeof crypto.randomUUID === "function" ? crypto.randomUUID() :
      Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
    return prefixe + "-" + suffixe;
  }
