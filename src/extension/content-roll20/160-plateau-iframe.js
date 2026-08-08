  // L'iframe est créée UNE FOIS et ne meurt plus : au repli elle est masquée,
  // pas détruite. Détruire une fenêtre et en refaire une à chaque pli mangeait
  // une place dans la table des liaisons du pont (source <-> personnage), qui
  // n'en compte que soixante-quatre : au bout d'une soirée de plis, le pont
  // refusait tout, plateau ET fiches. Masquée, elle voit sa fenêtre tomber à
  // zéro pixel, ce que la page distante reconnaît pour cesser d'interroger
  // Roll20 — cette décision-là lui appartient, et reste donc modifiable sans
  // signature.
  function panRemplit() {
    if (!panCorps || panCorps.firstChild) return;
    var f = el("iframe", "jjk-panneau-frame");
    f.src = browser.runtime.getURL("panneau.html") +
            "#p=" + PAN_PAGE + "&n=" + (nuitEffective() ? "1" : "0") + "&m=" + MODE;
    f.setAttribute("allow", "clipboard-write");
    panCorps.appendChild(f);
    // pas d'injection du pont ici : la page distante le réclame elle-même
    // (need-bridge), et le fichier tient à ne rien injecter de son propre chef
  }
  // Le CADRE et le PLATEAU ne doivent jamais être l'un clair et l'autre sombre.
  // Le cadre vit ici, le plateau est servi par le site et ne lit sa nuit qu'au
  // chargement, dans le hash : les accorder demande donc de refaire l'iframe,
  // car changer le seul fragment d'une adresse ne recharge rien (c'est une
  // navigation dans le même document, la page distante ne s'en aperçoit même
  // pas). Refaire l'iframe est sans danger depuis que la table des liaisons du
  // pont fait le ménage des fenêtres mortes, et le plateau n'a rien à perdre :
  // son état, ce sont les jetons rangés dans Roll20, jamais la page.
  function panRepeint() {
    if (!panBoite) return;
    poseNuit(panBoite);
    if (panCorps && panCorps.firstChild) {
      panCorps.innerHTML = "";
      panRemplit();
    }
  }
  function panOuvre(ouvert) {
    panEtat.ouvert = !!ouvert;
    panApplique();
    if (panEtat.ouvert) panRemplit();
    panRange();
  }
  // Détacher, puis rattacher. La boîte et l'iframe ne bougent pas : seule leur
  // géométrie change, et le plateau ne s'aperçoit de rien — pas de rechargement,
  // pas de fenêtre de plus dans la table des liaisons du pont, pas d'instant où
  // deux plateaux existeraient.
  function panDetache(ancre) {
    panEtat.ancre = !!ancre;
    // DÉTACHÉ, IL NE DOIT PAS TOMBER DERRIÈRE LA BARRE. La place flottante est
    // mesurée sur la barre d'il y a deux ans (x = 62, juste à sa droite) ; le
    // jour où Roll20 l'élargit, ou la déplace, ce qu'il a déjà fait, on
    // détacherait le plateau sous elle, où il aurait l'air d'avoir disparu.
    // On ne le repousse que s'il le faut, et jamais plus loin que nécessaire.
    if (!panEtat.ancre) {
      var r = barreRect();
      // DÉTACHÉ, on ne glisse pas sous la barre : ce serait le perdre. Le
      // chevauchement n'a de sens qu'ancré, où la barre le cache exprès.
      if (r && panEtat.x < r.right) panEtat.x = Math.round(r.right + 4);
    }
    panBorne(panEtat);
    panApplique();
    panRange();
  }
  // Un geste (déplacement ou redimensionnement) se fait à la CAPTURE DE
  // POINTEUR : la page de Roll20 est pleine d'iframes (chaque dialogue de
  // personnage en est une), et des écouteurs posés sur le document perdaient le
  // pointeur dès qu'il passait au-dessus de l'une d'elles. Le geste ne se
  // terminait alors jamais : le panneau restait inerte, sans que rien ne le
  // dise. La capture suit le pointeur partout, y compris hors de la fenêtre, et
  // le relâchement revient toujours.
  //
  // ANCRÉ, LE PLATEAU NE SE DÉPLACE PAS : c'est tout l'objet de l'ancrage, et le
  // déplacer sous les doigts en ferait un flottant sans le dire. La poignée, en
  // revanche, reste utile : elle ne règle plus que la LARGEUR, la hauteur étant
  // celle de la fenêtre.
  var panGesteEnCours = false;
  function panGeste(ev, bouge) {
    if (panGesteEnCours || (ev.button != null && ev.button !== 0)) return;
    var ancre = panAncre();
    if (ancre && bouge) return;
    panGesteEnCours = true;
    var cible = ev.currentTarget;
    var x0 = ev.clientX, y0 = ev.clientY;
    var e0 = { x: panEtat.x, y: panEtat.y, w: panEtat.w, h: panEtat.h };
    panBoite.classList.add("jjk-panneau-geste");
    function suit(m) {
      var dx = m.clientX - x0, dy = m.clientY - y0;
      if (bouge) { panEtat.x = e0.x + dx; panEtat.y = e0.y + dy; }
      else { panEtat.w = e0.w + dx; if (!ancre) panEtat.h = e0.h + dy; }
      panBorne(panEtat);
      panApplique();
    }
    function fin() {
      if (!panGesteEnCours) return;
      panGesteEnCours = false;
      cible.removeEventListener("pointermove", suit);
      cible.removeEventListener("pointerup", fin);
      cible.removeEventListener("pointercancel", fin);
      window.removeEventListener("blur", fin);
      try { cible.releasePointerCapture(ev.pointerId); } catch (e) {}
      panBoite.classList.remove("jjk-panneau-geste");
      panRange();
    }
    try { cible.setPointerCapture(ev.pointerId); } catch (e) {}
    cible.addEventListener("pointermove", suit);
    cible.addEventListener("pointerup", fin);
    cible.addEventListener("pointercancel", fin);
    window.addEventListener("blur", fin);
    ev.preventDefault();
    ev.stopPropagation();
  }
