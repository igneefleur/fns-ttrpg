# -*- coding: utf-8 -*-
"""Le pot de verre : la teinte, et RIEN D'AUTRE.

La source est deja une carte conforme -- 1664x2536, soit exactement le rapport
84/128, cadre et plateau compris. Le premier essai la decoupait pour la reposer
sur le plateau du livre, et rognait le bas du pot au passage. Ici on ne decoupe
rien : on redimensionne, et on deplace la seule chromaticite du verre.

Le masque ne sert donc plus a DECOUPER mais seulement a BORNER la teinte. Une
erreur de bord n'arrache plus rien : elle verdit un peu de fond, ce qui se voit
a peine, et le bord est adouci pour ca.

Teinter du verre est un filtre MULTIPLICATIF : la chromaticite bouge, la
luminance reste. Peindre le verre en vert en ferait une pierre verte.
"""
import sys
from collections import deque

from PIL import Image, ImageFilter

D = r'C:/Users/IgneeFleur/Documents/Github/fns-owd-beta/docs/assets/objets'
S = (r'C:/Users/IGNEEF~1/AppData/Local/Temp/claude/'
     r'c--Users-IgneeFleur-Documents-Github-fns-ttrpg/'
     r'd943426d-1602-45f6-8810-fbde9268f03c/scratchpad')
SRC = r'C:/Users/IgneeFleur/Downloads/Gemini_Generated_Image_4pwycc4pwycc4pwy.jpg'
W, H = 84, 128
TRAVAIL = 4                      # on travaille a 4x, on reduit a la fin
sys.stdout.reconfigure(encoding='utf-8')
L = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
cl = lambda v, a=0., b=1.: max(a, min(b, v))


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


def remplir_par_lignes(m, lissage):
    """Un pot est d'un seul tenant a chaque hauteur : on remplit de bord a bord."""
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
    out = Image.new('L', (w, h), 0)
    op = out.load()
    for y in range(y0, y1 + 1):
        v = [bords[z] for z in range(max(0, y - lissage), min(h, y + lissage + 1)) if bords[z]]
        if not v:
            continue
        g = sorted(p[0] for p in v)
        d = sorted(p[1] for p in v)
        for x in range(g[len(g) // 2], d[len(d) // 2] + 1):
            op[x, y] = 255
    return out


def silhouette(im, seuil, fermeture, lissage):
    w, h = im.size
    px = im.load()
    m = Image.new('L', (w, h), 0)
    mp = m.load()
    marge = int(0.075 * w)                      # le cadre grave reste dehors
    for y in range(h):
        for x in range(w):
            if marge <= x < w - marge and marge <= y < h - marge and L(px[x, y]) > seuil:
                mp[x, y] = 255
    m = m.filter(ImageFilter.MaxFilter(fermeture)).filter(ImageFilter.MinFilter(fermeture))
    m = remplir_par_lignes(plus_grande_tache(m), lissage)
    return m.filter(ImageFilter.GaussianBlur(w / 90.0))


def verre(im, al, tint, force, lueur_tint, lueur_force):
    px, ap = im.load(), al.load()
    tl, ll = L(tint), L(lueur_tint)
    for y in range(im.height):
        for x in range(im.width):
            a = ap[x, y] / 255.0
            if a < 0.02:
                continue
            c = px[x, y]
            lu = L(c)
            f = force * a
            n = [c[i] * (1 - f) + lu * tint[i] / tl * f for i in range(3)]
            g = lueur_force * a * cl((lu - 118) / 90.0)
            if g > 0:
                n = [n[i] * (1 - g) + lu * lueur_tint[i] / ll * g for i in range(3)]
            k = (lu / L(n)) if L(n) > 1 else 1.0      # la luminance ne bouge pas
            px[x, y] = tuple(max(0, min(255, round(v * k))) for v in n)
    return im


src = Image.open(SRC).convert('RGB')
print('   source %s  rapport %.4f  (carte %.4f)'
      % (src.size, src.width / float(src.height), W / float(H)))
gw, gh = W * TRAVAIL, H * TRAVAIL
src = src.resize((gw, gh), Image.LANCZOS)

al = silhouette(src, 105, 4 * TRAVAIL - 1, 4 * TRAVAIL)
bb = al.getbbox()
print('   teinte bornee a %s sur %s  (aucun recadrage)' % (bb, src.size))
Image.merge('RGB', (al, al, al)).resize((W * 2, H * 2)).save(S + '/pot2_masque.png')

for nom, tint, lueur, lf in [
        ('pot2_84.png',        (112, 126, 104), (154, 172, 150), 0.55),
        ('pot2_bleute_84.png', (108, 116, 128), (148, 164, 196), 0.72)]:
    out = verre(src.copy(), al, tint, 0.66, lueur, lf)
    out = out.resize((W, H), Image.LANCZOS)
    out.save(S + '/' + nom)
    print('   %s' % nom)

f = [S + '/pot2_84.png', S + '/pot2_bleute_84.png',
     D + '/bouteille.png', D + '/bouteille_bleutee.png', D + '/fiole.png']
pl = Image.new('RGB', (W * 5 + 60, H + 20), (30, 26, 20))
for i, n in enumerate(f):
    pl.paste(Image.open(n).convert('RGB'), (10 + i * (W + 10), 10))
pl.resize((pl.width * 3, pl.height * 3), Image.NEAREST).save(S + '/pot_v2.png')
print('pot | pot bleute | bouteille | bouteille bleutee | fiole')
