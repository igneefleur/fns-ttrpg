/* LES DÉS EN VOLUME — le moteur, partagé par les deux modes.
 *
 * D'OÙ VIENT CE FICHIER, ET POURQUOI IL NE SE RELIT PAS À LA MAIN.
 * Le corps ci-dessous est EXTRAIT d'une page d'essai autonome, `owd-d6/d6.html`
 * du dépôt, où il tourne sous trente-quatre auto-contrôles : les six solides et
 * leur relation d'Euler, la planéité de chaque face, les angles dièdres au
 * millionième de degré, la pose de lecture, l'exactitude de l'atterrissage sur
 * les soixante faces, le suivi de l'éclairage image par image, la stabilité de
 * l'encre, le contraste garanti. Il est repris TEL QUEL, par un script qui
 * découpe la page en blocs nommés — `owd-d6/banc/batir-des3d.py` — et non
 * recopié : une transcription à la main perdrait tout le bénéfice de ces
 * contrôles au premier caractère qui glisse.
 *
 * DEUX COUTURES SEULEMENT SONT DÉFAITES au passage, et le script les nomme :
 * la couleur ne repeint plus un plateau commun mais les scènes vivantes, et la
 * valeur n'est plus tirée mais IMPOSÉE — elle vient de Roll20.
 *
 * POUR MODIFIER LE MOTEUR, on modifie `d6.html`, on y relance les contrôles, et
 * on rejoue le script. Éditer ce fichier-ci directement marche une fois et se
 * perd à la régénération suivante.
 *
 * CE QU'IL FAIT. Six solides — tétraèdre, cube, octaèdre, trapézoèdre
 * pentagonal, dodécaèdre, icosaèdre — calculés et non tabulés : on donne les
 * sommets, l'enveloppe convexe rend les faces, et tout le reste en découle. Un
 * aplat par face, sous une lumière placée au niveau du lecteur, si bien que ce
 * qui trace une arête est l'écart entre deux aplats et lui seul. Une culbute par
 * impulsions dont chacune est plus petite que la précédente, qui ne s'oppose
 * jamais à la rotation en cours et ne l'accélère jamais, et qui se termine
 * EXACTEMENT sur la face demandée.
 *
 * IL N'EST PAS UNE COQUILLE, et c'est délibéré : il ne va rien chercher sur le
 * réseau, ne dépend d'aucune page distante et ne lit rien du DOM de Roll20. Il
 * ne sait faire qu'une chose, rendre un dé qui montre une valeur donnée.
 *
 * PARTAGÉ PAR stable/ ET beta/ : ce fichier existe en UN exemplaire et se charge
 * avant les deux copies de content-roll20.js. Rien en lui ne dépend du mode —
 * un dé est un dé — et le dupliquer aurait fait deux moteurs à corriger. */
