  // ---------- outils ----------
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  // URL du jeu de données. Une ARCHIVE de version embarque son propre
  // owd-creation.json, gelé à sa date : l'amorce le désigne par
  // window.__owdDataUrl avant d'injecter le bundle. Sans lui, un bundle
  // d'archive lirait les règles d'AUJOURD'HUI, et un rang renommé suffirait à
  // trahir la version qu'on croit rejouer.
  function dataUrl() {
    var u = typeof window !== "undefined" ? window.__owdDataUrl : null;
    return u || (siteBase() + "owd-creation.json");
  }
  function siteBase() {
    var l = document.querySelector('link[href*="assets/"], script[src*="assets/"]');
    var u = l ? (l.href || l.getAttribute("src")) : null;
    if (u) { var i = u.indexOf("assets/"); if (i >= 0) return u.slice(0, i); }
    return new URL(".", location.href).href;
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function num(v, d) { var n = parseInt(v, 10); return isNaN(n) ? d : n; }
  // poids, encombrance, quantités, prix : décimal positif, virgule tolérée,
  // arrondi au MILLIÈME (un objet peut peser 0.001 kg)
  function pnum(v) {
    var n = parseFloat(String(v == null ? "" : v).replace(",", "."));
    return isFinite(n) && n >= 0 ? Math.round(n * 1000) / 1000 : 0;
  }
  // PRIX DE VENTE d'un objet : null veut dire « automatique », le tiers du
  // prix d'achat arrondi à l'inférieur. Un nombre saisi, 0 compris, prime.
  function venteNum(v) {
    return v == null || String(v).trim() === "" ? null : pnum(v);
  }
  function prixVente(it) {
    return it.vente == null ? Math.max(0, Math.floor(pnum(it.achat) / 3)) : pnum(it.vente);
  }
  // nombre SIGNÉ (l'exposition va de −120 à +120) : même tolérance, sans plancher
  function snum(v) {
    var n = parseFloat(String(v == null ? "" : v).replace(",", "."));
    return isFinite(n) ? Math.round(n * 100) / 100 : 0;
  }
  // affichage : point décimal, sans zéros de traîne (« 0.5 », « 3 »)
  function fmtP(n) { return String(Math.round(n * 1000) / 1000); }
  // modificateurs divers : TOUJOURS un tableau de 3 emplacements, sommés dans
  // la valeur effective. modArr assainit ce qui entre, modSum totalise.
  function modArr(a) {
    if (!Array.isArray(a)) a = [];
    var out = [0, 0, 0];
    for (var i = 0; i < 3; i++) {
      var n = parseFloat(a[i]);
      out[i] = isFinite(n) ? clamp(Math.round(n * 100) / 100, -9999, 9999) : 0;
    }
    return out;
  }
  function modSum(a) {
    var t = 0;
    (a || []).forEach(function (n) { if (isFinite(n)) t += n; });
    return Math.round(t * 100) / 100;
  }
  // Le signe s'écrit avec le VRAI moins typographique en négatif (« −3 ») et le
  // plus ordinaire en positif : c'est la convention du livre, et elle vaut
  // aussi pour l'écran.
  function sign(n) { return n >= 0 ? "+" + n : String(n).replace("-", "−"); }
  function capFirst(t) { t = String(t == null ? "" : t); return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; }
  // Identifiant STABLE d'une entrée (compétence, technique, arme, geste,
  // vêtement, objet). Il naît une fois et ne se réécrit jamais : c'est lui qui
  // relie une arme à sa compétence et un objet donné à son jumeau chez l'autre
  // joueur. Le compteur écarte les collisions du même millième de seconde.
  var idSeq = 0;
  function uid(prefixe) {
    idSeq++;
    return (prefixe || "x") + Date.now().toString(36) + idSeq.toString(36);
  }
  // Comparaison de noms insensible à la casse ET aux accents : « Épée » et
  // « epee » sont le même nom pour un refus de doublon.
  function pli(s) {
    s = String(s == null ? "" : s).trim().toLowerCase();
    try { return s.normalize("NFD").replace(/[̀-ͯ]/g, ""); }
    catch (e) { return s; }   // vieux moteur : la casse suffit
  }
  // Appartenance RÉELLE à une table nommée par une chaîne venue d'ailleurs
  // (mod, état importé). Sans elle, un nom comme « toString » répond « oui »
  // depuis Object.prototype, et la suite manipule une méthode en croyant tenir
  // une donnée : c'est la façon la plus bête de casser un montage.
  function aClef(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }

