# -*- coding: utf-8 -*-
"""Le minerai de fer, et la pelle posee comme la pioche d'Outward.

MINERAI <- Iron_Ore.webp, deja detoure en RGBA. Rien a masquer, seulement a
           assombrir : la photo est bien plus claire que le plateau du livre.
PELLE   <- une photo sur fond blanc, manche en bas a GAUCHE a 45 degres.
           La pioche d'Outward, mesuree, donne le gabarit a viser :
             tete      y 24..40, centree vers x 44
             manche    de (42, 40) a (60, 118) -> 13 degres a DROITE de la
                       verticale, et il sort par le bas du cadre.
           On ne peut donc pas se servir de poser() : il centre et fait tenir
           l'objet ENTIER dans la carte, quand ici le manche doit deborder.
"""
import random
import sys
from collections import deque
from math import atan2, degrees, radians

from PIL import Image, ImageFilter

D = r'C:/Users/IgneeFleur/Documents/Github/fns-owd-beta/docs/assets/objets'
S = (r'C:/Users/IGNEEF~1/AppData/Local/Temp/claude/'
     r'c--Users-IgneeFleur-Documents-Github-fns-ttrpg/'
     r'd943426d-1602-45f6-8810-fbde9268f03c/scratchpad')
W, H, BORD = 84, 128, 2
sys.stdout.reconfigure(encoding='utf-8')
L = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
cl = lambda v, a=0., b=1.: max(a, min(b, v))
sat = lambda c: max(c[:3]) - min(c[:3])

# --- gabarit releve sur Mining_Pick.png ---
TETE_Y = 22          # haut de la tete
TETE_X = 44          # centre de la tete
TETE_LARGE = 40      # largeur visee de la tete
PENTE = 13.0         # degres, manche penche a droite en descendant


def cadre(img, modele=D + '/gourde.png'):
    m = Image.open(modele).convert('RGB').load()
    o = img.load()
    for y in range(H):
        for x in range(W):
            if x < BORD or x >= W - BORD or y < BORD or y >= H - BORD:
                o[x, y] = m[x, y]
    return img


def grain(img, force, seed):
    random.seed(seed)
    br = Image.new('L', (W, H))
    bp = br.load()
    for y in range(H):
        for x in range(W):
            bp[x, y] = max(0, min(255, int(random.gauss(128, 60))))
    br = br.filter(ImageFilter.GaussianBlur(0.5))
    bp = br.load()
    g = img.load()
    for y in range(BORD, H - BORD):
        for x in range(BORD, W - BORD):
            r, gg, b = g[x, y]
            d = (bp[x, y] - 128) / 128.0 * force * (0.35 + 0.65 * L((r, gg, b)) / 255.0)
            g[x, y] = tuple(max(0, min(255, round(v + d))) for v in (r, gg, b))
    return img