(function () {
  "use strict";

var TAU = Math.PI * 2;
var DEG = Math.PI / 180;

function borne(v, a, b) { return v < a ? a : (v > b ? b : v); }
function borne01(v) { return borne(v, 0, 1); }

/* Courbe de Bézier cubique, résolue par Newton : la même arithmétique que
   `cubic-bezier()` en CSS, mais évaluée ici, parce que toute la chorégraphie
   est calculée image par image (voir le pavé de la section 8). */
function courbe(x1, y1, x2, y2) {
  function A(a, b) { return 1 - 3 * b + 3 * a; }
  function B(a, b) { return 3 * b - 6 * a; }
  function C(a) { return 3 * a; }
  function calc(t, a, b) { return ((A(a, b) * t + B(a, b)) * t + C(a)) * t; }
  function pente(t, a, b) { return 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a); }
  return function (x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    var t = x, i, d, e;
    for (i = 0; i < 8; i++) {
      d = pente(t, x1, x2);
      if (Math.abs(d) < 1e-6) break;
      e = calc(t, x1, x2) - x;
      if (Math.abs(e) < 1e-7) break;
      t -= e / d;
    }
    return calc(borne01(t), y1, y2);
  };
}

/* Vecteurs à trois composantes, dans le repère CSS : x à droite, y VERS LE
   BAS, z vers l'observateur. */
function scal(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function norme(v) { return Math.sqrt(scal(v, v)); }
function unitaire(v) { var n = norme(v); return [v[0] / n, v[1] / n, v[2] / n]; }
function somme(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function difference(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function vectoriel(a, b) {
  return [a[1] * b[2] - a[2] * b[1],
          a[2] * b[0] - a[0] * b[2],
          a[0] * b[1] - a[1] * b[0]];
}

/* --- Quaternions ---------------------------------------------------------
   L'orientation du solide est tenue par un quaternion [w, x, y, z], et rendue
   en `matrix3d`. Pourquoi pas trois angles d'Euler empilés sur trois couches :
   parce qu'on veut à la fois des tours entiers ET une arrivée exacte sur une
   face donnée, et que composer trois rotations d'Euler pour atteindre une pose
   imposée demande un décodage inverse à chaque lancer. Le quaternion donne
   l'arrivée exacte par construction — et donne en prime les normales des
   faces, dont l'éclairage a de toute façon besoin à chaque image.          */

function qAxe(axe, angle) {
  var s = Math.sin(angle / 2);
  return [Math.cos(angle / 2), axe[0] * s, axe[1] * s, axe[2] * s];
}

function qProduit(a, b) {   /* (a ⊗ b) appliqué à v vaut a( b( v ) ) */
  return [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]
  ];
}

function qConjugue(q) { return [q[0], -q[1], -q[2], -q[3]]; }

function qNormalise(q) {
  var n = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

/* Interpolation sphérique, par le plus court chemin — exactement ce que fait
   le navigateur quand deux listes de transformations diffèrent d'une image-clé
   à l'autre, et c'est pour cette raison qu'une animation CSS mange les tours
   entiers. Ici le plus court chemin est ce qu'on VEUT : les tours sont ajoutés
   à part, en section 8. */
function qSlerp(a, b, t) {
  var d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  var c = b;
  if (d < 0) { c = [-b[0], -b[1], -b[2], -b[3]]; d = -d; }
  if (d > 0.9995) {
    return qNormalise([
      a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t,
      a[2] + (c[2] - a[2]) * t, a[3] + (c[3] - a[3]) * t
    ]);
  }
  var th = Math.acos(borne(d, -1, 1)), s = Math.sin(th);
  var k0 = Math.sin((1 - t) * th) / s, k1 = Math.sin(t * th) / s;
  return [a[0] * k0 + c[0] * k1, a[1] * k0 + c[1] * k1,
          a[2] * k0 + c[2] * k1, a[3] * k0 + c[3] * k1];
}

/* Matrice 3×3, rangée par LIGNES : v' = R · v. */
function qMatrice(q) {
  var w = q[0], x = q[1], y = q[2], z = q[3];
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - w * z),     2 * (x * z + w * y)],
    [2 * (x * y + w * z),     1 - 2 * (x * x + z * z), 2 * (y * z - w * x)],
    [2 * (x * z - w * y),     2 * (y * z + w * x),     1 - 2 * (x * x + y * y)]
  ];
}

/* Méthode de Shepperd : on choisit la branche dont le dénominateur est le plus
   grand, ce qui évite la perte de précision près des cas dégénérés. */
function qDeMatrice(R) {
  var tr = R[0][0] + R[1][1] + R[2][2], s;
  if (tr > 0) {
    s = Math.sqrt(tr + 1) * 2;
    return qNormalise([0.25 * s, (R[2][1] - R[1][2]) / s, (R[0][2] - R[2][0]) / s, (R[1][0] - R[0][1]) / s]);
  }
  if (R[0][0] > R[1][1] && R[0][0] > R[2][2]) {
    s = Math.sqrt(1 + R[0][0] - R[1][1] - R[2][2]) * 2;
    return qNormalise([(R[2][1] - R[1][2]) / s, 0.25 * s, (R[0][1] + R[1][0]) / s, (R[0][2] + R[2][0]) / s]);
  }
  if (R[1][1] > R[2][2]) {
    s = Math.sqrt(1 + R[1][1] - R[0][0] - R[2][2]) * 2;
    return qNormalise([(R[0][2] - R[2][0]) / s, (R[0][1] + R[1][0]) / s, 0.25 * s, (R[1][2] + R[2][1]) / s]);
  }
  s = Math.sqrt(1 + R[2][2] - R[0][0] - R[1][1]) * 2;
  return qNormalise([(R[1][0] - R[0][1]) / s, (R[0][2] + R[2][0]) / s, (R[1][2] + R[2][1]) / s, 0.25 * s]);
}

/* `matrix3d` se lit par COLONNES : les quatre premiers nombres forment la
   première colonne de la matrice, et non sa première ligne. */
function matrice3dCss(R) {
  function n(v) { return (Math.abs(v) < 1e-9 ? 0 : v).toFixed(9); }
  return "matrix3d(" +
    n(R[0][0]) + "," + n(R[1][0]) + "," + n(R[2][0]) + ",0," +
    n(R[0][1]) + "," + n(R[1][1]) + "," + n(R[2][1]) + ",0," +
    n(R[0][2]) + "," + n(R[1][2]) + "," + n(R[2][2]) + ",0," +
    "0,0,0,1)";
}

/* ==========================================================================
   2. COULEUR — OKLCH, converti ici même
   ==========================================================================
   L'échelle de clarté est décrite en OKLCH parce que cet espace est
   perceptuellement uniforme : un écart de 0,10 en L est un écart franc, un
   écart de 0,02 ne l'est pas. C'est exactement le piège dans lequel il est
   facile de tomber avec quatre faces à 0,84 / 0,83 / 0,76 / 0,74 : l'œil n'y
   voit que deux tons, donc un losange avec un pli au lieu d'un solide.

   La conversion est faite ici plutôt que laissée à la fonction `oklch()` du
   CSS : on a de toute façon besoin des valeurs numériques pour mesurer les
   écarts et les contrastes (section 7), et cela retire toute dépendance au
   support de la fonction de couleur.

   Ce qu'il ne faut SURTOUT PAS faire pour produire l'échelle :
   `filter: brightness()`. C'est un produit dans l'espace sRGB, qui écrase le
   haut de gamme — deux faces à 1,00 et 0,95 s'y retrouvent à un centième de
   clarté perçue l'une de l'autre. C'est la mécanique même du défaut ci-dessus.
   ========================================================================== */

function versSrgb(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function oklch(L, C, hDeg) {
  var h = hDeg * DEG, a = C * Math.cos(h), b = C * Math.sin(h);
  var l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  var m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  var s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  var l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  var r =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  var g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  var u = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  function q(v) { return Math.round(borne(versSrgb(v), 0, 1) * 255); }
  return "rgb(" + q(r) + "," + q(g) + "," + q(u) + ")";
}

/* Pour un gris, la luminance relative vaut L³ (les trois coefficients de la
   transformée somment à 1). Sert uniquement à rapporter les contrastes dans
   l'auto-contrôle ; la chroma du dé est trop faible pour changer le verdict. */
function contraste(L1, L2) {
  var y1 = Math.pow(L1, 3), y2 = Math.pow(L2, 3);
  return (Math.max(y1, y2) + 0.05) / (Math.min(y1, y2) + 0.05);
}

/* ==========================================================================
   3. TIRAGE
   ==========================================================================
   La valeur est tirée AVANT l'animation, et l'animation converge vers elle.
   Jamais l'inverse : on ne relit pas une valeur dans un angle final. C'est la
   seule façon d'avoir un tirage uniforme démontrable.

   Rejet de la queue : `x % 6` sur un octet tiré uniformément n'est pas
   uniforme, 256 n'étant pas un multiple de 6. Le biais est infime, le rejet
   coûte trois lignes, et une page de dés se doit d'être honnête sur ce
   tirage-là — c'est le seul qui engage l'équité.
   ========================================================================== */

var alea = (typeof crypto !== "undefined" && crypto.getRandomValues) ? new Uint8Array(1) : null;

function entre(a, b) { return a + Math.random() * (b - a); }
function entier(n) { return Math.floor(Math.random() * n); }

/* Distribution uniforme sur la sphère : hauteur uniforme, azimut uniforme.
   Tirer trois composantes indépendantes puis normaliser privilégierait les
   diagonales du cube, donc toujours le même genre de culbute. */
function axeAleatoire() {
  var z = entre(-1, 1), a = entre(0, TAU), r = Math.sqrt(1 - z * z);
  return [r * Math.cos(a), r * Math.sin(a), z];
}

/* UNE FACE QUELCONQUE, POSÉE PAR SA MATRICE.
   On ne décompose pas en angles d'Euler : le trièdre local de la face donne
   directement les trois premières colonnes de la matrice, et son centroïde la
   quatrième. Une décomposition en angles rajouterait un choix de convention, un
   cas dégénéré au pôle et un signe à se tromper — pour rien, puisque le trièdre
   est déjà orthonormé et direct, ce que le constructeur du solide vérifie.
   `matrix3d` est en COLONNES : u, v, n, translation. */
function matriceFace(f, rayonPx) {
  return "matrix3d(" +
    [f.u[0], f.u[1], f.u[2], 0,
     f.v[0], f.v[1], f.v[2], 0,
     f.n[0], f.n[1], f.n[2], 0,
     f.c[0] * rayonPx, f.c[1] * rayonPx, f.c[2] * rayonPx, 1]
    .map(function (x) { return x.toFixed(6); }).join(",") + ")";
}

/* LE DÉCOUPAGE DE LA FACE À SA FORME. Le polygone est exprimé dans le trièdre
   local, en unités de rayon circonscrit ; l'élément de face fait exactement deux
   rayons de côté et est centré sur le centroïde, si bien qu'un sommet en
   coordonnée p tombe à 50 % + 50 p de la boîte. Les valeurs hors de [0, 100] %
   sont légales et se produisent — le polygone d'une face n'est pas inscrit dans
   sa boîte, il la déborde d'un côté quand la face n'est pas régulière. */
function decoupeFace(f) {
  return "polygon(" + f.poly.map(function (p) {
    return (50 + 50 * p[0]).toFixed(3) + "% " + (50 + 50 * p[1]).toFixed(3) + "%";
  }).join(",") + ")";
}

/* Les six pistes sont bâties PLUS BAS, une fois les solides définis : elles ont
   besoin de leur géométrie, et un `var` n'est renseigné qu'à la ligne où il est
   écrit. */

/* ==========================================================================
   5. LA GÉOMÉTRIE, LUE DEPUIS LE CSS
   ==========================================================================
   Le CSS est la source unique : les six transformations de faces y sont
   déclarées une fois, et le script LIT les matrices calculées pour en déduire
   normales, axes locaux et poses d'arrivée. Retaper cette table en JavaScript
   créerait deux vérités, qui divergeraient un jour, en silence.
   ========================================================================== */

/* `FACES` n'est plus une variable globale : chaque solide porte les siennes,
   dans `SOLIDES[nom].faces`. Une seule table de faces ne pouvait décrire qu'un
   seul solide, et il y en a six. */

/* Rapport perspective / arête, LU dans le CSS et non retapé ici. Le moteur en a
   besoin pour projeter l'ombre à la main : elle est plate, hors du contexte 3D,
   et ne bénéficie donc pas de la perspective que `.scene` applique au dé. Deux
   nombres tapés séparément divergeraient le jour où l'on retoucherait la
   focale, et le symptôme serait une ombre qui glisse sous le dé pendant qu'il
   s'éloigne — un défaut qu'on attribuerait à l'ombrage, jamais à la focale. */
var PERSPECTIVE = 5.6;

/* L'ARÊTE DE CHAQUE PISTE, EN PIXELS, mise en cache.
   Le rendu compose maintenant lui-même les translations, en pixels, là où le CSS
   les calculait à partir de `--arete`. Lire cette longueur à chaque image
   coûterait une synchronisation de mise en page par dé et par image — le
   contraire exact de ce qu'on cherche. On la relit donc quand elle peut avoir
   changé, c'est-à-dire au démarrage et au redimensionnement, jamais dans la
   boucle. Les trois tailles sont posées par des règles de média : elles ne
   changent qu'à un point d'arrêt, et un redimensionnement les traverse. */
/* `mesurerAretes` a disparu avec elle : la taille d'un dé n'est plus lue dans
   une règle de média mais posée par le script, la même pour les six. */


/* ==========================================================================
   LES SIX SOLIDES

   Ils ne sont pas TABULÉS, ils sont CALCULÉS : on ne donne que les sommets, et
   les faces se déduisent par enveloppe convexe. Une table de soixante faces
   écrite à la main serait un second jeu de vérité à tenir d'accord avec le
   premier, et c'est exactement ce que la page refuse partout ailleurs.

   Le coût est nul à l'échelle où l'on travaille : le balayage est en n³, et
   n vaut vingt au plus — sept mille tests de plan pour les six solides
   réunis, une fois, au chargement.

   LE d10 N'EST PAS POSÉ À LA MAIN NON PLUS. C'est le DUAL d'un antiprisme
   pentagonal uniforme : on construit l'antiprisme, on prend le pôle de chacune
   de ses faces, et l'enveloppe de ces pôles est le trapézoèdre. Ses dix
   cerfs-volants sont alors plans PAR CONSTRUCTION — les quatre pôles autour
   d'un sommet v de l'antiprisme vérifient tous pôle·v = 1, donc sont coplanaires.
   Les poser à la main demanderait de résoudre cette condition ; la construire
   la donne.

   MISE À L'ÉCHELLE UNIFORME, jamais sommet par sommet. Les cinq solides de
   Platon ont tous leurs sommets à la même distance du centre, le trapézoèdre
   NON : ses deux pointes sortent plus loin que sa couronne. Normaliser chaque
   sommet séparément le déforme et brise ses cerfs-volants en vingt triangles —
   c'est arrivé, et seul le compte de faces l'a montré.
   ========================================================================== */

var PHI = (1 + Math.sqrt(5)) / 2;

function sommetsTetraedre() {
  return [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
}
function sommetsCube() {
  var v = [], x, y, z;
  for (x = -1; x <= 1; x += 2) for (y = -1; y <= 1; y += 2) for (z = -1; z <= 1; z += 2) v.push([x, y, z]);
  return v;
}
function sommetsOctaedre() {
  return [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
}
function sommetsDodecaedre() {
  var v = sommetsCube(), a, b;
  for (a = -1; a <= 1; a += 2) for (b = -1; b <= 1; b += 2) {
    v.push([0, a / PHI, b * PHI]); v.push([a / PHI, b * PHI, 0]); v.push([a * PHI, 0, b / PHI]);
  }
  return v;
}
function sommetsIcosaedre() {
  var v = [], a, b;
  for (a = -1; a <= 1; a += 2) for (b = -1; b <= 1; b += 2) {
    v.push([0, a, b * PHI]); v.push([a, b * PHI, 0]); v.push([a * PHI, 0, b]);
  }
  return v;
}
/* LE d10 EST UN TRAPÉZOÈDRE PENTAGONAL, ET IL Y EN A UNE INFINITÉ.
   C'est une FAMILLE à un paramètre : deux couronnes de cinq sommets de rayon 1,
   décalées d'un dixième de tour, écartées de ±c, et deux pointes sur l'axe. La
   hauteur des pointes n'est pas libre : elle est imposée par la PLANÉITÉ des
   cerfs-volants. En écrivant que la pointe, deux sommets voisins d'une couronne
   et celui de l'autre qui s'intercale entre eux sont coplanaires, il vient

        h = c · (5 + 2√5).

   RESTE À CHOISIR c, ET C'EST TOUT LE SUJET. Trois critères ont été essayés, et
   les deux premiers ont été jugés à l'œil comme n'allant pas :

     — LE DUAL DE L'ANTIPRISME UNIFORME (c ≈ 0,190), membre canonique des
       mathématiques, le seul dont tous les dièdres soient égaux. C'est un fuseau,
       presque deux fois plus haut que large : rejeté ;
     — LE SOLIDE INSCRIPTIBLE (c ≈ 0,1062), dont les douze sommets sont sur une
       même sphère et qui maximise l'apothème sur le rayon, à 5^(−1/4) = 0,6687.
       C'est le plus rond DANS L'ESPACE, et pourtant il ne le paraît pas : vu de
       la seule pose où on le regarde — sa face de résultat droit devant — sa
       silhouette est 1,272 fois plus large que haute. Rejeté aussi, et c'est
       instructif : la rondeur d'un solide et celle de son image ne sont pas la
       même grandeur ;
     — CELUI-CI, qui tient les deux à la fois.

   ON MAXIMISE LE PRODUIT DE DEUX RONDEURS :

        (apothème / rayon)  ×  (rayon inscrit de la silhouette / son rayon
                                circonscrit, mesurés autour du centre du dé,
                                dans la pose où il est lu)

   La première dit que le solide serre sa sphère ; la seconde, que son CONTOUR à
   l'écran serre son disque. Chacune prise seule mène ailleurs — la première au
   solide inscriptible ci-dessus, la seconde à un disque plat de dix côtés, très
   rond de contour mais dont toutes les faces visibles reçoivent presque la même
   lumière, si bien qu'aucune arête ne sort et qu'il se lit comme un jeton. Leur
   produit n'a qu'un seul maximum sur toute la famille, et il donne

        c ≈ 0,130110,   apothème/rayon 0,5917,   silhouette 0,8030,
        largeur/hauteur 0,9572.

   Contre 0,6687 et 0,6772 pour le solide inscriptible : on perd huit centièmes
   de rondeur dans l'espace, on en gagne treize à l'écran, et la silhouette passe
   de nettement écrasée à quasi circulaire.

   LE PARAMÈTRE SE CHERCHE, IL NE S'ÉCRIT PAS. Une constante en dur ne dirait pas
   pourquoi elle vaut ce qu'elle vaut, et ne suivrait pas si l'on changeait la
   pose de lecture ou le nombre de faces. La recherche est une ternaire sur un
   intervalle où le produit est unimodal, et chaque essai passe par le VRAI
   `construireSolide` : le critère est donc mesuré sur le solide que la page
   utilisera, et non sur un modèle parallèle qui pourrait en diverger. */
function trapezoedreDe(c) {
  var h = c * (5 + 2 * Math.sqrt(5)), som = [], k, a;
  for (k = 0; k < 5; k++) {
    a = 2 * Math.PI * k / 5;
    som.push([Math.cos(a), c, Math.sin(a)]);
  }
  for (k = 0; k < 5; k++) {
    a = 2 * Math.PI * k / 5 + Math.PI / 5;
    som.push([Math.cos(a), -c, Math.sin(a)]);
  }
  som.push([0, h, 0]);
  som.push([0, -h, 0]);
  return som;
}

/* LE RAYON INSCRIT D'UNE SILHOUETTE, autour de l'origine et sans passer par une
   enveloppe convexe : c'est la plus courte des droites d'appui. On essaie toutes
   les droites portées par deux points projetés, on ne garde que celles qui
   laissent tous les autres du même côté — ce sont les côtés du contour — et l'on
   retient la plus proche. Le même raisonnement que `facesDe` en trois
   dimensions, à un rang de moins. */
function rayonInscritVu(pts) {
  var n = pts.length, i, j, k, ex, ey, L, ux, uy, h, dehors, mini = 1e9;
  for (i = 0; i < n; i++) for (j = 0; j < n; j++) {
    if (i === j) continue;
    ex = pts[j][0] - pts[i][0];
    ey = pts[j][1] - pts[i][1];
    L = Math.sqrt(ex * ex + ey * ey);
    if (L < 1e-9) continue;
    ux = ey / L; uy = -ex / L;
    h = pts[i][0] * ux + pts[i][1] * uy;
    if (h <= 0 || h >= mini) continue;
    dehors = false;
    for (k = 0; k < n; k++) {
      if (pts[k][0] * ux + pts[k][1] * uy > h + 1e-9) { dehors = true; break; }
    }
    if (!dehors) mini = h;
  }
  return mini;
}

/* Les deux rondeurs d'un trapézoèdre, et leur produit. */
function rondeursDuD10(c) {
  var sol = construireSolide("d10", trapezoedreDe(c));
  var f = sol.faces[0], pts = [], i, x, y, R = 0;
  for (i = 0; i < sol.sommets.length; i++) {
    x = scal(f.u, sol.sommets[i]);
    y = scal(f.v, sol.sommets[i]);
    pts.push([x, y]);
    R = Math.max(R, Math.sqrt(x * x + y * y));
  }
  var espace = sol.apotheme / sol.rayon, ecran = rayonInscritVu(pts) / R;
  return { espace: espace, ecran: ecran, produit: espace * ecran };
}

function sommetsTrapezoedre() {
  var bas = 0.06, haut = 0.30, m1, m2, i;
  for (i = 0; i < 40; i++) {
    m1 = bas + (haut - bas) / 3;
    m2 = haut - (haut - bas) / 3;
    if (rondeursDuD10(m1).produit < rondeursDuD10(m2).produit) bas = m1; else haut = m2;
  }
  return trapezoedreDe((bas + haut) / 2);
}

function cleNombre(x) { return (Math.abs(x) < 5e-7 ? 0 : x).toFixed(6); }

/* Le plan d'une face : normale unitaire SORTANTE et distance à l'origine. */
function planDe(som, idx) {
  var a = som[idx[0]], b = som[idx[1]], c = som[idx[2]];
  var n = unitaire(vectoriel(difference(b, a), difference(c, a)));
  var d = scal(n, a);
  if (d < 0) { n = [-n[0], -n[1], -n[2]]; d = -d; }
  return { n: n, d: d };
}

/* LES FACES SE TROUVENT, ELLES NE SE DÉCLARENT PAS. Tout triplet dont le plan
   laisse tous les autres sommets du même côté porte une face ; on regroupe
   ensuite TOUS les sommets de ce plan — c'est ce qui rend les pentagones et les
   cerfs-volants d'un seul tenant au lieu de les triangulariser — et on les range
   dans le sens direct vu de l'extérieur. */
function facesDe(som) {
  var vues = {}, n = som.length, i, j, k, t, a, b, c, nv, d, ok, dessous, sur;
  for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) for (k = j + 1; k < n; k++) {
    a = som[i]; b = som[j]; c = som[k];
    nv = vectoriel(difference(b, a), difference(c, a));
    if (norme(nv) < 1e-9) continue;
    nv = unitaire(nv);
    d = scal(nv, a);
    ok = true; dessous = true;
    for (t = 0; t < n; t++) {
      var e = scal(nv, som[t]) - d;
      if (e > 1e-9) ok = false;
      if (e < -1e-9) dessous = false;
    }
    if (!ok && !dessous) continue;
    if (!ok) { nv = [-nv[0], -nv[1], -nv[2]]; d = -d; }
    /* LA CLÉ DOIT CONFONDRE −0 ET +0. `toFixed` les distingue — « -0.000000 »
       contre « 0.000000 » — et les deux solides dont les normales ont des
       composantes nulles, le dodécaèdre et le trapézoèdre, comptaient alors
       chaque face DEUX fois : 24 faces au lieu de 12, 11 au lieu de 10. Seul le
       compte de faces l'a montré ; rien ne s'en serait vu à l'écran avant que
       deux faces ne se battent pour le même plan. */
    var cle = cleNombre(nv[0]) + "|" + cleNombre(nv[1]) + "|" + cleNombre(nv[2]) +
              "|" + cleNombre(d);
    if (vues[cle]) continue;
    sur = [];
    for (t = 0; t < n; t++) if (Math.abs(scal(nv, som[t]) - d) < 1e-7) sur.push(t);
    vues[cle] = ranger(som, sur, nv);
  }
  var out = [];
  for (var q in vues) if (vues.hasOwnProperty(q)) out.push(vues[q]);
  return out;
}

function ranger(som, idx, n) {
  var c = [0, 0, 0], i, k;
  for (i = 0; i < idx.length; i++) for (k = 0; k < 3; k++) c[k] += som[idx[i]][k] / idx.length;
  var u = unitaire(difference(som[idx[0]], c));
  var v = vectoriel(n, u);
  return idx.slice().sort(function (p, q) {
    var a = difference(som[p], c), b = difference(som[q], c);
    return Math.atan2(scal(a, v), scal(a, u)) - Math.atan2(scal(b, v), scal(b, u));
  });
}

/* Construit un solide complet à partir de ses seuls sommets. */
function construireSolide(nom, brut) {
  var i, k, ech = 0;
  for (i = 0; i < brut.length; i++) ech = Math.max(ech, norme(brut[i]));
  var som = brut.map(function (v) { return [v[0] / ech, v[1] / ech, v[2] / ech]; });

  var idx = facesDe(som);
  /* Rangées de la plus tournée vers l'œil à la moins : la valeur 1 est ainsi
     toujours la face de devant au repos, quel que soit le solide. */
  idx.sort(function (a, b) { return planDe(som, b).n[2] - planDe(som, a).n[2]; });

  var faces = [], apotheme = 1e9, rayon = 0;
  for (i = 0; i < som.length; i++) rayon = Math.max(rayon, norme(som[i]));

  /* PREMIÈRE PASSE — LES PLANS ET LES CENTROÏDES, ET RIEN D'AUTRE.
     Le trièdre local d'une face ne peut pas se décider ici : il dépend de la
     pose de repos, donc de la face qui ira au sol, donc de TOUTES les normales
     du solide. On le pose à la passe suivante. */
  for (k = 0; k < idx.length; k++) {
    var p = planDe(som, idx[k]);
    apotheme = Math.min(apotheme, p.d);
    var c = [0, 0, 0], j;
    for (j = 0; j < idx[k].length; j++) {
      c[0] += som[idx[k][j]][0] / idx[k].length;
      c[1] += som[idx[k][j]][1] / idx[k].length;
      c[2] += som[idx[k][j]][2] / idx[k].length;
    }
    /* les sommets de la face, rapportés à son centroïde : `poserLesFaces` y
       cherche les axes de symétrie, et la troisième passe en tire le découpage */
    var bruts = [];
    for (j = 0; j < idx[k].length; j++) bruts.push(difference(som[idx[k][j]], c));
    faces.push({ n: p.n, c: c, bruts: bruts, u: null, v: null, poly: null, qPose: null });
  }

  var sol = { nom: nom, n: faces.length, sommets: som, faces: faces,
              apotheme: apotheme, rayon: rayon, tailleChiffre: 0 };

  /* DEUXIÈME PASSE — la pose de repos, et le trièdre qu'elle impose. */
  poserLesFaces(sol);

  /* TROISIÈME PASSE — le découpage, exprimé dans le trièdre retenu. */
  for (k = 0; k < idx.length; k++) {
    var f = faces[k], poly = [], j3;
    for (j3 = 0; j3 < f.bruts.length; j3++) {
      poly.push([scal(f.bruts[j3], f.u), scal(f.bruts[j3], f.v)]);
    }
    f.poly = poly;
  }

  /* LA TAILLE DU CHIFFRE suit celle de la face, et non celle du dé : une face
     de d20 fait le tiers d'une face de d4. On la prend proportionnelle au rayon
     inscrit de la face — la moitié de la plus courte distance du centroïde à un
     bord — pour qu'aucun chiffre ne morde son arête. */
  var petit = 1e9;
  for (k = 0; k < faces.length; k++) {
    var pl = faces[k].poly, j2;
    for (j2 = 0; j2 < pl.length; j2++) {
      var a2 = pl[j2], b2 = pl[(j2 + 1) % pl.length];
      var ex = b2[0] - a2[0], ey = b2[1] - a2[1];
      var lg = Math.sqrt(ex * ex + ey * ey);
      if (lg > 1e-9) petit = Math.min(petit, Math.abs(a2[0] * ey - a2[1] * ex) / lg);
    }
  }
  sol.tailleChiffre = petit * 1.15;

  /* LES DEUX BORNES DE LA LEVÉE, et pourquoi ce ne sont pas celles-là qu'on
     aurait cru. L'ombre se normalise sur la hauteur du centre : il lui faut un
     minimum et un maximum. On avait d'abord pris « rayon moins appui au repos »,
     et pour l'octaèdre cela vaut ZÉRO — sa pose d'alors était déjà l'appui
     maximal. On prend donc les deux bornes que TOUT polyèdre possède et qui sont
     toujours distinctes : l'apothème, atteint face au sol, et le rayon, atteint
     pointe au sol. `u` vaut alors 0 quand le solide est posé bien à plat — ombre
     serrée et dense — et 1 quand il tient sur une pointe — ombre large et pâle.
     Depuis que la pose de repos met une face au sol, le zéro est atteint au
     repos pour les six, et non plus pour le seul cube. */
  return sol;
}

/* L'APPUI : de combien le solide descend sous son centre, dans l'orientation q.
   C'est le maximum, sur ses sommets, de leur ordonnée après rotation — la
   fonction d'appui du polyèdre dans la direction du bas. Trois coefficients
   suffisent, ceux de la deuxième LIGNE de la matrice. */
function appuiDe(sol, q) {
  var w = q[0], x = q[1], y = q[2], z = q[3];
  var a = 2 * (x * y + z * w);
  var b = 1 - 2 * (x * x + z * z);
  var c = 2 * (y * z - x * w);
  var som = sol.sommets, m = -1e9, i, e;
  for (i = 0; i < som.length; i++) {
    e = a * som[i][0] + b * som[i][1] + c * som[i][2];
    if (e > m) m = e;
  }
  return m;
}

var SOLIDES = {};
var ORDRE_SOLIDES = ["d4", "d6", "d8", "d10", "d12", "d20"];

function construireSolides() {
  SOLIDES.d4  = construireSolide("d4",  sommetsTetraedre());
  SOLIDES.d6  = construireSolide("d6",  sommetsCube());
  SOLIDES.d8  = construireSolide("d8",  sommetsOctaedre());
  SOLIDES.d10 = construireSolide("d10", sommetsTrapezoedre());
  SOLIDES.d12 = construireSolide("d12", sommetsDodecaedre());
  SOLIDES.d20 = construireSolide("d20", sommetsIcosaedre());
}

construireSolides();

/* `e` est le cosinus de l'inclinaison vers l'œil, donc dans [−1, 1] ; les faces
   vues l'ont positif. La face de devant vaut 1 et prend `L_MAX`, une face vue
   par la tranche vaut 0 et prend `L_MIN`. */
/* ==========================================================================
   6. LE MODÈLE D'ÉCLAIRAGE
   ==========================================================================
   Une palette n'est pas « trois tons pour les trois faces qu'on voit ». Trois
   faces au plus sont visibles à la fois, et ce sont toujours trois faces qui se
   rencontrent en un sommet : il y en a huit, et pendant la culbute les huit
   passent. Il faudrait donc garantir la séparation des clartés pour CHACUN des
   huit triplets, et pas seulement dans la pose de repos — un jeu de valeurs
   choisi à l'œil sur la seule pose de repos échoue en vol.

   La façon la plus sûre d'y arriver n'est pas d'attribuer des couleurs fixes
   aux faces : c'est d'ÉCLAIRER le solide. Chaque face reçoit la clarté que sa
   normale mérite sous une lumière fixe dans le repère de la caméra. Trois
   faces visibles ont des normales deux à deux orthogonales ; sous une clé
   franche et bien placée, elles s'étagent d'elles-mêmes — et elles continuent
   de s'étager quand le solide tourne, ce qu'une attribution fixe ne sait pas
   faire.

   La pose de repos, elle, est TIRÉE à chaque lancer dans une plage étroite
   (voir `poseFinale`) : l'étagement au repos n'est donc plus un triplet unique
   mais une famille. Le contrôle E balaie toute la plage tirée et rapporte le
   PIRE étagement qui s'y rencontre — 0,102 en clarté, contre 0,095 sous quoi
   deux faces fusionnent en un pli. C'est la garantie qui compte, puisque c'est
   celle qui couvre tout ce que le tirage peut sortir ; l'étagement typique,
   lui, est de l'ordre de 0,12.

   CE QU'AUCUN ÉCLAIRAGE NE PEUT GARANTIR, ET COMMENT ON S'EN SORT
   Sous une clé unique, la clarté est une fonction LINÉAIRE de la normale.
   Deux faces visibles ont donc la même clarté chaque fois que leur différence
   de normales est orthogonale à la lumière — un lieu de codimension 1, que
   toute culbute traverse. La mesure : sur des orientations tirées au hasard,
   deux faces d'aire notable sont à moins de 0,03 l'une de l'autre dans environ
   10 % des cas, et rigoureusement égales sur un ensemble de mesure nulle.
   Aucune palette n'y change rien — un vrai dé sous une vraie lampe fait
   exactement pareil. Ce qui sauve l'arête à ces instants-là, c'est le FILET
   d'arête et le chanfrein, qui sont locaux à chaque face et tracent la ligne
   quelle que soit la teinte des deux voisines. C'est la raison de fond pour
   laquelle ils ne sont pas décoratifs et ne doivent pas être retirés.

   Le plancher `L_MIN` n'est, lui, presque jamais atteint : une face d'aire
   notable ne descend pas sous 0,600 en clarté, soit un contraste de 4,6 : 1
   avec l'encre. Il ne sert que de filet de sécurité pour les faces vues
   quasiment par la tranche.

   Ce qui n'est PAS fait, et volontairement : décaler la couleur des faces
   arrière pour les rendre « plausibles ». Elles ne sont visibles qu'en vol, où
   l'ombrage tourne de toute façon avec le dé.
   ========================================================================== */

/* LA COULEUR N'EST PLUS UNE GLOBALE, C'EST UNE PALETTE — et il y en a douze.
   Chaque type de dé porte la sienne, en deux versions : claire pour le jour, avec
   un chiffre noir, sombre pour la nuit, avec un chiffre blanc. Tout ce qu'une
   couleur entraîne — la gamme de clarté, la saturation tenable, l'encre du
   chiffre, la table des tons — vit désormais dans un OBJET, et les fonctions qui
   s'en servent le reçoivent en argument. Voir `construirePalette`.
   Ce qui reste global ci-dessous, ce sont les constantes du MODÈLE, celles qui ne
   dépendent d'aucune couleur : la direction de la lumière et la largeur de la
   bande de clarté. */

/* La clé : haute, en avant, un peu à droite. y NÉGATIF = au-dessus. Ces trois
   nombres sont l'unique réglage de tout l'ombrage ; les déplacer change
   l'étagement au repos, que l'auto-contrôle mesure et rapporte en pied de
   page. On ne règle donc jamais l'ombrage à l'aveugle. */
/* LA LUMIÈRE EST AU LECTEUR, ET ELLE VISE LE CENTRE DU DÉ.
   Une seule direction, celle du regard : une face est d'autant plus éclairée
   qu'elle se tourne vers l'œil, et la face de devant est donc toujours la plus
   claire. L'éclairement vaut le cosinus de l'inclinaison — le produit scalaire
   de la normale par (0, 0, 1), c'est-à-dire simplement la composante z de la
   normale — et il ne dépend d'AUCUNE position sur la face : il est constant sur
   toute sa surface, ce qui est exactement ce qu'un aplat peut rendre.

   CE QUE CE MODÈLE COÛTE, ET IL FAUT LE SAVOIR. Une clé oblique séparait deux
   faces quelconques ; une clé alignée sur le regard ne le peut pas toujours.
   Deux faces symétriques par rapport à l'axe de vue reçoivent rigoureusement le
   même éclairement — un cube tourné de 45° autour de la verticale montre deux
   flancs strictement de la même couleur — et ce n'est pas un cas rare, c'est
   une SYMÉTRIE, donc une famille entière d'orientations. Ce qui trace l'arête à
   ces instants-là, c'est le FILET, et rien d'autre : il n'est pas décoratif, il
   est structurel. Le contrôle E mesure cet écart et le rapporte plutôt que de
   prétendre le garantir. */
var LUMIERE = [0, 0, 1];

/* LA GAMME DES APLATS. `L_MAX` est la clarté de la face de devant, celle qu'on
   choisit dans le sélecteur ; `L_MIN` celle d'une face vue par la tranche. Tout
   l'ombrage tient entre les deux, linéairement en l'inclinaison.
   LA LARGEUR DE LA BANDE EST LE SEUL RÉGLAGE, et elle est large à dessein :
   depuis que les faces sont des aplats, c'est l'écart entre deux voisines qui
   trace l'arête. La réduire fait fondre le solide en une silhouette plate. */
var BANDE = 0.415;

/* `e` est le cosinus de l'inclinaison vers l'œil, donc dans [−1, 1] ; les faces
   vues l'ont positif. La face de devant vaut 1 et prend le `L_MAX` de la palette,
   une face vue par la tranche vaut 0 et prend son `L_MIN`. */
function clarteDe(pal, e) { return pal.L_MIN + (pal.L_MAX - pal.L_MIN) * borne01(e); }

/* ==========================================================================
   LA COULEUR DU DÉ, RÉGLABLE

   Ce que le sélecteur donne est une couleur sRVB — c'est-à-dire UN point. Or un
   dé n'a pas une couleur, il a un ÉTAGEMENT : six faces dont la clarté dépend de
   leur orientation, et c'est cet étagement, et lui seul, qui le fait lire comme
   un solide. Peindre les six faces de la couleur reçue rendrait un hexagone
   plat.
   On en tire donc trois grandeurs — teinte, saturation, clarté centrale — et on
   reconstruit toute la gamme autour, en gardant RIGOUREUSEMENT la pente
   photométrique : c'est elle qui garantit l'écart de 0,095 en clarté entre deux
   faces voisines, sous lequel l'œil fusionne les deux et lit un pli au lieu
   d'une arête. La pente ne se règle pas depuis l'interface, et c'est délibéré.

   Deux garde-fous, tous deux nécessaires, tous deux vérifiés par le contrôle L :

     — LA SATURATION EST RABATTUE DANS LE GAMUT. Une teinte très saturée sort de
       sRVB dès qu'on l'éclaircit : les canaux saturent, deux clartés différentes
       rendent alors la MÊME couleur, et l'étagement disparaît précisément là où
       on l'a construit. On cherche donc par dichotomie la plus forte saturation
       qui ne fasse saturer aucun canal aux deux bouts de la gamme.

     — L'ENCRE SUIT. Sur un dé sombre, un chiffre presque noir devient invisible.
       On ne choisit pas l'encre au jugé : on essaie toute l'échelle des clartés
       et on retient celle qui maximise le contraste MINIMAL sur toute la gamme
       des faces — c'est-à-dire celle qui reste lisible sur la face la plus
       défavorable, quelle qu'elle soit.
   ========================================================================== */

/* L'inverse exact de `versSrgb`. */
function versLineaire(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/* sRVB « #rrggbb » vers OKLCH. */
function oklchDeHex(hex) {
  var n = parseInt(hex.slice(1), 16);
  var r = versLineaire(((n >> 16) & 255) / 255);
  var v = versLineaire(((n >> 8) & 255) / 255);
  var b = versLineaire((n & 255) / 255);
  var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * v + 0.0514459929 * b);
  var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * v + 0.1073969566 * b);
  var s2 = Math.cbrt(0.0883024619 * r + 0.2817188376 * v + 0.6299787005 * b);
  var L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s2;
  var A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s2;
  var B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s2;
  var h = Math.atan2(B, A) / DEG;
  return [L, Math.sqrt(A * A + B * B), h < 0 ? h + 360 : h];
}

/* Un canal sort-il de [0, 1] pour cette clarté, cette saturation, cette
   teinte ? C'est la question du gamut, et elle se pose aux deux bouts. */
function deborde(L, C, h) {
  var a = C * Math.cos(h * DEG), b = C * Math.sin(h * DEG);
  var l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  var m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  var s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  var l = l_ * l_ * l_, m = m_ * m_ * m_, s2 = s_ * s_ * s_;
  var r =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s2;
  var v = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s2;
  var u = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s2;
  var e = 1e-4;
  return r < -e || r > 1 + e || v < -e || v > 1 + e || u < -e || u > 1 + e;
}

/* La plus forte saturation tenable sur TOUTE la gamme, par dichotomie. */
/* LA PLUS FORTE SATURATION QUI TIENNE À UNE CLARTÉ DONNÉE.
   C'est la fonction qui a débloqué les couleurs vives, et il vaut la peine de
   dire ce qu'elle a remplacé.

   ON PRENAIT UNE SEULE SATURATION POUR TOUTE LA GAMME, celle qui tenait à la
   fois sur la face la plus claire et sur la plus sombre. Or le gamut sRVB se
   referme en pointe vers le noir : à clarté 0,25, un rouge ne peut pas dépasser
   0,12 de chroma là où il monte à 0,26 vers 0,60. Exiger UNE valeur commune,
   c'était donc imposer à la face lue la saturation que supporte la face
   d'ombre — et rendre tout le dé aussi terne que son coin le plus sombre. Six
   couleurs choisies vives ressortaient en pastel, et c'était le modèle, pas le
   choix des couleurs.

   MAINTENANT LA SATURATION SUIT LA CLARTÉ. La face lue porte la saturation
   demandée, pleine ; les faces d'ombre gardent la même TEINTE et ne perdent en
   saturation que ce que le gamut leur retire. C'est d'ailleurs ce que fait la
   matière : un objet vif à l'ombre reste de sa couleur, il ne devient pas gris,
   il devient une version sombre de lui-même — et sombre, en sRVB, veut dire
   moins saturé, faute de place. */
function chromaA(h, L, voulu) {
  if (!deborde(L, voulu, h)) return voulu;
  var lo = 0, hi = voulu, mid, i;
  for (i = 0; i < 24; i++) {
    mid = (lo + hi) / 2;
    if (deborde(L, mid, h)) hi = mid; else lo = mid;
  }
  return lo;
}

/* La saturation qui tient sur TOUTE une plage. Elle ne sert plus au dé — dont
   chaque face a la sienne — mais à l'encre du chiffre, qui n'a qu'une clarté, et
   aux contrôles. */
function chromaTenable(h, lmin, lmax, voulu) {
  var pire = voulu, k, L;
  for (k = 0; k <= 8; k++) {
    L = lmin + (lmax - lmin) * k / 8;
    pire = Math.min(pire, chromaA(h, L, voulu));
  }
  return pire;
}

/* LE CHIFFRE GARDE UNE SEULE COULEUR, DU DÉBUT À LA FIN DU LANCER.
   La version d'avant choisissait l'encre FACE PAR FACE, d'après la clarté de
   chacune. C'était juste au repos et faux en mouvement : une face parfaitement
   visible mais peu éclairée descend à 0,56 de clarté, où l'encre claire
   l'emporte de peu — 4,65 contre 3,89 — et son chiffre basculait au blanc en
   pleine culbute, puis revenait au noir. Un chiffre qui change de couleur
   pendant qu'on le regarde tourner est un défaut que rien ne rachète, et
   l'économie de contraste qu'il achetait ne valait pas ça.

   L'ENCRE EST DONC UNE PROPRIÉTÉ DU DÉ, décidée une fois quand on choisit sa
   couleur, et jamais retouchée ensuite. On la choisit sur la face du RÉSULTAT —
   celle qui se présente droit devant à l'arrêt, la seule qu'on lise vraiment —
   et l'on garde le ton d'origine, à 0,20 de clarté, chaque fois qu'il y suffit :
   le dé d'origine et tous les dés clairs gardent ainsi exactement leurs chiffres
   d'avant.

   CE QUI EST ASSUMÉ. Sur un dé sombre ou moyen, une face fortement ombrée porte
   un chiffre moins contrasté que la face du résultat. C'est ce que fait un vrai
   dé sous une vraie lampe, et c'est le prix d'une couleur de chiffre stable. Le
   contrôle L mesure ce pire cas et le rapporte, mais il n'en fait pas une
   condition : la condition porte sur la face qu'on lit. */
var ENCRE_CLAIR_L = 1.00;
var ENCRE_SOMBRE_MAX = 0.20;   /* le ton d'origine : on ne l'éclaircit jamais */

/* Le pire contraste d'UNE encre donnée sur une gamme de faces. */
function planchierEncre(lbas, lhaut, lencre) {
  var pire = 1e9, k, c;
  for (k = 0; k <= 40; k++) {
    c = contraste(lbas + (lhaut - lbas) * k / 40, lencre);
    if (c < pire) pire = c;
  }
  return pire;
}

/* L'ENCRE DU DÉ, choisie sur la clarté de la face du résultat.
   On préfère le ton d'origine dès qu'il tient les 4,5 : 1 — c'est un noir de
   pigment, pas un trou percé dans la face. Sinon on descend d'un centième à la
   fois jusqu'à ce qu'il tienne ; et si même le plus noir n'y arrive pas, c'est
   que la face est sombre : l'encre claire prend alors le relais, et elle y donne
   toujours beaucoup mieux. */
function encrePour(lrepos) {
  /* On compte en CENTIÈMES, et non par soustraction répétée de 0,01 : la boucle
     d'avant s'arrêtait à 0,029999999999999971 et n'essayait jamais la valeur
     0,02 que sa propre garde annonçait, si bien que sa branche de repli
     comparait à un ton jamais évalué. Sans conséquence visible — la fenêtre où
     cela changeait quelque chose vaut 10⁻⁴ de clarté — mais un compte faux dans
     une boucle est un compte faux. */
  var k;
  for (k = Math.round(ENCRE_SOMBRE_MAX * 100); k >= 2; k--) {
    if (contraste(lrepos, k / 100) >= 4.5) return k / 100;
  }
  return contraste(lrepos, ENCRE_CLAIR_L) > contraste(lrepos, 0.02)
       ? ENCRE_CLAIR_L : 0.02;
}

/* CONSTRUIT UNE PALETTE À PARTIR D'UNE COULEUR, et tout ce qui en découle.
   Quelques centaines de dichotomies, une fois par couleur, hors du chemin
   d'animation — jamais depuis une image. Le résultat est un objet qu'on garde :
   c'est lui qui circule ensuite, et plus aucune globale ne décide de la couleur.

   L'ENCRE SUIT LA CLARTÉ, ET C'EST CE QUI FAIT LE JOUR ET LA NUIT. On ne choisit
   pas « noir » ou « blanc » à la main : `encrePour` cherche le ton le plus proche
   du pigment d'origine qui tienne 4,5 : 1 sur la face de devant, et bascule sur
   l'encre claire quand aucun noir n'y arrive — c'est-à-dire précisément quand le
   dé est sombre. Un dé clair reçoit donc un chiffre noir et un dé sombre un
   chiffre blanc, sans qu'aucune ligne ne le décide : cela tombe du contraste.
   Le contrôle S le vérifie sur les douze. */
function construirePalette(hex) {
  var lch = oklchDeHex(hex), p = { hex: hex };

  /* CE QU'ON CHOISIT, C'EST LA FACE DE DEVANT, telle qu'elle se présente à
     l'arrêt. La pastille du sélecteur porte donc exactement la couleur qu'on
     verra, sans décalage à calculer — c'est la simplification que la lumière au
     lecteur apporte : la face de devant reçoit l'éclairement maximal, sa clarté
     EST `L_MAX`.
     Le reste de la gamme descend sous elle. Sur un dé très sombre, elle bute sur
     le plancher et se resserre : le dé est alors aussi sombre que l'étagement le
     permet, et le contrôle L mesure ce qu'il en reste. */
  p.L_MAX = borne(lch[0], 0.30, 0.995);
  p.L_MIN = Math.max(0.05, p.L_MAX - BANDE);

  p.TEINTE = lch[2];
  /* LA SATURATION DE LA FACE LUE, ET RIEN NE LA BRIDE QU'ELLE-MÊME.
     Le plafond de 0,20 est tombé avec la saturation commune : il n'existait que
     pour empêcher les faces sombres de déborder, ce dont elles se chargent
     maintenant seules. Ce qui reste est la borne du gamut à CETTE clarté-ci. */
  p.CHROMA = chromaA(p.TEINTE, p.L_MAX, lch[1]);

  p.ENCRE_H = (p.TEINTE + 180) % 360;   /* un soupçon de complémentaire : l'encre
                                           ne doit pas lire comme une tache de la
                                           même matière que la face */
  /* LA CLARTÉ DE LA FACE DU RÉSULTAT : celle qui se présente droit devant à
     l'arrêt. C'est sur elle que se décide l'encre — voir le pavé de
     `encrePour`. */
  p.ENCRE_L = encrePour(p.L_MAX);   /* la face de devant, la seule qu'on lise */
  p.ENCRE_C = chromaTenable(p.ENCRE_H, p.ENCRE_L, p.ENCRE_L, 0.020);
  p.ENCRE_CSS = oklch(p.ENCRE_L, p.ENCRE_C, p.ENCRE_H);

  construireTons(p);
  return p;
}

/* LES DOUZE COULEURS — six types de dés, deux modes.

   CHAQUE TYPE A LA SIENNE, et c'est ce qui permet de lire un jet mêlé d'un coup
   d'œil : la forme dit déjà le dé, la couleur le redit, et les deux ensemble se
   lisent plus vite que l'une des deux. Le d20 reprend le rouge du d20 du logo
   Roll20 — pas la couleur brute, un simili qui en garde l'identité une fois
   ramené dans la gamme de clarté que l'ombrage exige.

   DEUX VERSIONS PAR DÉ, ET LA MÊME TEINTE DANS LES DEUX. Le jour et la nuit
   changent la CLARTÉ, jamais l'identité : c'est le même vert, le même bleu, plus
   sombre. Ce qui bascule avec eux, c'est l'encre du chiffre — noire sur un dé
   clair, blanche sur un dé sombre — et elle bascule TOUTE SEULE : `encrePour`
   cherche le ton qui tient 4,5 : 1 et retombe sur l'encre claire quand aucun noir
   n'y arrive. Aucune ligne ne décide de la polarité, elle tombe du contraste.

   LES CLARTÉS SONT CONTRAINTES PAR L'OMBRAGE, et non choisies librement : la
   couleur donnée EST la face de devant, et toutes les autres s'étagent sous elle
   sur une bande de 0,415. Le jour, la face lue doit rester au-dessus de 0,56 pour
   que le noir y tienne ses 4,5 : 1 ; la nuit, sous 0,568 pour que le blanc les
   tienne. Les deux fenêtres se touchent presque, et c'est ce qui rend la bascule
   nette : il n'existe pas de clarté où les deux encres se vaudraient.

   CINQ TEINTES VIENNENT DU LANCEUR DE DÉS DE GOOGLE, qui est la référence
   demandée : vert, cyan, orange, rose, rouge. On ne copie pas ses hexadécimaux —
   son fond est sombre, le nôtre change — mais ses TEINTES, qui sont l'identité
   d'une couleur.

   LE d20, LUI, N'EST PAS UNE TEINTE MAIS UNE COULEUR : #702C91, exactement celle
   du dé du logo Roll20 — l'aplat de leur variante sombre, et un jeton nommé de
   leur système de design (--color-secondary-base). Elle est reprise TELLE QUELLE
   pour la nuit : teinte, saturation, clarté, au bit près.

   POUR LE JOUR, ELLE NE PEUT PAS L'ÊTRE, et le calcul dit pourquoi. Sa clarté
   vaut 0,438 ; l'encre la plus noire que la page accepte est 0,02, et elle ne
   tient 4,5 : 1 qu'à partir de 0,5594. Sous ce seuil, aucun chiffre noir n'est
   lisible : le dé de jour porterait un chiffre blanc, seul de sa rangée.

   ON L'ÉCLAIRCIT DONC DU STRICT NÉCESSAIRE, ET DE RIEN D'AUTRE. La teinte reste
   312,51°, la saturation reste 0,1642 — les deux du logo, inchangées — et seule
   la clarté monte, jusqu'à 0,600. Pourquoi 0,600 et pas 0,5665, qui suffirait :
   à 0,5665 le contraste tombe pile sur 4,50 : 1 et l'encre retenue est un faux
   noir à 0,11, choisi pour racler le seuil ; à 0,600 c'est le vrai noir de
   pigment, 0,20, celui de tous les autres dés, et il donne 4,6 : 1. Un seuil
   qu'on frôle n'est pas tenu, il est frôlé.

   CE QUE CELA COÛTE, MESURÉ : 0,162 de distance OKLab au logo. C'est le même
   violet, plus clair — la teinte ne bouge que de 0,15°, la saturation de 0,0009.
   Et le dé se détache alors de sa carte à 3,9 : 1 le jour, contre 1,96 : 1 que
   donnait la couleur exacte sur la carte de NUIT — le défaut que l'éclaircissement
   ne corrige pas, puisque la nuit garde la couleur exacte, comme demandé.

   ELLES SONT PRISES À LA POINTE DU GAMUT, c'est-à-dire aussi vives que sRVB le
   permet à leur clarté. Cela n'a été possible qu'en changeant le modèle : la
   saturation suivait toute la gamme et se trouvait donc plafonnée par la face la
   plus SOMBRE, où le gamut se referme en pointe. Six couleurs choisies vives
   ressortaient en pastel — et c'était le modèle, pas le choix. Voir `chromaA`.

   ET LES CLARTÉS SONT ÉTAGÉES D'UN DÉ À L'AUTRE, ce qui n'est pas décoratif. Six
   TEINTES ne restent pas séparables sous protanopie ET deutéranopie : le vert et
   le cuivre s'effondrent l'un sur l'autre, le bleu et le violet aussi. La clarté,
   elle, survit aux deux — c'est le seul axe qui ne dépende d'aucun cône. Les
   valeurs sortent donc d'une recherche qui maximise la plus petite distance entre
   deux dés, sur les trois visions et les deux modes à la fois
   (`owd-d6/banc/couleurs.py`). Elle plafonne à 0,045 : six catégories, c'est
   beaucoup pour ce qui reste de gamme à un daltonien. On l'accepte parce que la
   couleur n'est pas le seul indice — la FORME dit déjà quel dé c'est, et
   l'étiquette le redit en toutes lettres. Un indice redondant a le droit d'être
   faible ; il n'aurait pas le droit d'être seul.

   MESURÉ SUR LES DOUZE : la saturation de la face lue va de 0,125 à 0,243 — le
   sable d'avant plafonnait à 0,030 —, le chiffre tient ses 4,5 : 1 partout, et la
   teinte ne dérive jamais de plus de 0,3° entre les deux modes : c'est bien le
   même dé, plus sombre. La plus petite distance entre deux dés vaut 0,066 sous
   daltonisme, contre 0,045 avec la palette terne. */
var COULEURS_DES = {
  d4:  { jour: "#00B24A", nuit: "#007E32" },   /* vert */
  d6:  { jour: "#00BCD0", nuit: "#007784" },   /* cyan */
  d8:  { jour: "#FB7800", nuit: "#B35400" },   /* orange */
  d10: { jour: "#FF52A8", nuit: "#9E005E" },   /* rose */
  d12: { jour: "#ED0002", nuit: "#9D0001" },   /* rouge */
  d20: { jour: "#A15EC5", nuit: "#702C91" }    /* le violet du logo Roll20 : exact la nuit,
                                                  éclairci le jour du strict nécessaire */
};

/* LES DOUZE PALETTES, ET POURQUOI ELLES SE CONSTRUISENT À LA DEMANDE.
   Six types de dés, deux modes : douze tables de tons, chacune quelques centaines
   de dichotomies. Les payer toutes à l'ouverture serait les payer surtout pour
   les modes qu'on ne regardera pas. On les garde donc en cache, et chacune naît
   au premier dé qui la demande. */
var PALETTES = {};

function paletteDe(nomSolide, nuit) {
  var cle = nomSolide + (nuit ? "-nuit" : "-jour");
  if (!PALETTES[cle]) {
    var t = COULEURS_DES[nomSolide] || COULEURS_DES.d6;
    PALETTES[cle] = construirePalette(nuit ? t.nuit : t.jour);
  }
  return PALETTES[cle];
}

/* POSE UNE PALETTE SUR UN DÉ. Le cache de l'éclairage porte des indices de
   l'ANCIENNE table : il faut l'oublier, sinon les faces gardent leurs couleurs
   jusqu'au prochain changement de cran. Et l'encre est posée sur la SCÈNE, pas
   sur un plateau commun : chaque dé a la sienne. */
function poserPalette(de, pal) {
  de.palette = pal;
  de.dernierTon = [];
  de.scene.style.setProperty("--encre-de", pal.ENCRE_CSS);
}

/* Une seule écriture, sur le plateau : les trois dés en héritent. */
/* LA TABLE DES TEINTES EST BÂTIE SUR LES MARCHES, ET NON ÉCHANTILLONNÉE.
   Convertir une clarté en couleur passe par oklch, donc par trois `Math.pow` et
   deux fonctions trigonométriques — dix-huit `pow` par image pour six faces. La
   clarté vivant dans un intervalle fermé, on précalcule.

   MAIS PAS À PAS RÉGULIER, et c'est tout le sujet. La sortie est un octet par
   canal : il n'existe, sur [L_MIN, L_MAX], que quelques centaines de couleurs
   possibles. Un pas régulier ne retombe pas dessus — l'octet varie de 316 pour
   une unité de clarté, si bien qu'une table de 256 crans donnait une couleur
   fausse d'un 255e dans 32 % des cas. Mesuré. Doubler la finesse n'y suffit
   pas : à 4 096 crans il reste 2,3 % d'erreurs, parce qu'aucun pas régulier ne
   tombe juste sur des marches irrégulières.

   Comme les trois canaux sont MONOTONES en clarté, on n'échantillonne pas : pour
   chaque octet atteignable de chaque canal, une dichotomie donne la clarté
   EXACTE où il bascule. La table est alors juste par construction, et non par
   finesse — la couleur rendue est, au caractère près, celle que le calcul par
   image écrivait. Coût : une fois, au chargement.

   L'indice sert AUSSI de détecteur de changement : deux clartés qui donnent la
   même couleur tombent sur le même indice, et n'écrivent donc rien. */
var TON_CELLULES = 512;

/* La table vit dans la PALETTE : `pal.TONS`, `pal.TON_SEUILS`, `pal.TON_INDEX`,
   `pal.TON_ECHELLE`. Douze palettes, douze tables, aucune qui se marche dessus. */
function construireTons(pal) {
  var o = [0, 0, 0], seuils = [], i, j, b, bas, haut, lo, hi, mid, p, L;
  var TONS = [], TON_SEUILS = [];
  var TEINTE = pal.TEINTE, CHROMA = pal.CHROMA;
  var L_MIN = pal.L_MIN, L_MAX = pal.L_MAX;
  var ha = TEINTE * DEG, cosH = Math.cos(ha), sinH = Math.sin(ha);

  /* LA SATURATION DE CHAQUE CLARTÉ, tabulée puis interpolée. La calculer par
     dichotomie à chaque appel coûterait vingt-quatre tours de boucle DANS la
     dichotomie qui cherche les seuils d'octet, soit quelques centaines de
     milliers d'évaluations par palette. Le bord du gamut est lisse en clarté :
     soixante-cinq points et une droite entre eux ne s'en écartent pas d'un
     millième, et la table des tons reste EXACTE — elle est bâtie sur cette
     fonction-ci, quelle qu'elle soit, pas sur une autre. */
  var NC = 64, tabC = [], iC;
  for (iC = 0; iC <= NC; iC++) {
    tabC.push(chromaA(TEINTE, L_MIN + (L_MAX - L_MIN) * iC / NC, CHROMA));
  }
  function chromaDe(L) {
    var x = (L - L_MIN) / (L_MAX - L_MIN) * NC;
    if (x <= 0) return tabC[0];
    if (x >= NC) return tabC[NC];
    var j0 = x | 0;
    return tabC[j0] + (tabC[j0 + 1] - tabC[j0]) * (x - j0);
  }

  function canaux(L, out) {
    var c = chromaDe(L), ca = c * cosH, cb = c * sinH;
    var l_ = L + 0.3963377774 * ca + 0.2158037573 * cb;
    var m_ = L - 0.1055613458 * ca - 0.0638541728 * cb;
    var s_ = L - 0.0894841775 * ca - 1.2914855480 * cb;
    var l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
    out[0] =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    out[1] = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    out[2] = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  }
  function octet(v) { return Math.round(borne(versSrgb(v), 0, 1) * 255); }

  for (j = 0; j < 3; j++) {
    canaux(L_MIN, o); bas = octet(o[j]);
    canaux(L_MAX, o); haut = octet(o[j]);
    for (b = bas + 1; b <= haut; b++) {
      lo = L_MIN; hi = L_MAX;
      for (i = 0; i < 64; i++) {
        mid = (lo + hi) / 2;
        if (mid === lo || mid === hi) break;
        canaux(mid, o);
        if (octet(o[j]) >= b) hi = mid; else lo = mid;
      }
      seuils.push(hi);
    }
  }
  seuils.sort(function (a, b) { return a - b; });

  TON_SEUILS = [L_MIN];
  for (i = 0; i < seuils.length; i++) TON_SEUILS.push(seuils[i]);
  /* La MÊME fonction que partout ailleurs : les chaînes sont, au caractère près,
     celles que le calcul par image écrivait. */
  for (i = 0; i < TON_SEUILS.length; i++) {
    TONS.push(oklch(TON_SEUILS[i], chromaDe(TON_SEUILS[i]), TEINTE));
  }

  var TON_ECHELLE = (TON_CELLULES - 1) / (L_MAX - L_MIN);
  var TON_INDEX = new Int16Array(TON_CELLULES);
  p = 0;
  for (i = 0; i < TON_CELLULES; i++) {
    L = L_MIN + i / TON_ECHELLE;
    while (p + 1 < TON_SEUILS.length && L >= TON_SEUILS[p + 1]) p++;
    TON_INDEX[i] = p;
  }
  pal.TONS = TONS;
  pal.TON_SEUILS = TON_SEUILS;
  pal.TON_INDEX = TON_INDEX;
  pal.TON_ECHELLE = TON_ECHELLE;
}

/* Une cellule de la grille, puis au plus quelques pas de redressement. */
function tonIndex(pal, L) {
  var S = pal.TON_SEUILS;
  var c = (L - pal.L_MIN) * pal.TON_ECHELLE;
  var p = pal.TON_INDEX[c <= 0 ? 0 : (c >= TON_CELLULES - 1 ? TON_CELLULES - 1 : c | 0)];
  while (p > 0 && L < S[p]) p--;
  while (p + 1 < S.length && L >= S[p + 1]) p++;
  return p;
}

/* CE QUI A ÉTÉ ÉCRIT LA DERNIÈRE FOIS, par face. C'est le cœur de
   l'optimisation de l'éclairage, et le raisonnement tient en une phrase : une
   écriture de style ne coûte que si elle change quelque chose, et la plupart
   n'en changent aucune. La clarté d'une face varie continûment mais elle
   traverse rarement un cran ; le spéculaire de même ; la position de la flaque
   au demi-pour-cent près, de même. Mesuré : 1 083 µs par image en écrivant
   toujours, 73 µs en n'écrivant que sur changement de cran.
   Les trois dés partagent la même orientation, donc le même éclairage : on
   décide UNE fois par face, et on applique aux trois. */

/* Le cache des teintes est PAR DÉ : six solides n'ont ni le même nombre de
   faces ni les mêmes normales, donc jamais les mêmes clartés. */
function cacheTons(de) {
  if (de.dernierTon.length !== de.solide.n) {
    de.dernierTon = [];
    for (var i = 0; i < de.solide.n; i++) de.dernierTon.push(-1);
  }
  return de.dernierTon;
}

/* L'ÉCLAIRAGE SUIT CHAQUE IMAGE, ET IL N'Y A PLUS DE CADENCE À RÉGLER.

   IL Y EN A EU UNE, et elle a fini par coûter très exactement ce qu'elle
   prétendait épargner. Le principe semblait sain : la géométrie est ce qu'on
   regarde, l'ombrage n'est qu'un second ordre, donc quand la machine peine on
   n'éclaire qu'une image sur deux ou sur trois. Un diviseur montait à 3 quand
   les images s'allongeaient, redescendait quand elles raccourcissaient.

   ELLE A CASSÉ DEUX FOIS, DE DEUX FAÇONS DIFFÉRENTES, et c'est cela qui tranche.
   La première fois, ses seuils étaient écrits en millisecondes absolues : le
   diviseur montait à 3 dès le premier lancer sur tout écran de moins de 76 Hz et
   n'en redescendait jamais, si bien qu'un changement de couleur à l'arrêt ne
   repeignait qu'une face sur trois. La seconde fois, les seuils étaient devenus
   des multiples d'une période d'écran MESURÉE comme le plus court intervalle
   observé — un minimum à cliquet, qu'une seule image courte suffisait à faire
   tomber pour de bon, après quoi le diviseur se rebloquait en haut.

   ET SON EFFET N'ÉTAIT PAS CELUI QU'ON CROYAIT. Le compteur était UNIQUE pour
   les six dés, alors qu'`eclairer` est appelée une fois par dé et par image. Six
   appels, un modulo 3 : le motif retombait identique à chaque image, si bien que
   deux dés étaient éclairés à TOUTES les images et que les quatre autres ne
   l'étaient JAMAIS. Ce n'était pas un ombrage en retard d'une image, c'était un
   ombrage gelé sur les deux tiers du plateau pendant tout le lancer.

   MESURÉ, six dés, quatre-vingt-dix images d'un même lancer :

       diviseur 1    144 µs par image pour les six    0 face périmée sur 2 669
       diviseur 3    133 µs par image pour les six    1 304 périmées sur 2 666

   Le diviseur épargnait 11 µs par image — sept centièmes de pour cent d'une
   image de 16,7 ms — au prix de 48,9 % des faces visibles peintes faux. On le
   retire. Ce qui rend l'éclairage abordable n'a jamais été lui, c'est le cache
   par cran ci-dessus : 1 083 µs par image en écrivant toujours, 144 en n'écrivant
   que sur changement de cran. Le contrôle P vérifie désormais, image par image,
   qu'aucune face ne reste périmée. */

/* `tout` : l'éclairage est COMPLET et INCONDITIONNEL.
   Deux gardes de l'éclairage n'ont de sens que dans la boucle d'animation, et
   étaient fausses partout ailleurs :

     — le DIVISEUR de cadence saute deux images sur trois quand la machine peine.
       Hors animation, aucune image ne vient rattraper celle qu'il escamote : un
       changement de couleur fait à l'arrêt ne repeignait donc pas le dé, et
       l'encre, elle, s'écrivant sans garde, on pouvait obtenir un chiffre blanc
       sur une face restée blanche — 1,05 : 1 de contraste, là où le contrôle
       annonce 4,5 garantis ;

     — les faces CACHÉES sont sautées, ce qui est juste en animation puisqu'elles
       reviendront peintes avant d'être vues. À l'arrêt, cinq des six faces sont
       cachées : après un changement de couleur elles gardaient les teintes de
       repli du CSS et s'ouvraient sur de l'ivoire pendant une à deux images au
       lancer suivant.

   Tout appel hors de la boucle passe donc `tout` à vrai. */
function eclairer(de, R, tout) {
  var i, f, nz, L, q, sol = de.solide, cache = cacheTons(de);
  var pal = de.palette, R2 = R[2];

  for (i = 0; i < sol.n; i++) {
    f = sol.faces[i];
    /* LA LUMIÈRE EST AU LECTEUR : l'éclairement se lit directement sur la
       composante z de la normale tournée, et il n'y a rien d'autre à calculer.
       Une seule ligne de la matrice y suffit, et la face n'a qu'une couleur —
       c'est tout le modèle. */
    nz = scal(R2, f.n);

    /* LA FACE EST-ELLE SEULEMENT VISIBLE ? Trois des six sont tournées vers
       l'arrière à tout instant, et `backface-visibility: hidden` les efface :
       les peindre est du travail intégralement perdu, et c'est la moitié du
       coût de l'éclairage. On ne met pas à jour `dernier…` pour elles — la
       comparaison au moment où elles reviendront se fera donc avec la dernière
       valeur RÉELLEMENT écrite, et rien ne peut rester périmé. */
    if (nz <= 0 && !tout) continue;

    L = clarteDe(pal, nz);

    q = tonIndex(pal, L);
    if (q !== cache[i]) {
      cache[i] = q;
      de.faces[i].style.setProperty("--ton", pal.TONS[q]);
    }


  }
}

/* ==========================================================================
   7. LA POSE D'ARRIVÉE
   ==========================================================================
   Le dé ne se pose JAMAIS strictement de face. Deux raisons :

   — un cube vu strictement de face est un carré : c'est la silhouette d'un
     polygone plat, pas le volume d'un solide ;
   — à un multiple exact de 90°, les faces latérales sont vues par la tranche,
     d'épaisseur nulle : elles clignotent, et cela ressemble à s'y méprendre à
     une jointure qui s'ouvre.

   On applique donc une inclinaison de repos EN AMONT de la pose :
   `qRepos ⊗ qRoulis ⊗ qVersAvant(valeur)`. Comme `qRepos` agit dans le repère
   de la caméra, elle décide à elle seule de la silhouette du dé posé.

   ET ELLE EST TIRÉE, ELLE AUSSI. Une inclinaison de repos CONSTANTE est le
   piège le plus discret de toute la page : le roulis `k × 90°` est une
   symétrie du cube, il ne change donc rien à la silhouette, et une `qRepos`
   figée fait que le dé se pose à chaque fois exactement dans la même attitude
   — même contour, mêmes trois faces visibles, mêmes clartés au millième. Seuls
   les chiffres changeraient. Le spectateur ne le voit pas sur un lancer ; il
   le voit sur dix, et c'est précisément le défaut que toute la variance du vol
   cherche à éviter, simplement déplacé du vol vers l'arrivée. Un vrai dé ne se
   pose jamais deux fois pareil.

   La plage est étroite à dessein : elle doit rester dans le domaine où les
   trois faces visibles s'étagent franchement. C'est le contrôle E qui la
   balaie et qui garantit le pire cas, pas ce commentaire.

   Le roulis `k × 90°` reste un cadeau : un cube a 24 orientations distinctes,
   et quatre par face avant. Le tirer au hasard fait apparaître le chiffre
   tourné d'un quart de tour — ce que fait un vrai dé, et c'est précisément à
   cela que sert la barre du 6.
   ========================================================================== */

/* Bornes de l'inclinaison de repos, en degrés : basculement vers l'arrière
   autour de x (y étant vers le bas, l'angle est négatif), puis rotation autour
   de la verticale. Le contrôle E les relit et balaie tout le rectangle. */
var REPOS_RX = [-21, -12];
var REPOS_RY = [ 14,  28];

function reposDe(rx, ry) {
  return qProduit(qAxe([1, 0, 0], rx * DEG), qAxe([0, 1, 0], ry * DEG));
}

/* Il n'y a plus de tirage de pose au REPOS : le dé s'arrête toujours face au
   lecteur, sur demande. Mais le rectangle ci-dessus n'est pas mort pour autant,
   il a changé d'emploi — c'est maintenant celui où se tire l'INCLINAISON DU
   REGARD pendant le mouvement, et `controlerClartes` continue de le balayer au
   demi-degré. Le tirage a donc simplement été déplacé de l'arrivée, où il
   contredisait l'exigence d'une face droite, vers le mouvement, où il ne
   contredit rien. Ne pas supprimer ces bornes. */

/* LE DÉ SE POSE SUR UNE FACE, ET C'EST LA PREMIÈRE CONDITION.
   On amenait jusqu'ici la face du résultat DROIT DEVANT, sans rien demander
   d'autre. Pour un cube cela suffit : mettre une face devant en met une autre
   au sol, et le dé est assis. Pour aucun des cinq autres. Un tétraèdre face en
   avant repose sur une ARÊTE et se lit comme un triangle plat, sans volume ; un
   octaèdre sur un SOMMET ; le trapézoèdre sur une arête, une pointe en haut et
   une en bas — une pierre taillée en équilibre, pas un dé posé. Le solide était
   juste et la pose fausse, ce qui se voit exactement pareil.

   ON DEMANDE DONC TROIS CHOSES, DANS CET ORDRE :

     1. UNE FACE À PLAT SUR LE SOL. Les six solides sont isoédriques — toutes
        leurs faces sont à la même distance du centre — donc en poser une à
        l'horizontale pose le dé exactement sur son apothème, et la levée au
        repos tombe à zéro pour les six.
     2. LA FACE DU RÉSULTAT AUSSI FRONTALE QUE LE SOLIDE LE PERMET. La face au
        sol étant choisie, il reste un tour libre autour de la verticale, et l'on
        s'en sert pour amener le résultat vers l'œil. Le meilleur cosinus vaut
        alors le sinus de l'angle entre les deux normales : il fait 1 quand elles
        sont perpendiculaires, ce qui arrive pour le cube — et AUSSI pour le d10,
        dont le dièdre équatorial vaut exactement 90°. Ces deux-là montrent donc
        leur résultat pile en face. Les quatre autres ne le peuvent pas : le
        tétraèdre et l'octaèdre plafonnent à 19,5° d'inclinaison, le dodécaèdre à
        26,6°. C'est un raccourci de 6 % sur la largeur du chiffre, et le dé est
        vu de très légèrement au-dessus — exactement ce qu'on voit d'un dé posé
        sur une table.
     3. LE CHIFFRE LE PLUS DROIT POSSIBLE. Plusieurs faces au sol donnent souvent
        la même frontalité ; on les départage sur l'inclinaison du chiffre.

   LA CONSTRUCTION EST DIRECTE, sans recherche d'angle. Soit f la face du
   résultat, g celle qu'on pose au sol, et c = n_f · n_g. On bâtit dans le repère
   du solide le trièdre qui deviendra celui de l'écran :

        e₂ = n_g                              → part vers le bas de l'écran
        e₃ = (n_f − c·n_g) / √(1−c²)          → part vers l'œil
        e₁ = e₂ × e₃                          → part vers la droite

   et la rotation cherchée est la matrice dont ce sont les LIGNES. La frontalité
   obtenue vaut √(1−c²), et la face penche de c vers le bas de l'écran. */
function poserLesFaces(sol) {
  var f, i;
  for (f = 0; f < sol.n; f++) {
    var fa = sol.faces[f], nf = fa.n;

    /* UN REPÈRE QUELCONQUE DANS LE PLAN DE LA FACE, juste pour y calculer. */
    var a0 = Math.abs(nf[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    var a = unitaire(difference(a0, [nf[0] * scal(nf, a0), nf[1] * scal(nf, a0),
                                     nf[2] * scal(nf, a0)]));
    var b = vectoriel(nf, a);
    var P = fa.bruts.map(function (q) { return [scal(q, a), scal(q, b)]; });

    /* LES AXES DE SYMÉTRIE DE LA FACE. Ils passent tous par le centroïde ; les
       seules directions possibles sont celles des sommets et des milieux
       d'arêtes. On essaie les deux familles et on garde celles qui renvoient le
       polygone sur lui-même. */
    var axes = [], k, m;
    var cands = [];
    for (k = 0; k < P.length; k++) {
      cands.push(P[k]);
      m = P[(k + 1) % P.length];
      cands.push([(P[k][0] + m[0]) / 2, (P[k][1] + m[1]) / 2]);
    }
    for (k = 0; k < cands.length; k++) {
      var l = Math.sqrt(cands[k][0] * cands[k][0] + cands[k][1] * cands[k][1]);
      if (l < 1e-9) continue;
      var w = [cands[k][0] / l, cands[k][1] / l], bon = true, p2, d, j2, q2, e;
      for (p2 = 0; p2 < P.length && bon; p2++) {
        d = P[p2][0] * w[0] + P[p2][1] * w[1];
        var r = [2 * d * w[0] - P[p2][0], 2 * d * w[1] - P[p2][1]];
        e = 9;
        for (j2 = 0; j2 < P.length; j2++) {
          q2 = Math.sqrt(Math.pow(r[0] - P[j2][0], 2) + Math.pow(r[1] - P[j2][1], 2));
          if (q2 < e) e = q2;
        }
        if (e > 1e-7) bon = false;
      }
      if (bon) axes.push(w);
    }

    /* LE BAS DE LA FACE : celui de ses axes de symétrie sur lequel elle
       DESCEND LE MOINS.

       C'est ce qui met à l'écran un carré posé plutôt qu'un losange, et un
       triangle pointe en haut plutôt qu'en bas. Un axe qui vise le milieu d'une
       arête pose cette arête à plat en bas — c'est le plus court chemin du
       centroïde au bord, donc l'extension minimale — tandis qu'un axe qui vise
       un sommet met une pointe en bas. La règle choisit donc d'elle-même
       l'arête quand il y en a une, et le bout le moins saillant quand les deux
       extrémités sont des sommets, ce qui est le cas du cerf-volant du d10.
       Elle ne dit rien de plus que « le dé est posé le plus à plat possible » —
       ce qui est justement ce qu'on lit d'un dé, même quand rien ne le porte. */
    var meilleur = 1e9, vBas = axes.length ? axes[0] : [0, 1];
    for (k = 0; k < axes.length; k++) {
      var ext = -1e9;
      for (m = 0; m < P.length; m++) {
        ext = Math.max(ext, P[m][0] * axes[k][0] + P[m][1] * axes[k][1]);
      }
      if (ext < meilleur - 1e-9) { meilleur = ext; vBas = axes[k]; }
    }
    fa.v = [a[0] * vBas[0] + b[0] * vBas[1], a[1] * vBas[0] + b[1] * vBas[1],
            a[2] * vBas[0] + b[2] * vBas[1]];
    fa.u = vectoriel(fa.v, nf);
    fa.axes = axes.length;

    /* LA POSE : le trièdre de la face DEVIENT celui de l'écran. u part vers la
       droite, v vers le bas, n vers l'œil. La face du résultat arrive donc
       exactement en face, son chiffre exactement droit, et le reste du solide se
       range autour — de part et d'autre de la verticale quand la face a un axe
       de symétrie, ce qui est le cas des six. */
    fa.qPose = qDeMatrice([fa.u, fa.v, nf]);
  }

  /* LA LEVÉE SE NORMALISE SUR LE REPOS. L'ombre a besoin d'un zéro — dé posé,
     ombre serrée et dense — et d'un un — dé sur une pointe, ombre large et pâle.
     Le zéro ne peut pas être l'apothème : rien n'oblige plus une face à être au
     sol, et le point d'appui au repos dépend du solide. On prend donc pour zéro
     l'appui de la pose de repos elle-même, la même pour toutes les faces d'un
     solide isoédrique. */
  var appuiRepos = appuiDe(sol, sol.faces[0].qPose);
  sol.leveeRepos = appuiRepos - sol.apotheme;
  sol.leveeMax = sol.rayon - appuiRepos;
  if (sol.leveeMax < 1e-9) sol.leveeMax = 1;   /* jamais de division par zéro */
}

/* Le soulèvement du centre, rapporté à sa plage : 0 posé, 1 sur une pointe. */
function souleve(sol, dy) {
  return borne01((-dy - sol.leveeRepos) / sol.leveeMax);
}

function poseFinale(sol, valeur) {
  return sol.faces[valeur - 1].qPose;
}

/* ==========================================================================
   8. LA MARCHE DU CUBE
   ==========================================================================

   POURQUOI PAS D'ANIMATION CSS NI DE `Element.animate`
   ----------------------------------------------------
   Parce que le navigateur n'interpole des ANGLES que si les deux listes de
   fonctions de transformation sont identiques d'une image-clé à l'autre. Dès
   qu'elles diffèrent, il décompose les matrices, passe par des quaternions et
   fait une interpolation sphérique, qui prend le plus court chemin : une
   bascule de 90° suivie d'une autre devient un unique demi-tour, et le
   roulement disparaît. Les navigateurs divergent en plus sur le signe du
   quaternion dans les cas dégénérés.
   Ici, l'orientation ET la position sont calculées image par image : le piège
   n'existe pas. En prime, on obtient gratuitement le ralenti, la rotation
   d'inspection sans fin et l'éclairage recalculé — qui a de toute façon besoin
   de la matrice à chaque image.

   CE QU'EST UN DÉ QUI ROULE, ET CE QUE CE N'EST PAS
   -------------------------------------------------
   Un cube qui roule sur une table ne tourne PAS autour de son centre : il
   bascule par-dessus l'ARÊTE QUI TOUCHE LE SOL, d'un quart de tour à la fois.
   Trois conséquences, et ce sont elles — pas la vitesse, pas le nombre de
   tours — qui font que l'œil y croit.

   1. LE PIVOT EST L'ARÊTE, PAS LE CENTRE. Pendant la bascule, le centre décrit
      un arc de rayon S·√2/2 autour de cette arête : il MONTE au passage du
      coin, jusqu'à S·√2/2 au 45°, puis RETOMBE à S/2. Soit un soulèvement de
      S·(√2−1)/2 ≈ 0,207 arête. C'est ce soulèvement, et lui seul, qui sépare
      « rouler » de « tourner sur place ». Il ne se rabote JAMAIS, quelle que
      soit la place disponible — tout le reste peut céder, pas lui.
   2. L'AXE EST L'ARÊTE DE CONTACT, c'est-à-dire le produit vectoriel de la
      direction de marche par la verticale DESCENDANTE. Le repère CSS a son y
      vers le bas : la verticale descendante est (0, 1, 0), et rouler vers la
      droite tourne donc autour de +z.
   3. LE TEMPS N'EST PAS SYMÉTRIQUE. Le cube doit être POUSSÉ jusqu'au point
      d'équilibre — 45°, l'instant où son centre de gravité passe au-dessus de
      l'arête — et il y ralentit ; passé ce point il TOMBE sur la face suivante,
      et le contact est franc. Une bascule à vitesse constante, ou en
      `ease-in-out` symétrique, se voit du premier coup d'œil. La loi horaire
      n'est donc pas une courbe de Bézier choisie à la main : c'est celle d'un
      pendule, tirée de la conservation de l'énergie, et elle s'intègre plus bas.

   CE PAVÉ DÉCRIT LE ROULEMENT, QUI N'EST PLUS LE MOUVEMENT PAR DÉFAUT. La page
   s'ouvre sur la culbute par impulsions, et le roulement attend derrière son
   interrupteur. Ce qui suit reste vrai de LUI, et de lui seul.
   Ce qui a bien été retiré, et qu'il ne faut pas ramener ici : le saut, les
   rebonds de balle, la dérive au fil des lancers. Un dé qui roule ne quitte pas
   la table.

   CE QU'ON VOIT, ET QUI SURPREND D'ABORD. Une bascule LATÉRALE tourne autour de
   l'axe de vue : la face avant reste la face avant, et le carré tourne comme
   une roue. Ce n'est pas un défaut, c'est exactement ce qu'on voit d'un dé qui
   roule vers la droite quand l'œil est à hauteur de table — et c'est le prix de
   la face d'arrivée parfaitement de face, qui a été demandée. Le volume revient
   à chaque bascule EN PROFONDEUR, où les faces se retournent et où la
   perspective fait grossir ou maigrir le solide. Les circuits sont donc choisis,
   parmi les plus courts, pour en contenir autant que de bascules latérales.

   CE QUI REND UN LANCER CRÉDIBLE
   -------------------------------
   Le spectateur ne détecte jamais sur UN lancer qu'une valeur a été tirée
   d'avance. Il le détecte sur dix, parce que la chorégraphie se répète et que
   seule la fin change. Ce qui cache le procédé n'est donc pas la finesse d'un
   lancer, c'est la VARIANCE entre deux lancers : le circuit tiré parmi ceux que
   la table propose, le tempo, l'hésitation de chaque bascule, l'assise finale.
   ========================================================================== */

var MONTEE   = courbe(0.12, 0.62, 0.30, 1.00);  /* enveloppe de l'écrasement */
var ATTERRIR = courbe(0.20, 0.70, 0.30, 1.00);  /* redressements et retours */

/* LA CULBUTE SE FAIT PAR IMPULSIONS, et c'est là toute la différence.
   Une impulsion unique, si aléatoires qu'en soient l'axe et la puissance, donne
   toujours le même GESTE : une accélération, puis une décélération, toujours
   autour du même axe. On la reconnaît au deuxième lancer. Ce qui rend un dé
   imprévisible, ce n'est pas la valeur du coup initial, c'est qu'il en reçoive
   PLUSIEURS, à des instants qu'on n'attend pas — chaque nouveau coup dévie
   l'axe, si bien que le mouvement change de nature en cours de route.

   Le modèle est celui d'une vitesse angulaire, pas d'une interpolation :

     — chaque coup DÉVIE l'axe de rotation et coûte un peu de vitesse. Il n'en
       donne JAMAIS. C'est le point sur lequel le modèle précédent était faux :
       il ajoutait vectoriellement une impulsion à la vitesse angulaire, si bien
       qu'un dé déjà lancé pouvait accélérer en plein vol. Rien ne fait cela —
       un dé qui rebondit sur une table repart de travers et plus lentement, il
       ne repart jamais plus vite. Le défaut ne se voit pas tout de suite et se
       ressent seulement comme « bizarre » : l'œil sait que l'énergie ne remonte
       pas toute seule.
       La déviation se fait autour d'un axe PERPENDICULAIRE à la rotation en
       cours, tiré au hasard dans ce plan : tourner un vecteur autour d'un axe
       qui lui est perpendiculaire l'incline de l'angle voulu et laisse sa
       longueur rigoureusement intacte. La longueur, c'est la vitesse — la règle
       est donc tenue par la géométrie et non par une vérification après coup.
       La perte de vitesse devient alors une grandeur séparée, qu'on règle pour
       elle-même au lieu de la subir comme un effet de bord de la somme ;
     — entre deux impulsions, la vitesse décroît selon (1 − t/T)^FROTTEMENT.
       L'exposant vaut UN, et ce n'est pas un réglage de goût : une vitesse qui
       décroît linéairement est exactement ce que produit un couple de
       frottement CONSTANT, c'est-à-dire le frottement sec d'un solide sur une
       table. C'est la loi d'un vrai dé.
       L'exposant valait deux, et c'était l'erreur : la fraction d'angle qui
       reste à parcourir après l'instant u vaut (1 − u)^(exposant+1), soit
       1,6 % du tour total dans le dernier quart du temps. Le dé arrivait donc
       à sa face au tiers du mouvement et attendait, ce qui se lit très
       exactement comme un arrêt net suivi d'un temps mort. À exposant un, ce
       dernier quart porte 6,25 % du parcours — quatre fois plus, une bonne
       soixantaine de degrés : on VOIT le dé ralentir sur sa face ;
     — l'angle parcouru sur chaque segment s'intègre en forme close, si bien que
       l'orientation à l'instant t reste une FONCTION de t, calculable
       directement. C'est indispensable : la relance en plein vol, l'auto-
       contrôle et le rendu d'une image quelconque le supposent tous. Une
       intégration pas à pas rendrait l'animation dépendante de la cadence
       d'affichage, donc différente d'une machine à l'autre.

   L'ARRIVÉE RESTE EXACTE, et par le même principe qu'avant : la couche de
   rotation doit finir sur l'identité. Les tours entiers y parvenaient par
   construction ; ici la culbute finit n'importe où, et on lui compose une
   CORRECTION égale à l'inverse de son point d'arrivée, étalée non pas sur le
   temps mais sur l'ANGLE DÉJÀ PARCOURU. La vitesse de correction est alors
   proportionnelle à la vitesse de la culbute : maximale quand le dé tourne
   vite, nulle quand il s'arrête. Elle ne produit donc jamais le rattrapage de
   fin de course qui trahit une animation fabriquée — et elle pèse peu, moins
   de 180° répartis sur deux à trois tours et demi. */
var REBONDS      = 10;            /* coups par lancer, le lancer compris */
var CULBUTE_MS   = [1050, 1500];  /* durée d'une culbute, avant tempo et vitesse */
var CULBUTE_TOURS = [1.6, 3.4];   /* tours parcourus en tout, correction comprise */
var FROTTEMENT   = 1;             /* exposant de la décroissance : 1 = frottement
                                     sec, vitesse linéaire, le dé ralentit
                                     jusqu'au bout. Monter cet exposant ramène le
                                     temps mort de fin ; le descendre sous 1 fait
                                     tomber la vitesse à zéro avec une pente
                                     infinie, c'est-à-dire un coup de frein. */

/* L'AMPLEUR DES REBONDS DÉCROÎT, REBOND APRÈS REBOND, et jamais l'inverse.
   Le RAPPORT d'un rebond à celui d'avant est tiré, la décroissance ne l'est
   pas : `déviation[k] = déviation[k−1] × rapport`, avec un rapport toujours
   inférieur à un. La variété reste entière, et l'ordre est garanti par
   construction plutôt que par un tirage qui « tombe bien » la plupart du temps.

   LES VALEURS ONT CHANGÉ AVEC LE NOMBRE DE REBONDS, et il fallait qu'elles
   changent. À dix rebonds, l'ancien réglage — une première déviation de 42 à
   72°, décroissant d'un facteur 0,42 à 0,78 — aurait donné un premier coup
   violent puis neuf coups invisibles : le dixième pesait moins d'un degré.
   Une déviation de départ trois fois plus faible et une décroissance trois fois
   plus lente répartissent au contraire l'inflexion sur les dix : le dernier
   rebond dévie encore du quart à la moitié du premier, et le dé change de plan
   tout du long au lieu d'une fois au début.
   La perte de vitesse suit le même raisonnement : dix pertes de 4 à 15 %
   auraient arrêté le dé avant la fin, le frottement s'ajoutant par-dessus. */
var DEVIATION         = [20, 32];     /* premier rebond, en degrés */
var DEVIATION_RAPPORT = [0.86, 0.96]; /* ce qu'un rebond garde du précédent */
var PERTE_CHOC        = [0.01, 0.05]; /* vitesse perdue à chaque rebond */

/* UN REBOND N'EST PAS INSTANTANÉ, et c'est ce qui manquait. Faire pivoter l'axe
   d'un coup, c'est une discontinuité de la vitesse angulaire : à trois ou quatre
   rebonds bien espacés on l'accepte comme un choc, à dix elle devient une
   saccade. La déviation s'étale donc sur une TRANSITION, adoucie aux deux bouts
   par un smoothstep — dérivée nulle à l'entrée comme à la sortie, donc aucune
   cassure visible — et la perte de vitesse s'étale avec elle.
   La durée de la transition est une FRACTION de l'intervalle jusqu'au rebond
   suivant, jamais un nombre de millisecondes : elle suit alors le curseur de
   vitesse toute seule, et deux transitions ne peuvent pas se chevaucher. */
var TRANSITION    = [0.45, 0.80];  /* part de l'intervalle que prend un rebond */
var SOUS_SEGMENTS = 120;           /* finesse d'échantillonnage de la culbute */

/* Ce que dure un lancer quand les DEUX mouvements sont éteints : le dé tourne
   simplement de sa face vers la suivante, sans culbute ni bascule. Il faut
   quand même une durée — sans quoi la face changerait d'une image à l'autre et
   personne ne verrait que le clic a été pris. */
var SANS_MOUVEMENT_MS = 420;

/* L'INCLINAISON DU REGARD, et pourquoi elle existe.
   Une bascule latérale tourne autour de l'axe du REGARD : caméra pile de face,
   les quatre faces latérales gardent une aire projetée identiquement nulle
   pendant toute la bascule, et le cube lit comme une carte qui pivote à plat.
   C'est une propriété géométrique, pas un défaut de rendu : la mesure est
   `r_xy = √(cos²θ·sin²ψ + sin²θ)`, exactement zéro quand les deux angles sont
   nuls, et c'est cette seule grandeur qui achète du volume.
   On incline donc le regard pendant le mouvement, et on le redresse à
   l'arrivée. L'inclinaison est tirée dans le MÊME rectangle que l'ancienne pose
   de repos : c'est un domaine que `controlerClartes` audite déjà au demi-degré,
   et le tirage restaure la variance qu'une inclinaison constante ôterait — dix
   lancers qui se ressemblent trait pour trait est le piège le plus discret de
   cette page.
   Les deux angles sont NÉCESSAIRES, et aucun ne peut valoir zéro : à lacet seul,
   le dessus et le dessous sont vus par la tranche, d'épaisseur nulle, et ils
   clignotent — ce qui ressemble à s'y méprendre à une jointure qui s'ouvre. À
   tangage seul, ce sont les deux faces de côté. */
var MONDE_ENTREE = 1;   /* bascules pendant lesquelles l'inclinaison s'installe */
var MONDE_SORTIE = 2;   /* bascules pendant lesquelles elle se résorbe */

/* L'enveloppe : un smoothstep aux deux bouts, compté en BASCULES et non en
   millisecondes — les bascules ne durent pas toutes le même temps, les
   dernières sont les plus longues, et le tempo est tiré à chaque lancer.
   Elle vaut EXACTEMENT zéro dès que l'avancement atteint 1, sans epsilon à
   tolérer : `borne01` rend 0, et 0 × 0 × 3 vaut 0. Une décroissance
   exponentielle serait disqualifiée d'office — jamais nulle, seulement petite,
   c'est-à-dire une face qui n'est jamais tout à fait droite.
   Sa dérivée est nulle aux deux extrémités : ni installation brusque, ni arrêt
   sec du redressement. Une rampe s'annulerait avec une pente non nulle et le
   redressement s'interromprait visiblement au dernier contact. */
function enveloppeMonde(avancement, n) {
  var e = n > 0 ? MONDE_ENTREE / n : 0.18;
  var f = n > 0 ? MONDE_SORTIE / n : 0.34;
  var a = borne01(avancement / e);
  var b = borne01((1 - avancement) / f);
  return (a * a * (3 - 2 * a)) * (b * b * (3 - 2 * b));
}

var IDENTITE = [1, 0, 0, 0];

/* Les quatre coups, et rien d'autre : un cube posé sur une table ne peut que
   basculer par-dessus l'une de ses quatre arêtes basses. */
var COUPS = {
  D: [ 1, 0,  0],   /* vers la droite */
  G: [-1, 0,  0],   /* vers la gauche */
  A: [ 0, 0,  1],   /* vers l'avant, c'est-à-dire vers l'œil */
  R: [ 0, 0, -1]    /* vers l'arrière */
};

/* La verticale DESCENDANTE. y est vers le bas dans le repère CSS : c'est bien
   (0, 1, 0). L'écrire (0, −1, 0) « parce que c'est le haut » retournerait les
   quatre axes d'un seul coup, et le dé roulerait à l'envers de sa marche —
   monté sur des roues qui tournent dans le mauvais sens. Le contrôle G
   l'attraperait, la table étant calculée dans ce repère-ci. */
var BAS = [0, 1, 0];

function axeDeCoup(c) { return unitaire(vectoriel(COUPS[c], BAS)); }

/* Soulèvement du centre au-dessus du sol, en fractions d'arête, compté
   POSITIVEMENT vers le haut. Le centre est à √2/2 du pivot et son angle au
   pivot part de −45° pour finir à +45° : la hauteur vaut √2/2·cos(φ − 45°),
   soit 1/2 aux deux bouts et √2/2 au passage du coin. */
var SOULEVEMENT = Math.SQRT2 / 2 - 0.5;   /* ≈ 0,20711 : le cube sur son ARÊTE */

/* LA PLUS HAUTE LEVÉE POSSIBLE : le cube sur son COIN, √3/2 − ½ ≈ 0,36603.
   C'est par elle que se normalise l'ombre, et non plus par `SOULEVEMENT`.
   Tant que seul le roulement levait le dé, la levée ne dépassait jamais celle de
   l'arête et le bornage à `SOULEVEMENT` ne rabotait rien : il était tangent, un
   filet. Depuis que la culbute lève aussi, il rabote 72 % des images du mode par
   défaut — mesuré — et l'ombre nette y tombe à une opacité EXACTEMENT nulle
   pendant que le dé continue de monter et descendre de 0,159 arête. L'ombre
   cessait donc de répondre au mouvement précisément là où elle devait le dire. */
/* La levée maximale est désormais une propriété de CHAQUE solide — `leveeMax`,
   posée par `construireSolide` : rayon moins apothème. Pour le cube elle vaut
   √3/2 − ½, la valeur qui était écrite ici. */

/* LE CUBE REPOSE SUR LA TABLE, QUELLE QUE SOIT SON ORIENTATION.
   C'est une seule formule, et elle remplace quatre rustines.

   Le sommet le plus bas d'un cube d'arête 1 tourné par R est à
   ½ (|R₁₀| + |R₁₁| + |R₁₂|) sous son centre — c'est le maximum, sur les huit
   sommets (±½, ±½, ±½), de leur ordonnée après rotation, et il se lit
   directement sur la deuxième LIGNE de la matrice. Pour que ce sommet touche le
   plan de la table, qui est à ½ sous le centre au repos, il faut donc remonter
   le centre de ½ − ½ (|R₁₀| + |R₁₁| + |R₁₂|).

   Trois vérifications qui valent démonstration :
     — à l'identité, la ligne vaut (0, 1, 0), la somme 1, le soulèvement 0 : le
       dé est posé à plat, comme il doit l'être ;
     — sur son ARÊTE, à 45°, la ligne vaut (0, √2/2, √2/2), la somme √2, le
       soulèvement √2/2 − ½ = 0,20711 — c'est EXACTEMENT `SOULEVEMENT`, la valeur
       que le pivot du roulement calculait par son arc. La formule générale
       reproduit donc le roulement au bit près, et ne le change en rien ;
     — sur son COIN, la ligne vaut (1,1,1)/√3, la somme √3, le soulèvement
       0,36603. C'est ce qui manquait : la culbute tournait le dé sur son coin
       sans le lever, et 0,366 arête — 58 px sur le grand dé — passaient sous la
       table.

   Ce que cela corrige, d'un coup : le coin qui franchissait le bord du plateau
   en rotation seule ; le solide incliné par le regard qui ressortait sous sa
   propre ombre ; l'oscillation d'assise qui s'enfonçait faute d'arête de
   contact ; et la relance en plein vol qui ne reprenait pas la hauteur — la
   hauteur n'étant plus un état mais une FONCTION de l'orientation, il n'y a
   plus rien à reprendre.

   On la calcule depuis le quaternion et non depuis la matrice : `evaluer` n'a
   pas besoin des huit autres coefficients, et `rendre` construit la matrice de
   toute façon. */
function hauteurAuSol(sol, q) {
  return sol.apotheme - appuiDe(sol, q);
}

function soulevement(phi) {
  return Math.SQRT2 / 2 * Math.cos(phi - Math.PI / 4) - 0.5;
}

/* Rotation d'un vecteur autour d'un axe UNITAIRE (Rodrigues). On s'en sert pour
   le centre, jamais pour l'orientation — celle-ci reste au quaternion. */
function tourner(axe, angle, v) {
  var c = Math.cos(angle), s = Math.sin(angle);
  var w = vectoriel(axe, v), d = scal(axe, v) * (1 - c);
  return [v[0] * c + w[0] * s + axe[0] * d,
          v[1] * c + w[1] * s + axe[1] * d,
          v[2] * c + w[2] * s + axe[2] * d];
}

/* `centreBascule` a été retirée : la hauteur du centre ne se calcule plus par
   l'arc du pivot mais par `hauteurAuSol`, qui vaut pour TOUTE orientation et
   reproduit cet arc au bit près. Sa composante horizontale, elle, ne servait
   plus depuis que le dé ne quitte pas sa place. */

/* ==========================================================================
   LA TABLE DES CIRCUITS
   ==========================================================================
   Un cube n'a que 24 orientations. Le lancer doit en joindre deux : celle où le
   dé repose, et celle où la face tirée regarde le lecteur, chiffre droit. La
   suite de bascules qui les joint n'est pas donnée par une formule — elle se
   CHERCHE, une fois pour toutes, par énumération de toutes les suites courtes.
   Elle n'a aucune raison de tourner à chaque lancer : le résultat est ici.

   La clé est la rotation à réaliser, codée par les images de x et de y (six
   axes signés : +x, −x, +y, −y, +z, −z, dans cet ordre, indice = 6·image(x) +
   image(y)). Vingt-quatre clés, vingt-quatre entrées : le contrôle G vérifie
   qu'aucune ne manque, rejoue chaque suite et compare.

   Les lettres sont les quatre coups : D roule vers la droite, G vers la gauche,
   A vers l'avant (vers l'œil), R vers l'arrière.

   CONTRAINTES DE LA RECHERCHE
   — jamais deux coups opposés de suite : un va-et-vient immédiat est laid ;
   — le dé reste dans une case de part et d'autre en largeur (c'est elle qui
     coûte de la place), et il ne s'AVANCE jamais vers l'œil au-delà de sa case
     de départ : la perspective grossit vite de ce côté-là, et un dé qui prend
     40 % en venant vers le lecteur sort de sa piste. Il s'éloigne en revanche
     jusqu'à deux cases, où il ne fait que maigrir ;
   — parmi les plus courtes, on garde celles qui MÉLANGENT le mieux bascules
     latérales et bascules en profondeur, et jusqu'à quatre par clé, pour que
     deux lancers de même transition ne se ressemblent pas.

   LA PARITÉ, QUI DÉCIDE DE TOUT, ET QU'AUCUN ALLONGEMENT NE CONTOURNE
   Une bascule est une rotation d'un quart de tour autour d'un axe de face :
   elle permute les quatre diagonales du cube par un 4-cycle, donc par une
   permutation IMPAIRE. Une suite de n bascules réalise donc une rotation de
   parité (−1)ⁿ. Et chaque bascule change la parité de x+z. REVENIR À SA CASE
   exige donc n pair, donc une rotation PAIRE : les douze rotations impaires —
   dont les quarts de tour autour de la verticale, c'est-à-dire la moitié des
   transitions d'une valeur à l'autre — sont hors d'atteinte à déplacement nul.
   Ce n'est pas une limite de la recherche, c'est un théorème : chercher plus
   longtemps ne donnera rien. Il reste alors le déplacement d'UNE case, et c'est
   la caméra qui le referme.

   Longueurs obtenues : 6 ou 8 bascules pour les rotations paires, 7 pour les
   impaires. Excursion latérale à l'écran : une arête, jamais plus.
   ========================================================================== */

var CIRCUITS = {
   2: ["DRRGGAAD", "GRRDDAAG"],
   3: ["ADRGGRDA", "AGRDDRGA", "DAGRRDAG", "GADRRGAD"],
   4: ["RDAGADR", "RGADAGR"],
   5: ["ADRGRDA", "AGRDRGA", "DRGGRDA", "GRDDRGA"],
   8: ["ADRRGA", "AGRRDA", "DAGGRD", "GADDRG"],
   9: ["DRRGAA", "GRRDAA", "RRDAAG"],
  10: ["ADRGADR", "AGRDAGR", "RDRGADA", "DRGGADR"],
  11: ["RDAGRDA", "RGADRGA", "DAGGRDA", "GADDRGA"],
  12: ["DAGRDAG", "DRGADRG", "GRDRDAG", "AGRRDAG"],
  13: ["DAGRGAD", "DRGAGRD", "GRDRGAD"],
  16: ["RRGADA"],
  17: ["ADRGAGRD", "AGRDRGAD", "RDAGRDAG", "GRDRDAAG"],
  18: ["GADRDAG", "GRDADRG", "DRGRDAG"],
  19: ["GADRGAD", "GRDAGRD", "DRGRGAD", "ADRRGAD"],
  22: ["RRDAGA"],
  23: ["ADRGRDAG", "AGRDADRG", "RDAGAGRD", "DRGRDAAG"],
  24: ["RGRDAA"],
  25: ["DAGRGADR", "DRGADAGR", "GADRDRGA", "RDAAGGRD"],
  26: ["DAGGRRD", "GRDDAAG"],
  27: ["DRRGADA", "RGRDAAG"],
  30: ["DAGRGRDA", "DRGADRGA", "GADRDAGR", "RGAADDRG"],
  31: ["RDRGAA"],
  32: ["DRGGAAD", "DRRGGAD", "GADDRRG"],
  33: ["GRRDAGA", "RDRGAAD"]
};

/* Indice d'un axe signé : +x 0, −x 1, +y 2, −y 3, +z 4, −z 5. On prend la plus
   grande composante en valeur absolue, ce qui rend le codage insensible aux
   quelques 1e−16 que traîne toute matrice reconstruite d'un quaternion. */
function axeSigne(v) {
  var m = 0, i;
  for (i = 1; i < 3; i++) if (Math.abs(v[i]) > Math.abs(v[m])) m = i;
  return m * 2 + (v[m] < 0 ? 1 : 0);
}

function cleRotation(R) {
  return axeSigne([R[0][0], R[1][0], R[2][0]]) * 6 +
         axeSigne([R[0][1], R[1][1], R[2][1]]);
}

/* Les 24 orientations où le cube repose sur une face, DÉDUITES de la géométrie
   lue dans le CSS : les six faces devant, chacune sous ses quatre roulis. Pas
   une table de plus à tenir à jour. */
var POSES = [];

function construirePoses() {
  var v, k;
  for (v = 1; v <= 6; v++) {
    POSES.push(poseFinale(SOLIDES.d6, v));
  }
}

/* Le dé peut être surpris dans une orientation quelconque : en pleine bascule,
   ou au milieu de la rotation d'inspection. Un roulement, lui, part forcément
   d'une pose posée. On accroche donc à la plus proche des 24, et l'écart est
   résorbé par une interpolation sphérique pendant la première bascule — voir
   `qAccroche` dans `evaluer`. Dé au repos, cet écart est nul et rien ne bouge. */
function poseLaPlusProche(q) {
  var i, d, score = -1, gagnante = POSES[0];
  for (i = 0; i < POSES.length; i++) {
    d = Math.abs(q[0] * POSES[i][0] + q[1] * POSES[i][1] +
                 q[2] * POSES[i][2] + q[3] * POSES[i][3]);
    if (d > score) { score = d; gagnante = POSES[i]; }
  }
  return gagnante;
}

/* Prépare la marche : les étapes, la rotation totale, le déplacement net. */
function preparerMarche(suite) {
  var etapes = [], pos = [0, 0, 0], q = [1, 0, 0, 0], i, c, d, axe;
  for (i = 0; i < suite.length; i++) {
    c = suite.charAt(i);
    d = COUPS[c];
    axe = axeDeCoup(c);
    /* L'ARÊTE DE CONTACT N'EST PLUS CALCULÉE ICI. `pivot`, `depart` et `d`
       étaient les arguments de `centreBascule` et du report d'assise sur
       l'arête, tous deux remplacés par `hauteurAuSol`, qui déduit la hauteur de
       la seule orientation. Les garder revenait à allouer deux tableaux de trois
       nombres par bascule, six à huit fois par lancer, que personne ne lit. */
    etapes.push({
      axe: axe,
      avant: q                              /* les bascules déjà faites */
    });
    q = qProduit(qAxe(axe, Math.PI / 2), q);   /* la bascule agit dans le repère
                                                  du MONDE : elle se compose à
                                                  gauche, jamais à droite */
    pos = [pos[0] + d[0], pos[1], pos[2] + d[2]];
  }
  return { etapes: etapes, rotation: q };   /* `net` non plus n'était lu par
                                               personne depuis que le dé ne
                                               quitte pas sa place */
}

/* Choisit le circuit qui mène de l'orientation courante à la pose d'arrivée. */
function circuitVers(qDepart, qArrivee) {
  var accroche = poseLaPlusProche(qDepart);
  var W = qProduit(qArrivee, qConjugue(accroche));
  var liste = CIRCUITS[cleRotation(qMatrice(W))];
  return liste[entier(liste.length)];
}

/* ==========================================================================
   LA LOI HORAIRE D'UNE BASCULE
   ==========================================================================
   Un cube qui bascule sur son arête EST un pendule : même équation, même
   intégrale elliptique, aucune forme close. On l'intègre donc, une fois par
   bascule au moment du lancer — 64 pas de trapèze, inversés en 33 points — et
   on interpole. C'est quelques microsecondes, et cela remplace une courbe de
   Bézier qui ne serait qu'une imitation de ce qu'on peut calculer exactement.

   `m` est le seul réglage : la part de l'énergie de départ que le passage du
   coin consomme. À m = 0 le cube tourne à vitesse constante (faux) ; à m = 1 il
   n'arrive jamais au sommet. Entre les deux, il ralentit d'autant plus qu'il
   arrive plus mou. On fait donc CROÎTRE m d'une bascule à la suivante : le dé
   part vif et finit par hésiter au bord de sa dernière arête avant de tomber à
   plat. C'est ce qui donne au lancer sa fin, plutôt qu'un arrêt.

   La DURÉE de chaque bascule en découle, elle n'est pas réglée à part : le
   temps de parcours vaut τ(m)/ω₀, et ω₀ ∝ 1/√m puisque c'est m qui mesure le
   rapport entre la barrière et l'énergie initiale. Le poids τ(m)·√m est donc
   la durée relative de la bascule, à un seul facteur d'échelle près pour tout
   le lancer. Le dé ralentit ainsi tout seul, sans qu'aucune décélération n'ait
   été écrite nulle part.
   ========================================================================== */

var HESITATION_DEBUT = 0.42;   /* première bascule : le dé est lancé */
var HESITATION_FIN   = 0.88;   /* dernière : il passe le coin de justesse */
var BASCULE_MS       = 132;    /* durée moyenne d'une bascule, avant tempo */

function loiHoraire(m) {
  var N = 64, K = 32, pas = (Math.PI / 2) / N;
  var i, phi, cur, prev, cum = 0, cums = [0];

  prev = 1 / Math.sqrt(1 - m * soulevement(0) / SOULEVEMENT);
  for (i = 1; i <= N; i++) {
    phi = pas * i;
    cur = 1 / Math.sqrt(1 - m * soulevement(phi) / SOULEVEMENT);
    cum += (prev + cur) / 2 * pas;
    cums.push(cum);
    prev = cur;
  }

  /* Inversion : l'angle à des instants RÉGULIERS, ce dont le rendu a besoin. */
  var angles = [], j = 0, cible, a, b, t;
  for (i = 0; i <= K; i++) {
    cible = cum * i / K;
    while (j < N - 1 && cums[j + 1] < cible) j++;
    a = cums[j]; b = cums[j + 1];
    t = b > a ? (cible - a) / (b - a) : 0;
    angles.push(pas * (j + t));
  }
  angles[K] = Math.PI / 2;   /* l'arrivée est exacte, pas interpolée */

  return { angles: angles, tau: cum, poids: cum * Math.sqrt(m) };
}

function angleBascule(loi, u) {
  var K = loi.angles.length - 1, x = borne01(u) * K, i = Math.floor(x);
  if (i >= K) return loi.angles[K];
  return loi.angles[i] + (loi.angles[i + 1] - loi.angles[i]) * (x - i);
}

/* Écrasement au contact : 8 à 12 % au premier choc, moins ensuite, jamais plus.
   Un dé n'est pas une balle, c'est un solide rigide ; à 25 % il devient une
   gomme. Le volume est conservé (scaleX = 1 / scaleY), sans quoi le dé
   changerait de masse à chaque contact. L'écrasement ne s'applique qu'aux
   contacts du ROULEMENT, aux instants où une bascule s'achève : la culbute, elle,
   n'a pas de contact à représenter. Et il ne fait plus flotter le dé — voir le
   `dy * sy` de `rendre`.
   Pas d'étirement non plus. Étirer un cube en perspective produit un
   parallélépipède visiblement déformé, ce qui ruine en une image l'illusion de
   volume qu'on cherche à donner. */
function ecrasementAuContact(dt, duree, amplitude) {
  if (dt < 0 || dt > duree) return 0;
  var t = dt / duree;
  return amplitude * (t < 0.375 ? MONTEE(t / 0.375) : 1 - MONTEE((t - 0.375) / 0.625));
}

/* Il n'y a plus ni place latérale à mesurer ni excursion à comparer : le dé ne
   se déplace plus du tout à l'écran, la caméra suit son centre en permanence.
   Les deux fonctions qui calculaient la part de course tenant dans la piste ont
   donc été retirées, avec le plafond `--course-max` qu'elles lisaient. Les
   rétablir demanderait d'abord de rendre au dé le droit de bouger, ce qui a été
   explicitement refusé. */

/* PRÉPARE UNE CULBUTE PAR IMPULSIONS, entièrement, à l'avance.
   Deux passes, et la première est nécessaire : les puissances sont tirées en
   unités arbitraires, on mesure l'angle total qu'elles produisent, et on les met
   toutes à l'échelle pour retomber sur le nombre de tours voulu. Mettre à
   l'échelle APRÈS coup ne change ni les axes ni les instants — la vitesse
   angulaire est linéaire en les impulsions — mais cela change tous les angles,
   d'où la seconde passe pour les quaternions. */
/* `elan` : le PREMIER coup, quand il est imposé du dehors — son axe et sa
   vitesse angulaire. Passé nul, il se tire comme le reste. */
function preparerCulbute(duree, elan) {
  var m = REBONDS, k;

  /* LES INSTANTS, UN PAR TRANCHE. Chaque rebond est tiré au hasard, mais dans sa
     propre tranche de temps. Les intervalles restent donc irréguliers — c'est ce
     qu'on veut — sans qu'un tirage malheureux les entasse tous au même endroit,
     ce qui donnerait une secousse suivie d'un long vide. Tirer dix instants
     indépendants sur tout l'intervalle produit ce défaut une fois sur trois.
     Rien après 82 % du parcours : il faut au dé un peu de temps pour se calmer
     avant de se poser. */
  var instants = [0];
  for (k = 1; k < m; k++) {
    instants.push(duree * (0.05 + 0.77 * (k - 1 + entre(0.15, 0.85)) / (m - 1)));
  }
  /* Gardés à part : `instants` sera réécrit par la grille d'échantillonnage. */
  var instantsRebond = instants.slice();

  /* L'enveloppe de décroissance, commune à toute la culbute. */
  function E(t) { return Math.pow(1 - t / duree, FROTTEMENT); }

  /* PREMIÈRE PASSE — LE PROGRAMME DES REBONDS. Pour chacun : l'axe autour
     duquel il fait pivoter la rotation, de combien, ce qu'il coûte en vitesse,
     et le temps qu'il MET à se produire.
     L'axe de pivotement est tiré au hasard DANS LE PLAN perpendiculaire à la
     rotation du moment : faire tourner l'axe de rotation autour de lui l'incline
     d'exactement `dev` et laisse sa longueur intacte. Aucun rebond ne peut donc
     accélérer le dé, et ce n'est pas une précaution de réglage mais une
     propriété de la rotation elle-même.
     La boucle protège du tirage qui tomberait parallèle à l'axe : le produit
     vectoriel serait nul et la normalisation rendrait NaN. La probabilité est
     nulle en théorie, non nulle en virgule flottante. */
  var base = [(elan && elan.axe) ? elan.axe : axeAleatoire()];
  var perp = [null], devs = [0], pertes = [0];
  var trans = [0], vits = [1], croix, dev = 0, suivant;
  for (k = 1; k < m; k++) {
    dev = (k === 1) ? entre(DEVIATION[0], DEVIATION[1]) * DEG
                    : dev * entre(DEVIATION_RAPPORT[0], DEVIATION_RAPPORT[1]);
    do { croix = vectoriel(base[k - 1], axeAleatoire()); } while (norme(croix) < 1e-6);
    perp.push(unitaire(croix));
    devs.push(dev);
    base.push(unitaire(tourner(perp[k], dev, base[k - 1])));
    pertes.push(entre(PERTE_CHOC[0], PERTE_CHOC[1]));
    vits.push(vits[k - 1] * (1 - pertes[k]));
    suivant = (k + 1 < m) ? instants[k + 1] : duree;
    trans.push(Math.max(1e-6, entre(TRANSITION[0], TRANSITION[1]) *
                              (suivant - instants[k])));
  }

  /* L'ÉTAT VOULU À L'INSTANT t : l'axe et la vitesse, tous deux CONTINUS.
     Entre deux rebonds, rien ne bouge ; pendant un rebond, l'axe suit le même
     méridien que la déviation entière, parcouru selon un smoothstep, et la
     vitesse descend sur la même courbe. Les deux se raccordent donc sans saut ni
     cassure de pente, aux deux bouts. */
  function etatVoulu(t) {
    var j = 0;
    while (j < m - 1 && t >= instants[j + 1]) j++;
    if (j === 0) return { axe: base[0], W: vits[0] };
    var x = borne01((t - instants[j]) / trans[j]);
    var e = x * x * (3 - 2 * x);
    return { axe: unitaire(tourner(perp[j], devs[j] * e, base[j - 1])),
             W: vits[j - 1] * (1 - pertes[j] * e) };
  }

  /* DEUXIÈME PASSE — on échantillonne cet état sur une grille fine. L'axe est
     alors constant sur chaque sous-segment, ce qui rend l'angle parcouru
     calculable en forme close ; et à cent vingt sous-segments, chacun dure moins
     d'une image d'affichage, si bien que l'escalier ne se voit pas.
     C'est la seule concession du modèle : l'intégration d'une vitesse angulaire
     dont l'AXE tourne n'a pas de forme close, et une intégration pas à pas
     rendrait l'animation dépendante de la cadence d'affichage — donc différente
     d'une machine à l'autre, et impossible à photographier à un instant donné. */
  var axes = [], W = [], v;
  for (k = 0; k < SOUS_SEGMENTS; k++) {
    v = etatVoulu(duree * (k + 0.5) / SOUS_SEGMENTS);
    axes.push(v.axe);
    W.push(v.W);
  }
  m = SOUS_SEGMENTS;
  instants = [];
  for (k = 0; k < m; k++) instants.push(duree * k / m);

  /* La primitive de (1 − t/T)^k est −T(1 − t/T)^(k+1)/(k+1) : l'angle parcouru
     sur un segment se calcule donc en forme close, quel que soit l'exposant. */
  var PUIS = FROTTEMENT + 1;
  function angleDe(w0, t0, t1) {
    return w0 * (duree / PUIS) *
           (Math.pow(1 - t0 / duree, PUIS) - Math.pow(1 - t1 / duree, PUIS));
  }

  var rebonds = [];
  for (k = 1; k < REBONDS; k++) {
    rebonds.push({ t: instantsRebond[k], deviation: devs[k], perte: pertes[k],
                   transition: trans[k] });
  }

  var brut = 0, t1;
  for (k = 0; k < m; k++) {
    t1 = (k + 1 < m) ? instants[k + 1] : duree;
    brut += angleDe(W[k], instants[k], t1);
  }
  /* L'ÉCHELLE, OU LA VITESSE DU PREMIER COUP — les deux sont la même chose, le
     profil de vitesse partant de 1 avant mise à l'échelle.

     ORDINAIREMENT on la déduit d'un NOMBRE DE TOURS tiré au sort : le dé doit
     tourner de tant, on ajuste sa vitesse pour qu'il y arrive. Le nombre de
     tours est alors maîtrisé, la vitesse de départ en découle — et elle varie
     d'un dé à l'autre, parce que le profil de décroissance, lui, dépend des
     rebonds tirés pour CE dé-là.

     QUAND L'ÉLAN EST IMPOSÉ, on prend l'autre bout : la vitesse de départ est
     donnée, et c'est le nombre de tours qui en découle. C'est le sens physique
     de la demande — cinq dés jetés d'un même geste partent à la même vitesse, et
     chacun tourne ensuite ce que ses propres rebonds et sa propre durée de vol
     lui laissent tourner. L'inverse — imposer les tours — les ferait partir à
     des vitesses différentes pour arriver au même compte, ce qui est exactement
     ce qu'on ne veut pas voir. */
  var echelle = (elan && elan.W > 0) ? elan.W
              : (brut > 1e-9 ? entre(CULBUTE_TOURS[0], CULBUTE_TOURS[1]) * TAU / brut : 0);

  /* SECONDE PASSE — les segments, avec leur orientation d'entrée et l'angle
     déjà parcouru à cet instant. */
  var seg = [], q = [1, 0, 0, 0], cumul = 0, ang;
  for (k = 0; k < m; k++) {
    W[k] *= echelle;
    t1 = (k + 1 < m) ? instants[k + 1] : duree;
    ang = angleDe(W[k], instants[k], t1);
    seg.push({ t0: instants[k], t1: t1, axe: axes[k], W: W[k],
               avant: q, angleAvant: cumul });
    q = qProduit(qAxe(axes[k], ang), q);
    cumul += ang;
  }

  return {
    T: duree,
    seg: seg,
    n: seg.length,          /* la grille est uniforme : voir `evaluer` */
    angleTotal: cumul,
    /* Le programme des rebonds, gardé pour l'inspection et pour le contrôle J :
       les sous-segments, eux, ne savent plus quel rebond les a produits. */
    rebonds: rebonds,
    /* Ce qui ramène EXACTEMENT à l'identité, et rien d'autre. */
    correction: qConjugue(q),
    /* LE PREMIER COUP, tel qu'il a fini par être : c'est lui qu'un autre dé du
       même lancer reprendra. `W[0]` vaut l'échelle, le profil partant de 1. */
    elan: { axe: seg.length ? seg[0].axe : [0, 1, 0], W: echelle }
  };
}

/* PRÉPARE UN LANCER. Les deux mouvements et leurs deux vitesses sont passés en
   ARGUMENTS et non lus dans les variables de la page : c'est ce qui permet aux
   auto-contrôles d'éprouver les quatre combinaisons sans toucher aux
   interrupteurs, et donc de garantir à chaque chargement que le dé se pose sur
   la face demandée dans les quatre. */
function preparerLancer(sol, valeur, qDepart, roule, tourne, vRoule, vRotation, elan) {
  /* LA VALEUR VIENT DE ROLL20, elle ne se tire pas ici. C'est le point qui
     décide de tout le reste : ce fichier ne lance aucun dé, il MET EN SCÈNE un
     jet déjà fait, déjà écrit au tchat, et vérifiable par toute la table dans le
     message d'origine que la carte replie sous elle. Un moteur qui tirerait sa
     propre valeur serait, dans un tchat de jeu, une accusation de triche en
     puissance — et il aurait raison. */
  /* LE ROULEMENT EST UNE AFFAIRE DE CUBE, et de lui seul : sa table de circuits
     décrit les vingt-quatre orientations d'un cube et ses bascules d'arête en
     arête. Les cinq autres solides l'ignorent — l'interrupteur reste, il ne fait
     simplement rien pour eux, et c'est préférable à un roulement approximatif
     qu'on croirait juste. */
  if (sol.nom !== "d6") roule = false;

  /* LE DÉ RESTE EN PLACE, ET SA FACE REGARDE DROIT.
     Deux choix demandés, et tous deux ôtent de la variété à dessein :

     — l'inclinaison de repos est l'IDENTITÉ, et le roulis est nul. La face qui
       porte la valeur se retrouve donc exactement perpendiculaire à l'axe de
       vue, chiffre droit. Conséquence assumée, et elle est visible : on ne voit
       plus qu'UNE face à l'arrêt, là où une inclinaison en montrerait trois. Le
       volume ne se lit plus que pendant la marche. C'est le prix d'une face
       parfaitement lisible, et c'est ce qui a été demandé — ne pas « rétablir »
       une inclinaison en croyant réparer un oubli.

     — LE DÉ NE QUITTE JAMAIS SA PLACE. Ce n'est plus un circuit fermé qui le
       ramène à son point de départ après l'avoir promené : la caméra suit le
       centre du dé, en permanence, si bien que `dx` et `dz` valent zéro à
       CHAQUE instant et non seulement au dernier. Un dé qui traversait sa piste
       et revenait s'asseoir n'était pas un dé fixe, il était un dé qui rentre.
       Ce qui subsiste du déplacement, et qui doit subsister, c'est le
       SOULÈVEMENT : le centre monte quand le cube passe sur son coin, de
       0,207 arête au sommet de la bascule — et jusqu'à 0,366 sur un coin, quand
       la culbute s'en mêle. C'est le pivot sur l'arête, pas un
       voyage ; l'ôter donnerait un cube qui pivote sur son centre, c'est-à-dire
       exactement la culbute que l'interrupteur d'à côté propose déjà. */
  var qFin = poseFinale(sol, valeur);

  /* Roulement éteint : la marche est VIDE, et tout le reste en découle sans un
     seul `if` de plus — `preparerMarche("")` rend zéro étape et l'identité pour
     rotation, donc `qAccroche` vaut `qFin` et le lancer se réduit à
     l'interpolation qui mène de la pose courante à la pose demandée. */
  var suite = roule ? circuitVers(qDepart, qFin) : "";
  var marche = preparerMarche(suite);
  var n = marche.etapes.length;

  /* L'ARRIVÉE EST EXACTE PAR CONSTRUCTION, ET NON PAR CONFIANCE DANS LA TABLE.
     On demande à la marche la rotation qu'elle réalise VRAIMENT, et on en déduit
     l'orientation d'accrochage. Si la table disait vrai — c'est ce que vérifie
     le contrôle G — cette orientation est exactement la pose posée du dé, et le
     redressement ci-dessous ne fait rien. Si elle disait faux, le dé roulerait
     de travers mais se poserait quand même sur la bonne face : la seule chose
     qui ne se rattrape pas est celle qu'on ne peut pas voir venir. */
  var qAccroche = qProduit(qConjugue(marche.rotation), qFin);

  var tempo = entre(0.92, 1.10);
  var i, m, loi, total = 0, t = 0;

  for (i = 0; i < n; i++) {
    m = HESITATION_DEBUT + (HESITATION_FIN - HESITATION_DEBUT) * (n > 1 ? i / (n - 1) : 1);
    m = borne(m * entre(0.94, 1.06), 0.15, 0.92);
    loi = loiHoraire(m);
    marche.etapes[i].m = m;
    marche.etapes[i].loi = loi;
    total += loi.poids;
  }

  /* LA VITESSE DU ROULEMENT ENTRE ICI, et nulle part ailleurs : elle divise la
     durée de la marche, donc chaque bascule, donc l'échelle. Elle n'accélère
     PAS l'horloge — une horloge unique ne saurait pas courir à deux vitesses,
     et c'est pourtant ce que demandent deux mouvements réglés séparément. */
  var echelle = n > 0 ? n * BASCULE_MS * tempo / (total * vRoule) : 0;
  for (i = 0; i < n; i++) {
    marche.etapes[i].t0 = t;
    t += marche.etapes[i].loi.poids * echelle;
    marche.etapes[i].t1 = t;
    /* Le choc suit la VITESSE d'arrivée, qui vaut 1/√m à l'échelle près : le
       dernier contact est donc le plus doux, celui d'un dé qui n'a plus d'élan.
       Pas la durée de la bascule, qui varie deux fois plus vite et donnerait un
       dernier choc anecdotique. */
    marche.etapes[i].choc = borne(
      0.105 * Math.sqrt(marche.etapes[0].m / marche.etapes[i].m), 0.030, 0.115);
  }

  /* LA CULBUTE PAR IMPULSIONS, préparée en entier ici : trois à cinq coups,
     leurs instants, leurs puissances, et la correction qui ramène le tout à
     l'identité. Voir le pavé de `preparerCulbute`. */
  var spin = tourne ? preparerCulbute(
    entre(CULBUTE_MS[0], CULBUTE_MS[1]) * tempo / vRotation, elan) : null;

  var T = { tempo: tempo };
  T.tRoule = t;                                       /* 0 s'il ne roule pas */
  T.tSpin  = spin ? spin.T : 0;

  /* LA FIN DU MOUVEMENT est celle du mouvement qui dure le plus longtemps. Les
     deux courent sur la même horloge mais chacun sur sa propre durée ; celui
     qui finit le premier tient sa pose — et tenir sa pose ne coûte rien, l'un
     comme l'autre finissant sur l'identité. */
  T.tMouvement = Math.max(T.tRoule, T.tSpin, (roule || tourne) ? 0 : SANS_MOUVEMENT_MS);

  /* Le redressement de l'écart de départ se fait pendant la première bascule
     quand il y en a une, et pendant tout le mouvement quand il n'y en a pas —
     c'est alors le mouvement lui-même. */
  T.tRedress = n > 0 ? marche.etapes[0].t1 : T.tMouvement;

  /* L'assise suit la vitesse du mouvement qui finit le dernier : c'est celui-là
     qui pose le dé, et c'est son allure qu'on attend de voir mourir. */
  T.assise = 320 * tempo / (T.tSpin > T.tRoule ? vRotation : (roule ? vRoule : 1));
  T.tFin   = T.tMouvement + T.assise;

  /* L'axe de l'assise quand il n'y a pas eu de bascule : couché dans le plan de
     la table, composante verticale nulle. Le dé s'assied, il ne pivote pas. */
  var angleAssise = entre(0, TAU);

  return {
    valeur: valeur,
    solide: sol,
    qDepart: qDepart,
    qAccroche: qAccroche,
    qFin: qFin,
    suite: suite,
    etapes: marche.etapes,
    roule: roule,
    tourne: tourne,
    spin: spin,
    /* L'ÉLAN DE CE LANCER, à relire par les dés qui partent avec lui. */
    elan: spin ? spin.elan : null,
    axeAssise: [Math.cos(angleAssise), 0, Math.sin(angleAssise)],
    /* L'inclinaison du regard, tirée dans le rectangle audité. */
    qMonde: reposDe(entre(REPOS_RX[0], REPOS_RX[1]), entre(REPOS_RY[0], REPOS_RY[1])),
    T: T
  };
}

/* Oscillation d'assise : le dernier mouvement, très petit, très court, qui
   MEURT. L'arrêt net est le défaut le plus commun d'un dé animé ; il faut
   donner au mouvement une fin, pas une coupure.
   Un sinus, pas un cosinus : l'angle vaut zéro à l'instant du contact, il n'y a
   donc aucun saut, et la vitesse angulaire initiale est élevée — c'est le coup
   de l'impact. L'enveloppe quadratique garantit l'annulation EXACTE à la fin.
   Jamais plus de 6° : au-delà, la face n'est plus lisible pendant l'oscillation
   et le dé a l'air posé sur du gel.
   À ne pas confondre avec un dépassement élastique sur la ROTATION, qui ferait
   rater sa face au dé avant qu'il se rattrape : c'est ce qui trahit le plus
   violemment une animation fabriquée. La marche ne dépasse jamais sa cible ;
   cette oscillation est un objet séparé, appliqué APRÈS l'arrivée. */
function assise(dt, duree) {
  if (dt <= 0 || dt >= duree) return 0;
  var t = dt / duree;
  return 5.5 * DEG * Math.pow(1 - t, 2) * Math.sin(t * TAU * 2.25);
}

/* Évalue tout l'état à l'instant t, en millisecondes d'animation. */
/* CINQ COUCHES, ET L'ORDRE COMPTE. De la plus intérieure à la plus extérieure :
   le redressement de l'écart de départ, les bascules, la culbute libre,
   l'inclinaison du regard, l'assise. Les trois premières agissent dans le
   repère de l'objet ou par composition à gauche des bascules ; les deux
   dernières sont des rotations de CAMÉRA, composées à gauche de tout.
   Chaque couche a sa propre horloge et sa propre condition d'existence, et
   chacune finit sur l'identité : c'est ce qui rend l'arrivée exacte dans les
   quatre combinaisons d'interrupteurs, et non exacte dans un cas et rattrapée
   dans les autres. */
function evaluer(p, t) {
  var T = p.T, n = p.etapes.length, i = 0, e = null, phi = 0, k;
  var avancement, q;

  /* 1. LE REDRESSEMENT. Interpolation sphérique de l'orientation réelle du
        départ vers la pose accrochée. Dé au repos, les deux coïncident et elle
        ne fait rien ; elle ne sert qu'au dé relancé en plein mouvement ou saisi
        au milieu de la rotation d'inspection, à qui elle évite de rembobiner
        d'un coup. Sans roulement, elle EST le mouvement. */
  q = qSlerp(p.qDepart, p.qAccroche, ATTERRIR(borne01(t / T.tRedress)));

  /* 2. LES BASCULES, quand le roulement est allumé. Elles se composent à
        gauche : une bascule agit dans le repère du monde, jamais dans celui du
        dé. `avancement` vaut exactement 1 dès la fin de la dernière — la loi
        horaire force l'arrivée et `angleBascule` sature — et c'est cette
        exactitude-là qui annule l'inclinaison du regard sans epsilon. */
  if (n > 0) {
    while (i < n - 1 && t >= p.etapes[i].t1) i++;
    e = p.etapes[i];
    phi = angleBascule(e.loi, (t - e.t0) / (e.t1 - e.t0));
    avancement = (i + phi / (Math.PI / 2)) / n;
    q = qProduit(qAxe(e.axe, phi), qProduit(e.avant, q));
  } else {
    avancement = borne01(t / T.tMouvement);
  }

  /* 3. LA CULBUTE PAR IMPULSIONS, quand la rotation est allumée. Composée à
        GAUCHE : une vitesse angulaire est une grandeur du MONDE, pas du dé, et
        un coup reçu ne tourne pas avec l'objet qu'il frappe.
        On retrouve le segment courant, on intègre l'angle depuis son début — en
        forme close, la primitive de (1 − t/T)^k étant −T(1 − t/T)^(k+1)/(k+1) —
        et on empile la correction, dosée sur l'ANGLE DÉJÀ PARCOURU et non sur le
        temps. À l'instant T, l'angle parcouru vaut l'angle total, la correction
        est entière, et elle annule EXACTEMENT le point d'arrivée de la culbute :
        les deux quantités sont sommées dans le même ordre, avec les mêmes
        termes, donc identiques au bit près. */
  if (p.tourne) {
    /* LA GRILLE DES SOUS-SEGMENTS EST UNIFORME PAR CONSTRUCTION : l'indice se
       CALCULE, il ne se cherche pas. Le balayage linéaire d'ici coûtait jusqu'à
       cent vingt tours de boucle par image et par dé — et surtout, le contrôle J
       le refaisant quarante-huit mille fois au chargement, il y pesait des
       millions d'itérations. */
    var S = p.spin, tt = t < S.T ? t : S.T, sg, ang, g;
    var j = (tt * S.n / S.T) | 0;
    if (j >= S.n) j = S.n - 1;
    sg = S.seg[j];
    ang = sg.W * (S.T / (FROTTEMENT + 1)) *
          (Math.pow(1 - sg.t0 / S.T, FROTTEMENT + 1) -
           Math.pow(1 - tt / S.T, FROTTEMENT + 1));
    g = S.angleTotal > 1e-12 ? (sg.angleAvant + ang) / S.angleTotal : 1;
    q = qProduit(qProduit(qSlerp(IDENTITE, S.correction, g),
                          qProduit(qAxe(sg.axe, ang), sg.avant)), q);
  }

  /* 4. L'INCLINAISON DU REGARD, composée à gauche. On l'appelle une rotation de
        caméra parce que c'est son INTENTION — donner du volume aux bascules
        latérales, qui tournent autour de l'axe du regard — mais elle est mise en
        œuvre comme une rotation du SOLIDE, et depuis `hauteurAuSol` les deux ne
        reviennent plus au même : le dé se soulève de ce que l'inclinaison
        l'enfoncerait, jusqu'à 0,209 arête.
        C'est le moindre mal, et c'est un choix. La ligne de sol et l'ombre sont
        des éléments PLATS, fixes à l'écran : elles ne s'inclinent pas avec le
        regard. Ne pas soulever mettrait donc le coin du cube 33 px sous une ligne
        de sol qui, elle, n'aurait pas bougé. On préfère un dé qui repose
        exactement sur la ligne qu'on voit.
        Le faire ici plutôt que sur un élément de scène épargne au passage de
        refaire à la main la projection de l'ombre, qui est plate et hors du
        contexte 3D.
        L'enveloppe vaut zéro EXACTEMENT à l'arrivée : la face du résultat finit
        rigoureusement de face, ce qui est la seule exigence non négociable. */
  var w = enveloppeMonde(avancement, n);
  if (w > 0) q = qProduit(qSlerp(IDENTITE, p.qMonde, w), q);

  /* 5. L'ASSISE. Elle n'a plus à choisir son pivot : la hauteur se déduit de
        l'orientation FINALE, et le dé reste posé sur la table quoi qu'on lui
        fasse tourner. Le code d'avant reportait le centre sur l'arête de la
        dernière bascule pour éviter d'enfoncer un coin — une rustine qui ne
        marchait que s'il y AVAIT eu une bascule, et qui laissait le dé
        s'enfoncer de 16 px dans les deux combinaisons sans roulement. */
  if (t > T.tMouvement) {
    var th = assise(t - T.tMouvement, T.assise);
    q = qProduit(qAxe(n > 0 ? e.axe : p.axeAssise, th), q);
  }

  var compression = 0;
  for (k = 0; k < n; k++) {
    compression += ecrasementAuContact(t - p.etapes[k].t1, 80 * T.tempo, p.etapes[k].choc);
  }
  var sy = 1 - compression;
  var sx = 1 / sy;                      /* conservation du volume */

  /* LA HAUTEUR SE DÉDUIT DE L'ORIENTATION FINALE — celle qui sera rendue, donc
     inclinaison du regard et assise comprises. La calculer plus tôt laisserait
     passer sous la table exactement ce que les deux dernières couches font
     tourner. Voir le pavé de `hauteurAuSol`. */
  var dy = hauteurAuSol(p.solide, q);

  return {
    q: q,
    /* ZÉRO, ET LITTÉRALEMENT ZÉRO. La caméra suit le centre du dé à chaque
       instant : il ne dérive pas d'un pixel, ni pendant, ni après. Ne pas
       réintroduire ici un terme de dérive « pour que ça vive » — c'est
       exactement ce qui a été refusé. */
    dx: 0,
    /* DEUX hauteurs, et il en faut deux.
       `dy` est la levée VRAIE du centre : c'est elle que l'ombre doit lire, elle
       dit à quelle hauteur le dé se trouve.
       `dyPose` est ce qu'il faut TRANSLATER pour que le sommet le plus bas
       retombe sur la table, l'écrasement compris. L'écrasement est un `scale`
       dont l'origine est le bas de la BOÎTE — le sol seulement quand le cube est
       à plat — et, appliqué avant la translation, il remonte ce sommet de
       `levée × (1 − sy)`. Multiplier la translation par `sy` annule exactement ce
       report.
       Les deux sont rendues ici, et non recalculées dans `rendre` : le contrôle M
       lit la même valeur que le rendu, sinon il éprouverait son propre modèle au
       lieu du code — ce qu'il a d'ailleurs fait un moment, et il a échoué pour
       cette raison. */
    dy: dy,
    dyPose: dy * sy,
    dz: 0,
    sx: sx,
    sy: sy,
    /* L'ombre suit le soulèvement, saturée à celui du cube sur son arête : au
       delà, le dé est franchement en l'air et son ombre est à son maximum
       d'étalement. */
    u: souleve(p.solide, dy)
  };
}

/* ==========================================================================
   9. LE RENDU D'UNE IMAGE
   ========================================================================== */

/* Arrondis d'écriture. Le résultat finit en pixels sur un écran : quatre
   décimales sur une fraction d'arête en écrivaient trois de trop, et chaque
   `toFixed` alloue une chaîne. On arrondit au centième de pixel, ce qui est déjà
   sous le seuil du sous-pixel, et on laisse le moteur formater — c'est plus
   rapide que `toFixed`, et cela produit « 12.3 » au lieu de « 12.3000 ». */
function px(v) { return Math.round(v * 100) / 100; }
function mil(v) { return Math.round(v * 1000) / 1000; }

/* LE RENDU N'ÉCRIT PLUS DE VARIABLES HÉRITÉES, et c'est LA modification qui
   compte. Mesuré au banc, sur cette page à trois dés :

     une seule propriété personnalisée posée sur `.plateau`   1 083 µs
     `transform` écrit directement sur les trois `.de`            72 µs
     idem, avec `contain: layout style` sur les scènes            32 µs

   Trente-six fois moins, et la raison est structurelle : une propriété
   personnalisée est HÉRITÉE, donc le navigateur doit revisiter tout le
   sous-arbre de l'élément qui la porte — cent trente-neuf éléments ici — pour
   savoir qui en dépend. Le coût ne dépend même pas du nombre de propriétés
   écrites : la première les paie toutes. `transform`, à l'inverse, ne s'hérite
   pas ; l'écrire sur un élément n'invalide que lui.
   Déplacer la propriété sur un élément plus proche ne sert à RIEN, c'est
   mesuré : posée sur les trois `.scene`, elle coûte exactement le même prix.
   Ce n'est pas la distance qui coûte, c'est l'héritage.

   Les règles CSS correspondantes sont CONSERVÉES : un style en ligne l'emporte
   sur une feuille de style, elles ne servent donc plus qu'à donner sa pose au
   dé avant le premier rendu — ce qui est exactement ce qu'on veut, et ce qui
   évite une image blanche au chargement. Ne pas les supprimer. */
function rendre(de, etat, tout) {
  var R = qMatrice(etat.q), u = etat.u;
  var m = matrice3dCss(R);
  var dx = etat.dx, dy = etat.dy, dz = etat.dz, dyPose = etat.dyPose;
  var sx = mil(etat.sx), sy = mil(etat.sy);

  /* L'OMBRE. Plus le dé est haut sur son coin, plus elle est large, floue et
     pâle ; au contact, elle est petite, nette et dense. Ses valeurs dérivent de
     la MÊME grandeur que le mouvement — `u`, le soulèvement du centre rapporté
     à son maximum de 0,366 arête, celui du cube sur son COIN — et jamais d'une
     seconde série de nombres
     tapée à côté, faute de quoi l'ombre décollerait du dé de deux images, ce
     que tout le monde perçoit sans savoir pourquoi.
     Elle ne tourne pas avec le solide : une ombre qui suivrait les rotations
     serait plus exacte et lirait beaucoup moins bien.

     ELLE REFAIT À LA MAIN LA PROJECTION QUE LA PERSPECTIVE DONNE AU DÉ. L'ombre
     est un élément PLAT, hors du contexte 3D — c'est délibéré, un
     `filter: drop-shadow` sur le dé aplatirait le cube — et rien ne la projette
     donc toute seule. Quand le dé s'éloigne d'une case, sa silhouette maigrit
     de 15 % et son point de contact remonte vers le centre de la scène : le
     facteur `k` ci-dessous est exactement celui-là — focale sur (focale moins
     profondeur) — et `--ombre-dy` descend le centre de l'ellipse d'une
     demi-arête fois (k − 1), c'est-à-dire le remonte quand le dé s'éloigne.
     Sans ces deux lignes, le dé s'en irait et son ombre resterait.

     SON DÉCALAGE LATÉRAL PROPRE SE DÉDUIT DE LA CLÉ, ET DE RIEN D'AUTRE. La clé
     penche de 0,22 pour 0,78 par rapport à la verticale, et elle est à DROITE :
     l'ombre d'un point situé à la hauteur h tombe donc à 0,282 × h à sa gauche.
     C'est proportionnel à la HAUTEUR, jamais à la position latérale — au
     contact, h vaut zéro et l'ombre est exactement sous le dé. Un dé posé qui
     flotte à côté de son ombre est la faute que rien ne rattrape. */
  var k = PERSPECTIVE / (PERSPECTIVE - dz);
  var odx = (dx - 0.282 * (dy < 0 ? -dy : 0)) * k;
  var ody = 0.5 * (k - 1);
  var echN = mil((1 + 0.10 * u) * k);
  var echL = mil((1 + 0.30 * u) * k);
  var opN = mil(0.54 * Math.pow(1 - u, 1.4));
  var opL = mil(0.07 + 0.13 * u);

  /* UNE ÉCRITURE QUI NE CHANGE RIEN COÛTE LE PRIX PLEIN. Le navigateur ne
     compare pas : il invalide, puis recalcule. On compare donc nous-mêmes, ce
     qui coûte une comparaison de chaînes contre quarante microsecondes.
     Ce n'est pas une micro-optimisation de principe, c'est le cas ORDINAIRE :
     en rotation seule, le dé ne quitte pas le sol, donc `dy` reste nul, donc ni
     le vol ni les deux ombres ne bougent d'une image à l'autre de tout le
     lancer. Neuf éléments sur douze n'ont alors rien à recevoir. */
  var p = de, a = p.rayonPx, tVol, tOmb, tL, tN;
  {
    if (p.mDe !== m) { p.mDe = m; p.de.style.transform = m; }

    /* `dyPose` et non `dy` : voir le pavé des deux hauteurs dans `evaluer`.
       L'ombre, plus bas, garde la levée NON corrigée — elle dit la hauteur du
       dé, pas la forme qu'il prend en touchant. */
    tVol = "translate3d(" + px(dx * a) + "px," + px(dyPose * a) + "px," +
           px(dz * a) + "px) scale(" + sx + "," + sy + ")";
    if (p.mVol !== tVol) { p.mVol = tVol; p.vol.style.transform = tVol; }

    tOmb = "translate(-50%,0) translate(" + px(odx * a) + "px," + px(ody * a) + "px) scale(";
    tL = tOmb + echL + ")";
    if (p.mLarge !== tL) { p.mLarge = tL; p.large.style.transform = tL; }
    if (p.oLarge !== opL) { p.oLarge = opL; p.large.style.opacity = opL; }
    tN = tOmb + echN + ")";
    if (p.mNette !== tN) { p.mNette = tN; p.nette.style.transform = tN; }
    if (p.oNette !== opN) { p.oNette = opN; p.nette.style.opacity = opN; }
  }

  eclairer(de, R, tout);
}



  /* ==================================================================
     L'API — tout ce que content-roll20.js voit de ce fichier
     ================================================================== */

  /* LES SOLIDES SE CONSTRUISENT AU PREMIER DÉ, JAMAIS AU CHARGEMENT.
     La construction n'est pas gratuite : six enveloppes convexes, et pour le d10
     une recherche ternaire qui en refait quarante à elle seule. La payer à
     l'ouverture de chaque page Roll20 serait la payer surtout pour les parties
     où personne ne lance de dés d'action. */
  var pretes = false;
  function assurerLesSolides() {
    if (pretes) return true;
    try {
      construireSolides();
      pretes = true;
    } catch (e) { pretes = false; }
    return pretes;
  }

  /* LES DÉS VIVANTS, ET LA BOUCLE QUI LES MÈNE — une seule pour tout le tchat :
     dix cartes à l'écran font dix dés à animer, et dix boucles feraient dix fois
     le travail de synchronisation pour la même image.

     ELLE DOIT ÊTRE INCREVABLE, et c'est la leçon d'un défaut signalé en partie :
     « au bout de plusieurs re-animate, plus aucune animation ne fonctionne,
     tout reste figé ». Une boucle d'animation qui se relance elle-même a un mode
     de panne à sens unique — il suffit qu'une seule image échoue pour que la
     chaîne s'arrête, et rien ne la rallume jamais. Le coût d'une image perdue est
     nul ; le coût d'une chaîne rompue est la page entière, pour la soirée.

     TROIS RÈGLES, ET ELLES SUFFISENT À RENDRE LA PANNE IMPOSSIBLE :

       1. LE DRAPEAU NE PEUT PAS MENTIR. On ne garde plus un booléen « ça
          tourne » posé à côté de la vérité : on garde l'IDENTIFIANT rendu par
          `requestAnimationFrame`, et on l'efface EN ENTRANT dans l'image, avant
          tout travail. Une image qui échoue laisse donc le champ libre : le
          prochain réveil replanifie. L'ancien code posait `bat = false` à la
          SORTIE — jamais atteinte si quoi que ce soit levait en chemin, et le
          drapeau restait vrai à jamais, si bien que `reveiller` rendait la main
          sans rien faire pour tous les dés à venir.
       2. UN DÉ QUI ÉCHOUE NE PREND PAS LES AUTRES. Chaque dé est mis à jour dans
          son propre `try` : celui qui lève est retiré de la liste, les autres
          continuent leur culbute dans la même image.
       3. LE PAS DE TEMPS EST TOUJOURS UN NOMBRE. Un `NaN` ou un pas négatif —
          horloge remise à zéro, onglet revenu au premier plan, horodatage plus
          ancien que le précédent — empoisonnerait l'horloge du dé pour de bon :
          `horloge` deviendrait `NaN`, la comparaison à `tFin` serait fausse, et
          la matrice sortirait en `matrix3d(NaN,…)` que le navigateur refuse
          SANS RIEN DIRE. Le dé paraîtrait figé, sans erreur nulle part. */
  var vivants = [];
  var imagePrevue = 0;      /* l'identifiant rAF en attente, 0 si aucune */
  var instant = 0;
  var incidents = 0;        /* combien de dés ont dû être lâchés, et pourquoi */
  var dernierMal = "";

  function maintenantMs() {
    return (window.performance && performance.now) ? performance.now() : 0;
  }

  function planifier() {
    if (imagePrevue) return;
    /* `|| -1` : un identifiant valant zéro passerait pour « rien en attente ». */
    imagePrevue = requestAnimationFrame(battre) || -1;
  }

  function battre(maintenant) {
    imagePrevue = 0;                       /* AVANT tout travail : voir la règle 1 */
    var dt = maintenant - instant;
    if (!(dt >= 0)) dt = 16.7;             /* NaN ou pas négatif : on repart au nominal */
    if (dt > 50) dt = 50;                  /* onglet revenu de loin : on ne saute pas le lancer */
    instant = maintenant;
    var i, d, reste = false;
    for (i = vivants.length - 1; i >= 0; i--) {
      d = vivants[i];
      try {
        /* UN DÉ DÉTACHÉ DU DOCUMENT NE S'ANIME PLUS. Le tchat de Roll20 est une
           liste qui se vide par le haut : sans ce test, une partie de six heures
           laisserait tourner des centaines de dés que personne ne voit. */
        if (!d.scene.isConnected) { vivants.splice(i, 1); continue; }
        d.horloge += dt;
        if (d.horloge < d.params.T.tFin) {
          rendre(d, evaluer(d.params, d.horloge));
          reste = true;
        } else {
          d.horloge = d.params.T.tFin;
          rendre(d, evaluer(d.params, d.horloge), true);
          vivants.splice(i, 1);
        }
      } catch (e) {
        /* RÈGLE 2 : il sort, les autres restent. Mais on ne l'avale pas en
           silence — un incident absorbé sans trace est un incident qu'on ne
           corrigera jamais. Le compte et le dernier message se lisent depuis la
           console : OwdDes3d.incidents(). */
        incidents++;
        dernierMal = (e && e.message) ? String(e.message) : String(e);
        vivants.splice(i, 1);
      }
    }
    if (reste) planifier();
  }

  function reveiller() {
    if (!imagePrevue) instant = maintenantMs();
    planifier();
  }

  /* UN LOT : LES DÉS D'UNE MÊME CARTE, QUI PARTENT DU MÊME GESTE.
     Cinq dés jetés ensemble reçoivent une seule poussée : le premier coup — son
     axe et sa vitesse — leur est commun, et tout le reste leur appartient,
     orientation de départ, durée de vol, rebonds. Ils partent donc de concert et
     divergent aussitôt, ce qui est ce qu'on voit d'une poignée de dés lancée sur
     une table.

     COMMENT ON SAIT QU'UN NOUVEAU GESTE COMMENCE, sans que l'appelant ait à le
     dire : un dé qui redemande l'élan alors qu'il a DÉJÀ consommé le courant ne
     peut être que reparti, donc c'est un nouveau lancer. Le clic sur
     « re-animer » rappelle les cinq dés de la carte l'un après l'autre dans la
     même tâche : le premier à repasser renouvelle le geste, les quatre suivants
     le reprennent. Aucun appel supplémentaire à placer, donc aucun oubli
     possible du côté de l'appelant. */
  function nouveauLot() { return { elan: null, servis: [] }; }

  function elanDuLot(lot, d) {
    if (!lot) return null;
    if (lot.servis.indexOf(d) >= 0) { lot.elan = null; lot.servis.length = 0; }
    lot.servis.push(d);
    return lot.elan;
  }

  /* Le réglage système « réduire les animations », interrogé à chaque dé plutôt
     que retenu : il se change sans recharger la page, et un joueur pris de
     vertiges en pleine partie doit être soulagé au message suivant. */
  function moinsDeMouvement() {
    try {
      return !!(window.matchMedia &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) { return false; }
  }

  /* LA SCÈNE D'UN DÉ. Même construction que la page d'essai, aux noms de classes
     près : une boîte de deux rayons de large et de deux APOTHÈMES de haut, dont
     le bord bas est la ligne de sol ; les deux ombres derrière ; le dé au-dessus,
     et ses faces posées par une matrice 3D et découpées au clip-path. */
  function batirScene(sol, rayonPx, nuit) {
    var scene = document.createElement("div");
    scene.className = "owd-d3";
    scene.style.width = (2 * rayonPx) + "px";
    scene.style.height = (2 * sol.apotheme * rayonPx) + "px";
    scene.style.perspective = (2 * rayonPx * PERSPECTIVE) + "px";
    scene.style.setProperty("--diam", (2 * rayonPx) + "px");
    scene.style.setProperty("--arete", (2 * sol.apotheme * rayonPx) + "px");
    scene.style.fontSize = (rayonPx * sol.tailleChiffre) + "px";

    var large = document.createElement("div");
    large.className = "owd-d3-ombre owd-d3-ombre--large";
    var nette = document.createElement("div");
    nette.className = "owd-d3-ombre owd-d3-ombre--nette";
    var vol = document.createElement("div");
    vol.className = "owd-d3-vol";
    var de = document.createElement("div");
    de.className = "owd-d3-de";

    var i;
    for (i = 0; i < sol.n; i++) {
      var face = document.createElement("div");
      face.className = "owd-d3-f";
      face.style.transform = matriceFace(sol.faces[i], rayonPx);
      face.style.clipPath = decoupeFace(sol.faces[i]);
      var chiffre = document.createElement("span");
      chiffre.className = "owd-d3-n";
      chiffre.appendChild(document.createTextNode(String(i + 1)));
      face.appendChild(chiffre);
      de.appendChild(face);
    }

    vol.appendChild(de);
    scene.appendChild(large);
    scene.appendChild(nette);
    scene.appendChild(vol);

    var d = { solide: sol, scene: scene, faces: de.children, de: de, vol: vol,
              large: large, nette: nette, rayonPx: rayonPx, palette: null,
              dernierTon: [], params: null, horloge: 0,
              mDe: null, mVol: null, mLarge: null, mNette: null,
              oLarge: null, oNette: null };
    /* LA PALETTE DE SON TYPE, ET DU MODE OÙ LA CARTE S'AFFICHE. C'est elle qui
       porte la gamme de clarté, la table des tons et l'encre du chiffre — noire
       sur un dé clair, blanche sur un dé sombre, sans qu'aucune ligne ne le
       décide : cela tombe du contraste. */
    poserPalette(d, paletteDe(sol.nom, !!nuit));
    return d;
  }

  window.OwdDes3d = {
    /* Ce moteur sait-il dessiner ce dé-là ? Le tchat peut porter n'importe quoi
       — « [[2d6]] » rend une SOMME, « [[1d100]] » un dé qu'on ne modélise pas —
       et il vaut mieux rendre la main que faire passer un cube pour un d100. */
    connait: function (taille, valeur) {
      if (!assurerLesSolides()) return false;
      var sol = SOLIDES["d" + taille];
      return !!sol && valeur >= 1 && valeur <= sol.n && valeur === Math.floor(valeur);
    },

    /* OUVRE UN LOT — les dés d'une même carte, à passer à `creer`. Sans lot,
       chaque dé part de son propre geste, ce qui reste juste mais se voit. */
    lot: function () { return nouveauLot(); },

    /* CE QUI A MAL TOURNÉ, s'il y a lieu. Rien ne l'affiche : c'est une prise
       pour la console, le jour où l'ombrage se figerait de nouveau. Un incident
       ne casse plus rien — il coûte un dé, pas la page — mais il reste un
       symptôme, et un symptôme sans trace ne se soigne pas. */
    incidents: function () { return { compte: incidents, dernier: dernierMal }; },

    /* LA COULEUR NE SE RÈGLE PLUS, ELLE SE DÉDUIT. Chaque type de dé a la
       sienne, en deux versions — claire le jour, sombre la nuit — et c'est
       `creer` qui la pose, sur la foi du mode qu'on lui passe. Il n'y a donc
       plus rien à appeler avant, et plus rien à oublier d'appeler.
       Cette prise reste, pour lire la table depuis la console. */
    couleurs: function () { return COULEURS_DES; },

    /* UN DÉ QUI MONTRE `valeur`. Rend { noeud, rejoue }, ou null s'il ne sait
       pas — au menu appelant de retomber sur autre chose.
       `rang` ne sert qu'à décaler les départs : deux dés lancés à la même image
       et partis du même angle tomberaient à l'unisson, ce qui se voit. */
    creer: function (taille, valeur, rang, rayonPx, lot, nuit) {
      if (!this.connait(taille, valeur)) return null;
      var sol = SOLIDES["d" + taille];
      var d = batirScene(sol, rayonPx || 26, nuit);
      /* POSER LE DÉ, animé ou non. Le corps entier est gardé : un clic sur
         « re-animer » ne doit jamais pouvoir laisser le dé dans un état à
         moitié préparé — mieux vaut le dé tel qu'il était que rien du tout. */
      var poser = function (anime) {
        try {
          var depart = anime
            ? qNormalise(qAxe(axeAleatoire(), entre(0.6, 2.4) * Math.PI))
            : poseFinale(sol, valeur);
          var plan = preparerLancer(sol, valeur, depart, false, anime, 1, 1,
                                    elanDuLot(lot, d));
          if (lot && !lot.elan) lot.elan = plan.elan;
          /* On ne remplace l'état du dé qu'une fois le plan calculé : si la
             préparation lève, `d.params` garde le plan précédent, qui est valide. */
          d.params = plan;
          d.horloge = anime ? 0 : plan.T.tFin;
          d.dernierTon = [];
          rendre(d, evaluer(d.params, d.horloge), true);
          if (anime) {
            if (vivants.indexOf(d) < 0) vivants.push(d);
            reveiller();
          }
        } catch (e) {}
      };
      poser(!moinsDeMouvement());
      d.scene.setAttribute("role", "img");
      d.scene.setAttribute("aria-label",
        "dé " + (rang + 1) + " (d" + taille + ") : " + valeur);
      return {
        noeud: d.scene,
        rejoue: function () { poser(!moinsDeMouvement()); }
      };
    }
  };
})();
