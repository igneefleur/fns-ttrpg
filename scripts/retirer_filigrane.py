#!/usr/bin/env python3
"""Retire le filigrane d'un générateur d'images (l'étoile à quatre branches que
Gemini pose dans un coin) et rebouche le trou avec la texture voisine.

    python scripts/retirer_filigrane.py entree.png sortie.png
    python scripts/retirer_filigrane.py entree.png sortie.png --coin bg
    python scripts/retirer_filigrane.py entree.png sortie.png --boite 732 1149 758 1175

Le filigrane est cherché AUTOMATIQUEMENT : dans le coin indiqué, c'est la tache
la plus PROCHE DU COIN qui soit à la fois plus claire que son voisinage,
DÉSATURÉE, et de la FORME attendue — petite, à peu près carrée.

Les trois conditions sont nécessaires. Clarté et désaturation seules suffisaient
tant qu'on traitait un sac de cuir ; sur une image de verrerie elles désignent le
verre lui-même, clair et gris, et le script a d'abord retenu le bord de la
bouteille (25 x 267 px). D'où le test de forme, et le choix de la tache la plus
proche du coin plutôt que de la plus grosse.

Le RAYON DU FLOU qui sert de fond suit la largeur de l'image (1.8 %), sans quoi
une grande étoile se dilue dans son propre halo : mesuré sur une étoile de 60 px
dans une image de 1664 de large, l'écart de clarté tombe à 10 avec un rayon fixe
de 9, contre 35 au rayon adapté de 30.

Le rebouchage recopie un MORCEAU VOISIN, choisi parmi plusieurs décalages : celui
dont le pourtour ressemble le plus à celui du trou. Deux méthodes plus simples
ont été essayées et rejetées — une propagation par moyenne, qui donne une
bouillie lisse plus voyante que le filigrane, et une recopie du symétrique de
l'image, qui va chercher sa source à l'autre bout d'un fond dégradé et pose une
rustine plus claire que son entourage.

N'exige que Pillow.
"""

import argparse
import sys
from collections import deque

from PIL import Image, ImageFilter

COINS = {"bd": (1, 1), "bg": (0, 1), "hd": (1, 0), "hg": (0, 0)}


