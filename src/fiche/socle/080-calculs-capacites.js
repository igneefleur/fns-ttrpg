  // ---------- calculs ----------
  // Chaque valeur dérivée existe en DEUX TEMPS : <nom>Brut fait le calcul,
  // <nom> le passe aux filtres. Les fonctions <nom>Auto, elles, sont AUTRE
  // CHOSE : la valeur AVANT le forçage du MJ — c'est ce que montre le
  // placeholder du champ « Forcé », et ce que dit l'infobulle quand un forçage
  // est en place.

  // ---- LA CHAÎNE À NEUF BOÎTES ----
  // Toute valeur dérivée de la fiche passe par elle, et elle ne sait rien
  // d'Outward : elle prend une base et rend un nombre.
  //
  //     le forçage, s'il est posé — il court-circuite TOUT
  //     sinon  (((base + a1 + a2) × m1 × m2) + a3 + a4) × m3 × m4
  //
  // QUATRE GROUPES ET NON TROIS : trois ne savent pas dire « ajoute 20 puis
  // double le tout ». L'ordre DANS un groupe, lui, est sans effet.
  //
  // La chaîne ne sait pas où dorment ses nombres : elle ne reçoit qu'une
  // fonction qui rend une boîte. Trois lecteurs la nourrissent — les
  // caractéristiques, les capacités, les compétences — et un quatrième
  // s'écrirait sans toucher à ces lignes.
  function chaineAdd(v) { return v === undefined ? 0 : v; }
  function chaineMul(v) { return v === undefined ? 1 : v; }
  function chaineAuto(lire, base) {
    var v = (((base + chaineAdd(lire("a1")) + chaineAdd(lire("a2"))) *
              chaineMul(lire("m1")) * chaineMul(lire("m2"))) +
             chaineAdd(lire("a3")) + chaineAdd(lire("a4"))) *
            chaineMul(lire("m3")) * chaineMul(lire("m4"));
    // un NaN né ici traverserait la fiche entière sans qu'on sache d'où il vient
    if (!isFinite(v)) return base;
    return Math.round(v * 100) / 100;   // arrondi au centième, À LA TOUTE FIN
  }
  function chaine(lire, base) {
    var f = lire("force");
    return f === undefined ? chaineAuto(lire, base) : f;
  }
  // Les trois lecteurs. Chacun rend une fonction qui prend un nom de boîte :
  // c'est ce que la chaîne, les infobulles et levierRegleDe() attendent.
  function lireTable(nomTable, nom, cle) {
    return function (boite) {
      var t = state[nomTable] && state[nomTable][nom];
      var tb = t && t[boite];
      var v = tb && tb[cle];
      return (typeof v === "number" && isFinite(v)) ? v : undefined;
    };
  }
  function lireCarac(nom, c) { return lireTable("caracsLeviers", nom, c); }
  function lireCap(nom, cle) { return lireTable("capsLeviers", nom, cle); }
  function lireComp(nom, id) { return lireTable("compsLeviers", nom, id); }

  // ---- caractéristiques ----
  // La valeur d'une caractéristique : sa part de création plus les points
  // achetés à l'expérience. C'est elle qui entre dans la chaîne des leviers.
  function caracBase(c) { return num(state.caracs[c], 0); }
  function caracAchat(c) { return Math.max(0, Math.round(num((state.caracsXp || {})[c], 0))); }
  function caracVal(c) { return caracBase(c) + caracAchat(c); }
  function caracAuto(c) { return caracVal(c); }

  // ---- création ----
  // Budget et bornes viennent des règles. Sans elles, aucun contrôle : la
  // fiche n'invente pas une répartition que le livre ne donne pas.
  function creation() {
    var cr = D().creation;
    return (cr && typeof cr === "object") ? cr : null;
  }
  function creationPoints() { var cr = creation(); return cr ? num(cr.points, 0) : 0; }
  function creationDepense() {
    var t = 0;
    caracsOrdre().forEach(function (c) { t += caracBase(c); });
    return t;
  }

  // ---- progression à l'expérience ----
  // Le prix du point qui porte la caractéristique à `v`. La table des règles
  // donne ses tranches ; au-delà, la pente qu'elles annoncent. null quand les
  // règles manquent : un point sans prix connu ne s'achète pas.
  function prixPointCarac(v) {
    var p = D().progressionCarac, tr = p && Array.isArray(p.tranches) ? p.tranches : [];
    if (!tr.length) return null;
    var i, t;
    for (i = 0; i < tr.length; i++) {
      t = tr[i];
      if (v >= num(t.de, 0) && v <= num(t.a, 0)) return num(t.xp, 0);
    }
    if (v < num(tr[0].de, 0)) return num(tr[0].xp, 0);
    var der = tr[tr.length - 1], larg = Math.max(1, num(p.largeur, 1));
    return num(der.xp, 0) + num(p.pas, 0) * Math.ceil((v - num(der.a, 0)) / larg);
  }
  // Ce que coûtent les points achetés d'une caractéristique, de sa valeur de
  // création jusqu'à sa valeur actuelle.
  function caracXpDe(c) {
    var b = caracBase(c), n = caracAchat(c), t = 0, i, p;
    for (i = 1; i <= n; i++) { p = prixPointCarac(b + i); t += p === null ? 0 : p; }
    return t;
  }
  // Le coût effectif : celui des règles, passé à la chaîne du levier « xp ».
  function caracXp(c) { return chaine(lireCarac("xp", c), caracXpDe(c)); }
  function caracsXpDepense() {
    var t = 0;
    caracsOrdre().forEach(function (c) { t += caracXp(c); });
    return t;
  }
  function caracTotalBrut(c) { return chaine(lireCarac("total", c), caracVal(c)); }
  function caracTotal(c) { return pub("caracTotal", caracTotalBrut(c), { carac: c }); }

  // ---- capacités dérivées ----
  // UNE SEULE fonction de calcul pour toutes : la formule vient de
  // owd-creation.json (base + carac × facteur, ou carac ÷ diviseur), et les
  // trois emplacements de modificateurs s'y ajoutent. Une capacité de plus ne
  // demande alors ni ligne de calcul, ni clé racine, ni suffixe d'attribut.
  //
  // Une capacité SANS FORMULE (carac null et base nulle, comme les points de
  // mana aujourd'hui) rend 0, et ce zéro se VOIT sur la fiche : c'est la donnée
  // qui le dit, pas un cas particulier codé ici.
  function capAuto(cle) {
    var d = capDef(cle);
    var v = 0;
    if (d) {
      v = num(d.base, 0);
      if (d.carac) {
        var t = caracTotal(d.carac);
        if (d.diviseur) {
          var q = t / num(d.diviseur, 1);
          v += (d.arrondi === "haut") ? Math.ceil(q) : Math.floor(q);
        } else {
          v += t * (d.facteur === undefined ? 1 : num(d.facteur, 1));
        }
      }
    }
    return v;
  }
  // Le maximum EFFECTIF d'une capacité : le forçage du MJ s'il existe, la
  // valeur calculée sinon. `auto` est passée à part parce que PV et PE portent
  // en plus le poids de l'effondrement.
  function capMax(cle, auto) { return chaine(lireCap("max", cle), auto()); }
  // « réglé » ne veut pas dire « forcé » : un facteur ou un ajout comptent
  // autant. C'est ce que la fiche marque d'un point d'encre appuyée.
  function capForce(cle) { return levierRegleDe(lireCap("max", cle)); }

  // ---- effondrement ----
  // Un niveau par tranche de 10 % PERDUE sur les réserves que les règles
  // nomment (repos, satiété, hydratation) et par tranche d'exposition ; les
  // niveaux s'additionnent, plafonnés. Rien de tout cela n'est écrit ici : la
  // tranche, le plafond, les pourcentages et la LISTE des réserves viennent de
  // owd-creation.json, et la table des dix lignes du livre n'apparaît nulle
  // part dans le DOM.
  function effTranche() { return Math.max(1, num(effDef().tranche, 10)); }
  function effPlafond() { return Math.max(0, num(effDef().plafond, 10)); }
  function effReserves() {
    var r = effDef().reserves;
    return Array.isArray(r) ? r : [];
  }
  // Ce qu'une réserve apporte au niveau. L'exposition est un cas à part, et
  // c'est la DONNÉE qui le dit (« signe: true ») : ce n'est pas une perte mais
  // un ÉCART à zéro, et il compte dans les deux sens — un homme gelé et un
  // homme cuit s'effondrent pareil.
  function effNiveauDe(cle) {
    var d = capDef(cle);
    if (d && d.signe) {
      var max = expoMax();
      if (max <= 0) return 0;
      return Math.floor((Math.abs(state.etat.expo) / max) * 100 / effTranche());
    }
    var m = maxDe(cle);
    if (m <= 0) return 0;
    var perte = (m - courantBrut(cle)) / m * 100;
    if (perte <= 0) return 0;
    return Math.floor(perte / effTranche());
  }
  function effondrementAuto() {
    var t = 0;
    effReserves().forEach(function (cle) { t += effNiveauDe(cle); });
    t += Math.max(0, num(state.effAutre, 0));
    return clamp(Math.floor(t), 0, effPlafond());
  }
  // Le seul levier qui joue sur un NIVEAU et non sur des points : le MJ y pose
  // l'effondrement que les quatre réserves ne savent pas dire.
  function effondrementBrut() {
    return clamp(Math.floor(chaine(lireCap("max", "effondrement"), effondrementAuto())),
                 0, effPlafond());
  }
  function effondrement() { return pub("effondrement", effondrementBrut(), {}); }
  // Ce que l'effondrement laisse d'un maximum, en pour cent. À appliquer sur le
  // maximum ENTIER (modificateurs compris) : l'effondrement diminue ce que le
  // corps peut porter, pas seulement ce que la caractéristique lui donnait.
  function effReste(pct) {
    return clamp(100 - pct * effondrement(), 0, 100) / 100;
  }
  function pvMaxAuto() {
    return Math.floor(capAuto("pv") * effReste(num(effDef().pvParNiveau, 0)));
  }
  function peMaxAuto() {
    return Math.floor(capAuto("pe") * effReste(num(effDef().peParNiveau, 0)));
  }

  // ---- les treize maximums, un par un ----
  // Chacun existe en trois temps : Auto (avant forçage), Brut (après forçage),
  // public (après filtres). C'est ce qui permet au champ « Forcé » de montrer
  // la valeur calculée en filigrane, et à un mod de changer le résultat sans
  // toucher au forçage du MJ.
  function pvMax() { return pub("pvMax", capMax("pv", pvMaxAuto), {}); }
  function peMax() { return pub("peMax", capMax("pe", peMaxAuto), {}); }
  function pmMaxAuto() { return capAuto("pm"); }
  function pmMax() { return pub("pmMax", capMax("pm", pmMaxAuto), {}); }
  function piMaxAuto() { return capAuto("pi"); }
  function piMax() { return pub("piMax", capMax("pi", piMaxAuto), {}); }
  function prMaxAuto() { return capAuto("pr"); }
  function prMax() { return pub("prMax", capMax("pr", prMaxAuto), {}); }
  function psMaxAuto() { return capAuto("ps"); }
  function psMax() { return pub("psMax", capMax("ps", psMaxAuto), {}); }
  function phMaxAuto() { return capAuto("ph"); }
  function phMax() { return pub("phMax", capMax("ph", phMaxAuto), {}); }
  function pcMaxAuto() { return capAuto("pc"); }
  function pcMax() { return pub("pcMax", capMax("pc", pcMaxAuto), {}); }
  function chargeAuto() { return capAuto("charge"); }
  function charge() { return pub("charge", capMax("charge", chargeAuto), {}); }
  function accesAuto() { return capAuto("acces"); }
  function accesRapides() { return pub("accesRapides", capMax("acces", accesAuto), {}); }
  function contenanceAuto() { return capAuto("contenance"); }
  function contenance() { return pub("contenance", capMax("contenance", contenanceAuto), {}); }
  function expoMaxAuto() { return capAuto("expo"); }
  function expoMax() { return pub("expoMax", capMax("expo", expoMaxAuto), {}); }
  function ruptureMaxAuto() { return rupturePoints(); }
  function ruptureMax() { return pub("ruptureMax", capMax("rupture", ruptureMaxAuto), {}); }
  function desActionAuto() { return desActionBase(); }
  function desAction() { return pub("desAction", capMax("desAction", desActionAuto), {}); }

  // La table des maximums, par clé d'état : un seul endroit où le nom d'une
  // jauge se relie à son calcul. Les blocs, les cartes de tchat et les leviers
  // du MJ la lisent tous — deux tables se seraient contredites.
  var MAX_DE = {
    pv: pvMax, pe: peMax, pm: pmMax, pi: piMax,
    pr: prMax, ps: psMax, ph: phMax, pc: pcMax,
    charge: charge, acces: accesRapides, contenance: contenance,
    expo: expoMax, rupture: ruptureMax, desAction: desAction,
    effondrement: function () { return effPlafond(); }
  };
  var AUTO_DE = {
    pv: pvMaxAuto, pe: peMaxAuto, pm: pmMaxAuto, pi: piMaxAuto,
    pr: prMaxAuto, ps: psMaxAuto, ph: phMaxAuto, pc: pcMaxAuto,
    charge: chargeAuto, acces: accesAuto, contenance: contenanceAuto,
    expo: expoMaxAuto, rupture: ruptureMaxAuto, desAction: desActionAuto,
    effondrement: effondrementAuto
  };
  function maxDe(cle) { return aClef(MAX_DE, cle) ? MAX_DE[cle]() : 0; }
  function autoDe(cle) { return aClef(AUTO_DE, cle) ? AUTO_DE[cle]() : 0; }
  // La valeur COURANTE d'une jauge : null veut dire « au maximum », et la
  // valeur suit alors le maximum quand il bouge — ce qu'un nombre figé ne
  // ferait pas, et le maximum de PV et de PE bouge à chaque niveau
  // d'effondrement.
  function courantBrut(cle) {
    var v = state.etat[cle];
    return v === null || v === undefined ? maxDe(cle) : v;
  }
  function courant(cle) { return courantBrut(cle); }

  // ---- charge, poches, sac, accès rapides ----
  // L'inventaire a trois groupes fixes (Sur soi, Poches, Sac à dos) et TOUT ce
  // qu'il porte pèse : la charge compare le poids total à ce que la Force
  // porte. Les poches et le sac ont en plus chacun leur capacité, qui vient de
  // ce que le personnage porte : les poches des vêtements dans leur case, et
  // le sac posé dans la case du sac à dos.
  function poidsDe(o) { return pnum(o.qte) * pnum(o.poids); }
  function poidsOu(test) {
    var t = 0;
    state.inv.objets.forEach(function (o) { if (test(o.ou)) t += poidsDe(o); });
    return Math.round(t * 100) / 100;
  }
  // Les poches et le sac ne se limitent pas en poids mais en ENCOMBRANCE
  // (eb) : ce qu'ils contiennent se compare, en eb, à ce que valent les poches
  // des vêtements portés et le sac porté.
  function ebOu(ou) {
    var t = 0;
    state.inv.objets.forEach(function (o) { if (o.ou === ou) t += pnum(o.qte) * pnum(o.encombre); });
    return Math.round(t * 100) / 100;
  }
  function ebPoches() { return ebOu("poches"); }
  function ebSac() { return ebOu("sac"); }
  function objetEn(cas) {
    var out = null;
    state.inv.objets.forEach(function (o) { if (!out && o.ou === cas) out = o; });
    return out;
  }
  // un vêtement PORTÉ : dans la case de son type
  function vetementsPortes() {
    return state.inv.objets.filter(function (o) { return o.vet && o.ou === o.vet; });
  }
  function capPoches() {
    var t = 0;
    vetementsPortes().forEach(function (o) { t += pnum(o.poches); });
    return Math.round(t * 100) / 100;
  }
  function capSac() {
    var s = objetEn("dos");
    return s && s.sac ? pnum(s.cap) : 0;
  }
  // Le poids porté se calcule ICI et nulle part ailleurs : le module
  // d'inventaire lit les mêmes fonctions.
  function poidsPorteBrut() { return poidsOu(function () { return true; }); }
  function poidsPorte() { return pub("poidsPorte", poidsPorteBrut(), {}); }
  // Les objets marqués « prise rapide », comptés à l'unité et non à la
  // quantité : un carquois de vingt flèches occupe UN accès, pas vingt. Qu'ils
  // soient dans les poches ou dans le sac ne change rien.
  function accesPris() {
    var n = 0;
    state.inv.objets.forEach(function (o) { if (o.rapide && pnum(o.qte) > 0) n++; });
    return n;
  }
  // La contenance OCCUPÉE se compte à la main (le pas du bloc Corps) : la fiche
  // ne devine pas ce qu'un personnage a dans le ventre à partir de son sac. Les
  // « places » d'un objet disent ce qu'il occuperait une fois avalé ; c'est une
  // aide à la saisie, pas un calcul automatique.
  function contenancePrise() { return state.etat.contenance; }

