# -*- coding: utf-8 -*-
"""La bûche et le demi-stère.

La bûche arrive déjà détourée : plateau, cadre, ombre, grain, rien de plus.

Le demi-stère arrive sur fond BLANC. On ne le coupe pas au seuil de clarté — les
bouts de bûche sciés sont presque aussi clairs que le fond et partiraient avec.
On REMPLIT depuis les quatre bords : seul le blanc qui communique avec l'extérieur
s'en va, et le blanc enfermé dans la pile reste.
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


def alpha_par_remplissage(src, seuil=185, ecart=12, ouverture=0, global_=False):
    """Le fond est le GRIS NEUTRE qui touche le bord ; l'intérieur reste opaque.

    Deux fonds différents se traitent ainsi. Le demi-stère est sur blanc pur. La
    bûche est sur un DAMIER (255 et 191) PEINT DANS LES PIXELS : son alpha est
    opaque de bout en bout, la transparence n'est qu'un dessin. Le seuil descend
    donc à 185 pour attraper les cases grises, et c'est la SATURATION NULLE qui
    distingue le fond du bois, jamais la clarté seule."""
    p = src.load()
    w, h = src.size
    blanc = lambda c: L(c) >= seuil and (max(c) - min(c)) <= ecart
    vus = bytearray(w * h)
    if global_:
        # SEUIL GLOBAL, et non remplissage. À réserver aux dessins dont le fond
        # est ENFERMÉ quelque part — ici une ombre en hachures, dont le blanc
        # entre les traits est ceinturé par les traits eux-mêmes et par le sujet.
        # Le remplissage ne peut pas l'atteindre et le garde : il ressort en halo
        # gris à la réduction. Ne marche que si le sujet est franchement coloré.
        for y in range(h):
            for x in range(w):
                if blanc(p[x, y]):
                    vus[y * w + x] = 1
    q = deque() if global_ else deque()
    for x in range(w) if not global_ else ():
        for y in (0, h - 1):
            if blanc(p[x, y]) and not vus[y * w + x]:
                vus[y * w + x] = 1
                q.append((x, y))
    for y in (range(h) if not global_ else ()):
        for x in (0, w - 1):
            if blanc(p[x, y]) and not vus[y * w + x]:
                vus[y * w + x] = 1
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not vus[ny * w + nx] and blanc(p[nx, ny]):
                vus[ny * w + nx] = 1
                q.append((nx, ny))
    # HACHURES DESSINÉES : une ouverture morphologique les efface. Un dessin
    # peut porter une ombre en traits fins sur le fond ; le remplissage garde
    # les traits et jette le blanc entre eux, et la réduction moyenne les deux
    # en un halo GRIS SALE le long du sujet. Éroder puis dilater fait disparaître
    # tout ce qui est plus mince que le noyau, sans entamer les masses pleines.
    if ouverture:
        m = Image.new('L', (w, h), 0)
        mp = m.load()
        for y in range(h):
            for x in range(w):
                if not vus[y * w + x]:
                    mp[x, y] = 255
        m = m.filter(ImageFilter.MinFilter(ouverture)).filter(ImageFilter.MaxFilter(ouverture))
        mp = m.load()
        for y in range(h):
            for x in range(w):
                vus[y * w + x] = 0 if mp[x, y] else 1

    # Le remplissage laisse des pixels isolés le long du bord — un liseré du
    # damier que la neutralité n'attrape pas. Sans ce nettoyage la boîte du
    # sujet vaut presque toute l'image, et la vignette est réduite comme si le
    # sujet la remplissait : il paraît minuscule dans son cadre.
    garde = bytearray(1 - v for v in vus)
    meilleur, vu2 = [], bytearray(w * h)
    for sy in range(h):
        for sx in range(w):
            if garde[sy * w + sx] and not vu2[sy * w + sx]:
                pile, tache = [(sx, sy)], []
                vu2[sy * w + sx] = 1
                while pile:
                    cx, cy = pile.pop()
                    tache.append((cx, cy))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = cx + dx, cy + dy
                        if (0 <= nx < w and 0 <= ny < h and garde[ny * w + nx]
                                and not vu2[ny * w + nx]):
                            vu2[ny * w + nx] = 1
                            pile.append((nx, ny))
                if len(tache) > len(meilleur):
                    meilleur = tache
    print('   plus grosse tache : %d px sur %d gardés' % (len(meilleur), sum(garde)))
    al = Image.new('L', (w, h), 0)
    a = al.load()
    for (x, y) in meilleur:
        a[x, y] = 255
    n = sum(vus)
    print('   fond retiré par remplissage : %d px, %d %% de l\'image' % (n, round(100 * n / (w * h))))
    net = al.getbbox()          # la VRAIE boîte, prise sur le masque NET
    return al.filter(ImageFilter.GaussianBlur(1.2)), net


def accorder(img, ref, force):
    """Rapproche la chromaticité de celle de `ref`, À LUMINANCE CONSTANTE.

    Le petit bois est la référence de la famille. On ne touche ni la clarté ni
    le dessin : chaque pixel glisse vers la teinte de référence à sa PROPRE
    luminance, d'une fraction `force`."""
    lr = L(ref)
    u = tuple(c / lr for c in ref)              # la référence ramenée à une luminance de 1
    p = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            c = p[x, y]
            lum = L(c)
            cible = tuple(lum * v for v in u)
            p[x, y] = tuple(max(0, min(255, round(c[i] + force * (cible[i] - c[i])))) for i in range(3))
    return img


