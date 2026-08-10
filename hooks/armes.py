"""Cartes d'armes : dessine le trajet hexagonal de chaque coup, au build.

Un coup ne se pose pas sur une zone : il PARCOURT l'espace, case après case, dans
l'ordre, et s'interrompt au premier obstacle. Chaque coup porte donc, dans le
markdown, un attribut ``data-trajet`` qui donne ses étapes ordonnées.

    data-trajet="1:libre>2:libre>3:frappe"     un estoc à trois cases
    data-trajet="1d:libre>2d:frappe"           une taille qui part de la droite
    data-trajet="soi:frappe"                   un coup au contact

Chaque étape vaut :
    libre    la case doit être libre ; le coup ne fait qu'y passer, et un corps
             qui s'y trouve l'arrête, annulant la suite du trajet
    frappe   la case est frappée

NOMMAGE DES CASES, le porteur étant au centre et regardant vers le haut :
    soi              sa propre case
    1, 2, 3, 4       droit devant, à N pas
    1d, 2d...        la voisine de droite au même anneau
    1g, 2g...        la voisine de gauche

Une case vaut UN PAS, soit 0.75 m. Les hexagones sont à SOMMET PLAT :
c'est la seule orientation qui offre une case droit devant, ce qu'un trajet
orienté exige.

Le dessin se fait ici plutôt qu'en JavaScript : le SVG part dans la page
construite, donc il s'affiche sans script, se retrouvera dans le PDF, et se
vérifie en lisant le HTML.
"""

import math
import re

RAYON_CASE = 10.0   # rayon du cercle circonscrit d'un hexagone, en unités SVG
PORTEE_MAX = 3      # rayon de la carte, en cases ; plus rien ne porte au-dela
SQ3 = math.sqrt(3.0)

COUP = re.compile(r'(<div class="geste" data-trajet="([^"]*)">)')
ETAPE = re.compile(r"^(soi|(\d+)([gd]?))$")


def _sommets(cx, cy, rayon):
    """Hexagone à sommet plat : le premier sommet est à l'est."""
    return " ".join(
        f"{cx + rayon * math.cos(math.radians(60 * i)):.2f},"
        f"{cy + rayon * math.sin(math.radians(60 * i)):.2f}"
        for i in range(6)
    )


def _distance(q, r):
    return (abs(q) + abs(q + r) + abs(r)) // 2


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
            continue
        etapes.append((c, role.strip(), i + 1))
    return etapes


def carte_svg(brut):
    etapes = _trajet(brut)
    par_case = {c: (role, rang) for c, role, rang in etapes}

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
            cx = RAYON_CASE * 1.5 * q
            cy = RAYON_CASE * SQ3 * (r + q / 2.0)
            role, rang = par_case.get((q, r), (None, None))
            classe = {"frappe": "hx-frappe", "libre": "hx-libre"}.get(role, "hx-vide")
            out.append(f'<polygon class="{classe}" points="{_sommets(cx, cy, RAYON_CASE - 0.7)}"/>')

    # Le rang de chaque étape, pose par-dessus les cases : c'est l'ordre dans
    # lequel le coup les traverse, et donc l'ordre ou il s'interrompt.
    for (q, r), role, rang in etapes:
        if (q, r) == (0, 0):
            continue   # la case du porteur porte deja son triangle
        cx = RAYON_CASE * 1.5 * q
        cy = RAYON_CASE * SQ3 * (r + q / 2.0)
        out.append(
            f'<text class="hx-rang hx-rang--{role}" x="{cx:.2f}" y="{cy:.2f}" dy="0.34em">{rang}</text>'
        )

    # Le porteur : un triangle qui pointe vers le haut, et rien d'autre.
    h = RAYON_CASE * 0.58
    out.append(
        f'<path class="hx-perso" d="M 0 -{h:.2f} '
        f'L {h * 0.80:.2f} {h * 0.62:.2f} L -{h * 0.80:.2f} {h * 0.62:.2f} Z"/>'
    )
    out.append("</svg>")
    return "".join(out)


def on_page_content(html, page, config, files):
    if 'data-trajet="' not in html:
        return html
    return COUP.sub(lambda m: m.group(1) + carte_svg(m.group(2)), html)
