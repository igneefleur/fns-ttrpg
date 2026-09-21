from PIL import Image, ImageFilter

SRC = 'C:/Users/IgneeFleur/Documents/Github/fns-owd-beta/docs/assets/objets/bouteille.png'
im = Image.open(SRC).convert('RGB')
W, H = im.size
p = im.load()

# Masque du verre : le fond du plateau est brun saturé, son bleu vaut 0 a 2 ;
# le verre en garde 39 a 76. Le canal bleu suffit donc a decouper la bouteille.
m = Image.new('L', (W, H), 0)
mp = m.load()
for y in range(H):
    for x in range(W):
        r, g, b = p[x, y]
        mp[x, y] = 255 if b >= 14 else (int((b - 6) * 255 / 8) if b > 6 else 0)
# Bord adouci : sans cela la correction s'arrete net et cerne le flacon.
m = m.filter(ImageFilter.GaussianBlur(0.7))
mp = m.load()
n = sum(1 for y in range(H) for x in range(W) if mp[x, y] > 128)
print(f'masque : {n} pixels de verre sur {W*H}')


def degreen(k):
    out = Image.new('RGB', (W, H))
    op = out.load()
    for y in range(H):
        for x in range(W):
            r, g, b = p[x, y]
            a = mp[x, y] / 255.0
            if a > 0:
                exces = g - (r + b) / 2.0
                if exces > 0:
                    op[x, y] = (r, max(0, min(255, int(round(g - k * a * exces)))), b)
                    continue
            op[x, y] = (r, g, b)
    return out


def mesure(img, nom):
    q = img.load()
    zones = {'col': (38, 22, 46, 34), 'epaule': (30, 48, 54, 58), 'ventre': (28, 70, 56, 100)}
    out = []
    for z, (x0, y0, x1, y1) in zones.items():
        ps = [q[x, y] for y in range(y0, y1) for x in range(x0, x1)]
        v = tuple(sum(c[j] for c in ps) / len(ps) for j in range(3))
        out.append(f'{z} {v[1]-(v[0]+v[2])/2:+5.1f}')
    print(f'  {nom:<14} exces de vert : ' + '  '.join(out))


mesure(im, 'actuel (0.00)')
vs = []
for k in (0.35, 0.55, 0.75):
    o = degreen(k)
    o.save(f'bt_{int(k*100)}.png')
    mesure(o, f'k = {k:.2f}')
    vs.append(o)

# Planche de comparaison, x4, fond creme du parchemin
S, G = 4, 10
strip = Image.new('RGB', (W * S * 4 + G * 5, H * S + G * 2), (233, 226, 205))
for i, img in enumerate([im] + vs):
    strip.paste(img.resize((W * S, H * S), Image.NEAREST), (G + i * (W * S + G), G))
strip.save('bouteille_vert.png')
print('planche : actuel | 0.35 | 0.55 | 0.75')
