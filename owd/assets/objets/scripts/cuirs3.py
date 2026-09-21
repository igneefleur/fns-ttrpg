# -*- coding: utf-8 -*-
"""Petit cuir et grand cuir — images fournies par l'auteur, déjà détourées.

Rien à découper : plateau reconstruit depuis `bois.png`, cadre greffé depuis
`gourde.png`, ombre portée, grain. Les deux images disent déjà la taille — une
seule pièce pliée contre une pile — donc PAS de recadrage serré, les deux tiennent
entières dans leur cadre comme toutes les autres icônes.

Le fond est noyé à la couleur du plateau AVANT réduction : sans quoi LANCZOS
moyenne le sujet avec le vide et laisse un liseré tout autour.
"""
import random
import sys

from PIL import Image, ImageFilter

D = r'C:/Users/IgneeFleur/Documents/Github/fns-owd-beta/docs/assets/objets'
S = (r'C:/Users/IGNEEF~1/AppData/Local/Temp/claude/'
     r'c--Users-IgneeFleur-Documents-Github-fns-ttrpg/'
     r'd943426d-1602-45f6-8810-fbde9268f03c/scratchpad')
W, H, BORD = 84, 128, 2
FOND = (23, 13, 1)
sys.stdout.reconfigure(encoding='utf-8')
L = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


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
    trou = {(x, y) for y in range(BORD, H - BORD) for x in range(BORD, W - BORD)
            if q[x, y][2] > 12}
    for _ in range(3):
        for x, y in list(trou):
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    n = (x + dx, y + dy)
                    if BORD <= n[0] < W - BORD and BORD <= n[1] < H - BORD:
                        trou.add(n)
    base = pl.copy().load()
    reste = []
    for (x, y) in sorted(trou):
        for (sx, sy) in ((W - 1 - x, y), (x, H - 1 - y), (W - 1 - x, H - 1 - y)):
            if (sx, sy) not in trou:
                q[x, y] = base[sx, sy]
                break
        else:
            reste.append((x, y))
    en_cours = set(reste)
    while en_cours:
        av = []
        for (x, y) in list(en_cours):
            vs = [q[x + i, y + j] for i in (-1, 0, 1) for j in (-1, 0, 1)
                  if 0 <= x + i < W and 0 <= y + j < H and (x + i, y + j) not in en_cours]
            if vs:
                av.append(((x, y), tuple(sum(v[k] for v in vs) // len(vs) for k in range(3))))
        if not av:
            break
        for pos, col in av:
            q[pos] = col
            en_cours.discard(pos)
    dz = pl.filter(ImageFilter.GaussianBlur(0.8)).load()
    for (x, y) in trou:
        if any((x + i, y + j) not in trou for i in (-1, 0, 1) for j in (-1, 0, 1)):
            q[x, y] = dz[x, y]
    return cadre(pl)


def delaver(img, k):
    """Rapproche la chromaticité de celle de `cuir.png` À LUMINANCE CONSTANTE.

    Les deux images de l'auteur sont plus saturées que le cuir de référence
    (0,47 et 0,43 contre 0,38) : elles tirent au roux là où le cuir est gris.
    On ne touche donc NI la clarté NI la teinte, seulement l'écart au gris —
    `v = lum + k (v − lum)`. Le k est MESURÉ pour que le G/R moyen retombe
    exactement sur celui du cuir, il n'est pas choisi à l'œil.
    """
    p = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            c = p[x, y]
            lum = L(c)
            p[x, y] = tuple(max(0, min(255, round(lum + k * (v - lum)))) for v in c)
    return img


def monter(source, sortie, seed, chroma=1.0, taille=1.0):
    src = Image.open(source)
    sw, sh = src.size
    al = src.getchannel('A')
    rgb = src.convert('RGB')
    if chroma != 1.0:
        rgb = delaver(rgb, chroma)
    noye = Image.new('RGB', (sw, sh), FOND)          # noyer AVANT de réduire
    noye.paste(rgb, (0, 0), al)
    bb = al.getbbox()
    obj, oa = noye.crop(bb), al.crop(bb)
    ow, oh = obj.size

    ech = min(76 / ow, 118 / oh) * taille
    nw, nh = max(1, round(ow * ech)), max(1, round(oh * ech))
    obj, oa = obj.resize((nw, nh), Image.LANCZOS), oa.resize((nw, nh), Image.LANCZOS)
    ox, oy = (W - nw) // 2, (H - nh) // 2

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
    grain(out, 9, seed)
    out.save(S + '/' + sortie)
    print('  %-18s source %dx%d -> %dx%d posée à (%d,%d)' % (sortie, ow, oh, nw, nh, ox, oy))


monter(r'C:/Users/IgneeFleur/Downloads/Gemini_Generated_Image_cuuapscuuapscuua-removebg-preview.png',
       'petit_cuir_84.png', 41, chroma=0.697, taille=0.85)
monter(r'C:/Users/IgneeFleur/Downloads/Gemini_Generated_Image_fxsinifxsinifxsi-removebg-preview.png',
       'grand_cuir_84.png', 43, chroma=0.712)


def sonde(f, nom):
    i = Image.open(f).convert('RGB')
    z = i.load()
    fb = i.filter(ImageFilter.GaussianBlur(1.2)).load()
    zz = [(x, y) for y in range(6, 26) for x in range(4, 20)]
    gr = (sum((z[x, y][c] - fb[x, y][c]) ** 2 for x, y in zz for c in range(3)) / (len(zz) * 3)) ** 0.5

    def moy(x0, y0, x1, y1):
        ps = [z[x, y] for y in range(y0, y1) for x in range(x0, x1)]
        return tuple(round(sum(c[j] for c in ps) / len(ps)) for j in range(3))
    suj = moy(30, 55, 55, 75)
    print('  %-12s cadre %s  plateau %s  sujet %s clarté %3.0f  grain %.2f'
          % (nom, moy(0, 60, 2, 70), moy(4, 6, 16, 20), suj, L(suj), gr))


for n, f in (('PETIT neuf', S + '/petit_cuir_84.png'), ('GRAND neuf', S + '/grand_cuir_84.png'),
             ('cuir', D + '/cuir.png'), ('gourde', D + '/gourde.png')):
    sonde(f, n)

st = Image.new('RGB', (W * 6 * 3 + 40, H * 6 + 20), (233, 226, 205))
for i, f in enumerate([S + '/petit_cuir_84.png', D + '/cuir.png', S + '/grand_cuir_84.png']):
    st.paste(Image.open(f).convert('RGB').resize((W * 6, H * 6), Image.NEAREST), (10 + i * (W * 6 + 10), 10))
st.save(S + '/trois_cuirs.png')
print('planche : PETIT | cuir | GRAND')
