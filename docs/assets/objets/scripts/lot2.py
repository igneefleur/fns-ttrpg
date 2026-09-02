# -*- coding: utf-8 -*-
"""Les bouteilles et les fioles : verre vert et verre bleute.

La consigne est d'atteindre EXACTEMENT la coloration d'avant. On ne la vise donc
pas a l'oeil : on la mesure sur les anciennes cartes, puis on calibre.

Chromaticites relevees (couleur ramenee a luminance 255, sur les seuls pixels
qui s'ecartent du plateau) :
    bouteille          (274, 256, 199)
    bouteille bleutee  (273, 254, 215)
    fiole              (294, 254, 159)
    fiole bleutee      (281, 256, 183)
Le bleute ne se joue que sur le bleu : +16 pour la bouteille, +24 pour la fiole.

La boucle applique le filtre, mesure ce qu'elle obtient, corrige la teinte du
rapport cible/mesure, et recommence. Cinq tours suffisent a tomber a l'unite.

Le HALO de la fiole ne peut pas se gommer sur place : c'est de la lumiere
ajoutee sur le plateau, et l'y soustraire laisse une aureole. On recompose donc
la fiole sur le vrai plateau, ce qui l'efface d'un coup.
"""
import os
import sys
from collections import deque

from PIL import Image, ImageFilter

D = r'c:/Users/IgneeFleur/Documents/Github/fns-owd-beta/docs/assets/objets'
DL = r'C:/Users/IgneeFleur/Downloads'
S = (r'C:/Users/IGNEEF~1/AppData/Local/Temp/claude/'
     r'c--Users-IgneeFleur-Documents-Github-fns-ttrpg/'
     r'd943426d-1602-45f6-8810-fbde9268f03c/scratchpad')
W, H = 84, 128
sys.stdout.reconfigure(encoding='utf-8')
L = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
cl = lambda v, a=0., b=1.: max(a, min(b, v))

CIBLES = {'bouteille': (274, 256, 199), 'bouteille_bleutee': (273, 254, 215),
          'fiole': (294, 254, 159), 'fiole_bleutee': (281, 256, 183)}


