# -*- coding: utf-8 -*-
"""Le minerai, la barre et l'epee.

Trois sources, trois problemes differents.

MINERAI  <- Obsidian_Shard. Sa lueur orange est TRES claire (lum ~200) : la
            teinter sans comprimer les hautes lumieres la rend orange vif au
            lieu de brune. On ecrase donc le haut de la courbe avant de teinter.
BARRE    <- Gold_Ingot. Trois essais precedents lisaient argent ou etain : le
            lingot d'or est lumineux, il faut descendre bien plus bas que ce
            que l'oeil suggere, et garder du contraste pour que ca reste du metal.
EPEE     <- Iron_Sword d'Outward, qui arrive sur un fond ROUGE (R-B = +43) et
            non sur le plateau brun de la famille. La lame etant neutre
            (R-B = -6), la chromaticite les separe proprement.
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
cl = lambda v, a=0., b=1.: max(a, min(b, v))


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


def teinter(im, TINT, k, plafond, contr=1.0, mask_seuil=40, mask_pente=40):
    """Teinte en ECRASANT les hautes lumieres.

    `plafond` borne la luminance APRES le gain : sans lui, une lueur a 200
    ressort a 160 et reste une lueur. C'est ce qui a rate au premier essai."""
    w, h = im.size
    px = im.load()
    m = Image.new('L', (w, h), 0)
    mp = m.load()
    for y in range(h):
        for x in range(w):
            mp[x, y] = int(255 * cl((L(px[x, y]) - mask_seuil) / float(mask_pente)))
    m = m.filter(ImageFilter.GaussianBlur(0.6))
    mp = m.load()
    gp = im.convert('L').load()
    tl = L(TINT)
    for y in range(h):
        for x in range(w):
            a = mp[x, y] / 255.0
            if a <= 0.002:
                continue
            g = 128 + (gp[x, y] - 128) * contr
            lu = cl(g * k, 3, plafond)
            n = [cl(lu * c / tl, 0, 255) for c in TINT]
            p = px[x, y]
            px[x, y] = tuple(int(round(p[i] * (1 - a) + n[i] * a)) for i in range(3))
    return im


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
    print('   %-18s -> %dx%d a (%d,%d)' % (sortie, nw, nh, ox, oy))


def plus_grande_tache(m, seuil=90):
    """Ne garde que la composante connexe la plus grande : tue les pixels perdus."""
    from collections import deque
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


def masque_sujet(im, seuil):
    """Tout ce qui depasse `seuil` en luminance, adouci."""
    w, h = im.size
    px = im.load()
    m = Image.new('L', (w, h), 0)
    mp = m.load()
    for y in range(h):
        for x in range(w):
            mp[x, y] = int(255 * cl((L(px[x, y]) - seuil) / 30.0))
    return m.filter(ImageFilter.GaussianBlur(1.0))


def sans_cadre(im, marge=9):
    """Retire le cadre grave de la vignette d'Outward.

    Ce cadre est plus clair que le plateau : laisse en place, il passe tous les
    seuils et se colle sur la carte en rectangle sombre."""
    return im.crop((marge, marge, im.width - marge, im.height - marge))


def boucher(m, seuil=90):
    """Rebouche les creux fermes d'un masque.

    Le seuil de luminance dechire le minerai : ses creux noirs tombent sous le
    seuil et trouent la pierre. On inonde le COMPLEMENT depuis le bord ; ce que
    l'inondation n'atteint pas est un creux ferme, donc du sujet. L'inondation
    directe, elle, avait ete essayee et fuyait dans les degrades lisses du
    lingot."""
    from collections import deque
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


def masque_flot(im, seuil=46, pente=30):
    m = masque_sujet(im, seuil).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    return boucher(plus_grande_tache(m)).filter(ImageFilter.GaussianBlur(0.7))


def rugosite(im, al, force, seed, echelle=2):
    """Une croute de battitures : des taches sombres, pas du bruit fin.

    Le lingot d'or est lisse ; le fer sorti du bas fourneau ne l'est jamais. Sans
    cette croute la barre lit le beton, quelle que soit sa teinte."""
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


# ---------------- MINERAI ----------------
im = sans_cadre(Image.open(S + '/Iron_Scrap.png').convert('RGB'))
al = masque_flot(im, 58)
# Le cuivre guettait : trop clair et trop sature, la ferraille lisait le laiton.
# L'hematite est sombre, dense, a peine rousse.
teinter(im, (86, 62, 50), 0.46, 92, contr=1.30, mask_seuil=50, mask_pente=34)
rugosite(im, al, 0.34, 811)
poser(im, al, 'minerai_fer_84.png', 81, taille=0.84)

# ---------------- BARRE ----------------
im = sans_cadre(Image.open(S + '/Gold_Ingot.png').convert('RGB'))
al = masque_flot(im, 62)
teinter(im, (88, 87, 90), 0.30, 104, contr=1.85, mask_seuil=44, mask_pente=40)
rugosite(im, al, 0.30, 833)
poser(im, al, 'barre_fer_84.png', 83, taille=1.02)

# ---------------- EPEE : fond rouge, lame neutre ----------------
im = sans_cadre(Image.open(S + '/Iron_Sword.png').convert('RGB'))
w, h = im.size
px = im.load()
m = Image.new('L', (w, h), 0)
mp = m.load()
for y in range(h):
    for x in range(w):
        c = px[x, y]
        chaud = c[0] - c[2]                      # fond rouge : +43 ; lame : -6
        mp[x, y] = int(255 * cl((16 - chaud) / 14.0) * cl((L(c) - 34) / 26.0))
m = boucher(plus_grande_tache(m.filter(ImageFilter.GaussianBlur(0.8))))
# Chrome a 220 : c'est une lame de parade. On rabat le blanc sans ternir l'acier.
teinter(im, (104, 106, 110), 0.62, 168, contr=1.10, mask_seuil=34, mask_pente=26)
poser(im, m, 'epee_fer_84.png', 85, taille=0.94)

pl = Image.new('RGB', (W * 5 + 60, H + 20), (30, 26, 20))
for i, f in enumerate(['minerai_fer_84.png', 'barre_fer_84.png', 'epee_fer_84.png',
                       D + '/charbon.png', D + '/charretee_charbon.png']):
    pl.paste(Image.open(f if '/' in f else S + '/' + f), (10 + i * (W + 10), 10))
pl.resize((pl.width * 3, pl.height * 3), Image.NEAREST).save(S + '/fer_v3.png')
print('\nminerai | barre | epee | charbon | charretee')
