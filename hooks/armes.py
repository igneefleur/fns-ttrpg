"""Cartes d'armes : dessine au build le trajet, la garde et le pas de chaque coup.

Un coup ne se pose pas sur une zone : il PARCOURT l'espace, case après case, dans
l'ordre, et s'interrompt sur le premier corps rencontré. Chaque coup porte donc,
dans le markdown, quatre attributs.

    data-trajet="1:passe>2:frappe"    les étapes ordonnées
    data-degats="20 TRA / CON"        20 sur la case verte, la moitié sur la blanche
    data-garde="3>8"                  d'où partent les mains, où elles finissent
    data-pas="traverse-d"             le déplacement exigé, s'il y en a un

LE TRAJET. Chaque étape vaut :
    frappe   la case visée : dégâts pleins, et le coup POURSUIT sa course
    passe    l'arme y passe à hauteur de corps : un corps qui s'y tient prend la
             MOITIÉ des dégâts, et le coup s'arrête là, le reste étant annulé

NOMMAGE DES CASES, le porteur au centre regardant vers le haut :
    soi              sa propre case
    1, 2, 3, 4       droit devant, à N pas
    2d               un cran à droite le long de l'anneau
    2d2, 3g5         deux crans à droite, cinq crans à gauche
    2dd, 3ggg        ancienne écriture, toujours acceptée : autant de crans que
                     de lettres

On tourne AUTOUR du porteur : l'anneau N porte 6N cases et on les atteint toutes,
de 0 (droit devant) à 3N (droit derrière), dans un sens comme dans l'autre. Un
grand geste arme derrière une épaule et sort derrière l'autre : ses cases de
départ et de fin sont donc à côté du porteur et dans son dos, et le livre doit
savoir les nommer. Au-delà de 3N crans on a fait le tour, et le hook le refuse.

Une case vaut UN PAS, soit 0.75 m. Les hexagones sont à SOMMET PLAT : c'est la
seule orientation qui offre une case droit devant, ce qu'un trajet orienté exige.

LES DÉGÂTS. La valeur écrite est celle de la case VERTE, et elle est paire. Celle
de la case blanche vaut la moitié : elle n'est pas écrite, elle est calculée ici,
et l'invariant ne peut donc pas dériver. Le TYPE peut différer d'une couleur à
l'autre, parce que ce n'est pas la même partie de l'arme qui touche : le fil
tranche, la pointe perce, la hampe et le pommeau écrasent.

LA GARDE. Un carré de neuf cases figure un plan vertical devant le porteur et
donne la position de ses MAINS. Rangs : au-dessus des épaules, entre épaules et
ceinture, sous la ceinture. Colonnes : sa gauche, son axe, sa droite.

    1 2 3
    4 5 6
    7 8 9

LE PAS. Un changement de case, à distinguer de l'engagement du corps, qui est la
fente et qui ne quitte pas la case. La carte est centrée sur la case D'OÙ LE COUP
EST PORTÉ, donc après le pas : celui-ci se marque sur la case quittée.

Le dessin se fait ici plutôt qu'en JavaScript : le SVG part dans la page
construite, donc il s'affiche sans script, se retrouvera dans le PDF, et se
vérifie en lisant le HTML.
"""

import math
import re

RAYON_CASE = 10.0   # rayon du cercle circonscrit d'un hexagone, en unités SVG
PORTEE_MAX = 4      # rayon de la carte, en cases : la lance et la hallebarde
SQ3 = math.sqrt(3.0)

ETAPE = re.compile(r"^(soi|(\d+)(g*|d*)(\d*))$")
TYPES = ("CON", "PER", "TRA")

# L'ouverture d'un coup et son nom : la carte se pose avant le nom, les chiffres
# et la garde juste après, le reste du bloc étant écrit à la main.
COUP = re.compile(
    r'(<div class="geste"((?:\s+data-[a-z]+="[^"]*")+)>)'
    r'(\s*<p class="geste-nom">.*?</p>)', re.S
)
ATTR = re.compile(r'data-([a-z]+)="([^"]*)"')

