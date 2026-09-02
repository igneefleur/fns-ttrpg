from itertools import product
def p(n,s):
    o=list(product(range(1,9),repeat=n)); return sum(1 for r in o if sum(r)>=s)/len(o)

print("--- subsistance (1 pain = 1 piece, 1 pain/jour) ---")
print("maroquinier 8h/j a 1 p/h : %d pains/jour, %d /mois"%(8, 8*30))
for n,g,h in [("R1",1,336),("R2",2,720),("R3",9,1440)]:
    print("tanneur %s : %.4f p/h -> %.2f pains par mois de 720 h (besoin ~30)"%(n,g/h,g/h*720))
print("facteur sous la subsistance (meilleur cas R3) : %.1f"%(30/(9/1440*720)))
print("temps qu'il faudrait au tannage pour valoir 1 p/h : R1 %d h, R2 %d h, R3 %d h"%(1,2,9))

print("\n--- vendre brut vs tanner (matiere gratuite, base VENTE) ---")
for n,iv,ov,d,h in [("R1",0,1,7,336),("R2",2,2,9,720),("R3",6,9,13,1440)]:
    pr=p(2,d); print("%s: vendre brut %d  |  tanner EV %.2f (p=%.1f%%)  ->  delta %+.2f pour %d h"%(n,iv,pr*ov,100*pr,pr*ov-iv,h))

print("\n--- exploit fosse passive : 100 peaux gratuites, 1 mois ---")
pr=p(2,9); print("cuirs obtenus %.0f ; vente %.0f p ; valeur achat %.0f p ; heures de perso : les 100 jets"%(100*pr,100*pr*2,100*pr*8))
print("maroquinier qui ACHETE sa matiere : cuir 8 -> 3 pcuir vendus 3 = -5 p par heure travaillee")

print("\n--- R7 gourdes selon les des ---")
for n in (2,3):
    pr=p(n,12); print("%dd8 : p=%.1f%% ; EV_achat %+.2f (seuil 66.7%%) ; EV_vente %+.2f"%(n,100*pr,pr*12-8,pr*4-2))

print("\n--- decoupe complete gcuir -> 9 pcuir ---")
ev = p(2,6)*3*p(2,5)*3   # nb de petits cuirs esperes
print("5 h, 4 jets ; petits cuirs esperes %.2f/9 ; achat %.1f vs 27 ; vente %.1f vs 9"%(ev,ev*3,ev*1))
