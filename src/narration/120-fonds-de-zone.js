
  // ---------- les fonds de zone ----------
  // Chaque place porte une IMAGE DE FOND, à la place du portrait qu'elle avait :
  // une vignette de seize pixels dans un en-tête ne montrait rien de personne.
  // Deux façons de la donner, et l'ordre entre elles compte : une URL, rangée
  // dans la configuration, ou un FICHIER, rangé dans son propre attribut. Le
  // fichier l'emporte, parce que c'est le plus explicite des deux gestes.
  //
  // POURQUOI ON REDIMENSIONNE. Un attribut Roll20 n'est pas un entrepôt
  // d'images, et personne n'a mesuré ce qu'il accepte. On plafonne donc la
  // largeur, on encode en WebP, et on descend la qualité jusqu'à tenir sous la
  // cible. Ce qui revient de Roll20 est relu à chaque tour : chaque millier de
  // caractères se paie une fois par seconde et par joueur.
  var BG_LARGEURS = [800, 600, 400];
  var BG_CIBLE = 200 * 1024;   // caractères visés pour la chaîne enregistrée
  var BG_QUALITES = [0.86, 0.78, 0.7, 0.62, 0.54, 0.46, 0.38, 0.3];

  function reduitImage(fichier, largeur, pret, rate) {
    var lect = new FileReader();
    lect.onerror = function () { rate("Image illisible."); };
    lect.onload = function () {
      var im = new Image();
      im.onerror = function () { rate("Image illisible."); };
      im.onload = function () {
        try {
          var w0 = im.naturalWidth || im.width, h0 = im.naturalHeight || im.height;
          if (!(w0 > 0) || !(h0 > 0)) { rate("Image illisible."); return; }
          // On n'AGRANDIT jamais : une petite image étirée à 800 px ne gagne que
          // du poids.
          var w = Math.min(largeur, w0);
          var h = Math.max(1, Math.round(h0 * (w / w0)));
          var c = document.createElement("canvas");
          c.width = w; c.height = h;
          c.getContext("2d").drawImage(im, 0, 0, w, h);
          var i, url = "";
          for (i = 0; i < BG_QUALITES.length; i++) {
            url = c.toDataURL("image/webp", BG_QUALITES[i]);
            // toDataURL ne SAIT PAS refuser : un navigateur sans encodeur WebP
            // rend du PNG sans le dire, et un PNG de photo pèse trois fois le
            // budget. On vérifie donc ce qu'on a obtenu, et on retombe sur le
            // JPEG, qui n'a jamais manqué nulle part.
            if (url.indexOf("data:image/webp") !== 0) url = c.toDataURL("image/jpeg", BG_QUALITES[i]);
            if (url.length <= BG_CIBLE) break;
          }
          if (url.length > BG_CIBLE) { rate("Image trop lourde, même réduite."); return; }
          pret(url, w);
        } catch (e) { rate("Image illisible."); }
      };
      im.src = String(lect.result || "");
    };
    lect.readAsDataURL(fichier);
  }

  // L'ENVOI D'UN FOND, ET LA SEULE FAÇON DE DÉCOUVRIR LA LIMITE DE ROLL20.
  // Personne ne l'a mesurée, et l'essayer à l'aveugle coûterait une soirée. On
  // tente donc la plus grande taille ; si le serveur refuse (le pont rapporte sa
  // réponse) ou si l'écriture ne revient jamais, on descend d'un cran et on
  // recommence. À l'arrivée, on DIT à quelle taille c'est passé : la limite se
  // découvre une fois, pas à chaque image.
  var envoi = null;   // { id, fichier, rang, largeur, apres, minuteur }

  function annuleEnvoi() {
    if (!envoi) return;
    if (envoi.minuteur) clearTimeout(envoi.minuteur);
    envoi = null;
  }
  function poseFond(id, fichier, apres) {
    if (!peutPousser()) { mot("Lecture seule : le fond n'a pas pu être enregistré."); return; }
    annuleEnvoi();
    envoi = { id: id, fichier: fichier, rang: 0, apres: apres, minuteur: null };
    mot("Réduction de l'image…");
    envoieFond();
  }
  function envoieFond() {
    var e = envoi;
    if (!e) return;
    reduitImage(e.fichier, BG_LARGEURS[e.rang], function (url, w) {
      if (envoi !== e) return;   // un autre envoi a commencé pendant l'encodage
      e.largeur = w;
      fonds[e.id] = url;         // à l'écran tout de suite, l'écho suivra
      ecrire(defObj(A_BG + e.id, url));
      mot("Enregistrement du fond en " + w + " px…");
      if (e.apres) { try { e.apres(); } catch (err) {} }
      rend();
      // LE FILET, pour le jour où le pont ne dit rien. Un attribut refusé peut
      // ne jamais reparaître dans la lecture : retenu() ne sera alors jamais
      // appelé pour lui, et l'envoi resterait en attente pour toujours. Deux
      // tours de relecture après la garde suffisent à trancher.
      if (e.minuteur) clearTimeout(e.minuteur);
      e.minuteur = setTimeout(function () { if (envoi === e) fondRefuse(); },
                              GARDE + PONT_PAS + 2 * POLL);
    }, function (m) { if (envoi === e) { annuleEnvoi(); mot(m); } });
  }
  function fondRefuse() {
    var e = envoi;
    if (!e) return;
    if (e.minuteur) { clearTimeout(e.minuteur); e.minuteur = null; }
    var refusee = e.largeur || BG_LARGEURS[e.rang];
    if (e.rang + 1 < BG_LARGEURS.length) {
      e.rang++;
      mot("Roll20 a refusé " + refusee + " px : nouvel essai en " + BG_LARGEURS[e.rang] + " px.");
      envoieFond();
      return;
    }
    var id = e.id, apres = e.apres;
    annuleEnvoi();
    delete fonds[id];
    mot("Roll20 refuse cette image, même en " + refusee + " px.");
    if (apres) { try { apres(); } catch (err) {} }
    rend();
  }
  function fondPasse() {
    var e = envoi;
    if (!e) return;
    var w = e.largeur;
    annuleEnvoi();
    mot("Fond enregistré en " + w + " px.");
  }
  function retireFond(id) {
    if (!peutPousser()) { mot("Lecture seule : le fond n'a pas pu être retiré."); return; }
    if (envoi && envoi.id === id) annuleEnvoi();
    delete fonds[id];
    ecrire(defObj(A_BG + id, ""));
    rend();
  }
  // Le fichier importé l'emporte sur l'URL : c'est le geste le plus explicite
  // des deux, et il vit dans son propre attribut. Vider l'un ne touche pas
  // l'autre, on peut donc garder une URL de secours sous une image.
  function fondDe(p) { return fonds[p.id] || p.img || ""; }