# La case quittée, pour chaque pas : le porteur vient de là.
PAS = {
    "avant":      ((0, 1),   "pas avant"),
    "arriere":    ((0, -1),  "pas en arrière"),
    "traverse-d": ((-1, 1),  "pas de traverse à droite"),
    "traverse-g": ((1, 0),   "pas de traverse à gauche"),
    "arriere-d":  ((-1, 0),  "pas oblique en arrière à droite"),
    "arriere-g":  ((1, -1),  "pas oblique en arrière à gauche"),
}


class ErreurCoup(Exception):
    """Une donnée de coup invalide : le build s'arrête plutôt que de mentir."""


def _sommets(cx, cy, rayon):
    """Hexagone à sommet plat : le premier sommet est à l'est."""
    return " ".join(
        f"{cx + rayon * math.cos(math.radians(60 * i)):.2f},"
        f"{cy + rayon * math.sin(math.radians(60 * i)):.2f}"
        for i in range(6)
    )


def _distance(q, r):
    return (abs(q) + abs(q + r) + abs(r)) // 2


def _centre(q, r):
    return RAYON_CASE * 1.5 * q, RAYON_CASE * SQ3 * (r + q / 2.0)


def _anneau(n):
    """Les 6N cases de l'anneau N, rangées à partir de droit devant, dans le sens
    des aiguilles. Elles ne sont PAS également espacées en azimut — l'hexagone a
    des coins — d'où le tri plutôt qu'un calcul d'angle."""
    if n in _ANNEAUX:
        return _ANNEAUX[n]
    cells = [(q, r) for q in range(-n, n + 1) for r in range(-n, n + 1)
             if _distance(q, r) == n]
    cells.sort(key=lambda c: math.atan2(*(lambda x, y: (x, -y))(*_centre(*c))))
    i0 = min(range(len(cells)),
             key=lambda i: abs(math.atan2(*(lambda x, y: (x, -y))(*_centre(*cells[i])))))
    _ANNEAUX[n] = cells[i0:] + cells[:i0]
    return _ANNEAUX[n]


_ANNEAUX = {}


def _case(nom):
    """Coordonnées axiales d'une case nommée, le porteur regardant vers le haut.

    La case de devant est (0, -N) ; on tourne ensuite AUTOUR du porteur, d'un
    cran par lettre ou par le nombre qui suit la lettre. L'anneau N porte 6N
    cases, et 3N crans mènent droit derrière.
    """
    m = ETAPE.match(nom.strip())
    if not m:
        return None
    if m.group(1) == "soi":
        return (0, 0)
    n, cote, compte = int(m.group(2)), m.group(3), m.group(4)
    if compte and len(cote) != 1:
        raise ErreurCoup(
            f"case « {nom} » : un nombre de crans se met après UNE seule lettre, "
            f"comme 2d3 ou 3g5")
    k = int(compte) if compte else len(cote)
    if cote.startswith("g"):
        k = -k
    if abs(k) > 3 * n:
        raise ErreurCoup(
            f"case « {nom} » : {abs(k)} crans sur l'anneau {n}, or {3 * n} crans "
            f"mènent déjà droit derrière et on a fait le tour")
    return _anneau(n)[k % (6 * n)]


def _trajet(brut):
    """Étapes ordonnées : [(coordonnées, rôle, rang), ...]."""
    etapes = []
    for i, bout in enumerate(brut.split(">")):
        if ":" not in bout:
            continue
        nom, _, role = bout.partition(":")
        c = _case(nom)
        if c is None:
            raise ErreurCoup(f"case inconnue « {nom} » dans le trajet « {brut} »")
        role = role.strip()
        if role not in ("frappe", "passe"):
            raise ErreurCoup(f"rôle inconnu « {role} » dans le trajet « {brut} »")
        etapes.append((c, role, i + 1))
    return etapes


