# -*- coding: utf-8 -*-
"""Le pot de verre, en vert et en bleute.

La source est deja une carte au bon rapport (1664x2536 ~ 84x128), plateau brun
compris. Deux difficultes propres au VERRE :

1. Il est TRANSPARENT : aucun seuil ne le decoupe, puisque son interieur est le
   fond lui-meme. On ne cherche donc pas un decoupage mais une SILHOUETTE -- les
   aretes brillantes, refermees puis rebouchees. Ce qu'on colle a l'interieur est
   le fond de la source vu a travers le verre, ce qui est exactement ce que font
   deja la bouteille et la fiole du livre.
2. Teinter du verre n'est pas le peindre : c'est un FILTRE MULTIPLICATIF. On
   deplace la chromaticite a luminance egale, sinon le pot devient une pierre
   verte au lieu d'un verre vert.

Cibles relevees sur la famille :
   bouteille.png          median (117, 116, 100)   vert-gris
   bouteille_bleutee.png  median (122, 115,  94)   ... a peine plus chaud !
Le bleute du livre ne se joue donc PAS sur la mediane mais sur les hautes
lumieres, qui virent au froid. On traite les deux versions par la lueur.
"""
import random
import sys
from collections import deque

from PIL import Image, ImageFilter

D = r'C:/Users/IgneeFleur/Documents/Github/fns-owd-beta/docs/assets/objets'
S = (r'C:/Users/IGNEEF~1/AppData/Local/Temp/claude/'
     r'c--Users-IgneeFleur-Documents-Github-fns-ttrpg/'
     r'd943426d-1602-45f6-8810-fbde9268f03c/scratchpad')
SRC = r'C:/Users/IgneeFleur/Downloads/Gemini_Generated_Image_4pwycc4pwycc4pwy.jpg'
W, H, BORD = 84, 128, 2
sys.stdout.reconfigure(encoding='utf-8')
L = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
cl = lambda v, a=0., b=1.: max(a, min(b, v))


def cadre(img, modele=D + '/bouteille.png'):
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


def remplir_par_lignes(m, lissage=17):
    """Un pot est d'un seul tenant a chaque hauteur : on remplit de bord a bord.

    Le rebouchage par inondation ne suffisait pas -- le bas du pot est dans
    l'ombre, ses aretes ne se referment pas, et la silhouette ressortait mordue.
    Ici on prend le premier et le dernier pixel de chaque ligne, on lisse ces
    deux bords sur quelques lignes pour tuer les brillances perdues, puis on
    noircit tout l'intervalle."""
    w, h = m.size
    mp = m.load()
    bords = []
    for y in range(h):
        xs = [x for x in range(w) if mp[x, y] > 128]
        bords.append((min(xs), max(xs)) if xs else None)
    plein = [y for y, b in enumerate(bords) if b]
    if not plein:
        return m
    y0, y1 = min(plein), max(plein)
    liss = []
    for y in range(h):
        v = [bords[z] for z in range(max(0, y - lissage), min(h, y + lissage + 1)) if bords[z]]
        if not v or not (y0 <= y <= y1):
            liss.append(None)
            continue
        g = sorted(p[0] for p in v)
        d = sorted(p[1] for p in v)
        liss.append((g[len(g) // 2], d[len(d) // 2]))
    out = Image.new('L', (w, h), 0)
    op = out.load()
    for y in range(h):
        if liss[y]:
            for x in range(liss[y][0], liss[y][1] + 1):
                op[x, y] = 255
    return out


def silhouette(im, seuil, fermeture=9):
    """Les aretes brillantes, refermees, puis remplies de bord a bord."""
    w, h = im.size
    px = im.load()
    m = Image.new('L', (w, h), 0)
    mp = m.load()
    for y in range(h):
        for x in range(w):
            mp[x, y] = 255 if L(px[x, y]) > seuil else 0
    m = m.filter(ImageFilter.MaxFilter(fermeture)).filter(ImageFilter.MinFilter(fermeture))
    m = plus_grande_tache(m)
    m = remplir_par_lignes(m)
    return m.filter(ImageFilter.GaussianBlur(1.2))


def verre(im, al, tint, force, lueur_tint, lueur_force, plafond=None):
    """Filtre multiplicatif : on deplace la couleur A LUMINANCE EGALE.

    Peindre le verre en vert donnerait une pierre. Ce qui fait le verre colore,
    c'est que la chromaticite bouge et que la valeur reste."""
    px, ap = im.load(), al.load()
    tl, ll = L(tint), L(lueur_tint)
    for y in range(im.height):
        for x in range(im.width):
            a = ap[x, y] / 255.0
            if a < 0.02:
                continue
            c = px[x, y]
            lu = L(c)
            if plafond:
                lu = min(lu, plafond)
            # la teinte de fond, puis celle des hautes lumieres par-dessus
            f = force * a
            n = [c[i] * (1 - f) + lu * tint[i] / tl * f for i in range(3)]
            g = lueur_force * a * cl((lu - 118) / 90.0)
            if g > 0:
                n = [n[i] * (1 - g) + lu * lueur_tint[i] / ll * g for i in range(3)]
            k = (lu / L(n)) if L(n) > 1 else 1.0
            px[x, y] = tuple(max(0, min(255, round(v * k))) for v in n)
    return im


def poser(im, al, sortie, seed, largeur=64, bas=112):
    """Cale le pot par sa LARGEUR et par son assise, pas par un centrage.

    Un pot trapu centre comme une bouteille flotte au milieu de la carte."""
    bb = al.point(lambda v: 255 if v > 40 else 0).getbbox()
    obj, oa = im.crop(bb), al.crop(bb)
    ech = largeur / float(obj.width)
    nw, nh = max(1, round(obj.width * ech)), max(1, round(obj.height * ech))
    obj = obj.resize((nw, nh), Image.LANCZOS)
    oa = oa.resize((nw, nh), Image.LANCZOS)
    ox, oy = (W - nw) // 2, bas - nh
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
    print('   %-20s -> %dx%d a (%d,%d)' % (sortie, nw, nh, ox, oy))
    return out


src = Image.open(SRC).convert('RGB')
m = int(0.055 * src.width)
src = src.crop((m, m, src.width - m, src.height - m))
e = 300.0 / src.width
src = src.resize((300, round(src.height * e)), Image.LANCZOS)
al = silhouette(src, 105, 7)
bb = al.getbbox()
print('   silhouette %s sur %s' % (bb, src.size))
Image.merge('RGB', (al, al, al)).resize((150, 230)).save(S + '/pot_masque.png')

# vert du livre : (117,116,100) -- une olive froide, pas un vert franc
v = verre(src.copy(), al, (112, 126, 104), 0.66, (154, 172, 150), 0.55, plafond=205)
poser(v, al, 'pot_84.png', 401)

# bleute : la mediane bouge a peine, c'est la LUEUR qui vire au froid
b = verre(src.copy(), al, (108, 116, 128), 0.66, (148, 164, 196), 0.72, plafond=205)
poser(b, al, 'pot_bleute_84.png', 403)

f = [S + '/pot_84.png', S + '/pot_bleute_84.png',
     D + '/bouteille.png', D + '/bouteille_bleutee.png', D + '/fiole.png']
pl = Image.new('RGB', (W * 5 + 60, H + 20), (30, 26, 20))
for i, n in enumerate(f):
    pl.paste(Image.open(n).convert('RGB'), (10 + i * (W + 10), 10))
pl.resize((pl.width * 3, pl.height * 3), Image.NEAREST).save(S + '/pot_v1.png')
print('pot | pot bleute | bouteille | bouteille bleutee | fiole')
