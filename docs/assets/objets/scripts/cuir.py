from itertools import product
from fractions import Fraction as F

A = {'pp':2,'p':6,'gp':18,'pc':3,'c':8,'gc':27,'poche':4,'gourde':6}
V = {k: v//3 for k,v in A.items()}
M = {'pp':0.5,'p':2,'gp':8,'pc':0.15,'c':0.6,'gc':2.4,'poche':0.10,'gourde':0.25}
print("VENTE (floor achat/3):", V)

H_SEM=24*7
REC=[
 ('R1 pp->pc',{'pp':1},{'pc':1},7,2*H_SEM),
 ('R2 p->c',{'p':1},{'c':1},9,4*H_SEM),
 ('R3 gp->gc',{'gp':1},{'gc':1},13,8*H_SEM),
 ('R4 c->3pc',{'c':1},{'pc':3},5,1),
 ('R5 gc->3c',{'gc':1},{'c':3},6,2),
 ('R6 pc->poche',{'pc':1},{'poche':1},7,2),
 ('R7 c->2gourde',{'c':1},{'gourde':2},12,4),
]

def val(d,tab): return sum(tab[k]*q for k,q in d.items())
def mass(d): return sum(M[k]*q for k,q in d.items())

print("\n%-14s %5s %5s %6s %5s %5s %6s %7s %7s %8s %8s"%("rec","achIn","achOut","xAch","vIn","vOut","dVente","seuilA","seuilV","masse%","heures"))
for n,i,o,d,h in REC:
    ai,ao=val(i,A),val(o,A); vi,vo=val(i,V),val(o,V)
    sa = ai/ao; sv = (vi/vo) if vo else float('inf')
    print("%-14s %5d %5d %6.3f %5d %5d %+6d %7.1f%% %7s %8.1f%% %8d"%(n,ai,ao,ao/ai,vi,vo,vo-vi,sa*100,
          ("%.1f%%"%(sv*100)) if vo else "inf", 100*mass(o)/mass(i), h))

def dist(n):
    d={}
    for c in product(range(1,9),repeat=n): d[sum(c)]=d.get(sum(c),0)+1
    return d
D={n:dist(n) for n in (1,2,3,4)}
def P(n,thr):
    t=8**n; return F(sum(v for s,v in D[n].items() if s>=thr), t)
RANKS=[('non initie',1,0),('initie',2,0),('apprenti',2,1),('maitre',2,2),('expert',2,3),('rupture',3,3)]
print("\nP(succes) par rang et difficulte (>= car le livre dit 'atteint')")
print("%-11s"%"rang"+"".join("%9s"%("D%d"%d) for d in (5,6,7,9,12,13)))
for rn,nd,bo in RANKS:
    print("%-11s"%rn+"".join("%8.2f%%"%(100*float(P(nd,d-bo))) for d in (5,6,7,9,12,13)))
print("2d8: "+", ".join("D%d=%.4f"%(d,float(P(2,d))) for d in (5,6,7,9,12,13)))
print("3d8: "+", ".join("D%d=%.4f"%(d,float(P(3,d))) for d in (5,6,7,9,12,13)))
print("4d8 D13=%.4f"%float(P(4,13)))

print("\nEV par rang : EVach = p*achOut-achIn ; EVv = p*vOut-vIn")
for rn,nd,bo in RANKS:
    print("--",rn)
    for n,i,o,d,h in REC:
        p=float(P(nd,d-bo)); ai,ao=val(i,A),val(o,A); vi,vo=val(i,V),val(o,V)
        print("   %-14s D%-2d p=%6.2f%%  EVach=%+7.2f  EVvente=%+7.2f"%(n,d,100*p,p*ao-ai,p*vo-vi))

print("\n--- chaines ---")
print("gc->3c->6gourde: achat 27 ->",3*A['c'],"->",6*A['gourde'],"| vente",V['gc'],"->",3*V['c'],"->",6*V['gourde'])
print("c->3pc->3poche : achat  8 ->",3*A['pc'],"->",3*A['poche'],"| vente",V['c'],"->",3*V['pc'],"->",3*V['poche'])
print("gp->gc->3c->6gourde vente:",V['gp'],"->",V['gc'],"->",3*V['c'],"->",6*V['gourde'])
print("gc->9poche: vente",V['gc'],"-> 9 poches =",9*V['poche'],"| achat 27 ->",9*A['pc'],"->",9*A['poche'])
print("p->c->2gourde vente:",V['p'],"->",V['c'],"->",2*V['gourde'])
print("masses c->3pc",M['c'],3*M['pc'],"| gc->3c",M['gc'],round(3*M['c'],2),"| pc->poche",M['pc'],M['poche'],"| c->2g",M['c'],2*M['gourde'])
print("p/kg peaux:",[round(A[k]/M[k],2) for k in ('pp','p','gp')],"cuirs:",[round(A[k]/M[k],2) for k in ('pc','c','gc')])
print("18 pieces: 9pp->",9*A['pc']," 3p->",3*A['c']," 1gp->",A['gc'])
