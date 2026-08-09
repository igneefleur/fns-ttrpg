"""Cartes d'armes : dessine la carte hexagonale de portée, au build.

Chaque arme du chapitre porte, dans le markdown, un attribut ``data-cases`` qui
reprend mot pour mot sa ligne dans la table des portées : six valeurs séparées
par des virgules, une par anneau, de la case 0 à la case 5.

    "2,1,0,,,"      épée d'armes : +2 au contact, +1 à une case, idéale à deux
    "0,0,,,,"       couteau : aucune dégradation, rien au-delà d'une case
    "x,4,3,2,1,0"   pique : inutilisable au contact, idéale à cinq cases

Une valeur vide vaut hors d'atteinte, « x » vaut trop près pour servir.

Le dessin se fait ICI plutôt qu'en JavaScript : le SVG part dans la page
construite, donc il s'affiche sans script, se retrouve dans le PDF le jour où il
sera rétabli, et se vérifie en lisant le HTML. La source de vérité reste le
markdown ; ce fichier ne fait que la mettre en image.
"""

import math
import re

RAYON_CASE = 10.0   # rayon du cercle circonscrit d'un hexagone, en unités SVG
PORTEE_MAX = 5      # rayon de la carte, en cases
SQ3 = math.sqrt(3.0)

# Une carte d'arme, de son ouverture jusqu'au conteneur vide qui accueille le SVG.
CARTE = re.compile(
    r'(<div class="arme" data-cases="([^"]*)">.*?<div class="arme-map">)(</div>)',
    re.S,
)

# Le bandeau du nom, qui suit immédiatement l'ouverture de la carte : on y ajoute
# la distance idéale, déduite du même data-cases plutôt que saisie à la main.
NOM = re.compile(
    r'(<div class="arme" data-cases="([^"]*)">\s*<p class="arme-nom">)([^<]*)(</p>)'
)


def _sommets(cx, cy, rayon):
    """Hexagone pointe en haut : le premier sommet est à midi."""
    pts = []
    for i in range(6):
        angle = math.radians(60 * i - 90)
        pts.append(f"{cx + rayon * math.cos(angle):.2f},{cy + rayon * math.sin(angle):.2f}")
    return " ".join(pts)


def _etat(valeur):
    """Classe CSS et libellé d'une case, à partir de sa valeur dans data-cases."""
    valeur = valeur.strip()
    if valeur in ("x", "X"):
        return "hx-x", "×"
    if valeur == "":
        return "hx-off", ""
    try:
        n = int(valeur)
    except ValueError:
        return "hx-off", ""
    if n == 0:
        return "hx-0", "0"
    return f"hx-{min(n, 4)}", f"+{n}"


def _distance(q, r):
    """Distance en cases entre l'origine et (q, r), en coordonnées axiales."""
    return (abs(q) + abs(r) + abs(q + r)) // 2


def carte_svg(cases_brut):
    cases = cases_brut.split(",")
    largeur = RAYON_CASE * SQ3 * (PORTEE_MAX + 0.5)
    hauteur = RAYON_CASE * (1.5 * PORTEE_MAX + 1)

    morceaux = [
        f'<svg class="arme-carte" role="img" aria-label="Carte des portées" '
        f'viewBox="{-largeur:.1f} {-hauteur:.1f} {2 * largeur:.1f} {2 * hauteur:.1f}">'
    ]

    for q in range(-PORTEE_MAX, PORTEE_MAX + 1):
        for r in range(-PORTEE_MAX, PORTEE_MAX + 1):
            d = _distance(q, r)
            if d > PORTEE_MAX:
                continue
            classe, libelle = _etat(cases[d] if d < len(cases) else "")
            cx = RAYON_CASE * SQ3 * (q + r / 2.0)
            cy = RAYON_CASE * 1.5 * r
            morceaux.append(f'<g class="hx {classe}">')
            morceaux.append(f'<polygon points="{_sommets(cx, cy, RAYON_CASE - 0.6)}"/>')
            if libelle:
                morceaux.append(f'<text x="{cx:.2f}" y="{cy:.2f}" dy="0.34em">{libelle}</text>')
            morceaux.append("</g>")

    morceaux.append("</svg>")
    return "".join(morceaux)


def distance_ideale(cases_brut):
    """Anneau où l'arme n'ajoute rien, c'est-à-dire le plus lointain marqué 0.

    Le couteau porte deux zéros, à la case 0 et à la case 1 : sa distance idéale
    est la plus lointaine des deux, celle jusqu'où il atteint sans rien ajouter.
    """
    anneaux = [i for i, v in enumerate(cases_brut.split(",")) if v.strip() == "0"]
    return anneaux[-1] if anneaux else None


def libelle_portee(cases_brut):
    d = distance_ideale(cases_brut)
    if d is None:
        return ""
    if d == 0:
        return "au contact"
    return f"idéale à {d} case" + ("s" if d > 1 else "")


def on_page_content(html, page, config, files):
    if 'class="arme"' not in html:
        return html
    html = CARTE.sub(lambda m: m.group(1) + carte_svg(m.group(2)) + m.group(3), html)
    html = NOM.sub(
        lambda m: m.group(1) + m.group(3)
        + f'<span class="arme-portee">{libelle_portee(m.group(2))}</span>'
        + m.group(4),
        html,
    )
    return html
