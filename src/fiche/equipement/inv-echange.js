  // ---------- donner / prendre un objet (entre joueurs, par le tchat) ----------
  // Le donneur envoie au tchat une carte portant un lien « Prendre » : le
  // payload de l'objet y voyage encodé en base64. L'extension Roll20 intercepte
  // le clic sur ce lien (la fiche, dans son iframe, ne voit pas le tchat) et
  // renvoie le payload à la fiche du preneur, qui affiche son dialogue de
  // réception. L'encodage vit ICI, côté site : son format peut donc évoluer
  // sans jamais re-signer l'extension, qui ne fait que relayer.
  var TAKE_CMD = "/mia_take";
  var IMG_MAX = 4000;   // une vignette plus lourde ne tient pas dans un message
  function b64encode(txt) {
    try {
      if (typeof TextEncoder !== "undefined") {
        var oct = new TextEncoder().encode(txt), s = "";
        for (var i = 0; i < oct.length; i++) s += String.fromCharCode(oct[i]);
        return btoa(s);
      }
    } catch (e) {}
    return btoa(unescape(encodeURIComponent(txt)));
  }
  function b64decode(b64) {
    var bin = atob(String(b64 || "").replace(/-/g, "+").replace(/_/g, "/"));
    try {
      if (typeof TextDecoder !== "undefined") {
        var oct = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) oct[i] = bin.charCodeAt(i);
        return new TextDecoder().decode(oct);
      }
    } catch (e) {}
    return decodeURIComponent(escape(bin));
  }
  // objet -> payload compact (clés courtes : le message de tchat est borné)
  function packObjet(it, qte) {
    var p = {
      n: String(it.nom || ""), q: Math.max(0, pnum(qte)) || 1, p: pnum(it.poids),
      d: String(it.desc || ""), k: String(it.id || ""),
      a: pnum(it.achat), v: pnum(it.vente)
    };
    var img = String(it.img || "");
    if (img && (img.length <= IMG_MAX || !/^data:/.test(img))) p.i = img;
    return b64encode(JSON.stringify(p));
  }
  function unpackObjet(b64) {
    var o;
    try { o = JSON.parse(b64decode(b64)); } catch (e) { return null; }
    if (!o || typeof o !== "object") return null;
    return {
      nom: String(o.n || "Objet"), qte: Math.max(0, pnum(o.q)) || 1, poids: pnum(o.p),
      desc: String(o.d || ""), img: String(o.i || ""),
      id: String(o.k || ""), achat: pnum(o.a), vente: pnum(o.v)
    };
  }