def plateau():
    pl = Image.open(D + '/bois.png').convert('RGB')
    q = pl.load()
    depart = {(x, y) for y in range(BORD, H - BORD) for x in range(BORD, W - BORD)
              if q[x, y][2] > 12}
    trou = set(depart)
    for _ in range(6):
        for (x, y) in list(trou):
            src = [(x + dx, y + dy) for dx in (-3, 0, 3) for dy in (-3, 0, 3)
                   if (x + dx, y + dy) not in trou
                   and BORD <= x + dx < W - BORD and BORD <= y + dy < H - BORD]
            if src:
                n = len(src)
                q[x, y] = tuple(sum(q[p][i] for p in src) // n for i in range(3))
                trou.discard((x, y))
    m = Image.new('L', (W, H), 0)
    mp = m.load()
    for (x, y) in depart:
        mp[x, y] = 255
    m = m.filter(ImageFilter.GaussianBlur(2.0))
    flou = pl.filter(ImageFilter.GaussianBlur(3.4))
    fp, mp = flou.load(), m.load()
    for y in range(BORD, H - BORD):
        for x in range(BORD, W - BORD):
            a = mp[x, y] / 255.0
            if a > 0.02:
                q[x, y] = tuple(round(q[x, y][i] * (1 - a) + fp[x, y][i] * a) for i in range(3))
    return pl


def plus_grande_tache(m, seuil=90):
    w, h = m.size
    mp = m.load()
    vu = bytearray(w * h)
    best, bestn = None, 0
    for sy in range(h):
        for sx in range(w):
            if vu[sy * w + sx] or mp[sx, sy] < seuil:
                continue
            q, comp = deque([(sx, sy)]), []
            vu[sy * w + sx] = 1
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not vu[ny * w + nx] and mp[nx, ny] >= seuil:
                        vu[ny * w + nx] = 1
                        q.append((nx, ny))
            if len(comp) > bestn:
                best, bestn = comp, len(comp)
    garde = set(best or [])
    for y in range(h):
        for x in range(w):
            if mp[x, y] and (x, y) not in garde:
                mp[x, y] = 0
    return m


def boucher(m, seuil=90):
    w, h = m.size
    mp = m.load()
    vu = bytearray(w * h)
    q = deque()
    for y in range(h):
        for x in range(w):
            if (x in (0, w - 1) or y in (0, h - 1)) and mp[x, y] < seuil:
                vu[y * w + x] = 1
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not vu[ny * w + nx] and mp[nx, ny] < seuil:
                vu[ny * w + nx] = 1
                q.append((nx, ny))
    for y in range(h):
        for x in range(w):
            if mp[x, y] < seuil and not vu[y * w + x]:
                mp[x, y] = 255
    return m


def plafonner(im, al, plafond, k=1.0):
    """Rabat les hautes lumieres. La photo de pelle est prise en studio : sans
    plafond elle brille bien plus que tout le reste du chapitre."""
    px, ap = im.load(), al.load()
    for y in range(im.height):
        for x in range(im.width):
            if ap[x, y] < 8:
                continue
            c = px[x, y]
            lu = L(c) * k
            f = (min(lu, plafond) / L(c)) if L(c) > 1 else 1.0
            px[x, y] = tuple(max(0, min(255, round(v * f))) for v in c[:3])
    return im


def grain_sujet(im, al, force, seed):
    random.seed(seed)
    px, ap = im.load(), al.load()
    for y in range(im.height):
        for x in range(im.width):
            if ap[x, y] < 20:
                continue
            d = random.gauss(0, force)
            px[x, y] = tuple(max(0, min(255, round(v + d))) for v in px[x, y][:3])
    return im


def ombre_et_cadre(out, oa, ox, oy, seed):
    nw, nh = oa.size
    am = oa.load()
    omb = Image.new('L', (W, H), 0)
    om = omb.load()
    for y in range(nh):
        for x in range(nw):
            if am[x, y] > 60:
                X, Y = ox + x + 3, oy + y + 4
                if BORD <= X < W - BORD and BORD <= Y < H - BORD:
                    om[X, Y] = 255
    omb = omb.filter(ImageFilter.GaussianBlur(2.6))
    om = omb.load()
    o = out.load()
    for y in range(H):
        for x in range(W):
            f = om[x, y] / 255.0 * 0.5
            if f > 0:
                o[x, y] = tuple(round(v * (1 - f)) for v in o[x, y])
    return out


# ================= MINERAI DE FER =================
src = Image.open(r'C:/Users/IgneeFleur/Downloads/Iron_Ore.webp').convert('RGBA')
al = src.split()[3]
im = Image.new('RGB', src.size, (0, 0, 0))
im.paste(src, (0, 0), al)
al = al.point(lambda v: 255 if v > 140 else 0)
al = boucher(plus_grande_tache(al)).filter(ImageFilter.GaussianBlur(0.8))
plafonner(im, al, 132, k=0.80)
grain_sujet(im, al, 4.0, 601)

bb = al.point(lambda v: 255 if v > 40 else 0).getbbox()
obj, oa = im.crop(bb), al.crop(bb)
ech = min(74.0 / obj.width, 100.0 / obj.height)
nw, nh = round(obj.width * ech), round(obj.height * ech)
obj = obj.resize((nw, nh), Image.LANCZOS)
oa = oa.resize((nw, nh), Image.LANCZOS)
ox, oy = (W - nw) // 2, (H - nh) // 2
out = plateau()
ombre_et_cadre(out, oa, ox, oy, 601)
out.paste(obj, (ox, oy), oa)
cadre(out)
grain(out, 9, 603)
out.save(S + '/minerai_v2.png')
print('   minerai  %dx%d a (%d,%d)' % (nw, nh, ox, oy))


# ================= LA PELLE =================
src = Image.open(r'C:/Users/IgneeFleur/Downloads/20220712122336-jpg.jpg').convert('RGB')
e = 700.0 / max(src.size)
src = src.resize((round(src.width * e), round(src.height * e)), Image.LANCZOS)
px = src.load()
m = Image.new('L', src.size, 0)
mp = m.load()
for y in range(src.height):
    for x in range(src.width):
        c = px[x, y]
        mp[x, y] = 255 if (L(c) < 214 or sat(c) > 26) else 0
m = m.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
mask = boucher(plus_grande_tache(m))


def axe(mask):
    """Angle du manche et position de la tete.

    La TETE est l'extremite la plus LARGE, le manche l'autre bout. On prend le
    centre des tranches extremes le long de l'axe principal."""
    mp = mask.load()
    pts = [(x, y) for y in range(mask.height) for x in range(mask.width) if mp[x, y] > 128]
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    sxx = sum((p[0] - cx) ** 2 for p in pts)
    syy = sum((p[1] - cy) ** 2 for p in pts)
    sxy = sum((p[0] - cx) * (p[1] - cy) for p in pts)
    th = 0.5 * atan2(2 * sxy, sxx - syy)          # axe principal
    import math
    ux, uy = math.cos(th), math.sin(th)
    proj = [((p[0] - cx) * ux + (p[1] - cy) * uy, p) for p in pts]
    proj.sort()
    n = max(8, len(proj) // 25)
    # largeur des deux extremites, mesuree perpendiculairement
    def larg(sl):
        d = [(-(p[0] - cx) * uy + (p[1] - cy) * ux) for _, p in sl]
        return max(d) - min(d)
    lo, hi = proj[:n], proj[-n:]
    tete_en_haut = larg(lo) > larg(hi)
    tete = lo if tete_en_haut else hi
    manche = hi if tete_en_haut else lo
    tx = sum(p[0] for _, p in tete) / len(tete)
    ty = sum(p[1] for _, p in tete) / len(tete)
    bx = sum(p[0] for _, p in manche) / len(manche)
    by = sum(p[1] for _, p in manche) / len(manche)
    return (tx, ty), (bx, by), larg(lo), larg(hi)


(tx, ty), (bx, by), l0, l1 = axe(mask)
ang = degrees(atan2(bx - tx, by - ty))    # angle du vecteur tete->manche p/r au bas
print('   pelle    tete (%.0f,%.0f) manche (%.0f,%.0f) largeurs %.0f/%.0f  angle %.1f deg'
      % (tx, ty, bx, by, l0, l1, ang))

# On veut que ce vecteur pointe a PENTE degres a droite de la verticale.
rot = ang - PENTE
im = Image.new('RGB', src.size, (0, 0, 0))
im.paste(src, (0, 0), mask)
im = im.rotate(-rot, resample=Image.BICUBIC, expand=True, fillcolor=(0, 0, 0))
mask = mask.rotate(-rot, resample=Image.BICUBIC, expand=True, fillcolor=0)
(tx, ty), (bx, by), l0, l1 = axe(mask)
print('   apres rotation de %.1f deg -> angle %.1f deg'
      % (-rot, degrees(atan2(bx - tx, by - ty))))

plafonner(im, mask, 150, k=0.92)
grain_sujet(im, mask, 3.0, 611)

# Echelle : la tete doit faire TETE_LARGE de large.
mp = mask.load()
ys = [y for y in range(mask.height) for x in range(mask.width) if mp[x, y] > 128]
y0 = min(ys)
tranche = [x for y in range(y0, y0 + max(4, (max(ys) - y0) // 6))
           for x in range(mask.width) if mp[x, y] > 128]
larg_tete = max(tranche) - min(tranche)
ech = TETE_LARGE / float(larg_tete)
nw, nh = max(1, round(mask.width * ech)), max(1, round(mask.height * ech))
obj = im.resize((nw, nh), Image.LANCZOS)
oa = mask.resize((nw, nh), Image.LANCZOS)

# Position : haut de la tete a TETE_Y, centre de la tete a TETE_X.
ap = oa.load()
ys = [y for y in range(nh) for x in range(nw) if ap[x, y] > 128]
sy0 = min(ys)
tr = [x for y in range(sy0, sy0 + max(4, nh // 6)) for x in range(nw) if ap[x, y] > 128]
ox = TETE_X - (min(tr) + max(tr)) // 2
oy = TETE_Y - sy0

out = plateau()
ombre_et_cadre(out, oa, ox, oy, 613)
out.paste(obj, (ox, oy), oa)
cadre(out)
grain(out, 9, 615)
out.save(S + '/pelle_v1.png')
print('   pelle    %dx%d a (%d,%d)  tete large %d -> %d' % (nw, nh, ox, oy, larg_tete, TETE_LARGE))

pl = Image.new('RGB', (W * 4 + 50, H + 20), (30, 26, 20))
for i, f in enumerate([S + '/minerai_v2.png', S + '/pelle_v1.png',
                       S + '/Mining_Pick.png', D + '/charretee_charbon.png']):
    pl.paste(Image.open(f).convert('RGB'), (10 + i * (W + 10), 10))
pl.resize((pl.width * 3, pl.height * 3), Image.NEAREST).save(S + '/pelle_v1_plate.png')
print('minerai | pelle | pioche (reference) | charretee')
