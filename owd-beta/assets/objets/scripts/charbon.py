# -*- coding: utf-8 -*-
"""Le charbon de bois et la charretée.

Deux fonds opposés. Le charbon arrive sur BLANC, la charretée sur NOIR — et sur
celle-ci le sujet lui-même est presque noir : le remplissage part donc des bords
avec un seuil très bas (lum < 12), ce qui laisse le charbon à 70 intact.

La caisse est trop claire (lum 123 à 165, R-B = +80). On l'assombrit SEULE, par
sa chromaticité : le charbon est neutre (R-B = -5) et ne bouge pas d'un point.
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
    """Le plateau nu, reconstruit depuis le petit bois.

    La moyenne des voisins laisse un MOUCHETE la ou le sujet d'origine etait
    large : les branches cachaient l'artefact, un tas de charbon ne le cache
    pas. On garde donc le masque du comble et on y fond une version floue,
    ce qui efface le pointille sans toucher au reste du plateau."""
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


def accorder(img, al, ref, force):
    """Rapproche la chromaticite de `ref` A LUMINANCE CONSTANTE, sous le masque."""
    lr = L(ref); u = tuple(c / lr for c in ref)
    p = img.load(); a = al.load(); w, h = img.size
    for y in range(h):
        for x in range(w):
            if a[x, y] < 30: continue
            c = p[x, y]; lum = L(c)
            cib = tuple(lum * v for v in u)
            p[x, y] = tuple(max(0, min(255, round(c[i] + force * (cib[i] - c[i])))) for i in range(3))


def alpha_bord(src, clair=True, seuil=185, ecart=12, seuil_noir=12,
               global_=False, ouverture=0):
    """Le fond est ce qui touche le bord ET reste dans son seuil.

    `clair=True`  : fond blanc, on prend le neutre au-dessus de `seuil`.
    `clair=False` : fond noir, on prend tout ce qui est sous `seuil_noir` —
    le sujet le plus sombre de la charretée est à 69, la marge est confortable.
    """
    p = src.load()
    w, h = src.size
    if clair:
        fond = lambda c: L(c) >= seuil and (max(c) - min(c)) <= ecart
    else:
        fond = lambda c: L(c) <= seuil_noir
    vus = bytearray(w * h)
    q = deque()
    if global_:
        # DESSIN AU TRAIT : le blanc entre les hachures est ceinture et le
        # remplissage ne l'atteint pas. Il ressort en halo gris a la reduction.
        for y in range(h):
            for x in range(w):
                if fond(p[x, y]):
                    vus[y * w + x] = 1
    for x in (range(w) if not global_ else ()):
        for y in (0, h - 1):
            if fond(p[x, y]) and not vus[y * w + x]:
                vus[y * w + x] = 1
                q.append((x, y))
    for y in (range(h) if not global_ else ()):
        for x in (0, w - 1):
            if fond(p[x, y]) and not vus[y * w + x]:
                vus[y * w + x] = 1
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not vus[ny * w + nx] and fond(p[nx, ny]):
                vus[ny * w + nx] = 1
                q.append((nx, ny))
    al = Image.new('L', (w, h), 255)
    a = al.load()
    for y in range(h):
        for x in range(w):
            if vus[y * w + x]:
                a[x, y] = 0
    if ouverture:
        # eroder puis dilater : tout ce qui est plus mince que le noyau disparait
        al = al.filter(ImageFilter.MinFilter(ouverture)).filter(ImageFilter.MaxFilter(ouverture))
    al = al.filter(ImageFilter.GaussianBlur(1.2))
    return al, al.point(lambda v: 255 if v > 40 else 0).getbbox()


def assombrir_bois(img, al, facteur, seuil_chaud=30):
    """N'assombrit que ce qui est CHAUD. Le charbon est neutre et ne bouge pas."""
    p = img.load()
    a = al.load()
    w, h = img.size
    n = 0
    for y in range(h):
        for x in range(w):
            if a[x, y] < 30:
                continue
            c = p[x, y]
            chaud = c[0] - c[2]
            if chaud > seuil_chaud:
                f = facteur + (1 - facteur) * max(0.0, 1 - (chaud - seuil_chaud) / 40.0)
                p[x, y] = tuple(max(0, min(255, round(v * f))) for v in c)
                n += 1
    return n


def monter(source, sortie, seed, clair, taille=1.0, decal_x=0, decal_y=0,
           bois=None, clarte=1.0, global_=False, ouverture=0, accord=None, force=0.0):
    src = Image.open(source).convert('RGB')
    al, bb = alpha_bord(src, clair=clair, global_=global_, ouverture=ouverture)
    if bois:
        n = assombrir_bois(src, al, bois)
        print('   caisse assombrie sur %d px' % n)
    if accord:
        accorder(src, al, accord, force)
    if clarte != 1.0:
        q = src.load()
        for y in range(src.size[1]):
            for x in range(src.size[0]):
                q[x, y] = tuple(max(0, min(255, round(v * clarte))) for v in q[x, y])
    noye = Image.new('RGB', src.size, FOND)
    noye.paste(src, (0, 0), al)
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
    print('   %-22s %dx%d -> %dx%d à (%d,%d)' % (sortie, ow, oh, nw, nh, ox, oy))


print('CHARBON — fond blanc')
monter(r'C:/Users/IgneeFleur/Downloads/Gemini_Generated_Image_mwglo7mwglo7mwgl.jpg',
       'charbon_84.png', 71, clair=True, taille=1.06, global_=True, ouverture=9)
print('CHARRETÉE — fond noir, caisse assombrie')
monter(r'C:/Users/IgneeFleur/Downloads/Gemini_Generated_Image_litjjmlitjjmlitj.jpg',
       'charretee_84.png', 73, clair=False, taille=1.04, bois=0.46,
       accord=(120, 85, 58), force=0.45)

pl = Image.new('RGB', (W * 4 + 50, H + 20), (30, 26, 20))
for i, f in enumerate([D + '/buche.png', S + '/charbon_84.png',
                       D + '/demi_stere.png', S + '/charretee_84.png']):
    pl.paste(Image.open(f), (10 + i * (W + 10), 10))
pl.resize((pl.width * 3, pl.height * 3), Image.NEAREST).save(S + '/charbon_v1.png')
print('\nbûche | charbon | demi-stère | charretée')
