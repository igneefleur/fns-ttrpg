"""Que voit-on RÉELLEMENT, une fois la pose de repos appliquée ?

On projette les huit faces telles que le code les pose (mêmes nombres, mêmes
transformations, dans le même ordre), on applique la pose de repos, et on regarde
la silhouette obtenue ainsi que les faces tournées vers le lecteur.

Un octaèdre vu de face montre un HEXAGONE et 3 ou 4 faces. S'il sort un losange,
le défaut est dans les nombres ; s'il sort un hexagone, le défaut est au rendu.
"""
import json
import math
import re
import sys

TABLE = sys.argv[1] if len(sys.argv) > 1 else "table_solides.js"
INCL_X, INCL_Y = -14.0, 18.0


def rot(axe, a):
    c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
    if axe == "x":
        return ((1, 0, 0), (0, c, -s), (0, s, c))
    if axe == "y":
        return ((c, 0, s), (0, 1, 0), (-s, 0, c))
    return ((c, -s, 0), (s, c, 0), (0, 0, 1))


def mm(*ms):
    r = ((1, 0, 0), (0, 1, 0), (0, 0, 1))
    for m in ms:
        r = tuple(tuple(sum(r[i][k] * m[k][j] for k in range(3)) for j in range(3))
                  for i in range(3))
    return r


def mul(m, p):
    return tuple(sum(m[i][j] * p[j] for j in range(3)) for i in range(3))


src = open(TABLE, encoding="utf-8").read()


def solide(n):
    # Une entrée se termine par « ] }, » ou « ] }\n  }; » — s'arrêter au premier
    # « } » venu avalait tous les solides suivants (un d4 sortait avec 29 faces).
    m = re.search(r"\n\s*%d: \{(.*?)\]\s*\}" % n, src, re.S)
    b = m.group(1) + "]"
    val = lambda k: float(re.search(r"\b%s: (-?[\d.]+)" % k, b).group(1))
    poly = re.search(r'poly: "polygon\((.*?)\)"', b).group(1)
    pts = []
    for p in poly.split(", "):
        x, y = p.split()
        pts.append((float(x.rstrip("%")), float(y.rstrip("%"))))
    faces = [tuple(float(x) for x in t.split(","))
             for t in re.findall(r"\[(-?[\d.]+,-?[\d.]+,-?[\d.]+)\]", b)]
    return dict(d=val("d"), w=val("w"), h=val("h"), ox=val("ox"), oy=val("oy"),
                poly=pts, f=faces,
                repos=re.search(r'repos: "(.*?)"', b).group(1))


def repos_matrice(txt):
    ms = []
    for axe, a in re.findall(r"rotate([XYZ])\((-?[\d.]+)deg\)", txt):
        ms.append(rot(axe.lower(), float(a)))
    return mm(*ms)


def silhouette(n):
    s = solide(n)
    # les sommets du polygone, en px, RELATIFS au centre de gravité (l'origine
    # des transformations) — exactement ce que fait le navigateur
    cx, cy = s["w"] * s["ox"] / 100, s["h"] * s["oy"] / 100
    loc = [(p[0] / 100 * s["w"] - cx, p[1] / 100 * s["h"] - cy) for p in s["poly"]]

    cont = mm(rot("x", INCL_X), rot("y", INCL_Y), repos_matrice(s["repos"]))
    pts2, devant = [], 0
    for (th, ph, ps) in s["f"]:
        m = mm(cont, rot("y", th), rot("x", ph), rot("z", ps))
        nz = mul(m, (0, 0, 1))[2]
        if nz > 0.01:
            devant += 1
        for (x, y) in loc:
            p = mul(m, (x, y, s["d"]))
            pts2.append((round(p[0], 2), round(p[1], 2)))

    # enveloppe convexe 2D (parcours de Graham simplifié)
    pts2 = sorted(set(pts2))
    def crot(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    bas, haut = [], []
    for p in pts2:
        while len(bas) >= 2 and crot(bas[-2], bas[-1], p) <= 0:
            bas.pop()
        bas.append(p)
    for p in reversed(pts2):
        while len(haut) >= 2 and crot(haut[-2], haut[-1], p) <= 0:
            haut.pop()
        haut.append(p)
    hull = bas[:-1] + haut[:-1]
    return s, hull, devant


for n in (4, 6, 8, 10, 12, 20):
    s, hull, devant = silhouette(n)
    xs = [p[0] for p in hull]
    ys = [p[1] for p in hull]
    nom = {4: "losange/triangle", 6: "hexagone", 8: "hexagone",
           10: "hexagone", 12: "décagone", 20: "décagone"}[n]
    print(f"  d{n:<3} silhouette à {len(hull)} côtés · "
          f"{max(xs)-min(xs):5.1f} × {max(ys)-min(ys):5.1f} px · "
          f"{devant} face(s) devant   (attendu ~{nom})")