def _luminance(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def trouver(im, coin="bd", part=0.22, ecart=26, satmax=42, flou=None, verbeux=True):
    """Rend l'ensemble des pixels du filigrane, ou None s'il n'en trouve pas.

    Clarté et désaturation ne suffisent pas : sur une image de VERRERIE, le verre
    lui-même est clair et gris, et la plus grosse tache trouvée est alors le bord
    de la bouteille. Il faut y ajouter la FORME — l'étoile est petite, à peu près
    carrée, et collée au coin — puis choisir la plus proche du coin, et non la
    plus grosse.
    """
    W, H = im.size
    p = im.load()
    # LE RAYON DU FLOU DOIT SUIVRE LA TAILLE DE L'IMAGE, sans quoi une grande
    # étoile se dilue dans son propre halo et devient invisible au test. Mesuré :
    # étoile de 60 px sur 1664 de large, écart moyen 10 à rayon 9 (sous le seuil)
    # contre 35 à rayon 30. La moitié du côté attendu est le bon calage.
    r = flou if flou else max(6, round(W * 0.018))
    fond = im.filter(ImageFilter.GaussianBlur(r)).load()
    fx, fy = COINS[coin]
    x0 = int(W * (1 - part)) if fx else 0
    x1 = W if fx else int(W * part)
    y0 = int(H * (1 - part)) if fy else 0
    y1 = H if fy else int(H * part)
    cx0, cy0 = (W - 1 if fx else 0), (H - 1 if fy else 0)

    # L'étoile mesure environ 3 % de la largeur : mesurée à 23 px sur 800 (2.9 %)
    # et à 60 px sur 1664 (3.6 %). On accepte de 1.2 % à 7 %.
    cotemin, cotemax = max(4, int(W * 0.012)), max(12, int(W * 0.07))

    cand = set()
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = p[x, y]
            if _luminance(c) - _luminance(fond[x, y]) < ecart:
                continue
            if max(c[:3]) - min(c[:3]) > satmax:      # une couleur franche n'est pas le logo
                continue
            cand.add((x, y))
    if not cand:
        return None

    vu, retenus, rejets = set(), [], []
    for germe in cand:
        if germe in vu:
            continue
        q, cel = deque([germe]), []
        vu.add(germe)
        while q:
            ax, ay = q.popleft()
            cel.append((ax, ay))
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    n = (ax + dx, ay + dy)
                    if n in cand and n not in vu:
                        vu.add(n)
                        q.append(n)
        xs = [a for a, _ in cel]
        ys = [b for _, b in cel]
        larg, haut = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
        rapport = larg / haut
        remplissage = len(cel) / (larg * haut)
        motif = (cotemin <= larg <= cotemax and cotemin <= haut <= cotemax
                 and 0.6 <= rapport <= 1.6 and remplissage >= 0.30)
        cible = (larg, haut, round(rapport, 2), round(remplissage, 2), len(cel))
        (retenus if motif else rejets).append((cel, cible))

    if not retenus:
        if verbeux and rejets:
            pire = max(rejets, key=lambda r: len(r[0]))[1]
            print(f"aucune tache en forme d'étoile ; la plus grosse rejetée faisait "
                  f"{pire[0]}x{pire[1]} px (rapport {pire[2]}, remplissage {pire[3]})")
        return None

    # la plus PROCHE DU COIN, pas la plus grosse
    def dcoin(r):
        xs = [a for a, _ in r[0]]
        ys = [b for _, b in r[0]]
        mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
        return (mx - cx0) ** 2 + (my - cy0) ** 2
    retenus.sort(key=dcoin)
    cel, cible = retenus[0]
    if verbeux:
        print(f"étoile : {cible[0]}x{cible[1]} px, rapport {cible[2]}, "
              f"remplissage {cible[3]}, {len(retenus)} candidate(s) en lice")
    return set(cel)


def effacer(im, zone, dilat=3, flou=0.9, portee=90, pas=6):
    """Rebouche `zone` avec le morceau voisin dont le pourtour lui ressemble le plus."""
    W, H = im.size
    p = im.load()
    trou = set(zone)
    for _ in range(dilat):                 # le halo du logo déborde de son tracé
        for x, y in list(trou):
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    n = (x + dx, y + dy)
                    if 0 <= n[0] < W and 0 <= n[1] < H:
                        trou.add(n)

    src = im.copy().load()
    # Le POURTOUR du trou : c'est lui qui sert de témoin pour juger un décalage.
    anneau = [(x, y) for x, y in
              {(x + dx, y + dy) for x, y in trou for dx in (-3, 0, 3) for dy in (-3, 0, 3)}
              if (x, y) not in trou and 0 <= x < W and 0 <= y < H]

    xs = [x for x, _ in trou]
    ys = [y for _, y in trou]
    larg, haut = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1

    meilleur, score_min = None, None
    for dy in range(-portee, portee + 1, pas):
        for dx in range(-portee, portee + 1, pas):
            if abs(dx) < larg and abs(dy) < haut:
                continue                    # le décalage doit sortir du trou
            if any(not (0 <= x + dx < W and 0 <= y + dy < H) for x, y in trou):
                continue
            if any((x + dx, y + dy) in trou for x, y in trou):
                continue
            s = n = 0
            for (x, y) in anneau:
                ax, ay = x + dx, y + dy
                if not (0 <= ax < W and 0 <= ay < H):
                    s = None
                    break
                a, b = src[x, y], src[ax, ay]
                s += sum((a[i] - b[i]) ** 2 for i in range(3))
                n += 1
            if s is None or not n:
                continue
            s /= n
            if score_min is None or s < score_min:
                score_min, meilleur = s, (dx, dy)

    if meilleur is None:                   # dernier recours : propagation par moyenne
        en_cours = set(trou)
        while en_cours:
            avance = []
            for (x, y) in list(en_cours):
                vs = [p[x + dx, y + dy] for dx in (-1, 0, 1) for dy in (-1, 0, 1)
                      if 0 <= x + dx < W and 0 <= y + dy < H and (x + dx, y + dy) not in en_cours]
                if vs:
                    avance.append(((x, y), tuple(sum(v[i] for v in vs) // len(vs) for i in range(3))))
            if not avance:
                break
            for pos, col in avance:
                p[pos] = col
                en_cours.discard(pos)
    else:
        dx, dy = meilleur
        print(f"morceau pris à ({dx:+d},{dy:+d}), écart de pourtour {score_min:.0f}")
        for (x, y) in trou:
            p[x, y] = src[x + dx, y + dy]

    doux = im.filter(ImageFilter.GaussianBlur(flou)).load()   # n'adoucir que la couture
    for (x, y) in trou:
        if any((x + dx2, y + dy2) not in trou for dx2 in (-1, 0, 1) for dy2 in (-1, 0, 1)):
            p[x, y] = doux[x, y]
    return len(trou)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("entree")
    ap.add_argument("sortie")
    ap.add_argument("--coin", choices=sorted(COINS), default="bd",
                    help="coin où chercher : bd (défaut), bg, hd, hg")
    ap.add_argument("--boite", nargs=4, type=int, metavar=("X0", "Y0", "X1", "Y1"),
                    help="forcer la zone au lieu de la chercher")
    ap.add_argument("--ecart", type=int, default=26,
                    help="écart de clarté minimal avec le voisinage (défaut 26)")
    ap.add_argument("--flou", type=int,
                    help="rayon du flou qui sert de fond (défaut : 1.8 %% de la largeur)")
    args = ap.parse_args()

    im = Image.open(args.entree)
    alpha = im.getchannel("A") if im.mode == "RGBA" else None
    im = im.convert("RGB")

    if args.boite:
        x0, y0, x1, y1 = args.boite
        zone = {(x, y) for y in range(y0, y1) for x in range(x0, x1)}
        print(f"zone imposée : {len(zone)} px en ({x0},{y0})-({x1},{y1})")
    else:
        zone = trouver(im, args.coin, ecart=args.ecart, flou=args.flou)
        if zone is None:
            print("aucun filigrane trouvé — baisser --ecart, changer --coin, "
                  "ou donner --boite", file=sys.stderr)
            return 1
        xs = [x for x, _ in zone]
        ys = [y for _, y in zone]
        print(f"filigrane trouvé : {len(zone)} px, boîte "
              f"({min(xs)},{min(ys)})-({max(xs) + 1},{max(ys) + 1})")

    n = effacer(im, zone)
    print(f"{n} px rebouchés")
    if alpha is not None:
        im.putalpha(alpha)
    im.save(args.sortie)
    print(f"écrit : {args.sortie}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