def sans_logo(im, coin=0.16, marge=0.02):
    w, h = im.size
    k = int(min(w, h) * coin)
    m0 = int(min(w, h) * marge)
    b = (w - k - m0, h - k - m0, w - m0, h - m0)
    z = im.crop(b)
    zp = z.load()
    v = sorted(L(zp[x, y]) for y in range(z.height) for x in range(z.width))
    med = v[len(v) // 2]
    m = Image.new('L', z.size, 0)
    mp = m.load()
    n = 0
    for y in range(z.height):
        for x in range(z.width):
            if L(zp[x, y]) > max(med * 1.55, med + 22):
                mp[x, y] = 255
                n += 1
    if n:
        m = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2.0))
        fl = z.filter(ImageFilter.GaussianBlur(max(3, k // 5)))
        fp, mp = fl.load(), m.load()
        for y in range(z.height):
            for x in range(z.width):
                a = mp[x, y] / 255.0
                if a > 0.01:
                    zp[x, y] = tuple(round(zp[x, y][i] * (1 - a) + fp[x, y][i] * a)
                                     for i in range(3))
        im.paste(z, b[:2])
    return im, n


def plus_grande(m):
    w, h = m.size
    mp = m.load()
    vu = bytearray(w * h)
    best, bn = None, 0
    for sy in range(h):
        for sx in range(w):
            if vu[sy * w + sx] or mp[sx, sy] < 128:
                continue
            q, comp = deque([(sx, sy)]), []
            vu[sy * w + sx] = 1
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not vu[ny * w + nx] and mp[nx, ny] >= 128:
                        vu[ny * w + nx] = 1
                        q.append((nx, ny))
            if len(comp) > bn:
                best, bn = comp, len(comp)
    o = Image.new('L', (w, h), 0)
    op = o.load()
    for (x, y) in (best or []):
        op[x, y] = 255
    return o


def remplir_lignes(m, lissage):
    w, h = m.size
    mp = m.load()
    b = []
    for y in range(h):
        xs = [x for x in range(w) if mp[x, y] > 128]
        b.append((min(xs), max(xs)) if xs else None)
    pl = [y for y, v in enumerate(b) if v]
    if not pl:
        return m
    o = Image.new('L', (w, h), 0)
    op = o.load()
    for y in range(min(pl), max(pl) + 1):
        v = [b[z] for z in range(max(0, y - lissage), min(h, y + lissage + 1)) if b[z]]
        if not v:
            continue
        g = sorted(p[0] for p in v)
        d = sorted(p[1] for p in v)
        for x in range(g[len(g) // 2], d[len(d) // 2] + 1):
            op[x, y] = 255
    return o


def silhouette(im, seuil, fermeture, lissage, marge=0.075):
    w, h = im.size
    px = im.load()
    m = Image.new('L', (w, h), 0)
    mp = m.load()
    mg = int(marge * w)
    for y in range(h):
        for x in range(w):
            if mg <= x < w - mg and mg <= y < h - mg and L(px[x, y]) > seuil:
                mp[x, y] = 255
    m = m.filter(ImageFilter.MaxFilter(fermeture)).filter(ImageFilter.MinFilter(fermeture))
    m = remplir_lignes(plus_grande(m), lissage)
    return m.filter(ImageFilter.GaussianBlur(w / 90.0))


def verre(im, al, gain):
    """Un verre colore est un GAIN PAR CANAL, pas un melange vers une couleur.

    Melanger vers une teinte plate atteignait bien la moyenne visee mais delavait
    tout : l'etiquette perdait son jaune et le verre son relief. Le gain, lui,
    respecte les rapports locaux -- c'est ce que fait la matiere. La luminance
    est renormalisee apres coup pour que le verre ne s'assombrisse pas."""
    out = im.copy()
    px, ap = out.load(), al.load()
    for y in range(out.height):
        for x in range(out.width):
            a = ap[x, y] / 255.0
            if a < 0.02:
                continue
            c = px[x, y]
            lu = L(c)
            n = [c[i] * (1 + (gain[i] - 1) * a) for i in range(3)]
            k = (lu / L(n)) if L(n) > 1 else 1.0
            px[x, y] = tuple(max(0, min(255, round(v * k))) for v in n)
    return out


def mesure(im, al):
    px, ap = im.load(), al.load()
    v = [px[x, y] for y in range(im.height) for x in range(im.width) if ap[x, y] > 200]
    moy = tuple(sum(c[i] for c in v) / len(v) for i in range(3))
    lu = L(moy)
    return tuple(255 * c / lu for c in moy)


def calibre(im, al, cible, tours=8):
    """Le gain est lineaire : quelques tours suffisent a tomber a l'unite."""
    g = [1.0, 1.0, 1.0]
    for _ in range(tours):
        m = mesure(verre(im, al, g), al)
        g = [max(0.2, min(5.0, g[i] * cible[i] / m[i])) for i in range(3)]
    fin = verre(im, al, g)
    return fin, mesure(fin, al), g


# ================= LA BOUTEILLE =================
src = Image.open(DL + '/Gemini_Generated_Image_m802cxm802cxm802.png').convert('RGB')
src, n = sans_logo(src)
print('bouteille : logo efface, %d px' % n)
src = src.resize((W * 4, H * 4), Image.LANCZOS)
al = silhouette(src, 108, 4 * 4 - 1, 4 * 4)
for nom, cible in [('bouteille', CIBLES['bouteille']),
                   ('bouteille_bleutee', CIBLES['bouteille_bleutee'])]:
    fin, obt, t = calibre(src, al, cible)
    fin.resize((W, H), Image.LANCZOS).save(os.path.join(D, 'edited', 'containers', nom + '.png'))
    print('   %-20s cible %s  obtenu (%3.0f,%3.0f,%3.0f)  gain (%.2f,%.2f,%.2f)'
          % (nom, cible, obt[0], obt[1], obt[2], t[0], t[1], t[2]))

# ================= LA FIOLE =================
src = Image.open(DL + '/wmremove-transformed(1).png').convert('RGB')
src = src.resize((W * 4, H * 4), Image.LANCZOS)
al = silhouette(src, 132, 4 * 4 - 1, 4 * 4)
# le halo part avec le fond : on recompose sur le vrai plateau
fond = Image.open(D + '/background/plateau.png').convert('RGB').resize((W * 4, H * 4), Image.LANCZOS)
cadre_src = Image.open(D + '/edited/containers/bouteille.png').convert('RGB')
for nom, cible in [('fiole', CIBLES['fiole']), ('fiole_bleutee', CIBLES['fiole_bleutee'])]:
    fin, obt, t = calibre(src, al, cible)
    plan = fond.copy()
    plan.paste(fin, (0, 0), al)
    p = plan.resize((W, H), Image.LANCZOS)
    q, cp = p.load(), cadre_src.load()
    for y in range(H):
        for x in range(W):
            if x < 2 or x >= W - 2 or y < 2 or y >= H - 2:
                q[x, y] = cp[x, y]
    p.save(os.path.join(D, 'edited', 'containers', nom + '.png'))
    print('   %-20s cible %s  obtenu (%3.0f,%3.0f,%3.0f)  halo retire (recompose)'
          % (nom, cible, obt[0], obt[1], obt[2]))

pl = Image.new('RGB', (W * 8 + 90, H + 20), (30, 26, 20))
for i, f in enumerate(['objets_avant/bouteille.png', D + '/edited/containers/bouteille.png',
                       'objets_avant/bouteille_bleutee.png', D + '/edited/containers/bouteille_bleutee.png',
                       'objets_avant/fiole.png', D + '/edited/containers/fiole.png',
                       'objets_avant/fiole_bleutee.png', D + '/edited/containers/fiole_bleutee.png']):
    pl.paste(Image.open(f if '/' in f and f.startswith('c:') else S + '/' + f
                        if not f.startswith('c:') else f).convert('RGB'),
             (10 + i * (W + 10), 10))
pl.resize((pl.width * 2, pl.height * 2), Image.NEAREST).save(S + '/lot2.png')
print('\nplanche lot2 : ancien | nouveau, pour chacun des quatre')