def monter(source, sortie, seed, decoupe=False, taille=1.0, decal_x=0, decal_y=0,
           accord=None, force=0.0, clarte=1.0, ouverture=0, global_=False):
    src = Image.open(source)
    rgb = src.convert('RGB')
    if decoupe:
        al, bb = alpha_par_remplissage(rgb, ouverture=ouverture, global_=global_)   # d'abord détourer : le fond doit rester neutre
    else:
        al = src.getchannel('A'); bb = al.getbbox()
    if accord:
        accorder(rgb, accord, force)            # puis accorder, le fond est déjà masqué
    if clarte != 1.0:
        q = rgb.load()
        for y in range(sh0 := rgb.size[1]):
            for x in range(rgb.size[0]):
                q[x, y] = tuple(max(0, min(255, round(v * clarte))) for v in q[x, y])
    sw, sh = src.size
    noye = Image.new('RGB', (sw, sh), FOND)
    noye.paste(rgb, (0, 0), al)
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
    cadre(out)                  # le cadre repasse PAR-DESSUS : un sujet qui déborde passe dessous
    grain(out, 9, seed)
    out.save(S + '/' + sortie)
    print('   %-20s source %dx%d -> %dx%d à (%d,%d)' % (sortie, ow, oh, nw, nh, ox, oy))


REF = (120, 85, 58)     # le sujet moyen du petit bois : la famille s'y accorde

print('BÛCHE')
monter(r'C:/Users/IgneeFleur/Downloads/Gemini_Generated_Image_r94emlr94emlr94e.png',
       'buche_84.png', 61, decoupe=True, accord=REF, force=1.00,
       clarte=0.94, ouverture=9, global_=True, taille=1.12)
print('DEMI-STÈRE')
monter(r'C:/Users/IgneeFleur/Downloads/Gemini_Generated_Image_qshpzdqshpzdqshp.png',
       'stere_84.png', 63, decoupe=True, accord=REF, force=1.00, decal_y=5, clarte=0.78)

print()
def sonde(f, nom):
    i = Image.open(f).convert('RGB')
    z = i.load()
    fb = i.filter(ImageFilter.GaussianBlur(1.2)).load()
    zz = [(x, y) for y in range(6, 26) for x in range(4, 20)]
    gr = (sum((z[x, y][c] - fb[x, y][c]) ** 2 for x, y in zz for c in range(3)) / (len(zz) * 3)) ** 0.5

    def moy(x0, y0, x1, y1):
        ps = [z[x, y] for y in range(y0, y1) for x in range(x0, x1)]
        return tuple(round(sum(c[j] for c in ps) / len(ps)) for j in range(3))
    print('  %-12s cadre %s  plateau %s  grain %.2f' % (nom, moy(0, 60, 2, 70), moy(4, 6, 16, 20), gr))


for n, f in (('bûche', S + '/buche_84.png'), ('demi-stère', S + '/stere_84.png'),
             ('petit bois', D + '/bois.png'), ('gourde', D + '/gourde.png')):
    sonde(f, n)

st = Image.new('RGB', (W * 6 * 3 + 40, H * 6 + 20), (233, 226, 205))
for i, f in enumerate([D + '/bois.png', S + '/buche_84.png', S + '/stere_84.png']):
    st.paste(Image.open(f).convert('RGB').resize((W * 6, H * 6), Image.NEAREST), (10 + i * (W * 6 + 10), 10))
st.save(S + '/trois_bois.png')
print('planche : petit bois | BÛCHE | DEMI-STÈRE')
