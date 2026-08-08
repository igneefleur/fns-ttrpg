
  function litConf(brut) {
    var c = confVide();
    if (!brut) return c;
    var o = null;
    try { o = JSON.parse(brut); } catch (e) { return c; }
    if (!o || typeof o !== "object") return c;
    if (entier(o.v, V_CONF) > V_CONF) confFuture = true;
    c.seq = Math.max(0, entier(o.seq, 0));
    if (o.mj && typeof o.mj === "object") {
      c.mj.nom = String(o.mj.nom || "MJ").slice(0, 40) || "MJ";
      c.mj.img = urlSure(o.mj.img);
    }
    if (Array.isArray(o.joueurs)) {
      o.joueurs.slice(0, 12).forEach(function (j, i) {
        if (!j || typeof j !== "object") return;
        c.joueurs.push({
          id: String(j.id || ("j" + (i + 1))).replace(/[^A-Za-z0-9_-]/g, "").slice(0, 12) || ("j" + (i + 1)),
          nom: String(j.nom || "").slice(0, 40),
          img: urlSure(j.img)
        });
      });
    }
    if (o.donne && typeof o.donne === "object") {
      c.donne.mj = clamp(entier(o.donne.mj, 3), 0, 40);
      c.donne.joueur = clamp(entier(o.donne.joueur, 3), 0, 40);
    }
    return c;
  }
  // Une image vient d'un attribut que n'importe quel joueur peut écrire : on
  // n'accepte que du http(s), jamais un « javascript: ». Et jamais un data: ICI :
  // la configuration entière est réécrite à chaque enregistrement, une image
  // dedans la ferait peser deux cent mille caractères. Le fichier importé a
  // son propre attribut, et fondSur() le relit.
  function urlSure(u) {
    var s = String(u == null ? "" : u).trim();
    return /^https?:\/\//i.test(s) ? s.slice(0, 400) : "";
  }
  // Le fond d'une place, tel qu'il revient de Roll20. C'est une valeur que
  // n'importe quel joueur de la table peut écrire, et elle finit dans un
  // background-image : on n'accepte donc que ce qui ne peut être qu'une image.
  //
  // Pas de SVG, même en data: — c'est le seul format d'image qui puisse porter
  // autre chose qu'une image. Et un plafond de longueur, parce qu'une chaîne de
  // plusieurs mégaoctets recopiée à chaque relecture suffirait à figer l'onglet
  // de tout le monde.
  var BG_LIRE_MAX = 1400 * 1024;
  function fondSur(brut) {
    var s = String(brut == null ? "" : brut).trim();
    if (!s || s.length > BG_LIRE_MAX) return "";
    if (/^data:image\/(?:webp|png|jpeg|gif|avif);base64,[A-Za-z0-9+/=]+$/.test(s)) return s;
    return urlSure(s);
  }
  function litPoint(brut) {
    var m = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(String(brut).trim());
    if (!m) return null;   // vide ou illisible = jeton absent du plateau
    return { x: clamp(parseFloat(m[1]), 0, MILLE), y: clamp(parseFloat(m[2]), 0, MILLE) };
  }
  function ecritPoint(p) { return Math.round(p.x) + "," + Math.round(p.y); }
