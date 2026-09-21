# -*- coding: utf-8 -*-
"""La poix et la graisse.

Deux photos, deux fonds opposes, deux problemes.

POIX    <- ecailles de resine ambree sur fond BLANC. Le sujet est clair, le fond
           l'est plus encore : le seuil de luminance ne les separe pas. C'est la
           SATURATION qui tranche -- le fond est gris pur, la resine est jaune.
GRAISSE <- masse creme sur fond NOIR, barree de traits blancs en filigrane. Le
           fond part au seuil, mais les traits qui MORDENT sur le sujet doivent
           etre repeints : on les remplace par la mediane de leur voisinage,
           prise le long du trait et non a travers.
"""
import random
import sys
from collections import deque

from PIL import Image, ImageFilter

D = r'C:/Users/IgneeFleur/Documents/Github/fns-owd-beta/docs/assets/objets'
S = (r'C:/Users/IGNEEF~1/AppData/Local/Temp/claude/'
     r'c--Users-IgneeFleur-Documents-Github-fns-ttrpg/'
     r'd943426d-1602-45f6-8810-fbde9268f03c/scratchpad')
W, H, BORD = 84, 128, 2
FOND = (23, 13, 1)
sys.stdout.reconfigure(encoding='utf-8')
L = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
cl = lambda v, a=0., b=1.: max(a, min(b, v))
sat = lambda c: max(c) - min(c)

exec(open(S + '/fer.py', encoding='utf-8').read().split('# ---------------- MINERAI')[0]
     .split('D = r')[0].replace('import random', '').replace('import sys', '')
     if False else '')


# ---- outils repris de fer.py (memes definitions) ----
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


def poser(im, al, sortie, seed, taille=1.0, decal_x=0, decal_y=0):
    bb = al.point(lambda v: 255 if v > 40 else 0).getbbox()
    noye = Image.new('RGB', im.size, FOND)
    noye.paste(im, (0, 0), al)
    obj, oa = noye.crop(bb), al.crop(bb)
    ow, oh = obj.size
    ech = min(76 / ow, 118 / oh) * taille
    nw, nh = max(1, round(ow * ech)), max(1, round(oh * ech))
    obj, oa = obj.resize((nw, nh), Image.LANCZOS), oa.resize((nw, nh), Image.LANCZOS)
    ox, oy = (W - nw) // 2 + decal_x, (H - nh) // 2 + decal_y
    out = plateau()
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
    out.paste(obj, (ox, oy), oa)
    cadre(out)
    grain(out, 9, seed)
    out.save(S + '/' + sortie)
    print('   %-22s -> %dx%d a (%d,%d)' % (sortie, nw, nh, ox, oy))


def rugosite(im, al, force, seed, echelle=2):
    w, h = im.size
    random.seed(seed)
    t = Image.new('L', (w // echelle + 1, h // echelle + 1))
    tp = t.load()
    for y in range(t.height):
        for x in range(t.width):
            tp[x, y] = max(0, min(255, int(random.gauss(128, 78))))
    t = t.resize((w, h), Image.BICUBIC).filter(ImageFilter.GaussianBlur(1.4))
    tp, px, ap = t.load(), im.load(), al.load()
    for y in range(h):
        for x in range(w):
            a = ap[x, y] / 255.0
            if a < 0.15:
                continue
            f = 1.0 + (tp[x, y] - 128) / 128.0 * force * a
            px[x, y] = tuple(max(0, min(255, round(v * f))) for v in px[x, y])
    return im


def reduire(im, cible=420):
    """Une photo de 2500 px coute des minutes par passe ; 420 suffit largement
    pour une vignette de 84."""
    if max(im.size) <= cible:
        return im
    e = cible / float(max(im.size))
    return im.resize((max(1, round(im.width * e)), max(1, round(im.height * e))), Image.LANCZOS)


# ================= POIX =================
# Fond blanc, sujet ambre : c'est la saturation qui tranche, pas la luminance.
im = reduire(Image.open(S + '/../../../../../../IgneeFleur/Downloads/59271.webp'
                        if False else r'C:/Users/IgneeFleur/Downloads/59271.webp').convert('RGB'))
w, h = im.size
px = im.load()
m = Image.new('L', (w, h), 0)
mp = m.load()
for y in range(h):
    for x in range(w):
        c = px[x, y]
        # jaune sature OU assez sombre pour ne pas etre le fond
        mp[x, y] = int(255 * max(cl((sat(c) - 12) / 22.0), cl((238 - L(c)) / 26.0)))
m = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
al = boucher(plus_grande_tache(m)).filter(ImageFilter.GaussianBlur(1.0))

# Le fond blanc s'infiltre entre les ecailles du bord : des mouchetures grises
# que le masque garde parce qu'elles sont cernees de resine. On les remplace par
# la mediane locale, qui est de la resine.
med = im.filter(ImageFilter.MedianFilter(7))
mdp, ap = med.load(), al.load()
for y in range(h):
    for x in range(w):
        if ap[x, y] > 40 and sat(px[x, y]) < 16 and L(px[x, y]) > 196:
            px[x, y] = mdp[x, y]
rugosite(im, al, 0.14, 917)
poser(im, al, 'poix_84.png', 919, taille=1.00)

# ================= GRAISSE =================
# Fond noir + filigrane : le fond tombe au seuil, les traits sur le sujet non.
src = Image.open(r'C:/Users/IgneeFleur/Downloads/wmremove-transformed(3).png')
fondu = Image.new('RGB', src.size, (0, 0, 0))
fondu.paste(src, (0, 0), src.split()[3] if src.mode == 'RGBA' else None)
im = reduire(fondu)
w, h = im.size
px = im.load()

m = Image.new('L', (w, h), 0)
mp = m.load()
for y in range(h):
    for x in range(w):
        mp[x, y] = int(255 * cl((L(px[x, y]) - 46) / 34.0))
m = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
al = boucher(plus_grande_tache(m)).filter(ImageFilter.GaussianBlur(1.0))

# Le filigrane : un trait CLAIR et MINCE. On le detecte en comparant chaque
# pixel a la mediane d'un disque plus large que le trait ; ce qui depasse
# nettement est du filigrane, et on le remplace par cette mediane.
med = im.filter(ImageFilter.MedianFilter(9))
mdp, ap = med.load(), al.load()
n = 0
for y in range(h):
    for x in range(w):
        c, r = px[x, y], mdp[x, y]
        if L(c) - L(r) > 26 and ap[x, y] > 40:
            px[x, y] = r
            n += 1
print('   filigrane repeint : %d pixels sur le sujet' % n)
im = im.filter(ImageFilter.GaussianBlur(0.4))
rugosite(im, al, 0.10, 931)
poser(im, al, 'graisse_84.png', 933, taille=1.00)

pl = Image.new('RGB', (W * 2 + 30, H + 20), (30, 26, 20))
for i, f in enumerate(['poix_84.png', 'graisse_84.png']):
    pl.paste(Image.open(S + '/' + f), (10 + i * (W + 10), 10))
pl.resize((pl.width * 4, pl.height * 4), Image.NEAREST).save(S + '/poix_v1.png')
print('\npoix | graisse')
