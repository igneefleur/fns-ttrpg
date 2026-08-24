  // ---------- outils ----------
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  // URL du jeu de données. Une ARCHIVE de version embarque son propre
  // mia-creation.json, gelé à sa date : l'amorce le désigne par
  // window.__miaDataUrl avant d'injecter le bundle. Sans lui, un bundle
  // d'archive lirait les règles d'AUJOURD'HUI, et un renommage de compétence
  // suffirait à trahir la version qu'on croit rejouer.
  // Une archive est gelée par LIGNE X.Y, à la première release de la ligne :
  // les règles qu'elle embarque sont donc celles de ce jour-là, et un
  // correctif ultérieur qui les retoucherait ne serait archivé nulle part.
  function dataUrl() {
    var u = typeof window !== "undefined" ? window.__miaDataUrl : null;
    return u || (siteBase() + "mia-creation.json");
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

