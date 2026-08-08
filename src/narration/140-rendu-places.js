
  // ---------- rendu ----------
  function places() {
    var l = [{ id: "mj", nom: conf.mj.nom || "MJ", img: conf.mj.img, mj: true }];
    conf.joueurs.forEach(function (j) { l.push({ id: j.id, nom: j.nom || "—", img: j.img, mj: false }); });
    return l;
  }

  function rend() {
    if (!racine) return;
    var l = places();
    var vus = {};
    // MJ à gauche, joueurs à droite : deux colonnes, chaque place occupant une
    // part égale de la sienne. Rien ne défile — un plateau qui défile perdrait
    // ses jetons hors de l'écran, et leurs coordonnées n'auraient plus de sens.
    l.forEach(function (p) {
      vus[p.id] = 1;
      var d = placesDom[p.id];
      var hote = p.mj ? coteMj : coteJoueurs;
      if (!d) {
        d = el("div", "nb-place" + (p.mj ? " nb-place-mj" : ""));
        // Une place est une CARTE du livre : un en-tête (nom en Cinzel, compte à
        // droite) souligné d'un filet, puis la table. Le nom n'est plus une
        // légende posée en bas à gauche qui se disputait la place avec le
        // portrait et se tronquait dès 260 pixels.
        var tete = el("div", "nb-place-tete");
        tete.appendChild(el("div", "nb-place-nom"));
        tete.appendChild(el("div", "nb-place-compte"));
        d.appendChild(tete);
        d.appendChild(el("div", "nb-place-corps"));
        placesDom[p.id] = d;
      }
      if (d.parentNode !== hote) hote.appendChild(d);
      // LE FOND DE LA ZONE, à la place du portrait. Une image en fond, et non
      // plus une vignette de seize pixels dans l'en-tête, où elle ne montrait
      // rien de personne.
      //
      // On ne repeint que si la valeur CHANGE. Deux raisons, et la seconde
      // suffirait : réaffecter la même adresse relance la requête, ce qui
      // faisait clignoter l'ancien portrait cassé une fois par seconde ; et un
      // fond importé pèse deux cent mille caractères, qu'il serait absurde de
      // repasser au moteur de style à chaque relecture. Le repère est gardé en
      // JS et non dans un data- : une chaîne pareille dans un attribut du DOM
      // s'inspecte mal et se recopie deux fois.
      var f = fondDe(p);
      if (fondPose[p.id] !== f) {
        fondPose[p.id] = f;
        // Les guillemets et les obliques inverses sont ôtés de l'adresse : sans
        // cela, une URL fabriquée par n'importe quel joueur de la table
        // refermerait le url() et poserait ce qu'elle veut dans la règle de
        // style. Une adresse d'image n'en contient jamais, et un data: est du
        // base64, donc rien à perdre.
        d.style.backgroundImage = f ? 'url("' + f.replace(/["\\\s]/g, "") + '")' : "";
        d.classList.toggle("nb-fond", !!f);
      }
      var nom = d.querySelector(".nb-place-nom");
      nom.textContent = p.nom;
      // Un nom se tronque dans une place étroite, et c'est inévitable à 260
      // pixels de large : l'infobulle le rend entier, la table ne devient donc
      // jamais anonyme.
      nom.title = p.nom;
      d.dataset.place = p.id;
    });
    Object.keys(placesDom).forEach(function (id) {
      if (vus[id]) return;
      if (placesDom[id].parentNode) placesDom[id].parentNode.removeChild(placesDom[id]);
      delete placesDom[id];
      // le repère de fond suit la carte : le garder ferait qu'une place recréée
      // sous le même identifiant se croirait déjà peinte
      delete fondPose[id];
    });
    // l'ordre des cartes suit celui de la configuration
    l.forEach(function (p) { if (!p.mj) coteJoueurs.appendChild(placesDom[p.id]); });

    if (jaugeRef) jaugeRef();
    rendJetons();
    compte();
  }
