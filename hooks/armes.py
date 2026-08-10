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
    1d, 2d...        la colonne voisine de droite, au même anneau
    1g, 2g...        la colonne voisine de gauche

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

ETAPE = re.compile(r"^(soi|(\d+)([gd]?))$")
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


def _case(nom):
    """Coordonnées axiales d'une case nommée, le porteur regardant vers le haut.

    En sommet plat, la case de devant est (0, -N). Ses deux voisines du même
    anneau sont (1, -N) à droite, l'axe des q allant vers l'est, et (-1, -N+1)
    à gauche.
    """
    m = ETAPE.match(nom.strip())
    if not m:
        return None
    if m.group(1) == "soi":
        return (0, 0)
    n, cote = int(m.group(2)), m.group(3)
    if cote == "d":
        return (1, -n)
    if cote == "g":
        return (-1, -n + 1)
    return (0, -n)


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
    for (q, r), role, rang in etapes:
        if (q, r) == (0, 0):
            continue   # la case du porteur porte déjà son triangle
        cx, cy = _centre(q, r)
        out.append(
            f'<text class="hx-rang hx-rang--{role}" x="{cx:.2f}" y="{cy:.2f}" '
            f'dy="0.34em">{rang}</text>'
        )

    # Le porteur : un triangle qui pointe vers le haut, et rien d'autre.
    h = RAYON_CASE * 0.58
    out.append(
        f'<path class="hx-perso" d="M 0 -{h:.2f} '
        f'L {h * 0.80:.2f} {h * 0.62:.2f} L -{h * 0.80:.2f} {h * 0.62:.2f} Z"/>'
    )
    out.append("</svg>")
    return "".join(out)


def _garde_centre(i):
    col, rang = (i - 1) % 3, (i - 1) // 3
    return 4.0 + 8.0 * col, 4.0 + 8.0 * rang


def garde_svg(brut):
    """Le carré des neuf gardes, départ cerclé, arrivée pleine, flèche entre les deux."""
    bouts = [b.strip() for b in brut.split(">")]
    if len(bouts) != 2 or not all(b.isdigit() and 1 <= int(b) <= 9 for b in bouts):
        raise ErreurCoup(f"garde illisible « {brut} » : attendu « n>n », de 1 à 9")
    depart, arrivee = int(bouts[0]), int(bouts[1])

    out = [f'<svg class="garde-carre" role="img" '
           f'aria-label="Garde de départ {depart}, garde d\'arrivée {arrivee}" '
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
        out.append(f'<path class="gd-fleche" d="M {ax + ux * 3.2:.2f} {ay + uy * 3.2:.2f} '
                   f'L {bx - ux * 3.4:.2f} {by - uy * 3.4:.2f}"/>')
    out.append(f'<circle class="gd-depart" cx="{ax:.1f}" cy="{ay:.1f}" r="2.5"/>')
    out.append(f'<circle class="gd-arrivee" cx="{bx:.1f}" cy="{by:.1f}" r="2.5"/>')
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
        svg, depart, arrivee = garde_svg(attrs["garde"])
        apres.append(f'<p class="geste-garde">{svg}'
                     f'<span>garde {depart}&#8239;&rarr;&#8239;{arrivee}</span></p>')

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
