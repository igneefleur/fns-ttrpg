  // ---- Actions : les dés d'action du tour ----
  // Un dé par dé d'action du personnage, montré EN VOLUME sur sa plus haute
  // face, par le moteur des dés de l'extension (owd-des3d.js, servi au site
  // par hooks/des3d.py). Chaque dé change de taille séparément, du d4 au d12 ;
  // un clic le sélectionne, et « Envoyer » ne lance que les sélectionnés.
  //
  // L'ENVOI EST CELUI QUE LA SURCOUCHE SAIT DESSINER : une carte
  // « OWD Action Dice » qui porte UN jet par dé ([[1d8]][[1d6]]…). Un seul
  // jet de plusieurs dés rendrait une somme, et l'extension n'en ferait rien.
  // Hors de Roll20, les dés se lancent sur place et le résultat s'affiche.
  var TAILLES_DES = [4, 6, 8, 10, 12];
  function desTaille(i) {
    var t = (state.desTailles || [])[i];
    return TAILLES_DES.indexOf(t) >= 0 ? t : faces();
  }
  // UN DÉ IMMOBILE. Le moteur n'a pas d'option pour poser un dé sans le lancer
  // (il est ENGENDRÉ depuis la page d'essai d6.html, qui n'en a pas besoin) ;
  // il respecte en revanche le réglage « réduire les animations », qu'il lit à
  // la création. On le lui fait lire vrai le temps de cet appel, et seulement
  // pour cette requête-là. Le jour où le moteur aura son option, c'est ici
  // qu'on la passera.
  function deImmobile(taille, valeur, rang, rayon) {
    var M = window.OwdDes3d;
    if (!M || !M.connait(taille, valeur)) return null;
    var mm = window.matchMedia;
    try {
      window.matchMedia = function (q) {
        return /prefers-reduced-motion/.test(q) ? { matches: true, media: q }
                                                : mm.call(window, q);
      };
      var d = M.creer(taille, valeur, rang, rayon, null,
                      document.documentElement.classList.contains("night"));
      return d ? d.noeud : null;
    } catch (e) {
      return null;
    } finally {
      window.matchMedia = mm;
    }
  }
  function buildDesAction() {
    var b = block("Actions");
    var rangee = el("div", "pc-desaction");
    b.appendChild(rangee);
    var choisis = [];
    var cases = [];
    var nuitVue = null;

    function scene(i) {
      var c = cases[i], t = desTaille(i);
      c.pose.innerHTML = "";
      var n = deImmobile(t, t, i, 22);
      c.pose.appendChild(n || el("span", "pc-desaction-jeton", String(t)));
      c.nom.textContent = "d" + t;
      c.moins.disabled = TAILLES_DES.indexOf(t) <= 0;
      c.plus.disabled = TAILLES_DES.indexOf(t) >= TAILLES_DES.length - 1;
    }
    function change(i, sens) {
      var k = TAILLES_DES.indexOf(desTaille(i)) + sens;
      if (k < 0 || k >= TAILLES_DES.length) return;
      var tab = (state.desTailles || []).slice();
      while (tab.length <= i) tab.push(faces());
      tab[i] = TAILLES_DES[k];
      state.desTailles = tab;
      scene(i);
      refresh();
    }
    function bati() {
      var n = Math.max(0, Math.floor(desAction()));
      rangee.innerHTML = "";
      cases = [];
      choisis = choisis.slice(0, n);
      for (var i = 0; i < n; i++) (function (i) {
        var col = el("div", "pc-desaction-de");
        var pose = el("button", "pc-desaction-pose");
        pose.type = "button";
        pose.addEventListener("click", function () {
          choisis[i] = !choisis[i];
          col.classList.toggle("on", !!choisis[i]);
        });
        col.appendChild(pose);
        var taille = el("div", "pc-desaction-taille");
        var moins = el("button", "pc-desaction-pas", "−");
        moins.type = "button";
        moins.addEventListener("click", function () { change(i, -1); });
        var nom = el("span", "pc-desaction-nom", "");
        var plus = el("button", "pc-desaction-pas", "+");
        plus.type = "button";
        plus.addEventListener("click", function () { change(i, +1); });
        taille.appendChild(moins);
        taille.appendChild(nom);
        taille.appendChild(plus);
        col.appendChild(taille);
        col.classList.toggle("on", !!choisis[i]);
        rangee.appendChild(col);
        cases.push({ col: col, pose: pose, nom: nom, moins: moins, plus: plus });
        scene(i);
      })(i);
    }

    var envoi = miniBtn("Envoyer", "Lancer les dés sélectionnés", function () {
      var tailles = [];
      cases.forEach(function (c, i) { if (choisis[i]) tailles.push(desTaille(i)); });
      if (!tailles.length) { flash("Aucun dé sélectionné."); return; }
      var cmd = "&{template:default}{{name=OWD Action Dice}}{{rolls=" +
                tailles.map(function (t) { return "[[1d" + t + "]]"; }).join("") + "}}";
      if (!envoyer(cmd)) {
        flash(tailles.map(function (t) {
          return "d" + t + " : " + (1 + Math.floor(Math.random() * t));
        }).join(" · "));
      }
      choisis = [];
      cases.forEach(function (c) { c.col.classList.remove("on"); });
    }, "pc-desaction-envoi");
    b.appendChild(envoi);

    bati();
    // LE MODE NUIT se bascule sans passer par la fiche (night.js, l'amorce
    // Roll20) : on guette la classe de <html> pour repeindre les dés. Le
    // guetteur se débranche de lui-même quand le module a quitté la page.
    if (window.MutationObserver) {
      var guet = new MutationObserver(function () {
        if (!b.isConnected) { guet.disconnect(); return; }
        var nuit = document.documentElement.classList.contains("night");
        if (nuit !== nuitVue) { nuitVue = nuit; bati(); }
      });
      guet.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    }
    hooks.push(function () {
      // le nombre de dés suit la capacité (un levier du MJ peut la changer) ;
      // le mode nuit repeint les dés, qui prennent leur couleur de nuit
      var nuit = document.documentElement.classList.contains("night");
      if (cases.length !== Math.max(0, Math.floor(desAction())) || nuit !== nuitVue) {
        nuitVue = nuit;
        bati();
      }
    });
    return b;
  }