def carte_svg(brut, pas=None):
    etapes = _trajet(brut)
    par_case = {c: (role, rang) for c, role, rang in etapes}

    quittee = None
    if pas:
        if pas not in PAS:
            raise ErreurCoup(f"pas inconnu « {pas} »")
        quittee = PAS[pas][0]

    largeur = RAYON_CASE * (1.5 * PORTEE_MAX + 1)
    hauteur = RAYON_CASE * SQ3 * (PORTEE_MAX + 0.5)
    out = [
        f'<svg class="geste-carte" role="img" aria-label="Trajet du coup : {brut}" '
        f'viewBox="{-largeur:.1f} {-hauteur:.1f} {2 * largeur:.1f} {2 * hauteur:.1f}">'
    ]

    for q in range(-PORTEE_MAX, PORTEE_MAX + 1):
        for r in range(-PORTEE_MAX, PORTEE_MAX + 1):
            if _distance(q, r) > PORTEE_MAX:
                continue
            cx, cy = _centre(q, r)
            role, _ = par_case.get((q, r), (None, None))
            classe = {"frappe": "hx-frappe", "passe": "hx-passe"}.get(role, "hx-vide")
            out.append(
                f'<polygon class="{classe}" points="{_sommets(cx, cy, RAYON_CASE - 0.7)}"/>'
            )

    # La case quittée, et la flèche qui en vient : le pas est un prérequis du
    # coup, non une de ses étapes, donc il se dessine à part et en pointillé.
    if quittee:
        cx, cy = _centre(*quittee)
        out.append(
            f'<polygon class="hx-quittee" points="{_sommets(cx, cy, RAYON_CASE - 1.6)}"/>'
        )
        d = math.hypot(cx, cy)
        if d:
            ux, uy = cx / d, cy / d
            out.append(
                f'<path class="hx-pas" d="M {cx - ux * 4.2:.2f} {cy - uy * 4.2:.2f} '
                f'L {ux * 5.4:.2f} {uy * 5.4:.2f}"/>'
            )

    # Le rang de chaque étape, posé par-dessus les cases : c'est l'ordre dans
    # lequel le coup les traverse, et donc l'ordre où il s'interrompt.
    # La case du porteur porte son rang comme les autres : depuis que le triangle
    # a disparu, un coup au contact s'y lit.
    for (q, r), role, rang in etapes:
        cx, cy = _centre(q, r)
        out.append(
            f'<text class="hx-rang hx-rang--{role}" x="{cx:.2f}" y="{cy:.2f}" '
            f'dy="0.34em">{rang}</text>'
        )

    # La case du porteur : un contour, et rien dans la case. Le triangle qui s'y
    # tenait la bouchait, or elle est frappable — un coup au contact s'y porte —
    # et il faut l'y voir. Son arête du HAUT est doublée : c'est le côté qu'il
    # regarde, et c'est tout ce qui reste pour dire son orientation.
    s = RAYON_CASE - 0.7
    out.append(f'<polygon class="hx-soi" points="{_sommets(0, 0, s)}"/>')
    out.append(
        f'<path class="hx-soi-face" d="M {-0.5 * s:.2f} {-0.866 * s:.2f} '
        f'L {0.5 * s:.2f} {-0.866 * s:.2f}"/>'
    )
    out.append("</svg>")
    return "".join(out)


def _garde_centre(i):
    col, rang = (i - 1) % 3, (i - 1) // 3
    return 4.0 + 8.0 * col, 4.0 + 8.0 * rang


# Les neuf gardes, dites en toutes lettres : le carré ne porte AUCUN chiffre,
# un numéro de case ne voulant rien dire pour qui lit. Ces libellés ne servent
# qu'à l'aria-label, pour qui n'a pas l'image.
_HAUTEUR = {0: "au-dessus des épaules", 1: "à hauteur de poitrine",
            2: "sous la ceinture"}
_COTE = {0: "à gauche", 1: "dans l'axe", 2: "à droite"}


def _dit_garde(i):
    return f"mains {_HAUTEUR[(i - 1) // 3]}, {_COTE[(i - 1) % 3]}"


