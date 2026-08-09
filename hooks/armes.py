"""Cartes d'armes : dessine l'empreinte hexagonale de chaque geste, au build.

Chaque geste d'une arme porte, dans le markdown, un attribut ``data-zone`` qui
dit quelles cases il couvre. Le personnage occupe le centre et regarde vers le
HAUT ; la zone se lit donc relativement à lui.

    soi         la case du personnage lui-même, le contact absolu
    pointe:2    une seule case, droit devant, à deux cases
    pointe:1-2  la bande de cases où le geste travaille, de un à deux pas
    arc2:2      deux cases contiguës, la taille d'une arme à une main
    arc:2       trois cases contiguës, la taille d'une arme à deux mains
    ligne:3     les trois cases alignées devant, l'estoc qui traverse

Une case vaut UN PAS, soit environ 0.7 m. Cette taille n'est pas une commodité :
c'est celle qui sépare le mieux les portées réelles des armes, un mètre écrasant
l'épée, la hache et la masse sur une seule valeur.

Un geste couvre une bande et non une distance unique : une lame qui porte à
1.48 m atteint aussi bien la case 1 que la case 2. D'où la forme à intervalle.

Les hexagones sont à SOMMET PLAT : c'est la seule orientation où il existe une
case droit devant, ce qu'une empreinte orientée exige. Le rayon de la carte est
de quatre cases, la plus longue portée du chapitre.

Le dessin se fait ici plutôt qu'en JavaScript : le SVG part dans la page
construite, donc il s'affiche sans script, se retrouvera dans le PDF, et se
vérifie en lisant le HTML.
"""

import math
import re

RAYON_CASE = 10.0   # rayon du cercle circonscrit d'un hexagone, en unités SVG
PORTEE_MAX = 4      # rayon de la carte, en cases (un pas chacune)
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

    # « pointe:1-2 » : la bande de cases où le geste travaille. Un geste ne
    # frappe pas à une distance unique mais dans un intervalle, une lame qui
    # porte à 1.48 m atteignant la case 1 comme la case 2.
    if "-" in valeur:
        try:
            a, b = (int(x) for x in valeur.split("-", 1))
        except ValueError:
            return set()
        if forme == "pointe":
            return {(0, -i) for i in range(a, b + 1)}
        return set()

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
    if forme == "arc2":
        # Deux cases seulement : une taille à une main balaie moins large. Le
        # coup vient d'un côté, l'empreinte est donc dissymétrique à dessein.
        #
        # Le livre suppose un combattant DROITIER. Une taille à une main part de
        # sa droite et finit à sa gauche : la lame a sa vitesse pleine devant lui
        # puis dans la case de gauche, qui est la seconde couverte. En q positif
        # vers la droite, cette case est (-1, -n+1).
        return {(0, -n), (-1, -n + 1)}
    return set()


def _espace(couvertes):
    """Les cases qui doivent être LIBRES pour que le coup parte.

    La ligne du coup passe entre le porteur et sa cible : un corps interpose
    l'arrête. On ne pique pas un homme à quatre pas si quelqu'un se tient à deux,
    et c'est ce qui donne son prix a une arme longue dans une melee serree.
    """
    if not couvertes:
        return set()
    d = max(_distance(q, r) for q, r in couvertes)
    if d < 2:
        return set()
    return {(0, -i) for i in range(1, d)} - couvertes


def carte_svg(zone):
    couvertes = _cases(zone)
    libres = _espace(couvertes)
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
            elif (q, r) in libres:
                classe = "hx-espace"
            else:
                classe = "hx-vide"

            out.append(
                f'<polygon class="{classe}" points="{_sommets(cx, cy, RAYON_CASE - 0.7)}"/>'
            )

    # Le personnage : un triangle qui pointe vers le haut, et rien d'autre. Il
    # dit d'un seul signe où il se tient et de quel côté il regarde.
    h = RAYON_CASE * 0.62
    out.append(
        f'<path class="hx-perso" d="M 0 -{h:.2f} '
        f'L {h * 0.80:.2f} {h * 0.62:.2f} L -{h * 0.80:.2f} {h * 0.62:.2f} Z"/>'
    )
    out.append("</svg>")
    return "".join(out)


def on_page_content(html, page, config, files):
    if 'class="geste"' not in html:
        return html
    return GESTE.sub(lambda m: m.group(1) + carte_svg(m.group(2)), html)
