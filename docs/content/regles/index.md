# Règles de Base MIA

<div class="cols" markdown>

<div class="keep" markdown>

### Le prestige

Le prestige va de 0 à 20. Il mesure ce que le personnage est devenu, et il plafonne chacune
de ses caractéristiques : une caractéristique ne monte jamais au-dessus du prestige.

Il commence à 0 et ne s'achète pas : c'est le meneur qui l'accorde, de loin en loin.

</div>

<div class="keep" markdown>

### Les caractéristiques

Il y a huit caractéristiques, quatre physiques et quatre mentales.

</div>

<div class="cj-modules anima mia" markdown>

| Sigle | Caractéristique | Groupe |
|:---:|---|---|
| FOR | Force | Physique |
| DEX | Dextérité | Physique |
| AGI | Agilité | Physique |
| CON | Constitution | Physique |
| MEN | Mental | Mentale |
| PRE | Prestance | Mentale |
| SEN | Sens | Mentale |
| DÉT | Détermination | Mentale |

</div>

<div class="keep" markdown>

Une caractéristique se développe avec de l'expérience : **20 XP le +1 jusqu'à 5 inclus, 40 XP
le +1 au-delà**.

Chaque caractéristique porte deux valeurs dérivées. Le **modificateur (MOD)** s'ajoute à tous
les jets qui passent par elle. La **limite (LIM)** est le résultat le plus haut qu'un jet
passant par elle puisse atteindre.

</div>

<div class="formula" markdown>

<p class="formula">MOD = CARAC × 10 jusqu'à 5, puis 50 + (CARAC − 5) × 20</p>

<p class="formula">LIM = 150 jusqu'à 3, puis CARAC × 50</p>

</div>

<div class="cj-modules anima mia" markdown>

| Valeur | MOD | LIM | XP cumulés |
|:---:|:---:|:---:|:---:|
| 0 | 0 | 150 | 0 |
| 1 | 10 | 150 | 20 |
| 2 | 20 | 150 | 40 |
| 3 | 30 | 150 | 60 |
| 4 | 40 | 200 | 80 |
| 5 | 50 | 250 | 100 |
| 6 | 70 | 300 | 140 |
| 7 | 90 | 350 | 180 |
| 8 | 110 | 400 | 220 |
| 9 | 130 | 450 | 260 |
| 10 | 150 | 500 | 300 |
| 11 | 170 | 550 | 340 |
| 12 | 190 | 600 | 380 |
| 13 | 210 | 650 | 420 |
| 14 | 230 | 700 | 460 |
| 15 | 250 | 750 | 500 |
| 16 | 270 | 800 | 540 |
| 17 | 290 | 850 | 580 |
| 18 | 310 | 900 | 620 |
| 19 | 330 | 950 | 660 |
| 20 | 350 | 1000 | 700 |

</div>

<div class="keep" markdown>

### Les compétences

Il y a huit compétences. Un point de compétence coûte **1 XP**, et le nombre de points qu'une
compétence peut porter est plafonné par le MOD de la caractéristique qui la commande.

Chaque compétence se lance par défaut avec la caractéristique indiquée ci-dessous ; elle peut
se lancer avec une autre lorsque la situation le demande.

</div>

<div class="cj-modules anima mia" markdown>

| Sigle | Compétence | Plafond de points | Caractéristique par défaut |
|:---:|---|---|:---:|
| PHY | Physique | le plus haut des MOD FOR, DEX, AGI, CON | FOR |
| COM | Combat | le plus haut des MOD DEX, AGI | DEX |
| CLA | Clandestin | MOD AGI | AGI |
| CRÉ | Création | MOD MEN | MEN |
| INT | Intelligence | MOD MEN | MEN |
| SOC | Social | MOD PRE | PRE |
| PER | Perception | MOD SEN | SEN |
| VOL | Volonté | MOD DÉT | DÉT |

</div>

<div class="keep" markdown>

### Les spécialités

Une spécialité est une manière précise d'employer une compétence. Elle dépend d'une
caractéristique et d'une compétence : Esquive dépend de DEX et de COM.

Un point de spécialité coûte **0,25 XP**. Le nombre de points qu'une spécialité peut porter
dépend de la caractéristique dont elle relève et du plafond de sa compétence.

</div>

<div class="formula" markdown>

<p class="formula">Points de spécialité = LIM − 50 − MOD − plafond de la compétence</p>

</div>

<div class="keep" markdown>

Dans ce calcul, le MOD et le plafond de la compétence comptent chacun pour 30 au minimum.