def garde_svg(brut):
    """Le carré des gardes : départ cerclé, arrivée pleine, flèche entre les deux."""
    bouts = [b.strip() for b in brut.split(">")]
    if len(bouts) != 2 or not all(b.isdigit() and 1 <= int(b) <= 9 for b in bouts):
        raise ErreurCoup(f"garde illisible « {brut} » : attendu « n>n », de 1 à 9")
    depart, arrivee = int(bouts[0]), int(bouts[1])

    dit = (f"Part de la garde {_dit_garde(depart)}, "
           f"finit {_dit_garde(arrivee)}" if depart != arrivee
           else f"Part et finit dans la même garde, {_dit_garde(depart)}")
    out = [f'<svg class="garde-carre" role="img" aria-label="{dit}." '
           f'viewBox="0 0 24 24">']
    for i in range(1, 10):
        cx, cy = _garde_centre(i)
        out.append(f'<rect class="gd-case" x="{cx - 3.4:.1f}" y="{cy - 3.4:.1f}" '
                   f'width="6.8" height="6.8" rx="1"/>')

    ax, ay = _garde_centre(depart)
    bx, by = _garde_centre(arrivee)
    if depart != arrivee:
        d = math.hypot(bx - ax, by - ay)
        ux, uy = (bx - ax) / d, (by - ay) / d
        # La pointe de la flèche porte à elle seule le sens du mouvement : sans
        # chiffre, c'est elle qu'on lit, le cercle et le point ne font que
        # confirmer. Elle s'arrête au bord du disque d'arrivée.
        px, py = bx - ux * 3.6, by - uy * 3.6
        nx, ny = -uy, ux
        out.append(f'<path class="gd-fleche" d="M {ax + ux * 3.4:.2f} {ay + uy * 3.4:.2f} '
                   f'L {px:.2f} {py:.2f}"/>')
        out.append(
            f'<path class="gd-pointe" d="M {px:.2f} {py:.2f} '
            f'L {px - ux * 2.4 + nx * 1.5:.2f} {py - uy * 2.4 + ny * 1.5:.2f} '
            f'L {px - ux * 2.4 - nx * 1.5:.2f} {py - uy * 2.4 - ny * 1.5:.2f} Z"/>')
    out.append(f'<circle class="gd-depart" cx="{ax:.1f}" cy="{ay:.1f}" r="2.4"/>')
    out.append(f'<circle class="gd-arrivee" cx="{bx:.1f}" cy="{by:.1f}" r="2.4"/>')
    out.append("</svg>")
    return "".join(out), depart, arrivee


def chiffres_html(brut, a_du_blanc):
    """« 20 TRA / CON » : la moitié blanche est calculée, jamais écrite."""
    m = re.match(r"^\s*(\d+)\s+(CON|PER|TRA)\s*(?:/\s*(CON|PER|TRA)\s*)?$", brut)
    if not m:
        raise ErreurCoup(
            f"dégâts illisibles « {brut} » : attendu « N TYPE » ou « N TYPE / TYPE »")
    vert, tv, tb = int(m.group(1)), m.group(2), m.group(3)
    if vert % 2:
        raise ErreurCoup(
            f"dégâts verts impairs ({vert}) : la case blanche en vaut la moitié, "
            f"la valeur verte doit être paire")
    if a_du_blanc and tb is None:
        raise ErreurCoup(
            f"« {brut} » : ce coup a des cases blanches, il lui faut un second type")
    if not a_du_blanc and tb is not None:
        raise ErreurCoup(
            f"« {brut} » : ce coup n'a aucune case blanche, le second type est de trop")
    html = f'<p class="geste-chiffres"><b>{vert}</b> {tv}'
    if tb:
        html += f'<span class="dg-passe"><b>{vert // 2}</b> {tb}</span>'
    return html + "</p>"


def _rendu(attrs):
    """Ce qui se dessine avant le nom, et ce qui se pose après."""
    trajet = attrs.get("trajet")
    if not trajet:
        return "", ""
    pas = attrs.get("pas") or None
    avant = carte_svg(trajet, pas)

    apres = []
    a_du_blanc = any(b.endswith(":passe") for b in trajet.split(">"))
    if "degats" in attrs:
        apres.append(chiffres_html(attrs["degats"], a_du_blanc))

    if "garde" in attrs:
        svg, _, _ = garde_svg(attrs["garde"])
        apres.append(f'<p class="geste-garde">{svg}</p>')

    if pas:
        apres.append(f'<p class="geste-pas">exige un {PAS[pas][1]}</p>')
    return avant, "".join(apres)


def on_page_content(html, page, config, files):
    if 'data-trajet="' not in html:
        return html

    def rendre(m):
        attrs = dict(ATTR.findall(m.group(2)))
        try:
            avant, apres = _rendu(attrs)
        except ErreurCoup as e:
            raise ErreurCoup(f"{page.file.src_path} : {e}") from None
        return m.group(1) + avant + m.group(3) + apres

    return COUP.sub(rendre, html)
