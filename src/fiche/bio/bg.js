  // ---------- Bio et Notes ----------
  // Les deux seules zones de PROSE LIBRE de la fiche. `state.background` et
  // `state.notes` existaient déjà — normalisés avec les champs d'identité,
  // initialisés par owd-attr-map.js et mappés vers les attributs Roll20
  // `owd_background` / `owd_notes` — mais AUCUN module ne les lisait ni ne les
  // écrivait : le joueur n'avait nulle part où écrire son personnage, et deux
  // champs morts faisaient l'aller-retour à vide dans les Attributes, dans
  // l'export et dans la migration. C'est le modèle de JJK
  // (buildBackground / buildNotes), repris tel quel, et le dernier trou de
  // parité avec elle.
  //
  // ILS VIVENT EN BAS DE L'ONGLET FICHE, sous les Techniques : Outward n'a que
  // trois onglets, il n'existe donc aucun onglet Bio où les ranger, et l'onglet
  // Options ne porte que des réglages — jamais du personnage. La colonne
  // « bas » leur donne la pleine largeur, seule mesure où de la prose se lit.
  // Ce sont DEUX modules et non un seul : chacun se déplace, se replie et se
  // masque de son côté, et une table qui ne veut pas d'histoire écrite peut
  // retirer la Bio sans perdre son carnet.
  function buildBio() {
    // Rouage : l'histoire s'écrit à la création et se relit ensuite. Le champ
    // se verrouille donc comme les autres champs de conception, contre la
    // frappe distraite au milieu d'une partie.
    // L'identifiant d'édition est « bg », celui du module, et non « bio » :
    // block() en fait le data-module du bloc, et monteModules ne le repose que
    // s'il manque (« if (!e.dataset.module) »). Deux mots différents, et le
    // bloc serait attribué à un module qui n'existe pas — les sondes, le
    // museau d'un module en panne et le plan chercheraient tous « bg » sans
    // jamais le trouver.
    var b = block("Bio", null, "bg");
    var bg = el("textarea", "pc-notes pc-edit-field");
    bg.rows = 7;
    bg.placeholder = "D'où il vient, ce qu'il fuit, ce qu'il doit.";
    bg.value = state.background || "";
    bg.addEventListener("input", function () { state.background = bg.value; save(); });
    // Le champ ne se réécrit JAMAIS pendant la frappe : c'est le motif de tous
    // les champs du fichier. Sans cette garde, une hydratation ou un import
    // arrivé en cours de phrase remettrait la valeur enregistrée et renverrait
    // le curseur au début.
    hooks.push(function () { if (document.activeElement !== bg) bg.value = state.background || ""; });
    b.appendChild(bg);
    // le rouage peut être déjà ouvert au remontage : sans cet appel le champ
    // resterait grisé jusqu'au premier refresh()
    applyEdit(b, "bg");
    return b;
  }