Il n'existe pas de liste de spécialités : chacun crée les siennes. Ces règles en nomment
cependant quatre, que leurs formules appellent par leur nom : **Esquive**, **PV**,
**Obstination** et **Récupération**.

</div>

<div class="keep" markdown>

### Les jets

Un jet se fait au d100. On y ajoute le MOD de la caractéristique employée, puis les points de
la compétence, puis les points de la spécialité, selon ce qu'on lance. Le résultat ne dépasse
jamais la LIM de la caractéristique employée.

</div>

<div class="formula" markdown>

<p class="formula">Jet = d100 + MOD + points de compétence + points de spécialité, plafonné à la LIM</p>

</div>

<div class="keep" markdown>

### Les points de vie

Les points de vie sont bien souvent le dernier rempart entre votre personnage et sa mort.

</div>

<div class="formula" markdown>

<p class="formula">PV = (20 + MOD CON + PHY) × 2 + SPÉ PV</p>

</div>

<div class="keep" markdown>

Un personnage possède deux barres de vie, une positive et une négative. À −100 % de ses PV
maximaux, il meurt.

Chaque fois que des dégâts font passer ses PV dans le négatif, il effectue un jet
d'obstination. S'il le rate, il tombe dans les pommes ; sinon, il reste conscient.

</div>

<div class="formula" markdown>

<p class="formula">Obstination = DÉT + VOL + SPÉ Obstination, contre PV ÷ PV max × 100</p>

</div>

<div class="keep" markdown>

### L'endurance

L'endurance est une réserve égale au MOD CON. Elle descend jusqu'à −MOD CON.

Elle se dépense pour ajouter un bonus à vos actions, jusqu'à 50 points pour une même action, et
se regagne chaque jour. **Ce bonus s'ajoute à la fin, une fois la limite appliquée** : c'est par
lui, et par lui seul, qu'un jet dépasse la LIM.

Quand elle est dans le négatif, elle devient un malus à tous vos jets : une personne dont
l'endurance est à −20 subit un malus de 20 sur tous ses jets. À −100 %, vous tombez dans les
pommes jusqu'à ce que votre endurance soit revenue à son maximum.

</div>

<div class="keep" markdown>

### L'initiative

L'initiative détermine votre rapidité de réaction : votre place dans le tour, et si vous êtes
pris de vitesse.

</div>

<div class="formula" markdown>

<p class="formula">Initiative = MOD AGI × 2</p>

</div>

<div class="keep" markdown>

Elle dépend ensuite de votre équipement. Seuls les **bonus** de ce que vous portez activement
comptent — armes en main, armure portée. Les **malus**, eux, s'additionnent pour tout ce que
vous transportez : deux armures, l'une équipée et l'autre dans le sac, donnent leurs deux malus.

Une personne de 5 AGI a une initiative de 100 ; mains nues, elle y ajoute 20 et monte à 120.

</div>

<div class="keep" markdown>

### La vitesse

La vitesse est le déplacement possible au cours d'un round.

</div>

<div class="formula" markdown>

<p class="formula">Vitesse = AGI × AGI mètres</p>

</div>

<div class="keep" markdown>

### Les sauts

Les sauts se comptent dans les déplacements effectués au cours du round.

</div>

<div class="formula" markdown>

<p class="formula">Saut en longueur = FOR × 1,75 m</p>

<p class="formula">Saut en hauteur = FOR ÷ 2 m</p>

</div>

<div class="keep" markdown>

### Le poids

Le poids commande ce que vous pouvez emporter d'objets et d'équipement.

</div>

<div class="formula" markdown>

<p class="formula">Charge maximale = le plus haut du MOD CON et du MOD FOR</p>

</div>

<div class="keep" markdown>

Trois paliers pèsent sur le personnage, et leurs effets se cumulent.

</div>

<div class="cj-modules anima mia" markdown>

| Charge | Effets |
|:---:|---|
| 50 % | malus de 50 à l'initiative, de 10 à l'esquive |
| 75 % | malus de 40 à l'esquive, vitesse divisée par 1,5, sauts divisés par 3 |
| 100 % | malus de 100 à l'esquive, vitesse et initiative divisées par 2, sauts divisés par 4 |

</div>

<div class="keep" markdown>

### La récupération

La récupération est une spécialité unique : elle dit votre capacité à récupérer de vos
blessures. Elle monte jusqu'à MOD CON × 2.

</div>

<div class="formula" markdown>

<p class="formula">PV regagnés par jour = (MOD CON + RÉCUP) / 2</p>

<p class="formula">Endurance regagnée par jour = endurance max × 2</p>

</div>

</div>
