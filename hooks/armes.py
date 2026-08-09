"""Cartes d'armes : dessine l'empreinte hexagonale de chaque geste, au build.

Chaque geste d'une arme porte, dans le markdown, un attribut ``data-zone`` qui
dit quelles cases il couvre. Le personnage occupe le centre et regarde vers le
HAUT ; la zone se lit donc relativement à lui.

    soi         la case du personnage lui-même, le contact absolu
    pointe:2    une seule case, droit devant, à deux cases
    arc:2       trois cases contiguës à deux cases, la frappe qui balaie
    ligne:3     les trois cases alignées devant, l'estoc qui traverse

Les hexagones sont à SOMMET PLAT : c'est la seule orientation où il existe une
case droit devant, ce qu'une empreinte orientée exige. Le rayon de la carte est
de trois cases, la plus longue portée du chapitre.

Le dessin se fait ici plutôt qu'en JavaScript : le SVG part dans la page
construite, donc il s'affiche sans script, se retrouvera dans le PDF, et se
vérifie en lisant le HTML.
"""

import math
import re

RAYON_CASE = 10.0   # rayon du cercle circonscrit d'un hexagone, en unités SVG
PORTEE_MAX = 3      # rayon de la carte, en cases
SQ3 = math.sqrt(3.0)

GESTE = re.compile(
    r'(<div class="geste" data-zone="([^"]*)">)',
)


def _sommets(cx, cy, rayon):
    """Hexagone à sommet plat : le premier sommet est à l'est."""
    pts = []
    for i in range(6):
        angle = math.radians(60 * i)
        pts.append(f"{cx + rayon * math.cos(angle):.2f},{cy + rayon * math.sin(angle):.2f}")
    return " ".join(pts)


def _distance(q, r):
    """Distance en cases entre l'origine et (q, r), en coordonnées axiales."""
    return (abs(q) + abs(q + r) + abs(r)) // 2


def _cases(zone):
    """Ensemble des cases couvertes par une zone, le personnage regardant le haut.

    En sommet plat, la case droit devant est (0, -1) : c'est la seule orientation
    qui offre un devant franc, un sommet pointu n'ayant que deux cases obliques.
    """
    zone = zone.strip()
    if zone == "soi":
        return {(0, 0)}

    forme, _, valeur = zone.partition(":")
    try:
        n = int(valeur)
    except ValueError:
        return set()

    if forme == "pointe":
        return {(0, -n)}
    if forme == "ligne":
        return {(0, -i) for i in range(1, n + 1)}
    if forme == "arc":
        # La case de devant et ses deux voisines du même anneau.
        return {(0, -n), (1, -n), (-1, -n + 1)}
    return set()


def carte_svg(zone):
    couvertes = _cases(zone)
    largeur = RAYON_CASE * (1.5 * PORTEE_MAX + 1)
    hauteur = RAYON_CASE * SQ3 * (PORTEE_MAX + 0.5)

    out = [
        f'<svg class="geste-carte" role="img" aria-label="Zone du geste : {zone}" '
        f'viewBox="{-largeur:.1f} {-hauteur:.1f} {2 * largeur:.1f} {2 * hauteur:.1f}">'
    ]

    for q in range(-PORTEE_MAX, PORTEE_MAX + 1):
        for r in range(-PORTEE_MAX, PORTEE_MAX + 1):
            if _distance(q, r) > PORTEE_MAX:
                continue
            cx = RAYON_CASE * 1.5 * q
            cy = RAYON_CASE * SQ3 * (r + q / 2.0)

            if (q, r) in couvertes:
                classe = "hx-zone"
            elif (q, r) == (0, 0):
                classe = "hx-soi"
            else:
                classe = "hx-vide"

            out.append(
                f'<polygon class="{classe}" points="{_sommets(cx, cy, RAYON_CASE - 0.7)}"/>'
            )

    # Le personnage : un disque au centre, et un chevron qui dit où il regarde.
    if (0, 0) not in couvertes:
        out.append(f'<circle class="hx-perso" cx="0" cy="0" r="{RAYON_CASE * 0.26:.2f}"/>')
    out.append(
        f'<path class="hx-regard" d="M -{RAYON_CASE * 0.30:.2f} -{RAYON_CASE * 0.46:.2f} '
        f'L 0 -{RAYON_CASE * 0.74:.2f} L {RAYON_CASE * 0.30:.2f} -{RAYON_CASE * 0.46:.2f}"/>'
    )
    out.append("</svg>")
    return "".join(out)


def on_page_content(html, page, config, files):
    if 'class="geste"' not in html:
        return html
    return GESTE.sub(lambda m: m.group(1) + carte_svg(m.group(2)), html)
